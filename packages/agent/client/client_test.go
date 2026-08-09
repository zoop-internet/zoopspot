package client

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func TestAPIClient_RegisterDevice(t *testing.T) {
	// Create identity
	pub, priv, _ := ed25519.GenerateKey(rand.Reader)
	endpointID := types.ID(uuid.NewSHA1(uuid.NameSpaceOID, pub))
	ident := types.Identity{
		EndpointID: endpointID,
		PublicKey:  pub,
	}

	// Mock server
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/devices" {
			t.Errorf("expected path /v1/devices, got %s", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("expected POST method, got %s", r.Method)
		}
		
		// Check headers
		if r.Header.Get("X-Zoop-Identity") != endpointID.String() {
			t.Errorf("missing or incorrect X-Zoop-Identity header")
		}
		if r.Header.Get("X-Zoop-Signature") == "" {
			t.Errorf("missing X-Zoop-Signature header")
		}

		resp := api.DeviceResponse{
			ID:     endpointID,
			Status: "active",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(resp)
	}))
	defer mockServer.Close()

	// Run test
	c := NewAPIClient(mockServer.URL, ident, priv)
	
	reqCtx, cancelReq := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancelReq()
	resp, err := c.RegisterDevice(reqCtx, "test-device", "")
	if err != nil {
		t.Fatalf("RegisterDevice failed: %v", err)
	}

	if resp.ID != endpointID {
		t.Errorf("expected id %v, got %v", endpointID, resp.ID)
	}
	if resp.Status != "active" {
		t.Errorf("expected active status, got %s", resp.Status)
	}
}
