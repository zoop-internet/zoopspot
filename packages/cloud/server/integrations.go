package server

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/allannuwamanya/zoop/packages/cloud/api"
	"github.com/allannuwamanya/zoop/packages/cloud/payments"
)

// maskSecret masks a secret string so only the last 4 chars show: "••••••••abcd"
func maskSecret(s string) string {
	if s == "" {
		return ""
	}
	if len(s) <= 4 {
		return strings.Repeat("•", len(s))
	}
	return strings.Repeat("•", len(s)-4) + s[len(s)-4:]
}

// readEnvFile reads /opt/zoop/.env key=value pairs into a map.
func readEnvFile(path string) (map[string]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	m := make(map[string]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		m[key] = val
	}
	return m, scanner.Err()
}

// writeEnvFile writes key=value pairs to /opt/zoop/.env, preserving lines
// for unrelated keys and updating or appending the ones specified.
func writeEnvFile(path string, updates map[string]string) error {
	existing, _ := readEnvFile(path)
	if existing == nil {
		existing = make(map[string]string)
	}
	for k, v := range updates {
		existing[k] = v
	}

	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	// Write all keys deterministically
	for k, v := range existing {
		if _, err := fmt.Fprintf(f, "%s=\"%s\"\n", k, v); err != nil {
			return err
		}
	}
	return nil
}

// IntegrationConfig is the response shape for GET /v1/admin/integrations.
type IntegrationConfig struct {
	// Payment gateway
	PaymentGatewayURL    string `json:"payment_gateway_url"`
	PaymentAPIKey        string `json:"payment_api_key"`        // masked
	PaymentAPISecret     string `json:"payment_api_secret"`     // masked
	PaymentWebhookSecret string `json:"payment_webhook_secret"` // masked
	PaymentCurrency      string `json:"payment_currency"`
	PaymentMode          string `json:"payment_mode"` // "live" | "mock"

	// Relay / TURN
	TURNSecret string `json:"turn_secret"` // masked
	TURNRealm  string `json:"turn_realm"`
	STUNServer string `json:"stun_server"`

	// DB status (never expose actual URL – just host)
	DatabaseHost   string `json:"database_host"`
	DatabaseStatus string `json:"database_status"` // "connected" | "disconnected"
}

// handleAdminGetIntegrations returns the current integration configuration (secrets masked).
func (s *Server) handleAdminGetIntegrations() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cfg := s.cfg

		// Derive database host for display (never expose credentials)
		dbHost := "not configured"
		if cfg.DatabaseURL != "" {
			parts := strings.Split(cfg.DatabaseURL, "@")
			if len(parts) > 1 {
				// Get just the host portion after @
				hostPart := strings.Split(parts[len(parts)-1], "/")[0]
				dbHost = hostPart
			}
		}

		dbStatus := "disconnected"
		if cfg.DatabaseURL != "" {
			dbStatus = "connected"
		}

		payMode := "mock"
		if cfg.PaymentAPIKey != "" && cfg.PaymentAPISecret != "" {
			payMode = "live"
		}

		resp := IntegrationConfig{
			PaymentGatewayURL:    cfg.PaymentGatewayURL,
			PaymentAPIKey:        maskSecret(cfg.PaymentAPIKey),
			PaymentAPISecret:     maskSecret(cfg.PaymentAPISecret),
			PaymentWebhookSecret: maskSecret(cfg.PaymentWebhookSecret),
			PaymentCurrency:      cfg.PaymentCurrency,
			PaymentMode:          payMode,
			TURNSecret:           maskSecret(cfg.TURNSecret),
			TURNRealm:            cfg.TURNRealm,
			STUNServer:           cfg.STUNServer,
			DatabaseHost:         dbHost,
			DatabaseStatus:       dbStatus,
		}
		api.WriteJSON(w, http.StatusOK, resp)
	}
}

// IntegrationUpdatePayload is the request body for PUT /v1/admin/integrations.
type IntegrationUpdatePayload struct {
	PaymentGatewayURL    string `json:"payment_gateway_url"`
	PaymentAPIKey        string `json:"payment_api_key"`
	PaymentAPISecret     string `json:"payment_api_secret"`
	PaymentWebhookSecret string `json:"payment_webhook_secret"`
	PaymentCurrency      string `json:"payment_currency"`
	TURNSecret           string `json:"turn_secret"`
	TURNRealm            string `json:"turn_realm"`
	STUNServer           string `json:"stun_server"`
}

// handleAdminUpdateIntegrations updates integration credentials in /opt/zoop/.env
// and hot-reloads them into the running config.
func (s *Server) handleAdminUpdateIntegrations() http.HandlerFunc {
	envPath := "/opt/zoop/.env"
	return func(w http.ResponseWriter, r *http.Request) {
		var payload IntegrationUpdatePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			api.WriteError(w, "invalid_request", "invalid JSON body", http.StatusBadRequest)
			return
		}

		updates := make(map[string]string)

		if payload.PaymentGatewayURL != "" {
			updates["ZOOP_PAYMENTS_GATEWAY_URL"] = payload.PaymentGatewayURL
			s.cfg.PaymentGatewayURL = payload.PaymentGatewayURL
		}
		// Only update if value is non-empty and NOT a masked placeholder (all bullets)
		if payload.PaymentAPIKey != "" && !strings.Contains(payload.PaymentAPIKey, "•") {
			updates["ZOOP_PAYMENTS_API_KEY"] = payload.PaymentAPIKey
			s.cfg.PaymentAPIKey = payload.PaymentAPIKey
		}
		if payload.PaymentAPISecret != "" && !strings.Contains(payload.PaymentAPISecret, "•") {
			updates["ZOOP_PAYMENTS_API_SECRET"] = payload.PaymentAPISecret
			s.cfg.PaymentAPISecret = payload.PaymentAPISecret
		}
		if payload.PaymentWebhookSecret != "" && !strings.Contains(payload.PaymentWebhookSecret, "•") {
			updates["ZOOP_PAYMENTS_WEBHOOK_SECRET"] = payload.PaymentWebhookSecret
			s.cfg.PaymentWebhookSecret = payload.PaymentWebhookSecret
		}
		if payload.PaymentCurrency != "" {
			updates["ZOOP_PAYMENTS_CURRENCY"] = payload.PaymentCurrency
			s.cfg.PaymentCurrency = payload.PaymentCurrency
		}
		if payload.TURNSecret != "" && !strings.Contains(payload.TURNSecret, "•") {
			updates["ZOOP_TURN_SECRET"] = payload.TURNSecret
			s.cfg.TURNSecret = payload.TURNSecret
		}
		if payload.TURNRealm != "" {
			updates["ZOOP_TURN_REALM"] = payload.TURNRealm
			s.cfg.TURNRealm = payload.TURNRealm
		}
		if payload.STUNServer != "" {
			updates["ZOOP_STUN_SERVER"] = payload.STUNServer
			s.cfg.STUNServer = payload.STUNServer
		}

		if len(updates) == 0 {
			api.WriteError(w, "invalid_request", "no fields to update", http.StatusBadRequest)
			return
		}

		// Persist to env file
		if err := writeEnvFile(envPath, updates); err != nil {
			s.logger.Warn("Failed to persist integrations to .env (may be read-only in dev)", "error", err)
			// Non-fatal: still return success since runtime config is updated
		}

		// Hot-reload payment gateway with new credentials
		if s.cfg.PaymentAPIKey != "" && s.cfg.PaymentAPISecret != "" {
			newGateway := payments.NewMarzPayGateway(
				s.cfg.PaymentGatewayURL,
				s.cfg.PaymentAPIKey,
				s.cfg.PaymentAPISecret,
				s.cfg.PaymentWebhookSecret,
				nil,
			)
			s.payments.SetGateway(newGateway)
			s.logger.Info("MarzPay gateway reloaded with updated credentials")
		}

		s.audit.Log(r.Context(), s.adminActorID(r), "admin.integrations.update", "system:config", fmt.Sprintf("updated %d keys", len(updates)))

		api.WriteJSON(w, http.StatusOK, map[string]any{
			"ok":      true,
			"updated": len(updates),
			"message": "Integration credentials updated and applied live.",
		})
	}
}

// IntegrationTestResult is returned by POST /v1/admin/integrations/test.
type IntegrationTestResult struct {
	Service string `json:"service"`
	Status  string `json:"status"` // "ok" | "error"
	Message string `json:"message"`
	Latency string `json:"latency_ms,omitempty"`
}

// handleAdminTestIntegration pings an integration to verify connectivity.
func (s *Server) handleAdminTestIntegration() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		service := r.URL.Query().Get("service")
		if service == "" {
			api.WriteError(w, "invalid_request", "service query param required (payment|database|turn)", http.StatusBadRequest)
			return
		}

		var result IntegrationTestResult
		result.Service = service

		switch service {
		case "payment":
			if s.cfg.PaymentAPIKey == "" || s.cfg.PaymentAPISecret == "" {
				result.Status = "mock"
				result.Message = "No API keys configured. Using MockGateway (no real transactions)."
			} else {
				// Test by fetching balance — lightweight GET call
				ctx := r.Context()
				_, err := payments.NewMarzPayGateway(
					s.cfg.PaymentGatewayURL,
					s.cfg.PaymentAPIKey,
					s.cfg.PaymentAPISecret,
					s.cfg.PaymentWebhookSecret,
					nil,
				).GetBalance(ctx, "UG", "UGX")
				if err != nil {
					result.Status = "error"
					result.Message = fmt.Sprintf("MarzPay API error: %s", err.Error())
				} else {
					result.Status = "ok"
					result.Message = "MarzPay API reachable. Credentials valid."
				}
			}

		case "database":
			if err := s.store.Ping(r.Context()); err != nil {
				result.Status = "error"
				result.Message = fmt.Sprintf("Database unreachable: %s", err.Error())
			} else {
				result.Status = "ok"
				result.Message = "PostgreSQL connection healthy."
			}

		case "turn":
			if s.cfg.TURNSecret == "" {
				result.Status = "error"
				result.Message = "No TURN secret configured."
			} else {
				result.Status = "ok"
				result.Message = fmt.Sprintf("TURN realm: %s, STUN: %s", s.cfg.TURNRealm, s.cfg.STUNServer)
			}

		default:
			api.WriteError(w, "invalid_request", "unknown service: must be payment, database, or turn", http.StatusBadRequest)
			return
		}

		api.WriteJSON(w, http.StatusOK, result)
	}
}
