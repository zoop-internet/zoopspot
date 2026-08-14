package mobile

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// StateCallback defines the interface for delivering real-time connection
// lifecycle events to native host platforms (Android Kotlin / iOS Swift).
type StateCallback interface {
	OnStateChange(state string, endpoint string, isDirect bool)
	OnError(errorCode string, message string)
}

// MobileConfig holds configuration passed from the mobile app during startup.
type MobileConfig struct {
	DeviceID string `json:"device_id"`
	CloudURL string `json:"cloud_url"`
	LogLevel string `json:"log_level,omitempty"`
}

// ConnectionStatusDTO encapsulates the current connection state for polling.
type ConnectionStatusDTO struct {
	State          string `json:"state"`
	ActiveEndpoint string `json:"active_endpoint"`
	IsDirect       bool   `json:"is_direct"`
	IsInitialized  bool   `json:"is_initialized"`
	HasTunnel      bool   `json:"has_tunnel"`
}

var (
	mu             sync.RWMutex
	devMgr         *tunnel.DeviceManager
	recMgr         *tunnel.ConnectionRecoveryManager
	cancelFn       context.CancelFunc
	activeCtx      context.Context
	activeCallback StateCallback
	currentStatus  ConnectionStatusDTO
)

// InitMobile initializes the core Zoop mobile runtime and registers the event callback.
func InitMobile(configJSON string, callback StateCallback) error {
	mu.Lock()
	defer mu.Unlock()

	activeCallback = callback

	var cfg MobileConfig
	if configJSON != "" {
		if err := json.Unmarshal([]byte(configJSON), &cfg); err != nil {
			if callback != nil {
				callback.OnError("CONFIG_ERROR", fmt.Sprintf("invalid config json: %v", err))
			}
			return fmt.Errorf("invalid config json: %w", err)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	activeCtx = ctx
	cancelFn = cancel

	currentStatus = ConnectionStatusDTO{
		State:         "initialized",
		IsInitialized: true,
		HasTunnel:     false,
	}

	if callback != nil {
		callback.OnStateChange("initialized", "", false)
	}

	slog.Info("Zoop Mobile Core initialized", "device_id", cfg.DeviceID, "cloud_url", cfg.CloudURL)
	return nil
}

// StartTunnel attaches the WireGuard data plane to an OS-provided TUN file descriptor
// (e.g. from Android VpnService or iOS NEPacketTunnelProvider).
func StartTunnel(fd int, ifName string) error {
	mu.Lock()
	defer mu.Unlock()

	if devMgr != nil {
		devMgr.Close()
	}

	if activeCtx == nil {
		ctx, cancel := context.WithCancel(context.Background())
		activeCtx = ctx
		cancelFn = cancel
	}

	dm, err := tunnel.NewDeviceManagerWithFD(fd, ifName, nil)
	if err != nil {
		if activeCallback != nil {
			activeCallback.OnError("TUNNEL_ERROR", fmt.Sprintf("failed to create DeviceManager from FD: %v", err))
		}
		return fmt.Errorf("failed to create DeviceManager from FD: %w", err)
	}

	devMgr = dm
	currentStatus.HasTunnel = true
	currentStatus.State = "tunnel_ready"

	if activeCallback != nil {
		activeCallback.OnStateChange("tunnel_ready", "", false)
	}

	slog.Info("Mobile WireGuard data plane attached to native FD", "fd", fd, "interface", ifName)
	return nil
}

// ConnectPeer initiates P2P WireGuard connection, STUN path probing, and recovery manager.
func ConnectPeer(peerPubKeyHex string, candidatesJSON string, relayURL string) error {
	mu.Lock()
	defer mu.Unlock()

	if devMgr == nil {
		err := fmt.Errorf("tunnel not started: call StartTunnel first")
		if activeCallback != nil {
			activeCallback.OnError("NOT_READY", err.Error())
		}
		return err
	}

	peerKey, err := tunnel.ParsePublicKey(peerPubKeyHex)
	if err != nil {
		if activeCallback != nil {
			activeCallback.OnError("KEY_ERROR", fmt.Sprintf("invalid peer key: %v", err))
		}
		return fmt.Errorf("invalid peer key: %w", err)
	}

	var candidates []types.EndpointCandidate
	if candidatesJSON != "" {
		if err := json.Unmarshal([]byte(candidatesJSON), &candidates); err != nil {
			if activeCallback != nil {
				activeCallback.OnError("CANDIDATES_ERROR", fmt.Sprintf("invalid candidates json: %v", err))
			}
			return fmt.Errorf("invalid candidates json: %w", err)
		}
	}

	port, _ := devMgr.GetListenPort()
	recMgr = tunnel.NewConnectionRecoveryManager(
		devMgr.GetMuxBind(),
		peerKey,
		candidates,
		"mobile-conn",
		port,
		devMgr,
		relayURL,
		func(newState tunnel.ConnectionRecoveryState, activeEndpoint string, isDirect bool) {
			mu.Lock()
			currentStatus.State = string(newState)
			currentStatus.ActiveEndpoint = activeEndpoint
			currentStatus.IsDirect = isDirect
			cb := activeCallback
			mu.Unlock()

			if cb != nil {
				cb.OnStateChange(string(newState), activeEndpoint, isDirect)
			}
			slog.Info("Mobile connection state changed", "state", newState, "endpoint", activeEndpoint, "is_direct", isDirect)
		},
		slog.Default(),
	)

	recMgr.Start(activeCtx)
	currentStatus.State = "connecting"
	if activeCallback != nil {
		activeCallback.OnStateChange("connecting", "", false)
	}

	return nil
}

// NotifyNetworkChange is called when Android ConnectivityManager or iOS NWPathMonitor
// detects a network change (e.g. Wi-Fi <-> Cellular roaming).
func NotifyNetworkChange(networkType string) {
	mu.Lock()
	rm := recMgr
	cb := activeCallback
	mu.Unlock()

	slog.Info("Mobile network change event received", "network_type", networkType)
	if rm != nil {
		// ConnectionRecoveryManager will trigger probing on next heartbeat or trigger event
	}

	if cb != nil {
		cb.OnStateChange("roaming", networkType, false)
	}
}

// GetConnectionStatus returns the current serialized connection status JSON.
func GetConnectionStatus() string {
	mu.RLock()
	defer mu.RUnlock()

	data, err := json.Marshal(currentStatus)
	if err != nil {
		return `{"state":"unknown"}`
	}
	return string(data)
}

// Disconnect gracefully stops the active connection and releases tunnel resources.
func Disconnect() {
	mu.Lock()
	defer mu.Unlock()

	if recMgr != nil {
		recMgr.Stop()
		recMgr = nil
	}

	if cancelFn != nil {
		cancelFn()
		cancelFn = nil
	}

	if devMgr != nil {
		devMgr.Close()
		devMgr = nil
	}

	currentStatus = ConnectionStatusDTO{
		State:         "disconnected",
		IsInitialized: false,
		HasTunnel:     false,
	}

	if activeCallback != nil {
		activeCallback.OnStateChange("disconnected", "", false)
	}

	slog.Info("Zoop Mobile Core disconnected")
}
