package server

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
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
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, ss, cs, hub)

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
	if resp.Status != "trusted" && resp.Status != "active" {
		t.Fatalf("expected trusted or active status, got %s", resp.Status)
	}
}

func TestServer_AuthMiddleware(t *testing.T) {
	st := store.NewInMemoryStore()
	ds := services.NewDeviceService(st)
	us := services.NewUserService(st)
	ss := services.NewShareService(st)
	hub := services.NewSignalingHub()
	cs := services.NewConnectionService(st, hub)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	srv := NewServer(config.Config{}, logger, st, ds, us, ss, cs, hub)

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
