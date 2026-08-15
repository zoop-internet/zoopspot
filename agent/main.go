package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/google/uuid"

	"github.com/zoop-internet/zoop/packages/agent/health"
	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/server"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/core"
	"github.com/zoop-internet/zoop/packages/core/config"
)

func main() {
	// Check for direct subcommand "doctor"
	if len(os.Args) > 1 && os.Args[1] == "doctor" {
		runDoctor("", "zoop0", 9090)
		return
	}

	configDirDefault, err := os.UserConfigDir()
	if err != nil {
		configDirDefault = "."
	}

	identityPath := flag.String("identity", configDirDefault+"/zoop/identity.key", "path to the identity private key file")
	connectTo := flag.String("connect", "", "provider ID to connect to")
	configDirFlag := flag.String("config-dir", "", "override configuration directory (mostly for testing)")
	tunName := flag.String("tun", "zoop0", "wireguard interface name")
	apiPort := flag.Int("api-port", 9090, "local API listen port")
	doctorFlag := flag.Bool("doctor", false, "run comprehensive diagnostics probe and report")
	flag.Parse()

	// If doctor flag is provided, run doctor probe
	if *doctorFlag {
		runDoctor(*configDirFlag, *tunName, *apiPort)
		return
	}

	// If connect flag is provided, run the CLI client instead of the server
	if *connectTo != "" {
		providerID, err := uuid.Parse(*connectTo)
		if err != nil {
			fmt.Printf("Invalid provider ID format: %v\n", err)
			os.Exit(1)
		}

		payload := []byte(fmt.Sprintf(`{"provider_id": "%s"}`, providerID.String()))
		apiURL := fmt.Sprintf("http://127.0.0.1:%d/connect", *apiPort)
		resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(payload))
		if err != nil {
			fmt.Printf("Failed to connect to local agent API (is the agent running?): %v\n", err)
			os.Exit(1)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			fmt.Printf("Agent returned an error: status %d\n", resp.StatusCode)
			os.Exit(1)
		}

		fmt.Println("Connection request submitted successfully!")
		os.Exit(0)
	}

	keyPath := *identityPath
	if *configDirFlag != "" {
		keyPath = *configDirFlag + "/identity.key"
	}

	// 1. Setup Configuration
	cfg := config.LoadConfig()

	// 2. Setup Logging
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)
	logger.Info("Starting Zoop Agent", "version", core.Version())

	// 3. Setup Components
	stateManager := state.NewManager()
	identityManager := identity.NewManager()

	// 4. Create and start server
	srv := server.NewServer(cfg, stateManager, identityManager, logger, *tunName, *apiPort)

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

func runDoctor(configDir, tunName string, apiPort int) {
	cfg := config.LoadConfig()
	checker := health.NewChecker(nil, tunName, cfg.ControlPlaneURL, "stun.l.google.com:19302")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	report := checker.RunDiagnostics(ctx)
	report.PrintReport()

	if !report.Healthy {
		os.Exit(1)
	}
	os.Exit(0)
}
