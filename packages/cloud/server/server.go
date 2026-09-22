package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/payments"
	"github.com/allannuwamanya/zoop/packages/cloud/relay"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/config"
	"github.com/allannuwamanya/zoop/packages/core/types"
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
		Region:       "local",
		Host:         "127.0.0.1",
		Port:         8080,
		WebSocketURL: "ws://127.0.0.1:8080/v1/relay",
		MaxCapacity:  1000,
	})

	turnMgr := relay.NewTURNManager("zoop-turn-realm", "zoop-shared-secret-turn-2026")

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
		audit:         services.NewAuditService([]byte("zoop-audit-hmac-key"), logger),
		relayServer:   rs,
		relayRegistry: reg,
		turnManager:   turnMgr,
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

	// Registration and Authentication do not require Zoop Auth because the device doesn't exist yet (global RateLimitMiddleware applies)
	s.mux.HandleFunc("POST /v1/devices", s.handleRegisterDevice())
	s.mux.HandleFunc("POST /v1/auth/signup", s.handleAuthSignup())
	s.mux.HandleFunc("POST /v1/auth/login", s.handleAuthLogin())
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
	s.mux.Handle("GET /v1/admin/billing", adminMw(http.HandlerFunc(s.handleAdminBilling())))
	s.mux.Handle("GET /v1/admin/billing/csv", adminMw(http.HandlerFunc(s.handleAdminBillingCSV())))
	s.mux.Handle("POST /v1/admin/cache/flush", adminMw(http.HandlerFunc(s.handleAdminCacheFlush())))
	s.mux.Handle("POST /v1/admin/services/store/restart", adminMw(http.HandlerFunc(s.handleAdminStoreRestart())))
	s.mux.Handle("POST /v1/admin/incidents", adminMw(http.HandlerFunc(s.handleAdminCreateIncident())))
	s.mux.Handle("GET /v1/admin/system", adminMw(http.HandlerFunc(s.handleAdminSystem())))
	s.mux.Handle("GET /v1/admin/integrations", adminMw(http.HandlerFunc(s.handleAdminGetIntegrations())))
	s.mux.Handle("PUT /v1/admin/integrations", adminMw(http.HandlerFunc(s.handleAdminUpdateIntegrations())))
	s.mux.Handle("POST /v1/admin/integrations/test", adminMw(http.HandlerFunc(s.handleAdminTestIntegration())))

	s.mux.Handle("GET /v1/organizations/{id}/audit", authMw(http.HandlerFunc(s.handleOrgAudit())))


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
