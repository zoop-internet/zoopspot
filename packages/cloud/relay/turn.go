package relay

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// TURNCredentials encapsulates time-limited ephemeral TURN/STUN server allocation credentials (RFC 5389).
type TURNCredentials struct {
	Username string   `json:"username"`
	Password string   `json:"password"`
	TTL      int64    `json:"ttl"`
	URIs     []string `json:"uris"`
}

// TURNManager generates and verifies RFC 5389 ephemeral REST TURN credentials.
type TURNManager struct {
	secret string
	realm  string
}

// NewTURNManager creates a new TURNManager with the given shared secret.
func NewTURNManager(secret string, realm string) *TURNManager {
	if secret == "" {
		secret = "zoop-turn-default-secret"
	}
	if realm == "" {
		realm = "zoop.network"
	}
	return &TURNManager{
		secret: secret,
		realm:  realm,
	}
}

// GenerateCredentials creates time-limited TURN credentials for a given device endpoint.
func (m *TURNManager) GenerateCredentials(endpointID types.ID, ttl time.Duration, serverHost string, turnPort, stunPort int) TURNCredentials {
	if turnPort <= 0 {
		turnPort = 3478
	}
	if stunPort <= 0 {
		stunPort = 19302
	}
	if ttl <= 0 {
		ttl = 24 * time.Hour
	}

	expiryUnix := time.Now().Add(ttl).Unix()
	username := fmt.Sprintf("%d:%s", expiryUnix, endpointID.String())

	// Generate HMAC-SHA1 signature over username using shared secret
	mac := hmac.New(sha1.New, []byte(m.secret))
	mac.Write([]byte(username))
	password := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	uris := []string{
		fmt.Sprintf("stun:%s:%d", serverHost, stunPort),
		fmt.Sprintf("turn:%s:%d?transport=udp", serverHost, turnPort),
		fmt.Sprintf("turn:%s:%d?transport=tcp", serverHost, turnPort),
	}

	return TURNCredentials{
		Username: username,
		Password: password,
		TTL:      int64(ttl.Seconds()),
		URIs:     uris,
	}
}

// ValidateCredentials verifies if a given username and password match the shared secret and are not expired.
func (m *TURNManager) ValidateCredentials(username, password string) bool {
	var expiryUnix int64
	var endpointIDStr string
	_, err := fmt.Sscanf(username, "%d:%s", &expiryUnix, &endpointIDStr)
	if err != nil {
		return false
	}

	if time.Now().Unix() > expiryUnix {
		return false // expired
	}

	mac := hmac.New(sha1.New, []byte(m.secret))
	mac.Write([]byte(username))
	expectedPassword := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(password), []byte(expectedPassword))
}
