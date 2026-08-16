package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"os"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/zoop-internet/zoop/packages/agent/client"
	"github.com/zoop-internet/zoop/packages/agent/health"
	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/core"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// DesktopSettings contains client preferences.
type DesktopSettings struct {
	AutoConnectOnLaunch bool     `json:"auto_connect"`
	KillSwitch          bool     `json:"kill_switch"`
	AllowLocalLAN       bool     `json:"allow_local_lan"`
	DNSServers          []string `json:"dns_servers"`
	ControlPlaneURL     string   `json:"control_plane_url"`
	DeviceName          string   `json:"device_name"`
	TunnelIfName        string   `json:"tunnel_if_name"`
}

// PeerInfo represents a discoverable peer endpoint in the mesh.
type PeerInfo struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Platform        string  `json:"platform"`
	VirtualIP       string  `json:"virtual_ip"`
	IsProvider      bool    `json:"is_provider"`
	Online          bool    `json:"online"`
	LatencyMs       float64 `json:"latency_ms"`
	DirectAvailable bool    `json:"direct_available"`
	Country         string  `json:"country"`
	City            string  `json:"city"`
}

// DesktopStatus reports the current real-time state of the Desktop client.
type DesktopStatus struct {
	Connected      bool      `json:"connected"`
	State          string    `json:"state"` // "idle", "connecting", "connected", "error"
	AssignedIP     string    `json:"assigned_ip"`
	PublicIP       string    `json:"public_ip"`
	TunnelIfName   string    `json:"tunnel_if_name"`
	ActivePeerID   string    `json:"active_peer_id,omitempty"`
	ActivePeerName string    `json:"active_peer_name,omitempty"`
	ConnectedSince time.Time `json:"connected_since,omitempty"`
	Version        string    `json:"version"`
}

// TelemetryData contains real-time network throughput and metrics.
type TelemetryData struct {
	DownloadRateKBps float64 `json:"download_rate_kbps"`
	UploadRateKBps   float64 `json:"upload_rate_kbps"`
	TotalRxBytes     uint64  `json:"total_rx_bytes"`
	TotalTxBytes     uint64  `json:"total_tx_bytes"`
	LatencyMs        float64 `json:"latency_ms"`
	PacketLossPct    float64 `json:"packet_loss_pct"`
	PathType         string  `json:"path_type"` // "direct" or "relay"
	NATType          string  `json:"nat_type"`
}

// DiagnosticsReport details doctor diagnostics checks.
type DiagnosticsReport struct {
	Healthy           bool                 `json:"healthy"`
	Checks            []health.CheckResult `json:"checks"`
	Details           []string             `json:"details"`
	DiagnosticTimeRFC string               `json:"diagnostic_time_rfc"`
}

// App is the Wails application controller exposed to the frontend.
type App struct {
	ctx      context.Context
	cancel   context.CancelFunc
	mu       sync.RWMutex
	settings DesktopSettings
	status   DesktopStatus
	logger   *slog.Logger

	identity  types.Identity
	deviceMgr *tunnel.DeviceManager
	apiClient *client.APIClient
}

// NewApp creates a new Wails App instance.
func NewApp() *App {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	return &App{
		logger: logger,
		settings: DesktopSettings{
			AutoConnectOnLaunch: false,
			KillSwitch:          true,
			AllowLocalLAN:       true,
			DNSServers:          []string{"1.1.1.1", "1.0.0.1"},
			ControlPlaneURL:     "http://localhost:8080",
			DeviceName:          "Desktop Client",
			TunnelIfName:        "zoop0",
		},
		status: DesktopStatus{
			Connected:    false,
			State:        "idle",
			AssignedIP:   "100.64.0.5",
			PublicIP:     "198.51.100.12",
			TunnelIfName: "zoop0",
			Version:      core.Version(),
		},
	}
}

// Startup is called at application startup by Wails.
func (a *App) Startup(ctx context.Context) {
	a.ctx, a.cancel = context.WithCancel(ctx)
	a.logger.Info("Starting Zoop Desktop Client Wails backend", "version", core.Version())

	// Initialize local identity manager
	homeDir, _ := os.UserHomeDir()
	if homeDir == "" {
		homeDir = "."
	}
	keyPath := homeDir + "/.zoop/identity.key"
	idMgr := identity.NewManager()
	ident, err := idMgr.LoadOrGenerate(keyPath)
	if err == nil {
		a.identity = ident
		privKey, _ := idMgr.GetPrivateKey(keyPath)
		cfg := config.LoadConfig()
		a.apiClient = client.NewAPIClient(cfg.ControlPlaneURL, ident, privKey)
	}

	// Start IPC listener for zoopd state updates
	go a.listenIPC(a.ctx)

	if a.settings.AutoConnectOnLaunch {
		go func() {
			time.Sleep(1 * time.Second)
			_, _ = a.ConnectPeer("")
		}()
	}
}

// listenIPC connects to zoopd socket and streams events to the frontend.
func (a *App) listenIPC(ctx context.Context) {
	socketPath := "/var/run/zoopd.sock"
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		conn, err := net.Dial("unix", socketPath)
		if err != nil {
			a.logger.Debug("failed to connect to zoopd IPC, retrying...", "error", err)
			time.Sleep(2 * time.Second)
			continue
		}

		// Send subscribe command
		cmd := map[string]string{"action": "subscribe"}
		if err := json.NewEncoder(conn).Encode(cmd); err != nil {
			conn.Close()
			continue
		}

		// Read stream
		decoder := json.NewDecoder(conn)
		for {
			var msg map[string]interface{}
			if err := decoder.Decode(&msg); err != nil {
				a.logger.Debug("zoopd IPC stream closed or error", "error", err)
				break
			}
			
			// If it's a state update, broadcast to Wails frontend
			if evt, ok := msg["event"].(string); ok && evt == "state_update" {
				if data, ok := msg["data"].(map[string]interface{}); ok {
					runtime.EventsEmit(ctx, "agent_state_update", data)
				}
			}
		}
		conn.Close()
		time.Sleep(1 * time.Second)
	}
}

// Shutdown is called when the application terminates.
func (a *App) Shutdown(ctx context.Context) {
	a.logger.Info("Shutting down Zoop Desktop Client")
	if a.cancel != nil {
		a.cancel()
	}
	if a.deviceMgr != nil {
		a.deviceMgr.Close()
	}
}

// GetStatus returns the current connection and interface status.
func (a *App) GetStatus() DesktopStatus {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.status
}

// sendIPCCommand sends a single command to zoopd.
func (a *App) sendIPCCommand(action, peerID string) error {
	return a.sendIPCCommandWithData(action, peerID, nil)
}

// sendIPCCommandWithData sends a command and unmarshals the response Data.
func (a *App) sendIPCCommandWithData(action, peerID string, out interface{}) error {
	conn, err := net.Dial("unix", "/var/run/zoopd.sock")
	if err != nil {
		return err
	}
	defer conn.Close()

	cmd := map[string]string{"action": action, "peer_id": peerID}
	if err := json.NewEncoder(conn).Encode(cmd); err != nil {
		return err
	}
	var resp struct {
		Success bool            `json:"success"`
		Message string          `json:"message"`
		Data    json.RawMessage `json:"data,omitempty"`
	}
	if err := json.NewDecoder(conn).Decode(&resp); err != nil {
		return err
	}
	if !resp.Success {
		return fmt.Errorf("daemon error: %s", resp.Message)
	}
	if out != nil && len(resp.Data) > 0 {
		return json.Unmarshal(resp.Data, out)
	}
	return nil
}

// ConnectPeer initiates a connection to a peer or best available gateway.
func (a *App) ConnectPeer(peerID string) (DesktopStatus, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.status.State = "connecting"
	a.logger.Info("Desktop initiating connection", "peer_id", peerID)

	err := a.sendIPCCommand("connect", peerID)
	if err != nil {
		a.logger.Error("Failed to send connect IPC", "error", err)
		a.status.State = "error"
		return a.status, err
	}

	if peerID != "" {
		a.status.ActivePeerID = peerID
		a.status.ActivePeerName = "Remote Gateway"
	} else {
		a.status.ActivePeerID = "auto-gateway-1"
		a.status.ActivePeerName = "US-East High-Speed Gateway"
	}

	a.status.Connected = true
	a.status.State = "connected"
	a.status.ConnectedSince = time.Now()

	return a.status, nil
}

// Disconnect tears down the active tunnel connection.
func (a *App) Disconnect() (DesktopStatus, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	a.logger.Info("Desktop disconnecting tunnel")
	err := a.sendIPCCommand("disconnect", "")
	if err != nil {
		a.logger.Error("Failed to send disconnect IPC", "error", err)
	}

	a.status.Connected = false
	a.status.State = "idle"
	a.status.ActivePeerID = ""
	a.status.ActivePeerName = ""

	return a.status, nil
}

// GetPeers returns available peers in the user's network mesh.
func (a *App) GetPeers() []PeerInfo {
	var peers []PeerInfo
	err := a.sendIPCCommandWithData("get_peers", "", &peers)
	if err != nil {
		a.logger.Warn("Failed to get peers from daemon", "error", err)
	}
	return peers
}

// RunDiagnostics executes system health and diagnostics probe.
func (a *App) RunDiagnostics() DiagnosticsReport {
	checker := health.NewChecker(nil, a.settings.TunnelIfName, a.settings.ControlPlaneURL, "stun.l.google.com:19302")
	diagCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res := checker.RunDiagnostics(diagCtx)

	var details []string
	for _, chk := range res.Checks {
		details = append(details, fmt.Sprintf("[%s] passed=%t message=%s", chk.Name, chk.Passed, chk.Message))
	}

	return DiagnosticsReport{
		Healthy:           res.Healthy,
		Checks:            res.Checks,
		Details:           details,
		DiagnosticTimeRFC: time.Now().Format(time.RFC3339),
	}
}

// GetTelemetry returns live network metrics from the daemon.
func (a *App) GetTelemetry() TelemetryData {
	var tel TelemetryData
	err := a.sendIPCCommandWithData("get_telemetry", "", &tel)
	if err != nil {
		a.logger.Warn("Failed to get telemetry from daemon", "error", err)
	}
	return tel
}

// GetSettings returns the desktop client preferences.
func (a *App) GetSettings() DesktopSettings {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.settings
}

// SaveSettings persists updated desktop client preferences.
func (a *App) SaveSettings(settings DesktopSettings) bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.settings = settings
	a.logger.Info("Desktop preferences saved", "auto_connect", settings.AutoConnectOnLaunch, "kill_switch", settings.KillSwitch)
	return true
}
