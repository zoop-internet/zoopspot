package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/zoop-internet/zoop/packages/agent/client"
	"github.com/zoop-internet/zoop/packages/agent/health"
	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/core/config"

	"github.com/zoop-internet/zoop/packages/core/types"
)

// Server orchestrates the Zoop Agent lifecycle.
type Server struct {
	config    config.Config
	state     *state.Manager
	identity  identity.Manager
	logger    *slog.Logger
	apiClient *client.APIClient
	tunName   string
	apiPort   int

	ident types.Identity
}

// NewServer initializes a new agent server.
func NewServer(cfg config.Config, sm *state.Manager, im identity.Manager, logger *slog.Logger, tunName string, apiPort int) *Server {
	return &Server{
		config:   cfg,
		state:    sm,
		identity: im,
		logger:   logger,
		tunName:  tunName,
		apiPort:  apiPort,
	}
}

// Start begins the agent's operations.
func (s *Server) Start(ctx context.Context, keyPath string) error {
	s.logger.Info("starting zoop agent")

	// 1. Load or Generate Identity
	s.logger.Info("loading identity", "path", keyPath)
	ident, err := s.identity.LoadOrGenerate(keyPath)
	if err != nil {
		s.state.Set(state.StateError)
		s.logger.Error("failed to load identity", "error", err)
		return err
	}
	s.ident = ident
	s.logger.Info("identity loaded", "endpoint_id", ident.EndpointID)

	privKey, err := s.identity.GetPrivateKey(keyPath)
	if err != nil {
		s.logger.Error("failed to get private key", "error", err)
		return err
	}

	// 2. Initialize Clients
	s.apiClient = client.NewAPIClient(s.config.ControlPlaneURL, ident, privKey)

	// Create WireGuard device manager (Linux/macOS user-space)
	tunnelManager, err := tunnel.NewDeviceManager(s.tunName, nil)
	if err != nil {
		s.logger.Error("failed to create tunnel manager", "error", err)
		// We can decide whether to fail hard or proceed without tunnel for testing
	} else {
		s.logger.Info("tunnel manager initialized", "interface", s.tunName)
		defer tunnelManager.Close()
	}

	sigClient := client.NewSignalingClient(s.apiClient, tunnelManager, s.logger)

	// 3. Generate WireGuard Keys
	wgKeys, err := tunnel.GenerateKeyPair()
	if err != nil {
		s.logger.Error("failed to generate wireguard keys", "error", err)
		return err
	}
	s.logger.Info("wireguard keys generated", "public_key", wgKeys.EncodePublicKey())

	if tunnelManager != nil {
		if err := tunnelManager.ConfigureDevice(wgKeys.PrivateKey, 0); err != nil {
			s.logger.Error("failed to configure wireguard device", "error", err)
			return err
		}
	}

	// 4. Register Device with Cloud
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "zoop-device"
	}

	s.logger.Info("registering device with cloud", "url", s.config.ControlPlaneURL)

	// Create a short timeout context for registration
	regCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if _, err := s.apiClient.RegisterDevice(regCtx, hostname, wgKeys.EncodePublicKey()); err != nil {
		s.logger.Error("failed to register device with cloud", "error", err)
		// We can still proceed, it might just be offline
	} else {
		s.logger.Info("device successfully registered")
	}

	// 4. Start local command API
	go s.startLocalAPI(ctx)

	// 5. Connect Signaling
	go sigClient.Connect(ctx)

	s.state.Set(state.StateRunning)
	s.logger.Info("Agent started successfully")
	<-ctx.Done()

	s.logger.Info("agent shutting down")
	s.state.Set(state.StateStopped)
	return nil
}

// ConnectToPeer initiates a connection to a target provider device via the Zoop Cloud.
func (s *Server) ConnectToPeer(ctx context.Context, providerID types.ID) error {
	if s.apiClient == nil {
		return fmt.Errorf("agent server is not running")
	}

	s.logger.Info("requesting connection to peer", "provider_id", providerID)

	resp, err := s.apiClient.RequestConnection(ctx, providerID)
	if err != nil {
		return fmt.Errorf("failed to request connection: %w", err)
	}

	s.logger.Info("connection authorized by cloud",
		"connection_id", resp.ID,
		"state", resp.State)

	// Future milestones will handle the Data Plane connection here.
	return nil
}

func (s *Server) startLocalAPI(ctx context.Context) {
	mux := http.NewServeMux()

	healthChecker := health.NewChecker(s.state, s.tunName, s.config.ControlPlaneURL, "stun.l.google.com:19302")
	mux.HandleFunc("GET /health", healthChecker.WriteHTTP)
	mux.Handle("GET /metrics", promhttp.Handler())

	mux.HandleFunc("POST /connect", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			ProviderID string `json:"provider_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		providerUUID, err := uuid.Parse(req.ProviderID)
		if err != nil {
			http.Error(w, "invalid provider id", http.StatusBadRequest)
			return
		}

		resp, err := s.apiClient.RequestConnection(r.Context(), types.ID(providerUUID))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	server := &http.Server{Addr: fmt.Sprintf("127.0.0.1:%d", s.apiPort), Handler: mux}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.logger.Error("local api failed", "error", err)
		}
	}()
	<-ctx.Done()
	server.Shutdown(context.Background())
}
