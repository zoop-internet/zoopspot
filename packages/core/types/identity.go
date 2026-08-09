package types

// Identity represents the authenticated identity of a participant or device.
type Identity struct {
	EndpointID ID     `json:"endpoint_id"`
	PublicKey  []byte `json:"public_key"`
}
