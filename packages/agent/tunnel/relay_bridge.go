package tunnel

import (
	"fmt"
	"log/slog"
	"net"
	"sync"

	agentrelay "github.com/zoop-internet/zoopspot/packages/agent/relay"
	"github.com/zoop-internet/zoopspot/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

type peerForwarder struct {
	peerID     types.ID
	peerKey    wgtypes.Key
	conn       *net.UDPConn
	port       int
	mu         sync.Mutex
	lastWgAddr net.Addr
}

// RelayBridge bridges WireGuard UDP packets across the Zoop Relay WebSocket client
// when direct peer-to-peer UDP paths are blocked by restrictive firewalls or symmetric NAT.
type RelayBridge struct {
	relayClient  *agentrelay.RelayClient
	targetWgPort int
	logger       *slog.Logger

	mu         sync.RWMutex
	forwarders map[types.ID]*peerForwarder
	closed     chan struct{}
}

// NewRelayBridge creates a new RelayBridge bound to the local WireGuard listening port.
func NewRelayBridge(relayClient *agentrelay.RelayClient, targetWgPort int, logger *slog.Logger) *RelayBridge {
	if logger == nil {
		logger = slog.Default()
	}

	rb := &RelayBridge{
		relayClient:  relayClient,
		targetWgPort: targetWgPort,
		logger:       logger,
		forwarders:   make(map[types.ID]*peerForwarder),
		closed:       make(chan struct{}),
	}

	if relayClient != nil {
		relayClient.SetFrameHandler(rb.handleInboundFrame)
	}

	return rb
}

// RegisterPeer allocates a loopback UDP port for a remote peer and starts forwarding traffic to the relay.
func (rb *RelayBridge) RegisterPeer(peerID types.ID, peerKey wgtypes.Key) (int, error) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	if f, exists := rb.forwarders[peerID]; exists {
		return f.port, nil
	}

	conn, err := net.ListenUDP("udp4", &net.UDPAddr{
		IP:   net.IPv4(127, 0, 0, 1),
		Port: 0,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to allocate loopback relay UDP port: %w", err)
	}

	lAddr := conn.LocalAddr().(*net.UDPAddr)
	f := &peerForwarder{
		peerID:  peerID,
		peerKey: peerKey,
		conn:    conn,
		port:    lAddr.Port,
	}
	rb.forwarders[peerID] = f

	go rb.readOutboundLoop(f)

	rb.logger.Info("registered peer on relay bridge", "peer_id", peerID, "relay_port", f.port)
	return f.port, nil
}

// UnregisterPeer removes a peer's loopback forwarder.
func (rb *RelayBridge) UnregisterPeer(peerID types.ID) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	if f, exists := rb.forwarders[peerID]; exists {
		_ = f.conn.Close()
		delete(rb.forwarders, peerID)
		rb.logger.Info("unregistered peer from relay bridge", "peer_id", peerID)
	}
}

// GetPeerPort returns the allocated loopback port for a peer, if registered.
func (rb *RelayBridge) GetPeerPort(peerID types.ID) (int, bool) {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if f, exists := rb.forwarders[peerID]; exists {
		return f.port, true
	}
	return 0, false
}

// readOutboundLoop receives WireGuard UDP packets from localhost and sends them via WebSocket to the peer.
func (rb *RelayBridge) readOutboundLoop(f *peerForwarder) {
	buf := make([]byte, 2048)
	for {
		select {
		case <-rb.closed:
			return
		default:
		}

		n, raddr, err := f.conn.ReadFrom(buf)
		if err != nil {
			return
		}
		if n == 0 {
			continue
		}

		f.mu.Lock()
		f.lastWgAddr = raddr
		f.mu.Unlock()

		if rb.relayClient != nil && rb.relayClient.IsConnected() {
			if err := rb.relayClient.Send(f.peerID, buf[:n]); err != nil {
				rb.logger.Debug("failed to send packet over relay client", "peer_id", f.peerID, "error", err)
			}
		}
	}
}

// handleInboundFrame receives decrypted WebSocket frames from the relay and injects them into WireGuard.
func (rb *RelayBridge) handleInboundFrame(senderID types.ID, payload []byte) {
	rb.mu.RLock()
	f, exists := rb.forwarders[senderID]
	rb.mu.RUnlock()

	if !exists || f == nil {
		return
	}

	f.mu.Lock()
	targetAddr := f.lastWgAddr
	f.mu.Unlock()

	if targetAddr == nil {
		targetAddr = &net.UDPAddr{
			IP:   net.IPv4(127, 0, 0, 1),
			Port: rb.targetWgPort,
		}
	}

	_, _ = f.conn.WriteTo(payload, targetAddr)
}

// Close tears down all forwarders and closes the bridge.
func (rb *RelayBridge) Close() error {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	select {
	case <-rb.closed:
		return nil
	default:
		close(rb.closed)
	}

	for _, f := range rb.forwarders {
		_ = f.conn.Close()
	}
	rb.forwarders = make(map[types.ID]*peerForwarder)
	return nil
}
