package client

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

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

	// Inject Zoop Authentication Headers
	// The dummy payload used in M4 is "zoop-m4-auth".
	// In production, this would be a signature over the URL path, body, and timestamp.
	sig := ed25519.Sign(c.PrivateKey, []byte("zoop-m4-auth"))
	sigStr := base64.StdEncoding.EncodeToString(sig)

	req.Header.Set("X-Zoop-Identity", c.Identity.EndpointID.String())
	req.Header.Set("X-Zoop-Signature", sigStr)

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
func (c *APIClient) RegisterDevice(ctx context.Context, name string) (*api.DeviceResponse, error) {
	req := api.RegisterDeviceRequest{
		Name:      name,
		PublicKey: base64.StdEncoding.EncodeToString(c.Identity.PublicKey),
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
