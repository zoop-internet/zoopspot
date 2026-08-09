package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

type Server struct {
	cfg         config.Config
	logger      *slog.Logger
	store       store.Store
	devices     *services.DeviceService
	users       *services.UserService
	shares      *services.ShareService
	connections *services.ConnectionService
	signaling   *services.SignalingHub
	mux         *http.ServeMux
	server      *http.Server
	upgrader    websocket.Upgrader
}

func NewServer(
	cfg config.Config,
	logger *slog.Logger,
	st store.Store,
	ds *services.DeviceService,
	us *services.UserService,
	ss *services.ShareService,
	cs *services.ConnectionService,
	sh *services.SignalingHub,
) *Server {
	s := &Server{
		cfg:         cfg,
		logger:      logger,
		store:       st,
		devices:     ds,
		users:       us,
		shares:      ss,
		connections: cs,
		signaling:   sh,
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

	// Authenticated routes
	s.mux.Handle("GET /v1/devices/{id}", authMw(http.HandlerFunc(s.handleGetDevice())))
	s.mux.Handle("GET /v1/devices/{id}/endpoints", authMw(http.HandlerFunc(s.handleGetEndpoints())))

	s.mux.Handle("POST /v1/shares", authMw(http.HandlerFunc(s.handleCreateShare())))
	s.mux.Handle("GET /v1/shares/{id}", authMw(http.HandlerFunc(s.handleGetShare())))

	s.mux.Handle("POST /v1/connections", authMw(http.HandlerFunc(s.handleCreateConnection())))
	s.mux.Handle("GET /v1/connections/{id}", authMw(http.HandlerFunc(s.handleGetConnection())))
	s.mux.Handle("PUT /v1/connections/{id}/state", authMw(http.HandlerFunc(s.handleUpdateConnectionState())))

	s.mux.Handle("GET /v1/signaling", authMw(http.HandlerFunc(s.handleSignaling())))
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

		resp := api.EndpointsResponse{
			DeviceID:  ident.EndpointID,
			PublicKey: string(ident.PublicKey), // Should be encoded appropriately in production
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
			s.logger.Error("failed to update connection state", "error", err)
			api.WriteError(w, "internal_error", "failed to update connection state", http.StatusInternalServerError)
			return
		}

		api.WriteJSON(w, http.StatusOK, map[string]string{"status": "updated"})
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

// Start runs the HTTP server and blocks until the context is canceled.
func (s *Server) Start(ctx context.Context) error {
	s.server = &http.Server{
		Addr:    ":8080", // Can be configured via cfg later
		Handler: s.mux,
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
