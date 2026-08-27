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
	Name               string   `json:"name"`
	Platform           string   `json:"platform,omitempty"`
	PublicKey          string   `json:"public_key"`           // Base64 Ed25519 Control Plane Identity
	WireGuardPublicKey string   `json:"wireguard_public_key"` // Base64 WireGuard Public Key
	Capabilities       []string `json:"capabilities,omitempty"`
}

// DeviceResponse is returned for device lookups and registrations.
type DeviceResponse struct {
	ID         types.ID `json:"id"`
	EndpointID types.ID `json:"endpoint_id,omitempty"`
	Name       string   `json:"name,omitempty"`
	OS         string   `json:"os,omitempty"`
	Status     string   `json:"status"`
}

// CreateOrgRequest is the payload for POST /v1/organizations
type CreateOrgRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug,omitempty"`
}

// OrgResponse is returned for Organization lookups and creations.
type OrgResponse struct {
	ID          types.ID `json:"id"`
	Name        string   `json:"name"`
	OwnerDevice types.ID `json:"owner_device_id,omitempty"`
	Slug        string   `json:"slug,omitempty"`
	Status      string   `json:"status,omitempty"`
}

// AddOrgMemberRequest is the payload for POST /v1/organizations/{id}/members
// Per docs/identity.md §2, §7 — Zoop does not require email. Email is kept
// optional for legacy compat; preferred member identifier is device_id / Zoop ID / username.
type AddOrgMemberRequest struct {
	DeviceID types.ID `json:"device_id,omitempty"`
	Name     string   `json:"name"`
	Email    string   `json:"email,omitempty"`
	Username string   `json:"username,omitempty"`
	ZoopID   string   `json:"zoop_id,omitempty"`
	Role     string   `json:"role"`
}

// OrgMemberResponse is returned for member lookups and creations.
type OrgMemberResponse struct {
	ID             types.ID `json:"id"`
	OrganizationID types.ID `json:"organization_id"`
	DeviceID       types.ID `json:"device_id,omitempty"`
	Name           string   `json:"name"`
	Email          string   `json:"email,omitempty"`
	Username       string   `json:"username,omitempty"`
	ZoopID         string   `json:"zoop_id,omitempty"`
	Role           string   `json:"role"`
	Status         string   `json:"status"`
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
	ProviderIP  string                `json:"provider_ip"`
	RecipientIP string                `json:"recipient_ip"`
}

// EndpointsResponse is returned for GET /v1/devices/{id}/endpoints
type EndpointsResponse struct {
	DeviceID           types.ID `json:"device_id"`
	PublicKey          string   `json:"public_key"`
	WireGuardPublicKey string   `json:"wireguard_public_key,omitempty"`
	// In the future this will hold STUN/TURN candidates, LAN addresses, etc.
}

// UpdateConnectionStateRequest is the payload for PUT /v1/connections/{id}/state
type UpdateConnectionStateRequest struct {
	State types.ConnectionState `json:"state"`
}
