package api

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
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

// AuthMiddleware verifies the ed25519 signature of incoming requests.
func AuthMiddleware(s store.Store, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			identityStr := r.Header.Get("X-Zoop-Identity")
			sigStr := r.Header.Get("X-Zoop-Signature")
			timestampStr := r.Header.Get("X-Zoop-Timestamp")

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

			identity, err := s.GetIdentity(r.Context(), types.ID(parsedUUID))
			if err != nil {
				WriteError(w, "unauthenticated", "identity not found", http.StatusUnauthorized)
				return
			}
			
			// Parse timestamp and prevent replay attacks (allow 5 minute window)
			timestamp, err := time.Parse(time.RFC3339, timestampStr)
			if err != nil {
				WriteError(w, "unauthenticated", "invalid timestamp format", http.StatusUnauthorized)
				return
			}
			if time.Since(timestamp) > 5*time.Minute || time.Until(timestamp) > 5*time.Minute {
				WriteError(w, "unauthenticated", "request timestamp expired", http.StatusUnauthorized)
				return
			}

			payload := []byte("zoop-auth|" + timestampStr)
			
			if !ed25519.Verify(identity.PublicKey, payload, sigBytes) {
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
