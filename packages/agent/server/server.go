package server

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/client"
	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/state"
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

	ident types.Identity
}

// NewServer initializes a new agent server.
func NewServer(cfg config.Config, sm *state.Manager, im identity.Manager, logger *slog.Logger) *Server {
	return &Server{
		config:   cfg,
		state:    sm,
		identity: im,
		logger:   logger,
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
	sigClient := client.NewSignalingClient(s.apiClient, s.logger)

	// 3. Register Device with Cloud
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "zoop-device"
	}
	
	s.logger.Info("registering device with cloud", "url", s.config.ControlPlaneURL)
	
	// Create a short timeout context for registration
	regCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	
	if _, err := s.apiClient.RegisterDevice(regCtx, hostname); err != nil {
		s.logger.Error("failed to register device with cloud", "error", err)
		// We can still proceed, it might just be offline
	} else {
		s.logger.Info("device successfully registered")
	}

	// 4. Connect to Signaling Channel
	s.logger.Info("connecting to signaling channel")
	go sigClient.Connect(ctx)

	// 5. Transition to Running
	s.state.Set(state.StateRunning)
	s.logger.Info("agent is running")

	// 6. Block until context is canceled
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
