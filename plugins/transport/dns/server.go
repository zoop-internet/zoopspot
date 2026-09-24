package dns

import (
	"context"
	"errors"
	"log/slog"
	"net"
)

// Server is the authoritative DNS frame reassembler.
// It listens on UDP port 53, parses incoming tunnel queries, reconstructs
// WireGuard frames from the base32 label chunks, and forwards them to the
// local relay bridge.
//
// Status: Phase 3 stub — the NS record delegation and upstream forwarding
// are not yet implemented. The struct and Start() signature are defined so
// the caller interface is stable.
type Server struct {
	// ListenAddr is the UDP address to bind to, e.g. ":53".
	ListenAddr string

	// TunnelDomain is the zone this server is authoritative for, e.g. "tunnel.zoop.network".
	TunnelDomain string

	// UpstreamAddr is the address of the Zoop relay bridge that reassembled
	// frames are forwarded to, e.g. "127.0.0.1:51820".
	UpstreamAddr string

	// Logger for diagnostic output.
	Logger *slog.Logger

	conn *net.UDPConn
}

// Start binds the UDP listener and begins processing DNS tunnel queries.
// Returns ErrNotImplemented until Phase 3.
func (s *Server) Start(_ context.Context) error {
	return errors.New("dns server: not yet implemented; deploy authoritative NS in Phase 3")
}

// Close shuts down the DNS listener.
func (s *Server) Close() error {
	if s.conn != nil {
		return s.conn.Close()
	}
	return nil
}
