package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/allannuwamanya/zoop/packages/core"
	"github.com/allannuwamanya/zoop/packages/router"
)

func main() {
	// CLI flags
	modeFlag := flag.String("mode", "provider", "router mode: provider or recipient")
	wanFlag := flag.String("wan", "eth0", "WAN interface name (provider mode)")
	lanFlag := flag.String("lan", "br-lan", "LAN interface name (recipient mode)")
	lanSubnetFlag := flag.String("lan-subnet", "192.168.1.0/24", "LAN subnet in CIDR notation (recipient mode)")
	tunFlag := flag.String("tun", "zoop0", "Zoop WireGuard tunnel interface name")
	tableIDFlag := flag.Int("table", 200, "Policy routing table ID (recipient mode)")
	providerIPFlag := flag.String("provider-ip", "", "Provider WireGuard IP (recipient mode)")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	logger.Info("Zoop Router Gateway", "version", core.Version(), "mode", *modeFlag)

	cfg := router.RouterConfig{
		Mode:         router.RouterMode(*modeFlag),
		WANInterface: *wanFlag,
		LANInterface: *lanFlag,
		LANSubnet:    *lanSubnetFlag,
		TunnelIfName: *tunFlag,
		TableID:      *tableIDFlag,
	}

	gw := router.NewGatewayManager(cfg, logger)

	ctx, cancel := context.WithCancel(context.Background())
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		logger.Info("received signal, shutting down router gateway", "signal", sig)
		cancel()
	}()

	switch cfg.Mode {
	case router.ModeProvider:
		logger.Info("activating Provider NAT gateway",
			"wan", cfg.WANInterface,
			"tunnel", cfg.TunnelIfName,
		)
		if err := gw.EnableProviderNAT(); err != nil {
			logger.Error("failed to enable provider NAT", "error", err)
			os.Exit(1)
		}
		logger.Info("provider NAT active — press Ctrl+C to stop")

	case router.ModeRecipient:
		if *providerIPFlag == "" {
			fmt.Fprintln(os.Stderr, "error: --provider-ip is required in recipient mode")
			os.Exit(1)
		}
		logger.Info("activating Recipient policy routing",
			"lan_subnet", cfg.LANSubnet,
			"tunnel", cfg.TunnelIfName,
			"provider_ip", *providerIPFlag,
		)
		if err := gw.EnableRecipientRouting(*providerIPFlag); err != nil {
			logger.Error("failed to enable recipient routing", "error", err)
			os.Exit(1)
		}
		logger.Info("recipient routing active — press Ctrl+C to stop")

	default:
		fmt.Fprintf(os.Stderr, "unknown mode %q — use 'provider' or 'recipient'\n", cfg.Mode)
		os.Exit(1)
	}

	// Block until signal received.
	<-ctx.Done()

	logger.Info("tearing down router gateway configuration")
	if err := gw.Teardown(); err != nil {
		logger.Error("teardown error", "error", err)
	}
	logger.Info("router gateway exited cleanly")
}
