package server

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

type Server struct {
	cfg     config.Config
	logger  *slog.Logger
	store   store.Store
	devices *services.DeviceService
	users   *services.UserService
	mux     *http.ServeMux
	server  *http.Server
}

func NewServer(cfg config.Config, logger *slog.Logger, st store.Store, ds *services.DeviceService, us *services.UserService) *Server {
	s := &Server{
		cfg:     cfg,
		logger:  logger,
		store:   st,
		devices: ds,
		users:   us,
		mux:     http.NewServeMux(),
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
		if idStr == "" {
			api.WriteError(w, "invalid_request", "missing device id", http.StatusBadRequest)
			return
		}

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

func (s *Server) handleSignaling() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// For Milestone 4, we establish the endpoint for the WebSocket upgrade.
		// The actual WebSocket signaling implementation (upgrader, message pumping) 
		// will be built out in the upcoming signaling milestone.
		// For now, we return 101 Switching Protocols placeholder or simply 501 Not Implemented
		// until the Gorilla Websocket or x/net/websocket logic is added.
		api.WriteError(w, "not_implemented", "signaling websocket upgrade not yet implemented", http.StatusNotImplemented)
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
