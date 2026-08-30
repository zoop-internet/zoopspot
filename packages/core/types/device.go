package types

import "time"

type DeviceState string

const (
	DeviceStateRegistered DeviceState = "registered"
	DeviceStateTrusted    DeviceState = "trusted"
	DeviceStateRevoked    DeviceState = "revoked"
	DeviceStateSuspended  DeviceState = "suspended"
)

// Device represents a physical computing device.
type Device struct {
	ID          ID          `json:"id"`
	AccountID   ID          `json:"account_id"`
	Name        string      `json:"name"`
	OS          string      `json:"os"`
	Description string      `json:"description"`
	State       DeviceState `json:"state"`
	CreatedAt   time.Time   `json:"created_at,omitempty"`
	UpdatedAt   time.Time   `json:"updated_at,omitempty"`
}

// Endpoint represents a device participating in Zoop networking.
type Endpoint struct {
	ID       ID `json:"id"`
	DeviceID ID `json:"device_id"`
}
