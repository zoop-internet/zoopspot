package tunnel

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"sync"
	"time"

	"github.com/zoop-internet/zoop/packages/core/types"
)

// NetworkChangeEvent describes an OS network transition event.
type NetworkChangeEvent struct {
	Timestamp      time.Time
	DefaultGateway string
	PrimaryIP      string
	Interfaces     []string
	Reason         string
}

// RoamingCallback is invoked when an OS network state change is detected.
type RoamingCallback func(event NetworkChangeEvent, newCandidates []types.EndpointCandidate)

// RoamingManager monitors network interfaces and orchestrates automatic tunnel roaming.
type RoamingManager struct {
	stunServer string
	listenPort int
	callback   RoamingCallback
	logger     *slog.Logger

	mu             sync.RWMutex
	lastPrimaryIP  string
	lastGateway    string
	lastInterfaces map[string]string
	cancel         context.CancelFunc
	debounceTimer  *time.Timer
}

// NewRoamingManager creates a new network change and roaming manager.
func NewRoamingManager(stunServer string, listenPort int, callback RoamingCallback, logger *slog.Logger) *RoamingManager {
	if logger == nil {
		logger = slog.Default()
	}
	if stunServer == "" {
		stunServer = "stun.l.google.com:19302"
	}
	return &RoamingManager{
		stunServer:     stunServer,
		listenPort:     listenPort,
		callback:       callback,
		logger:         logger,
		lastInterfaces: make(map[string]string),
	}
}

// Start launches the network monitoring loop.
func (rm *RoamingManager) Start(ctx context.Context) {
	rm.mu.Lock()
	ctx, cancel := context.WithCancel(ctx)
	rm.cancel = cancel
	rm.mu.Unlock()

	// Capture initial baseline network state
	rm.captureInitialState()

	// Launch platform-specific listener
	go rm.startPlatformMonitor(ctx)
}

// Stop terminates the roaming monitor.
func (rm *RoamingManager) Stop() {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	if rm.cancel != nil {
		rm.cancel()
	}
	if rm.debounceTimer != nil {
		rm.debounceTimer.Stop()
	}
}

// captureInitialState records the initial network baseline.
func (rm *RoamingManager) captureInitialState() {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	ifaces, _ := net.Interfaces()
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := iface.Addrs()
		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok && ipNet.IP.To4() != nil {
				rm.lastInterfaces[iface.Name] = ipNet.IP.String()
				if rm.lastPrimaryIP == "" {
					rm.lastPrimaryIP = ipNet.IP.String()
				}
			}
		}
	}
}

// TriggerRoamCheck is called by netlink/polling when interface or route changes are detected.
func (rm *RoamingManager) TriggerRoamCheck(reason string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	// Debounce rapid link flaps (500ms stabilization window)
	if rm.debounceTimer != nil {
		rm.debounceTimer.Stop()
	}

	rm.debounceTimer = time.AfterFunc(500*time.Millisecond, func() {
		rm.executeRoaming(reason)
	})
}

// executeRoaming executes reflexive STUN discovery and invokes the roaming callback.
func (rm *RoamingManager) executeRoaming(reason string) {
	rm.logger.Info("executing network roaming recovery", "reason", reason)

	// Discover updated local and reflexive candidates
	candidates, err := GatherCandidates(rm.listenPort)
	if err != nil {
		rm.logger.Warn("failed to discover candidates during roam", "error", err)
	}

	var primaryIP string
	var ifaceNames []string
	currentIfaces := make(map[string]string)

	ifaces, _ := net.Interfaces()
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := iface.Addrs()
		for _, addr := range addrs {
			if ipNet, ok := addr.(*net.IPNet); ok && ipNet.IP.To4() != nil {
				currentIfaces[iface.Name] = ipNet.IP.String()
				ifaceNames = append(ifaceNames, fmt.Sprintf("%s:%s", iface.Name, ipNet.IP.String()))
				if primaryIP == "" {
					primaryIP = ipNet.IP.String()
				}
			}
		}
	}

	rm.mu.Lock()
	rm.lastInterfaces = currentIfaces
	rm.lastPrimaryIP = primaryIP
	cb := rm.callback
	rm.mu.Unlock()

	event := NetworkChangeEvent{
		Timestamp:  time.Now(),
		PrimaryIP:  primaryIP,
		Interfaces: ifaceNames,
		Reason:     reason,
	}

	if cb != nil {
		cb(event, candidates)
	}
}
