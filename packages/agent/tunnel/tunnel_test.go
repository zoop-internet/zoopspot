package tunnel

import (
	"crypto/rand"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
	"os"
	"testing"
)

func TestDeviceManager(t *testing.T) {
	if os.Getuid() != 0 {
		t.Skip("skipping tunnel tests; requires root to create tun device")
	}

	logger := device.NewLogger(device.LogLevelSilent, "")
	mgr, err := NewDeviceManager("zooptest0", logger)
	if err != nil {
		t.Skipf("skipping tunnel tests; failed to create TUN (maybe not root or tun module not loaded): %v", err)
	}
	defer mgr.Close()

	// Generate a private key
	var keyBytes [32]byte
	rand.Read(keyBytes[:])
	privKey, _ := wgtypes.NewKey(keyBytes[:])

	// Test ConfigureDevice
	err = mgr.ConfigureDevice(privKey, 12345)
	if err != nil {
		t.Fatalf("failed to configure device: %v", err)
	}

	// Verify Public Key matches
	if mgr.PublicKey() != privKey.PublicKey() {
		t.Errorf("expected public key %s, got %s", privKey.PublicKey(), mgr.PublicKey())
	}

	// Test GetListenPort
	port, err := mgr.GetListenPort()
	if err != nil {
		t.Fatalf("failed to get listen port: %v", err)
	}
	if port != 12345 {
		t.Errorf("expected listen port 12345, got %d", port)
	}

	// Test AddPeer
	var peerKeyBytes [32]byte
	rand.Read(peerKeyBytes[:])
	peerPubKey, _ := wgtypes.NewKey(peerKeyBytes[:])

	err = mgr.AddPeer(peerPubKey, "127.0.0.1", 54321, []string{"10.0.0.2/32"})
	if err != nil {
		t.Fatalf("failed to add peer: %v", err)
	}

	// Test RemovePeer
	err = mgr.RemovePeer(peerPubKey)
	if err != nil {
		t.Fatalf("failed to remove peer: %v", err)
	}
}
