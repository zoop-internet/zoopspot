package tunnel

import (
	"crypto/ed25519"
	"log/slog"
	"net"
	"testing"
	"time"

	agentrelay "github.com/allannuwamanya/zoop/packages/agent/relay"
	"github.com/allannuwamanya/zoop/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

func TestRelayBridge_LifecycleAndPacketForwarding(t *testing.T) {
	pub, priv, _ := ed25519.GenerateKey(nil)
	ident := types.Identity{EndpointID: types.NewID(), PublicKey: pub}
	relayClient := agentrelay.NewClient("ws://127.0.0.1:9999", ident, priv, slog.Default())

	// Create a dummy UDP listener simulating WireGuard on loopback
	wgListener, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 0})
	if err != nil {
		t.Fatalf("failed to create wg mock listener: %v", err)
	}
	defer wgListener.Close()
	wgPort := wgListener.LocalAddr().(*net.UDPAddr).Port

	bridge := NewRelayBridge(relayClient, wgPort, slog.Default())
	defer bridge.Close()

	peerID := types.NewID()
	peerKey, _ := wgtypes.GenerateKey()

	// 1. Test RegisterPeer
	bridgePort, err := bridge.RegisterPeer(peerID, peerKey)
	if err != nil {
		t.Fatalf("failed to register peer on bridge: %v", err)
	}
	if bridgePort <= 0 {
		t.Fatalf("invalid bridge port allocated: %d", bridgePort)
	}

	// Verify idempotency
	samePort, err := bridge.RegisterPeer(peerID, peerKey)
	if err != nil || samePort != bridgePort {
		t.Fatalf("expected same port %d, got %d (err: %v)", bridgePort, samePort, err)
	}

	// 2. Test Inbound Frame Injection (Relay -> WireGuard)
	testPayload := []byte("WIREGUARD_ENCRYPTED_PACKET_TEST_PAYLOAD")
	bridge.handleInboundFrame(peerID, testPayload)

	recvBuf := make([]byte, 1024)
	_ = wgListener.SetReadDeadline(time.Now().Add(1 * time.Second))
	n, fromAddr, err := wgListener.ReadFrom(recvBuf)
	if err != nil {
		t.Fatalf("expected inbound packet delivered to WireGuard port: %v", err)
	}
	if string(recvBuf[:n]) != string(testPayload) {
		t.Fatalf("payload mismatch: expected %s, got %s", testPayload, recvBuf[:n])
	}
	if fromUDP, ok := fromAddr.(*net.UDPAddr); !ok || fromUDP.Port != bridgePort {
		t.Fatalf("expected packet from bridge port %d, got %v", bridgePort, fromAddr)
	}

	// 3. Test UnregisterPeer
	bridge.UnregisterPeer(peerID)
	if _, ok := bridge.GetPeerPort(peerID); ok {
		t.Fatalf("expected peer to be unregistered")
	}
}
