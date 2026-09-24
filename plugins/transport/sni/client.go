package sni

import (
	"context"
	"net"
	"time"

	"github.com/gorilla/websocket"
)

// NewWebSocketDialer returns a gorilla/websocket Dialer that routes TLS
// connections through the given SNI Dialer.
//
// Pass this to relay.RelayClient.WithCustomDialer() to enable carrier
// zero-balance mode for a specific relay connection.
//
// Example — MTN Uganda zero-balance mode:
//
//	d := sni.New("mtn-ug", "relay.zoop.network")
//	wsDialer := sni.NewWebSocketDialer(d)
//	relayClient.WithCustomDialer(wsDialer)
func NewWebSocketDialer(d *Dialer) websocket.Dialer {
	return websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
		// NetDialTLSContext intercepts the TLS dial so we can inject our
		// SNI-masked connection before gorilla performs the WebSocket upgrade.
		NetDialTLSContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return d.Dial(ctx, network, addr)
		},
	}
}
