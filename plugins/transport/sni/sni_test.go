package sni

import (
	"context"
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDialerName(t *testing.T) {
	d := &Dialer{}
	if d.Name() != "sni" {
		t.Fatalf("expected name 'sni', got %q", d.Name())
	}
}

func TestDialerHeaders_WithRealHost(t *testing.T) {
	d := &Dialer{RealHost: "relay.zoop.network"}
	h := d.Headers()
	if h == nil {
		t.Fatal("expected non-nil headers when RealHost is set")
	}
	if got := h.Get("Host"); got != "relay.zoop.network" {
		t.Fatalf("expected Host header 'relay.zoop.network', got %q", got)
	}
}

func TestDialerHeaders_NoRealHost(t *testing.T) {
	d := &Dialer{}
	if d.Headers() != nil {
		t.Fatal("expected nil headers when RealHost is empty")
	}
}

func TestNewWithKnownCarrier(t *testing.T) {
	d := New("mtn-ug", "relay.zoop.network")
	if d.FrontDomain != "pass.mtn.co.ug" {
		t.Fatalf("expected FrontDomain 'pass.mtn.co.ug', got %q", d.FrontDomain)
	}
	if d.RealHost != "relay.zoop.network" {
		t.Fatalf("expected RealHost 'relay.zoop.network', got %q", d.RealHost)
	}
}

func TestNewWithUnknownCarrier(t *testing.T) {
	d := New("unknown-carrier", "relay.zoop.network")
	if d.FrontDomain != "" {
		t.Fatalf("expected empty FrontDomain for unknown carrier, got %q", d.FrontDomain)
	}
}

// TestDialerNoFront verifies the dialer connects to a plain TLS server when
// FrontDomain is empty (no masking mode).
// RFC 6066 prohibits sending the SNI extension for IP literal addresses, so
// we only verify that the handshake succeeds — not the SNI value itself.
func TestDialerNoFront(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	addr := strings.TrimPrefix(srv.URL, "https://")

	d := &Dialer{InsecureSkipVerify: true}
	conn, err := d.Dial(context.Background(), "tcp", addr)
	if err != nil {
		t.Fatalf("Dial failed: %v", err)
	}
	defer conn.Close()

	if _, ok := conn.(*tls.Conn); !ok {
		t.Fatal("expected *tls.Conn")
	}
}

// TestDialerSNIOverride verifies that FrontDomain replaces the default SNI.
func TestDialerSNIOverride(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	defer srv.Close()

	addr := strings.TrimPrefix(srv.URL, "https://")

	d := &Dialer{
		FrontDomain:        "pass.mtn.co.ug",
		InsecureSkipVerify: true, // cert won't match the fake SNI in test
	}
	conn, err := d.Dial(context.Background(), "tcp", addr)
	if err != nil {
		t.Fatalf("Dial failed: %v", err)
	}
	defer conn.Close()

	tlsConn := conn.(*tls.Conn)
	if tlsConn.ConnectionState().ServerName != "pass.mtn.co.ug" {
		t.Fatalf("expected SNI 'pass.mtn.co.ug', got %q", tlsConn.ConnectionState().ServerName)
	}
}

func TestKnownCarrierFrontsNotEmpty(t *testing.T) {
	if len(KnownCarrierFronts) == 0 {
		t.Fatal("KnownCarrierFronts must not be empty")
	}
	for key, domain := range KnownCarrierFronts {
		if domain == "" {
			t.Errorf("carrier %q has empty front domain", key)
		}
		if !strings.Contains(domain, ".") {
			t.Errorf("carrier %q front domain %q is not a valid hostname", key, domain)
		}
	}
}
