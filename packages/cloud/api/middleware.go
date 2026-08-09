package api

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"

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

// AuthMiddleware verifies the ed25519 signature of incoming requests.
func AuthMiddleware(s store.Store, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			identityStr := r.Header.Get("X-Zoop-Identity")
			sigStr := r.Header.Get("X-Zoop-Signature")

			if identityStr == "" || sigStr == "" {
				WriteError(w, "unauthenticated", "missing identity or signature headers", http.StatusUnauthorized)
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

			identity, err := s.GetIdentity(r.Context(), types.ID(parsedUUID))
			if err != nil {
				WriteError(w, "unauthenticated", "identity not found", http.StatusUnauthorized)
				return
			}

			// In a real implementation, we would verify the signature over the request path, body, and a timestamp/nonce.
			// For M4, we verify against a simple known payload to establish the architectural pattern.
			dummyPayload := []byte("zoop-m4-auth")
			
			if !ed25519.Verify(identity.PublicKey, dummyPayload, sigBytes) {
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
