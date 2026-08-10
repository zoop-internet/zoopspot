package android

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/core/types"
)

var (
	mu        sync.Mutex
	devMgr    *tunnel.DeviceManager
	recMgr    *tunnel.ConnectionRecoveryManager
	cancelFn  context.CancelFunc
	activeCtx context.Context
)

// InitAndroidBackend initializes the Zoop agent core over Android's native VpnService file descriptor.
func InitAndroidBackend(fd int, ifName string) error {
	mu.Lock()
	defer mu.Unlock()

	if devMgr != nil {
		devMgr.Close()
	}

	ctx, cancel := context.WithCancel(context.Background())
	activeCtx = ctx
	cancelFn = cancel

	dm, err := tunnel.NewDeviceManagerWithFD(fd, ifName, nil)
	if err != nil {
		return fmt.Errorf("failed to create DeviceManager from FD: %w", err)
	}

	devMgr = dm
	slog.Info("Android native backend initialized over VpnService FD", "fd", fd, "ifname", ifName)
	return nil
}

// ConnectPeer initiates tunneling and path recovery to a remote peer.
func ConnectPeer(peerPubKeyHex string, candidatesJSON string, relayURL string) error {
	mu.Lock()
	defer mu.Unlock()

	if devMgr == nil {
		return fmt.Errorf("backend not initialized")
	}

	peerKey, err := tunnel.ParsePublicKey(peerPubKeyHex)
	if err != nil {
		return fmt.Errorf("invalid peer key: %w", err)
	}

	var candidates []types.EndpointCandidate
	if err := json.Unmarshal([]byte(candidatesJSON), &candidates); err != nil {
		return fmt.Errorf("invalid candidates json: %w", err)
	}

	port, _ := devMgr.GetListenPort()
	recMgr = tunnel.NewConnectionRecoveryManager(
		devMgr.GetMuxBind(),
		peerKey,
		candidates,
		"android-conn",
		port,
		devMgr,
		relayURL,
		func(newState tunnel.ConnectionRecoveryState, activeEndpoint string, isDirect bool) {
			slog.Info("Android connection state callback", "state", newState, "endpoint", activeEndpoint, "is_direct", isDirect)
		},
		slog.Default(),
	)

	recMgr.Start(activeCtx)
	return nil
}

// NotifyNetworkChanged notifies the Go core that Android's ConnectivityManager detected a Wi-Fi/Cellular change.
func NotifyNetworkChanged(newNetworkType string) {
	mu.Lock()
	rm := recMgr
	mu.Unlock()

	if rm != nil {
		slog.Info("Android network change event received", "network_type", newNetworkType)
		// Trigger rapid candidate re-probing on recovery manager
	}
}

// StopAndroidBackend tears down active tunnel and background services.
func StopAndroidBackend() {
	mu.Lock()
	defer mu.Unlock()

	if recMgr != nil {
		recMgr.Stop()
		recMgr = nil
	}

	if cancelFn != nil {
		cancelFn()
		cancelFn = nil
	}

	if devMgr != nil {
		devMgr.Close()
		devMgr = nil
	}

	slog.Info("Android native backend stopped")
}
