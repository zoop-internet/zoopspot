package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/health"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/core/config"
)

const socketPath = "/var/run/zoopd.sock"

type DaemonCommand struct {
	Action string `json:"action"`
	PeerID string `json:"peer_id,omitempty"`
}

type DaemonResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	action := os.Args[1]

	// Map user-friendly aliases to daemon actions
	daemonAction := action
	switch action {
	case "peers":
		daemonAction = "get_peers"
	case "telemetry":
		daemonAction = "get_telemetry"
	case "doctor":
		cfg := config.LoadConfig()
		stMgr := state.NewManager()
		stMgr.Set(state.StateRunning)
		checker := health.NewChecker(stMgr, "zoop0", cfg.ControlPlaneURL, cfg.STUNServer)
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		report := checker.RunDiagnostics(ctx)
		report.PrintReport()
		if !report.Healthy {
			os.Exit(1)
		}
		return
	case "help", "--help", "-h":
		printUsage()
		return
	}

	peerID := ""
	if len(os.Args) >= 3 {
		peerID = os.Args[2]
	}

	conn, err := net.Dial("unix", socketPath)
	if err != nil {
		fmt.Printf("Error connecting to zoopd daemon at %s: %v\nIs zoopd running?\n", socketPath, err)
		os.Exit(1)
	}
	defer conn.Close()

	cmd := DaemonCommand{Action: daemonAction, PeerID: peerID}
	if err := json.NewEncoder(conn).Encode(cmd); err != nil {
		fmt.Printf("Error sending command to daemon: %v\n", err)
		os.Exit(1)
	}

	// For subscribe, we need to continuously read from the socket
	if daemonAction == "subscribe" {
		fmt.Println("Subscribed to daemon state updates. Press Ctrl+C to exit.")
		decoder := json.NewDecoder(conn)
		for {
			var update map[string]interface{}
			if err := decoder.Decode(&update); err != nil {
				fmt.Printf("Subscription closed: %v\n", err)
				break
			}
			b, _ := json.MarshalIndent(update, "", "  ")
			fmt.Println(string(b))
		}
		return
	}

	var resp DaemonResponse
	if err := json.NewDecoder(conn).Decode(&resp); err != nil {
		fmt.Printf("Error reading response from daemon: %v\n", err)
		os.Exit(1)
	}

	if resp.Success {
		fmt.Printf("✓ %s\n", resp.Message)
		if resp.Data != nil {
			b, _ := json.MarshalIndent(resp.Data, "", "  ")
			fmt.Println(string(b))
		}
	} else {
		fmt.Printf("FAILED: %s\n", resp.Message)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Zoop Internet CLI")
	fmt.Println("Usage: zoop <command> [arguments]")
	fmt.Println("")
	fmt.Println("Commands:")
	fmt.Println("  status             Get running daemon status and WireGuard port")
	fmt.Println("  peers              List all available devices in your Zoop network")
	fmt.Println("  connect <peer_id>  Request a direct connection to a peer")
	fmt.Println("  disconnect         Disconnect current active tunnel")
	fmt.Println("  telemetry          View network telemetry (latency, throughput)")
	fmt.Println("  subscribe          Listen for real-time state updates from the daemon")
	fmt.Println("  doctor             Run network and system diagnostics probe")
	fmt.Println("  stop               Stop the running zoopd daemon")
	fmt.Println("")
	fmt.Println("For daemon management (install/start/stop service), use 'zoopd service <command>'.")
}
