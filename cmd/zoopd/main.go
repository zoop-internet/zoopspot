package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"flag"
	"fmt"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/zoop-internet/zoopspot/packages/agent/client"
	"github.com/zoop-internet/zoopspot/packages/agent/health"
	"github.com/zoop-internet/zoopspot/packages/agent/identity"
	"github.com/zoop-internet/zoopspot/packages/agent/relay"
	"github.com/zoop-internet/zoopspot/packages/agent/state"
	"github.com/zoop-internet/zoopspot/packages/agent/telemetry"
	"github.com/zoop-internet/zoopspot/packages/agent/tunnel"
	"github.com/zoop-internet/zoopspot/packages/core/config"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

const defaultSocketPath = "/var/run/zoopd.sock"

type DaemonCommand struct {
	Action       string `json:"action"`
	PeerID       string `json:"peer_id,omitempty"`
	ConnectionID string `json:"connection_id,omitempty"`
}

type DaemonResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func main() {
	if len(os.Args) > 1 {
		if os.Args[1] == "service" {
			action := "status"
			if len(os.Args) > 2 {
				action = os.Args[2]
			}
			if err := HandleServiceCommand(action); err != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
				os.Exit(1)
			}
			return
		} else if os.Args[1] == "doctor" {
			cfg := config.LoadConfig()
			runDoctor("zoop0", cfg.ControlPlaneURL, cfg.STUNServer)
			return
		} else if os.Args[1] == "--help" || os.Args[1] == "-h" {
			fmt.Println("Zoop Internet Daemon (zoopd)")
			fmt.Println("Usage:")
			fmt.Println("  zoopd [flags]             Run daemon in foreground")
			fmt.Println("  zoopd doctor              Run comprehensive diagnostics probe and report")
			fmt.Println("  zoopd service install     Install and enable system service")
			fmt.Println("  zoopd service start       Start system service")
			fmt.Println("  zoopd service stop        Stop system service")
			fmt.Println("  zoopd service restart     Restart system service")
			fmt.Println("  zoopd service status      Check service and socket status")
			fmt.Println("  zoopd service uninstall   Remove system service")
			fmt.Println("\nFlags:")
			fmt.Println("  -tun <name>               WireGuard interface name (default: zoop0)")
			fmt.Println("  -config-dir <dir>         Configuration and key storage directory")
			fmt.Println("  -api-port <port>          Metrics and health API listen port (default: 9090)")
			fmt.Println("  -api-tls-port <port>      Local HTTPS API listen port (default: 9443, 0 to disable)")
			fmt.Println("  -socket <path>            UNIX domain socket path (default: /var/run/zoopd.sock)")
			fmt.Println("  -doctor                   Run comprehensive diagnostics probe and exit")
			return
		}
	}

	tunFlag := flag.String("tun", "zoop0", "WireGuard interface name")
	configDirFlag := flag.String("config-dir", "", "Override configuration directory")
	apiPortFlag := flag.Int("api-port", 9090, "Local metrics/health HTTP API listen port")
	apiTLSPortFlag := flag.Int("api-tls-port", 9443, "Local HTTPS API listen port (0 to disable)")
	socketFlag := flag.String("socket", defaultSocketPath, "UNIX domain socket path")
	doctorFlag := flag.Bool("doctor", false, "Run comprehensive diagnostics probe and exit")
	mockTunFlag := flag.Bool("mock-tun", false, "Use an in-memory WireGuard device (no root required, for development/testing)")
	nameFlag := flag.String("name", "", "Custom display name for this node (defaults to system hostname)")
	flag.Parse()

	cfg := config.LoadConfig()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	if *doctorFlag {
		runDoctor(*tunFlag, cfg.ControlPlaneURL, cfg.STUNServer)
		return
	}

	logger.Info("Starting Zoop Internet System Daemon (zoopd)")

	// Setup local identity.
	var keyPath string
	if *configDirFlag != "" {
		keyPath = filepath.Join(*configDirFlag, "identity.key")
	} else {
		homeDir, _ := os.UserHomeDir()
		if homeDir == "" {
			homeDir = "/var/lib/zoop"
		}
		keyPath = filepath.Join(homeDir, ".zoop", "identity.key")
	}
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
	var devMgr *tunnel.DeviceManager
	if *mockTunFlag {
		devMgr, err = tunnel.NewMockDeviceManager(*tunFlag, nil)
	} else {
		devMgr, err = tunnel.NewDeviceManager(*tunFlag, nil)
	}
	if err != nil {
		logger.Error("failed to initialize TUN device", "interface", *tunFlag, "mock", *mockTunFlag, "error", err)
		os.Exit(1)
	}
	defer devMgr.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setup Signaling and Device Registration
	wgKeys, err := tunnel.GenerateKeyPair()
	if err == nil {
		listenPort := 51820
		if err := devMgr.ConfigureDevice(wgKeys.PrivateKey, listenPort); err != nil {
			logger.Warn("failed to bind wireguard to port 51820, falling back to dynamic port", "error", err)
			if err := devMgr.ConfigureDevice(wgKeys.PrivateKey, 0); err != nil {
				logger.Error("failed to configure wireguard device", "error", err)
			}
		}

		deviceName := *nameFlag
		if envName := os.Getenv("ZOOP_DEVICE_NAME"); envName != "" {
			deviceName = envName
		}
		if deviceName == "" {
			deviceName, _ = os.Hostname()
			if deviceName == "" {
				deviceName = "Zoop Host"
			}
		}

		regCtx, regCancel := context.WithTimeout(ctx, 10*time.Second)
		defer regCancel()

		if _, err := apiClient.RegisterDevice(regCtx, deviceName, wgKeys.EncodePublicKey()); err != nil {
			logger.Error("failed to register device with cloud", "error", err)
		} else {
			logger.Info("device successfully registered")
			tokenResp, err := apiClient.CreatePairingToken(regCtx, 3600)
			if err != nil {
				logger.Warn("could not generate initial pairing token", "error", err)
			} else {
				logger.Info("Zoop Mobile Pairing PIN ready", "pairing_code", tokenResp.Code, "zoop_id", tokenResp.ZoopID, "valid_for", "60m")
			}
		}
	}

	// Initialize Relay Client and Relay Bridge for zero-decryption DERP fallback
	relayWS := strings.Replace(cfg.ControlPlaneURL, "http://", "ws://", 1)
	relayWS = strings.Replace(relayWS, "https://", "wss://", 1)
	relayURL := relayWS + "/v1/relay"

	var relayBridge *tunnel.RelayBridge
	if devMgr != nil {
		listenPort, _ := devMgr.GetListenPort()
		relayClient := relay.NewClient(relayURL, ident, privKey, logger)
		go relayClient.Start(ctx)
		defer relayClient.Close()

		relayBridge = tunnel.NewRelayBridge(relayClient, listenPort, logger)
		defer relayBridge.Close()
	}

	sigClient := client.NewSignalingClient(apiClient, devMgr, logger)
	if relayBridge != nil {
		sigClient.SetRelayBridge(relayBridge)
	}
	go sigClient.Connect(ctx)

	// Initialize Roaming Manager for automatic Wi-Fi <-> Ethernet <-> Cellular recovery
	roamingMgr := tunnel.NewRoamingManager(cfg.STUNServer, 51820, func(event tunnel.NetworkChangeEvent, candidates []types.EndpointCandidate) {
		logger.Info("network roaming event triggered", "reason", event.Reason, "primary_ip", event.PrimaryIP, "candidates", len(candidates))
	}, logger)
	roamingMgr.Start(ctx)
	defer roamingMgr.Stop()

	socketPath := *socketFlag

	// Socket listener setup.
	_ = os.Remove(socketPath)
	_ = os.MkdirAll(filepath.Dir(socketPath), 0755)

	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		logger.Error("failed to listen on daemon UNIX socket", "path", socketPath, "error", err)
		os.Exit(1)
	}
	_ = os.Chmod(socketPath, 0666)
	defer listener.Close()

	logger.Info("zoopd IPC listener active", "socket", socketPath)

	// Start HTTP metrics, health and local management API
	go func() {
		mux := http.NewServeMux()
		stMgr := state.NewManager()
		stMgr.Set(state.StateRunning)
		healthChecker := health.NewChecker(stMgr, *tunFlag, cfg.ControlPlaneURL, cfg.STUNServer)
		mux.HandleFunc("GET /health", healthChecker.WriteHTTP)
		mux.Handle("GET /metrics", promhttp.Handler())

		// Local management API (localhost only) used by the web UI.
		daemon := &daemonAPI{
			ctx:        ctx,
			logger:     logger,
			apiClient:  apiClient,
			sigClient:  sigClient,
			devMgr:     devMgr,
			roamingMgr: roamingMgr,
			configDir:  filepath.Dir(keyPath),
		}
		mux.Handle("/api/", daemon.routes())

		apiPort := *apiPortFlag
		srv := &http.Server{Addr: fmt.Sprintf("127.0.0.1:%d", apiPort), Handler: mux}
		logger.Info("local management HTTP API listening", "port", apiPort)

		// Start local HTTPS listener to allow HTTPS Web dashboards (https://app.zoop.network) to connect
		if *apiTLSPortFlag > 0 {
			cert, err := generateLocalhostCertificate()
			if err != nil {
				logger.Warn("failed to generate localhost TLS certificate", "error", err)
			} else {
				tlsPort := *apiTLSPortFlag
				tlsSrv := &http.Server{
					Addr:    fmt.Sprintf("127.0.0.1:%d", tlsPort),
					Handler: mux,
					TLSConfig: &tls.Config{
						Certificates: []tls.Certificate{cert},
					},
				}
				go func() {
					logger.Info("local management HTTPS API listening", "port", tlsPort)
					if err := tlsSrv.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
						logger.Error("HTTPS local API failed", "error", err)
					}
				}()
			}
		}

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("metrics API failed", "error", err)
		}
	}()

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
			go handleIPC(ctx, cancel, conn, devMgr, apiClient, sigClient, logger)
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
	sigClient *client.SignalingClient,
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
		uapi, _ := devMgr.IpcGet()
		resp = DaemonResponse{
			Success: true,
			Message: fmt.Sprintf("zoopd running. WireGuard Port=%d PubKey=%s", port, devMgr.PublicKey().String()),
			Data:    uapi,
		}

	case "sync", "resync":
		if sigClient != nil {
			go sigClient.Resync(ctx)
		}
		resp = DaemonResponse{
			Success: true,
			Message: "signaling resync triggered",
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
		var candidates []types.EndpointCandidate
		var wgPubKey string
		var listenPort int
		if devMgr != nil {
			wgPubKey = devMgr.PublicKey().String()
			if p, err := devMgr.GetListenPort(); err == nil {
				listenPort = p
				if cands, err := tunnel.GatherCandidatesMux(devMgr.GetMuxBind(), listenPort); err == nil {
					candidates = cands
				}
			}
		}
		var endpointIP string
		if len(candidates) > 0 {
			endpointIP = candidates[0].IP
		}

		connResp, err := apiClient.RequestConnectionWithEndpoints(ctx, providerID, wgPubKey, endpointIP, listenPort, candidates)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("failed to request connection: %v", err)}
			break
		}
		resp = DaemonResponse{
			Success: true,
			Message: fmt.Sprintf("connection request submitted: id=%s state=%s", connResp.ID, connResp.State),
		}

	case "disconnect":
		connID := cmd.ConnectionID
		if connID == "" {
			resp = DaemonResponse{Success: false, Message: "connection_id is required for disconnect"}
			break
		}
		parsedConnID, err := uuid.Parse(connID)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("invalid connection_id format: %v", err)}
			break
		}

		if err := sigClient.DisconnectConnection(ctx, types.ID(parsedConnID)); err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("failed to disconnect: %v", err)}
			break
		}
		resp = DaemonResponse{Success: true, Message: "tunnel disconnected"}

	case "pair_device":
		if cmd.PeerID == "" {
			resp = DaemonResponse{Success: false, Message: "pairing code required (e.g. ZP-XXXXXX)"}
			break
		}
		claimResp, err := apiClient.ClaimPairingToken(ctx, cmd.PeerID)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("pairing failed: %v", err)}
			break
		}
		resp = DaemonResponse{
			Success: true,
			Message: fmt.Sprintf("Successfully paired with %s (ID: %s)", claimResp.PairedDeviceName, claimResp.PairedDeviceID),
			Data:    claimResp,
		}

	case "create_pairing_token", "token", "pin":
		tokenResp, err := apiClient.CreatePairingToken(ctx, 3600)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("failed to generate pairing token: %v", err)}
			break
		}
		resp = DaemonResponse{
			Success: true,
			Message: fmt.Sprintf("Pairing PIN generated: %s (ZoopID: %s, valid for 60m)", tokenResp.Code, tokenResp.ZoopID),
			Data:    tokenResp,
		}

	case "run_diagnostics":
		cloudURL := "http://localhost:8080"
		if apiClient != nil && apiClient.BaseURL != "" {
			cloudURL = apiClient.BaseURL
		}
		tunName := "zoop0"
		if devMgr != nil && devMgr.InterfaceName() != "" {
			tunName = devMgr.InterfaceName()
		}
		sm := state.NewManager()
		sm.Set(state.StateRunning)
		checker := health.NewChecker(sm, tunName, cloudURL, "stun.l.google.com:19302")
		report := checker.RunDiagnostics(ctx)
		resp = DaemonResponse{
			Success: true,
			Message: "Diagnostics completed",
			Data:    report,
		}

	case "get_peers":
		devices, err := apiClient.ListDevices(ctx)
		if err != nil {
			resp = DaemonResponse{Success: false, Message: fmt.Sprintf("failed to get peers: %v", err)}
			break
		}

		snaps := telemetry.GetTracker().GetSnapshots()
		snapByPeer := make(map[string]telemetry.PeerTelemetrySnapshot, len(snaps))
		for _, s := range snaps {
			snapByPeer[s.PeerID] = s
		}

		// Parse into a friendly format
		var peers []map[string]interface{}
		for _, dev := range devices {
			if dev.ID.String() == apiClient.Identity.EndpointID.String() {
				continue // skip self
			}
			isOnline := dev.Status == "online" || dev.Status == "active" || dev.Status == "trusted"
			latency := 0.0
			directAvailable := false
			connected := false
			var rxBytes, txBytes uint64

			if s, ok := snapByPeer[dev.ID.String()]; ok {
				connected = s.State == "connected"
				latency = s.HandshakeRTTMs
				directAvailable = s.PathType == "direct_host" || s.PathType == "direct_srflx"
				rxBytes = s.RxBytes
				txBytes = s.TxBytes
			}

			peers = append(peers, map[string]interface{}{
				"id":               dev.ID.String(),
				"name":             dev.Name,
				"platform":         dev.OS,
				"status":           dev.Status,
				"virtual_ip":       "",
				"is_provider":      true,
				"online":           isOnline,
				"connected":        connected,
				"latency_ms":       latency,
				"direct_available": directAvailable,
				"rx_bytes":         rxBytes,
				"tx_bytes":         txBytes,
			})
		}
		resp = DaemonResponse{Success: true, Message: "peers retrieved", Data: peers}

	case "get_telemetry":
		snaps := telemetry.GetTracker().GetSnapshots()
		var totalRx, totalTx uint64
		var avgLatency float64
		var avgLoss float64
		pathType := "direct"
		connectedPeers := 0

		for _, s := range snaps {
			totalRx += s.RxBytes
			totalTx += s.TxBytes
			if s.State == "connected" {
				avgLatency += s.HandshakeRTTMs
				avgLoss += s.PacketLossPercent
				connectedPeers++
				if s.PathType != "" {
					pathType = s.PathType
				}
			}
		}
		if connectedPeers > 1 {
			avgLatency = avgLatency / float64(connectedPeers)
			avgLoss = avgLoss / float64(connectedPeers)
		}

		resp = DaemonResponse{
			Success: true,
			Message: "telemetry retrieved",
			Data: map[string]interface{}{
				"download_rate_kbps": 0.0,
				"upload_rate_kbps":   0.0,
				"total_rx_bytes":     totalRx,
				"total_tx_bytes":     totalTx,
				"latency_ms":         avgLatency,
				"packet_loss_pct":    avgLoss,
				"path_type":          pathType,
				"active_peers":       connectedPeers,
			},
		}

	case "subscribe":
		// Respond success first
		_ = json.NewEncoder(conn).Encode(DaemonResponse{Success: true, Message: "subscribed to state updates"})

		// Stream state periodically
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				port, _ := devMgr.GetListenPort()
				stateUpdate := map[string]interface{}{
					"event": "state_update",
					"data": map[string]interface{}{
						"status":          "connected", // If wireguard has peers we could infer this
						"port":            port,
						"pubkey":          devMgr.PublicKey().String(),
						"latency_ms":      0,
						"throughput_down": 0,
						"throughput_up":   0,
					},
				}
				if err := json.NewEncoder(conn).Encode(stateUpdate); err != nil {
					return // Client disconnected or socket error
				}
			}
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

func runDoctor(tunName, controlPlaneURL, stunServer string) {
	cfg := config.LoadConfig()
	if stunServer == "" {
		stunServer = cfg.STUNServer
	}
	if controlPlaneURL == "" {
		controlPlaneURL = cfg.ControlPlaneURL
	}
	stMgr := state.NewManager()
	stMgr.Set(state.StateRunning)
	checker := health.NewChecker(stMgr, tunName, controlPlaneURL, stunServer)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	report := checker.RunDiagnostics(ctx)
	report.PrintReport()

	if !report.Healthy {
		os.Exit(1)
	}
	os.Exit(0)
}

func generateLocalhostCertificate() (tls.Certificate, error) {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return tls.Certificate{}, err
	}

	template := x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano()),
		Subject: pkix.Name{
			Organization: []string{"Zoop Internet Local Daemon"},
			CommonName:   "localhost",
		},
		NotBefore:             time.Now().Add(-1 * time.Hour),
		NotAfter:              time.Now().Add(365 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		DNSNames:              []string{"localhost", "127.0.0.1"},
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("::1")},
	}

	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		return tls.Certificate{}, err
	}

	certPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	b, err := x509.MarshalECPrivateKey(priv)
	if err != nil {
		return tls.Certificate{}, err
	}
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: b})

	return tls.X509KeyPair(certPEM, keyPEM)
}
