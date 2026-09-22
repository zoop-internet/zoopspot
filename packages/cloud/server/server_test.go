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
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/payments"
	"github.com/allannuwamanya/zoop/packages/cloud/services"
	"github.com/allannuwamanya/zoop/packages/cloud/store"
	"github.com/allannuwamanya/zoop/packages/core/config"
	"github.com/allannuwamanya/zoop/packages/core/types"
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
func TestServer_OrgAuthAndOwnership(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// Register two devices (owner + member) with real Ed25519 keys.
	register := func(name string) (types.ID, ed25519.PrivateKey) {
		pub, priv, _ := ed25519.GenerateKey(rand.Reader)
		pubStr := base64.StdEncoding.EncodeToString(pub)
		body, _ := json.Marshal(api.RegisterDeviceRequest{Name: name, PublicKey: pubStr})
		req := httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(body))
		w := httptest.NewRecorder()
		srv.mux.ServeHTTP(w, req)
		if w.Result().StatusCode != http.StatusCreated {
			t.Fatalf("register %s: expected 201, got %d", name, w.Result().StatusCode)
		}
		var resp api.DeviceResponse
		json.NewDecoder(w.Result().Body).Decode(&resp)
		return resp.EndpointID, priv
	}

	authReq := func(priv ed25519.PrivateKey, ident types.ID, method, path string, body string) *http.Request {
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		payload := api.BuildCanonicalPayload(method, path, ts, nonce, bodyHash(body))
		sig := base64.StdEncoding.EncodeToString(ed25519.Sign(priv, payload))
		r := httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
		r.Header.Set("X-Zoop-Identity", ident.String())
		r.Header.Set("X-Zoop-Signature", sig)
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		return r
	}

	ownerID, ownerPriv := register("Owner")
	memberID, memberPriv := register("Member")

	// 1. Unauthenticated org list -> 401.
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/organizations", nil))
	if w.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("unauth org list: expected 401, got %d", w.Result().StatusCode)
	}

	// 2. Owner creates an org -> 201, caller becomes owner, slug set.
	createBody, _ := json.Marshal(api.CreateOrgRequest{Name: "Test Org", Slug: "test-org"})
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(ownerPriv, ownerID, http.MethodPost, "/v1/organizations", string(createBody)))
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("create org: expected 201, got %d", w.Result().StatusCode)
	}
	var org api.OrgResponse
	json.NewDecoder(w.Result().Body).Decode(&org)
	if org.OwnerDevice != ownerID {
		t.Fatalf("expected owner %s, got %s", ownerID, org.OwnerDevice)
	}
	if org.Slug != "test-org" {
		t.Fatalf("expected slug test-org, got %q", org.Slug)
	}

	// 3. Member cannot see the org before joining -> 0.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(memberPriv, memberID, http.MethodGet, "/v1/organizations", ""))
	var before []api.OrgResponse
	json.NewDecoder(w.Result().Body).Decode(&before)
	if len(before) != 0 {
		t.Fatalf("member before join: expected 0 orgs, got %d", len(before))
	}

	// 4. Member cannot add members (not owner) -> 403.
	addBody, _ := json.Marshal(api.AddOrgMemberRequest{Name: "Hax", Email: "hax@test", Role: "admin"})
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(memberPriv, memberID, http.MethodPost, "/v1/organizations/"+org.ID.String()+"/members", string(addBody)))
	if w.Result().StatusCode != http.StatusForbidden {
		t.Fatalf("member add: expected 403, got %d", w.Result().StatusCode)
	}

	// 5. Owner adds member with device link -> 201.
	addBody, _ = json.Marshal(api.AddOrgMemberRequest{DeviceID: memberID, Name: "Member", Email: "m@test", Role: "member"})
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(ownerPriv, ownerID, http.MethodPost, "/v1/organizations/"+org.ID.String()+"/members", string(addBody)))
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("owner add member: expected 201, got %d", w.Result().StatusCode)
	}

	// 6. Member now sees the org -> 1.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(memberPriv, memberID, http.MethodGet, "/v1/organizations", ""))
	var after []api.OrgResponse
	json.NewDecoder(w.Result().Body).Decode(&after)
	if len(after) != 1 {
		t.Fatalf("member after join: expected 1 org, got %d", len(after))
	}

	// 7. Duplicate slug rejected.
	dupBody, _ := json.Marshal(api.CreateOrgRequest{Name: "Other", Slug: "test-org"})
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(ownerPriv, ownerID, http.MethodPost, "/v1/organizations", string(dupBody)))
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("duplicate slug: expected 400, got %d", w.Result().StatusCode)
	}

	// 8. Admin endpoint (no ZOOP_ADMIN_IDS configured => allowAll) lists the org.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, authReq(ownerPriv, ownerID, http.MethodGet, "/v1/admin/organizations", ""))
	var adm []api.OrgResponse
	json.NewDecoder(w.Result().Body).Decode(&adm)
	if len(adm) < 1 {
		t.Fatalf("admin org list: expected >=1, got %d", len(adm))
	}
}

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

// TestServer_UnregisterDevice verifies a device can delete itself:
// DELETE /v1/devices/{id} returns 204, the device disappears from the registry,
// and its identity can no longer authenticate.
func TestServer_UnregisterDevice(t *testing.T) {
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

	// 1. Register the device.
	reqBody, _ := json.Marshal(api.RegisterDeviceRequest{Name: "Doomed Device", PublicKey: pubStr})
	req := httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(reqBody))
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("register: expected 201, got %d", w.Result().StatusCode)
	}
	var resp api.DeviceResponse
	json.NewDecoder(w.Result().Body).Decode(&resp)

	sign := func(method, path string, body string) *http.Request {
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		payload := api.BuildCanonicalPayload(method, path, ts, nonce, bodyHash(body))
		sig := base64.StdEncoding.EncodeToString(ed25519.Sign(priv, payload))
		var r *http.Request
		if method == http.MethodDelete {
			r = httptest.NewRequest(method, path, nil)
		} else {
			r = httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
		}
		r.Header.Set("X-Zoop-Identity", resp.EndpointID.String())
		r.Header.Set("X-Zoop-Signature", sig)
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		return r
	}

	// 2. Another device cannot unregister this one (403).
	otherPub, otherPriv, _ := ed25519.GenerateKey(rand.Reader)
	otherID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, otherPub))
	st.SaveIdentity(context.Background(), &types.Identity{EndpointID: otherID, PublicKey: otherPub})
	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := uuid.NewString()
	payload := api.BuildCanonicalPayload(http.MethodDelete, "/v1/devices/"+resp.EndpointID.String(), ts, nonce, "")
	sig := base64.StdEncoding.EncodeToString(ed25519.Sign(otherPriv, payload))
	otherReq := httptest.NewRequest(http.MethodDelete, "/v1/devices/"+resp.EndpointID.String(), nil)
	otherReq.Header.Set("X-Zoop-Identity", otherID.String())
	otherReq.Header.Set("X-Zoop-Signature", sig)
	otherReq.Header.Set("X-Zoop-Timestamp", ts)
	otherReq.Header.Set("X-Zoop-Nonce", nonce)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, otherReq)
	if w.Result().StatusCode != http.StatusForbidden {
		t.Fatalf("other device unregister: expected 403, got %d", w.Result().StatusCode)
	}

	// 3. Device unregisters itself (204).
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodDelete, "/v1/devices/"+resp.EndpointID.String(), ""))
	if w.Result().StatusCode != http.StatusNoContent {
		t.Fatalf("unregister self: expected 204, got %d (body %s)", w.Result().StatusCode, w.Result().Body)
	}

	// 4. Device is gone from the registry.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, sign(http.MethodGet, "/v1/devices/"+resp.EndpointID.String(), ""))
	if w.Result().StatusCode != http.StatusUnauthorized {
		t.Fatalf("get after unregister: expected 401 (identity deleted), got %d", w.Result().StatusCode)
	}
	_, err := st.GetDevice(context.Background(), resp.EndpointID)
	if err != store.ErrNotFound {
		t.Fatalf("expected device deleted (ErrNotFound), got %v", err)
	}
	_, err = st.GetIdentity(context.Background(), resp.EndpointID)
	if err != store.ErrNotFound {
		t.Fatalf("expected identity deleted (ErrNotFound), got %v", err)
	}
}

func TestServer_ServeWebApp(t *testing.T) {
	dist := t.TempDir()
	if err := os.WriteFile(filepath.Join(dist, "index.html"), []byte("<html>app</html>"), 0o644); err != nil {
		t.Fatalf("failed to write index.html: %v", err)
	}

	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{WebDistDir: dist}, logger, st, ds, us, orgs, ss, cs, hub)

	// SPA fallback: unknown path returns index.html
	req := httptest.NewRequest(http.MethodGet, "/some/client/route", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for SPA route, got %d", w.Result().StatusCode)
	}
	if got := w.Body.String(); got != "<html>app</html>" {
		t.Fatalf("expected index.html fallback, got %q", got)
	}

	// API routes still take precedence over the SPA fallback.
	req = httptest.NewRequest(http.MethodGet, "/v1/health", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 for /v1/health with web dist configured, got %d", w.Result().StatusCode)
	}
}

func TestServer_AdminDeviceSuspendRestore(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// Admin and target devices: the admin caller manages the target device.
	adminPub, adminPriv, _ := ed25519.GenerateKey(rand.Reader)
	targetPub, _, _ := ed25519.GenerateKey(rand.Reader)

	adminBody, _ := json.Marshal(api.RegisterDeviceRequest{Name: "Admin", PublicKey: base64.StdEncoding.EncodeToString(adminPub)})
	req := httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(adminBody))
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("register admin: expected 201, got %d", w.Result().StatusCode)
	}
	var adminResp api.DeviceResponse
	json.NewDecoder(w.Result().Body).Decode(&adminResp)

	targetBody, _ := json.Marshal(api.RegisterDeviceRequest{Name: "Suspendable", PublicKey: base64.StdEncoding.EncodeToString(targetPub)})
	req = httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(targetBody))
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("register target: expected 201, got %d", w.Result().StatusCode)
	}
	var resp api.DeviceResponse
	json.NewDecoder(w.Result().Body).Decode(&resp)

	auth := func(method, path string) *http.Request {
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		payload := api.BuildCanonicalPayload(method, path, ts, nonce, "")
		sig := base64.StdEncoding.EncodeToString(ed25519.Sign(adminPriv, payload))
		r := httptest.NewRequest(method, path, nil)
		r.Header.Set("X-Zoop-Identity", adminResp.EndpointID.String())
		r.Header.Set("X-Zoop-Signature", sig)
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		return r
	}

	devPath := "/v1/admin/devices/" + resp.ID.String()

	// Suspend a trusted device -> 200, state becomes suspended.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, auth(http.MethodPost, devPath+"/suspend"))
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("suspend: expected 200, got %d", w.Result().StatusCode)
	}
	dev, err := st.GetDevice(context.Background(), resp.ID)
	if err != nil {
		t.Fatal(err)
	}
	if dev.State != types.DeviceStateSuspended {
		t.Fatalf("expected suspended, got %s", dev.State)
	}

	// Restore a suspended device -> 200, state becomes trusted.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, auth(http.MethodPost, devPath+"/restore"))
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("restore: expected 200, got %d", w.Result().StatusCode)
	}
	dev, _ = st.GetDevice(context.Background(), resp.ID)
	if dev.State != types.DeviceStateTrusted {
		t.Fatalf("expected trusted, got %s", dev.State)
	}

	// Restoring a non-suspended device -> 409 conflict.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, auth(http.MethodPost, devPath+"/restore"))
	if w.Result().StatusCode != http.StatusConflict {
		t.Fatalf("restore of trusted device: expected 409, got %d", w.Result().StatusCode)
	}

	// Revoke, then suspending the revoked device -> 409 conflict.
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, auth(http.MethodPost, devPath+"/revoke"))
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("revoke: expected 200, got %d", w.Result().StatusCode)
	}
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, auth(http.MethodPost, devPath+"/suspend"))
	if w.Result().StatusCode != http.StatusConflict {
		t.Fatalf("suspend of revoked device: expected 409, got %d", w.Result().StatusCode)
	}
}

func TestServer_DevicePairing(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// Register Device A (Phone)
	pubA, privA, _ := ed25519.GenerateKey(rand.Reader)
	reqA, _ := json.Marshal(api.RegisterDeviceRequest{Name: "Pixel 8", Platform: "android", PublicKey: base64.StdEncoding.EncodeToString(pubA)})
	recA := httptest.NewRecorder()
	srv.mux.ServeHTTP(recA, httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(reqA)))
	var devA api.DeviceResponse
	json.NewDecoder(recA.Body).Decode(&devA)

	// Register Device B (Router)
	pubB, privB, _ := ed25519.GenerateKey(rand.Reader)
	reqB, _ := json.Marshal(api.RegisterDeviceRequest{Name: "OpenWrt Home Router", Platform: "linux", PublicKey: base64.StdEncoding.EncodeToString(pubB)})
	recB := httptest.NewRecorder()
	srv.mux.ServeHTTP(recB, httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(reqB)))
	var devB api.DeviceResponse
	json.NewDecoder(recB.Body).Decode(&devB)

	// Helper to send authenticated request
	authReq := func(method, path string, priv ed25519.PrivateKey, endpointID types.ID, body []byte) *http.Request {
		r := httptest.NewRequest(method, path, bytes.NewReader(body))
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		p := api.BuildCanonicalPayload(method, path, ts, nonce, bodyHash(string(body)))
		sig := ed25519.Sign(priv, p)
		r.Header.Set("X-Zoop-Identity", endpointID.String())
		r.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		if len(body) > 0 {
			r.Header.Set("Content-Type", "application/json")
		}
		return r
	}

	// 1. Device A creates a pairing token
	wToken := httptest.NewRecorder()
	tokenReqBody, _ := json.Marshal(api.CreatePairingTokenRequest{ExpiresInSeconds: 600})
	srv.mux.ServeHTTP(wToken, authReq(http.MethodPost, "/v1/pairing/token", privA, devA.EndpointID, tokenReqBody))
	if wToken.Result().StatusCode != http.StatusCreated {
		t.Fatalf("create pairing token: expected 201, got %d (%s)", wToken.Result().StatusCode, wToken.Body.String())
	}
	var tokenResp api.PairingTokenResponse
	json.NewDecoder(wToken.Body).Decode(&tokenResp)
	if tokenResp.Code == "" || len(tokenResp.Code) < 6 {
		t.Fatalf("expected valid pairing code, got %s", tokenResp.Code)
	}

	// 2. Device B claims the pairing token
	wClaim := httptest.NewRecorder()
	claimReqBody, _ := json.Marshal(api.ClaimPairingRequest{Code: tokenResp.Code})
	srv.mux.ServeHTTP(wClaim, authReq(http.MethodPost, "/v1/pairing/claim", privB, devB.EndpointID, claimReqBody))
	if wClaim.Result().StatusCode != http.StatusOK {
		t.Fatalf("claim pairing token: expected 200, got %d (%s)", wClaim.Result().StatusCode, wClaim.Body.String())
	}
	var claimResp api.ClaimPairingResponse
	json.NewDecoder(wClaim.Body).Decode(&claimResp)
	if !claimResp.Success || claimResp.PairedDeviceID != devA.EndpointID.String() {
		t.Fatalf("expected successful claim pairing with Device A, got %+v", claimResp)
	}

	// 3. Re-claiming the token should fail (single-use)
	wClaimAgain := httptest.NewRecorder()
	srv.mux.ServeHTTP(wClaimAgain, authReq(http.MethodPost, "/v1/pairing/claim", privB, devB.EndpointID, claimReqBody))
	if wClaimAgain.Result().StatusCode != http.StatusNotFound {
		t.Fatalf("re-claim token: expected 404, got %d", wClaimAgain.Result().StatusCode)
	}

	// 4. Device A checks its Fleet devices
	wFleet := httptest.NewRecorder()
	srv.mux.ServeHTTP(wFleet, authReq(http.MethodGet, "/v1/devices/"+devA.EndpointID.String()+"/fleet", privA, devA.EndpointID, nil))
	if wFleet.Result().StatusCode != http.StatusOK {
		t.Fatalf("get fleet: expected 200, got %d", wFleet.Result().StatusCode)
	}
	var fleet []api.FleetDevice
	json.NewDecoder(wFleet.Body).Decode(&fleet)
	if len(fleet) < 2 {
		t.Fatalf("expected at least 2 fleet devices (self + router), got %d", len(fleet))
	}
	hasRouter := false
	for _, f := range fleet {
		if f.ID == devB.EndpointID.String() {
			hasRouter = true
			if f.IsSelf {
				t.Fatalf("router should not be marked as IsSelf")
			}
		}
	}
	if !hasRouter {
		t.Fatalf("router was not found in Device A's fleet")
	}
}

func TestServer_DiagnosticReports(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// Register device
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	reqA, _ := json.Marshal(api.RegisterDeviceRequest{Name: "Diagnostic Phone", Platform: "android", PublicKey: base64.StdEncoding.EncodeToString(pub)})
	recA := httptest.NewRecorder()
	srv.mux.ServeHTTP(recA, httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(reqA)))
	var dev api.DeviceResponse
	json.NewDecoder(recA.Body).Decode(&dev)

	authReq := func(method, path string, body []byte) *http.Request {
		r := httptest.NewRequest(method, path, bytes.NewReader(body))
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		p := api.BuildCanonicalPayload(method, path, ts, nonce, bodyHash(string(body)))
		sig := ed25519.Sign(priv, p)
		r.Header.Set("X-Zoop-Identity", dev.EndpointID.String())
		r.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		if len(body) > 0 {
			r.Header.Set("Content-Type", "application/json")
		}
		return r
	}

	// 1. Submit diagnostic report
	diagReq, _ := json.Marshal(api.DiagnosticReportRequest{
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		AgentVersion: "1.0.0",
		OS:           "android",
		Healthy:      true,
		NATType:      "full_cone",
		PathMTU:      1420,
	})
	wSub := httptest.NewRecorder()
	srv.mux.ServeHTTP(wSub, authReq(http.MethodPost, "/v1/diagnostics/report", diagReq))
	if wSub.Result().StatusCode != http.StatusCreated {
		t.Fatalf("submit diagnostic report: expected 201, got %d", wSub.Result().StatusCode)
	}

	var subResp api.DiagnosticReportResponse
	if err := json.NewDecoder(wSub.Body).Decode(&subResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if subResp.DeviceID != dev.EndpointID.String() {
		t.Errorf("expected device ID %s, got %s", dev.EndpointID, subResp.DeviceID)
	}

	// 2. Fetch diagnostic reports
	wGet := httptest.NewRecorder()
	srv.mux.ServeHTTP(wGet, authReq(http.MethodGet, "/v1/diagnostics/report/"+dev.EndpointID.String(), nil))
	if wGet.Result().StatusCode != http.StatusOK {
		t.Fatalf("get diagnostic reports: expected 200, got %d", wGet.Result().StatusCode)
	}

	var reports []api.DiagnosticReportRequest
	if err := json.NewDecoder(wGet.Body).Decode(&reports); err != nil {
		t.Fatalf("failed to decode reports: %v", err)
	}
	if len(reports) != 1 {
		t.Fatalf("expected 1 report, got %d", len(reports))
	}
	if reports[0].NATType != "full_cone" || reports[0].PathMTU != 1420 {
		t.Errorf("report data mismatch: %+v", reports[0])
	}
}

func TestServer_WalletEndpoints(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	// 1. Register device
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	reqDev, _ := json.Marshal(api.RegisterDeviceRequest{
		Name:      "Wallet Test Phone",
		Platform:  "android",
		PublicKey: base64.StdEncoding.EncodeToString(pub),
	})
	recDev := httptest.NewRecorder()
	srv.mux.ServeHTTP(recDev, httptest.NewRequest(http.MethodPost, "/v1/devices", bytes.NewReader(reqDev)))
	if recDev.Result().StatusCode != http.StatusCreated {
		t.Fatalf("register device: expected 201, got %d", recDev.Result().StatusCode)
	}
	var dev api.DeviceResponse
	json.NewDecoder(recDev.Body).Decode(&dev)

	authReq := func(method, path string, body []byte) *http.Request {
		r := httptest.NewRequest(method, path, bytes.NewReader(body))
		ts := time.Now().UTC().Format(time.RFC3339)
		nonce := uuid.NewString()
		p := api.BuildCanonicalPayload(method, r.URL.Path, ts, nonce, bodyHash(string(body)))
		sig := ed25519.Sign(priv, p)
		r.Header.Set("X-Zoop-Identity", dev.EndpointID.String())
		r.Header.Set("X-Zoop-Signature", base64.StdEncoding.EncodeToString(sig))
		r.Header.Set("X-Zoop-Timestamp", ts)
		r.Header.Set("X-Zoop-Nonce", nonce)
		if len(body) > 0 {
			r.Header.Set("Content-Type", "application/json")
		}
		return r
	}

	// 2. GET /v1/wallet (initial query)
	wGetWallet := httptest.NewRecorder()
	srv.mux.ServeHTTP(wGetWallet, authReq(http.MethodGet, "/v1/wallet", nil))
	if wGetWallet.Result().StatusCode != http.StatusOK {
		t.Fatalf("get wallet: expected 200, got %d", wGetWallet.Result().StatusCode)
	}
	var initialWallet types.Wallet
	if err := json.NewDecoder(wGetWallet.Body).Decode(&initialWallet); err != nil {
		t.Fatalf("failed to decode wallet: %v", err)
	}
	if initialWallet.AvailableBalance != 0 {
		t.Errorf("expected 0 available balance, got %f", initialWallet.AvailableBalance)
	}

	// 3. POST /v1/wallet/deposit/mobile-money
	depPayload, _ := json.Marshal(map[string]interface{}{
		"amount":       25000,
		"phone_number": "0771234567",
		"provider":     "mtn",
		"description":  "Zoop wallet top-up",
	})
	wDeposit := httptest.NewRecorder()
	srv.mux.ServeHTTP(wDeposit, authReq(http.MethodPost, "/v1/wallet/deposit/mobile-money", depPayload))
	if wDeposit.Result().StatusCode != http.StatusOK {
		t.Fatalf("initiate deposit: expected 200, got %d (body: %s)", wDeposit.Result().StatusCode, wDeposit.Body.String())
	}
	var depResp payments.DepositResponse
	if err := json.NewDecoder(wDeposit.Body).Decode(&depResp); err != nil {
		t.Fatalf("failed to decode deposit response: %v", err)
	}
	if depResp.Reference == "" || depResp.Status != types.StatusPending {
		t.Errorf("unexpected deposit response: %+v", depResp)
	}

	// 4. POST /v1/payments/webhook (settle the deposit)
	whPayload, _ := json.Marshal(map[string]interface{}{
		"event":            "collection.successful",
		"transaction_uuid": "mock-gw-txn-123",
		"reference":        depResp.Reference,
		"status":           "success",
		"amount":           25000,
		"currency":         "UGX",
	})
	whReq := httptest.NewRequest(http.MethodPost, "/v1/payments/webhook", bytes.NewReader(whPayload))
	whReq.Header.Set("Content-Type", "application/json")
	wWebhook := httptest.NewRecorder()
	srv.mux.ServeHTTP(wWebhook, whReq)
	if wWebhook.Result().StatusCode != http.StatusOK {
		t.Fatalf("webhook: expected 200, got %d (body: %s)", wWebhook.Result().StatusCode, wWebhook.Body.String())
	}

	// 5. GET /v1/wallet (verify balance credited)
	wGetWallet2 := httptest.NewRecorder()
	srv.mux.ServeHTTP(wGetWallet2, authReq(http.MethodGet, "/v1/wallet", nil))
	if wGetWallet2.Result().StatusCode != http.StatusOK {
		t.Fatalf("get wallet after webhook: expected 200, got %d", wGetWallet2.Result().StatusCode)
	}
	var updatedWallet types.Wallet
	if err := json.NewDecoder(wGetWallet2.Body).Decode(&updatedWallet); err != nil {
		t.Fatalf("failed to decode updated wallet: %v", err)
	}
	if updatedWallet.AvailableBalance != 25000 {
		t.Errorf("expected available balance 25000, got %f", updatedWallet.AvailableBalance)
	}

	// 6. POST /v1/wallet/withdraw
	wdrPayload, _ := json.Marshal(map[string]interface{}{
		"amount":       10000,
		"phone_number": "0771234567",
		"provider":     "mtn",
		"description":  "Cash out earnings",
	})
	wWithdraw := httptest.NewRecorder()
	srv.mux.ServeHTTP(wWithdraw, authReq(http.MethodPost, "/v1/wallet/withdraw", wdrPayload))
	if wWithdraw.Result().StatusCode != http.StatusOK {
		t.Fatalf("withdraw: expected 200, got %d (body: %s)", wWithdraw.Result().StatusCode, wWithdraw.Body.String())
	}

	// 7. GET /v1/wallet/transactions
	wTxns := httptest.NewRecorder()
	srv.mux.ServeHTTP(wTxns, authReq(http.MethodGet, "/v1/wallet/transactions?limit=10", nil))
	if wTxns.Result().StatusCode != http.StatusOK {
		t.Fatalf("list transactions: expected 200, got %d", wTxns.Result().StatusCode)
	}
	var txnList payments.TransactionListResponse
	if err := json.NewDecoder(wTxns.Body).Decode(&txnList); err != nil {
		t.Fatalf("failed to decode transactions: %v", err)
	}
	if txnList.Total != 2 {
		t.Errorf("expected 2 transactions, got %d", txnList.Total)
	}
}

func TestServer_Auth_SignupAndLogin(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	orgs := services.NewOrganizationService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, orgs, ss, cs, hub)

	_, pub1, _ := ed25519.GenerateKey(rand.Reader)
	pub1Str := base64.StdEncoding.EncodeToString(pub1)

	// 1. Signup with valid credentials
	signupBody, _ := json.Marshal(api.AuthSignupRequest{
		Username:   "testuser",
		PIN:        "123456",
		Name:       "Test User",
		DeviceName: "MacBook Pro",
		Platform:   "web",
		PublicKey:  pub1Str,
	})

	wSignup := httptest.NewRecorder()
	srv.mux.ServeHTTP(wSignup, httptest.NewRequest(http.MethodPost, "/v1/auth/signup", bytes.NewReader(signupBody)))

	if wSignup.Result().StatusCode != http.StatusCreated {
		t.Fatalf("expected 201 Created on signup, got %d (body: %s)", wSignup.Result().StatusCode, wSignup.Body.String())
	}

	var signupResp api.AuthResponse
	if err := json.NewDecoder(wSignup.Body).Decode(&signupResp); err != nil {
		t.Fatalf("failed to decode signup response: %v", err)
	}
	if signupResp.User.Username != "testuser" {
		t.Errorf("expected username 'testuser', got %q", signupResp.User.Username)
	}
	if signupResp.User.ZoopID == "" {
		t.Errorf("expected non-empty ZoopID")
	}

	// 2. Signup duplicate username -> Conflict 409
	wSignupDup := httptest.NewRecorder()
	srv.mux.ServeHTTP(wSignupDup, httptest.NewRequest(http.MethodPost, "/v1/auth/signup", bytes.NewReader(signupBody)))
	if wSignupDup.Result().StatusCode != http.StatusConflict {
		t.Errorf("expected 409 Conflict for duplicate username, got %d", wSignupDup.Result().StatusCode)
	}

	// 3. Login with wrong PIN -> 401 Unauthorized
	_, pub2, _ := ed25519.GenerateKey(rand.Reader)
	pub2Str := base64.StdEncoding.EncodeToString(pub2)

	badLoginBody, _ := json.Marshal(api.AuthLoginRequest{
		Identifier: "testuser",
		PIN:        "999999",
		DeviceName: "Another Device",
		Platform:   "web",
		PublicKey:  pub2Str,
	})
	wBadLogin := httptest.NewRecorder()
	srv.mux.ServeHTTP(wBadLogin, httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(badLoginBody)))
	if wBadLogin.Result().StatusCode != http.StatusUnauthorized {
		t.Errorf("expected 401 Unauthorized for wrong PIN, got %d", wBadLogin.Result().StatusCode)
	}

	// 4. Login with correct PIN and username -> 200 OK
	goodLoginBody, _ := json.Marshal(api.AuthLoginRequest{
		Identifier: "testuser",
		PIN:        "123456",
		DeviceName: "Another Device",
		Platform:   "web",
		PublicKey:  pub2Str,
	})
	wGoodLogin := httptest.NewRecorder()
	srv.mux.ServeHTTP(wGoodLogin, httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(goodLoginBody)))
	if wGoodLogin.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for valid login, got %d (body: %s)", wGoodLogin.Result().StatusCode, wGoodLogin.Body.String())
	}

	var loginResp api.AuthResponse
	if err := json.NewDecoder(wGoodLogin.Body).Decode(&loginResp); err != nil {
		t.Fatalf("failed to decode login response: %v", err)
	}
	if loginResp.User.ID != signupResp.User.ID {
		t.Errorf("expected user ID %s, got %s", signupResp.User.ID, loginResp.User.ID)
	}

	// 5. Login using Zoop ID -> 200 OK
	goodZoopIDLogin, _ := json.Marshal(api.AuthLoginRequest{
		Identifier: signupResp.User.ZoopID,
		PIN:        "123456",
		DeviceName: "Third Device",
		Platform:   "web",
		PublicKey:  pub2Str,
	})
	wZoopLogin := httptest.NewRecorder()
	srv.mux.ServeHTTP(wZoopLogin, httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(goodZoopIDLogin)))
	if wZoopLogin.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK for ZoopID login, got %d", wZoopLogin.Result().StatusCode)
	}
}

