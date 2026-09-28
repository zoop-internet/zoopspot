package tunnel

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/zoop-internet/zoopspot/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// PathState describes the status and selected route type of an active peer connection.
type PathState struct {
	ActiveEndpoint string
	PathType       types.CandidateType
	LastHandshake  time.Time
	TxBytes        int64
	RxBytes        int64
	IsDirect       bool
}

// PathMonitor tracks the connectivity path state for active peers.
type PathMonitor struct {
	deviceMgr *DeviceManager
	logger    *slog.Logger
}

// NewPathMonitor initializes a new monitor attached to a DeviceManager.
func NewPathMonitor(deviceMgr *DeviceManager, logger *slog.Logger) *PathMonitor {
	return &PathMonitor{
		deviceMgr: deviceMgr,
		logger:    logger,
	}
}

// GetPeerPathState inspects the active WireGuard UAPI status for a specific peer.
func (pm *PathMonitor) GetPeerPathState(peerPubKey wgtypes.Key, knownCandidates []types.EndpointCandidate) (*PathState, error) {
	if pm.deviceMgr == nil || pm.deviceMgr.wgDev == nil {
		return nil, fmt.Errorf("device manager not initialized")
	}

	uapi, err := pm.deviceMgr.wgDev.IpcGet()
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve UAPI status: %w", err)
	}

	// Simple parser for UAPI output
	state := &PathState{
		IsDirect: true,
	}

	for _, line := range splitLines(uapi) {
		if hasPrefix(line, "endpoint=") {
			state.ActiveEndpoint = trimPrefix(line, "endpoint=")
		}
		if hasPrefix(line, "last_handshake_time_sec=") {
			var sec int64
			if _, err := fmt.Sscanf(line, "last_handshake_time_sec=%d", &sec); err == nil && sec > 0 {
				state.LastHandshake = time.Unix(sec, 0)
			}
		}
		if hasPrefix(line, "rx_bytes=") {
			_, _ = fmt.Sscanf(line, "rx_bytes=%d", &state.RxBytes)
		}
		if hasPrefix(line, "tx_bytes=") {
			_, _ = fmt.Sscanf(line, "tx_bytes=%d", &state.TxBytes)
		}
	}

	// Match active endpoint against candidate list to determine PathType
	state.PathType = types.CandidateTypeHost // Default assumption if endpoint matches local range
	for _, c := range knownCandidates {
		target := fmt.Sprintf("%s:%d", c.IP, c.Port)
		if state.ActiveEndpoint == target {
			state.PathType = c.Type
			break
		}
	}

	return state, nil
}

// StartMonitoring launches a periodic status logger for the peer connection.
func (pm *PathMonitor) StartMonitoring(ctx context.Context, peerPubKey wgtypes.Key, knownCandidates []types.EndpointCandidate, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			st, err := pm.GetPeerPathState(peerPubKey, knownCandidates)
			if err != nil {
				if pm.logger != nil {
					pm.logger.Debug("path monitor query failed", "error", err)
				}
				continue
			}

			if pm.logger != nil {
				pm.logger.Info("path state monitor",
					"active_endpoint", st.ActiveEndpoint,
					"path_type", st.PathType,
					"is_direct", st.IsDirect,
					"last_handshake", st.LastHandshake.Format(time.RFC3339),
					"rx_bytes", st.RxBytes,
					"tx_bytes", st.TxBytes,
				)
			}
		}
	}
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}

func hasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}

func trimPrefix(s, prefix string) string {
	if hasPrefix(s, prefix) {
		return s[len(prefix):]
	}
	return s
}
