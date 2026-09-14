package mobile

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/allannuwamanya/zoop/packages/agent/tunnel"
	"github.com/allannuwamanya/zoop/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// StateCallback defines the interface for delivering real-time connection
// lifecycle events to native host platforms (Android Kotlin / iOS Swift).
type StateCallback interface {
	OnStateChange(state string, endpoint string, isDirect bool)
	OnError(errorCode string, message string)
	OnProtectSocket(fd int) bool
}

// MobileConfig holds configuration passed from the mobile app during startup.
type MobileConfig struct {
	DeviceID         string `json:"device_id"`
	CloudURL         string `json:"cloud_url"`
	LogLevel         string `json:"log_level,omitempty"`
	WireGuardPrivKey string `json:"wireguard_private_key,omitempty"`
}

// ConnectionStatusDTO encapsulates the current connection state for polling.
type ConnectionStatusDTO struct {
	State          string   `json:"state"`
	ActiveEndpoint string   `json:"active_endpoint"`
	IsDirect       bool     `json:"is_direct"`
	IsInitialized  bool     `json:"is_initialized"`
	HasTunnel      bool     `json:"has_tunnel"`
	DNSServers     []string `json:"dns_servers,omitempty"`
	IsPaused       bool     `json:"is_paused"`
}

var (
	mu             sync.RWMutex
	devMgr         *tunnel.DeviceManager
	recMgr         *tunnel.ConnectionRecoveryManager
	cancelFn       context.CancelFunc
	activeCtx      context.Context
	activeCallback StateCallback
	activeConfig   MobileConfig
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
	activeConfig = cfg

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

	// Register socket protector callback with DeviceManager's MuxBind so any opened UDP socket is protected from the VPN
	if activeCallback != nil {
		dm.SetSocketProtector(func(sockFd int) {
			slog.Info("Protecting mobile UDP socket via callback", "fd", sockFd)
			activeCallback.OnProtectSocket(sockFd)
		})
	}

	// Configure WireGuard device with private key
	var privKey wgtypes.Key
	if activeConfig.WireGuardPrivKey != "" {
		if k, err := wgtypes.ParseKey(activeConfig.WireGuardPrivKey); err == nil {
			privKey = k
		} else if b, err := hex.DecodeString(activeConfig.WireGuardPrivKey); err == nil && len(b) == 32 {
			copy(privKey[:], b)
		}
	}
	if privKey == (wgtypes.Key{}) {
		privKey, err = wgtypes.GeneratePrivateKey()
		if err != nil {
			return fmt.Errorf("failed to generate wireguard private key: %w", err)
		}
	}

	if err := dm.ConfigureDevice(privKey, 0); err != nil {
		if activeCallback != nil {
			activeCallback.OnError("DEVICE_CONFIG_ERROR", fmt.Sprintf("failed to configure device: %v", err))
		}
		return fmt.Errorf("failed to configure wireguard device: %w", err)
	}

	devMgr = dm
	currentStatus.HasTunnel = true
	currentStatus.State = "tunnel_ready"

	if activeCallback != nil {
		activeCallback.OnStateChange("tunnel_ready", "", false)
	}

	slog.Info("Mobile WireGuard data plane attached to native FD", "fd", fd, "interface", ifName, "public_key", privKey.PublicKey().String())
	return nil
}

// ConnectPeer initiates P2P WireGuard connection, STUN path probing, and recovery manager.
func ConnectPeer(peerPubKeyHex string, candidatesJSON string, relayURL string) error {
	mu.Lock()
	defer mu.Unlock()

	slog.Info("ConnectPeer called", "peerKey", peerPubKeyHex, "candidatesJSON", candidatesJSON, "relayURL", relayURL)

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
			// Fallback: try parsing as []string e.g. ["10.250.0.10:51820", ...]
			var strCandidates []string
			if errStr := json.Unmarshal([]byte(candidatesJSON), &strCandidates); errStr == nil {
				for _, s := range strCandidates {
					host, portStr, splitErr := net.SplitHostPort(s)
					if splitErr == nil {
						p, _ := strconv.Atoi(portStr)
						candidates = append(candidates, types.EndpointCandidate{
							IP:   host,
							Port: p,
							Type: types.CandidateTypeHost,
						})
					}
				}
			} else {
				slog.Warn("failed to parse candidates json", "err", err)
			}
		}
	}

	port, _ := devMgr.GetListenPort()
	slog.Info("ConnectPeer state", "listenPort", port, "candidateCount", len(candidates))

	// Initial peer connection: pick best candidate or fallback to first candidate
	targetIP := ""
	targetPort := 0
	if len(candidates) > 0 {
		probeCtx, probeCancel := context.WithTimeout(activeCtx, 1500*time.Millisecond)
		bestCand, err := tunnel.ProbeCandidatesMux(probeCtx, devMgr.GetMuxBind(), candidates, "mobile-conn", port)
		probeCancel()
		if err == nil && bestCand != nil {
			targetIP = bestCand.IP
			targetPort = bestCand.Port
			slog.Info("ProbeCandidatesMux selected optimal candidate", "ip", targetIP, "port", targetPort)
		} else {
			targetIP = candidates[0].IP
			targetPort = candidates[0].Port
			slog.Info("ProbeCandidatesMux fallback to candidate[0]", "ip", targetIP, "port", targetPort, "err", err)
		}
	}

	if targetIP != "" && targetPort != 0 {
		allowedIPs := []string{"0.0.0.0/0", "::/0"}
		if err := devMgr.AddPeer(peerKey, targetIP, targetPort, allowedIPs); err != nil {
			slog.Warn("failed to configure initial peer", "error", err)
		} else {
			slog.Info("initial peer configured on wireguard", "ip", targetIP, "port", targetPort)
		}
	} else {
		slog.Warn("ConnectPeer: no direct candidate available yet, waiting for recovery manager", "relayURL", relayURL)
	}

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
		endpointStr := ""
		if targetIP != "" && targetPort != 0 {
			endpointStr = fmt.Sprintf("%s:%d", targetIP, targetPort)
		}
		activeCallback.OnStateChange("connecting", endpointStr, true)
	}

	return nil
}

// PauseMobile pauses active probing loops when Android (Doze) or iOS suspends the app process.
func PauseMobile() {
	mu.Lock()
	defer mu.Unlock()

	currentStatus.IsPaused = true
	if recMgr != nil {
		recMgr.Stop()
	}

	if activeCallback != nil {
		activeCallback.OnStateChange("paused", currentStatus.ActiveEndpoint, currentStatus.IsDirect)
	}
	slog.Info("Zoop Mobile Core background paused")
}

// ResumeMobile resumes connection probing loops when the mobile OS brings the app back to foreground.
func ResumeMobile() {
	mu.Lock()
	defer mu.Unlock()

	currentStatus.IsPaused = false
	if recMgr != nil && activeCtx != nil {
		recMgr.Start(activeCtx)
	}

	if activeCallback != nil {
		activeCallback.OnStateChange(currentStatus.State, currentStatus.ActiveEndpoint, currentStatus.IsDirect)
	}
	slog.Info("Zoop Mobile Core foreground resumed")
}

// NotifyNetworkChange is called when Android ConnectivityManager or iOS NWPathMonitor
// detects a network change (e.g. Wi-Fi <-> Cellular roaming).
func NotifyNetworkChange(networkType string) {
	mu.Lock()
	rm := recMgr
	cb := activeCallback
	mu.Unlock()

	slog.Info("Mobile network change event received", "network_type", networkType)
	if rm != nil && !currentStatus.IsPaused {
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
