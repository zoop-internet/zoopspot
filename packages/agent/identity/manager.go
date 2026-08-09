package identity

import (
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// Manager handles the creation and secure local storage of the agent's identity.
type Manager interface {
	LoadOrGenerate(path string) (types.Identity, error)
}

type manager struct{}

// NewManager returns a new identity manager.
func NewManager() Manager {
	return &manager{}
}

// LoadOrGenerate loads the identity from the given file path.
// If the file does not exist, it generates a new identity and saves it to the path securely.
func (m *manager) LoadOrGenerate(path string) (types.Identity, error) {
	priv, err := loadKey(path)
	if errors.Is(err, os.ErrNotExist) {
		_, priv, err = ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return types.Identity{}, err
		}
		if err := saveKey(path, priv); err != nil {
			return types.Identity{}, err
		}
	} else if err != nil {
		return types.Identity{}, err
	}

	pub := priv.Public().(ed25519.PublicKey)

	// Derive a deterministic Endpoint ID from the public key
	id := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))

	return types.Identity{
		EndpointID: id,
		PublicKey:  pub,
	}, nil
}

func loadKey(path string) (ed25519.PrivateKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if len(data) != ed25519.PrivateKeySize {
		return nil, errors.New("invalid private key size")
	}
	return data, nil
}

func saveKey(path string, priv ed25519.PrivateKey) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	// 0600 ensures only the owner can read/write the private key
	return os.WriteFile(path, priv, 0600)
}
