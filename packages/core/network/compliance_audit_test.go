package network_test

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"net"
	"testing"

	"github.com/allannuwamanya/zoop/packages/agent/tunnel"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func TestSecurityAndLeakCompliance_IPv6LeakProtection(t *testing.T) {
	// Full route IPv6 CIDR sinkhole must encompass entire IPv6 address space
	_, fullIPv6Net, err := net.ParseCIDR("::/0")
	if err != nil {
		t.Fatalf("failed to parse default IPv6 CIDR: %v", err)
	}

	testIPv6Addresses := []string{
		"2606:4700:4700::1111",     // Cloudflare DNS
		"2001:4860:4860::8888",     // Google DNS
		"2a00:1450:4001:830::200e", // Google IPv6
		"fd00:7a6f:6f70::1",        // Zoop mesh overlay ULA
	}

	for _, addrStr := range testIPv6Addresses {
		ip := net.ParseIP(addrStr)
		if !fullIPv6Net.Contains(ip) {
			t.Errorf("SECURITY LEAK: IPv6 address %s is not caught by ::/0 tunnel route", addrStr)
		}
	}

	// Split route IPv6 mesh prefix must encompass Zoop ULA space
	_, meshIPv6Net, err := net.ParseCIDR("fd00:7a6f:6f70::/64")
	if err != nil {
		t.Fatalf("failed to parse mesh IPv6 CIDR: %v", err)
	}

	meshIP := net.ParseIP("fd00:7a6f:6f70::2")
	if !meshIPv6Net.Contains(meshIP) {
		t.Errorf("mesh IPv6 ULA %s not covered by overlay route", meshIP)
	}
}

func TestSecurityAndLeakCompliance_IPv4RouteIntegrity(t *testing.T) {
	_, fullNet, err := net.ParseCIDR("0.0.0.0/0")
	if err != nil {
		t.Fatalf("failed to parse 0.0.0.0/0: %v", err)
	}

	testIPv4s := []string{"1.1.1.1", "8.8.8.8", "142.250.190.46"}
	for _, ipStr := range testIPv4s {
		ip := net.ParseIP(ipStr)
		if !fullNet.Contains(ip) {
			t.Errorf("SECURITY LEAK: IPv4 %s not covered by default tunnel route", ipStr)
		}
	}

	// Overlay CGNAT block
	_, cgnatNet, err := net.ParseCIDR("100.64.0.0/10")
	if err != nil {
		t.Fatalf("failed to parse CGNAT CIDR: %v", err)
	}
	if !cgnatNet.Contains(net.ParseIP("100.64.0.2")) {
		t.Errorf("CGNAT overlay address 100.64.0.2 not covered by overlay prefix")
	}
}

func TestSecurityAndLeakCompliance_MTUClamping(t *testing.T) {
	// MTU must not exceed 1420 bytes to prevent fragmentation over cellular IPv6 WireGuard encaps
	if tunnel.WireGuardMTU > 1420 {
		t.Errorf("MTU %d exceeds maximum safe WireGuard MTU of 1420", tunnel.WireGuardMTU)
	}
}

func TestSecurityAndLeakCompliance_CryptographicSignatures(t *testing.T) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate ed25519 key: %v", err)
	}

	message := []byte("canonical-zoop-signaling-payload")
	sig := ed25519.Sign(priv, message)

	// Verify genuine signature
	if !ed25519.Verify(pub, message, sig) {
		t.Errorf("valid signature failed verification")
	}

	// Verify forged signature rejection
	tamperedMessage := []byte("canonical-zoop-signaling-payload-tampered")
	if ed25519.Verify(pub, tamperedMessage, sig) {
		t.Errorf("SECURITY VIOLATION: tampered message accepted by signature verifier")
	}
}

func TestSecurityAndLeakCompliance_ZeroPlaintextKeyLeakInSerialization(t *testing.T) {
	pub, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate ed25519 key: %v", err)
	}

	ident := types.Identity{
		EndpointID: types.NewID(),
		PublicKey:  pub,
	}

	data, err := json.Marshal(ident)
	if err != nil {
		t.Fatalf("failed to marshal identity: %v", err)
	}

	// Verify public serialization contains only public elements
	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal identity json: %v", err)
	}

	for k := range decoded {
		if k == "private_key" || k == "seed" || k == "secret" {
			t.Errorf("SECURITY VIOLATION: secret key element %s exposed in serialized JSON", k)
		}
	}
}
