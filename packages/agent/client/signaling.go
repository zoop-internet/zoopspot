package client

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// SignalingClient manages the persistent WebSocket connection to the Control Plane.
type SignalingClient struct {
	BaseURL    string
	Identity   types.Identity
	PrivateKey ed25519.PrivateKey
	Logger     *slog.Logger

	conn *websocket.Conn
}

// NewSignalingClient creates a new WebSocket client.
func NewSignalingClient(baseURL string, ident types.Identity, priv ed25519.PrivateKey, logger *slog.Logger) *SignalingClient {
	return &SignalingClient{
		BaseURL:    baseURL,
		Identity:   ident,
		PrivateKey: priv,
		Logger:     logger,
	}
}

// Connect attempts to establish and maintain the WebSocket connection.
// It runs a reconnect loop until the context is canceled.
func (s *SignalingClient) Connect(ctx context.Context) {
	// Convert http(s):// to ws(s)://
	wsURL := strings.Replace(s.BaseURL, "http://", "ws://", 1)
	wsURL = strings.Replace(wsURL, "https://", "wss://", 1)
	wsURL = wsURL + "/v1/signaling"

	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for {
		select {
		case <-ctx.Done():
			if s.conn != nil {
				s.conn.Close()
			}
			return
		default:
		}

		err := s.dial(ctx, wsURL)
		if err != nil {
			s.Logger.Error("signaling connection failed", "error", err, "retry_in", backoff)
			
			// Wait before reconnecting
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}

			// Exponential backoff
			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
			continue
		}

		// Reset backoff on successful connect
		backoff = 1 * time.Second
		
		// Run the read/write loop until it breaks
		s.pump(ctx)
	}
}

func (s *SignalingClient) dial(ctx context.Context, wsURL string) error {
	sig := ed25519.Sign(s.PrivateKey, []byte("zoop-m4-auth"))
	sigStr := base64.StdEncoding.EncodeToString(sig)

	headers := http.Header{}
	headers.Set("X-Zoop-Identity", s.Identity.EndpointID.String())
	headers.Set("X-Zoop-Signature", sigStr)

	dialer := websocket.Dialer{
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, wsURL, headers)
	if err != nil {
		return err
	}

	s.conn = conn
	s.Logger.Info("signaling connected to cloud")
	return nil
}

func (s *SignalingClient) pump(ctx context.Context) {
	defer s.conn.Close()

	// Send an initial handshake/echo for Milestone 5
	msg := fmt.Sprintf("hello from agent %s", s.Identity.EndpointID)
	if err := s.conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
		s.Logger.Error("failed to write signaling handshake", "error", err)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		s.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		_, p, err := s.conn.ReadMessage()
		if err != nil {
			s.Logger.Info("signaling disconnected", "error", err)
			return // Break out to trigger reconnect loop
		}

		s.Logger.Debug("received signaling message", "payload", string(p))
	}
}
