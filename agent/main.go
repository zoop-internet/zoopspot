package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/server"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/core"
	"github.com/zoop-internet/zoop/packages/core/config"
)

func main() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	defaultKeyPath := configDir + "/zoop/identity.key"

	var keyPath string
	flag.StringVar(&keyPath, "identity", defaultKeyPath, "path to the identity private key file")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	logger.Info("Starting Zoop Agent", "version", core.Version())

	cfg := config.LoadConfig()
	sm := state.NewManager()
	im := identity.NewManager()

	srv := server.NewServer(cfg, sm, im, logger)

	ctx, cancel := context.WithCancel(context.Background())

	// Handle OS signals for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		logger.Info("Received signal, shutting down", "signal", sig)
		cancel()
	}()

	if err := srv.Start(ctx, keyPath); err != nil {
		logger.Error("Agent stopped with error", "error", err)
		os.Exit(1)
	}

	logger.Info("Agent exited cleanly")
}
