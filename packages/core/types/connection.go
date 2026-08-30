package types

import "time"

// ConnectionState represents the state of a connection.
type ConnectionState string

const (
	ConnectionStateRequested    ConnectionState = "REQUESTED"
	ConnectionStateAuthorized   ConnectionState = "AUTHORIZED"
	ConnectionStateConnecting   ConnectionState = "CONNECTING"
	ConnectionStateConnected    ConnectionState = "CONNECTED"
	ConnectionStateDisconnected ConnectionState = "DISCONNECTED"
)

// Connection represents an active or attempted network relationship between endpoints.
type Connection struct {
	ID          ID              `json:"id"`
	ProviderID  ID              `json:"provider_id"`
	RecipientID ID              `json:"recipient_id"`
	State       ConnectionState `json:"state"`
	ProviderIP  string          `json:"provider_ip"`
	RecipientIP string          `json:"recipient_ip"`
	CreatedAt   time.Time       `json:"created_at,omitempty"`
	UpdatedAt   time.Time       `json:"updated_at,omitempty"`
}

// SharingRelationship represents the Control Plane relationship between a Provider and Recipient.
type SharingRelationship struct {
	ID          ID        `json:"id"`
	ProviderID  ID        `json:"provider_id"`
	RecipientID ID        `json:"recipient_id"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at,omitempty"`
}
