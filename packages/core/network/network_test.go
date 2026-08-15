package network

import (
	"testing"
)

type mockTunnel struct {
	active bool
	path   Path
}

func (m *mockTunnel) Connect(path Path) error {
	m.path = path
	m.active = true
	return nil
}

func (m *mockTunnel) Close() error {
	m.active = false
	return nil
}

func (m *mockTunnel) IsActive() bool {
	return m.active
}

func TestNetworkTypes(t *testing.T) {
	if PathTypeDirect != "DIRECT" {
		t.Errorf("Expected PathTypeDirect to be DIRECT, got %s", PathTypeDirect)
	}
	if PathTypeRelay != "RELAY" {
		t.Errorf("Expected PathTypeRelay to be RELAY, got %s", PathTypeRelay)
	}

	iface := Interface{
		Name:    "zoop0",
		Address: "100.64.0.2",
		IsUp:    true,
	}
	if iface.Name != "zoop0" || iface.Address != "100.64.0.2" || !iface.IsUp {
		t.Errorf("Unexpected interface values: %+v", iface)
	}

	path := Path{
		Type:       PathTypeDirect,
		LocalAddr:  "192.168.1.50:51820",
		RemoteAddr: "198.51.100.2:51820",
	}
	if path.Type != PathTypeDirect || path.LocalAddr != "192.168.1.50:51820" || path.RemoteAddr != "198.51.100.2:51820" {
		t.Errorf("Unexpected path values: %+v", path)
	}

	// Test Tunnel interface implementation
	var tun Tunnel = &mockTunnel{}
	if tun.IsActive() {
		t.Errorf("Expected mock tunnel to be inactive initially")
	}

	if err := tun.Connect(path); err != nil {
		t.Fatalf("Unexpected connect error: %v", err)
	}
	if !tun.IsActive() {
		t.Errorf("Expected mock tunnel to be active after Connect()")
	}

	if err := tun.Close(); err != nil {
		t.Fatalf("Unexpected close error: %v", err)
	}
	if tun.IsActive() {
		t.Errorf("Expected mock tunnel to be inactive after Close()")
	}
}
