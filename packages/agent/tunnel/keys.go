package tunnel

import (
	"encoding/base64"
	"encoding/hex"
	"strings"

	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// KeyPair represents a WireGuard private/public key pair.
type KeyPair struct {
	PrivateKey wgtypes.Key
	PublicKey  wgtypes.Key
}

// GenerateKeyPair generates a new WireGuard key pair.
func GenerateKeyPair() (*KeyPair, error) {
	priv, err := wgtypes.GeneratePrivateKey()
	if err != nil {
		return nil, err
	}
	return &KeyPair{
		PrivateKey: priv,
		PublicKey:  priv.PublicKey(),
	}, nil
}

// EncodePublicKey returns the base64-encoded string representation of the public key.
func (k *KeyPair) EncodePublicKey() string {
	return base64.StdEncoding.EncodeToString(k.PublicKey[:])
}

// ParsePublicKey parses a base64 or hex encoded string into a WireGuard key.
func ParsePublicKey(encoded string) (wgtypes.Key, error) {
	encoded = strings.TrimSpace(encoded)
	if b, err := base64.StdEncoding.DecodeString(encoded); err == nil && len(b) == 32 {
		return wgtypes.NewKey(b)
	}
	if b, err := hex.DecodeString(encoded); err == nil && len(b) == 32 {
		return wgtypes.NewKey(b)
	}
	return wgtypes.ParseKey(encoded)
}
