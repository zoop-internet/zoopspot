package telemetry

import (
	"sync"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// AgentRxBytesTotal records the total bytes received over WireGuard interfaces.
	AgentRxBytesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "zoop",
			Subsystem: "agent",
			Name:      "rx_bytes_total",
			Help:      "Total bytes received over the WireGuard tunnel interface.",
		},
		[]string{"peer_id", "interface"},
	)

	// AgentTxBytesTotal records the total bytes transmitted over WireGuard interfaces.
	AgentTxBytesTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: "zoop",
			Subsystem: "agent",
			Name:      "tx_bytes_total",
			Help:      "Total bytes transmitted over the WireGuard tunnel interface.",
		},
		[]string{"peer_id", "interface"},
	)

	// AgentConnectionState indicates the current connection state (1 for active state).
	AgentConnectionState = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "zoop",
			Subsystem: "agent",
			Name:      "connection_state",
			Help:      "State of peer connections (1 if in state, 0 otherwise).",
		},
		[]string{"peer_id", "state"}, // state: "connected", "handshaking", "disconnected", "relayed"
	)

	// AgentHandshakeRTT tracks the round-trip time for the latest handshake in milliseconds.
	AgentHandshakeRTT = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "zoop",
			Subsystem: "agent",
			Name:      "handshake_rtt_ms",
			Help:      "Latest round-trip time of peer handshake or keepalive in milliseconds.",
		},
		[]string{"peer_id"},
	)

	// AgentPathType indicates the current data plane path type (direct_host, direct_srflx, relayed).
	AgentPathType = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "zoop",
			Subsystem: "agent",
			Name:      "path_type",
			Help:      "Current data path type for peer connection.",
		},
		[]string{"peer_id", "path_type"},
	)

	// AgentPacketLossPercent tracks estimated packet loss percentage.
	AgentPacketLossPercent = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Namespace: "zoop",
			Subsystem: "agent",
			Name:      "packet_loss_percent",
			Help:      "Estimated packet loss percentage on peer tunnel.",
		},
		[]string{"peer_id"},
	)
)

// PeerTelemetrySnapshot represents an instantaneous health snapshot of a peer connection.
type PeerTelemetrySnapshot struct {
	PeerID            string  `json:"peer_id"`
	State             string  `json:"state"`
	PathType          string  `json:"path_type"`
	HandshakeRTTMs    float64 `json:"handshake_rtt_ms"`
	PacketLossPercent float64 `json:"packet_loss_percent"`
	RxBytes           uint64  `json:"rx_bytes"`
	TxBytes           uint64  `json:"tx_bytes"`
}

// Tracker provides thread-safe access to agent telemetry state snapshots.
type Tracker struct {
	mu    sync.RWMutex
	peers map[string]PeerTelemetrySnapshot
}

var globalTracker = &Tracker{
	peers: make(map[string]PeerTelemetrySnapshot),
}

// GetTracker returns the global telemetry tracker instance.
func GetTracker() *Tracker {
	return globalTracker
}

// RecordConnectionState updates Prometheus metrics and the local telemetry snapshot.
func (t *Tracker) RecordConnectionState(peerID, state, pathType string, rttMs, lossPct float64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Clear previous states
	states := []string{"connected", "handshaking", "disconnected", "relayed"}
	for _, s := range states {
		val := 0.0
		if s == state {
			val = 1.0
		}
		AgentConnectionState.WithLabelValues(peerID, s).Set(val)
	}

	// Update path types
	paths := []string{"direct_host", "direct_srflx", "relayed"}
	for _, p := range paths {
		val := 0.0
		if p == pathType {
			val = 1.0
		}
		AgentPathType.WithLabelValues(peerID, p).Set(val)
	}

	AgentHandshakeRTT.WithLabelValues(peerID).Set(rttMs)
	AgentPacketLossPercent.WithLabelValues(peerID).Set(lossPct)

	snap := t.peers[peerID]
	snap.PeerID = peerID
	snap.State = state
	snap.PathType = pathType
	snap.HandshakeRTTMs = rttMs
	snap.PacketLossPercent = lossPct
	t.peers[peerID] = snap
}

// RecordPacketStats records transmitted and received packet byte counts.
func (t *Tracker) RecordPacketStats(peerID, ifaceName string, rxBytes, txBytes uint64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	snap := t.peers[peerID]
	if rxBytes > snap.RxBytes {
		delta := float64(rxBytes - snap.RxBytes)
		AgentRxBytesTotal.WithLabelValues(peerID, ifaceName).Add(delta)
	}
	if txBytes > snap.TxBytes {
		delta := float64(txBytes - snap.TxBytes)
		AgentTxBytesTotal.WithLabelValues(peerID, ifaceName).Add(delta)
	}

	snap.RxBytes = rxBytes
	snap.TxBytes = txBytes
	t.peers[peerID] = snap
}

// GetSnapshots returns all current peer connection snapshots.
func (t *Tracker) GetSnapshots() []PeerTelemetrySnapshot {
	t.mu.RLock()
	defer t.mu.RUnlock()

	snaps := make([]PeerTelemetrySnapshot, 0, len(t.peers))
	for _, snap := range t.peers {
		snaps = append(snaps, snap)
	}
	return snaps
}
