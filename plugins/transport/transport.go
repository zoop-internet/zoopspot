// Package transport defines the pluggable underlay interface used by the Zoop
// relay client to bypass carrier data gates on zero-balance SIM cards.
//
// The architecture sits between the WireGuard engine and the physical network:
//
//	[WireGuard UDP] → [RelayBridge] → [RelayClient] → [Transport] → [Cell Tower / DPI] → [Internet]
//
// Two concrete implementations are provided:
//   - sni: SNI-masked WebSocket over TLS port 443 (high speed, recommended)
//   - dns: SlowDNS tunnel over UDP port 53 (fallback, guaranteed penetration)
package transport

import (
	"context"
	"net"
	"net/http"
	"sync"
)

// Transport is the pluggable underlay interface. An implementation wraps
// WireGuard relay frames inside a carrier-permitted protocol so they cross
// the telecom's packet gateway even when the SIM balance is 0 MB.
type Transport interface {
	// Name is the stable identifier used to look up this transport in the registry.
	Name() string

	// Dial opens a raw network connection to addr (host:port) through the
	// transport underlay. The caller (typically a WebSocket dialer) wraps
	// the returned conn in TLS and the WebSocket upgrade.
	Dial(ctx context.Context, network, addr string) (net.Conn, error)

	// Headers returns extra HTTP headers to attach to the WebSocket upgrade
	// request. Used for domain fronting (e.g. Host: real-relay.zoop.network).
	// Returns nil when no extra headers are needed.
	Headers() http.Header
}

// Direct is the default no-op transport: plain TCP connection with no masking.
// It matches the existing RelayClient behaviour before transport plugins were added.
type Direct struct{}

func (Direct) Name() string { return "direct" }

func (Direct) Dial(ctx context.Context, network, addr string) (net.Conn, error) {
	var d net.Dialer
	return d.DialContext(ctx, network, addr)
}

func (Direct) Headers() http.Header { return nil }

var (
	mu       sync.RWMutex
	registry = map[string]Transport{"direct": Direct{}}
)

// Register adds a transport to the global registry under its Name().
// Call from an init() function in the sni or dns sub-packages to auto-register.
func Register(t Transport) {
	mu.Lock()
	defer mu.Unlock()
	registry[t.Name()] = t
}

// Get returns the named transport. Returns Direct if the name is not registered.
func Get(name string) Transport {
	mu.RLock()
	defer mu.RUnlock()
	if t, ok := registry[name]; ok {
		return t
	}
	return Direct{}
}

// List returns all registered transport names.
func List() []string {
	mu.RLock()
	defer mu.RUnlock()
	names := make([]string, 0, len(registry))
	for name := range registry {
		names = append(names, name)
	}
	return names
}
