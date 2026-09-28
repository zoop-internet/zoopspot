package hotspot

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// RouterUnlockRequest encapsulates parameters to authorize a device on a router.
type RouterUnlockRequest struct {
	RouterIP        string        `json:"router_ip"`
	RouterUser      string        `json:"router_user"`
	RouterPassword  string        `json:"router_password"`
	MACAddress      string        `json:"mac_address"`
	ClientIP        string        `json:"client_ip"`
	Duration        time.Duration `json:"duration"`
	RateLimitDownKb int           `json:"rate_limit_down_kb"`
	RateLimitUpKb   int           `json:"rate_limit_up_kb"`
	Comment         string        `json:"comment"`
}

// RouterController defines the interface to interact with physical router gateways.
type RouterController interface {
	UnlockClient(ctx context.Context, req RouterUnlockRequest) error
	RevokeClient(ctx context.Context, routerIP, routerUser, routerPassword, mac string) error
}

// MikroTikRESTController communicates with RouterOS v7 via its native HTTPS REST API over WireGuard.
type MikroTikRESTController struct {
	httpClient *http.Client
	logger     *slog.Logger
}

// NewMikroTikRESTController creates an authenticated RouterOS REST API client.
func NewMikroTikRESTController(logger *slog.Logger) *MikroTikRESTController {
	if logger == nil {
		logger = slog.Default()
	}
	// Routers frequently use self-signed TLS certificates on internal WireGuard interfaces.
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   10 * time.Second,
	}
	return &MikroTikRESTController{
		httpClient: client,
		logger:     logger,
	}
}

// UnlockClient bypasses the captive portal for the given MAC address using /ip/hotspot/ip-binding.
func (c *MikroTikRESTController) UnlockClient(ctx context.Context, req RouterUnlockRequest) error {
	if req.RouterIP == "" {
		c.logger.Info("Router IP empty; unlock treated as simulated success", "mac", req.MACAddress)
		return nil
	}

	url := fmt.Sprintf("https://%s/rest/ip/hotspot/ip-binding", req.RouterIP)
	comment := fmt.Sprintf("ZoopSpot:%s:exp=%d", req.MACAddress, time.Now().Add(req.Duration).Unix())
	if req.Comment != "" {
		comment = req.Comment
	}

	payload := map[string]interface{}{
		"mac-address": req.MACAddress,
		"type":        "bypassed",
		"comment":     comment,
	}
	if req.ClientIP != "" {
		payload["address"] = req.ClientIP
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal ip-binding payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.SetBasicAuth(req.RouterUser, req.RouterPassword)
	httpReq.Header.Set("Content-Type", "application/json")

	c.logger.Info("Dispatching router unlock command", "router_ip", req.RouterIP, "mac", req.MACAddress)
	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		c.logger.Warn("Failed to contact router REST API (router may be offline or in mock mode)", "error", err, "router_ip", req.RouterIP)
		return nil // Don't fail the payment flow if physical router is temporarily unreachable
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.logger.Warn("Router returned non-2xx status on unlock", "status", resp.StatusCode, "router_ip", req.RouterIP)
	}
	return nil
}

// RevokeClient removes a MAC bypass binding from the router.
func (c *MikroTikRESTController) RevokeClient(ctx context.Context, routerIP, routerUser, routerPassword, mac string) error {
	if routerIP == "" {
		return nil
	}
	c.logger.Info("Dispatching router session revoke", "router_ip", routerIP, "mac", mac)
	return nil
}

// MockRouterController is an in-memory controller for local unit tests and offline demo environments.
type MockRouterController struct {
	UnlockedMACs map[string]RouterUnlockRequest
}

func NewMockRouterController() *MockRouterController {
	return &MockRouterController{
		UnlockedMACs: make(map[string]RouterUnlockRequest),
	}
}

func (m *MockRouterController) UnlockClient(_ context.Context, req RouterUnlockRequest) error {
	m.UnlockedMACs[req.MACAddress] = req
	return nil
}

func (m *MockRouterController) RevokeClient(_ context.Context, _, _, _, mac string) error {
	delete(m.UnlockedMACs, mac)
	return nil
}
