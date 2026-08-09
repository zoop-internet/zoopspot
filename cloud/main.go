package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/zoop-internet/zoop/packages/cloud/server"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core"
	"github.com/zoop-internet/zoop/packages/core/config"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	logger.Info("Starting Zoop Cloud", "version", core.Version())

	cfg := config.LoadConfig()

	// Initialize the data store (in-memory for M4)
	st := store.NewInMemoryStore()

	// Initialize services
	deviceService := services.NewDeviceService(st)
	userService := services.NewUserService(st)

	// Initialize server
	srv := server.NewServer(cfg, logger, st, deviceService, userService)

	ctx, cancel := context.WithCancel(context.Background())

	// Handle OS signals for graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		logger.Info("Received signal, shutting down", "signal", sig)
		cancel()
	}()

	if err := srv.Start(ctx); err != nil {
		logger.Error("Cloud API stopped with error", "error", err)
		os.Exit(1)
	}

	logger.Info("Cloud API exited cleanly")
}
