package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
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
	relayServer   *relay.RelayServer
	mux           *http.ServeMux
	server        *http.Server
	upgrader      websocket.Upgrader
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
		// Relay server uses the store for Ed25519 auth of incoming relay connections.
		relayServer: relay.NewServer(logger, st),
		mux:         http.NewServeMux(),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				return true // allow all origins for now
			},
		},
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	authMw := api.AuthMiddleware(s.store, s.logger)

	// Registration does not require Zoop Auth because the device doesn't exist yet
	s.mux.HandleFunc("POST /v1/devices", s.handleRegisterDevice())
	s.mux.HandleFunc("GET /v1/devices", s.handleListDevices())

	// Authenticated routes
	s.mux.Handle("GET /v1/devices/{id}", authMw(http.HandlerFunc(s.handleGetDevice())))
	s.mux.Handle("GET /v1/devices/{id}/endpoints", authMw(http.HandlerFunc(s.handleGetEndpoints())))

	s.mux.HandleFunc("POST /v1/organizations", s.handleCreateOrganization())
	s.mux.HandleFunc("GET /v1/organizations", s.handleListOrganizations())
	s.mux.HandleFunc("GET /v1/organizations/{id}", s.handleGetOrganization())
	s.mux.HandleFunc("POST /v1/organizations/{id}/members", s.handleAddOrgMember())
	s.mux.HandleFunc("GET /v1/organizations/{id}/members", s.handleListOrgMembers())

	s.mux.Handle("POST /v1/shares", authMw(http.HandlerFunc(s.handleCreateShare())))
	s.mux.Handle("GET /v1/shares/{id}", authMw(http.HandlerFunc(s.handleGetShare())))

	s.mux.Handle("POST /v1/connections", authMw(http.HandlerFunc(s.handleCreateConnection())))
	s.mux.Handle("GET /v1/connections/{id}", authMw(http.HandlerFunc(s.handleGetConnection())))
	s.mux.Handle("PUT /v1/connections/{id}/state", authMw(http.HandlerFunc(s.handleUpdateConnectionState())))
	s.mux.Handle("GET /v1/devices/{id}/connections/pending", authMw(http.HandlerFunc(s.handleGetPendingConnections())))

	s.mux.Handle("GET /v1/signaling", authMw(http.HandlerFunc(s.handleSignaling())))

	// Relay endpoint: the relay server performs its own Ed25519 authentication.
	s.mux.HandleFunc("GET /v1/relay", s.relayServer.HandleWebSocket)
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

		resp, err := s.organizations.CreateOrg(r.Context(), req)
		if err != nil {
			s.logger.Error("failed to create organization", "error", err)
			api.WriteError(w, "internal_error", err.Error(), http.StatusBadRequest)
			return
		}

		api.WriteJSON(w, http.StatusCreated, resp)
	}
}

func (s *Server) handleListOrganizations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		orgs, err := s.organizations.ListOrgs(r.Context())
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

		org, err := s.organizations.GetOrg(r.Context(), types.ID(parsedUUID))
		if err != nil {
			if err == store.ErrNotFound {
				api.WriteError(w, "not_found", "organization not found", http.StatusNotFound)
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

		resp, err := s.organizations.AddMember(r.Context(), types.ID(orgID), req)
		if err != nil {
			s.logger.Error("failed to add organization member", "error", err)
			api.WriteError(w, "internal_error", err.Error(), http.StatusBadRequest)
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

		members, err := s.organizations.ListMembers(r.Context(), types.ID(orgID))
		if err != nil {
			s.logger.Error("failed to list organization members", "error", err)
			api.WriteError(w, "internal_error", "failed to list members", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, members)
	}
}

// Start runs the HTTP server and blocks until the context is canceled.
func (s *Server) Start(ctx context.Context) error {
	rateLimiter := api.NewRateLimiter(300, 100) // 300 req/min, 100 burst
	handler := api.RateLimitMiddleware(rateLimiter)(s.mux)

	s.server = &http.Server{
		Addr:    ":8080", // Can be configured via cfg later
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
