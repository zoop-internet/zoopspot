package api

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func setupTestAuth(t *testing.T) (store.Store, types.ID, ed25519.PrivateKey, func(http.Handler) http.Handler) {
	st := store.NewInMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("failed to generate ed25519 key: %v", err)
	}

	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
	st.SaveIdentity(context.Background(), &types.Identity{
		EndpointID: endpointID,
		PublicKey:  pub,
	})

	st.SaveDevice(context.Background(), &types.Device{
		ID:    endpointID,
		Name:  "Test Secure Device",
		State: types.DeviceStateTrusted,
	})

	mw := AuthMiddleware(st, logger)
	return st, endpointID, priv, mw
}

func TestSecurity_ValidV2Signature(t *testing.T) {
	_, endpointID, priv, mw := setupTestAuth(t)

	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := uuid.New().String()
	payload := BuildCanonicalPayload("GET", "/v1/test", ts, nonce, "")
	sig := ed25519.Sign(priv, payload)

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.Header.Set("X-Zoop-Identity", endpointID.String())
	req.Header.Set("X-Zoop-Timestamp", ts)
	req.Header.Set("X-Zoop-Nonce", nonce)
	req.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w := httptest.NewRecorder()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_NonceReplayRejection(t *testing.T) {
	_, endpointID, priv, mw := setupTestAuth(t)

	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := uuid.New().String()
	payload := BuildCanonicalPayload("GET", "/v1/test", ts, nonce, "")
	sig := ed25519.Sign(priv, payload)

	req1 := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req1.Header.Set("X-Zoop-Identity", endpointID.String())
	req1.Header.Set("X-Zoop-Timestamp", ts)
	req1.Header.Set("X-Zoop-Nonce", nonce)
	req1.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w1 := httptest.NewRecorder()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// First request succeeds
	handler.ServeHTTP(w1, req1)
	if w1.Result().StatusCode != http.StatusOK {
		t.Fatalf("first request expected 200 OK, got %d", w1.Result().StatusCode)
	}

	// Replayed request with same nonce must be rejected
	req2 := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req2.Header.Set("X-Zoop-Identity", endpointID.String())
	req2.Header.Set("X-Zoop-Timestamp", ts)
	req2.Header.Set("X-Zoop-Nonce", nonce) // duplicate nonce
	req2.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)
	if w2.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("replayed request expected 401 Unauthorized, got %d", w2.Result().StatusCode)
	}
}

func TestSecurity_ExpiredTimestampRejection(t *testing.T) {
	_, endpointID, priv, mw := setupTestAuth(t)

	// 10 minutes in the past
	expiredTS := time.Now().UTC().Add(-10 * time.Minute).Format(time.RFC3339)
	nonce := uuid.New().String()
	payload := BuildCanonicalPayload("GET", "/v1/test", expiredTS, nonce, "")
	sig := ed25519.Sign(priv, payload)

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.Header.Set("X-Zoop-Identity", endpointID.String())
	req.Header.Set("X-Zoop-Timestamp", expiredTS)
	req.Header.Set("X-Zoop-Nonce", nonce)
	req.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w := httptest.NewRecorder()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for expired timestamp, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_RevokedDeviceRejection(t *testing.T) {
	st, endpointID, priv, mw := setupTestAuth(t)

	// Revoke device
	dev, _ := st.GetDevice(context.Background(), endpointID)
	dev.State = types.DeviceStateRevoked
	st.SaveDevice(context.Background(), dev)

	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := uuid.New().String()
	payload := BuildCanonicalPayload("GET", "/v1/test", ts, nonce, "")
	sig := ed25519.Sign(priv, payload)

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.Header.Set("X-Zoop-Identity", endpointID.String())
	req.Header.Set("X-Zoop-Timestamp", ts)
	req.Header.Set("X-Zoop-Nonce", nonce)
	req.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w := httptest.NewRecorder()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for revoked device, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_CORS_AllowedOrigin(t *testing.T) {
	mw := CORSMiddleware([]string{"https://app.zoop.network"})
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.Header.Set("Origin", "https://app.zoop.network")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for allowed origin, got %d", w.Result().StatusCode)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://app.zoop.network" {
		t.Fatalf("expected Allow-Origin echo, got %q", got)
	}
}

func TestSecurity_CORS_DisallowedOrigin(t *testing.T) {
	mw := CORSMiddleware([]string{"https://app.zoop.network"})
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for disallowed origin, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_CORS_WildcardOrigin(t *testing.T) {
	mw := CORSMiddleware([]string{"https://*.pages.dev", "https://zoop.network"})
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Allowed preview deployment
	req1 := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req1.Header.Set("Origin", "https://branch-abc.zoop-frontend.pages.dev")
	w1 := httptest.NewRecorder()
	handler.ServeHTTP(w1, req1)
	if w1.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for wildcard origin, got %d", w1.Result().StatusCode)
	}

	// Disallowed domain
	req2 := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req2.Header.Set("Origin", "https://notpages.dev")
	w2 := httptest.NewRecorder()
	handler.ServeHTTP(w2, req2)
	if w2.Result().StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for disallowed domain, got %d", w2.Result().StatusCode)
	}
}

func TestSecurity_CORS_NoOriginAllowed(t *testing.T) {
	// With no origins configured, same-origin requests (no Origin header) pass.
	mw := CORSMiddleware(nil)
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for no-origin request, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_SecurityHeaders(t *testing.T) {
	handler := SecurityHeadersMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	h := w.Result().Header
	if got := h.Get("Content-Security-Policy"); got == "" {
		t.Fatal("expected CSP header")
	}
	if got := h.Get("Strict-Transport-Security"); got == "" {
		t.Fatal("expected HSTS header")
	}
	if got := h.Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("expected X-Frame-Options DENY, got %q", got)
	}
}

func TestSecurity_RateLimiter(t *testing.T) {
	limiter := NewRateLimiter(60, 3) // 3 tokens burst capacity

	key := "192.168.1.100"
	// 3 requests allowed
	for i := 0; i < 3; i++ {
		allowed, _ := limiter.Allow(key)
		if !allowed {
			t.Fatalf("request %d should be allowed within burst capacity", i+1)
		}
	}

	// 4th request must be rejected
	allowed, retryAfter := limiter.Allow(key)
	if allowed {
		t.Fatalf("4th request should exceed burst capacity and be rejected")
	}
	if retryAfter <= 0 {
		t.Fatalf("expected positive retry-after duration, got %v", retryAfter)
	}

	// Rate limit middleware test
	handler := RateLimitMiddleware(limiter)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/test", nil)
	req.RemoteAddr = fmt.Sprintf("%s:12345", key)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected 429 Too Many Requests, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_MissingNonceOnMutatingRejected(t *testing.T) {
	_, endpointID, priv, mw := setupTestAuth(t)

	ts := time.Now().UTC().Format(time.RFC3339)
	// Mutating POST request without nonce
	payload := BuildCanonicalPayload("POST", "/v1/devices/test", ts, "", "")
	sig := ed25519.Sign(priv, payload)

	req := httptest.NewRequest(http.MethodPost, "/v1/devices/test", nil)
	req.Header.Set("X-Zoop-Identity", endpointID.String())
	req.Header.Set("X-Zoop-Timestamp", ts)
	// Omitting X-Zoop-Nonce
	req.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w := httptest.NewRecorder()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for mutating request without nonce, got %d", w.Result().StatusCode)
	}
}

func TestSecurity_LegacyV1RejectedOnMutating(t *testing.T) {
	_, endpointID, priv, mw := setupTestAuth(t)

	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := uuid.New().String()
	// Signed with legacy v1 format
	v1Payload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(priv, v1Payload)

	req := httptest.NewRequest(http.MethodPost, "/v1/devices/test", nil)
	req.Header.Set("X-Zoop-Identity", endpointID.String())
	req.Header.Set("X-Zoop-Timestamp", ts)
	req.Header.Set("X-Zoop-Nonce", nonce)
	req.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))

	w := httptest.NewRecorder()
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 Unauthorized for mutating request using v1 signature, got %d", w.Result().StatusCode)
	}
}
