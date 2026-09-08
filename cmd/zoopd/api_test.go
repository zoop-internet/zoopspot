package main

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/agent/client"
	"github.com/zoop-internet/zoop/packages/agent/tunnel"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func newTestDaemonAPI(t *testing.T, cloudHandler http.HandlerFunc) (*daemonAPI, http.Handler) {
	t.Helper()

	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	ident := types.Identity{
		EndpointID: types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub)),
		PublicKey:  pub,
	}

	cloud := httptest.NewServer(cloudHandler)
	t.Cleanup(cloud.Close)

	apiClient := client.NewAPIClient(cloud.URL, ident, priv)

	devMgr, err := tunnel.NewMockDeviceManager("zoopapitest0", nil)
	if err != nil {
		t.Fatalf("failed to create mock device manager: %v", err)
	}
	t.Cleanup(devMgr.Close)

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	sigClient := client.NewSignalingClient(apiClient, devMgr, logger)

	d := &daemonAPI{
		ctx:       context.Background(),
		logger:    logger,
		apiClient: apiClient,
		sigClient: sigClient,
		devMgr:    devMgr,
		configDir: "/tmp/zoop-test",
	}

	return d, d.routes()
}

func TestDaemonAPI_Status(t *testing.T) {
	_, handler := newTestDaemonAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`[]`))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Result().StatusCode)
	}
	var st apiStatus
	if err := json.NewDecoder(w.Result().Body).Decode(&st); err != nil {
		t.Fatalf("failed to decode status: %v", err)
	}
	if !st.Running {
		t.Fatalf("expected running=true")
	}
	if st.EndpointID == "" {
		t.Fatalf("expected non-empty endpoint_id")
	}
	if st.WireGuardKey == "" {
		t.Fatalf("expected non-empty wireguard key")
	}
	if st.ActiveTunnels != 0 {
		t.Fatalf("expected 0 active tunnels, got %d", st.ActiveTunnels)
	}
}

func TestDaemonAPI_Peers(t *testing.T) {
	_, handler := newTestDaemonAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		// Return two devices; the daemon's own identity is not present, so both
		// show up as peers.
		w.Write([]byte(`[
			{"id":"11111111-1111-1111-1111-111111111111","name":"Alice Phone","status":"online"},
			{"id":"22222222-2222-2222-2222-222222222222","name":"Bob Laptop","status":"trusted"}
		]`))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/peers", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Result().StatusCode)
	}
	var peers []apiPeer
	if err := json.NewDecoder(w.Result().Body).Decode(&peers); err != nil {
		t.Fatalf("failed to decode peers: %v", err)
	}
	if len(peers) != 2 {
		t.Fatalf("expected 2 peers, got %d", len(peers))
	}
	if peers[0].Name == "" {
		t.Fatalf("expected peer name to be populated")
	}
	if !peers[0].Online {
		t.Fatalf("expected online peer to be flagged online")
	}
}

func TestDaemonAPI_ConnectAndDisconnect(t *testing.T) {
	_, handler := newTestDaemonAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v1/connections":
			w.WriteHeader(http.StatusCreated)
			w.Write([]byte(`{"id":"aaaa0000-0000-0000-0000-000000000001","provider_id":"11111111-1111-1111-1111-111111111111","recipient_id":"22222222-2222-2222-2222-222222222222","state":"REQUESTED","provider_ip":"100.64.0.1","recipient_ip":"100.64.0.2"}`))
		case r.Method == http.MethodPut && strings.HasSuffix(r.URL.Path, "/state"):
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"updated"}`))
		default:
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`[]`))
		}
	})

	// Connect
	body := `{"peer_id":"11111111-1111-1111-1111-111111111111"}`
	req := httptest.NewRequest(http.MethodPost, "/api/connect", strings.NewReader(body))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusCreated {
		t.Fatalf("connect: expected 201, got %d", w.Result().StatusCode)
	}
	var conn api.ConnectionResponse
	if err := json.NewDecoder(w.Result().Body).Decode(&conn); err != nil {
		t.Fatalf("failed to decode connection: %v", err)
	}
	if conn.State != types.ConnectionStateRequested {
		t.Fatalf("expected REQUESTED state, got %s", conn.State)
	}

	// Disconnect
	dbody := `{"connection_id":"` + conn.ID.String() + `"}`
	req = httptest.NewRequest(http.MethodPost, "/api/disconnect", strings.NewReader(dbody))
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Result().StatusCode != http.StatusOK {
		t.Fatalf("disconnect: expected 200, got %d (body %s)", w.Result().StatusCode, w.Result().Body)
	}
}
