package api

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// WriteError writes a standardized API error response.
func WriteError(w http.ResponseWriter, code string, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	resp := ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	}

	json.NewEncoder(w).Encode(resp)
}

// WriteJSON writes a standard JSON response.
func WriteJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// NonceCache tracks recently seen nonces to prevent replay attacks with a bounded max capacity.
type NonceCache struct {
	mu     sync.Mutex
	nonces map[string]time.Time
	maxCap int
}

func NewNonceCache() *NonceCache {
	return NewBoundedNonceCache(100000)
}

func NewBoundedNonceCache(maxCap int) *NonceCache {
	if maxCap <= 0 {
		maxCap = 100000
	}
	nc := &NonceCache{
		nonces: make(map[string]time.Time),
		maxCap: maxCap,
	}
	// Cleanup expired nonces every 2 minutes
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		for range ticker.C {
			nc.cleanup()
		}
	}()
	return nc
}

func (nc *NonceCache) cleanup() {
	nc.mu.Lock()
	defer nc.mu.Unlock()
	now := time.Now()
	for k, expiry := range nc.nonces {
		if now.After(expiry) {
			delete(nc.nonces, k)
		}
	}
}

// CheckAndSet stores a nonce if not already seen. Returns false if duplicate.
func (nc *NonceCache) CheckAndSet(nonce string, ttl time.Duration) bool {
	nc.mu.Lock()
	defer nc.mu.Unlock()

	now := time.Now()
	if expiry, exists := nc.nonces[nonce]; exists && now.Before(expiry) {
		return false // duplicate replay
	}

	// If at max capacity, force cleanup of expired entries
	if len(nc.nonces) >= nc.maxCap {
		for k, expiry := range nc.nonces {
			if now.After(expiry) {
				delete(nc.nonces, k)
			}
		}
		// If still at capacity under heavy attack, evict arbitrary entry to prevent OOM
		if len(nc.nonces) >= nc.maxCap {
			for k := range nc.nonces {
				delete(nc.nonces, k)
				break
			}
		}
	}

	nc.nonces[nonce] = now.Add(ttl)
	return true
}

var globalNonceCache = NewNonceCache()

// BuildCanonicalPayload constructs a tamper-proof signature payload.
func BuildCanonicalPayload(method, path, timestampStr, nonce, bodyHash string) []byte {
	return []byte(fmt.Sprintf("zoop-auth-v2|%s|%s|%s|%s|%s", method, path, timestampStr, nonce, bodyHash))
}

// AuthMiddleware verifies the Ed25519 signature, timestamp window, replay nonce, and device active status.
func AuthMiddleware(s store.Store, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			identityStr := r.Header.Get("X-Zoop-Identity")
			if identityStr == "" {
				identityStr = r.Header.Get("X-Zoop-Device-ID")
			}
			sigStr := r.Header.Get("X-Zoop-Signature")
			timestampStr := r.Header.Get("X-Zoop-Timestamp")
			nonce := r.Header.Get("X-Zoop-Nonce")

			if identityStr == "" || sigStr == "" || timestampStr == "" {
				WriteError(w, "unauthenticated", "missing identity, signature, or timestamp headers", http.StatusUnauthorized)
				return
			}

			sigBytes, err := base64.StdEncoding.DecodeString(sigStr)
			if err != nil || len(sigBytes) != ed25519.SignatureSize {
				WriteError(w, "unauthenticated", "invalid signature format", http.StatusUnauthorized)
				return
			}

			parsedUUID, err := uuid.Parse(identityStr)
			if err != nil {
				WriteError(w, "unauthenticated", "invalid identity format", http.StatusUnauthorized)
				return
			}

			endpointID := types.ID(parsedUUID)

			// 1. Verify Identity exists
			identity, err := s.GetIdentity(r.Context(), endpointID)
			if err != nil {
				WriteError(w, "unauthenticated", "identity not found", http.StatusUnauthorized)
				return
			}

			// 2. Verify Device is not Revoked
			if device, err := s.GetDevice(r.Context(), endpointID); err == nil {
				if device.State == types.DeviceStateRevoked {
					WriteError(w, "forbidden", "device identity has been revoked", http.StatusForbidden)
					return
				}
			}

			// 3. Timestamp expiration check (±5 minute window)
			timestamp, err := time.Parse(time.RFC3339, timestampStr)
			if err != nil {
				WriteError(w, "unauthenticated", "invalid timestamp format", http.StatusUnauthorized)
				return
			}
			if time.Since(timestamp) > 5*time.Minute || time.Until(timestamp) > 5*time.Minute {
				WriteError(w, "unauthenticated", "request timestamp expired", http.StatusUnauthorized)
				return
			}

			// 4. Nonce Replay Check (if nonce header is present)
			if nonce != "" {
				nonceKey := fmt.Sprintf("%s:%s", endpointID.String(), nonce)
				if !globalNonceCache.CheckAndSet(nonceKey, 5*time.Minute) {
					WriteError(w, "unauthenticated", "replayed request detected (duplicate nonce)", http.StatusUnauthorized)
					return
				}
			}

			// 5. Read body for payload hash
			var bodyBytes []byte
			if r.Body != nil {
				bodyBytes, _ = io.ReadAll(r.Body)
				r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
			}
			bodyHash := ""
			if len(bodyBytes) > 0 {
				hash := sha256.Sum256(bodyBytes)
				bodyHash = hex.EncodeToString(hash[:])
			}

			// 6. Verify signature (v2 canonical or v1 legacy fallback)
			v2Payload := BuildCanonicalPayload(r.Method, r.URL.Path, timestampStr, nonce, bodyHash)
			v1Payload := []byte("zoop-auth|" + timestampStr)

			validV2 := ed25519.Verify(identity.PublicKey, v2Payload, sigBytes)
			validV1 := ed25519.Verify(identity.PublicKey, v1Payload, sigBytes)

			if !validV2 && !validV1 {
				WriteError(w, "unauthenticated", "signature verification failed", http.StatusUnauthorized)
				return
			}

			// Attach identity to context
			ctx := context.WithValue(r.Context(), CallerIdentityKey, identity.EndpointID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

type ContextKey string

const CallerIdentityKey ContextKey = "caller_identity"

// IdentityFromContext returns the authenticated caller's endpoint ID.
func IdentityFromContext(ctx context.Context) types.ID {
	if v, ok := ctx.Value(CallerIdentityKey).(types.ID); ok {
		return v
	}
	return types.ID{}
}

// AdminMiddleware wraps AuthMiddleware and additionally requires the caller to be
// in the configured admin allow-list. If no allow-list is configured, all
// authenticated callers are treated as admins (dev-time convenience).
func AdminMiddleware(auth func(http.Handler) http.Handler, adminIDs []string) func(http.Handler) http.Handler {
	adminSet := make(map[string]bool, len(adminIDs))
	for _, id := range adminIDs {
		adminSet[id] = true
	}
	allowAll := len(adminIDs) == 0

	return func(next http.Handler) http.Handler {
		return auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			callerID := IdentityFromContext(r.Context())
			if !allowAll && !adminSet[callerID.String()] {
				WriteError(w, "forbidden", "operator privileges required", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		}))
	}
}

// CORSMiddleware sets permissive CORS headers for a configured set of allowed
// origins (from ZOOP_ALLOWED_ORIGINS). If no origins are configured, requests
// with no Origin header (same-origin / CLI) pass through untouched, and any
// cross-origin request is rejected.
func CORSMiddleware(allowed []string) func(http.Handler) http.Handler {
	allowedSet := make(map[string]bool, len(allowed))
	for _, o := range allowed {
		allowedSet[o] = true
	}
	allowAll := len(allowed) == 0

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if !allowAll && !allowedSet[origin] {
					WriteError(w, "forbidden", "origin not allowed", http.StatusForbidden)
					return
				}
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Zoop-Identity, X-Zoop-Device-ID, X-Zoop-Signature, X-Zoop-Timestamp, X-Zoop-Nonce")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
