package mobile

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
	agentrelay "github.com/allannuwamanya/zoop/packages/agent/relay"
	"github.com/allannuwamanya/zoop/packages/agent/tunnel"
	"github.com/allannuwamanya/zoop/packages/core/types"
	snitransport "github.com/allannuwamanya/zoop/plugins/transport/sni"
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
	// IdentityPrivKey is the hex-encoded 32-byte Ed25519 seed for relay authentication.
	// This must match the key registered with the cloud for /v1/relay auth to succeed.
	// If empty, the WireGuard private key bytes are used as seed (works for local testing only).
	IdentityPrivKey string `json:"identity_private_key,omitempty"`
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

	// Relay transport fields — set during ConnectPeer when relayURL is provided.
	activeRelayClient   *agentrelay.RelayClient
	activeRelayBridge   *tunnel.RelayBridge
	activeIdentityKey   ed25519.PrivateKey
	activeIdentity      types.Identity
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

	// Parse or derive Ed25519 identity key for relay authentication.
	// The identity key is separate from the WireGuard key.
	activeIdentityKey = nil
	if cfg.IdentityPrivKey != "" {
		if seed, err := hex.DecodeString(cfg.IdentityPrivKey); err == nil && len(seed) == 32 {
			activeIdentityKey = ed25519.NewKeyFromSeed(seed)
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

	if err := dm.ConfigureDevice(privKey, 51820); err != nil {
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
	return ConnectPeerWithLocalIP(peerPubKeyHex, candidatesJSON, relayURL, "")
}

// ConnectPeerWithLocalIP initiates P2P WireGuard connection with explicit local IP subnet awareness.
func ConnectPeerWithLocalIP(peerPubKeyHex string, candidatesJSON string, relayURL string, localIP string) error {
	mu.Lock()
	defer mu.Unlock()

	slog.Info("ConnectPeer called", "peerKey", peerPubKeyHex, "candidatesJSON", candidatesJSON, "relayURL", relayURL, "localIP", localIP)

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
						cType := types.CandidateTypeHost
						if parsed := net.ParseIP(host); parsed != nil && !parsed.IsPrivate() && !parsed.IsLoopback() {
							cType = types.CandidateTypeSrflx
						}
						candidates = append(candidates, types.EndpointCandidate{
							IP:   host,
							Port: p,
							Type: cType,
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
			targetIP, targetPort = selectFallbackCandidateWithLocalIP(candidates, localIP)
			slog.Info("ProbeCandidatesMux fallback candidate selected", "ip", targetIP, "port", targetPort, "localIP", localIP, "err", err)
		}
	}

	allowedIPs := []string{"0.0.0.0/0", "::/0"}
	if err := devMgr.AddPeer(peerKey, targetIP, targetPort, allowedIPs); err != nil {
		slog.Warn("failed to configure initial peer", "error", err)
	} else {
		slog.Info("initial peer configured on wireguard", "ip", targetIP, "port", targetPort)
	}
	if targetIP == "" || targetPort == 0 {
		slog.Warn("ConnectPeer: no direct candidate available yet, waiting for recovery manager", "relayURL", relayURL)
	}

	// Set up relay bridge for DERP-style fallback when direct UDP is blocked.
	// The bridge is pre-connected so it's ready before DPD declares the peer dead.
	var peerRelayPort int
	if relayURL != "" {
		rc, rb, relayPort := initRelayBridge(relayURL, peerKey, false, "")
		if rc != nil {
			activeRelayClient = rc
			activeRelayBridge = rb
			peerRelayPort = relayPort
			go rc.Start(activeCtx)
		}
	}

	capturedPeerKey := peerKey
	capturedRelayPort := peerRelayPort

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
			dm := devMgr
			mu.Unlock()

			// When transitioning to relay: redirect WireGuard traffic through the relay bridge loopback port.
			if newState == tunnel.StateRelayed && capturedRelayPort > 0 && dm != nil {
				if err := dm.AddPeer(capturedPeerKey, "127.0.0.1", capturedRelayPort, []string{"0.0.0.0/0", "::/0"}); err != nil {
					slog.Warn("failed to reconfigure peer endpoint to relay loopback", "error", err)
				} else {
					slog.Info("WireGuard peer redirected through relay bridge", "loopback_port", capturedRelayPort)
				}
			}

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

	if activeRelayBridge != nil {
		_ = activeRelayBridge.Close()
		activeRelayBridge = nil
	}

	if activeRelayClient != nil {
		_ = activeRelayClient.Close()
		activeRelayClient = nil
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

// GetCandidatesJSON gathers local and STUN candidates and returns them as a JSON string.
func GetCandidatesJSON() string {
	return GetCandidatesJSONWithLocalIP("")
}

// GetCandidatesJSONWithLocalIP gathers candidates, including an explicitly provided local IP.
func GetCandidatesJSONWithLocalIP(localIP string) string {
	mu.RLock()
	dm := devMgr
	mu.RUnlock()

	var candidates []types.EndpointCandidate
	var err error

	if dm != nil {
		port, _ := dm.GetListenPort()
		candidates, err = tunnel.GatherCandidatesWithLocalIP(dm.GetMuxBind(), port, localIP)
	} else {
		candidates, err = tunnel.GatherCandidatesWithLocalIP(nil, 51820, localIP)
	}

	if len(candidates) == 0 {
		slog.Warn("failed or empty candidates gathered in mobile bridge", "err", err)
		return "[]"
	}

	data, err := json.Marshal(candidates)
	if err != nil {
		slog.Warn("failed to marshal candidates to json", "err", err)
		return "[]"
	}

	return string(data)
}

// ConnectPeerZeroBalance connects to a provider peer using the SNI-masked relay transport,
// skipping direct UDP probing entirely. Use this when the recipient's SIM has 0 MB balance:
// UDP port 51820 will be dropped by the carrier, but TLS port 443 with a zero-rated SNI passes free.
//
// carrierKey selects the front domain from sni.KnownCarrierFronts (e.g. "mtn-ug", "airtel-ug").
// peerEndpointID is the provider's endpoint UUID received from the signaling channel.
func ConnectPeerZeroBalance(peerPubKeyHex, peerEndpointID, candidatesJSON, relayURL, carrierKey string) error {
	mu.Lock()
	defer mu.Unlock()

	slog.Info("ConnectPeerZeroBalance called", "peerKey", peerPubKeyHex, "carrier", carrierKey, "relayURL", relayURL)

	if devMgr == nil {
		return fmt.Errorf("tunnel not started: call StartTunnel first")
	}

	peerKey, err := tunnel.ParsePublicKey(peerPubKeyHex)
	if err != nil {
		return fmt.Errorf("invalid peer key: %w", err)
	}

	var candidates []types.EndpointCandidate
	if candidatesJSON != "" {
		_ = json.Unmarshal([]byte(candidatesJSON), &candidates)
	}

	// Create SNI-masked relay client and bridge — no direct probe.
	rc, rb, relayPort := initRelayBridge(relayURL, peerKey, true, carrierKey)
	if rc == nil || rb == nil || relayPort == 0 {
		return fmt.Errorf("failed to initialize relay bridge for zero-balance mode")
	}

	if activeRelayBridge != nil {
		_ = activeRelayBridge.Close()
	}
	if activeRelayClient != nil {
		_ = activeRelayClient.Close()
	}
	activeRelayClient = rc
	activeRelayBridge = rb
	go rc.Start(activeCtx)

	// Route WireGuard traffic through relay loopback from the start — no direct attempt.
	if err := devMgr.AddPeer(peerKey, "127.0.0.1", relayPort, []string{"0.0.0.0/0", "::/0"}); err != nil {
		slog.Warn("ConnectPeerZeroBalance: add peer via relay loopback", "error", err)
	}

	slog.Info("zero-balance peer configured via SNI relay", "relay_port", relayPort, "carrier", carrierKey)

	recMgr = tunnel.NewConnectionRecoveryManager(
		devMgr.GetMuxBind(),
		peerKey,
		candidates,
		"mobile-zb-conn",
		relayPort,
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
		},
		slog.Default(),
	)
	recMgr.Start(activeCtx)

	currentStatus.State = "connecting_relay"
	if activeCallback != nil {
		activeCallback.OnStateChange("connecting_relay", fmt.Sprintf("127.0.0.1:%d", relayPort), false)
	}
	return nil
}

// initRelayBridge creates a RelayClient and RelayBridge for the given peer and relay URL.
// When sniMode is true it wraps the WebSocket connection with SNI masking for zero-balance mode.
// Returns (nil, nil, 0) if the relay URL is empty or the identity key is unavailable.
func initRelayBridge(relayURL string, peerKey wgtypes.Key, sniMode bool, carrierKey string) (*agentrelay.RelayClient, *tunnel.RelayBridge, int) {
	if relayURL == "" {
		return nil, nil, 0
	}

	identKey := activeIdentityKey
	if identKey == nil {
		slog.Warn("initRelayBridge: no identity key available; relay auth will fail in production")
		return nil, nil, 0
	}

	pubKey := identKey.Public().(ed25519.PublicKey)
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pubKey))
	ident := types.Identity{
		EndpointID: endpointID,
		PublicKey:  pubKey,
	}

	rc := agentrelay.NewClient(relayURL, ident, identKey, slog.Default())

	if sniMode {
		d := snitransport.New(carrierKey, "")
		wsDialer := snitransport.NewWebSocketDialer(d)
		rc.WithCustomDialer(wsDialer)
		slog.Info("relay client configured with SNI transport", "front_domain", d.FrontDomain, "carrier", carrierKey)
	}

	listenPort := 0
	if devMgr != nil {
		listenPort, _ = devMgr.GetListenPort()
	}
	rb := tunnel.NewRelayBridge(rc, listenPort, slog.Default())

	// Derive the peer's relay registration ID from their WireGuard public key.
	// In production the correct ID is the peer's Ed25519-derived endpoint UUID
	// (received via the signaling channel). This derivation is a local approximation.
	pub := peerKey.PublicKey()
	peerRelayID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub[:]))

	relayPort, err := rb.RegisterPeer(peerRelayID, peerKey)
	if err != nil {
		slog.Error("initRelayBridge: failed to register peer on relay bridge", "error", err)
		_ = rb.Close()
		return nil, nil, 0
	}

	return rc, rb, relayPort
}

// selectFallbackCandidate chooses the best candidate when live probing fails or times out.
// It prioritizes candidates on the same local subnet as the device, then STUN public
// (Srflx) candidates, then non-loopback host candidates, avoiding dead loopback endpoints.
func selectFallbackCandidate(candidates []types.EndpointCandidate) (string, int) {
	return selectFallbackCandidateWithLocalIP(candidates, "")
}

func selectFallbackCandidateWithLocalIP(candidates []types.EndpointCandidate, localIP string) (string, int) {
	return tunnel.SelectFallbackCandidateWithLocalIP(candidates, localIP)
}


