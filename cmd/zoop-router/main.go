package main

import (
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/zoop-internet/zoopspot/packages/agent/tunnel"
	"github.com/zoop-internet/zoopspot/packages/router"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	logger.Info("Starting Zoop Embedded Router Daemon (zoop-router)")

	cfg := router.DefaultConfig()
	if mode := os.Getenv("ZOOP_ROUTER_MODE"); mode != "" {
		cfg.Mode = router.RouterMode(mode)
	}

	logger.Info("Router configuration loaded",
		"mode", cfg.Mode,
		"wan", cfg.WANInterface,
		"lan", cfg.LANInterface,
		"subnet", cfg.LANSubnet,
		"tunnel", cfg.TunnelIfName,
	)

	// Run Diagnostics
	diag := router.RunDiagnostics(cfg)
	logger.Info("Router diagnostics status",
		"wan_connected", diag.WANConnected,
		"ip_forwarding", diag.IPForwarding,
		"lan_ok", diag.LANInterfaceOK,
		"details", diag.Details,
	)

	// Initialize WireGuard DeviceManager for Router
	devMgr, err := tunnel.NewDeviceManager(cfg.TunnelIfName, nil)
	if err != nil {
		logger.Error("failed to create router tunnel interface", "error", err)
		os.Exit(1)
	}
	defer devMgr.Close()

	// Initialize Gateway Manager
	gwMgr := router.NewGatewayManager(cfg, logger)

	if cfg.Mode == router.ModeProvider {
		if err := gwMgr.EnableProviderNAT(); err != nil {
			logger.Error("failed to enable provider router NAT", "error", err)
		}
	} else if cfg.Mode == router.ModeRecipient {
		if err := gwMgr.EnableRecipientRouting("100.64.0.1"); err != nil {
			logger.Error("failed to enable recipient router routing", "error", err)
		}
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	fmt.Println("✓ Zoop Router Daemon active and forwarding traffic")

	<-sigCh
	logger.Info("Shutting down Zoop Router Daemon...")
	_ = gwMgr.Teardown()
}
