package types

// Device represents a physical computing device.
type Device struct {
	ID          ID     `json:"id"`
	AccountID   ID     `json:"account_id"`
	Name        string `json:"name"`
	OS          string `json:"os"`
	Description string `json:"description"`
}

// Endpoint represents a device participating in Zoop networking.
type Endpoint struct {
	ID       ID `json:"id"`
	DeviceID ID `json:"device_id"`
}
