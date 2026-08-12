package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/agent/client"
	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

const defaultSocketPath = "/var/run/zoopd.sock"

type DaemonCommand struct {
	Action string `json:"action"`
	PeerID string `json:"peer_id,omitempty"`
}

type DaemonResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	logger.Info("Starting Zoop Linux System Daemon (zoopd)")

	cfg := config.LoadConfig()

	// Setup local identity.
	homeDir, _ := os.UserHomeDir()
	if homeDir == "" {
		homeDir = "/var/lib/zoop"
	}
	keyPath := filepath.Join(homeDir, ".zoop", "identity.key")
	idMgr := identity.NewManager()
	ident, err := idMgr.LoadOrGenerate(keyPath)
	if err != nil {
		logger.Error("failed to load device identity", "error", err)
		os.Exit(1)
	}
	logger.Info("loaded local device identity", "endpoint_id", ident.EndpointID.String())

	privKey, err := idMgr.GetPrivateKey(keyPath)
	if err != nil {
		logger.Error("failed to load private key", "error", err)
		os.Exit(1)
	}

	// Initialize API client for communicating with the Zoop Cloud.
	apiClient := client.NewAPIClient(cfg.ControlPlaneURL, ident, privKey)

	// Initialize WireGuard device manager.
	devMgr, err := tunnel.NewDeviceManager("zoop0", nil)
	if err != nil {
		logger.Error("failed to initialize TUN device", "error", err)
		os.Exit(1)
	}
	defer devMgr.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Socket listener setup.
	_ = os.Remove(defaultSocketPath)
	_ = os.MkdirAll(filepath.Dir(defaultSocketPath), 0755)

	listener, err := net.Listen("unix", defaultSocketPath)
	if err != nil {
		logger.Error("failed to listen on daemon UNIX socket", "path", defaultSocketPath, "error", err)
		os.Exit(1)
	}
	_ = os.Chmod(defaultSocketPath, 0666)
	defer listener.Close()

	logger.Info("zoopd IPC listener active", "socket", defaultSocketPath)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				select {
				case <-ctx.Done():
					return
				default:
					logger.Debug("socket accept error", "error", err)
					continue
				}
			}
			go handleIPC(ctx, cancel, conn, devMgr, apiClient, logger)
		}
	}()

	select {
	case sig := <-sigCh:
		logger.Info("received signal, shutting down", "signal", sig)
		cancel()
	case <-ctx.Done():
	}

	logger.Info("zoopd shutting down cleanly...")
}

func handleIPC(
	ctx context.Context,
	cancel context.CancelFunc,
	conn net.Conn,
	devMgr *tunnel.DeviceManager,
	apiClient *client.APIClient,
	logger *slog.Logger,
) {
	defer conn.Close()

	var cmd DaemonCommand
	if err := json.NewDecoder(conn).Decode(&cmd); err != nil {
		_ = json.NewEncoder(conn).Encode(DaemonResponse{Success: false, Message: err.Error()})
		return
	}

	logger.Info("received daemon IPC command", "action", cmd.Action, "peer", cmd.PeerID)

	var resp DaemonResponse
	switch cmd.Action {
	case "status":
		port, _ := devMgr.GetListenPort()
		resp = DaemonResponse{
			Success: true,
			Message: fmt.Sprintf("zoopd running. WireGuard Port=%d PubKey=%s", port, devMgr.PublicKey().String()),
		}

	case "connect":
		if cmd.PeerID == "" {
			resp = DaemonResponse{Success: false, Message: "peer_id is required for connect"}
			break
		}
		parsedUUID, err := uuid.Parse(cmd.PeerID)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("invalid peer_id format: %v", err)}
			break
		}
		providerID := types.ID(parsedUUID)

		connResp, err := apiClient.RequestConnection(ctx, providerID)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("failed to request connection: %v", err)}
			break
		}
		resp = DaemonResponse{
			Success: true,
			Message: fmt.Sprintf("connection request submitted: id=%s state=%s", connResp.ID, connResp.State),
		}

	case "stop":
		// Respond before cancelling so the client receives the message.
		_ = json.NewEncoder(conn).Encode(DaemonResponse{Success: true, Message: "zoopd stopping"})
		// Trigger graceful shutdown via context — deferred cleanup still runs.
		cancel()
		return

	default:
		resp = DaemonResponse{Success: false, Message: "unknown action: " + cmd.Action}
	}

	_ = json.NewEncoder(conn).Encode(resp)
}
