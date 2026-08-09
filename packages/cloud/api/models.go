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
