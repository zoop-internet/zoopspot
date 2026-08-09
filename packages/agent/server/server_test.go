package server_test

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/server"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/core/config"
)

func TestServerLifecycle(t *testing.T) {
	cfg := config.DefaultConfig()
	sm := state.NewManager()
	im := identity.NewManager()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	srv := server.NewServer(cfg, sm, im, logger)

	ctx, cancel := context.WithCancel(context.Background())
	dir := t.TempDir()
	keyPath := filepath.Join(dir, "identity.key")

	errCh := make(chan error)
	go func() {
		errCh <- srv.Start(ctx, keyPath)
	}()

	// Give it a moment to start
	time.Sleep(100 * time.Millisecond)

	if sm.Get() != state.StateRunning {
		t.Errorf("expected state RUNNING, got %s", sm.Get())
	}

	cancel()

	err := <-errCh
	if err != nil {
		t.Errorf("unexpected error from Start: %v", err)
	}

	if sm.Get() != state.StateStopped {
		t.Errorf("expected state STOPPED, got %s", sm.Get())
	}
}
