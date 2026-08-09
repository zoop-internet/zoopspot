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

	"encoding/json"

	"github.com/gorilla/websocket"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// SignalingClient manages the persistent WebSocket connection to the Control Plane.
type SignalingClient struct {
	apiClient     *APIClient
	Logger        *slog.Logger
	tunnelManager *tunnel.DeviceManager

	conn *websocket.Conn
}

// NewSignalingClient creates a new WebSocket client.
func NewSignalingClient(apiClient *APIClient, tunnelManager *tunnel.DeviceManager, logger *slog.Logger) *SignalingClient {
	return &SignalingClient{
		apiClient:     apiClient,
		tunnelManager: tunnelManager,
		Logger:        logger,
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

		var payload types.ConnectionPayload
		if len(msg.Payload) > 0 {
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				s.Logger.Error("failed to unmarshal connection payload", "error", err)
				return
			}
		}

		// Local Peer Authorization: for M5/M6, we accept all requests for testing.
		authorized := true

		if authorized {
			s.Logger.Info("connection request authorized locally")

			var replyPayload types.ConnectionPayload
			replyPayload.ConnectionID = payload.ConnectionID
			replyPayload.ProviderIP = payload.ProviderIP
			replyPayload.RecipientIP = payload.RecipientIP

			if s.tunnelManager != nil {
				// Provider gets its own info
				replyPayload.WireGuardPublicKey = s.tunnelManager.PublicKey().String()
				replyPayload.EndpointIP = "127.0.0.1" // Hardcoded for local testing (NAT traversal is M10)
				port, _ := s.tunnelManager.GetListenPort()
				replyPayload.EndpointPort = port

				if payload.WireGuardPublicKey != "" {
					s.Logger.Info("received peer wireguard public key, configuring tunnel")
					peerKey, err := tunnel.ParsePublicKey(payload.WireGuardPublicKey)
					if err == nil {
						// For testing, route the peer's IP
						allowedIPs := []string{payload.RecipientIP + "/32"}

						// In a real scenario we'd use STUN to get EndpointIP. Here we don't have the Recipient's EndpointIP yet,
						// WireGuard handles this well if the Recipient initiates packets to us.
						// But if the Recipient sent EndpointIP/Port, we'd use it. For now, empty string is fine.
						err = s.tunnelManager.AddPeer(peerKey, payload.EndpointIP, payload.EndpointPort, allowedIPs)
						if err != nil {
							s.Logger.Error("failed to configure wireguard peer", "error", err)
						} else {
							s.Logger.Info("wireguard peer configured successfully on provider")
						}
					}
				}

				// Assign ProviderIP to the TUN interface
				if payload.ProviderIP != "" {
					s.tunnelManager.AssignIP(payload.ProviderIP)
				}
			}

			replyBytes, _ := json.Marshal(replyPayload)

			reply := types.SignalingMessage{
				Type:        types.SignalingTypeConnectionAccepted,
				SenderID:    s.apiClient.Identity.EndpointID,
				RecipientID: msg.SenderID,
				Payload:     replyBytes,
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
	case types.SignalingTypeConnectionAccepted:
		s.Logger.Info("connection accepted by peer", "sender_id", msg.SenderID)

		var payload types.ConnectionPayload
		if len(msg.Payload) > 0 {
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				s.Logger.Error("failed to unmarshal connection payload", "error", err)
				return
			}
		}

		if s.tunnelManager != nil && payload.WireGuardPublicKey != "" {
			peerKey, err := tunnel.ParsePublicKey(payload.WireGuardPublicKey)
			if err != nil {
				s.Logger.Error("failed to parse peer wireguard public key", "error", err)
				return
			}

			allowedIPs := []string{"0.0.0.0/0"} // For testing, route everything or just ProviderIP
			if payload.ProviderIP != "" {
				allowedIPs = []string{payload.ProviderIP + "/32"}
			}

			err = s.tunnelManager.AddPeer(peerKey, payload.EndpointIP, payload.EndpointPort, allowedIPs)
			if err != nil {
				s.Logger.Error("failed to configure wireguard peer", "error", err)
			} else {
				s.Logger.Info("wireguard peer configured successfully on recipient", "endpoint", fmt.Sprintf("%s:%d", payload.EndpointIP, payload.EndpointPort))
			}

			// Assign RecipientIP to the TUN interface
			if payload.RecipientIP != "" {
				s.tunnelManager.AssignIP(payload.RecipientIP)
			}
		}
	}
}
