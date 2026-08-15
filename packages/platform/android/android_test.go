package android

import (
	"testing"
)

func TestAndroidLifecycle(t *testing.T) {
	// Notify without init should not panic
	NotifyNetworkChanged("WIFI")

	// Connect without init should return error
	err := ConnectPeer("invalidkey", "[]", "http://localhost:8080")
	if err == nil {
		t.Errorf("expected error connecting peer when not initialized, got nil")
	}

	// Stop backend gracefully
	StopAndroidBackend()
}
