package types

// Identity represents the authenticated identity of a participant or device.
type Identity struct {
	EndpointID ID
	PublicKey  []byte
}
