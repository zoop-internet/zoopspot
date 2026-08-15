package telemetry_test

import (
	"testing"

	"github.com/zoop-internet/zoop/packages/agent/telemetry"
)

func TestTracker_RecordAndRetrieve(t *testing.T) {
	tracker := telemetry.GetTracker()

	peerID := "peer-telemetry-test-xyz"
	tracker.RecordConnectionState(peerID, "relayed", "relayed", 42.5, 1.2)
	tracker.RecordPacketStats(peerID, "zoop0", 1024, 2048)

	snaps := tracker.GetSnapshots()
	var found bool
	for _, snap := range snaps {
		if snap.PeerID == peerID {
			found = true
			if snap.State != "relayed" {
				t.Errorf("expected state relayed, got %s", snap.State)
			}
			if snap.PathType != "relayed" {
				t.Errorf("expected path_type relayed, got %s", snap.PathType)
			}
			if snap.HandshakeRTTMs != 42.5 {
				t.Errorf("expected RTT 42.5ms, got %f", snap.HandshakeRTTMs)
			}
			if snap.PacketLossPercent != 1.2 {
				t.Errorf("expected loss 1.2%%, got %f", snap.PacketLossPercent)
			}
			if snap.RxBytes != 1024 || snap.TxBytes != 2048 {
				t.Errorf("unexpected byte stats: rx=%d, tx=%d", snap.RxBytes, snap.TxBytes)
			}
		}
	}

	if !found {
		t.Fatalf("expected to find snapshot for peer %s", peerID)
	}

	// Update packet stats incrementally
	tracker.RecordPacketStats(peerID, "zoop0", 2048, 4096)
	snaps2 := tracker.GetSnapshots()
	for _, snap := range snaps2 {
		if snap.PeerID == peerID {
			if snap.RxBytes != 2048 || snap.TxBytes != 4096 {
				t.Errorf("expected updated rx=2048, tx=4096, got rx=%d, tx=%d", snap.RxBytes, snap.TxBytes)
			}
		}
	}
}
