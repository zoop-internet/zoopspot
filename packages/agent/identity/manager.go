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
	"github.com/zoop-internet/zoopspot/packages/core/types"
	"golang.org/x/crypto/pbkdf2"
)

// keyFormatVersion is a single byte written at the start of every encrypted key file.
// Version 1 uses PBKDF2-SHA256 with 100,000 iterations.
const keyFormatVersion byte = 1

const (
	pbkdf2Iterations = 100_000
	pbkdf2KeyLen     = 32 // AES-256
	pbkdf2SaltLen    = 16
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

	// Derive a deterministic Endpoint ID from the public key.
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
	info, err := os.Stat(path)
	if err == nil {
		// Enforce strict owner-only permissions (0600).
		if info.Mode().Perm() != 0600 {
			_ = os.Chmod(path, 0600)
		}
	}

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

	// 0600 ensures only the owner can read/write the private key.
	return os.WriteFile(path, data, 0600)
}

// deriveKey produces a 256-bit AES key using PBKDF2-SHA256.
// Using 100,000 iterations makes brute-force attacks significantly more expensive
// compared to the previous single SHA256 round.
func deriveKey(passphrase string, salt []byte) []byte {
	return pbkdf2.Key([]byte(passphrase), salt, pbkdf2Iterations, pbkdf2KeyLen, sha256.New)
}

// encryptKey encrypts the raw private key bytes with AES-256-GCM using a PBKDF2-derived key.
// Output format: [version(1)][salt(16)][nonce(12)][ciphertext+tag]
func encryptKey(data []byte, passphrase string) ([]byte, error) {
	salt := make([]byte, pbkdf2SaltLen)
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

	// Prepend version byte and salt.
	result := make([]byte, 0, 1+pbkdf2SaltLen+len(ciphertext))
	result = append(result, keyFormatVersion)
	result = append(result, salt...)
	result = append(result, ciphertext...)
	return result, nil
}

// decryptKey decrypts a key file produced by encryptKey.
// Supports format version 1 (PBKDF2-SHA256 + AES-GCM).
func decryptKey(data []byte, passphrase string) ([]byte, error) {
	if len(data) < 1 {
		return nil, errors.New("encrypted key data too short")
	}

	version := data[0]
	switch version {
	case keyFormatVersion: // 1 — PBKDF2-SHA256
		data = data[1:] // strip version byte
	default:
		return nil, errors.New("unknown key format version — key may have been encrypted with an older Zoop version")
	}

	if len(data) < pbkdf2SaltLen {
		return nil, errors.New("encrypted key data too short (missing salt)")
	}
	salt := data[:pbkdf2SaltLen]
	ciphertextWithNonce := data[pbkdf2SaltLen:]

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
		return nil, errors.New("encrypted key data too short (missing nonce)")
	}

	nonce := ciphertextWithNonce[:nonceSize]
	ciphertext := ciphertextWithNonce[nonceSize:]

	return aesGCM.Open(nil, nonce, ciphertext, nil)
}
