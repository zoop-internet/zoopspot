package api

import "github.com/zoop-internet/zoop/packages/core/types"

// ErrorResponse represents the standardized JSON error model.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// RegisterDeviceRequest is the payload for POST /v1/devices
type RegisterDeviceRequest struct {
	Name         string   `json:"name"`
	Platform     string   `json:"platform,omitempty"`
	PublicKey    string   `json:"public_key"` // Base64 or Hex encoded
	Capabilities []string `json:"capabilities,omitempty"`
}

// DeviceResponse is returned for device lookups and registrations.
type DeviceResponse struct {
	ID        types.ID `json:"id"`
	Status    string   `json:"status"`
}

// CreateShareRequest is the payload for POST /v1/shares
type CreateShareRequest struct {
	ProviderID  types.ID `json:"provider_id"`
	RecipientID types.ID `json:"recipient_id"`
}

// ShareResponse is returned for share lookups and creations.
type ShareResponse struct {
	ID          types.ID `json:"id"`
	ProviderID  types.ID `json:"provider_id"`
	RecipientID types.ID `json:"recipient_id"`
	IsActive    bool     `json:"is_active"`
}

// CreateConnectionRequest is the payload for POST /v1/connections
type CreateConnectionRequest struct {
	ProviderID  types.ID `json:"provider_id"`
	RecipientID types.ID `json:"recipient_id"`
}

// ConnectionResponse is returned for connection lookups and creations.
type ConnectionResponse struct {
	ID          types.ID              `json:"id"`
	ProviderID  types.ID              `json:"provider_id"`
	RecipientID types.ID              `json:"recipient_id"`
	State       types.ConnectionState `json:"state"`
}

// EndpointsResponse is returned for GET /v1/devices/{id}/endpoints
type EndpointsResponse struct {
	DeviceID  types.ID `json:"device_id"`
	PublicKey string   `json:"public_key"`
	// In the future this will hold STUN/TURN candidates, LAN addresses, etc.
}

// UpdateConnectionStateRequest is the payload for PUT /v1/connections/{id}/state
type UpdateConnectionStateRequest struct {
	State types.ConnectionState `json:"state"`
}
