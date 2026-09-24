// Package sni implements Engine A of the Zoop pluggable transport:
// SNI-masked WebSocket over TLS port 443 with optional domain fronting.
//
// How it works:
//  1. A raw TCP connection is opened to the real relay IP (Cloudflare edge).
//  2. The TLS ClientHello sets ServerName = FrontDomain — a carrier-zero-rated
//     hostname (e.g. "pass.mtn.co.ug"). The telecom DPI sees this SNI and
//     permits the connection without deducting the SIM balance.
//  3. The HTTP Host header is set to the real Zoop relay domain so Cloudflare
//     routes the request to the correct backend (domain fronting).
//  4. WireGuard relay frames flow inside the established WebSocket tunnel.
//
// For this to work in production the FrontDomain must be a hostname that:
//   a) is zero-rated by the target carrier (e.g. MTN, Airtel), AND
//   b) is hosted on the same Cloudflare network as the Zoop relay so that
//      the TLS certificate presented by Cloudflare is valid for FrontDomain.
package sni

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
)

// KnownCarrierFronts maps carrier identifiers to known zero-rated hostnames
// that can be used as SNI front domains in their respective markets.
// These domains are zero-rated (free data) on each carrier's network.
// Operators should verify current zero-rated lists before deployment —
// carriers change these policies without notice.
var KnownCarrierFronts = map[string]string{
	"mtn-ug":       "pass.mtn.co.ug",         // MTN Uganda zero-rated education portal
	"airtel-ug":    "selfcare.airtel.co.ug",   // Airtel Uganda self-care portal
	"mtn-ke":       "social.mtn.co.ke",        // MTN Kenya zero-rated social pass
	"safaricom-ke": "www.safaricom.co.ke",     // Safaricom Kenya self-care (zero-rated)
	"mtn-gh":       "mtnplay.com.gh",          // MTN Ghana zero-rated entertainment
	"mtn-ng":       "mtn.com.ng",              // MTN Nigeria zero-rated portal
}

// Dialer implements transport.Transport using SNI masking and optional domain
// fronting. It is the recommended transport for zero-balance SIM scenarios.
type Dialer struct {
	// FrontDomain is written into the TLS ClientHello as the ServerName (SNI).
	// The telecom DPI sees this hostname and permits the connection.
	// If empty, the actual target hostname is used (no masking).
	FrontDomain string

	// RealHost is written into the HTTP Host header so the CDN routes the
	// WebSocket upgrade to the real Zoop relay backend.
	// Only relevant when using Cloudflare domain fronting.
	// If empty, no Host override header is added.
	RealHost string

	// InsecureSkipVerify disables TLS certificate verification.
	// Set to true only for development or when the FrontDomain cert is
	// intentionally mismatched with the real server.
	// In production Cloudflare domain fronting this is NOT needed because
	// Cloudflare presents a cert that is valid for FrontDomain.
	InsecureSkipVerify bool
}

func (d *Dialer) Name() string { return "sni" }

// Dial opens a TCP connection to addr, then performs a TLS handshake with
// SNI set to FrontDomain (or the real host if FrontDomain is empty).
func (d *Dialer) Dial(ctx context.Context, network, addr string) (net.Conn, error) {
	rawConn, err := (&net.Dialer{}).DialContext(ctx, network, addr)
	if err != nil {
		return nil, err
	}

	serverName := d.FrontDomain
	if serverName == "" {
		// No masking: derive SNI from the address as TLS normally would.
		host, _, splitErr := net.SplitHostPort(addr)
		if splitErr != nil {
			host = addr
		}
		serverName = host
	}

	tlsConn := tls.Client(rawConn, &tls.Config{
		ServerName:         serverName,
		InsecureSkipVerify: d.InsecureSkipVerify, //nolint:gosec // intentional for domain fronting
		MinVersion:         tls.VersionTLS12,
	})

	if err := tlsConn.HandshakeContext(ctx); err != nil {
		_ = rawConn.Close()
		return nil, err
	}
	return tlsConn, nil
}

// Headers returns the HTTP headers required for domain fronting.
// The Host header tells Cloudflare to route to the real Zoop relay backend.
func (d *Dialer) Headers() http.Header {
	if d.RealHost == "" {
		return nil
	}
	h := http.Header{}
	h.Set("Host", d.RealHost)
	return h
}

// New creates a Dialer for a named carrier using a known front domain.
// Returns a Dialer with no masking if the carrier is not found in KnownCarrierFronts.
func New(carrierKey, realRelayHost string) *Dialer {
	front := KnownCarrierFronts[carrierKey]
	return &Dialer{
		FrontDomain: front,
		RealHost:    realRelayHost,
	}
}
