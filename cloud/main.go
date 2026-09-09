package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/zoop-internet/zoop/packages/cloud/payments"
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

	// Initialize the data store (PostgreSQL if DATABASE_URL is configured, else InMemoryStore).
	var st store.Store
	if cfg.DatabaseURL != "" {
		pgStore, err := store.NewPostgresStore(cfg.DatabaseURL)
		if err != nil {
			logger.Error("Failed to connect to PostgreSQL", "error", err)
			os.Exit(1)
		} else {
			logger.Info("PostgreSQL persistent data layer connected and migrated successfully")
			st = pgStore
		}
	} else {
		logger.Info("Using ephemeral InMemoryStore (set DATABASE_URL for PostgreSQL)")
		st = store.NewInMemoryStore()
	}

	// Initialize services.
	deviceService := services.NewDeviceService(st)
	userService := services.NewUserService(st)
	orgService := services.NewOrganizationService(st)
	shareService := services.NewShareService(st)
	hub := services.NewSignalingHub()
	connService := services.NewConnectionService(st, hub)

	// Initialize payment gateway & service
	var gateway payments.GatewayClient
	if cfg.PaymentAPIKey != "" && cfg.PaymentAPISecret != "" {
		logger.Info("Initializing production MarzPay payment gateway", "url", cfg.PaymentGatewayURL)
		gateway = payments.NewMarzPayGateway(cfg.PaymentGatewayURL, cfg.PaymentAPIKey, cfg.PaymentAPISecret, cfg.PaymentWebhookSecret, nil)
	} else {
		logger.Info("Payment credentials not set; using MockGateway for development")
		gateway = payments.NewMockGateway()
	}
	paymentService := payments.NewPaymentService(st, gateway, logger)

	// Initialize server (relay server shares the store for auth).
	srv := server.NewServer(cfg, logger, st, deviceService, userService, orgService, shareService, connService, hub, paymentService)

	ctx, cancel := context.WithCancel(context.Background())

	// Handle OS signals for graceful shutdown.
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
