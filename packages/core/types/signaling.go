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

// CandidateType defines candidate classification (host vs server-reflexive STUN)
type CandidateType string

const (
	CandidateTypeHost  CandidateType = "host"  // Local LAN candidate
	CandidateTypeSrflx CandidateType = "srflx" // Public STUN candidate
)

// EndpointCandidate represents a network path candidate discovered by an agent.
type EndpointCandidate struct {
	IP       string        `json:"ip"`
	Port     int           `json:"port"`
	Type     CandidateType `json:"type"`
	Priority int           `json:"priority"` // Higher priority is preferred (Host = 100, Srflx = 50)
}

// ConnectionPayload is the JSON payload for connection requests and acceptances.
type ConnectionPayload struct {
	ConnectionID       ID                  `json:"connection_id"`
	WireGuardPublicKey string              `json:"wireguard_public_key,omitempty"`
	EndpointIP         string              `json:"endpoint_ip,omitempty"`
	EndpointPort       int                 `json:"endpoint_port,omitempty"`
	Candidates         []EndpointCandidate `json:"candidates,omitempty"`
	ProviderIP         string              `json:"provider_ip,omitempty"`
	RecipientIP        string              `json:"recipient_ip,omitempty"`
}
