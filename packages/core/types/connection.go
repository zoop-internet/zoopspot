package types

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
	ID          ID
	ProviderID  ID
	RecipientID ID
	State       ConnectionState
}

// SharingRelationship represents the Control Plane relationship between a Provider and Recipient.
type SharingRelationship struct {
	ID          ID
	ProviderID  ID
	RecipientID ID
	IsActive    bool
}
