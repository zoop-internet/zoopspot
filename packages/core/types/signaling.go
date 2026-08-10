package types

import "encoding/json"

// SignalingMessageType defines the kind of signaling message being sent
type SignalingMessageType string

const (
	SignalingTypeConnectionRequest  SignalingMessageType = "connection_request"
	SignalingTypeConnectionAccepted SignalingMessageType = "connection_accepted"
	SignalingTypeConnectionRejected SignalingMessageType = "connection_rejected"
)

// SignalingMessage is the payload sent over the WebSocket
type SignalingMessage struct {
	Type        SignalingMessageType `json:"type"`
	SenderID    ID                   `json:"sender_id"`
	RecipientID ID                   `json:"recipient_id"`
	Payload     json.RawMessage      `json:"payload,omitempty"`
}

// ConnectionPayload is the JSON payload for connection requests and acceptances.
type ConnectionPayload struct {
	ConnectionID       ID     `json:"connection_id"`
	WireGuardPublicKey string `json:"wireguard_public_key,omitempty"`
	EndpointIP         string `json:"endpoint_ip,omitempty"`
	EndpointPort       int    `json:"endpoint_port,omitempty"`
	ProviderIP         string `json:"provider_ip,omitempty"`
	RecipientIP        string `json:"recipient_ip,omitempty"`
}
