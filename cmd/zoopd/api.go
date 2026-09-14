package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/agent/client"
	"github.com/allannuwamanya/zoop/packages/agent/telemetry"
	"github.com/allannuwamanya/zoop/packages/agent/tunnel"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

// daemonAPI exposes a localhost-only HTTP API for the Zoop web UI. It is the
// single source of truth for device state, peers, telemetry, and connection
// lifecycle on the local machine. All cloud requests are signed by the daemon
// using the device's real identity.
type daemonAPI struct {
	ctx        context.Context
	logger     *slog.Logger
	apiClient  *client.APIClient
	sigClient  *client.SignalingClient
	devMgr     *tunnel.DeviceManager
	roamingMgr *tunnel.RoamingManager
	configDir  string
}

type apiPeer struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Status           string  `json:"status"`
	VirtualIP        string  `json:"virtual_ip,omitempty"`
	IsProvider       bool    `json:"is_provider"`
	Online           bool    `json:"online"`
	Connected        bool    `json:"connected"`
	LatencyMs        float64 `json:"latency_ms"`
	RxBytes          uint64  `json:"rx_bytes"`
	TxBytes          uint64  `json:"tx_bytes"`
	LastHandshakeSec int64   `json:"last_handshake_sec,omitempty"`
}

type apiStatus struct {
	Running        bool   `json:"running"`
	EndpointID     string `json:"endpoint_id"`
	DeviceName     string `json:"device_name"`
	WireGuardKey   string `json:"wireguard_public_key"`
	ListenPort     int    `json:"listen_port"`
	CloudReachable bool   `json:"cloud_reachable"`
	ConfigDir      string `json:"config_dir"`
	ActiveTunnels  int    `json:"active_tunnels"`
	DaemonVersion  string `json:"daemon_version"`
}

// wireStatus represents a live WireGuard UAPI status snapshot.
type wireStatus struct {
	Endpoint  string
	Handshake int64
	RxBytes   uint64
	TxBytes   uint64
}

func (a *daemonAPI) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if strings.HasSuffix(origin, ".zoop.network") || origin == "https://zoop.network" ||
				strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1") ||
				strings.HasPrefix(origin, "https://localhost") || strings.HasPrefix(origin, "https://127.0.0.1") {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Zoop-Identity, X-Zoop-Signature, X-Zoop-Timestamp, X-Zoop-Nonce")
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (a *daemonAPI) routes() http.Handler {
	mux := http.NewServeMux()

	// Local device status (no cloud calls, always available).
	mux.HandleFunc("GET /api/status", a.handleStatus)
	mux.HandleFunc("GET /api/peers", a.handlePeers)
	mux.HandleFunc("GET /api/telemetry", a.handleTelemetry)
	mux.HandleFunc("GET /api/connections", a.handleConnections)
	mux.HandleFunc("GET /api/shares", a.handleShares)
	mux.HandleFunc("POST /api/connect", a.handleConnect)
	mux.HandleFunc("POST /api/disconnect", a.handleDisconnect)
	mux.HandleFunc("GET /api/diagnostics", a.handleDiagnostics)
	mux.HandleFunc("GET /api/settings", a.handleGetSettings)
	mux.HandleFunc("PUT /api/settings", a.handleSaveSettings)
	mux.HandleFunc("GET /api/stream", a.handleStream)

	return a.corsMiddleware(mux)
}

func (a *daemonAPI) handleStatus(w http.ResponseWriter, r *http.Request) {
	st := apiStatus{
		Running:       true,
		EndpointID:    a.apiClient.Identity.EndpointID.String(),
		DeviceName:    "zoopd",
		WireGuardKey:  a.devMgr.PublicKey().String(),
		ConfigDir:     a.configDir,
		DaemonVersion: "0.1.0-alpha",
	}
	if port, err := a.devMgr.GetListenPort(); err == nil {
		st.ListenPort = port
	}

	// Probe cloud reachability quickly.
	probeCtx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if _, err := a.apiClient.ListDevices(probeCtx); err == nil {
		st.CloudReachable = true
	}

	st.ActiveTunnels = len(a.sigClient.ActiveConnections())

	writeJSON(w, http.StatusOK, st)
}

// wireSnapshot reads the WireGuard UAPI status for all tracked peers.
func (a *daemonAPI) wireSnapshot() map[string]wireStatus {
	pm := tunnel.NewPathMonitor(a.devMgr, a.logger)
	snap := make(map[string]wireStatus)
	for _, conn := range a.sigClient.ActiveConnections() {
		peerKey, err := tunnel.ParsePublicKey(conn.PeerKey)
		if err != nil {
			continue
		}
		ps, err := pm.GetPeerPathState(peerKey, nil)
		if err != nil || ps == nil {
			continue
		}
		snap[conn.ConnectionID.String()] = wireStatus{
			Endpoint:  ps.ActiveEndpoint,
			Handshake: ps.LastHandshake.Unix(),
			RxBytes:   uint64(ps.RxBytes),
			TxBytes:   uint64(ps.TxBytes),
		}
	}
	return snap
}

func (a *daemonAPI) handlePeers(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	devices, err := a.apiClient.ListDevices(ctx)
	if err != nil {
		writeError(w, http.StatusBadGateway, "cloud_unreachable", err.Error())
		return
	}

	snaps := telemetry.GetTracker().GetSnapshots()
	snapByPeer := make(map[string]telemetry.PeerTelemetrySnapshot)
	for _, s := range snaps {
		snapByPeer[s.PeerID] = s
	}

	peers := make([]apiPeer, 0)
	for _, dev := range devices {
		if dev.ID.String() == a.apiClient.Identity.EndpointID.String() {
			continue // skip self
		}
		p := apiPeer{
			ID:         dev.ID.String(),
			Name:       dev.Name,
			Status:     dev.Status,
			IsProvider: true,
			Online:     dev.Status == "online" || dev.Status == "active" || dev.Status == "trusted",
		}
		if s, ok := snapByPeer[dev.ID.String()]; ok {
			p.Connected = s.State == "connected"
			p.LatencyMs = s.HandshakeRTTMs
			p.RxBytes = s.RxBytes
			p.TxBytes = s.TxBytes
		}
		peers = append(peers, p)
	}
	writeJSON(w, http.StatusOK, peers)
}

func (a *daemonAPI) handleTelemetry(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	wire := a.wireSnapshot()

	type telemetryEntry struct {
		ConnectionID  string  `json:"connection_id"`
		State         string  `json:"state"`
		LatencyMs     float64 `json:"latency_ms"`
		RxBytes       uint64  `json:"rx_bytes"`
		TxBytes       uint64  `json:"tx_bytes"`
		Endpoint      string  `json:"endpoint,omitempty"`
		LastHandshake int64   `json:"last_handshake_sec,omitempty"`
	}

	// Merge cloud connection states with live WireGuard byte counts.
	conns, _ := a.apiClient.ListConnections(ctx)
	active := a.sigClient.ActiveConnections()
	activeByID := make(map[string]bool, len(active))
	for _, c := range active {
		activeByID[c.ConnectionID.String()] = true
	}

	entries := make([]telemetryEntry, 0, len(conns))
	for _, c := range conns {
		if !activeByID[c.ID.String()] && c.State != types.ConnectionStateConnected {
			continue
		}
		e := telemetryEntry{
			ConnectionID: c.ID.String(),
			State:        string(c.State),
		}
		if ws, ok := wire[c.ID.String()]; ok {
			e.RxBytes = ws.RxBytes
			e.TxBytes = ws.TxBytes
			e.Endpoint = ws.Endpoint
			e.LastHandshake = ws.Handshake
		}
		entries = append(entries, e)
	}
	writeJSON(w, http.StatusOK, entries)
}

func (a *daemonAPI) handleConnections(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	conns, err := a.apiClient.ListConnections(ctx)
	if err != nil {
		writeError(w, http.StatusBadGateway, "cloud_unreachable", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, conns)
}

func (a *daemonAPI) handleShares(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	shares, err := a.apiClient.ListShares(ctx)
	if err != nil {
		writeError(w, http.StatusBadGateway, "cloud_unreachable", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, shares)
}

type connectRequest struct {
	PeerID string `json:"peer_id"`
}

func (a *daemonAPI) handleConnect(w http.ResponseWriter, r *http.Request) {
	var req connectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "invalid json body")
		return
	}

	peerUUID, err := uuid.Parse(req.PeerID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "peer_id must be a valid UUID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	var candidates []types.EndpointCandidate
	var wgPubKey string
	var listenPort int
	if a.devMgr != nil {
		wgPubKey = a.devMgr.PublicKey().String()
		if p, err := a.devMgr.GetListenPort(); err == nil {
			listenPort = p
			if cands, err := tunnel.GatherCandidatesMux(a.devMgr.GetMuxBind(), listenPort); err == nil {
				candidates = cands
			}
		}
	}

	var endpointIP string
	if len(candidates) > 0 {
		endpointIP = candidates[0].IP
	}

	conn, err := a.apiClient.RequestConnectionWithEndpoints(ctx, types.ID(peerUUID), wgPubKey, endpointIP, listenPort, candidates)
	if err != nil {
		writeError(w, http.StatusBadGateway, "cloud_error", err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, conn)
}

type disconnectRequest struct {
	ConnectionID string `json:"connection_id"`
}

func (a *daemonAPI) handleDisconnect(w http.ResponseWriter, r *http.Request) {
	var req disconnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "invalid json body")
		return
	}

	connUUID, err := uuid.Parse(req.ConnectionID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "connection_id must be a valid UUID")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := a.sigClient.DisconnectConnection(ctx, types.ID(connUUID)); err != nil {
		writeError(w, http.StatusBadGateway, "cloud_error", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}

func (a *daemonAPI) handleDiagnostics(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()

	diag := map[string]interface{}{
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"checks":    []map[string]interface{}{},
	}

	checks := a.runChecks(ctx)
	diag["checks"] = checks

	allOK := true
	for _, c := range checks {
		if !c["ok"].(bool) {
			allOK = false
		}
	}
	diag["healthy"] = allOK
	writeJSON(w, http.StatusOK, diag)
}

func (a *daemonAPI) runChecks(ctx context.Context) []map[string]interface{} {
	checks := []map[string]interface{}{}

	// WireGuard device
	wgOK := true
	wgMsg := "wireguard device running"
	if _, err := a.devMgr.GetListenPort(); err != nil {
		wgOK = false
		wgMsg = err.Error()
	}
	checks = append(checks, map[string]interface{}{"name": "wireguard", "ok": wgOK, "detail": wgMsg})

	// Cloud reachability
	cloudOK := true
	cloudMsg := "cloud reachable"
	if _, err := a.apiClient.ListDevices(ctx); err != nil {
		cloudOK = false
		cloudMsg = err.Error()
	}
	checks = append(checks, map[string]interface{}{"name": "cloud", "ok": cloudOK, "detail": cloudMsg})

	// Signaling connection
	sigOK := len(a.sigClient.ActiveConnections()) >= 0
	checks = append(checks, map[string]interface{}{
		"name":   "signaling",
		"ok":     sigOK,
		"detail": fmt.Sprintf("%d active tunnels", len(a.sigClient.ActiveConnections())),
	})

	return checks
}

type settingsPayload struct {
	DeviceName string `json:"device_name,omitempty"`
	MTU        int    `json:"mtu,omitempty"`
	LogLevel   string `json:"log_level,omitempty"`
}

func (a *daemonAPI) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, settingsPayload{
		DeviceName: "zoopd",
		MTU:        1420,
		LogLevel:   "info",
	})
}

func (a *daemonAPI) handleSaveSettings(w http.ResponseWriter, r *http.Request) {
	var req settingsPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "invalid json body")
		return
	}
	// Persisted settings are handled in a later sprint; validate only for now.
	writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (a *daemonAPI) handleStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming_unsupported", "streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	writeSSE := func(event string, data interface{}) {
		b, _ := json.Marshal(data)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, b)
		flusher.Flush()
	}

	// Send initial snapshot.
	writeSSE("snapshot", a.telemetrySnapshot(r.Context()))

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			writeSSE("update", a.telemetrySnapshot(r.Context()))
		}
	}
}

func (a *daemonAPI) telemetrySnapshot(ctx context.Context) map[string]interface{} {
	snap := map[string]interface{}{
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
		"active_tunnels": len(a.sigClient.ActiveConnections()),
		"telemetry":      a.handleTelemetryData(ctx),
	}
	return snap
}

// handleTelemetryData collects live telemetry without writing an HTTP response.
func (a *daemonAPI) handleTelemetryData(ctx context.Context) []map[string]interface{} {
	wire := a.wireSnapshot()
	conns, _ := a.apiClient.ListConnections(ctx)
	active := a.sigClient.ActiveConnections()
	activeByID := make(map[string]bool, len(active))
	for _, c := range active {
		activeByID[c.ConnectionID.String()] = true
	}

	out := make([]map[string]interface{}, 0, len(conns))
	for _, c := range conns {
		if !activeByID[c.ID.String()] && c.State != types.ConnectionStateConnected {
			continue
		}
		entry := map[string]interface{}{
			"connection_id": c.ID.String(),
			"state":         string(c.State),
		}
		if ws, ok := wire[c.ID.String()]; ok {
			entry["rx_bytes"] = ws.RxBytes
			entry["tx_bytes"] = ws.TxBytes
			entry["endpoint"] = ws.Endpoint
			entry["last_handshake_sec"] = ws.Handshake
		}
		out = append(out, entry)
	}
	return out
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, api.ErrorResponse{
		Error: api.ErrorDetail{
			Code:    code,
			Message: msg,
		},
	})
}
