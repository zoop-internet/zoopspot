package main

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func main() {
	fmt.Println("=== Zoop Milestone 7: Real Packet Forwarding Test ===")

	os.RemoveAll("test-data")
	os.MkdirAll("test-data/provider", 0755)
	os.MkdirAll("test-data/recipient", 0755)

	// 1. Start Cloud
	fmt.Println("[1] Starting Zoop Cloud...")
	cloudCmd := exec.Command("./bin/zoop-cloud")
	cloudOut, _ := os.Create("test-data/cloud.log")
	cloudCmd.Stdout = cloudOut
	cloudCmd.Stderr = cloudOut
	if err := cloudCmd.Start(); err != nil {
		panic(err)
	}
	defer cloudCmd.Process.Kill()
	time.Sleep(2 * time.Second)

	// 2. Start Provider
	fmt.Println("[2] Starting Zoop Agent (Provider) on zoop0 (API 9090)...")
	providerCmd := exec.Command("./bin/zoop-agent", "-config-dir=./test-data/provider", "-tun=zoop0", "-api-port=9090")
	provOut, _ := os.Create("test-data/provider.log")
	providerCmd.Stdout = provOut
	providerCmd.Stderr = provOut
	if err := providerCmd.Start(); err != nil {
		panic(err)
	}
	defer providerCmd.Process.Kill()
	time.Sleep(3 * time.Second)

	// 3. Start Recipient
	fmt.Println("[3] Starting Zoop Agent (Recipient) on zoop1 (API 9091)...")
	recCmd := exec.Command("./bin/zoop-agent", "-config-dir=./test-data/recipient", "-tun=zoop1", "-api-port=9091")
	recOut, _ := os.Create("test-data/recipient.log")
	recCmd.Stdout = recOut
	recCmd.Stderr = recOut
	if err := recCmd.Start(); err != nil {
		panic(err)
	}
	defer recCmd.Process.Kill()
	time.Sleep(3 * time.Second)

	// 4. Create Share
	fmt.Println("[4] Creating Share (Provider -> Recipient)...")
	
	// Load Identities
	provIdent, provPriv, err := loadIdentity("test-data/provider/identity.key")
	if err != nil {
		panic(fmt.Errorf("failed to load provider identity: %v", err))
	}
	
	recIdent, _, err := loadIdentity("test-data/recipient/identity.key")
	if err != nil {
		panic(fmt.Errorf("failed to load recipient identity: %v", err))
	}

	fmt.Printf("Provider ID: %s\n", provIdent.EndpointID)
	fmt.Printf("Recipient ID: %s\n", recIdent.EndpointID)
	
	reqBody := api.CreateShareRequest{
		ProviderID:  provIdent.EndpointID,
		RecipientID: recIdent.EndpointID,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "http://localhost:8080/v1/shares", bytes.NewReader(bodyBytes))
	
	// Sign request
	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(provPriv, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)
	req.Header.Set("X-Zoop-Identity", provIdent.EndpointID.String())
	req.Header.Set("X-Zoop-Signature", sigStr)
	req.Header.Set("X-Zoop-Timestamp", ts)
	
	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusCreated {
		panic(fmt.Errorf("failed to create share: %v", err))
	}
	fmt.Println("Share created successfully.")

	// 5. Connect
	fmt.Println("[5] Initiating Connection from Recipient (CLI)...")
	connectCmd := exec.Command("./bin/zoop-agent", "-api-port=9091", "-connect="+provIdent.EndpointID.String())
	connOut, _ := connectCmd.CombinedOutput()
	if connectCmd.ProcessState != nil && !connectCmd.ProcessState.Success() {
		panic(fmt.Errorf("failed to initiate connection: %s", string(connOut)))
	}
	fmt.Println("Connection request submitted. Waiting for tunnels to establish...")
	time.Sleep(5 * time.Second)

	fmt.Println("\n=== Test Environment Ready ===")
	fmt.Println("Provider Overlay IP:  100.64.0.1 (Interface: zoop0)")
	fmt.Println("Recipient Overlay IP: 100.64.0.2 (Interface: zoop1)")
	fmt.Println("\nYou can now manually verify traffic (Requires BypassSandbox):")
	fmt.Println("1. ping -c 3 100.64.0.1 -I zoop1")
	fmt.Println("2. python3 -m http.server 8000 --bind 100.64.0.1 (then curl from zoop1)")
	fmt.Println("Press Ctrl+C to terminate the test environment.")
	
	select {}
}

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
