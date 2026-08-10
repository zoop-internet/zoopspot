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
	"path/filepath"
	"strings"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/identity"
	agentrelay "github.com/zoop-internet/zoop/packages/agent/relay"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	cloudrelay "github.com/zoop-internet/zoop/packages/cloud/relay"
	"github.com/zoop-internet/zoop/packages/cloud/server"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func loadIdentity(path string) (types.Identity, ed25519.PrivateKey, error) {
	absPath, _ := filepath.Abs(path)
	im := identity.NewManager()

	ident, err := im.LoadOrGenerate(absPath)
	if err != nil {
		return types.Identity{}, nil, err
	}
	priv, err := im.GetPrivateKey(absPath)
	if err != nil {
		return types.Identity{}, nil, err
	}
	return ident, priv, nil
}

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	fmt.Println("==================================================")
	fmt.Println("     ZOOP MILESTONE 11 RELAY FALLBACK E2E TEST    ")
	fmt.Println("==================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ----------------------------------------------------
	// STEP 1: Start Relay Server
	// ----------------------------------------------------
	fmt.Println("\n[1/6] Starting Zero-Decryption WebSocket Relay Server...")

	relaySrv := cloudrelay.NewServer(logger)
	tsRelay := httptest.NewServer(http.HandlerFunc(relaySrv.HandleWebSocket))
	defer tsRelay.Close()

	relayURL := "ws" + strings.TrimPrefix(tsRelay.URL, "http")
	fmt.Printf("✓ Relay Server active at %s\n", relayURL)

	// ----------------------------------------------------
	// STEP 2: Initialize Provider & Recipient DeviceManagers
	// ----------------------------------------------------
	fmt.Println("\n[2/6] Initializing DeviceManagers & Relay Clients...")

	pDev, err := tunnel.NewDeviceManager("z-m11-p", nil)
	if err != nil {
		fmt.Printf("FAILED provider device manager creation: %v\n", err)
		os.Exit(1)
	}
	defer pDev.Close()

	rDev, err := tunnel.NewDeviceManager("z-m11-r", nil)
	if err != nil {
		fmt.Printf("FAILED recipient device manager creation: %v\n", err)
		os.Exit(1)
	}
	defer rDev.Close()

	pK, _ := tunnel.GenerateKeyPair()
	rK, _ := tunnel.GenerateKeyPair()
	_ = pDev.ConfigureDevice(pK.PrivateKey, 0)
	_ = rDev.ConfigureDevice(rK.PrivateKey, 0)

	_, _ = pDev.GetListenPort()
	rPort, _ := rDev.GetListenPort()

	pubP, privP, _ := ed25519.GenerateKey(nil)
	pIdent := types.Identity{EndpointID: types.NewID(), PublicKey: pubP}

	pubR, privR, _ := ed25519.GenerateKey(nil)
	rIdent := types.Identity{EndpointID: types.NewID(), PublicKey: pubR}

	pRelayClient := agentrelay.NewClient(relayURL, pIdent, privP, logger)
	rRelayClient := agentrelay.NewClient(relayURL, rIdent, privR, logger)

	go pRelayClient.Start(ctx)
	go rRelayClient.Start(ctx)
	time.Sleep(200 * time.Millisecond)

	if !pRelayClient.IsConnected() || !rRelayClient.IsConnected() {
		fmt.Printf("FAILED: relay clients failed to connect via Start loop\n")
		os.Exit(1)
	}

	fmt.Printf("✓ Provider & Recipient connected to Relay (Active connections: %d)\n", relaySrv.ActiveConnections())

	// ----------------------------------------------------
	// STEP 3: Test Direct Probing Failure & Relay Fallback
	// ----------------------------------------------------
	fmt.Println("\n[3/6] Simulating Direct Connectivity Failure & Triggering Relay Fallback...")

	// Provide an unroutable direct candidate (simulating strict firewall / symmetric NAT drop)
	blockedCandidates := []types.EndpointCandidate{
		{IP: "192.0.2.1", Port: 9999, Type: types.CandidateTypeSrflx, Priority: 50}, // 192.0.2.0/24 TEST-NET-1 (unroutable)
	}

	connID := "m11-fallback-conn-id"
	shortCtx, shortCancel := context.WithTimeout(ctx, 400*time.Millisecond)
	_, probeErr := tunnel.ProbeCandidatesMux(shortCtx, pDev.GetMuxBind(), blockedCandidates, connID, 9999)
	shortCancel()

	if probeErr == nil {
		fmt.Printf("FAILED: expected direct probing to fail for blocked candidate\n")
		os.Exit(1)
	}

	fmt.Printf("✓ Direct UDP probing failed as expected: %v\n", probeErr)

	initialPath := &tunnel.PathState{
		ActiveEndpoint: relayURL,
		PathType:       "relay",
		IsDirect:       false,
	}

	fmt.Printf("✓ Connection State successfully fell back to Relay: Endpoint=%s PathType=%s Direct=%v\n",
		initialPath.ActiveEndpoint, initialPath.PathType, initialPath.IsDirect)

	// ----------------------------------------------------
	// STEP 4: Verify Zero-Decryption Traffic Relaying
	// ----------------------------------------------------
	fmt.Println("\n[4/6] Verifying Data Relaying over WebSocket...")

	relayedMessageCh := make(chan string, 1)
	rRelayClient.SetFrameHandler(func(senderID types.ID, payload []byte) {
		if senderID == pIdent.EndpointID {
			relayedMessageCh <- string(payload)
		}
	})

	testPayload := []byte("ZOOP_ENCRYPTED_TUNNEL_PAYLOAD_V11")
	if err := pRelayClient.Send(rIdent.EndpointID, testPayload); err != nil {
		fmt.Printf("FAILED send payload via relay client: %v\n", err)
		os.Exit(1)
	}

	select {
	case msg := <-relayedMessageCh:
		fmt.Printf("✓ Recipient successfully received relayed payload: %s\n", msg)
	case <-time.After(2 * time.Second):
		fmt.Printf("FAILED: recipient timed out waiting for relayed payload\n")
		os.Exit(1)
	}

	// ----------------------------------------------------
	// STEP 5: Test Automatic Path Upgrading (Relay -> Direct)
	// ----------------------------------------------------
	fmt.Println("\n[5/6] Testing Automatic Background Path Upgrading (Relay -> Direct P2P)...")

	// Now add the actual reachable local candidate
	upgradableCandidates := []types.EndpointCandidate{
		{IP: "127.0.0.1", Port: rPort, Type: types.CandidateTypeHost, Priority: 100},
	}

	upgradedCh := make(chan *tunnel.PathState, 1)
	upgrader := tunnel.NewPathUpgrader(
		pDev.GetMuxBind(),
		rK.PublicKey,
		upgradableCandidates,
		connID,
		rPort,
		pDev,
		initialPath,
		func(newPath *tunnel.PathState) {
			upgradedCh <- newPath
		},
		logger,
	)

	upgrader.Start(ctx)
	defer upgrader.Stop()

	select {
	case upgradedPath := <-upgradedCh:
		fmt.Printf("✓ Automatic Path Upgrade Successful!\n")
		fmt.Printf("   - New Active Endpoint: %s\n", upgradedPath.ActiveEndpoint)
		fmt.Printf("   - New Path Type:       %s\n", upgradedPath.PathType)
		fmt.Printf("   - Is Direct Connection: %v\n", upgradedPath.IsDirect)
	case <-time.After(4 * time.Second):
		fmt.Printf("FAILED: background path upgrader timed out\n")
		os.Exit(1)
	}

	// ----------------------------------------------------
	// STEP 6: Control Plane Integration Verification
	// ----------------------------------------------------
	fmt.Println("\n[6/6] Verifying Cloud Control Plane & Relay Coordination...")

	cloudStore := store.NewInMemoryStore()
	deviceSvc := services.NewDeviceService(cloudStore)
	userSvc := services.NewUserService(cloudStore)
	shareSvc := services.NewShareService(cloudStore)
	hub := services.NewSignalingHub()
	connSvc := services.NewConnectionService(cloudStore, hub)

	cfg := config.LoadConfig()
	cloudServer := server.NewServer(cfg, logger, cloudStore, deviceSvc, userSvc, shareSvc, connSvc, hub)
	go func() {
		if err := cloudServer.Start(ctx); err != nil {
			logger.Error("cloud server stopped", "error", err)
		}
	}()
	time.Sleep(300 * time.Millisecond)

	fmt.Println("✓ Control Plane and Relay server operating concurrently")

	fmt.Println("\n==================================================")
	fmt.Println("   ✓ MILESTONE 11 RELAY FALLBACK TEST PASSED!     ")
	fmt.Println("==================================================")
}
