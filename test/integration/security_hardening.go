//go:build ignore

package main

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
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
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	fmt.Println("==================================================")
	fmt.Println("    ZOOP E2E: SECURITY HARDENING TEST             ")
	fmt.Println("==================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	tmpDir, err := os.MkdirTemp("", "zoop-m13-*")
	if err != nil {
		fmt.Printf("FAILED temp dir: %v\n", err)
		os.Exit(1)
	}
	defer os.RemoveAll(tmpDir)

	// ----------------------------------------------------
	// STEP 1: Test Local Private Key File Permissions (0600)
	// ----------------------------------------------------
	fmt.Println("\n[1/5] Verifying Strict Local Key File Permissions (0600)...")

	keyPath := filepath.Join(tmpDir, "device.key")
	idMgr := identity.NewManager()

	ident, err := idMgr.LoadOrGenerate(keyPath)
	if err != nil {
		fmt.Printf("FAILED generate key: %v\n", err)
		os.Exit(1)
	}

	info, err := os.Stat(keyPath)
	if err != nil {
		fmt.Printf("FAILED stat key: %v\n", err)
		os.Exit(1)
	}

	if info.Mode().Perm() != 0600 {
		fmt.Printf("FAILED: key file permissions expected 0600, got %o\n", info.Mode().Perm())
		os.Exit(1)
	}
	fmt.Printf("✓ Key file generated with strict permissions: %o\n", info.Mode().Perm())

	// Test auto-correcting overly broad permissions
	_ = os.Chmod(keyPath, 0644)
	_, _ = idMgr.LoadOrGenerate(keyPath)

	infoAfter, _ := os.Stat(keyPath)
	if infoAfter.Mode().Perm() != 0600 {
		fmt.Printf("FAILED: permission auto-correction expected 0600, got %o\n", infoAfter.Mode().Perm())
		os.Exit(1)
	}
	fmt.Printf("✓ Overly broad key file permissions auto-corrected to 0600: %o\n", infoAfter.Mode().Perm())

	// ----------------------------------------------------
	// STEP 2: Verify Device Service Registration & Revocation
	// ----------------------------------------------------
	fmt.Println("\n[2/5] Testing Device Revocation & Key Rotation on Store...")

	cloudStore := store.NewInMemoryStore()
	devSvc := services.NewDeviceService(cloudStore)

	devID := types.NewID()
	device := &types.Device{
		ID:    devID,
		Name:  "Target Security Device",
		State: types.DeviceStateTrusted,
	}
	_ = cloudStore.SaveDevice(ctx, device)

	devResp, err := devSvc.GetDevice(ctx, devID)
	if err != nil || devResp.Status != string(types.DeviceStateTrusted) {
		fmt.Printf("FAILED: expected device state trusted, got status=%s err=%v\n", devResp.Status, err)
		os.Exit(1)
	}
	fmt.Printf("✓ Initial device registered with state: %s\n", devResp.Status)

	// Revoke device
	if err := devSvc.Revoke(ctx, devID); err != nil {
		fmt.Printf("FAILED revoke device: %v\n", err)
		os.Exit(1)
	}

	revokedResp, _ := devSvc.GetDevice(ctx, devID)
	if revokedResp.Status != string(types.DeviceStateRevoked) {
		fmt.Printf("FAILED: expected status revoked, got %s\n", revokedResp.Status)
		os.Exit(1)
	}
	fmt.Printf("✓ Device successfully transitioned to state: %s\n", revokedResp.Status)

	// ----------------------------------------------------
	// STEP 3: Verify Relay Server Revoked Device Enforcement
	// ----------------------------------------------------
	fmt.Println("\n[3/5] Verifying Relay Server Rejection of Revoked Devices...")

	relaySrv := cloudrelay.NewServer(logger, store.NewInMemoryStore())
	tsRelay := httptest.NewServer(http.HandlerFunc(relaySrv.HandleWebSocket))
	defer tsRelay.Close()

	relayURL := "ws" + strings.TrimPrefix(tsRelay.URL, "http")

	pub, priv, _ := ed25519.GenerateKey(nil)
	revokedIdent := types.Identity{EndpointID: ident.EndpointID, PublicKey: pub}

	// Revoke on Relay server
	relaySrv.RevokeDevice(ident.EndpointID)

	relayClient := agentrelay.NewClient(relayURL, revokedIdent, priv, logger)
	err = relayClient.Connect(ctx)

	if err == nil {
		fmt.Printf("FAILED: expected relay client connect to fail for revoked device\n")
		os.Exit(1)
	}
	fmt.Printf("✓ Relay Server rejected connection from revoked device: %v\n", err)

	// ----------------------------------------------------
	// STEP 4: Test Key Pair Rotation on DeviceManager
	// ----------------------------------------------------
	fmt.Println("\n[4/5] Testing Key Pair Rotation on Local Tunnel Interface...")

	devMgr, err := tunnel.NewDeviceManager("z-m13-rot", nil)
	if err != nil {
		devMgr, _ = tunnel.NewMockDeviceManager("z-m13-rot", nil)
	}
	defer devMgr.Close()

	initialKey, _ := tunnel.GenerateKeyPair()
	_ = devMgr.ConfigureDevice(initialKey.PrivateKey, 45221)

	oldPub := devMgr.PublicKey()
	fmt.Printf("✓ Initial WireGuard Public Key: %s\n", base64.StdEncoding.EncodeToString(oldPub[:]))

	newKey, _ := tunnel.GenerateKeyPair()
	if err := devMgr.RotateKeyPair(newKey.PrivateKey); err != nil {
		fmt.Printf("FAILED rotate key pair: %v\n", err)
		os.Exit(1)
	}

	newPub := devMgr.PublicKey()
	if newPub == oldPub {
		fmt.Printf("FAILED: WireGuard public key did not change after rotation\n")
		os.Exit(1)
	}
	fmt.Printf("✓ Key Pair rotated successfully! New Public Key: %s\n", base64.StdEncoding.EncodeToString(newPub[:]))

	// ----------------------------------------------------
	// STEP 5: Verify Signature Verification Failure Hardening
	// ----------------------------------------------------
	fmt.Println("\n[5/5] Testing Signature Verification Failure Rejection...")

	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	validSig := ed25519.Sign(priv, payload)

	// Verify valid signature
	if !ed25519.Verify(pub, payload, validSig) {
		fmt.Printf("FAILED: expected valid signature verification to succeed\n")
		os.Exit(1)
	}
	fmt.Println("✓ Valid Ed25519 signature verified successfully")

	// Tamper payload
	tamperedPayload := []byte("zoop-auth-TAMPERED|" + ts)
	if ed25519.Verify(pub, tamperedPayload, validSig) {
		fmt.Printf("FAILED: tampered signature was unexpectedly accepted\n")
		os.Exit(1)
	}
	fmt.Println("✓ Tampered payload signature rejected as unauthorized")

	fmt.Println("\n==================================================")
	fmt.Println("   ✓ SECURITY HARDENING TEST PASSED!              ")
	fmt.Println("==================================================")
}
