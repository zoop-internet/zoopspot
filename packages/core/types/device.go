package types

// Device represents a physical computing device.
type Device struct {
	ID          ID
	AccountID   ID
	Name        string
	OS          string
	Description string
}

// Endpoint represents a device participating in Zoop networking.
type Endpoint struct {
	ID       ID
	DeviceID ID
}
