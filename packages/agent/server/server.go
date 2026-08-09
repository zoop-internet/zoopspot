package server

import (
	"context"
	"log/slog"

	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// Server orchestrates the Zoop Agent lifecycle.
type Server struct {
	config   config.Config
	state    *state.Manager
	identity identity.Manager
	logger   *slog.Logger

	ident types.Identity
}

// NewServer initializes a new agent server.
func NewServer(cfg config.Config, sm *state.Manager, im identity.Manager, logger *slog.Logger) *Server {
	return &Server{
		config:   cfg,
		state:    sm,
		identity: im,
		logger:   logger,
	}
}

// Start begins the agent's operations.
func (s *Server) Start(ctx context.Context, keyPath string) error {
	s.logger.Info("starting zoop agent")

	// 1. Load or Generate Identity
	s.logger.Info("loading identity", "path", keyPath)
	ident, err := s.identity.LoadOrGenerate(keyPath)
	if err != nil {
		s.state.Set(state.StateError)
		s.logger.Error("failed to load identity", "error", err)
		return err
	}
	s.ident = ident
	s.logger.Info("identity loaded", "endpoint_id", ident.EndpointID)

	// 2. Transition to Running
	s.state.Set(state.StateRunning)
	s.logger.Info("agent is running")

	// 3. Block until context is canceled (simulating running indefinitely)
	<-ctx.Done()

	s.logger.Info("agent shutting down")
	s.state.Set(state.StateStopped)
	return nil
}
