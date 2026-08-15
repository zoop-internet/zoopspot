package linux

import (
	"testing"
)

func TestDNSManager_Lifecycle(t *testing.T) {
	mgr := NewDNSManager("zoop0")
	if mgr == nil {
		t.Fatalf("Expected non-nil DNSManager")
	}
	if mgr.ifName != "zoop0" {
		t.Errorf("Expected ifName zoop0, got %s", mgr.ifName)
	}

	// Empty servers should return nil immediately without executing commands
	if err := mgr.SetDNS(nil); err != nil {
		t.Errorf("Expected SetDNS(nil) to return nil, got %v", err)
	}
	if err := mgr.SetDNS([]string{}); err != nil {
		t.Errorf("Expected SetDNS([]) to return nil, got %v", err)
	}
}
