package types

// Role defines the operational role of an endpoint.
type Role string

const (
	RoleProvider  Role = "PROVIDER"
	RoleRecipient Role = "RECIPIENT"
)

// Provider represents the configuration and state of an endpoint acting as a Provider.
type Provider struct {
	EndpointID ID `json:"endpoint_id"`
}

// Recipient represents the configuration and state of an endpoint acting as a Recipient.
type Recipient struct {
	EndpointID ID `json:"endpoint_id"`
}
