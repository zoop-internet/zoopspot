package client

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
	"net/http"
	"time"

	"github.com/zoop-internet/zoop/packages/cloud/api"
	"github.com/zoop-internet/zoop/packages/core/types"
)

// APIClient is the Agent's HTTP client for communicating with the Zoop Cloud.
type APIClient struct {
	BaseURL    string
	Identity   types.Identity
	PrivateKey ed25519.PrivateKey
	HTTPClient *http.Client
}

// NewAPIClient creates a new API client configured with the agent's identity.
func NewAPIClient(baseURL string, ident types.Identity, priv ed25519.PrivateKey) *APIClient {
	return &APIClient{
		BaseURL:    baseURL,
		Identity:   ident,
		PrivateKey: priv,
		HTTPClient: &http.Client{},
	}
}

// do makes an HTTP request, automatically signing it for Zoop authentication.
func (c *APIClient) do(ctx context.Context, method, path string, body interface{}, out interface{}) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Inject Zoop Authentication Headers with v2 Canonical Payload & Nonce
	ts := time.Now().UTC().Format(time.RFC3339)
	nonce := types.NewID().String()

	bodyHash := ""
	if body != nil {
		if b, err := json.Marshal(body); err == nil && len(b) > 0 {
			hash := sha256.Sum256(b)
			bodyHash = hex.EncodeToString(hash[:])
		}
	}

	payload := api.BuildCanonicalPayload(method, path, ts, nonce, bodyHash)
	sig := ed25519.Sign(c.PrivateKey, payload)
	sigStr := base64.StdEncoding.EncodeToString(sig)

	req.Header.Set("X-Zoop-Identity", c.Identity.EndpointID.String())
	req.Header.Set("X-Zoop-Signature", sigStr)
	req.Header.Set("X-Zoop-Timestamp", ts)
	req.Header.Set("X-Zoop-Nonce", nonce)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errResp api.ErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errResp); err == nil {
			return fmt.Errorf("api error %s: %s", errResp.Error.Code, errResp.Error.Message)
		}
		return fmt.Errorf("api request failed with status: %s", resp.Status)
	}

	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

// RegisterDevice registers this agent's identity with the Zoop Cloud.
func (c *APIClient) RegisterDevice(ctx context.Context, name, wgPubKey string) (*api.DeviceResponse, error) {
	req := api.RegisterDeviceRequest{
		Name:               name,
		PublicKey:          base64.StdEncoding.EncodeToString(c.Identity.PublicKey),
		WireGuardPublicKey: wgPubKey,
	}

	var resp api.DeviceResponse
	// Note: Registration in M4 is unauthenticated initially as the device isn't saved yet,
	// but sending auth headers won't hurt, or we could skip them. Our do() method adds them.
	err := c.do(ctx, http.MethodPost, "/v1/devices", req, &resp)
	return &resp, err
}

// DiscoverEndpoints fetches the public endpoints/keys for a given device ID.
func (c *APIClient) DiscoverEndpoints(ctx context.Context, deviceID types.ID) (*api.EndpointsResponse, error) {
	var resp api.EndpointsResponse
	path := fmt.Sprintf("/v1/devices/%s/endpoints", deviceID.String())
	err := c.do(ctx, http.MethodGet, path, nil, &resp)
	return &resp, err
}

// RequestConnection asks the Cloud to establish a connection with a Provider.
func (c *APIClient) RequestConnection(ctx context.Context, providerID types.ID) (*api.ConnectionResponse, error) {
	req := api.CreateConnectionRequest{
		ProviderID:  providerID,
		RecipientID: c.Identity.EndpointID,
	}

	var resp api.ConnectionResponse
	err := c.do(ctx, http.MethodPost, "/v1/connections", req, &resp)
	return &resp, err
}

// UpdateConnectionState tells the Cloud to update the state of an existing connection.
func (c *APIClient) UpdateConnectionState(ctx context.Context, connID types.ID, state types.ConnectionState) error {
	req := api.UpdateConnectionStateRequest{
		State: state,
	}

	path := fmt.Sprintf("/v1/connections/%s/state", connID.String())
	return c.do(ctx, http.MethodPut, path, req, nil)
}

// GetConnection fetches a specific connection by ID.
func (c *APIClient) GetConnection(ctx context.Context, connID types.ID) (*api.ConnectionResponse, error) {
	var resp api.ConnectionResponse
	path := fmt.Sprintf("/v1/connections/%s", connID.String())
	err := c.do(ctx, http.MethodGet, path, nil, &resp)
	return &resp, err
}

// GetPendingConnections fetches all pending connections for a device.
func (c *APIClient) GetPendingConnections(ctx context.Context, deviceID types.ID) ([]api.ConnectionResponse, error) {
	var resp []api.ConnectionResponse
	path := fmt.Sprintf("/v1/devices/%s/connections/pending", deviceID.String())
	err := c.do(ctx, http.MethodGet, path, nil, &resp)
	return resp, err
}
