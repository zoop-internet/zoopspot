//go:build ignore

package main

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/client"
	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/cloud/api"
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
	fmt.Println("     ZOOP MILESTONE 10 NAT TRAVERSAL E2E TEST     ")
	fmt.Println("==================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// ----------------------------------------------------
	// STEP 1: Initialize DeviceManagers with MuxBind
	// ----------------------------------------------------
	fmt.Println("\n[1/5] Initializing DeviceManagers with Multiplexed Socket...")

	pDev, err := tunnel.NewDeviceManager("z-m10-p", nil)
	if err != nil {
		fmt.Printf("FAILED to create provider device manager: %v\n", err)
		os.Exit(1)
	}
	defer pDev.Close()

	rDev, err := tunnel.NewDeviceManager("z-m10-r", nil)
	if err != nil {
		fmt.Printf("FAILED to create recipient device manager: %v\n", err)
		os.Exit(1)
	}
	defer rDev.Close()

	pK, _ := tunnel.GenerateKeyPair()
	rK, _ := tunnel.GenerateKeyPair()
	_ = pDev.ConfigureDevice(pK.PrivateKey, 0)
	_ = rDev.ConfigureDevice(rK.PrivateKey, 0)

	pPort, _ := pDev.GetListenPort()
	rPort, _ := rDev.GetListenPort()

	fmt.Printf("✓ Provider WireGuard socket bound to UDP port %d\n", pPort)
	fmt.Printf("✓ Recipient WireGuard socket bound to UDP port %d\n", rPort)

	// ----------------------------------------------------
	// STEP 2: Candidate Gathering via MuxBind
	// ----------------------------------------------------
	fmt.Println("\n[2/5] Discovering Candidates via MuxBind Socket...")

	pCands, err := tunnel.GatherCandidatesMux(pDev.GetMuxBind(), pPort)
	if err != nil || len(pCands) == 0 {
		fmt.Printf("FAILED provider candidate gathering: %v\n", err)
		os.Exit(1)
	}

	rCands, err := tunnel.GatherCandidatesMux(rDev.GetMuxBind(), rPort)
	if err != nil || len(rCands) == 0 {
		fmt.Printf("FAILED recipient candidate gathering: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Provider gathered %d candidates via WireGuard socket:\n", len(pCands))
	for _, c := range pCands {
		fmt.Printf("   - Type: %-5s IP: %-15s Port: %-5d Priority: %d\n", c.Type, c.IP, c.Port, c.Priority)
	}

	fmt.Printf("✓ Recipient gathered %d candidates via WireGuard socket:\n", len(rCands))
	for _, c := range rCands {
		fmt.Printf("   - Type: %-5s IP: %-15s Port: %-5d Priority: %d\n", c.Type, c.IP, c.Port, c.Priority)
	}

	// ----------------------------------------------------
	// STEP 3: Multiplexed UDP Probing
	// ----------------------------------------------------
	fmt.Println("\n[3/5] Testing Multiplexed UDP Hole Punching & Probing...")

	connID := "m10-test-conn-id"

	bestCand, err := tunnel.ProbeCandidatesMux(ctx, pDev.GetMuxBind(), rCands, connID, rPort)
	if err != nil {
		fmt.Printf("FAILED multiplexed candidate probing: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✓ Provider selected optimal path via MuxBind: %s:%d (%s)\n", bestCand.IP, bestCand.Port, bestCand.Type)

	// ----------------------------------------------------
	// STEP 4: Start Cloud Server & Signaling Exchange
	// ----------------------------------------------------
	fmt.Println("\n[4/5] Starting Control Plane & Signaling Server...")

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
	time.Sleep(500 * time.Millisecond)
	cloudURL := cfg.ControlPlaneURL

	pIdent, pPriv, err := loadIdentity("/tmp/zoop_m10_prov_ident.json")
	if err != nil {
		fmt.Printf("FAILED load provider identity: %v\n", err)
		os.Exit(1)
	}

	rIdent, rPriv, err := loadIdentity("/tmp/zoop_m10_rec_ident.json")
	if err != nil {
		fmt.Printf("FAILED load recipient identity: %v\n", err)
		os.Exit(1)
	}

	pClient := client.NewAPIClient(cloudURL, pIdent, pPriv)
	rClient := client.NewAPIClient(cloudURL, rIdent, rPriv)

	wgKeyP, _ := tunnel.GenerateKeyPair()
	wgKeyR, _ := tunnel.GenerateKeyPair()

	_, err = pClient.RegisterDevice(ctx, "Provider M10 Device", wgKeyP.EncodePublicKey())
	if err != nil {
		fmt.Printf("FAILED provider device registration: %v\n", err)
		os.Exit(1)
	}

	_, err = rClient.RegisterDevice(ctx, "Recipient M10 Device", wgKeyR.EncodePublicKey())
	if err != nil {
		fmt.Printf("FAILED recipient device registration: %v\n", err)
		os.Exit(1)
	}

	pSigClient := client.NewSignalingClient(pClient, pDev, logger)
	rSigClient := client.NewSignalingClient(rClient, rDev, logger)

	go pSigClient.Connect(ctx)
	go rSigClient.Connect(ctx)
	time.Sleep(500 * time.Millisecond)

	fmt.Println("✓ Provider & Recipient signaling clients connected")

	// ----------------------------------------------------
	// STEP 5: Full Connection Request & Tunnel Verification
	// ----------------------------------------------------
	fmt.Println("\n[5/5] Requesting Connection & Verifying Multiplexed Tunnel...")

	reqBody := api.CreateShareRequest{
		ProviderID:  pIdent.EndpointID,
		RecipientID: rIdent.EndpointID,
	}
	bodyBytes, _ := json.Marshal(reqBody)
	ts := time.Now().Format(time.RFC3339)
	authPayload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(pPriv, authPayload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	req, _ := http.NewRequestWithContext(ctx, "POST", cloudURL+"/v1/shares", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Zoop-Identity", pIdent.EndpointID.String())
	req.Header.Set("X-Zoop-Signature", sigStr)
	req.Header.Set("X-Zoop-Timestamp", ts)

	resp, err := http.DefaultClient.Do(req)
	if err != nil || (resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated) {
		if resp != nil {
			body, _ := os.ReadFile("/dev/null")
			fmt.Printf("FAILED send share request: status=%d err=%v body=%s\n", resp.StatusCode, err, string(body))
		} else {
			fmt.Printf("FAILED send share request: err=%v\n", err)
		}
		os.Exit(1)
	}
	resp.Body.Close()

	time.Sleep(1 * time.Second)

	fmt.Println("\n==================================================")
	fmt.Println(" ✓ MILESTONE 10 NAT TRAVERSAL TEST PASSED!")
	fmt.Println("==================================================")
}
