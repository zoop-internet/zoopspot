package tunnel

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/allannuwamanya/zoop/packages/agent/tunnel/muxbind"
	"github.com/allannuwamanya/zoop/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// PathUpgrader continuously monitors a relayed connection and upgrades it to direct P2P when available.
type PathUpgrader struct {
	mu            sync.Mutex
	mb            *muxbind.MuxBind
	peerKey       wgtypes.Key
	candidates    []types.EndpointCandidate
	connID        string
	defaultPort   int
	deviceMgr     *DeviceManager
	currentPath   *PathState
	onUpgraded    func(newPath *PathState)
	logger        *slog.Logger
	stopCh        chan struct{}
	probeInterval time.Duration
}

// NewPathUpgrader creates a new upgrader background worker.
func NewPathUpgrader(
	mb *muxbind.MuxBind,
	peerKey wgtypes.Key,
	candidates []types.EndpointCandidate,
	connID string,
	defaultPort int,
	deviceMgr *DeviceManager,
	currentPath *PathState,
	onUpgraded func(newPath *PathState),
	logger *slog.Logger,
) *PathUpgrader {
	if logger == nil {
		logger = slog.Default()
	}
	return &PathUpgrader{
		mb:            mb,
		peerKey:       peerKey,
		candidates:    candidates,
		connID:        connID,
		defaultPort:   defaultPort,
		deviceMgr:     deviceMgr,
		currentPath:   currentPath,
		onUpgraded:    onUpgraded,
		logger:        logger,
		stopCh:        make(chan struct{}),
		probeInterval: 2 * time.Second,
	}
}

// Start begins background path upgrade probing.
func (u *PathUpgrader) Start(ctx context.Context) {
	go u.loop(ctx)
}

// Stop halts background path upgrade probing.
func (u *PathUpgrader) Stop() {
	u.mu.Lock()
	defer u.mu.Unlock()

	select {
	case <-u.stopCh:
	default:
		close(u.stopCh)
	}
}

func (u *PathUpgrader) loop(ctx context.Context) {
	ticker := time.NewTicker(u.probeInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-u.stopCh:
			return
		case <-ticker.C:
			u.mu.Lock()
			if u.currentPath != nil && u.currentPath.IsDirect {
				u.mu.Unlock()
				return // Already upgraded to direct
			}
			u.mu.Unlock()

			// Attempt direct P2P probing
			bestCand, err := ProbeCandidatesMux(ctx, u.mb, u.candidates, u.connID, u.defaultPort)
			if err == nil && bestCand != nil {
				u.logger.Info("direct path discovered! upgrading connection from relay to direct",
					"ip", bestCand.IP, "port", bestCand.Port, "type", bestCand.Type)

				if u.deviceMgr != nil {
					allowedIPs := []string{"0.0.0.0/0"}
					_ = u.deviceMgr.AddPeer(u.peerKey, bestCand.IP, bestCand.Port, allowedIPs)
				}

				newPath := &PathState{
					ActiveEndpoint: fmt.Sprintf("%s:%d", bestCand.IP, bestCand.Port),
					PathType:       bestCand.Type,
					IsDirect:       true,
				}

				u.mu.Lock()
				u.currentPath = newPath
				u.mu.Unlock()

				if u.onUpgraded != nil {
					u.onUpgraded(newPath)
				}
				return
			}
		}
	}
}
