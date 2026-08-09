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
