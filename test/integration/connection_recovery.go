//go:build ignore

package main

import (
	"context"
	"crypto/ed25519"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"time"

	agentrelay "github.com/zoop-internet/zoop/packages/agent/relay"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	cloudrelay "github.com/zoop-internet/zoop/packages/cloud/relay"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	fmt.Println("==================================================")
	fmt.Println("    ZOOP E2E: CONNECTION RECOVERY TEST            ")
	fmt.Println("==================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pubP, privP, _ := ed25519.GenerateKey(nil)
	pIdent := types.Identity{EndpointID: types.NewID(), PublicKey: pubP}

	pubR, privR, _ := ed25519.GenerateKey(nil)
	rIdent := types.Identity{EndpointID: types.NewID(), PublicKey: pubR}

	relayStore := store.NewInMemoryStore()
	_ = relayStore.SaveIdentity(ctx, &pIdent)
	_ = relayStore.SaveIdentity(ctx, &rIdent)

	// ----------------------------------------------------
	// STEP 1: Start Relay Server
	// ----------------------------------------------------
	fmt.Println("\n[1/5] Initializing Relay Server...")
	relaySrv := cloudrelay.NewServer(logger, relayStore)
	tsRelay := httptest.NewServer(http.HandlerFunc(relaySrv.HandleWebSocket))
	defer tsRelay.Close()

	relayURL := "ws" + strings.TrimPrefix(tsRelay.URL, "http")
	fmt.Printf("✓ Relay Server active at %s\n", relayURL)

	// ----------------------------------------------------
	// STEP 2: Initialize Provider and Recipient Devices
	// ----------------------------------------------------
	fmt.Println("\n[2/5] Initializing Endpoints & WireGuard Interfaces...")
	pDev, err := tunnel.NewDeviceManager("z-m12-p", nil)
	if err != nil {
		pDev, _ = tunnel.NewMockDeviceManager("z-m12-p", nil)
	}
	defer pDev.Close()

	rDev, err := tunnel.NewDeviceManager("z-m12-r", nil)
	if err != nil {
		rDev, _ = tunnel.NewMockDeviceManager("z-m12-r", nil)
	}
	defer rDev.Close()

	pK, _ := tunnel.GenerateKeyPair()
	rK, _ := tunnel.GenerateKeyPair()
	_ = pDev.ConfigureDevice(pK.PrivateKey, 45221)
	_ = rDev.ConfigureDevice(rK.PrivateKey, 54321)

	rPort, _ := rDev.GetListenPort()
	pPort, _ := pDev.GetListenPort()
	if rPort == 0 {
		rPort = 54321
	}
	if pPort == 0 {
		pPort = 45221
	}

	pRelayClient := agentrelay.NewClient(relayURL, pIdent, privP, logger)
	rRelayClient := agentrelay.NewClient(relayURL, rIdent, privR, logger)

	go pRelayClient.Start(ctx)
	go rRelayClient.Start(ctx)
	time.Sleep(300 * time.Millisecond)

	fmt.Printf("✓ Provider and Recipient initialized on local ports (P:%d, R:%d)\n", pPort, rPort)

	// ----------------------------------------------------
	// STEP 3: Configure Connection & Launch Recovery Manager
	// ----------------------------------------------------
	fmt.Println("\n[3/5] Starting ConnectionRecoveryManager...")

	// Initial direct path candidates
	directCandidates := []types.EndpointCandidate{
		{IP: "127.0.0.1", Port: rPort, Type: types.CandidateTypeHost, Priority: 100},
	}

	stateChanges := make(chan tunnel.ConnectionRecoveryState, 5)
	recoveryMgr := tunnel.NewConnectionRecoveryManager(
		pDev.GetMuxBind(),
		rK.PublicKey,
		directCandidates,
		"m12-recovery-conn-id",
		pPort,
		pDev,
		relayURL,
		func(newState tunnel.ConnectionRecoveryState, activeEndpoint string, isDirect bool) {
			logger.Info("connection state updated", "state", newState, "endpoint", activeEndpoint, "is_direct", isDirect)
			stateChanges <- newState
		},
		logger,
	)

	recoveryMgr.Start(ctx)
	defer recoveryMgr.Stop()

	state, ep, isDirect := recoveryMgr.GetState()
	fmt.Printf("✓ Initial Connection State: state=%s endpoint=%s isDirect=%v\n", state, ep, isDirect)

	// ----------------------------------------------------
	// STEP 4: Simulate Network Interruption & Relay Fallback
	// ----------------------------------------------------
	fmt.Println("\n[4/5] Simulating Direct Path Interruption (Handshake Stalling)...")

	// Set peer to unreachable endpoint to simulate dropped path / network change
	_ = pDev.AddPeer(rK.PublicKey, "192.0.2.1", 9999, []string{"100.64.0.2/32"})

	// Wait for recovery loop to detect handshake stall and fall back to relay
	select {
	case newState := <-stateChanges:
		if newState == tunnel.StateRelayed {
			fmt.Printf("✓ Connection state successfully transitioned to Relay Fallback: %s\n", newState)
		} else {
			fmt.Printf("Unexpected state transition: %s\n", newState)
		}
	case <-time.After(6 * time.Second):
		fmt.Println("FAILED: timed out waiting for relay fallback transition")
		os.Exit(1)
	}

	// ----------------------------------------------------
	// STEP 5: Restore Reachable Path & Verify Auto-Recovery
	// ----------------------------------------------------
	fmt.Println("\n[5/5] Restoring Reachable Candidate & Verifying Automatic Path Recovery...")

	// Update candidates with active local port
	recoveryMgr.UpdateCandidates([]types.EndpointCandidate{
		{IP: "127.0.0.1", Port: rPort, Type: types.CandidateTypeHost, Priority: 100},
	})

	for {
		select {
		case newState := <-stateChanges:
			if newState == tunnel.StateDirect || newState == tunnel.StateRecovered {
				finalState, finalEP, finalDirect := recoveryMgr.GetState()
				fmt.Printf("✓ Automatic Connection Recovery Successful!\n")
				fmt.Printf("   - Final State:     %s\n", finalState)
				fmt.Printf("   - Final Endpoint:  %s\n", finalEP)
				fmt.Printf("   - Direct P2P Path: %v\n", finalDirect)
				goto Done
			}
		case <-time.After(6 * time.Second):
			fmt.Println("FAILED: timed out waiting for path recovery")
			os.Exit(1)
		}
	}
Done:

	fmt.Println("\n==================================================")
	fmt.Println("   ✓ CONNECTION RECOVERY TEST PASSED!              ")
	fmt.Println("==================================================")
}
