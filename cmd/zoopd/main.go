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

	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"

	"github.com/zoop-internet/zoop/packages/core/config"
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
	_ = cfg

	// Setup local identity
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

	// Initialize WireGuard device manager
	devMgr, err := tunnel.NewDeviceManager("zoop0", nil)
	if err != nil {
		logger.Error("failed to initialize TUN device", "error", err)
		os.Exit(1)
	}
	defer devMgr.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Socket listener setup
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
			go handleIPC(conn, devMgr, logger)
		}
	}()

	<-sigCh
	logger.Info("zoopd shutting down cleanly...")
}

func handleIPC(conn net.Conn, devMgr *tunnel.DeviceManager, logger *slog.Logger) {
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
	case "stop":
		resp = DaemonResponse{Success: true, Message: "zoopd stopping"}
		_ = json.NewEncoder(conn).Encode(resp)
		os.Exit(0)
	default:
		resp = DaemonResponse{Success: false, Message: "unknown action: " + cmd.Action}
	}

	_ = json.NewEncoder(conn).Encode(resp)
}
