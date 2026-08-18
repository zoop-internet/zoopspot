package server

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/cloud/services"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/config"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func TestServer_RegisterDevice(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	_, pub, _ := ed25519.GenerateKey(rand.Reader)
	pubStr := base64.StdEncoding.EncodeToString(pub)

	reqBody := api.RegisterDeviceRequest{
		Name:      "Test Phone",
		PublicKey: pubStr,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(bodyBytes))
	w := httptest.NewRecorder()

	srv.mux.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d", w.Result().StatusCode)
	}

	var resp api.DeviceResponse
	json.NewDecoder(w.Result().Body).Decode(&resp)

	if resp.ID.String() == "" || resp.ID.String() == "00000000-0000-0000-0000-000000000000" {
		t.Fatalf("expected non-empty device ID")
	}
	if resp.EndpointID.String() == "" || resp.EndpointID.String() == "00000000-0000-0000-0000-000000000000" {
		t.Fatalf("expected non-empty endpoint ID")
	}
	if resp.EndpointID != types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub)) {
		t.Fatalf("endpoint ID should be SHA1(pubkey) for the registered public key")
	}
	if resp.Status != "trusted" && resp.Status != "active" {
		t.Fatalf("expected trusted or active status, got %s", resp.Status)
	}
}

// TestServer_RegisterThenAuthenticatedGet mirrors the web client flow:
// register with a fresh Ed25519 key, then call an authenticated endpoint using
// the returned endpoint_id as X-Zoop-Identity with the v2 canonical signature.
func TestServer_RegisterThenAuthenticatedGet(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	pubStr := base64.StdEncoding.EncodeToString(pub)

	// 1. Register (unauthenticated)
	reqBody, _ := json.Marshal(api.RegisterDeviceRequest{Name: "Web Browser", PublicKey: pubStr})
	req := httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(reqBody))
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("register: expected 201, got %d", w.Result().StatusCode)
	}
	var resp api.DeviceResponse
	json.NewDecoder(w.Result().Body).Decode(&resp)

	// 2. Authenticated GET using endpoint_id + v2 canonical signature (as the web does)
	path := "/v1/devices/" + resp.ID.String()
	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := uuid.NewString()
	payload := api.BuildCanonicalPayload(http.MethodGet, path, ts, nonce, "")
	sig := ed25519.Sign(priv, payload)

	getReq := httptest.NewRequest(http.MethodGet, path, nil)
	getReq.Header.Set("X-Zoop-Identity", resp.EndpointID.String())
	getReq.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))
	getReq.Header.Set("X-Zoop-Timestamp", ts)
	getReq.Header.Set("X-Zoop-Nonce", nonce)

	w2 := httptest.NewRecorder()
	srv.mux.ServeHTTP(w2, getReq)
	if w2.Result().StatusCode != http.StatusOK {
		t.Fatalf("authenticated get: expected 200, got %d (body: %s)", w2.Result().StatusCode, w2.Result().Body)
	}

	var deviceResp api.DeviceResponse
	json.NewDecoder(w2.Result().Body).Decode(&deviceResp)
	if deviceResp.ID != resp.ID {
		t.Fatalf("expected same device ID in response")
	}
}

func TestServer_AuthMiddleware(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// Create Identity
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
	st.SaveIdentity(context.Background(), &types.Identity{
		EndpointID: endpointID,
		PublicKey:  pub,
	})

	// Create device so GET doesn't return 404
	st.SaveDevice(context.Background(), &types.Device{
		ID: endpointID,
	})

	// Make request
	req := httptest.NewRequest(http.MethodGet, "/v1/devices/"+endpointID.String(), nil)

	// Create signature with timestamp
	ts := time.Now().Format(time.RFC3339)
	payload := []byte("zoop-auth|" + ts)
	sig := ed25519.Sign(priv, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	req.Header.Set("X-Zoop-Identity", endpointID.String())
	req.Header.Set("X-Zoop-Signature", sigStr)
	req.Header.Set("X-Zoop-Timestamp", ts)

	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Result().StatusCode == http.StatusUnauthorized {
		t.Fatalf("expected not to be unauthorized")
	}
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", w.Result().StatusCode)
	}
}

// TestServer_ListSharesAndConnections verifies the authenticated list endpoints
// return only the caller's own shares and connections.
func TestServer_ListSharesAndConnections(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// Three identities: two sharing partners + one unrelated device.
	alicePub, alicePriv, _ := ed25519.GenerateKey(rand.Reader)
	bobPub, bobPriv, _ := ed25519.GenerateKey(rand.Reader)
	malloryPub, malloryPriv, _ := ed25519.GenerateKey(rand.Reader)
	aliceID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, alicePub))
	bobID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, bobPub))
	malloryID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, malloryPub))
	for _, ident := range []struct {
		id  types.ID
		key []byte
	}{{aliceID, alicePub}, {bobID, bobPub}, {malloryID, malloryPub}} {
		st.SaveIdentity(context.Background(), &types.Identity{EndpointID: ident.id, PublicKey: ident.key})
	}

	sign := func(method, path string, priv ed25519.PrivateKey, identity types.ID, body string) *http.Request {
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		payload := api.BuildCanonicalPayload(method, path, ts, nonce, bodyHash(body))
		sig := base64.StdEncoding.EncodeToString(ed25519.Sign(priv, payload))

		var r *http.Request
		if method == http.MethodGet {
			r = httptest.NewRequest(method, path, nil)
		} else {
			r = httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
		}
		r.Header.Set("X-Zoop-Identity", identity.String())
		r.Header.Set("X-Zoop-Signature", sig)
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		return r
	}

	// Alice shares with Bob.
	shareReq, _ := json.Marshal(api.CreateShareRequest{ProviderID: aliceID, RecipientID: bobID})
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodPost, "/v1/shares", alicePriv, aliceID, string(shareReq)))
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("create share: expected 201, got %d (body %s)", w.Result().StatusCode, w.Result().Body)
	}

	// Bob creates a connection to Alice.
	connReq, _ := json.Marshal(api.CreateConnectionRequest{ProviderID: aliceID, RecipientID: bobID})
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodPost, "/v1/connections", bobPriv, bobID, string(connReq)))
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("create connection: expected 201, got %d (body %s)", w.Result().StatusCode, w.Result().Body)
	}

	// Alice lists shares -> 1 share.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodGet, "/v1/shares", alicePriv, aliceID, ""))
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("list shares: expected 200, got %d", w.Result().StatusCode)
	}
	var shares []api.ShareResponse
	json.NewDecoder(w.Result().Body).Decode(&shares)
	if len(shares) != 1 {
		t.Fatalf("expected 1 share for Alice, got %d", len(shares))
	}

	// Alice lists connections -> 1 connection.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodGet, "/v1/connections", alicePriv, aliceID, ""))
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("list connections: expected 200, got %d", w.Result().StatusCode)
	}
	var conns []api.ConnectionResponse
	json.NewDecoder(w.Result().Body).Decode(&conns)
	if len(conns) != 1 {
		t.Fatalf("expected 1 connection for Alice, got %d", len(conns))
	}

	// Mallory sees nothing.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodGet, "/v1/shares", malloryPriv, malloryID, ""))
	json.NewDecoder(w.Result().Body).Decode(&shares)
	if len(shares) != 0 {
		t.Fatalf("expected 0 shares for Mallory, got %d", len(shares))
	}

	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodGet, "/v1/connections", malloryPriv, malloryID, ""))
	json.NewDecoder(w.Result().Body).Decode(&conns)
	if len(conns) != 0 {
		t.Fatalf("expected 0 connections for Mallory, got %d", len(conns))
	}
}

func bodyHash(s string) string {
	if s == "" {
		return ""
	}
	h := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", h[:])
}


