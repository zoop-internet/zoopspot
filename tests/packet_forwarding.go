//go:build ignore

package main

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
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
	fmt.Println("=== Zoop E2E: Real Packet Forwarding Test (Docker) ===")

	defer func() {
		fmt.Println("\nCleaning up containers...")
		exec.Command("docker", "rm", "-f", "zoop-cloud", "zoop-provider", "zoop-recipient").Run()
		exec.Command("docker", "network", "rm", "zoop-test-net").Run()
	}()

	cwd, _ := os.Getwd()
	testDataDir := filepath.Join(cwd, "test-data")

	os.RemoveAll(testDataDir)
	os.MkdirAll(filepath.Join(testDataDir, "provider"), 0755)
	os.MkdirAll(filepath.Join(testDataDir, "recipient"), 0755)

	fmt.Println("Building Docker image...")
	buildCmd := exec.Command("docker", "build", "--network", "host", "-t", "zoop-test", ".")
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		log.Fatal(fmt.Errorf("failed to build docker image: %w", err))
	}

	exec.Command("docker", "network", "create", "zoop-test-net").Run()

	// 1. Start Cloud
	fmt.Println("[1] Starting Zoop Cloud...")
	cloudCmd := exec.Command("docker", "run", "-d", "--name", "zoop-cloud", "--network", "zoop-test-net", "-p", "8080:8080", "zoop-test", "zoop-cloud")
	if out, err := cloudCmd.CombinedOutput(); err != nil {
		log.Fatal(fmt.Errorf("failed to start cloud container: %v\n%s", err, string(out)))
	}
	time.Sleep(2 * time.Second)

	// 2. Start Provider
	fmt.Println("[2] Starting Zoop Agent (Provider) on zoop0 (API 9090)...")
	provCmd := exec.Command("docker", "run", "-d", "--name", "zoop-provider", "--network", "zoop-test-net", "--cap-add=NET_ADMIN", "--device=/dev/net/tun", "-e", "ZOOP_CONTROL_PLANE_URL=http://zoop-cloud:8080", "-e", "ZOOP_LOCAL_TEST=zoop-provider", "-v", testDataDir+":/data", "zoop-test", "zoopd", "-config-dir=/data/provider", "-tun=zoop0", "-api-port=9090")
	if out, err := provCmd.CombinedOutput(); err != nil {
		log.Fatal(fmt.Errorf("failed to start provider container: %v\n%s", err, string(out)))
	}
	time.Sleep(3 * time.Second)

	// 3. Start Recipient
	fmt.Println("[3] Starting Zoop Agent (Recipient) on zoop1 (API 9091)...")
	recCmd := exec.Command("docker", "run", "-d", "--name", "zoop-recipient", "--network", "zoop-test-net", "--cap-add=NET_ADMIN", "--device=/dev/net/tun", "-e", "ZOOP_CONTROL_PLANE_URL=http://zoop-cloud:8080", "-e", "ZOOP_LOCAL_TEST=zoop-recipient", "-v", testDataDir+":/data", "zoop-test", "zoopd", "-config-dir=/data/recipient", "-tun=zoop1", "-api-port=9091")
	if out, err := recCmd.CombinedOutput(); err != nil {
		log.Fatal(fmt.Errorf("failed to start recipient container: %v\n%s", err, string(out)))
	}
	time.Sleep(3 * time.Second)

	// 4. Create Share
	fmt.Println("[4] Creating Share (Provider -> Recipient)...")
	
	// Load Identities
	provIdent, provPriv, err := loadIdentity(filepath.Join(testDataDir, "provider", "identity.key"))
	if err != nil {
		log.Fatal(fmt.Errorf("failed to load provider identity: %v", err))
	}
	
	recIdent, _, err := loadIdentity(filepath.Join(testDataDir, "recipient", "identity.key"))
	if err != nil {
		log.Fatal(fmt.Errorf("failed to load recipient identity: %v", err))
	}

	fmt.Printf("Provider ID: %s\n", provIdent.EndpointID)
	fmt.Printf("Recipient ID: %s\n", recIdent.EndpointID)
	
	reqBody := api.CreateShareRequest{
		ProviderID:  provIdent.EndpointID,
		RecipientID: recIdent.EndpointID,
	}
	bodyBytes, _ := json.Marshal(reqBody)
	// Sign request
	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(provPriv, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	var resp *http.Response
	var lastErr error
	for attempt := 1; attempt <= 5; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "http://127.0.0.1:8080/v1/shares", bytes.NewReader(bodyBytes))
		req.Header.Set("X-Zoop-Identity", provIdent.EndpointID.String())
		req.Header.Set("X-Zoop-Signature", sigStr)
		req.Header.Set("X-Zoop-Timestamp", ts)

		resp, err = http.DefaultClient.Do(req)
		cancel()
		if err == nil && resp.StatusCode == http.StatusCreated {
			lastErr = nil
			break
		}
		if err != nil {
			lastErr = err
		} else {
			respBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			lastErr = fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBytes))
		}
		time.Sleep(1 * time.Second)
	}

	if lastErr != nil {
		fmt.Println("\n--- zoop-cloud LOGS ON SHARE FAIL ---")
		logCmd := exec.Command("docker", "logs", "zoop-cloud")
		logCmd.Stdout = os.Stdout
		logCmd.Stderr = os.Stderr
		logCmd.Run()
		log.Fatal(fmt.Errorf("failed to create share: %v", lastErr))
	}
	defer resp.Body.Close()
	fmt.Println("Share created successfully.")

	// 5. Connect
	fmt.Println("[5] Initiating Connection from Recipient (CLI)...")
	connectCmd := exec.Command("docker", "exec", "zoop-recipient", "zoop", "connect", provIdent.EndpointID.String())
	connOut, err := connectCmd.CombinedOutput()
	if err != nil {
		log.Fatal(fmt.Errorf("failed to initiate connection: %v\n%s", err, string(connOut)))
	}
	fmt.Println("Connection request submitted. Waiting for tunnels to establish...")
	time.Sleep(5 * time.Second)

	fmt.Println("\n=== Test Environment Ready ===")
	fmt.Println("Provider Overlay IP:  100.64.0.1 (Interface: zoop0)")
	fmt.Println("Recipient Overlay IP: 100.64.0.2 (Interface: zoop1)")

	fmt.Println("\n[6] Automating Traffic Validation...")
	
	// Create success file and start python HTTP server in provider
	exec.Command("docker", "exec", "zoop-provider", "sh", "-c", "echo 'ZOOP_TUNNEL_SUCCESS' > /data/success.txt").Run()
	httpCmd := exec.Command("docker", "exec", "-d", "zoop-provider", "python3", "-m", "http.server", "8000", "--bind", "0.0.0.0", "--directory", "/data")
	if err := httpCmd.Run(); err != nil {
		log.Fatal(fmt.Errorf("failed to start python http server: %v", err))
	}
	time.Sleep(2 * time.Second) // wait for server to start

	// Use curl in recipient container to fetch from Provider over the tunnel
	var lastOutput []byte
	lastErr = nil
	success := false
	for attempt := 1; attempt <= 5; attempt++ {
		curlCmd := exec.Command("docker", "exec", "zoop-recipient", "curl", "--interface", "zoop1", "--fail", "--max-time", "3", "http://100.64.0.1:8000/success.txt")
		lastOutput, lastErr = curlCmd.CombinedOutput()
		if lastErr == nil && bytes.Contains(lastOutput, []byte("ZOOP_TUNNEL_SUCCESS")) {
			fmt.Println("	Success! Traffic is flowing over the WireGuard tunnel.")
			success = true
			break
		}
		fmt.Printf("Attempt %d/5 failed, retrying in 1s...\n", attempt)
		time.Sleep(1 * time.Second)
	}

	if !success {
		fmt.Println("=== DUMPING LOGS ON FAILURE ===")
		for _, name := range []string{"zoop-cloud", "zoop-provider", "zoop-recipient"} {
			fmt.Printf("\n--- %s LOGS ---\n", name)
			logCmd := exec.Command("docker", "logs", name)
			logCmd.Stdout = os.Stdout
			logCmd.Stderr = os.Stderr
			logCmd.Run()

			if name != "zoop-cloud" {
				fmt.Printf("\n--- %s IP ADDR ---\n", name)
				ipCmd := exec.Command("docker", "exec", name, "ip", "addr")
				ipCmd.Stdout = os.Stdout
				ipCmd.Run()

				fmt.Printf("\n--- %s IP ROUTE ---\n", name)
				routeCmd := exec.Command("docker", "exec", name, "ip", "route")
				routeCmd.Stdout = os.Stdout
				routeCmd.Run()

				fmt.Printf("\n--- %s PROCESSES ---\n", name)
				psCmd := exec.Command("docker", "exec", name, "ps", "aux")
				psCmd.Stdout = os.Stdout
				psCmd.Run()
			}
		}
		log.Fatal(fmt.Sprintf("[FAIL] Packet Forwarding Test Failed: %v\n\tOutput: %s", lastErr, string(lastOutput)))
	}

	fmt.Printf("\n[SUCCESS] Successfully sent HTTP request over Zoop tunnel!\nOutput: %s\n", string(lastOutput))
	fmt.Println("\nAll Packet Forwarding Requirements Validated.")
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
