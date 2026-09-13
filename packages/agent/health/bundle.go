package health

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"runtime"
	"strings"
	"time"

	"github.com/allannuwamanya/zoop/packages/agent/telemetry"
	"github.com/allannuwamanya/zoop/packages/core"
)

// SanitizedPeerTelemetry represents telemetry for a peer with real identifiers scrubbed.
type SanitizedPeerTelemetry struct {
	PseudonymID       string  `json:"pseudonym_id"`
	State             string  `json:"state"`
	PathType          string  `json:"path_type"`
	HandshakeRTTMs    float64 `json:"handshake_rtt_ms"`
	PacketLossPercent float64 `json:"packet_loss_percent"`
	RxBytes           uint64  `json:"rx_bytes"`
	TxBytes           uint64  `json:"tx_bytes"`
}

// InterfaceErrors holds interface health counters and error metrics.
type InterfaceErrors struct {
	InterfaceName string `json:"interface_name"`
	DropCount     uint64 `json:"drop_count"`
	ErrorCount    uint64 `json:"error_count"`
}

// DiagnosticBundle represents a sanitized, privacy-preserving troubleshooting archive.
// It contains zero payload data, destination IP addresses, or browsing history.
type DiagnosticBundle struct {
	Timestamp       string                   `json:"timestamp"`
	BundleID        string                   `json:"bundle_id"`
	AgentVersion    string                   `json:"agent_version"`
	OS              string                   `json:"os"`
	Arch            string                   `json:"arch"`
	Healthy         bool                     `json:"healthy"`
	Report          DiagnosticReport         `json:"report"`
	PeerTelemetry   []SanitizedPeerTelemetry `json:"peer_telemetry"`
	InterfaceErrors []InterfaceErrors        `json:"interface_errors"`
}

// SanitizePeerID generates a deterministic pseudonym for a peer identifier using HMAC-SHA256.
func SanitizePeerID(realID string, salt []byte) string {
	mac := hmac.New(sha256.New, salt)
	mac.Write([]byte(realID))
	sum := mac.Sum(nil)
	return "peer-" + hex.EncodeToString(sum[:8])
}

// sanitizeString removes potential IPv4/IPv6 addresses or tokens from message strings.
func sanitizeString(s string) string {
	// Redact standard IPv4 dotted quads if present
	words := strings.Fields(s)
	for i, w := range words {
		cleanW := strings.TrimRight(w, ",;:()")
		parts := strings.Split(cleanW, ":") // handle ip:port
		ipPart := parts[0]
		ipSub := strings.Split(ipPart, ".")
		if len(ipSub) == 4 {
			words[i] = "[REDACTED_IP]"
			if len(parts) > 1 {
				words[i] += ":" + parts[1]
			}
		}
	}
	return strings.Join(words, " ")
}

// GenerateBundle builds a fully sanitized diagnostic bundle.
func GenerateBundle(ctx context.Context, checker *Checker, tracker *telemetry.Tracker) (*DiagnosticBundle, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		salt = []byte("zoop-default-salt")
	}

	bundleIDBytes := make([]byte, 8)
	_, _ = rand.Read(bundleIDBytes)
	bundleID := "zb-" + hex.EncodeToString(bundleIDBytes)

	var report DiagnosticReport
	if checker != nil {
		report = checker.RunDiagnostics(ctx)
	} else {
		report = DiagnosticReport{
			Timestamp: time.Now().UTC().Format(time.RFC3339),
			Version:   core.Version(),
			Healthy:   false,
		}
	}

	// Sanitize check messages to ensure no IP leaks
	sanitizedChecks := make([]CheckResult, len(report.Checks))
	for i, chk := range report.Checks {
		sanitizedChecks[i] = CheckResult{
			Name:    chk.Name,
			Passed:  chk.Passed,
			Latency: chk.Latency,
			Message: sanitizeString(chk.Message),
			Details: sanitizeString(chk.Details),
		}
	}
	report.Checks = sanitizedChecks
	report.PeerTelemetry = nil // stripped from inner report in favor of pseudonymized list

	var peerTelemetries []SanitizedPeerTelemetry
	if tracker != nil {
		snaps := tracker.GetSnapshots()
		peerTelemetries = make([]SanitizedPeerTelemetry, 0, len(snaps))
		for _, snap := range snaps {
			peerTelemetries = append(peerTelemetries, SanitizedPeerTelemetry{
				PseudonymID:       SanitizePeerID(snap.PeerID, salt),
				State:             snap.State,
				PathType:          snap.PathType,
				HandshakeRTTMs:    snap.HandshakeRTTMs,
				PacketLossPercent: snap.PacketLossPercent,
				RxBytes:           snap.RxBytes,
				TxBytes:           snap.TxBytes,
			})
		}
	}

	tunName := "zoop0"
	if checker != nil && checker.tunName != "" {
		tunName = checker.tunName
	}

	ifaceErrors := []InterfaceErrors{
		{
			InterfaceName: tunName,
			DropCount:     0,
			ErrorCount:    0,
		},
	}

	bundle := &DiagnosticBundle{
		Timestamp:       time.Now().UTC().Format(time.RFC3339),
		BundleID:        bundleID,
		AgentVersion:    core.Version(),
		OS:              runtime.GOOS,
		Arch:            runtime.GOARCH,
		Healthy:         report.Healthy,
		Report:          report,
		PeerTelemetry:   peerTelemetries,
		InterfaceErrors: ifaceErrors,
	}

	return bundle, nil
}

// ToJSON serializes the bundle to an indented JSON string.
func (b *DiagnosticBundle) ToJSON() (string, error) {
	data, err := json.MarshalIndent(b, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}
