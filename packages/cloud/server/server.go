package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/relay"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

type Server struct {
	cfg           config.Config
	logger        *slog.Logger
	store         store.Store
	devices       *services.DeviceService
	users         *services.UserService
	organizations *services.OrganizationService
	shares        *services.ShareService
	connections   *services.ConnectionService
	signaling     *services.SignalingHub
	events        *services.EventHub
	audit         *services.AuditService
	relayServer   *relay.RelayServer
	relayRegistry *relay.RelayRegistry
	turnManager   *relay.TURNManager
	startTime     time.Time
	mux           *http.ServeMux
	server        *http.Server
	upgrader      websocket.Upgrader
}

func checkOrigin(allowed []string) func(r *http.Request) bool {
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true // Non-browser clients (agents, CLI)
		}
		if len(allowed) == 0 {
			// Default: allow localhost, loopback, and same host
			u, err := url.Parse(origin)
			if err != nil {
				return false
			}
			host := u.Hostname()
			reqHost := r.Host
			if strings.Contains(reqHost, ":") {
				reqHost = strings.Split(reqHost, ":")[0]
			}
			return host == "localhost" || host == "127.0.0.1" || host == "::1" || host == reqHost
		}
		for _, o := range allowed {
			if o == "*" || o == origin {
				return true
			}
			if u, err := url.Parse(origin); err == nil && (u.Host == o || u.Hostname() == o) {
				return true
			}
		}
		return false
	}
}

func NewServer(
	cfg config.Config,
	logger *slog.Logger,
	st store.Store,
	ds *services.DeviceService,
	us *services.UserService,
	os *services.OrganizationService,
	ss *services.ShareService,
	cs *services.ConnectionService,
	sh *services.SignalingHub,
) *Server {
	reg := relay.NewRelayRegistry()
	rs := relay.NewServer(logger, st)
	rs.SetRegistry(reg, "default-relay")

	// Register default local relay node
	reg.RegisterNode(relay.RelayNode{
		ID:           "default-relay",
		Region:       "us-east",
		Host:         "localhost",
		Port:         8080,
		WebSocketURL: "ws://localhost:8080/v1/relay",
		STUNPort:     19302,
		TURNPort:     3478,
		Status:       relay.RelayStatusOnline,
	})

	turnSecret := cfg.TURNSecret
	if turnSecret == "" {
		turnSecret = "zoop-turn-secret"
	}
	turnRealm := cfg.TURNRealm
	if turnRealm == "" {
		turnRealm = "zoop.network"
	}

	s := &Server{
		cfg:           cfg,
		logger:        logger,
		store:         st,
		devices:       ds,
		users:         us,
		organizations: os,
		shares:        ss,
		connections:   cs,
		signaling:     sh,
		events:        services.NewEventHub(),
		audit:         services.NewAuditService([]byte(cfg.TURNSecret), logger),
		relayServer:   rs,
		relayRegistry: reg,
		turnManager:   relay.NewTURNManager(turnSecret, turnRealm),
		startTime:     time.Now(),
		mux:           http.NewServeMux(),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin:     checkOrigin(cfg.AllowedOrigins),
		},
	}
	s.routes()
	return s
}

// RelayRegistry returns the server's cluster relay registry.
func (s *Server) RelayRegistry() *relay.RelayRegistry {
	return s.relayRegistry
}

// TURNManager returns the server's ephemeral TURN manager.
func (s *Server) TURNManager() *relay.TURNManager {
	return s.turnManager
}

// RelayServer returns the server's WebSocket relay instance.
func (s *Server) RelayServer() *relay.RelayServer {
	return s.relayServer
}

func (s *Server) routes() {
	authMw := api.AuthMiddleware(s.store, s.logger)

	// Health & Prometheus Metrics (unauthenticated)
	s.mux.HandleFunc("GET /v1/health", api.HealthHandler(s.startTime, s))
	s.mux.Handle("GET /metrics", promhttp.Handler())

	// Registration does not require Zoop Auth because the device doesn't exist yet
	s.mux.HandleFunc("POST /v1/devices", s.handleRegisterDevice())
	s.mux.HandleFunc("GET /v1/devices", s.handleListDevices())

	// Authenticated routes
	s.mux.Handle("GET /v1/devices/{id}", authMw(http.HandlerFunc(s.handleGetDevice())))
	s.mux.Handle("GET /v1/devices/{id}/endpoints", authMw(http.HandlerFunc(s.handleGetEndpoints())))
	s.mux.Handle("DELETE /v1/devices/{id}", authMw(http.HandlerFunc(s.handleUnregisterDevice())))

	s.mux.Handle("POST /v1/organizations", authMw(http.HandlerFunc(s.handleCreateOrganization())))
	s.mux.Handle("GET /v1/organizations", authMw(http.HandlerFunc(s.handleListOrganizations())))
	s.mux.Handle("GET /v1/organizations/{id}", authMw(http.HandlerFunc(s.handleGetOrganization())))
	s.mux.Handle("POST /v1/organizations/{id}/members", authMw(http.HandlerFunc(s.handleAddOrgMember())))
	s.mux.Handle("GET /v1/organizations/{id}/members", authMw(http.HandlerFunc(s.handleListOrgMembers())))

	s.mux.Handle("POST /v1/shares", authMw(http.HandlerFunc(s.handleCreateShare())))
	s.mux.Handle("GET /v1/shares", authMw(http.HandlerFunc(s.handleListShares())))
	s.mux.Handle("GET /v1/shares/{id}", authMw(http.HandlerFunc(s.handleGetShare())))

	s.mux.Handle("POST /v1/connections", authMw(http.HandlerFunc(s.handleCreateConnection())))
	s.mux.Handle("GET /v1/connections", authMw(http.HandlerFunc(s.handleListConnections())))
	s.mux.Handle("GET /v1/connections/{id}", authMw(http.HandlerFunc(s.handleGetConnection())))
	s.mux.Handle("PUT /v1/connections/{id}/state", authMw(http.HandlerFunc(s.handleUpdateConnectionState())))
	s.mux.Handle("GET /v1/devices/{id}/connections/pending", authMw(http.HandlerFunc(s.handleGetPendingConnections())))

	s.mux.Handle("GET /v1/signaling", authMw(http.HandlerFunc(s.handleSignaling())))
	s.mux.Handle("GET /v1/events", authMw(http.HandlerFunc(s.handleEventStream())))

	// Admin endpoints (operator console)
	adminMw := api.AdminMiddleware(authMw, s.cfg.AdminIDs)
	s.mux.Handle("GET /v1/admin/overview", adminMw(http.HandlerFunc(s.handleAdminOverview())))
	s.mux.Handle("GET /v1/admin/organizations", adminMw(http.HandlerFunc(s.handleAdminOrganizations())))
	s.mux.Handle("GET /v1/admin/organizations/{id}/members", adminMw(http.HandlerFunc(s.handleAdminOrgMembers())))
	s.mux.Handle("GET /v1/admin/devices", adminMw(http.HandlerFunc(s.handleAdminDevices())))
	s.mux.Handle("GET /v1/admin/connections", adminMw(http.HandlerFunc(s.handleAdminConnections())))
	s.mux.Handle("GET /v1/admin/services", adminMw(http.HandlerFunc(s.handleAdminServices())))
	s.mux.Handle("GET /v1/admin/users", adminMw(http.HandlerFunc(s.handleAdminUsers())))
	s.mux.Handle("GET /v1/admin/network", adminMw(http.HandlerFunc(s.handleAdminNetwork())))
	s.mux.Handle("GET /v1/admin/audit", adminMw(http.HandlerFunc(s.handleAdminAudit())))
	s.mux.Handle("GET /v1/admin/usage", adminMw(http.HandlerFunc(s.handleAdminUsage())))
	s.mux.Handle("GET /v1/admin/relays", adminMw(http.HandlerFunc(s.handleAdminRelays())))

	// Relay & STUN/TURN endpoints
	s.mux.HandleFunc("GET /v1/relays", s.handleListRelays())
	s.mux.HandleFunc("POST /v1/relays/select", s.handleSelectRelays())
	s.mux.Handle("POST /v1/relays/turn-credentials", authMw(http.HandlerFunc(s.handleGetTURNCredentials())))

	// Relay endpoint: the relay server performs its own Ed25519 authentication.
	s.mux.HandleFunc("GET /v1/relay", s.relayServer.HandleWebSocket)

	// Static web app hosting. When ZOOP_WEB_DIST points at a built web/dist,
	// serve it as an SPA (fall back to index.html for non-file paths).
	if s.cfg.WebDistDir != "" {
		s.serveWebApp()
	}
}

// serveWebApp registers SPA static file serving from the configured dist dir.
// Non-API, non-file requests fall back to index.html so client-side routes work.
func (s *Server) serveWebApp() {
	fs := http.FileServer(http.Dir(s.cfg.WebDistDir))
	s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if path == "/" || path == "" {
			http.ServeFile(w, r, filepath.Join(s.cfg.WebDistDir, "index.html"))
			return
		}
		// Serve existing files directly; otherwise hand off to the SPA shell.
		full := filepath.Join(s.cfg.WebDistDir, filepath.FromSlash(path))
		if info, err := os.Stat(full); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}
		http.ServeFile(w, r, filepath.Join(s.cfg.WebDistDir, "index.html"))
	})
}

func (s *Server) handleRegisterDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.RegisterDeviceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		resp, err := s.devices.Register(r.Context(), req)
		if err != nil {
			s.logger.Error("failed to register device", "error", err)
			api.WriteError(w, "internal_error", "failed to register device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), types.ID{}, "device.register", "device:"+resp.ID.String(), "name="+resp.Name)
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		resp, err := s.devices.GetDevice(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to get device", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup device", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleGetEndpoints() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		// Retrieve device identity to get public key
		ident, err := s.store.GetIdentity(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device identity not found", http.StatusNotFound)
				return
			}
			api.WriteError(w, "internal_error", "failed to lookup device identity", http.StatusInternalServerError)
			return
		}

		var wgPubKeyStr string
		if len(ident.WireGuardPublicKey) > 0 {
			wgPubKeyStr = base64.StdEncoding.EncodeToString(ident.WireGuardPublicKey)
		}

		resp := api.EndpointsResponse{
			DeviceID:           ident.EndpointID,
			PublicKey:          base64.StdEncoding.EncodeToString(ident.PublicKey),
			WireGuardPublicKey: wgPubKeyStr,
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleUnregisterDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		// Only the device itself may unregister.
		identityID := api.IdentityFromContext(r.Context())
		if identityID != types.ID(parsedUUID) {
			api.WriteError(w, "forbidden", "device may only unregister itself", http.StatusForbidden)
			return
		}

		if err := s.devices.Unregister(r.Context(), types.ID(parsedUUID)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to unregister device", "error", err)
			api.WriteError(w, "internal_error", "failed to unregister device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), identityID, "device.unregister", "device:"+parsedUUID.String(), "")
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) handleCreateShare() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateShareRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		resp, err := s.shares.CreateShare(r.Context(), req)
		if err != nil {
			s.logger.Error("failed to create share", "error", err)
			api.WriteError(w, "internal_error", "failed to create share", http.StatusInternalServerError)
			return
		}

		ev := services.ServerEvent{Type: "share_created", Entity: "share", ID: resp.ID.String(), Payload: resp}
		s.events.PublishTo(resp.ProviderID, ev)
		s.events.PublishTo(resp.RecipientID, ev)

		s.audit.Log(r.Context(), resp.ProviderID, "share.create", "share:"+resp.ID.String(), "recipient="+resp.RecipientID.String())
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetShare() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid share id format", http.StatusBadRequest)
			return
		}

		resp, err := s.shares.GetShare(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "share not found", http.StatusNotFound)
				return
			}
			api.WriteError(w, "internal_error", "failed to lookup share", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListShares() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		resp, err := s.shares.ListShares(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to list shares", "error", err)
			api.WriteError(w, "internal_error", "failed to list shares", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleCreateConnection() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		var req api.CreateConnectionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		resp, err := s.connections.CreateConnection(r.Context(), req, callerID)
		if err != nil {
			if err == services.ErrUnauthorized {
				api.WriteError(w, "authorization_denied", err.Error(), http.StatusForbidden)
				return
			}
			s.logger.Error("failed to create connection", "error", err)
			api.WriteError(w, "internal_error", "failed to create connection", http.StatusInternalServerError)
			return
		}

		ev := services.ServerEvent{Type: "connection_requested", Entity: "connection", ID: resp.ID.String(), Payload: resp}
		s.events.PublishTo(resp.ProviderID, ev)
		s.events.PublishTo(resp.RecipientID, ev)

		s.audit.Log(r.Context(), callerID, "connection.create", "connection:"+resp.ID.String(), "provider="+resp.ProviderID.String())
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetConnection() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid connection id format", http.StatusBadRequest)
			return
		}

		resp, err := s.connections.GetConnection(r.Context(), types.ID(parsedUUID), callerID)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "connection not found", http.StatusNotFound)
				return
			}
			if err == services.ErrUnauthorized {
				api.WriteError(w, "authorization_denied", err.Error(), http.StatusForbidden)
				return
			}
			api.WriteError(w, "internal_error", "failed to lookup connection", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListConnections() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		resp, err := s.connections.ListConnections(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to list connections", "error", err)
			api.WriteError(w, "internal_error", "failed to list connections", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleUpdateConnectionState() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid connection id format", http.StatusBadRequest)
			return
		}

		var req api.UpdateConnectionStateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		err = s.connections.UpdateConnectionState(r.Context(), types.ID(parsedUUID), callerID, req.State)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "connection not found", http.StatusNotFound)
				return
			}
			if err == services.ErrUnauthorized {
				api.WriteError(w, "authorization_denied", err.Error(), http.StatusForbidden)
				return
			}
			if err == services.ErrInvalidState {
				api.WriteError(w, "invalid_state_transition", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to update connection state", "error", err)
			api.WriteError(w, "internal_error", "failed to update connection state", http.StatusInternalServerError)
			return
		}

		s.events.PublishBroadcast(services.ServerEvent{
			Type:   "connection_updated",
			Entity: "connection",
			ID:     parsedUUID.String(),
			Payload: map[string]string{
				"state": string(req.State),
			},
		})
		api.WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
	}
}

func (s *Server) handleGetPendingConnections() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		deviceID := types.ID(parsedUUID)

		if callerID != deviceID {
			api.WriteError(w, "authorization_denied", "authorization denied", http.StatusForbidden)
			return
		}

		pending, err := s.store.GetPendingConnections(r.Context(), deviceID)
		if err != nil {
			s.logger.Error("failed to get pending connections", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup pending connections", http.StatusInternalServerError)
			return
		}

		var resp []api.ConnectionResponse
		for _, conn := range pending {
			resp = append(resp, api.ConnectionResponse{
				ID:          conn.ID,
				ProviderID:  conn.ProviderID,
				RecipientID: conn.RecipientID,
				State:       conn.State,
				ProviderIP:  conn.ProviderIP,
				RecipientIP: conn.RecipientIP,
			})
		}
		
		if resp == nil {
			resp = []api.ConnectionResponse{}
		}

		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleSignaling() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		conn, err := s.upgrader.Upgrade(w, r, nil)
		if err != nil {
			s.logger.Error("failed to upgrade to websocket", "error", err)
			return
		}
		defer conn.Close()

		s.logger.Info("signaling channel established", "caller_id", callerID)

		s.signaling.Register(callerID, conn)
		defer s.signaling.Unregister(callerID)

		// Parse JSON signaling messages and route them
		for {
			var msg types.SignalingMessage
			if err := conn.ReadJSON(&msg); err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					s.logger.Error("signaling read error", "error", err)
				}
				return
			}

			// Overwrite sender ID to ensure it is the authenticated caller
			msg.SenderID = callerID

			// Route to the intended recipient
			if err := s.signaling.SendTo(msg.RecipientID, msg); err != nil {
				s.logger.Warn("failed to route signaling message", "recipient", msg.RecipientID, "error", err)
				// Optionally send an error message back to the sender
			}
		}
	}
}

// handleEventStream serves a Server-Sent Events stream of real-time server
// events (share/connection changes) to authenticated web clients.
func (s *Server) handleEventStream() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			api.WriteError(w, "unsupported", "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		ch, unsub := s.events.Subscribe(callerID)
		defer unsub()

		// Initial heartbeat so the client knows the stream is live.
		fmt.Fprintf(w, ": connected\n\n")
		flusher.Flush()

		ctx := r.Context()
		heartbeat := time.NewTicker(30 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-heartbeat.C:
				if _, err := fmt.Fprintf(w, ": ping\n\n"); err != nil {
					return
				}
				flusher.Flush()
			case ev, ok := <-ch:
				if !ok {
					return
				}
				b, err := json.Marshal(ev)
				if err != nil {
					continue
				}
				if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
					return
				}
				flusher.Flush()
			}
		}
	}
}

func (s *Server) handleListDevices() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, err := s.devices.ListDevices(r.Context())
		if err != nil {
			s.logger.Error("failed to list devices", "error", err)
			api.WriteError(w, "internal_error", "failed to list devices", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, devices)
	}
}

func (s *Server) handleCreateOrganization() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.CreateOrgRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		resp, err := s.organizations.CreateOrg(r.Context(), callerID, req)
		if err != nil {
			s.logger.Error("failed to create organization", "error", err)
			api.WriteError(w, "invalid_request", err.Error(), http.StatusBadRequest)
			return
		}

		s.audit.Log(r.Context(), callerID, "org.create", "org:"+resp.ID.String(), "name="+resp.Name+" slug="+resp.Slug)
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleListOrganizations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		orgs, err := s.organizations.ListOrgs(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to list organizations", "error", err)
			api.WriteError(w, "internal_error", "failed to list organizations", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, orgs)
	}
}

func (s *Server) handleGetOrganization() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		org, err := s.organizations.GetOrg(r.Context(), callerID, types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "organization not found", http.StatusNotFound)
				return
			}
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "not a member of this organization", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to get organization", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup organization", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, org)
	}
}

func (s *Server) handleAddOrgMember() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		orgID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		var req api.AddOrgMemberRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		resp, err := s.organizations.AddMember(r.Context(), callerID, types.ID(orgID), req)
		if err != nil {
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "only owners or admins can add members", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to add organization member", "error", err)
			api.WriteError(w, "invalid_request", err.Error(), http.StatusBadRequest)
			return
		}

		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleListOrgMembers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		orgID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		callerID := api.IdentityFromContext(r.Context())
		members, err := s.organizations.ListMembers(r.Context(), callerID, types.ID(orgID))
		if err != nil {
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "not a member of this organization", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to list organization members", "error", err)
			api.WriteError(w, "internal_error", "failed to list members", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, members)
	}
}

func (s *Server) handleAdminOverview() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, _ := s.store.ListDevices(r.Context())
		orgs, _ := s.store.ListOrganizations(r.Context())
		members, _ := s.store.ListOrgMembersAll(r.Context())

		trusted := 0
		for _, d := range devices {
			if d.State == types.DeviceStateTrusted || d.State == types.DeviceStateRegistered {
				trusted++
			}
		}

		api.WriteJSON(w, http.StatusOK, map[string]any{
			"devices":       len(devices),
			"organizations": len(orgs),
			"members":       len(members),
			"trusted":       trusted,
		})
	}
}

func (s *Server) handleAdminDevices() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, err := s.store.ListDevices(r.Context())
		if err != nil {
			s.logger.Error("failed to list devices for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list devices", http.StatusInternalServerError)
			return
		}

		resp := make([]api.DeviceResponse, 0, len(devices))
		for _, d := range devices {
			resp = append(resp, api.DeviceResponse{
				ID:     d.ID,
				Name:   d.Name,
				OS:     d.OS,
				Status: string(d.State),
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleAdminConnections() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conns, err := s.store.ListAllConnections(r.Context())
		if err != nil {
			s.logger.Error("failed to list connections for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list connections", http.StatusInternalServerError)
			return
		}

		resp := make([]api.ConnectionResponse, 0, len(conns))
		for _, c := range conns {
			resp = append(resp, api.ConnectionResponse{
				ID:          c.ID,
				ProviderID:  c.ProviderID,
				RecipientID: c.RecipientID,
				State:       c.State,
				ProviderIP:  c.ProviderIP,
				RecipientIP: c.RecipientIP,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleAdminServices() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		health := s.CheckHealth()
		api.WriteJSON(w, http.StatusOK, health)
	}
}

func (s *Server) handleAdminOrganizations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgs, err := s.store.ListOrganizations(r.Context())
		if err != nil {
			s.logger.Error("failed to list organizations for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list organizations", http.StatusInternalServerError)
			return
		}

		resp := make([]api.OrgResponse, 0, len(orgs))
		for _, o := range orgs {
			resp = append(resp, api.OrgResponse{
				ID:          o.ID,
				Name:        o.Name,
				OwnerDevice: o.OwnerDevice,
				Slug:        o.Slug,
				Status:      o.Status,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleAdminOrgMembers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		orgID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id format", http.StatusBadRequest)
			return
		}

		all, err := s.store.GetOrgMembers(r.Context(), types.ID(orgID))
		if err != nil {
			s.logger.Error("failed to list members for admin", "error", err)
			api.WriteError(w, "internal_error", "failed to list members", http.StatusInternalServerError)
			return
		}

		resp := make([]api.OrgMemberResponse, 0, len(all))
		for _, m := range all {
			resp = append(resp, api.OrgMemberResponse{
				ID:             m.ID,
				OrganizationID: m.OrganizationID,
				DeviceID:       m.DeviceID,
				Name:           m.Name,
				Email:          m.Email,
				Role:           m.Role,
				Status:         m.Status,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

// handleAdminUsers lists every registered user across the platform: org members
// enriched with their linked device state.
func (s *Server) handleAdminUsers() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, _ := s.store.ListDevices(r.Context())
		members, _ := s.store.ListOrgMembersAll(r.Context())

		deviceByID := make(map[types.ID]*types.Device, len(devices))
		for _, d := range devices {
			deviceByID[d.ID] = d
		}

		resp := make([]map[string]interface{}, 0, len(members))
		for _, m := range members {
			dev := deviceByID[m.DeviceID]
			status := m.Status
			if dev != nil {
				status = string(dev.State)
			}
			resp = append(resp, map[string]interface{}{
				"id":              m.ID,
				"name":            m.Name,
				"email":           m.Email,
				"role":            m.Role,
				"status":          status,
				"device_id":       m.DeviceID,
				"organization_id": m.OrganizationID,
			})
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

// handleAdminNetwork reports IPAM allocation usage for the overlay network.
func (s *Server) handleAdminNetwork() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		allocated, capacity, err := s.store.IPAMUsage(r.Context())
		if err != nil {
			s.logger.Error("failed to read IPAM usage", "error", err)
			api.WriteError(w, "internal_error", "failed to read IPAM usage", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"pool":            "100.64.0.0/10",
			"subnets_allocated": allocated,
			"capacity":        capacity,
			"utilization_pct": float64(allocated) / float64(capacity) * 100,
		})
	}
}

// handleAdminAudit returns recent operator audit log entries, newest first.
func (s *Server) handleAdminAudit() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		events := s.audit.ListEvents()
		// Newest first, capped at 200.
		n := len(events)
		if n > 200 {
			n = 200
		}
		out := make([]*services.AuditEvent, 0, n)
		for i := len(events) - 1; i >= 0 && len(out) < n; i-- {
			out = append(out, events[i])
		}
		api.WriteJSON(w, http.StatusOK, out)
	}
}

// handleAdminUsage aggregates platform usage counters.
func (s *Server) handleAdminUsage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		devices, _ := s.store.ListDevices(r.Context())
		orgs, _ := s.store.ListOrganizations(r.Context())
		members, _ := s.store.ListOrgMembersAll(r.Context())
		shares, _ := s.store.ListSharesAll(r.Context())
		conns, _ := s.store.ListAllConnections(r.Context())

		stateCounts := map[string]int{}
		for _, c := range conns {
			stateCounts[string(c.State)]++
		}

		trusted := 0
		for _, d := range devices {
			if d.State == types.DeviceStateTrusted || d.State == types.DeviceStateRegistered {
				trusted++
			}
		}

		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"devices":         len(devices),
			"trusted_devices": trusted,
			"organizations":   len(orgs),
			"members":         len(members),
			"shares":          len(shares),
			"connections":     len(conns),
			"connections_by_state": stateCounts,
		})
	}
}

// handleAdminRelays lists the relay registry nodes.
func (s *Server) handleAdminRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nodes := s.relayRegistry.GetNodes(false)
		api.WriteJSON(w, http.StatusOK, nodes)
	}
}

func (s *Server) handleListRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nodes := s.relayRegistry.GetNodes(false)
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"relays": nodes,
		})
	}
}

func (s *Server) handleSelectRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.RelaySelectRequest
		if r.Body != nil {
			_ = json.NewDecoder(r.Body).Decode(&req)
		}

		candidates := s.relayRegistry.SelectOptimalRelays(req.PreferredRegion, req.ToDurationRTTs())
		api.WriteJSON(w, http.StatusOK, api.RelaySelectResponse{
			Relays: candidates,
		})
	}
}

func (s *Server) handleGetTURNCredentials() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthorized", "missing caller identity", http.StatusUnauthorized)
			return
		}

		creds := s.turnManager.GenerateCredentials(callerID, 24*time.Hour, "127.0.0.1", 3478, 19302)
		api.WriteJSON(w, http.StatusOK, creds)
	}
}

// CheckHealth queries subsystem states for the /v1/health probe.
func (s *Server) CheckHealth() map[string]api.SubsystemStatus {
	subsystems := make(map[string]api.SubsystemStatus)

	// Storage check
	if s.store != nil {
		subsystems["store"] = api.SubsystemStatus{
			Status: "ok",
			Details: map[string]interface{}{
				"backend": "configured",
			},
		}
	} else {
		subsystems["store"] = api.SubsystemStatus{
			Status: "down",
			Error:  "storage backend is nil",
		}
	}

	// Relay Registry check
	var activeCount int
	if s.relayRegistry != nil {
		activeCount = len(s.relayRegistry.GetNodes(false))
	}
	subsystems["relays"] = api.SubsystemStatus{
		Status: "ok",
		Details: map[string]interface{}{
			"active_count": activeCount,
		},
	}

	// Signaling check
	subsystems["signaling"] = api.SubsystemStatus{
		Status: "ok",
	}

	// TURN check
	subsystems["turn"] = api.SubsystemStatus{
		Status: "ok",
	}

	return subsystems
}

// Start runs the HTTP server and blocks until the context is canceled.
func (s *Server) Start(ctx context.Context) error {
	rateLimiter := api.NewRateLimiter(300, 100) // 300 req/min, 100 burst
	handler := api.MetricsMiddleware(
		api.SecurityHeadersMiddleware(
			api.RateLimitMiddleware(rateLimiter)(
				api.CORSMiddleware(s.cfg.AllowedOrigins)(s.mux),
			),
		),
	)

	addr := ":8080"
	if s.cfg.ControlPlaneURL != "" {
		if u, err := url.Parse(s.cfg.ControlPlaneURL); err == nil && u.Port() != "" {
			addr = ":" + u.Port()
		}
	} else if s.cfg.AgentListenAddr != "" {
		addr = s.cfg.AgentListenAddr
	}

	s.server = &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	errCh := make(chan error, 1)
	go func() {
		s.logger.Info("Starting Zoop Cloud API", "addr", s.server.Addr)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	select {
	case <-ctx.Done():
		s.logger.Info("Shutting down Zoop Cloud API")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return s.server.Shutdown(shutdownCtx)
	case err := <-errCh:
		return err
	}
}
