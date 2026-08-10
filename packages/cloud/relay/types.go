package relay

import (
	"errors"
	"fmt"

	"github.com/zoop-internet/zoop/packages/core/types"
)

var (
	ErrFrameTooShort = errors.New("relay frame too short")
)

// RelayFrame encapsulates a zero-decryption WireGuard payload routed through the Relay server.
type RelayFrame struct {
	SenderID      types.ID
	DestinationID types.ID
	Payload       []byte
}

// EncodeOutbound encodes a frame sent from Client -> Relay Server.
// Format: [DestinationID (16 bytes)][Payload (N bytes)]
func EncodeOutbound(destID types.ID, payload []byte) []byte {
	buf := make([]byte, 16+len(payload))
	copy(buf[0:16], destID[:])
	copy(buf[16:], payload)
	return buf
}

// DecodeOutbound decodes a frame received by the Relay Server from a Client.
func DecodeOutbound(data []byte) (destID types.ID, payload []byte, err error) {
	if len(data) < 16 {
		return destID, nil, ErrFrameTooShort
	}
	copy(destID[:], data[0:16])
	payload = make([]byte, len(data)-16)
	copy(payload, data[16:])
	return destID, payload, nil
}

// EncodeInbound encodes a frame sent from Relay Server -> Recipient Client.
// Format: [SenderID (16 bytes)][Payload (N bytes)]
func EncodeInbound(senderID types.ID, payload []byte) []byte {
	buf := make([]byte, 16+len(payload))
	copy(buf[0:16], senderID[:])
	copy(buf[16:], payload)
	return buf
}

// DecodeInbound decodes a frame received by a Client from the Relay Server.
func DecodeInbound(data []byte) (senderID types.ID, payload []byte, err error) {
	if len(data) < 16 {
		return senderID, nil, fmt.Errorf("inbound relay frame too short: %w", ErrFrameTooShort)
	}
	copy(senderID[:], data[0:16])
	payload = make([]byte, len(data)-16)
	copy(payload, data[16:])
	return senderID, payload, nil
}
