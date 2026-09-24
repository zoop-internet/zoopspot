// Package dns implements Engine B of the Zoop pluggable transport:
// a SlowDNS tunnel over UDP port 53.
//
// # How it works
//
// Telecoms leave UDP port 53 (DNS) open even with 0 MB balance so that
// devices can resolve carrier top-up and self-care portals. This tunnel
// encodes WireGuard frames as DNS queries to Zoop's authoritative nameserver:
//
//	[WireGuard frame]
//	  → base32-encode into chunks of ≤ 50 chars
//	  → send as DNS TXT queries: {sessionID}.{seq}.{total}.{chunk}.tunnel.zoop.network
//	  → Zoop authoritative NS receives query, strips labels, reconstructs frame
//	  → Response carries outbound frame in TXT answer record
//
// Throughput is roughly 5–15 kbps (enough for WhatsApp text, not video).
// Use this only as an emergency fallback when Engine A (SNI WebSocket) fails.
//
// # Status: Phase 2 stub
//
// The encoder (frame → DNS labels) is fully implemented and tested.
// The UDP DNS dial loop is stubbed — it returns ErrNotImplemented until
// Phase 3 (cloud relay bridge integration) provides the authoritative NS.
package dns

import (
	"context"
	"encoding/base32"
	"errors"
	"fmt"
	"net"
	"net/http"
)

// ErrNotImplemented is returned by Client.Dial until the DNS tunnel server
// (dns/server.go) is wired into the Zoop relay in Phase 3.
var ErrNotImplemented = errors.New("dns transport: server-side not yet deployed; use sni transport")

// maxLabelLen is the maximum number of base32 characters per DNS label.
// RFC 1035 limits labels to 63 octets; base32 uses only ASCII so 1 char = 1 byte.
// We use 50 to leave room for the session/seq prefix labels.
const maxLabelLen = 50

// encoding is lowercase base32 without padding for DNS-safe encoding.
var encoding = base32.NewEncoding("abcdefghijklmnopqrstuvwxyz234567").WithPadding(base32.NoPadding)

// EncodeFrame splits a WireGuard frame into DNS query name components.
// Each returned string is one chunk of at most maxLabelLen base32 characters
// suitable for embedding in a DNS label.
//
// The caller assembles the full query name as:
//
//	{sessionID}.{seqHex4}.{totalHex4}.{chunk}.{tunnelDomain}
func EncodeFrame(frame []byte) []string {
	encoded := encoding.EncodeToString(frame)
	var chunks []string
	for len(encoded) > 0 {
		end := maxLabelLen
		if end > len(encoded) {
			end = len(encoded)
		}
		chunks = append(chunks, encoded[:end])
		encoded = encoded[end:]
	}
	return chunks
}

// DecodeChunks reassembles chunks from EncodeFrame back into the original frame.
func DecodeChunks(chunks []string) ([]byte, error) {
	var sb string
	for _, c := range chunks {
		sb += c
	}
	return encoding.DecodeString(sb)
}

// QueryName builds the DNS query name for one chunk of a fragmented frame.
//
//	sessionID  - 8-char hex session identifier (prevents cross-session collisions)
//	seq        - 0-based chunk index in this frame
//	total      - total number of chunks for this frame
//	chunk      - base32-encoded payload from EncodeFrame
//	domain     - Zoop authoritative tunnel domain (e.g. "tunnel.zoop.network")
func QueryName(sessionID string, seq, total int, chunk, domain string) string {
	return fmt.Sprintf("%s.%04x.%04x.%s.%s", sessionID, seq, total, chunk, domain)
}

// Client is the DNS tunnel transport client (Engine B).
type Client struct {
	// NameServer is the upstream DNS resolver to send queries to.
	// Should point to the nearest Zoop-authoritative resolver, e.g. "3.70.135.200:53".
	NameServer string

	// TunnelDomain is the authoritative zone for the tunnel, e.g. "tunnel.zoop.network".
	TunnelDomain string
}

func (c *Client) Name() string { return "dns" }

// Dial is not yet implemented. The DNS transport requires a deployed
// authoritative nameserver (see dns/server.go). Returns ErrNotImplemented.
func (c *Client) Dial(_ context.Context, _, _ string) (net.Conn, error) {
	return nil, ErrNotImplemented
}

func (c *Client) Headers() http.Header { return nil }
