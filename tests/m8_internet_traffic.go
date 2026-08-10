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
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/identity"
	"github.com/zoop-internet/zoop/packages/cloud/api"
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
	fmt.Println("=== Zoop Milestone 8: Real Internet Traffic & Provider NAT Test (Docker) ===")

	defer func() {
		fmt.Println("\nCleaning up containers...")
		exec.Command("docker", "rm", "-f", "zoop-cloud", "zoop-provider", "zoop-recipient", "zoop-target").Run()
		exec.Command("docker", "network", "rm", "zoop-test-net").Run()
	}()

	cwd, _ := os.Getwd()
	testDataDir := filepath.Join(cwd, "test-data")

	os.RemoveAll(testDataDir)
	os.MkdirAll(filepath.Join(testDataDir, "provider"), 0755)
	os.MkdirAll(filepath.Join(testDataDir, "recipient"), 0755)
	os.MkdirAll(filepath.Join(testDataDir, "target"), 0755)

	// Create test payload file for target web server
	os.WriteFile(filepath.Join(testDataDir, "target", "success.txt"), []byte("ZOOP_NAT_FORWARDING_SUCCESS\n"), 0644)

	fmt.Println("Building Docker image...")
	buildCmd := exec.Command("docker", "build", "--network", "host", "-t", "zoop-test", ".")
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		panic(fmt.Errorf("failed to build docker image: %w", err))
	}

	exec.Command("docker", "network", "create", "zoop-test-net").Run()

	// 1. Start Cloud
	fmt.Println("[1] Starting Zoop Cloud...")
	cloudCmd := exec.Command("docker", "run", "-d", "--name", "zoop-cloud", "--network", "zoop-test-net", "-p", "8080:8080", "zoop-test", "zoop-cloud")
	if out, err := cloudCmd.CombinedOutput(); err != nil {
		panic(fmt.Errorf("failed to start cloud container: %v\n%s", err, string(out)))
	}
	time.Sleep(2 * time.Second)

	// 2. Start Provider
	fmt.Println("[2] Starting Zoop Agent (Provider) on zoop0 (API 9090)...")
	provCmd := exec.Command("docker", "run", "-d", "--name", "zoop-provider", "--network", "zoop-test-net", "--cap-add=NET_ADMIN", "--device=/dev/net/tun", "-e", "ZOOP_CONTROL_PLANE_URL=http://zoop-cloud:8080", "-e", "ZOOP_LOCAL_TEST=zoop-provider", "-e", "ZOOP_WAN_IF=eth0", "-v", testDataDir+":/data", "zoop-test", "zoop-agent", "-config-dir=/data/provider", "-tun=zoop0", "-api-port=9090")
	if out, err := provCmd.CombinedOutput(); err != nil {
		panic(fmt.Errorf("failed to start provider container: %v\n%s", err, string(out)))
	}
	time.Sleep(3 * time.Second)

	// 3. Start Recipient
	fmt.Println("[3] Starting Zoop Agent (Recipient) on zoop1 (API 9091)...")
	recCmd := exec.Command("docker", "run", "-d", "--name", "zoop-recipient", "--network", "zoop-test-net", "--cap-add=NET_ADMIN", "--device=/dev/net/tun", "-e", "ZOOP_CONTROL_PLANE_URL=http://zoop-cloud:8080", "-e", "ZOOP_LOCAL_TEST=zoop-recipient", "-v", testDataDir+":/data", "zoop-test", "zoop-agent", "-config-dir=/data/recipient", "-tun=zoop1", "-api-port=9091")
	if out, err := recCmd.CombinedOutput(); err != nil {
		panic(fmt.Errorf("failed to start recipient container: %v\n%s", err, string(out)))
	}
	time.Sleep(3 * time.Second)

	// 4. Start Target Web Server (simulating external WAN Internet site at 1.2.3.4)
	fmt.Println("[4] Starting Simulated WAN Target Web Server (zoop-target)...")
	targetCmd := exec.Command("docker", "run", "-d", "--name", "zoop-target", "--network", "zoop-test-net", "--cap-add=NET_ADMIN", "-v", testDataDir+"/target:/data", "zoop-test", "python3", "-m", "http.server", "8085", "--bind", "0.0.0.0", "--directory", "/data")
	if out, err := targetCmd.CombinedOutput(); err != nil {
		panic(fmt.Errorf("failed to start target container: %v\n%s", err, string(out)))
	}
	time.Sleep(2 * time.Second)

	// Get target container IP address on test network
	targetIPOut, _ := exec.Command("docker", "inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", "zoop-target").Output()
	targetContainerIP := strings.TrimSpace(string(targetIPOut))

	// Assign simulated external internet IP 1.2.3.4/32 to eth0 on target container
	exec.Command("docker", "exec", "zoop-target", "ip", "addr", "add", "1.2.3.4/32", "dev", "eth0").Run()
	targetIP := "1.2.3.4"
	fmt.Printf("Simulated WAN Target IP: %s (via %s)\n", targetIP, targetContainerIP)

	// Configure route on Provider so it forwards packets for 1.2.3.4 to target container
	exec.Command("docker", "exec", "zoop-provider", "ip", "route", "add", "1.2.3.4/32", "via", targetContainerIP, "dev", "eth0").Run()

	// Verify provider can reach target directly
	fmt.Println("Testing direct connectivity from Provider to Simulated WAN Target (1.2.3.4:8085)...")
	provDirectCmd := exec.Command("docker", "exec", "zoop-provider", "curl", "--fail", "--max-time", "3", "http://1.2.3.4:8085/success.txt")
	if out, err := provDirectCmd.CombinedOutput(); err != nil {
		panic(fmt.Errorf("provider direct curl to 1.2.3.4 failed: %v\n%s", err, string(out)))
	} else {
		fmt.Printf("Provider direct curl OK: %s\n", string(out))
	}

	// 5. Load Identities and Create Share
	fmt.Println("[5] Creating Share (Provider -> Recipient)...")
	provIdent, provPriv, err := loadIdentity(filepath.Join(testDataDir, "provider", "identity.key"))
	if err != nil {
		panic(fmt.Errorf("failed to load provider identity: %v", err))
	}
	
	recIdent, _, err := loadIdentity(filepath.Join(testDataDir, "recipient", "identity.key"))
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
		panic(fmt.Errorf("failed to create share: %v", lastErr))
	}
	defer resp.Body.Close()
	fmt.Println("Share created successfully.")

	// 6. Connect
	fmt.Println("[6] Initiating Connection from Recipient (CLI)...")
	connectCmd := exec.Command("docker", "exec", "zoop-recipient", "zoop-agent", "-config-dir=/data/recipient", "-api-port=9091", "-connect="+provIdent.EndpointID.String())
	connOut, err := connectCmd.CombinedOutput()
	if err != nil {
		panic(fmt.Errorf("failed to initiate connection: %v\n%s", err, string(connOut)))
	}
	fmt.Println("Connection request submitted. Waiting for tunnels to establish...")
	time.Sleep(5 * time.Second)

	fmt.Println("\n=== Test Environment Ready ===")
	fmt.Println("Provider Overlay IP:  100.64.0.1 (Interface: zoop0)")
	fmt.Println("Recipient Overlay IP: 100.64.0.2 (Interface: zoop1)")
	fmt.Printf("WAN Target IP:         %s\n", targetIP)

	// 7. Route WAN Target IP over zoop1 on Recipient
	fmt.Println("\n[7] Configuring Recipient WAN Target Route over zoop1...")
	exec.Command("docker", "exec", "zoop-recipient", "ip", "route", "add", targetIP+"/32", "dev", "zoop1").Run()

	fmt.Println("\n[8] Automating Real WAN Traffic Validation via Provider NAT...")

	var lastOutput []byte
	success := false
	targetURL := fmt.Sprintf("http://%s:8085/success.txt", targetIP)
	for attempt := 1; attempt <= 5; attempt++ {
		// Attempt HTTP request from recipient over zoop1 tunnel to external WAN target
		curlCmd := exec.Command("docker", "exec", "zoop-recipient", "curl", "--interface", "zoop1", "--fail", "--max-time", "5", targetURL)
		lastOutput, lastErr = curlCmd.CombinedOutput()
		if lastErr == nil && bytes.Contains(lastOutput, []byte("ZOOP_NAT_FORWARDING_SUCCESS")) {
			fmt.Println("	Success! WAN Internet traffic routed through Provider NAT and WireGuard tunnel.")
			success = true
			break
		}
		fmt.Printf("Attempt %d/5 failed, retrying in 1s...\n", attempt)
		time.Sleep(1 * time.Second)
	}

	if !success {
		fmt.Println("=== DUMPING LOGS ON FAILURE ===")
		for _, name := range []string{"zoop-cloud", "zoop-provider", "zoop-recipient", "zoop-target"} {
			fmt.Printf("\n--- %s LOGS ---\n", name)
			logCmd := exec.Command("docker", "logs", name)
			logCmd.Stdout = os.Stdout
			logCmd.Stderr = os.Stderr
			logCmd.Run()

			if name != "zoop-cloud" && name != "zoop-target" {
				fmt.Printf("\n--- %s IP ADDR ---\n", name)
				ipCmd := exec.Command("docker", "exec", name, "ip", "addr")
				ipCmd.Stdout = os.Stdout
				ipCmd.Run()

				fmt.Printf("\n--- %s IP ROUTE ---\n", name)
				routeCmd := exec.Command("docker", "exec", name, "ip", "route")
				routeCmd.Stdout = os.Stdout
				routeCmd.Run()
			}
			if name == "zoop-provider" {
				fmt.Printf("\n--- zoop-provider IPTABLES NAT ---\n")
				natCmd := exec.Command("docker", "exec", name, "iptables", "-t", "nat", "-L", "-n", "-v")
				natCmd.Stdout = os.Stdout
				natCmd.Run()

				fmt.Printf("\n--- zoop-provider IPTABLES FORWARD ---\n")
				fwdCmd := exec.Command("docker", "exec", name, "iptables", "-L", "FORWARD", "-n", "-v")
				fwdCmd.Stdout = os.Stdout
				fwdCmd.Run()
			}
		}
		panic(fmt.Sprintf("[FAIL] Real Internet Traffic NAT Test Failed: %v\n\tOutput: %s", lastErr, string(lastOutput)))
	}

	fmt.Printf("\n[SUCCESS] Milestone 8 Verified: Recipient traffic to %s was successfully routed over Zoop tunnel & Provider NAT!\nOutput: %s\n", targetIP, string(lastOutput))
}
