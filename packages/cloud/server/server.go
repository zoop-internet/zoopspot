package server

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/payments"
	"github.com/zoop-internet/zoop/packages/cloud/relay"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func isValidationError(msg string) bool {
	m := strings.ToLower(msg)
	return strings.Contains(m, "must be") || strings.Contains(m, "invalid") || strings.Contains(m, "cannot be empty") || strings.Contains(m, "already taken")
}

func parsePagination(r *http.Request, defLimit, maxLimit int) (limit, offset int) {
	limit = defLimit
	offset = 0
	if q := r.URL.Query().Get("limit"); q != "" {
		fmt.Sscanf(q, "%d", &limit)
		if limit < 1 {
			limit = 1
		}
		if limit > maxLimit {
			limit = maxLimit
		}
	}
	if q := r.URL.Query().Get("offset"); q != "" {
		fmt.Sscanf(q, "%d", &offset)
		if offset < 0 {
			offset = 0
		}
	}
	return
}

func paginateSlice[T any](items []T, limit, offset int) []T {
	if offset >= len(items) {
		return []T{}
	}
	end := offset + limit
	if end > len(items) {
		end = len(items)
	}
	return items[offset:end]
}

type Server struct {
	cfg               config.Config
	logger            *slog.Logger
	store             store.Store
	devices           *services.DeviceService
	users             *services.UserService
	organizations     *services.OrganizationService
	shares            *services.ShareService
	connections       *services.ConnectionService
	signaling         *services.SignalingHub
	events            *services.EventHub
	audit             *services.AuditService
	relayServer       *relay.RelayServer
	relayRegistry     *relay.RelayRegistry
	turnManager       *relay.TURNManager
	startTime         time.Time
	mux               *http.ServeMux
	server            *http.Server
	upgrader          websocket.Upgrader
	pairingMu         sync.RWMutex
	pairingTokens     map[string]pairingEntry
	diagnosticsMu     sync.RWMutex
	diagnosticReports map[types.ID][]api.DiagnosticReportRequest
	payments          *payments.PaymentService
}

type pairingEntry struct {
	code       string
	endpointID types.ID
	zoopID     string
	expiresAt  time.Time
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
	paymentServices ...*payments.PaymentService,
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

	var ps *payments.PaymentService
	if len(paymentServices) > 0 && paymentServices[0] != nil {
		ps = paymentServices[0]
	} else {
		ps = payments.NewPaymentService(st, payments.NewMockGateway(), logger)
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
		pairingTokens:     make(map[string]pairingEntry),
		diagnosticReports: make(map[types.ID][]api.DiagnosticReportRequest),
		payments:          ps,
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

	// Registration does not require Zoop Auth because the device doesn't exist yet (global RateLimitMiddleware applies)
	s.mux.HandleFunc("POST /v1/devices", s.handleRegisterDevice())
	s.mux.Handle("GET /v1/devices", authMw(http.HandlerFunc(s.handleListDevices())))

	// Authenticated routes
	s.mux.Handle("GET /v1/devices/{id}", authMw(http.HandlerFunc(s.handleGetDevice())))
	s.mux.Handle("GET /v1/devices/{id}/endpoints", authMw(http.HandlerFunc(s.handleGetEndpoints())))
	s.mux.Handle("DELETE /v1/devices/{id}", authMw(http.HandlerFunc(s.handleUnregisterDevice())))

	s.mux.Handle("POST /v1/organizations", authMw(http.HandlerFunc(s.handleCreateOrganization())))
	s.mux.Handle("GET /v1/organizations", authMw(http.HandlerFunc(s.handleListOrganizations())))
	s.mux.Handle("GET /v1/organizations/{id}", authMw(http.HandlerFunc(s.handleGetOrganization())))
	s.mux.Handle("POST /v1/organizations/{id}/members", authMw(http.HandlerFunc(s.handleAddOrgMember())))
	s.mux.Handle("GET /v1/organizations/{id}/members", authMw(http.HandlerFunc(s.handleListOrgMembers())))
	s.mux.Handle("DELETE /v1/organizations/{id}/members/{memberId}", authMw(http.HandlerFunc(s.handleRemoveOrgMember())))

	s.mux.Handle("POST /v1/shares", authMw(http.HandlerFunc(s.handleCreateShare())))
	s.mux.Handle("GET /v1/shares", authMw(http.HandlerFunc(s.handleListShares())))
	s.mux.Handle("GET /v1/shares/{id}", authMw(http.HandlerFunc(s.handleGetShare())))
	s.mux.Handle("DELETE /v1/shares/{id}", authMw(http.HandlerFunc(s.handleDeleteShare())))

	s.mux.Handle("POST /v1/connections", authMw(http.HandlerFunc(s.handleCreateConnection())))
	s.mux.Handle("GET /v1/connections", authMw(http.HandlerFunc(s.handleListConnections())))
	s.mux.Handle("GET /v1/connections/{id}", authMw(http.HandlerFunc(s.handleGetConnection())))
	s.mux.Handle("PUT /v1/connections/{id}/state", authMw(http.HandlerFunc(s.handleUpdateConnectionState())))
	s.mux.Handle("GET /v1/devices/{id}/connections/pending", authMw(http.HandlerFunc(s.handleGetPendingConnections())))

	s.mux.Handle("GET /v1/signaling", authMw(http.HandlerFunc(s.handleSignaling())))
	s.mux.Handle("GET /v1/events", authMw(http.HandlerFunc(s.handleEventStream())))
	s.mux.Handle("GET /v1/users/by-zoop-id/{zoopId}", authMw(http.HandlerFunc(s.handleGetUserByZoopID())))
	s.mux.Handle("GET /v1/users/by-username/{username}", authMw(http.HandlerFunc(s.handleGetUserByUsername())))

	// Device Pairing & Multi-Device Mesh (Phase 8)
	s.mux.Handle("POST /v1/pairing/token", authMw(http.HandlerFunc(s.handleCreatePairingToken())))
	s.mux.Handle("POST /v1/pairing/claim", authMw(http.HandlerFunc(s.handleClaimPairingToken())))
	s.mux.Handle("GET /v1/devices/{id}/fleet", authMw(http.HandlerFunc(s.handleGetDeviceFleet())))

	// Diagnostics & Observability (Phase 9)
	s.mux.Handle("POST /v1/diagnostics/report", authMw(http.HandlerFunc(s.handleSubmitDiagnosticReport())))
	s.mux.Handle("GET /v1/diagnostics/report/{deviceId}", authMw(http.HandlerFunc(s.handleGetDiagnosticReports())))

	// Wallets & Payments
	s.mux.Handle("GET /v1/wallet", authMw(http.HandlerFunc(s.handleGetWallet())))
	s.mux.Handle("POST /v1/wallet/deposit/mobile-money", authMw(http.HandlerFunc(s.handleDepositMobileMoney())))
	s.mux.Handle("POST /v1/wallet/deposit/card", authMw(http.HandlerFunc(s.handleDepositCard())))
	s.mux.Handle("POST /v1/wallet/withdraw", authMw(http.HandlerFunc(s.handleWithdrawal())))
	s.mux.Handle("GET /v1/wallet/transactions", authMw(http.HandlerFunc(s.handleListTransactions())))
	s.mux.Handle("GET /v1/wallet/earnings", authMw(http.HandlerFunc(s.handleListEarnings())))
	s.mux.HandleFunc("POST /v1/payments/webhook", s.handlePaymentWebhook())

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
	s.mux.Handle("POST /v1/admin/relays", adminMw(http.HandlerFunc(s.handleAdminAddRelay())))
	s.mux.Handle("DELETE /v1/admin/relays/{id}", adminMw(http.HandlerFunc(s.handleAdminRemoveRelay())))
	s.mux.Handle("POST /v1/admin/devices/{id}/revoke", adminMw(http.HandlerFunc(s.handleAdminRevokeDevice())))
	s.mux.Handle("POST /v1/admin/devices/{id}/suspend", adminMw(http.HandlerFunc(s.handleAdminSuspendDevice())))
	s.mux.Handle("POST /v1/admin/devices/{id}/restore", adminMw(http.HandlerFunc(s.handleAdminRestoreDevice())))

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
// Unknown /v1/* or /metrics paths return JSON 404 instead of the SPA shell.
func (s *Server) serveWebApp() {
	fs := http.FileServer(http.Dir(s.cfg.WebDistDir))
	s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if strings.HasPrefix(path, "/v1/") || path == "/v1" || path == "/metrics" || strings.HasPrefix(path, "/metrics") {
			api.WriteError(w, "not_found", "endpoint not found", http.StatusNotFound)
			return
		}
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
			msg := err.Error()
			if isValidationError(msg) {
				api.WriteError(w, "invalid_request", msg, http.StatusBadRequest)
				return
			}
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

func (s *Server) handleGetUserByZoopID() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		zoopID := r.PathValue("zoopId")
		if zoopID == "" {
			api.WriteError(w, "invalid_request", "zoop_id is required", http.StatusBadRequest)
			return
		}
		u, err := s.users.GetAccountByZoopID(r.Context(), zoopID)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "user not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to lookup user by zoop_id", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup user", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, u)
	}
}

func (s *Server) handleGetUserByUsername() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username := r.PathValue("username")
		if username == "" {
			api.WriteError(w, "invalid_request", "username is required", http.StatusBadRequest)
			return
		}
		u, err := s.users.GetAccountByUsername(r.Context(), username)
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "user not found", http.StatusNotFound)
				return
			}
			s.logger.Error("failed to lookup user by username", "error", err)
			api.WriteError(w, "internal_error", "failed to lookup user", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, u)
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
			msg := err.Error()
			if isValidationError(msg) || msg == "sharing relationship already exists" || msg == "provider and recipient must be different devices" {
				status := http.StatusBadRequest
				if msg == "sharing relationship already exists" {
					status = http.StatusConflict
				}
				api.WriteError(w, "invalid_request", msg, status)
				return
			}
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
		limit, offset := parsePagination(r, 100, 500)
		paged := paginateSlice(resp, limit, offset)
		w.Header().Set("X-Total-Count", fmt.Sprintf("%d", len(resp)))
		api.WriteJSON(w, http.StatusOK, paged)
	}
}

func (s *Server) handleDeleteShare() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
		if !ok {
			api.WriteError(w, "unauthenticated", "caller identity missing", http.StatusUnauthorized)
			return
		}
		idStr := r.PathValue("id")
		parsedUUID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid share id format", http.StatusBadRequest)
			return
		}
		if err := s.shares.DeleteShare(r.Context(), types.ID(parsedUUID), callerID); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "share not found", http.StatusNotFound)
				return
			}
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", "not authorized to revoke this share", http.StatusForbidden)
				return
			}
			s.logger.Error("failed to delete share", "error", err)
			api.WriteError(w, "internal_error", "failed to revoke share", http.StatusInternalServerError)
			return
		}
		s.audit.Log(r.Context(), callerID, "share.revoke", "share:"+parsedUUID.String(), "")
		s.events.PublishBroadcast(services.ServerEvent{Type: "share_revoked", Entity: "share", ID: parsedUUID.String()})
		w.WriteHeader(http.StatusNoContent)
	}
}

func (s *Server) handleRemoveOrgMember() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		orgIDStr := r.PathValue("id")
		memberIDStr := r.PathValue("memberId")
		orgID, err := uuid.Parse(orgIDStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid organization id", http.StatusBadRequest)
			return
		}
		memberID, err := uuid.Parse(memberIDStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid member id", http.StatusBadRequest)
			return
		}
		if err := s.organizations.RemoveMember(r.Context(), callerID, types.ID(orgID), types.ID(memberID)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "member not found", http.StatusNotFound)
				return
			}
			if err == services.ErrForbidden {
				api.WriteError(w, "forbidden", err.Error(), http.StatusForbidden)
				return
			}
			api.WriteError(w, "invalid_request", err.Error(), http.StatusBadRequest)
			return
		}
		s.audit.Log(r.Context(), callerID, "org.member_remove", "org:"+orgIDStr, "member:"+memberIDStr)
		w.WriteHeader(http.StatusNoContent)
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
			if err == services.ErrConflict {
				api.WriteError(w, "conflict", err.Error(), http.StatusConflict)
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

		limit, offset := parsePagination(r, 100, 500)
		paged := paginateSlice(resp, limit, offset)
		w.Header().Set("X-Total-Count", fmt.Sprintf("%d", len(resp)))
		api.WriteJSON(w, http.StatusOK, paged)
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
		// Server-side search: ?search= or ?q= filters by name, id, platform substring
		searchRaw := r.URL.Query().Get("search")
		if searchRaw == "" {
			searchRaw = r.URL.Query().Get("q")
		}
		if searchRaw != "" {
			low := strings.ToLower(searchRaw)
			var filtered []api.DeviceResponse
			for _, d := range devices {
				if strings.Contains(strings.ToLower(d.Name), low) || strings.Contains(strings.ToLower(d.ID.String()), low) || strings.Contains(strings.ToLower(d.OS), low) {
					filtered = append(filtered, d)
				}
			}
			devices = filtered
		}
		limit, offset := parsePagination(r, 100, 500)
		total := len(devices)
		paged := paginateSlice(devices, limit, offset)
		w.Header().Set("X-Total-Count", fmt.Sprintf("%d", total))
		api.WriteJSON(w, http.StatusOK, paged)
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
			"pool":              "100.64.0.0/10",
			"subnets_allocated": allocated,
			"capacity":          capacity,
			"utilization_pct":   float64(allocated) / float64(capacity) * 100,
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

// handleAdminUsage aggregates platform usage counters with production telemetry.
// Supports ?range=7|30|90 (days) and ?format=csv for export.
// Returns extended usage analytics including bandwidth, timeseries, per-org breakdown,
// growth trends and audit summaries while remaining backward compatible with the
// original {devices, trusted_devices, ... connections_by_state} shape.
func (s *Server) handleAdminUsage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		devices, _ := s.store.ListDevices(ctx)
		orgs, _ := s.store.ListOrganizations(ctx)
		members, _ := s.store.ListOrgMembersAll(ctx)
		shares, _ := s.store.ListSharesAll(ctx)
		conns, _ := s.store.ListAllConnections(ctx)

		// Parse range param (default 30)
		rangeDays := 30
		if q := r.URL.Query().Get("range"); q != "" {
			q = strings.TrimSuffix(strings.TrimSpace(q), "d")
			if v, err := fmt.Sscanf(q, "%d", &rangeDays); err == nil && v == 1 {
				if rangeDays != 7 && rangeDays != 30 && rangeDays != 90 {
					if rangeDays < 1 {
						rangeDays = 7
					} else if rangeDays > 90 {
						rangeDays = 90
					}
				}
			}
		}
		if rangeDays < 1 {
			rangeDays = 30
		}

		stateCounts := map[string]int{}
		for _, c := range conns {
			stateCounts[string(c.State)]++
		}

		trusted := 0
		suspended := 0
		revoked := 0
		for _, d := range devices {
			switch d.State {
			case types.DeviceStateTrusted, types.DeviceStateRegistered:
				trusted++
			case types.DeviceStateSuspended:
				suspended++
			case types.DeviceStateRevoked:
				revoked++
			}
		}

		// Bandwidth from relay meter
		var bytesIn, bytesOut uint64
		activeSessions := 0
		if s.relayServer != nil && s.relayServer.GetMeter() != nil {
			bytesIn, bytesOut = s.relayServer.GetMeter().GetTotalTraffic()
			activeSessions = s.relayServer.ActiveConnections()
		}

		// IPAM
		allocated, capacity, _ := s.store.IPAMUsage(ctx)
		var utilization float64
		if capacity > 0 {
			utilization = float64(allocated) / float64(capacity) * 100
		}

		// Timeseries: bucket per day for last rangeDays
		now := time.Now().UTC()
		// Normalize to midnight UTC for bucketing
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		dateKeys := make([]string, rangeDays)
		dateMap := make(map[string]int) // for index lookup
		for i := 0; i < rangeDays; i++ {
			d := today.AddDate(0, 0, -rangeDays+1+i)
			k := d.Format("2006-01-02")
			dateKeys[i] = k
			dateMap[k] = i
		}
		deviceDaily := make([]int, rangeDays)
		connDaily := make([]int, rangeDays)
		memberDaily := make([]int, rangeDays)
		shareDaily := make([]int, rangeDays)

		countByDay := func(t time.Time, bucket []int) {
			if t.IsZero() {
				return
			}
			k := t.In(time.UTC).Format("2006-01-02")
			if idx, ok := dateMap[k]; ok {
				bucket[idx]++
			} else if t.After(today.AddDate(0, 0, -rangeDays+1)) && t.Before(today.AddDate(0, 0, 1)) {
				// fallback for time zone edge
				bucket[rangeDays-1]++
			}
		}
		for _, d := range devices {
			countByDay(d.CreatedAt, deviceDaily)
		}
		for _, c := range conns {
			countByDay(c.CreatedAt, connDaily)
		}
		for _, m := range members {
			countByDay(m.CreatedAt, memberDaily)
		}
		for _, sh := range shares {
			countByDay(sh.CreatedAt, shareDaily)
		}
		// Build timeseries payload with cumulative totals per day as well
		type dailyPoint struct {
			Date       string `json:"date"`
			NewDevices int    `json:"new_devices"`
			NewConns   int    `json:"new_connections"`
			NewMembers int    `json:"new_members"`
			NewShares  int    `json:"new_shares"`
			CumDevices int    `json:"cum_devices,omitempty"`
			CumConns   int    `json:"cum_connections,omitempty"`
		}
		points := make([]dailyPoint, rangeDays)
		cumD, cumC := 0, 0
		// Need totals before range to compute cumulative start; approximate by subtracting daily sums from total?
		// Instead compute cumulative incrementally: assume devices before range = total - sum(deviceDaily)
		beforeD := len(devices)
		beforeC := len(conns)
		for _, v := range deviceDaily {
			beforeD -= v
		}
		for _, v := range connDaily {
			beforeC -= v
		}
		cumD = beforeD
		cumC = beforeC
		for i := 0; i < rangeDays; i++ {
			cumD += deviceDaily[i]
			cumC += connDaily[i]
			points[i] = dailyPoint{
				Date:       dateKeys[i],
				NewDevices: deviceDaily[i],
				NewConns:   connDaily[i],
				NewMembers: memberDaily[i],
				NewShares:  shareDaily[i],
				CumDevices: cumD,
				CumConns:   cumC,
			}
		}

		// Growth trends: compare last 7 days vs previous 7 days
		calcGrowth := func(daily []int) float64 {
			if rangeDays < 14 {
				return 0
			}
			last7 := 0
			prev7 := 0
			for i := rangeDays - 7; i < rangeDays; i++ {
				last7 += daily[i]
			}
			for i := rangeDays - 14; i < rangeDays-7; i++ {
				prev7 += daily[i]
			}
			if prev7 == 0 {
				if last7 == 0 {
					return 0
				}
				return 100
			}
			return float64(last7-prev7) / float64(prev7) * 100
		}
		devGrowth := calcGrowth(deviceDaily)
		connGrowth := calcGrowth(connDaily)

		// Per-org breakdown
		// Build member count per org and device membership map
		orgMemberCounts := make(map[string]int)
		orgByID := make(map[string]*types.Organization)
		for _, o := range orgs {
			orgMemberCounts[o.ID.String()] = 0
			orgByID[o.ID.String()] = o
		}
		for _, m := range members {
			k := m.OrganizationID.String()
			orgMemberCounts[k]++
		}
		// Map device -> orgs (via members)
		deviceOrgs := make(map[string][]string)
		for _, m := range members {
			if m.DeviceID.String() != "" && m.DeviceID.String() != "00000000-0000-0000-0000-000000000000" {
				deviceOrgs[m.DeviceID.String()] = append(deviceOrgs[m.DeviceID.String()], m.OrganizationID.String())
			}
		}
		// Connections per org: if either provider or recipient device belongs to org, count
		orgConnCounts := make(map[string]int)
		for _, c := range conns {
			seen := make(map[string]bool)
			for _, did := range []string{c.ProviderID.String(), c.RecipientID.String()} {
				for _, oid := range deviceOrgs[did] {
					if !seen[oid] {
						orgConnCounts[oid]++
						seen[oid] = true
					}
				}
			}
		}
		// Determine top orgs sorted by connections then members
		type orgUsage struct {
			ID          string  `json:"id"`
			Name        string  `json:"name"`
			Slug        string  `json:"slug,omitempty"`
			Members     int     `json:"members"`
			Devices     int     `json:"devices"`
			Connections int     `json:"connections"`
			Share       float64 `json:"share_pct,omitempty"`
		}
		var topOrgs []orgUsage
		for _, o := range orgs {
			id := o.ID.String()
			membersCount := orgMemberCounts[id]
			// devices for org is same as members with device linked? For now count members entries where DeviceID non-nil
			devCount := 0
			seenDev := make(map[string]bool)
			for _, m := range members {
				if m.OrganizationID.String() == id && m.DeviceID.String() != "" && m.DeviceID.String() != "00000000-0000-0000-0000-000000000000" {
					if !seenDev[m.DeviceID.String()] {
						devCount++
						seenDev[m.DeviceID.String()] = true
					}
				}
			}
			topOrgs = append(topOrgs, orgUsage{
				ID:          id,
				Name:        o.Name,
				Slug:        o.Slug,
				Members:     membersCount,
				Devices:     devCount,
				Connections: orgConnCounts[id],
			})
		}
		// sort descending by connections + members
		// Simple sort
		for i := 0; i < len(topOrgs); i++ {
			for j := i + 1; j < len(topOrgs); j++ {
				if topOrgs[j].Connections > topOrgs[i].Connections || (topOrgs[j].Connections == topOrgs[i].Connections && topOrgs[j].Members > topOrgs[i].Members) {
					topOrgs[i], topOrgs[j] = topOrgs[j], topOrgs[i]
				}
			}
		}
		if len(topOrgs) > 10 {
			topOrgs = topOrgs[:10]
		}
		// compute share pct for top orgs
		totalConnsForShare := len(conns)
		if totalConnsForShare == 0 {
			totalConnsForShare = 1
		}
		for i := range topOrgs {
			topOrgs[i].Share = float64(topOrgs[i].Connections) / float64(totalConnsForShare) * 100
		}

		// Audit summary last 7 days
		events := s.audit.ListEvents()
		cutoff := now.AddDate(0, 0, -7)
		byAction := make(map[string]int)
		last7Count := 0
		for _, ev := range events {
			if ev.Timestamp.After(cutoff) {
				last7Count++
				byAction[ev.Action]++
			}
		}

		// Quotas and health hints
		deviceLimit := 10000 // default platform-wide soft cap
		quotas := map[string]interface{}{
			"device_limit":     deviceLimit,
			"devices_used_pct": float64(len(devices)) / float64(deviceLimit) * 100,
			"ipam_warning":     80,
			"ipam_critical":    95,
			"ipam_pct":         utilization,
			"bandwidth_cap_per_session": func() uint64 {
				if s.relayServer != nil && s.relayServer.GetMeter() != nil {
					// 0 = unlimited
					return 0
				}
				return 0
			}(),
		}

		// CSV export path
		if strings.EqualFold(r.URL.Query().Get("format"), "csv") {
			w.Header().Set("Content-Type", "text/csv")
			w.Header().Set("Content-Disposition", "attachment; filename=zoop-usage-"+today.Format("2006-01-02")+".csv")
			// Use csv writer
			// We import encoding/csv dynamically via inline? Need to handle manually to avoid import bloat in this scope
			// Write header
			fmt.Fprintln(w, "metric,value")
			fmt.Fprintf(w, "devices,%d\n", len(devices))
			fmt.Fprintf(w, "trusted_devices,%d\n", trusted)
			fmt.Fprintf(w, "suspended_devices,%d\n", suspended)
			fmt.Fprintf(w, "revoked_devices,%d\n", revoked)
			fmt.Fprintf(w, "organizations,%d\n", len(orgs))
			fmt.Fprintf(w, "members,%d\n", len(members))
			fmt.Fprintf(w, "shares,%d\n", len(shares))
			fmt.Fprintf(w, "connections,%d\n", len(conns))
			for k, v := range stateCounts {
				fmt.Fprintf(w, "connections_%s,%d\n", strings.ToLower(k), v)
			}
			fmt.Fprintf(w, "bandwidth_bytes_in,%d\n", bytesIn)
			fmt.Fprintf(w, "bandwidth_bytes_out,%d\n", bytesOut)
			fmt.Fprintf(w, "bandwidth_total,%d\n", bytesIn+bytesOut)
			fmt.Fprintf(w, "relay_active_sessions,%d\n", activeSessions)
			fmt.Fprintf(w, "ipam_allocated,%d\n", allocated)
			fmt.Fprintf(w, "ipam_capacity,%d\n", capacity)
			fmt.Fprintf(w, "ipam_utilization_pct,%.2f\n", utilization)
			fmt.Fprintln(w, "")
			fmt.Fprintln(w, "date,new_devices,new_connections,new_members,new_shares,cum_devices,cum_connections")
			for _, p := range points {
				fmt.Fprintf(w, "%s,%d,%d,%d,%d,%d,%d\n", p.Date, p.NewDevices, p.NewConns, p.NewMembers, p.NewShares, p.CumDevices, p.CumConns)
			}
			fmt.Fprintln(w, "")
			fmt.Fprintln(w, "org_id,org_name,members,devices,connections,share_pct")
			for _, o := range topOrgs {
				// escape commas in name
				safeName := strings.ReplaceAll(o.Name, ",", " ")
				fmt.Fprintf(w, "%s,%s,%d,%d,%d,%.1f\n", o.ID, safeName, o.Members, o.Devices, o.Connections, o.Share)
			}
			return
		}

		api.WriteJSON(w, http.StatusOK, map[string]interface{}{
			"devices":              len(devices),
			"trusted_devices":      trusted,
			"suspended_devices":    suspended,
			"revoked_devices":      revoked,
			"organizations":        len(orgs),
			"members":              len(members),
			"shares":               len(shares),
			"connections":          len(conns),
			"connections_by_state": stateCounts,
			"bandwidth": map[string]interface{}{
				"bytes_in":        bytesIn,
				"bytes_out":       bytesOut,
				"total":           bytesIn + bytesOut,
				"active_sessions": activeSessions,
			},
			"ipam": map[string]interface{}{
				"pool":              "100.64.0.0/10",
				"subnets_allocated": allocated,
				"capacity":          capacity,
				"utilization_pct":   utilization,
			},
			"timeseries": points,
			"range_days": rangeDays,
			"trends": map[string]interface{}{
				"devices_growth_pct":     devGrowth,
				"connections_growth_pct": connGrowth,
			},
			"top_orgs": topOrgs,
			"audit_summary": map[string]interface{}{
				"last_7_days": last7Count,
				"by_action":   byAction,
			},
			"quotas":       quotas,
			"generated_at": now.Format(time.RFC3339),
		})
	}
}

// handleAdminRelays lists the relay registry nodes.
func (s *Server) handleAdminRelays() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		nodes := s.relayRegistry.GetNodes(true)
		api.WriteJSON(w, http.StatusOK, nodes)
	}
}

// handleAdminAddRelay registers a new relay node in the cluster registry.
func (s *Server) handleAdminAddRelay() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req api.RelayAddRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid relay payload", http.StatusBadRequest)
			return
		}
		if req.ID == "" || req.Host == "" {
			api.WriteError(w, "invalid_request", "relay id and host are required", http.StatusBadRequest)
			return
		}

		node := relay.RelayNode{
			ID:           req.ID,
			Region:       req.Region,
			Host:         req.Host,
			Port:         req.Port,
			WebSocketURL: req.WebSocketURL,
			STUNPort:     req.STUNPort,
			TURNPort:     req.TURNPort,
			MaxCapacity:  req.MaxCapacity,
		}
		s.relayRegistry.RegisterNode(node)

		s.audit.Log(r.Context(), s.adminActorID(r), "relay.add", "relay:"+node.ID, "host="+node.Host+" region="+node.Region)

		for _, n := range s.relayRegistry.GetNodes(true) {
			if n.ID == node.ID {
				api.WriteJSON(w, http.StatusCreated, n)
				return
			}
		}
		api.WriteJSON(w, http.StatusCreated, node)
	}
}

// handleAdminRemoveRelay removes a relay node from the cluster registry.
func (s *Server) handleAdminRemoveRelay() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if id == "" {
			api.WriteError(w, "invalid_request", "relay id is required", http.StatusBadRequest)
			return
		}
		s.relayRegistry.DeregisterNode(id)
		s.audit.Log(r.Context(), s.adminActorID(r), "relay.remove", "relay:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"removed": true, "id": id})
	}
}

// handleAdminRevokeDevice transitions a device into the revoked state.
func (s *Server) handleAdminRevokeDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		parsed, err := uuid.Parse(id)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id", http.StatusBadRequest)
			return
		}

		if err := s.devices.Revoke(r.Context(), types.ID(parsed)); err != nil {
			s.logger.Error("failed to revoke device", "error", err)
			api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
			return
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "device.revoke", "device:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"revoked": true, "id": id})
	}
}

func (s *Server) handleAdminSuspendDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		parsed, err := uuid.Parse(id)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id", http.StatusBadRequest)
			return
		}

		if err := s.devices.Suspend(r.Context(), types.ID(parsed)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			if err == services.ErrInvalidDeviceState {
				api.WriteError(w, "invalid_state_transition", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to suspend device", "error", err)
			api.WriteError(w, "internal_error", "failed to suspend device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "device.suspend", "device:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"suspended": true, "id": id})
	}
}

func (s *Server) handleAdminRestoreDevice() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		parsed, err := uuid.Parse(id)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id", http.StatusBadRequest)
			return
		}

		if err := s.devices.Restore(r.Context(), types.ID(parsed)); err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "device not found", http.StatusNotFound)
				return
			}
			if err == services.ErrInvalidDeviceState {
				api.WriteError(w, "invalid_state_transition", err.Error(), http.StatusConflict)
				return
			}
			s.logger.Error("failed to restore device", "error", err)
			api.WriteError(w, "internal_error", "failed to restore device", http.StatusInternalServerError)
			return
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "device.restore", "device:"+id, "")
		api.WriteJSON(w, http.StatusOK, map[string]interface{}{"restored": true, "id": id})
	}
}

// adminActorID resolves the caller identity for audit logging on admin actions.
func (s *Server) adminActorID(r *http.Request) types.ID {
	callerID, ok := r.Context().Value(api.CallerIdentityKey).(types.ID)
	if !ok {
		return types.ID{}
	}
	return callerID
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

func stripAPIPrefixMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			r2 := r.Clone(r.Context())
			r2URL := *r.URL
			r2URL.Path = strings.TrimPrefix(r.URL.Path, "/api")
			if r2URL.Path == "" {
				r2URL.Path = "/"
			}
			r2.URL = &r2URL
			next.ServeHTTP(w, r2)
			return
		}
		if r.URL.Path == "/api" || r.URL.Path == "/api/" {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func generatePairingCode() (string, error) {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	var sb strings.Builder
	sb.WriteString("ZP-")
	for i := 0; i < 6; i++ {
		sb.WriteByte(charset[int(b[i])%len(charset)])
	}
	return sb.String(), nil
}

func (s *Server) handleCreatePairingToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		if callerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "caller identity required", http.StatusUnauthorized)
			return
		}

		var req api.CreatePairingTokenRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		ttl := 10 * time.Minute
		if req.ExpiresInSeconds > 0 && req.ExpiresInSeconds <= 3600 {
			ttl = time.Duration(req.ExpiresInSeconds) * time.Second
		}

		code, err := generatePairingCode()
		if err != nil {
			api.WriteError(w, "internal_error", "failed to generate pairing code", http.StatusInternalServerError)
			return
		}

		zoopID := "ZP-" + callerID.String()[:8]
		if user, err := s.store.GetUser(r.Context(), callerID); err == nil && user.ZoopID != "" {
			zoopID = user.ZoopID
		}

		now := time.Now().UTC()
		expiresAt := now.Add(ttl)

		s.pairingMu.Lock()
		for k, v := range s.pairingTokens {
			if now.After(v.expiresAt) {
				delete(s.pairingTokens, k)
			}
		}
		s.pairingTokens[code] = pairingEntry{
			code:       code,
			endpointID: callerID,
			zoopID:     zoopID,
			expiresAt:  expiresAt,
		}
		s.pairingMu.Unlock()

		cloudURL := "https://3.70.135.200.sslip.io"
		if r.Host != "" {
			scheme := "https"
			if r.TLS == nil && !strings.Contains(r.Host, "sslip.io") {
				scheme = "http"
			}
			cloudURL = fmt.Sprintf("%s://%s", scheme, r.Host)
		}

		resp := api.PairingTokenResponse{
			Code:       code,
			EndpointID: callerID.String(),
			ZoopID:     zoopID,
			CloudURL:   cloudURL,
			ExpiresAt:  expiresAt.Format(time.RFC3339),
		}
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleClaimPairingToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claimerID := api.IdentityFromContext(r.Context())
		if claimerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "caller identity required", http.StatusUnauthorized)
			return
		}

		var req api.ClaimPairingRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid json body", http.StatusBadRequest)
			return
		}

		code := strings.TrimSpace(strings.ToUpper(req.Code))
		if !strings.HasPrefix(code, "ZP-") && len(code) == 6 {
			code = "ZP-" + code
		}

		s.pairingMu.Lock()
		entry, exists := s.pairingTokens[code]
		if exists && time.Now().UTC().After(entry.expiresAt) {
			delete(s.pairingTokens, code)
			exists = false
		}
		if exists {
			delete(s.pairingTokens, code)
		}
		s.pairingMu.Unlock()

		if !exists {
			api.WriteError(w, "not_found", "invalid or expired pairing code", http.StatusNotFound)
			return
		}

		if entry.endpointID == claimerID {
			api.WriteError(w, "invalid_request", "cannot pair a device with itself", http.StatusBadRequest)
			return
		}

		issuerDev, err := s.store.GetDevice(r.Context(), entry.endpointID)
		if err != nil {
			api.WriteError(w, "not_found", "issuing device not found", http.StatusNotFound)
			return
		}

		// Provision bidirectional sharing relationships
		_, _ = s.shares.CreateShare(r.Context(), api.CreateShareRequest{
			ProviderID:  entry.endpointID,
			RecipientID: claimerID,
		})
		_, _ = s.shares.CreateShare(r.Context(), api.CreateShareRequest{
			ProviderID:  claimerID,
			RecipientID: entry.endpointID,
		})

		ev := services.ServerEvent{
			Type:   "device_paired",
			Entity: "device",
			ID:     claimerID.String(),
			Payload: map[string]interface{}{
				"paired_with": entry.endpointID.String(),
				"device_name": issuerDev.Name,
			},
		}
		s.events.PublishTo(entry.endpointID, ev)
		s.events.PublishTo(claimerID, ev)

		s.audit.Log(r.Context(), claimerID, "device.pair", "issuer:"+entry.endpointID.String(), "claimer:"+claimerID.String())

		resp := api.ClaimPairingResponse{
			Success:          true,
			PairedDeviceID:   entry.endpointID.String(),
			PairedDeviceName: issuerDev.Name,
			Message:          fmt.Sprintf("Successfully paired with %s", issuerDev.Name),
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleGetDeviceFleet() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		idStr := r.PathValue("id")
		targetID, err := uuid.Parse(idStr)
		if err != nil {
			api.WriteError(w, "invalid_request", "invalid device id format", http.StatusBadRequest)
			return
		}

		endpointID := types.ID(targetID)
		if callerID != endpointID {
			if _, err := s.store.GetSharingRelationshipByEndpoints(r.Context(), callerID, endpointID); err != nil {
				if _, err2 := s.store.GetSharingRelationshipByEndpoints(r.Context(), endpointID, callerID); err2 != nil {
					api.WriteError(w, "forbidden", "not authorized to view this device fleet", http.StatusForbidden)
					return
				}
			}
		}

		shares, err := s.store.ListShares(r.Context(), endpointID)
		if err != nil {
			s.logger.Error("failed to list shares for fleet", "error", err)
			api.WriteError(w, "internal_error", "failed to list fleet", http.StatusInternalServerError)
			return
		}

		fleet := make([]api.FleetDevice, 0)
		seen := make(map[types.ID]bool)

		if selfDev, err := s.store.GetDevice(r.Context(), endpointID); err == nil {
			seen[endpointID] = true
			fleet = append(fleet, api.FleetDevice{
				ID:       selfDev.ID.String(),
				Name:     selfDev.Name + " (This Device)",
				Platform: selfDev.OS,
				Status:   string(selfDev.State),
				IsSelf:   true,
				PairedAt: selfDev.CreatedAt.Format(time.RFC3339),
			})
		}

		for _, sh := range shares {
			otherID := sh.ProviderID
			if otherID == endpointID {
				otherID = sh.RecipientID
			}
			if seen[otherID] {
				continue
			}
			seen[otherID] = true

			dev, err := s.store.GetDevice(r.Context(), otherID)
			if err != nil {
				continue
			}

			fleet = append(fleet, api.FleetDevice{
				ID:       dev.ID.String(),
				Name:     dev.Name,
				Platform: dev.OS,
				Status:   string(dev.State),
				IsSelf:   false,
				PairedAt: sh.CreatedAt.Format(time.RFC3339),
			})
		}

		api.WriteJSON(w, http.StatusOK, fleet)
	}
}

func (s *Server) handleSubmitDiagnosticReport() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		if callerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "missing authentication identity", http.StatusUnauthorized)
			return
		}

		var req api.DiagnosticReportRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "invalid diagnostic report json", http.StatusBadRequest)
			return
		}

		if req.Timestamp == "" {
			req.Timestamp = time.Now().UTC().Format(time.RFC3339)
		}

		s.diagnosticsMu.Lock()
		existing := s.diagnosticReports[callerID]
		if len(existing) >= 10 {
			existing = existing[1:] // bounded ring buffer
		}
		s.diagnosticReports[callerID] = append(existing, req)
		s.diagnosticsMu.Unlock()

		resp := api.DiagnosticReportResponse{
			ReportID:  uuid.New().String(),
			DeviceID:  callerID.String(),
			Timestamp: req.Timestamp,
			Status:    "recorded",
		}
		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleGetDiagnosticReports() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		if callerID == (types.ID{}) {
			api.WriteError(w, "unauthenticated", "missing authentication identity", http.StatusUnauthorized)
			return
		}

		deviceIDStr := r.PathValue("deviceId")
		if deviceIDStr == "" {
			api.WriteError(w, "invalid_request", "device id required", http.StatusBadRequest)
			return
		}

		if deviceIDStr != callerID.String() {
			api.WriteError(w, "forbidden", "cannot access diagnostics for another device", http.StatusForbidden)
			return
		}

		s.diagnosticsMu.RLock()
		reports := s.diagnosticReports[callerID]
		s.diagnosticsMu.RUnlock()

		if reports == nil {
			reports = []api.DiagnosticReportRequest{}
		}

		api.WriteJSON(w, http.StatusOK, reports)
	}
}

// Start runs the HTTP server and blocks until the context is canceled.
func (s *Server) Start(ctx context.Context) error {
	rateLimiter := api.NewRateLimiter(300, 100) // 300 req/min, 100 burst
	handler := stripAPIPrefixMiddleware(
		api.MetricsMiddleware(
			api.SecurityHeadersMiddleware(
				api.IdempotencyMiddleware(
					api.RateLimitMiddleware(rateLimiter)(
						api.CORSMiddleware(s.cfg.AllowedOrigins)(s.mux),
					),
				),
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

// ─── Wallet & Payments Handlers ──────────────────────────────────

func (s *Server) handleGetWallet() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		wallet, err := s.payments.GetOrCreateWallet(r.Context(), callerID)
		if err != nil {
			s.logger.Error("failed to get or create wallet", "error", err, "caller", callerID)
			api.WriteError(w, "internal_error", "failed to retrieve wallet", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, wallet)
	}
}

func (s *Server) handleDepositMobileMoney() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		var req payments.DepositMobileMoneyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		resp, err := s.payments.InitiateMobileMoneyDeposit(r.Context(), callerID, req)
		if err != nil {
			if errors.Is(err, payments.ErrInvalidAmount) || errors.Is(err, payments.ErrInvalidPhone) {
				api.WriteError(w, "validation_error", err.Error(), http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to initiate mobile money deposit", "error", err, "caller", callerID)
			api.WriteError(w, "payment_failed", err.Error(), http.StatusBadGateway)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleDepositCard() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		var req payments.DepositCardRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		resp, err := s.payments.InitiateCardDeposit(r.Context(), callerID, req)
		if err != nil {
			if errors.Is(err, payments.ErrInvalidAmount) {
				api.WriteError(w, "validation_error", err.Error(), http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to initiate card deposit", "error", err, "caller", callerID)
			api.WriteError(w, "payment_failed", err.Error(), http.StatusBadGateway)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleWithdrawal() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		var req payments.WithdrawalRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			api.WriteError(w, "invalid_request", "malformed request payload", http.StatusBadRequest)
			return
		}
		resp, err := s.payments.InitiateWithdrawal(r.Context(), callerID, req)
		if err != nil {
			if errors.Is(err, payments.ErrInsufficientFunds) {
				api.WriteError(w, "insufficient_funds", err.Error(), http.StatusBadRequest)
				return
			}
			if errors.Is(err, payments.ErrInvalidAmount) || errors.Is(err, payments.ErrInvalidPhone) {
				api.WriteError(w, "validation_error", err.Error(), http.StatusBadRequest)
				return
			}
			s.logger.Error("failed to initiate withdrawal", "error", err, "caller", callerID)
			api.WriteError(w, "payout_failed", err.Error(), http.StatusBadGateway)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListTransactions() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		limit, offset := parsePagination(r, 20, 100)
		resp, err := s.payments.ListTransactions(r.Context(), callerID, limit, offset)
		if err != nil {
			s.logger.Error("failed to list transactions", "error", err, "caller", callerID)
			api.WriteError(w, "internal_error", "failed to list transactions", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handleListEarnings() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID := api.IdentityFromContext(r.Context())
		limit, offset := parsePagination(r, 20, 100)
		resp, err := s.payments.ListEarnings(r.Context(), callerID, limit, offset)
		if err != nil {
			s.logger.Error("failed to list earnings", "error", err, "caller", callerID)
			api.WriteError(w, "internal_error", "failed to list earnings", http.StatusInternalServerError)
			return
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

func (s *Server) handlePaymentWebhook() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			api.WriteError(w, "invalid_request", "failed to read body", http.StatusBadRequest)
			return
		}
		sigHeader := r.Header.Get("X-MarzPay-Signature")
		if sigHeader == "" {
			sigHeader = r.Header.Get("X-Webhook-Signature")
		}
		if sigHeader == "" {
			sigHeader = r.Header.Get("X-Webhook-Token")
		}

		if err := s.payments.ProcessWebhook(r.Context(), body, sigHeader); err != nil {
			if errors.Is(err, payments.ErrInvalidSignature) {
				api.WriteError(w, "unauthorized", "invalid webhook signature", http.StatusUnauthorized)
				return
			}
			s.logger.Error("failed to process payment webhook", "error", err)
			api.WriteError(w, "internal_error", "webhook processing failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"success","received":true}`))
	}
}

