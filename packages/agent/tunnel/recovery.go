package tunnel

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/zoop-internet/zoop/packages/agent/tunnel/muxbind"
	"github.com/zoop-internet/zoop/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// ConnectionRecoveryState tracks the operational mode of the connection.
type ConnectionRecoveryState string

const (
	StateDirect    ConnectionRecoveryState = "direct"
	StateDegraded  ConnectionRecoveryState = "degraded"
	StateRelayed   ConnectionRecoveryState = "relayed"
	StateRecovered ConnectionRecoveryState = "recovered"
)

// RecoveryCallback is invoked whenever the connection state changes.
type RecoveryCallback func(newState ConnectionRecoveryState, activeEndpoint string, isDirect bool)

// ConnectionRecoveryManager monitors and manages connection recovery across network changes and failures.
type ConnectionRecoveryManager struct {
	mux          *muxbind.MuxBind
	peerPubKey   wgtypes.Key
	candidates   []types.EndpointCandidate
	connID       string
	listenPort   int
	deviceMgr    *DeviceManager
	relayURL     string
	relayURLs    []string
	relayIdx     int
	monitor      *PathMonitor
	dpd          *DeadPeerDetector
	onStateChange RecoveryCallback
	logger       *slog.Logger

	mu             sync.Mutex
	currentState   ConnectionRecoveryState
	currentEndpoint string
	isDirect       bool
	cancelFunc     context.CancelFunc
	lastUpgradeTime time.Time
}

// NewConnectionRecoveryManager creates a recovery manager instance with a single relay URL.
func NewConnectionRecoveryManager(
	mux *muxbind.MuxBind,
	peerPubKey wgtypes.Key,
	initialCandidates []types.EndpointCandidate,
	connID string,
	listenPort int,
	deviceMgr *DeviceManager,
	relayURL string,
	onStateChange RecoveryCallback,
	logger *slog.Logger,
) *ConnectionRecoveryManager {
	var relayURLs []string
	if relayURL != "" {
		relayURLs = []string{relayURL}
	}
	return NewMultiRelayRecoveryManager(mux, peerPubKey, initialCandidates, connID, listenPort, deviceMgr, relayURLs, onStateChange, logger)
}

// NewMultiRelayRecoveryManager creates a recovery manager with multiple fallback relay endpoints and autonomous DPD.
func NewMultiRelayRecoveryManager(
	mux *muxbind.MuxBind,
	peerPubKey wgtypes.Key,
	initialCandidates []types.EndpointCandidate,
	connID string,
	listenPort int,
	deviceMgr *DeviceManager,
	relayURLs []string,
	onStateChange RecoveryCallback,
	logger *slog.Logger,
) *ConnectionRecoveryManager {
	if logger == nil {
		logger = slog.Default()
	}
	primaryRelay := ""
	if len(relayURLs) > 0 {
		primaryRelay = relayURLs[0]
	}

	crm := &ConnectionRecoveryManager{
		mux:             mux,
		peerPubKey:      peerPubKey,
		candidates:      initialCandidates,
		connID:          connID,
		listenPort:      listenPort,
		deviceMgr:       deviceMgr,
		relayURL:        primaryRelay,
		relayURLs:       relayURLs,
		relayIdx:        0,
		monitor:         NewPathMonitor(deviceMgr, logger),
		onStateChange:   onStateChange,
		logger:          logger,
		currentState:    StateDirect,
		isDirect:        true,
	}

	crm.dpd = NewDeadPeerDetector(
		DefaultDPDConfig(),
		func() {
			crm.mu.Lock()
			st := crm.currentState
			crm.mu.Unlock()
			if st == StateDirect {
				crm.logger.Warn("DPD reported peer dead, failing over to relay")
				crm.transitionToRelay(context.Background())
			}
		},
		func(retries int, nextBackoff time.Duration) {
			crm.logger.Info("DPD suspecting peer unreachable", "retry", retries, "next_backoff", nextBackoff)
		},
		func() {
			crm.logger.Info("DPD confirmed peer alive")
		},
		logger,
	)

	return crm
}

// UpdateCandidates updates the known candidate endpoints (e.g. after peer signals new IPs).
func (crm *ConnectionRecoveryManager) UpdateCandidates(candidates []types.EndpointCandidate) {
	crm.mu.Lock()
	defer crm.mu.Unlock()
	crm.candidates = candidates
}

// OnNetworkRoam handles immediate interface handover and triggers proactive endpoint probing.
func (crm *ConnectionRecoveryManager) OnNetworkRoam(ctx context.Context, newCandidates []types.EndpointCandidate) {
	crm.mu.Lock()
	crm.logger.Info("handling network roam event in recovery manager", "candidates", len(newCandidates))
	if len(newCandidates) > 0 {
		crm.candidates = newCandidates
	}
	crm.lastUpgradeTime = time.Now()
	candidates := append([]types.EndpointCandidate(nil), crm.candidates...)
	crm.mu.Unlock()

	probeCtx, cancel := context.WithTimeout(ctx, 1500*time.Millisecond)
	defer cancel()

	bestCand, err := ProbeCandidatesMux(probeCtx, crm.mux, candidates, crm.connID, crm.listenPort)
	if err == nil && bestCand != nil {
		endpoint := fmt.Sprintf("%s:%d", bestCand.IP, bestCand.Port)
		allowedIPs := []string{"100.64.0.2/32"}
		_ = crm.deviceMgr.AddPeer(crm.peerPubKey, bestCand.IP, bestCand.Port, allowedIPs)

		crm.mu.Lock()
		crm.currentState = StateDirect
		crm.currentEndpoint = endpoint
		crm.isDirect = true
		cb := crm.onStateChange
		crm.mu.Unlock()

		if cb != nil {
			cb(StateRecovered, endpoint, true)
		}
	} else if crm.relayURL != "" {
		crm.transitionToRelay(ctx)
	}
}

// GetState returns the current connection recovery state.
func (crm *ConnectionRecoveryManager) GetState() (ConnectionRecoveryState, string, bool) {
	crm.mu.Lock()
	defer crm.mu.Unlock()
	return crm.currentState, crm.currentEndpoint, crm.isDirect
}

// Start launches the recovery monitoring loop.
func (crm *ConnectionRecoveryManager) Start(ctx context.Context) {
	crm.mu.Lock()
	ctx, cancel := context.WithCancel(ctx)
	crm.cancelFunc = cancel
	crm.mu.Unlock()

	go crm.loop(ctx)
}

// Stop halts the recovery monitoring loop.
func (crm *ConnectionRecoveryManager) Stop() {
	crm.mu.Lock()
	defer crm.mu.Unlock()
	if crm.cancelFunc != nil {
		crm.cancelFunc()
	}
}

func (crm *ConnectionRecoveryManager) loop(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			crm.mu.Lock()
			candidates := append([]types.EndpointCandidate(nil), crm.candidates...)
			state := crm.currentState
			timeSinceUpgrade := time.Since(crm.lastUpgradeTime)
			crm.mu.Unlock()

			// Check WireGuard UAPI status
			pathState, err := crm.monitor.GetPeerPathState(crm.peerPubKey, candidates)
			if err != nil {
				crm.logger.Debug("recovery loop path state query failed", "error", err)
				continue
			}

			if state == StateDirect {
				if timeSinceUpgrade > 5*time.Second && crm.dpd != nil {
					crm.dpd.RecordHandshake(pathState.LastHandshake)
				}
			} else if state == StateRelayed || state == StateDegraded {
				// Probe for direct path recovery
				probeCtx, probeCancel := context.WithTimeout(ctx, 1*time.Second)
				bestCand, err := ProbeCandidatesMux(probeCtx, crm.mux, candidates, crm.connID, crm.listenPort)
				probeCancel()

				if err == nil && bestCand != nil {
					crm.logger.Info("discovered reachable direct candidate during recovery",
						"ip", bestCand.IP,
						"port", bestCand.Port,
						"type", bestCand.Type,
					)

					endpoint := fmt.Sprintf("%s:%d", bestCand.IP, bestCand.Port)
					allowedIPs := []string{"100.64.0.2/32"}

					if err := crm.deviceMgr.AddPeer(crm.peerPubKey, bestCand.IP, bestCand.Port, allowedIPs); err != nil {
						crm.logger.Warn("add peer during recovery returned error (unprivileged env)", "error", err)
					}

					if crm.dpd != nil {
						crm.dpd.Reset()
					}

					crm.mu.Lock()
					crm.currentState = StateDirect
					crm.currentEndpoint = endpoint
					crm.isDirect = true
					crm.lastUpgradeTime = time.Now()
					cb := crm.onStateChange
					crm.mu.Unlock()

					if cb != nil {
						cb(StateRecovered, endpoint, true)
					}
				}
			}
		}
	}
}

func (crm *ConnectionRecoveryManager) transitionToRelay(ctx context.Context) {
	crm.mu.Lock()
	crm.currentState = StateRelayed
	if len(crm.relayURLs) > 1 {
		crm.relayIdx = (crm.relayIdx + 1) % len(crm.relayURLs)
		crm.relayURL = crm.relayURLs[crm.relayIdx]
	}
	targetRelay := crm.relayURL
	crm.currentEndpoint = targetRelay
	crm.isDirect = false
	cb := crm.onStateChange
	crm.mu.Unlock()

	crm.logger.Info("switched connection state to relay fallback", "relay_url", targetRelay)

	if cb != nil {
		cb(StateRelayed, targetRelay, false)
	}
}

// GetDPDStatus returns the underlying dead-peer detector liveliness status.
func (crm *ConnectionRecoveryManager) GetDPDStatus() (DPDState, int, time.Duration) {
	if crm.dpd != nil {
		return crm.dpd.GetStatus()
	}
	return DPDStateAlive, 0, 0
}
