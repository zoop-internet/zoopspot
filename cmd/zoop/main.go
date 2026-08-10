package main

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
)

const socketPath = "/var/run/zoopd.sock"

type DaemonCommand struct {
	Action string `json:"action"`
	PeerID string `json:"peer_id,omitempty"`
}

type DaemonResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	action := os.Args[1]
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

	cmd := DaemonCommand{Action: action, PeerID: peerID}
	if err := json.NewEncoder(conn).Encode(cmd); err != nil {
		fmt.Printf("Error sending command to daemon: %v\n", err)
		os.Exit(1)
	}

	var resp DaemonResponse
	if err := json.NewDecoder(conn).Decode(&resp); err != nil {
		fmt.Printf("Error reading response from daemon: %v\n", err)
		os.Exit(1)
	}

	if resp.Success {
		fmt.Printf("✓ %s\n", resp.Message)
	} else {
		fmt.Printf("FAILED: %s\n", resp.Message)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Zoop Linux CLI")
	fmt.Println("Usage:")
	fmt.Println("  zoop status         Get running daemon status")
	fmt.Println("  zoop connect <id>   Connect to a peer endpoint")
	fmt.Println("  zoop stop           Stop the running zoopd daemon")
}
