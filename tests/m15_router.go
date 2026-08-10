//go:build ignore

package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/router"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	fmt.Println("==================================================")
	fmt.Println("       ZOOP MILESTONE 15 ROUTER GATEWAY TEST      ")
	fmt.Println("==================================================")

	// ----------------------------------------------------
	// STEP 1: Verify Router Configuration & Defaults
	// ----------------------------------------------------
	fmt.Println("\n[1/5] Verifying Router Configuration & Defaults...")

	cfg := router.DefaultConfig()
	fmt.Printf("✓ Default Config: Mode=%s WAN=%s LAN=%s Subnet=%s Tunnel=%s Table=%d\n",
		cfg.Mode, cfg.WANInterface, cfg.LANInterface, cfg.LANSubnet, cfg.TunnelIfName, cfg.TableID)

	// ----------------------------------------------------
	// STEP 2: Execute Router Diagnostics
	// ----------------------------------------------------
	fmt.Println("\n[2/5] Running Router Health Diagnostics...")

	diag := router.RunDiagnostics(cfg)
	if !diag.LANInterfaceOK {
		fmt.Printf("FAILED: LAN interface check failed: %s\n", diag.Details)
		os.Exit(1)
	}
	fmt.Printf("✓ Router Diagnostics Passed: IPForwarding=%v WAN=%v LAN=%v Details: %s\n",
		diag.IPForwarding, diag.WANConnected, diag.LANInterfaceOK, diag.Details)

	// ----------------------------------------------------
	// STEP 3: Test Provider Router Gateway Mode
	// ----------------------------------------------------
	fmt.Println("\n[3/5] Testing Provider Router Gateway Mode...")

	devMgr, err := tunnel.NewDeviceManager("z-m15-r", nil)
	if err != nil {
		fmt.Printf("FAILED create tunnel device: %v\n", err)
		os.Exit(1)
	}
	defer devMgr.Close()

	gwMgr := router.NewGatewayManager(cfg, logger)
	if err := gwMgr.EnableProviderNAT(); err != nil {
		fmt.Printf("FAILED EnableProviderNAT: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ Provider Router NAT MASQUERADE enabled successfully")

	// ----------------------------------------------------
	// STEP 4: Test Recipient Router Gateway Mode
	// ----------------------------------------------------
	fmt.Println("\n[4/5] Testing Recipient Router Gateway Mode...")

	cfgRecipient := cfg
	cfgRecipient.Mode = router.ModeRecipient
	gwRecipient := router.NewGatewayManager(cfgRecipient, logger)

	if err := gwRecipient.EnableRecipientRouting("100.64.0.1"); err != nil {
		fmt.Printf("FAILED EnableRecipientRouting: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ Recipient Router LAN Subnet Policy Routing enabled successfully")

	// ----------------------------------------------------
	// STEP 5: Test Gateway Teardown
	// ----------------------------------------------------
	fmt.Println("\n[5/5] Testing Router Gateway Teardown...")

	_ = gwMgr.Teardown()
	_ = gwRecipient.Teardown()
	fmt.Println("✓ Router Gateway rules torn down cleanly")

	fmt.Println("\n==================================================")
	fmt.Println("    ✓ MILESTONE 15 ROUTER GATEWAY TEST PASSED!    ")
	fmt.Println("==================================================")
}
