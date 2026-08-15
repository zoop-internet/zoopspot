package health

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/pion/stun/v3"
	"github.com/zoop-internet/zoop/packages/agent/state"
	"github.com/zoop-internet/zoop/packages/agent/telemetry"
	"github.com/zoop-internet/zoop/packages/core"
)

// CheckResult represents the outcome of a single diagnostic probe.
type CheckResult struct {
	Name    string        `json:"name"`
	Passed  bool          `json:"passed"`
	Latency time.Duration `json:"latency_ms"`
	Message string        `json:"message"`
	Details string        `json:"details,omitempty"`
}

// DiagnosticReport is the aggregate diagnostic health report for the local agent.
type DiagnosticReport struct {
	Timestamp      string                                `json:"timestamp"`
	Version        string                                `json:"version"`
	AgentState     string                                `json:"agent_state"`
	Healthy        bool                                  `json:"healthy"`
	Checks         []CheckResult                         `json:"checks"`
	PeerTelemetry  []telemetry.PeerTelemetrySnapshot     `json:"peer_telemetry"`
}

// Checker provides health status and diagnostic probes for the agent.
type Checker struct {
	stateMgr  *state.Manager
	tunName   string
	cloudURL  string
	stunAddr  string
}

// NewChecker creates a new health checker.
func NewChecker(sm *state.Manager, tunName, cloudURL, stunAddr string) *Checker {
	if tunName == "" {
		tunName = "zoop0"
	}
	if cloudURL == "" {
		cloudURL = "http://localhost:8080"
	}
	if stunAddr == "" {
		stunAddr = "stun.l.google.com:19302"
	}
	return &Checker{
		stateMgr: sm,
		tunName:  tunName,
		cloudURL: cloudURL,
		stunAddr: stunAddr,
	}
}

// IsHealthy returns true if the agent is running normally.
func (c *Checker) IsHealthy() bool {
	if c.stateMgr == nil {
		return false
	}
	return c.stateMgr.Get() == state.StateRunning
}

// RunDiagnostics executes all local and remote diagnostic checks.
func (c *Checker) RunDiagnostics(ctx context.Context) DiagnosticReport {
	checks := make([]CheckResult, 0, 5)

	// 1. Agent State Check
	agentState := "UNKNOWN"
	if c.stateMgr != nil {
		agentState = string(c.stateMgr.Get())
	}
	checks = append(checks, CheckResult{
		Name:    "Agent Lifecycle State",
		Passed:  agentState == string(state.StateRunning) || agentState == string(state.StateStarting),
		Message: fmt.Sprintf("Current state: %s", agentState),
	})

	// 2. TUN Interface Check
	checks = append(checks, c.checkTUNInterface())

	// 3. Control Plane Reachability Check
	checks = append(checks, c.checkControlPlane(ctx))

	// 4. DNS Resolution Check
	checks = append(checks, c.checkDNS())

	// 5. STUN Server Reachability & NAT Traversal Probe
	checks = append(checks, c.checkSTUN(ctx))

	overallHealthy := true
	for _, chk := range checks {
		if !chk.Passed {
			// Note: TUN check may fail on non-root test environments, so we track overall
			if chk.Name == "Agent Lifecycle State" || chk.Name == "Control Plane API Reachability" {
				overallHealthy = false
			}
		}
	}

	return DiagnosticReport{
		Timestamp:     time.Now().UTC().Format(time.RFC3339),
		Version:       core.Version(),
		AgentState:    agentState,
		Healthy:       overallHealthy,
		Checks:        checks,
		PeerTelemetry: telemetry.GetTracker().GetSnapshots(),
	}
}

func (c *Checker) checkTUNInterface() CheckResult {
	start := time.Now()
	iface, err := net.InterfaceByName(c.tunName)
	elapsed := time.Since(start)

	if err != nil {
		return CheckResult{
			Name:    "TUN Interface (" + c.tunName + ")",
			Passed:  false,
			Latency: elapsed,
			Message: fmt.Sprintf("Interface %s not found (may require sudo/root privileges)", c.tunName),
			Details: err.Error(),
		}
	}

	addrs, _ := iface.Addrs()
	addrList := make([]string, 0, len(addrs))
	for _, a := range addrs {
		addrList = append(addrList, a.String())
	}

	isUp := iface.Flags&net.FlagUp != 0
	return CheckResult{
		Name:    "TUN Interface (" + c.tunName + ")",
		Passed:  isUp,
		Latency: elapsed,
		Message: fmt.Sprintf("MTU: %d, Flags: %v, Addrs: %s", iface.MTU, iface.Flags, strings.Join(addrList, ", ")),
	}
}

func (c *Checker) checkControlPlane(ctx context.Context) CheckResult {
	start := time.Now()
	healthURL := fmt.Sprintf("%s/v1/health", strings.TrimRight(c.cloudURL, "/"))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, healthURL, nil)
	if err != nil {
		return CheckResult{
			Name:    "Control Plane API Reachability",
			Passed:  false,
			Latency: time.Since(start),
			Message: "Failed to construct health request",
			Details: err.Error(),
		}
	}

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	elapsed := time.Since(start)

	if err != nil {
		return CheckResult{
			Name:    "Control Plane API Reachability",
			Passed:  false,
			Latency: elapsed,
			Message: fmt.Sprintf("Failed to reach %s", healthURL),
			Details: err.Error(),
		}
	}
	defer resp.Body.Close()

	passed := resp.StatusCode == http.StatusOK
	return CheckResult{
		Name:    "Control Plane API Reachability",
		Passed:  passed,
		Latency: elapsed,
		Message: fmt.Sprintf("HTTP %d from %s", resp.StatusCode, healthURL),
	}
}

func (c *Checker) checkDNS() CheckResult {
	start := time.Now()
	ips, err := net.LookupIP("one.one.one.one")
	elapsed := time.Since(start)

	if err != nil {
		return CheckResult{
			Name:    "DNS Resolution",
			Passed:  false,
			Latency: elapsed,
			Message: "DNS lookup failed",
			Details: err.Error(),
		}
	}

	ipStrs := make([]string, 0, len(ips))
	for _, ip := range ips {
		ipStrs = append(ipStrs, ip.String())
	}

	return CheckResult{
		Name:    "DNS Resolution",
		Passed:  len(ips) > 0,
		Latency: elapsed,
		Message: fmt.Sprintf("Resolved one.one.one.one to [%s]", strings.Join(ipStrs, ", ")),
	}
}

func (c *Checker) checkSTUN(ctx context.Context) CheckResult {
	start := time.Now()

	// Resolve STUN server address
	raddr, err := net.ResolveUDPAddr("udp4", c.stunAddr)
	if err != nil {
		return CheckResult{
			Name:    "STUN Reachability & NAT Discovery",
			Passed:  false,
			Latency: time.Since(start),
			Message: fmt.Sprintf("Failed to resolve STUN server %s", c.stunAddr),
			Details: err.Error(),
		}
	}

	conn, err := net.DialUDP("udp4", nil, raddr)
	if err != nil {
		return CheckResult{
			Name:    "STUN Reachability & NAT Discovery",
			Passed:  false,
			Latency: time.Since(start),
			Message: "Failed to dial STUN UDP socket",
			Details: err.Error(),
		}
	}
	defer conn.Close()

	_ = conn.SetDeadline(time.Now().Add(2 * time.Second))

	client, err := stun.NewClient(conn)
	if err != nil {
		return CheckResult{
			Name:    "STUN Reachability & NAT Discovery",
			Passed:  false,
			Latency: time.Since(start),
			Message: "Failed to create STUN client",
			Details: err.Error(),
		}
	}
	defer client.Close()

	var reflexiveAddr string
	message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)
	err = client.Do(message, func(res stun.Event) {
		if res.Error != nil {
			err = res.Error
			return
		}
		var xorAddr stun.XORMappedAddress
		if getErr := xorAddr.GetFrom(res.Message); getErr == nil {
			reflexiveAddr = fmt.Sprintf("%s:%d", xorAddr.IP, xorAddr.Port)
		}
	})

	elapsed := time.Since(start)
	if err != nil || reflexiveAddr == "" {
		return CheckResult{
			Name:    "STUN Reachability & NAT Discovery",
			Passed:  false,
			Latency: elapsed,
			Message: fmt.Sprintf("No response from STUN server %s (NAT probe timed out)", c.stunAddr),
			Details: fmt.Sprintf("%v", err),
		}
	}

	return CheckResult{
		Name:    "STUN Reachability & NAT Discovery",
		Passed:  true,
		Latency: elapsed,
		Message: fmt.Sprintf("Server: %s, Public Endpoint: %s", c.stunAddr, reflexiveAddr),
	}
}

// PrintReport writes a clean ASCII diagnostic table to stdout for CLI use.
func (r *DiagnosticReport) PrintReport() {
	fmt.Println("================================================================")
	fmt.Printf(" Zoop Diagnostics Report  (v%s)\n", r.Version)
	fmt.Printf(" Timestamp: %s\n", r.Timestamp)
	fmt.Println("================================================================")
	fmt.Println()

	for _, chk := range r.Checks {
		icon := "[✓ PASS]"
		if !chk.Passed {
			icon = "[✗ FAIL]"
		}
		latencyStr := ""
		if chk.Latency > 0 {
			latencyStr = fmt.Sprintf(" (%v)", chk.Latency.Round(time.Millisecond))
		}
		fmt.Printf("%-8s %-35s%s\n", icon, chk.Name, latencyStr)
		fmt.Printf("         → %s\n", chk.Message)
		if !chk.Passed && chk.Details != "" {
			fmt.Printf("         Detail: %s\n", chk.Details)
		}
		fmt.Println()
	}

	if len(r.PeerTelemetry) > 0 {
		fmt.Println("----------------------------------------------------------------")
		fmt.Println(" Active Peer Tunnels & Telemetry")
		fmt.Println("----------------------------------------------------------------")
		for _, peer := range r.PeerTelemetry {
			fmt.Printf(" Peer %s: State=%s, Path=%s, RTT=%.1fms, Loss=%.1f%%, RX=%d B, TX=%d B\n",
				peer.PeerID, peer.State, peer.PathType, peer.HandshakeRTTMs, peer.PacketLossPercent, peer.RxBytes, peer.TxBytes)
		}
		fmt.Println()
	}

	fmt.Println("================================================================")
	if r.Healthy {
		fmt.Println(" Overall Status: HEALTHY")
	} else {
		fmt.Println(" Overall Status: ISSUES DETECTED")
		fmt.Println(" Suggestion: Ensure Zoop Cloud is running and the agent has network access.")
	}
	fmt.Println("================================================================")
}

// FormatJSON returns the formatted JSON representation of the report.
func (r *DiagnosticReport) FormatJSON() string {
	b, _ := json.MarshalIndent(r, "", "  ")
	return string(b)
}

// WriteHTTP sends the diagnostic report over HTTP JSON.
func (c *Checker) WriteHTTP(w http.ResponseWriter, r *http.Request) {
	report := c.RunDiagnostics(r.Context())
	w.Header().Set("Content-Type", "application/json")
	if !report.Healthy {
		w.WriteHeader(http.StatusServiceUnavailable)
	} else {
		w.WriteHeader(http.StatusOK)
	}
	_ = json.NewEncoder(w).Encode(report)
}
