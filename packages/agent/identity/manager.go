package identity

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// Manager handles the creation and secure local storage of the agent's identity.
type Manager interface {
	LoadOrGenerate(path string) (types.Identity, error)
	GetPrivateKey(path string) (ed25519.PrivateKey, error)
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

func (m *manager) GetPrivateKey(path string) (ed25519.PrivateKey, error) {
	return loadKey(path)
}

func loadKey(path string) (ed25519.PrivateKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	passphrase := os.Getenv("ZOOP_IDENTITY_PASSPHRASE")
	if passphrase != "" {
		data, err = decryptKey(data, passphrase)
		if err != nil {
			return nil, err
		}
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

	var data []byte = priv
	passphrase := os.Getenv("ZOOP_IDENTITY_PASSPHRASE")
	if passphrase != "" {
		var err error
		data, err = encryptKey(priv, passphrase)
		if err != nil {
			return err
		}
	}

	// 0600 ensures only the owner can read/write the private key
	return os.WriteFile(path, data, 0600)
}

func deriveKey(passphrase string, salt []byte) []byte {
	// Using a simple SHA256 derivation for M5 prototype. 
	// In production, PBKDF2 or Argon2 should be used.
	hash := sha256.Sum256(append([]byte(passphrase), salt...))
	return hash[:]
}

func encryptKey(data []byte, passphrase string) ([]byte, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return nil, err
	}
	key := deriveKey(passphrase, salt)

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	
	ciphertext := aesGCM.Seal(nonce, nonce, data, nil)
	return append(salt, ciphertext...), nil
}

func decryptKey(data []byte, passphrase string) ([]byte, error) {
	if len(data) < 16 {
		return nil, errors.New("ciphertext too short")
	}
	salt := data[:16]
	ciphertextWithNonce := data[16:]
	
	key := deriveKey(passphrase, salt)
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	
	nonceSize := aesGCM.NonceSize()
	if len(ciphertextWithNonce) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}
	
	nonce := ciphertextWithNonce[:nonceSize]
	ciphertext := ciphertextWithNonce[nonceSize:]
	
	return aesGCM.Open(nil, nonce, ciphertext, nil)
}

