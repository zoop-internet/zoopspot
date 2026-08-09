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
	apiClient *APIClient
	Logger    *slog.Logger

	conn *websocket.Conn
}

// NewSignalingClient creates a new WebSocket client.
func NewSignalingClient(apiClient *APIClient, logger *slog.Logger) *SignalingClient {
	return &SignalingClient{
		apiClient: apiClient,
		Logger:    logger,
	}
}

// Connect attempts to establish and maintain the WebSocket connection.
// It runs a reconnect loop until the context is canceled.
func (s *SignalingClient) Connect(ctx context.Context) {
	// Convert http(s):// to ws(s)://
	wsURL := strings.Replace(s.apiClient.BaseURL, "http://", "ws://", 1)
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
		
		s.resync(ctx)

		// Run the read/write loop until it breaks
		s.pump(ctx)
	}
}

func (s *SignalingClient) dial(ctx context.Context, wsURL string) error {
	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	
	sig := ed25519.Sign(s.apiClient.PrivateKey, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	headers := http.Header{}
	headers.Set("X-Zoop-Identity", s.apiClient.Identity.EndpointID.String())
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

func (s *SignalingClient) resync(ctx context.Context) {
	s.Logger.Info("signaling resyncing missed connection states")
	// Future: Fetch pending connections from Cloud API when the endpoint exists.
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
		
		s.handleMessage(ctx, msg)
	}
}

func (s *SignalingClient) handleMessage(ctx context.Context, msg types.SignalingMessage) {
	switch msg.Type {
	case types.SignalingTypeConnectionRequest:
		s.Logger.Info("processing connection request", "sender_id", msg.SenderID)
		
		// Local Peer Authorization: for M5, we accept all requests for testing.
		// In production, this would validate against local policy.
		authorized := true
		
		if authorized {
			s.Logger.Info("connection request authorized locally")
			
			// We need the connection ID to update state. 
			// Assuming the payload contains it, or we reply via signaling.
			reply := types.SignalingMessage{
				Type:        types.SignalingTypeConnectionAccepted,
				SenderID:    s.apiClient.Identity.EndpointID,
				RecipientID: msg.SenderID,
			}
			
			if err := s.conn.WriteJSON(reply); err != nil {
				s.Logger.Error("failed to send accepted signaling response", "error", err)
			}
		} else {
			s.Logger.Info("connection request denied locally")
			reply := types.SignalingMessage{
				Type:        types.SignalingTypeConnectionRejected,
				SenderID:    s.apiClient.Identity.EndpointID,
				RecipientID: msg.SenderID,
			}
			s.conn.WriteJSON(reply)
		}
	}
}

