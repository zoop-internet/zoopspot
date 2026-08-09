package client

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
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
	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	
	sig := ed25519.Sign(s.PrivateKey, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	headers := http.Header{}
	headers.Set("X-Zoop-Identity", s.Identity.EndpointID.String())
	headers.Set("X-Zoop-Signature", sigStr)
	headers.Set("X-Zoop-Timestamp", ts)

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

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		s.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		
		var msg types.SignalingMessage
		if err := s.conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				s.Logger.Info("signaling disconnected", "error", err)
			}
			return // Break out to trigger reconnect loop
		}

		s.Logger.Info("received signaling message", 
			"type", msg.Type, 
			"sender", msg.SenderID,
			"payload", string(msg.Payload),
		)
		
		// Here we will handle connection requests/responses in future milestones
	}
}
