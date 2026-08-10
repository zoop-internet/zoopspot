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
	monitor      *PathMonitor
	onStateChange RecoveryCallback
	logger       *slog.Logger

	mu             sync.Mutex
	currentState   ConnectionRecoveryState
	currentEndpoint string
	isDirect       bool
	cancelFunc     context.CancelFunc
	lastUpgradeTime time.Time
}

// NewConnectionRecoveryManager creates a recovery manager instance.
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
	return &ConnectionRecoveryManager{
		mux:             mux,
		peerPubKey:      peerPubKey,
		candidates:      initialCandidates,
		connID:          connID,
		listenPort:      listenPort,
		deviceMgr:       deviceMgr,
		relayURL:        relayURL,
		monitor:         NewPathMonitor(deviceMgr, logger),
		onStateChange:   onStateChange,
		logger:          logger,
		currentState:    StateDirect,
		isDirect:        true,
	}
}

// UpdateCandidates updates the known candidate endpoints (e.g. after peer signals new IPs).
func (crm *ConnectionRecoveryManager) UpdateCandidates(candidates []types.EndpointCandidate) {
	crm.mu.Lock()
	defer crm.mu.Unlock()
	crm.candidates = candidates
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

	stalledCount := 0

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			crm.mu.Lock()
			candidates := append([]types.EndpointCandidate(nil), crm.candidates...)
			state := crm.currentState
			crm.mu.Unlock()

			// Check WireGuard UAPI status
			pathState, err := crm.monitor.GetPeerPathState(crm.peerPubKey, candidates)
			if err != nil {
				crm.logger.Debug("recovery loop path state query failed", "error", err)
				continue
			}

			// Evaluate handshake freshness with grace period after upgrade
			handshakeStale := false
			crm.mu.Lock()
			timeSinceUpgrade := time.Since(crm.lastUpgradeTime)
			crm.mu.Unlock()

			if timeSinceUpgrade > 5*time.Second {
				if pathState.LastHandshake.IsZero() || time.Since(pathState.LastHandshake) > 3*time.Second {
					handshakeStale = true
				}
			}

			if state == StateDirect {
				if handshakeStale {
					stalledCount++
					if stalledCount >= 2 {
						crm.logger.Warn("direct path stalled, triggering instant fallback to relay",
							"stalled_sec", time.Since(pathState.LastHandshake).Seconds(),
						)
						crm.transitionToRelay(ctx)
						stalledCount = 0
					}
				} else {
					stalledCount = 0
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
	crm.currentEndpoint = crm.relayURL
	crm.isDirect = false
	cb := crm.onStateChange
	crm.mu.Unlock()

	crm.logger.Info("switched connection state to relay fallback", "relay_url", crm.relayURL)

	if cb != nil {
		cb(StateRelayed, crm.relayURL, false)
	}
}
