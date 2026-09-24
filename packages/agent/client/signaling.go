package client

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/allannuwamanya/zoop/packages/agent/tunnel"
	"github.com/allannuwamanya/zoop/packages/core/types"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// SignalingClient manages the persistent WebSocket connection to the Control Plane.
type SignalingClient struct {
	apiClient     *APIClient
	Logger        *slog.Logger
	tunnelManager *tunnel.DeviceManager

	conn *websocket.Conn

	// activeConns tracks established tunnels (connection_id -> peer key) so a
	// disconnect can tear down the right WireGuard peer.
	activeMu    sync.Mutex
	activeConns map[types.ID]wgtypes.Key
	connPeers   map[types.ID]types.ID
	relayBridge *tunnel.RelayBridge
}

// NewSignalingClient creates a new WebSocket client.
func NewSignalingClient(apiClient *APIClient, tunnelManager *tunnel.DeviceManager, logger *slog.Logger) *SignalingClient {
	return &SignalingClient{
		apiClient:     apiClient,
		tunnelManager: tunnelManager,
		Logger:        logger,
		activeConns:   make(map[types.ID]wgtypes.Key),
		connPeers:     make(map[types.ID]types.ID),
	}
}

// SetRelayBridge assigns the local relay fallback bridge for transparent DERP failover.
func (s *SignalingClient) SetRelayBridge(rb *tunnel.RelayBridge) {
	s.relayBridge = rb
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

		s.Resync(ctx)

		// Run the read/write loop until it breaks
		s.pump(ctx)
	}
}

func (s *SignalingClient) dial(ctx context.Context, wsURL string) error {
	ts := time.Now().Format(time.RFC3339)
	nonce := uuid.New().String()
	payload := []byte(fmt.Sprintf("zoop-auth-v2|GET|/v1/signaling|%s|%s|", ts, nonce))

	sig := ed25519.Sign(s.apiClient.PrivateKey, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	headers := http.Header{}
	headers.Set("X-Zoop-Identity", s.apiClient.Identity.EndpointID.String())
	headers.Set("X-Zoop-Signature", sigStr)
	headers.Set("X-Zoop-Timestamp", ts)
	headers.Set("X-Zoop-Nonce", nonce)

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

func (s *SignalingClient) Resync(ctx context.Context) {
	s.Logger.Info("signaling resyncing missed connection states")

	pending, err := s.apiClient.GetPendingConnections(ctx, s.apiClient.Identity.EndpointID)
	if err != nil {
		s.Logger.Error("failed to fetch pending connections during resync", "error", err)
		return
	}

	for _, conn := range pending {
		if conn.ProviderID == s.apiClient.Identity.EndpointID {
			s.Logger.Info("found pending connection request, simulating signaling message", "connection_id", conn.ID)

			endpoints, err := s.apiClient.DiscoverEndpoints(ctx, conn.RecipientID)
			var wgKey string
			if err == nil && endpoints != nil {
				wgKey = endpoints.WireGuardPublicKey
			}

			payloadBytes, _ := json.Marshal(types.ConnectionPayload{
				ConnectionID:       conn.ID,
				ProviderIP:         conn.ProviderIP,
				RecipientIP:        conn.RecipientIP,
				WireGuardPublicKey: wgKey,
			})

			msg := types.SignalingMessage{
				Type:        types.SignalingTypeConnectionRequest,
				SenderID:    conn.RecipientID,
				RecipientID: s.apiClient.Identity.EndpointID,
				Payload:     payloadBytes,
			}
			s.handleMessage(ctx, msg)
		}
	}

	// 2. Fetch and restore active or authorized connections
	allConns, err := s.apiClient.ListConnections(ctx)
	if err != nil {
		s.Logger.Error("failed to fetch all connections during resync", "error", err)
		return
	}

	for _, conn := range allConns {
		if conn.ProviderID == s.apiClient.Identity.EndpointID &&
			(conn.State == types.ConnectionStateAuthorized || conn.State == types.ConnectionStateConnected) {
			s.Logger.Info("found active connection during resync, restoring tunnel", "connection_id", conn.ID, "recipient_id", conn.RecipientID)

			endpoints, err := s.apiClient.DiscoverEndpoints(ctx, conn.RecipientID)
			wgKey := conn.WireGuardPublicKey
			if wgKey == "" && err == nil && endpoints != nil {
				wgKey = endpoints.WireGuardPublicKey
			}

			payloadBytes, _ := json.Marshal(types.ConnectionPayload{
				ConnectionID:       conn.ID,
				ProviderIP:         conn.ProviderIP,
				RecipientIP:        conn.RecipientIP,
				WireGuardPublicKey: wgKey,
				EndpointIP:         conn.EndpointIP,
				EndpointPort:       conn.EndpointPort,
				Candidates:         conn.Candidates,
			})

			msg := types.SignalingMessage{
				Type:        types.SignalingTypeConnectionRequest,
				SenderID:    conn.RecipientID,
				RecipientID: s.apiClient.Identity.EndpointID,
				Payload:     payloadBytes,
			}
			s.handleMessage(ctx, msg)
		}
	}
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

		authorized := false
		connResp, err := s.apiClient.GetConnection(ctx, payload.ConnectionID)
		if err == nil && connResp != nil {
			if connResp.RecipientID == msg.SenderID && (connResp.State == types.ConnectionStateRequested || connResp.State == types.ConnectionStateAuthorized || connResp.State == types.ConnectionStateConnected) {
				authorized = true
			}
		}
		if err != nil {
			s.Logger.Error("failed to verify connection authorization", "error", err)
		}

		if authorized {
			s.Logger.Info("connection request authorized locally")

			var replyPayload types.ConnectionPayload
			replyPayload.ConnectionID = payload.ConnectionID
			replyPayload.ProviderIP = payload.ProviderIP
			replyPayload.RecipientIP = payload.RecipientIP

			if s.tunnelManager != nil {
				// Provider gets its own info and candidates
				replyPayload.WireGuardPublicKey = s.tunnelManager.PublicKey().String()

				port, _ := s.tunnelManager.GetListenPort()
				replyPayload.EndpointPort = port

				// Gather candidates (host LAN + srflx STUN via MuxBind)
				cands, err := tunnel.GatherCandidatesMux(s.tunnelManager.GetMuxBind(), port)
				if err == nil && len(cands) > 0 {
					replyPayload.Candidates = cands
					replyPayload.EndpointIP = cands[0].IP
				} else {
					// Fallback to STUN / 127.0.0.1
					publicIP, _, err := tunnel.DiscoverPublicEndpointMux(s.tunnelManager.GetMuxBind())
					if err != nil {
						s.Logger.Error("stun discovery failed, falling back to local IP", "error", err)
						replyPayload.EndpointIP = "127.0.0.1"
					} else {
						replyPayload.EndpointIP = publicIP
					}
				}

				// Assign ProviderIP to the TUN interface first so it is UP before adding routes
				if payload.ProviderIP != "" {
					if err := s.tunnelManager.AssignIP(payload.ProviderIP); err != nil {
						s.Logger.Error("failed to assign provider IP to interface", "ip", payload.ProviderIP, "error", err)
					} else {
						s.Logger.Info("assigned provider IP to interface", "ip", payload.ProviderIP)
						// Enable IP forwarding and NAT on provider
						if err := s.tunnelManager.EnableForwarding(); err != nil {
							s.Logger.Error("failed to enable IP forwarding on provider", "error", err)
						} else {
							s.Logger.Info("enabled IP forwarding and NAT on provider")
						}
					}
				}

				if payload.WireGuardPublicKey != "" {
					s.Logger.Info("received peer wireguard public key, configuring tunnel")
					peerKey, err := tunnel.ParsePublicKey(payload.WireGuardPublicKey)
					if err == nil {
						allowedIPs := []string{}
						if payload.RecipientIP != "" {
							if strings.Contains(payload.RecipientIP, "/") {
								allowedIPs = append(allowedIPs, payload.RecipientIP)
							} else {
								allowedIPs = append(allowedIPs, payload.RecipientIP+"/32")
							}
						}
						allowedIPs = append(allowedIPs, "100.64.0.0/10", "100.64.0.2/32", "fd00:7a6f:6f70::/64")

						targetIP := payload.EndpointIP
						targetPort := payload.EndpointPort

						// Execute UDP candidate probing if candidates provided
						if len(payload.Candidates) > 0 {
							s.Logger.Info("probing peer candidates for direct connectivity", "candidate_count", len(payload.Candidates))
							bestCand, err := tunnel.ProbeCandidatesMux(ctx, s.tunnelManager.GetMuxBind(), payload.Candidates, payload.ConnectionID.String(), port)
							if err == nil && bestCand != nil {
								s.Logger.Info("selected optimal direct path candidate", "ip", bestCand.IP, "port", bestCand.Port, "type", bestCand.Type)
								targetIP = bestCand.IP
								targetPort = bestCand.Port
							} else {
								s.Logger.Info("candidate probing yielded no direct response, selecting best candidate for active hole punching", "error", err)
								fallbackIP, fallbackPort := tunnel.SelectFallbackCandidate(payload.Candidates)
								targetIP = fallbackIP
								targetPort = fallbackPort
							}
						}

						if targetIP == "" || targetPort == 0 {
							if payload.EndpointIP != "" && payload.EndpointPort != 0 {
								targetIP = payload.EndpointIP
								targetPort = payload.EndpointPort
							} else if s.relayBridge != nil {
								if rPort, rErr := s.relayBridge.RegisterPeer(msg.SenderID, peerKey); rErr == nil {
									targetIP = "127.0.0.1"
									targetPort = rPort
									s.Logger.Info("falling back to relay bridge on provider", "relay_port", rPort)
								}
							}
						}

						err = s.tunnelManager.AddPeer(peerKey, targetIP, targetPort, allowedIPs)
						if err != nil {
							s.Logger.Error("failed to configure wireguard peer", "error", err)
						} else {
							s.Logger.Info("wireguard peer configured successfully on provider", "endpoint", fmt.Sprintf("%s:%d", targetIP, targetPort))
							s.trackActive(payload.ConnectionID, peerKey, msg.SenderID)
						}
					}
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

			// Assign RecipientIP to the TUN interface first so it is UP before adding routes
			if payload.RecipientIP != "" {
				if err := s.tunnelManager.AssignIP(payload.RecipientIP); err != nil {
					s.Logger.Error("failed to assign recipient IP to interface", "ip", payload.RecipientIP, "error", err)
				} else {
					s.Logger.Info("assigned recipient IP to interface", "ip", payload.RecipientIP)
				}
			}

			allowedIPs := []string{"0.0.0.0/0", "::/0"}
			if payload.ProviderIP != "" {
				allowedIPs = append(allowedIPs, payload.ProviderIP+"/32")
			}

			targetIP := payload.EndpointIP
			targetPort := payload.EndpointPort

			// Execute UDP candidate probing if candidates provided
			if len(payload.Candidates) > 0 {
				s.Logger.Info("probing peer candidates for direct connectivity", "candidate_count", len(payload.Candidates))
				listenPort, _ := s.tunnelManager.GetListenPort()
				bestCand, err := tunnel.ProbeCandidatesMux(ctx, s.tunnelManager.GetMuxBind(), payload.Candidates, payload.ConnectionID.String(), listenPort)
				if err == nil && bestCand != nil {
					s.Logger.Info("selected optimal direct path candidate", "ip", bestCand.IP, "port", bestCand.Port, "type", bestCand.Type)
					targetIP = bestCand.IP
					targetPort = bestCand.Port
				} else {
					s.Logger.Warn("candidate probing yielded no direct response, selecting best direct fallback candidate", "error", err)
					fallbackIP, fallbackPort := tunnel.SelectFallbackCandidate(payload.Candidates)
					if fallbackIP != "" && fallbackPort != 0 {
						targetIP = fallbackIP
						targetPort = fallbackPort
						s.Logger.Info("selected direct fallback candidate on recipient", "ip", targetIP, "port", targetPort)
					} else if s.relayBridge != nil {
						if rPort, rErr := s.relayBridge.RegisterPeer(msg.SenderID, peerKey); rErr == nil {
							targetIP = "127.0.0.1"
							targetPort = rPort
							s.Logger.Info("falling back to relay bridge on recipient", "relay_port", rPort)
						}
					}
				}
			} else if targetIP == "" || targetPort == 0 {
				if s.relayBridge != nil {
					if rPort, rErr := s.relayBridge.RegisterPeer(msg.SenderID, peerKey); rErr == nil {
						targetIP = "127.0.0.1"
						targetPort = rPort
						s.Logger.Info("no direct candidates available, routed via relay bridge on recipient", "relay_port", rPort)
					}
				}
			}

			err = s.tunnelManager.AddPeer(peerKey, targetIP, targetPort, allowedIPs)
			if err != nil {
				s.Logger.Error("failed to configure wireguard peer", "error", err)
			} else {
				s.Logger.Info("wireguard peer configured successfully on recipient", "endpoint", fmt.Sprintf("%s:%d", targetIP, targetPort))
				s.trackActive(connIDFromPayload(payload), peerKey, msg.SenderID)

				// Report the truthful connection state to the cloud so the UI and
				// both sides see CONNECTED once the tunnel is actually up.
				if cid := connIDFromPayload(payload); cid.String() != "" {
					if err := s.apiClient.UpdateConnectionState(ctx, cid, types.ConnectionStateConnected); err != nil {
						s.Logger.Error("failed to report connected state", "error", err)
					}
				}
			}
		}
	case types.SignalingTypeConnectionDisconnected:
		s.Logger.Info("peer disconnected the connection", "sender_id", msg.SenderID)

		var payload types.ConnectionPayload
		if len(msg.Payload) > 0 {
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				s.Logger.Error("failed to unmarshal disconnect payload", "error", err)
				return
			}
		}
		s.teardownConnection(ctx, payload.ConnectionID)
	case types.SignalingTypeConnectionRejected:
		s.Logger.Info("connection request rejected by peer", "sender_id", msg.SenderID)

		var payload types.ConnectionPayload
		if len(msg.Payload) > 0 {
			if err := json.Unmarshal(msg.Payload, &payload); err != nil {
				s.Logger.Error("failed to unmarshal rejection payload", "error", err)
				return
			}
		}
		s.teardownConnection(ctx, payload.ConnectionID)
	}
}

func connIDFromPayload(p types.ConnectionPayload) types.ID {
	return p.ConnectionID
}

// DisconnectConnection tears down a local tunnel and notifies the cloud, which
// in turn signals the peer to tear down its side.
func (s *SignalingClient) DisconnectConnection(ctx context.Context, connID types.ID) error {
	s.teardownConnection(ctx, connID)
	if err := s.apiClient.UpdateConnectionState(ctx, connID, types.ConnectionStateDisconnected); err != nil {
		return err
	}
	s.Logger.Info("connection disconnected", "connection_id", connID)
	return nil
}

// trackActive records the WireGuard peer key and remote peer ID associated with a connection so a
// later disconnect can remove exactly that peer and tear down any relay forwarders.
func (s *SignalingClient) trackActive(connID types.ID, peerKey wgtypes.Key, peerIDs ...types.ID) {
	if connID.String() == "" {
		return
	}
	s.activeMu.Lock()
	defer s.activeMu.Unlock()
	s.activeConns[connID] = peerKey
	if len(peerIDs) > 0 && peerIDs[0].String() != "" {
		s.connPeers[connID] = peerIDs[0]
	}
}

// ActiveConnectionInfo describes an established tunnel on this device.
type ActiveConnectionInfo struct {
	ConnectionID types.ID `json:"connection_id"`
	PeerKey      string   `json:"peer_key"`
}

// ActiveConnections returns the currently tracked tunnels (connection id -> peer key).
func (s *SignalingClient) ActiveConnections() []ActiveConnectionInfo {
	s.activeMu.Lock()
	defer s.activeMu.Unlock()

	out := make([]ActiveConnectionInfo, 0, len(s.activeConns))
	for cid, key := range s.activeConns {
		out = append(out, ActiveConnectionInfo{ConnectionID: cid, PeerKey: key.String()})
	}
	return out
}

// teardownConnection removes the WireGuard peer and disables forwarding for the
// given connection, if this endpoint was acting as provider.
func (s *SignalingClient) teardownConnection(ctx context.Context, connID types.ID) {
	if connID.String() == "" {
		return
	}
	s.activeMu.Lock()
	peerKey, ok := s.activeConns[connID]
	delete(s.activeConns, connID)
	peerID := s.connPeers[connID]
	delete(s.connPeers, connID)
	s.activeMu.Unlock()

	if !ok {
		s.Logger.Warn("no active tunnel tracked for connection, nothing to tear down", "connection_id", connID)
		return
	}

	if s.relayBridge != nil && peerID.String() != "" {
		s.relayBridge.UnregisterPeer(peerID)
	}

	if s.tunnelManager != nil {
		if err := s.tunnelManager.RemovePeer(peerKey); err != nil {
			s.Logger.Error("failed to remove wireguard peer", "error", err)
		} else {
			s.Logger.Info("wireguard peer removed", "connection_id", connID)
		}
		if err := s.tunnelManager.DisableForwarding(); err != nil {
			s.Logger.Warn("failed to disable forwarding (may not be enabled)", "error", err)
		}
	}

	// Ensure the cloud record reflects the disconnected state even if this side
	// initiated the teardown through a signaling message.
	_ = s.apiClient.UpdateConnectionState(ctx, connID, types.ConnectionStateDisconnected)
}
