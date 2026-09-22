package payments

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// MobileMoneyCollectionReq contains inputs for mobile money collection.
type MobileMoneyCollectionReq struct {
	Amount      float64
	PhoneNumber string
	Reference   string
	Country     string
	Description string
	CallbackURL string
	Metadata    map[string]string
}

// CardCollectionReq contains inputs for card collection.
type CardCollectionReq struct {
	Amount      float64
	Reference   string
	Country     string
	Description string
	CallbackURL string
}

// CollectionResp holds the normalized response from the payment gateway.
type CollectionResp struct {
	TransactionUUID string
	Reference       string
	Status          string
	Amount          float64
	Currency        string
	RedirectURL     string
	Message         string
}

// DisbursementReq contains inputs for sending money to a recipient.
type DisbursementReq struct {
	Amount      float64
	PhoneNumber string
	Reference   string
	Country     string
	Description string
	CallbackURL string
	Metadata    map[string]string
}

// DisbursementResp holds the normalized disbursement response.
type DisbursementResp struct {
	TransactionUUID string
	Reference       string
	ProviderRef     string
	Status          string
	Amount          float64
	Fee             float64
	Currency        string
	Message         string
}

// GatewayBalanceResp represents the merchant gateway balance.
type GatewayBalanceResp struct {
	AvailableBalance float64
	TotalBalance     float64
	Currency         string
}

// GatewayClient defines the operations required from any payment processor gateway.
type GatewayClient interface {
	CollectMobileMoney(ctx context.Context, req MobileMoneyCollectionReq) (*CollectionResp, error)
	CollectCard(ctx context.Context, req CardCollectionReq) (*CollectionResp, error)
	SendMoney(ctx context.Context, req DisbursementReq) (*DisbursementResp, error)
	GetBalance(ctx context.Context, country, currency string) (*GatewayBalanceResp, error)
	VerifyWebhookSignature(rawBody []byte, signatureHeader string) bool
}

// MarzPayGateway implements GatewayClient for the MarzPay API.
type MarzPayGateway struct {
	apiBase       string
	apiKey        string
	apiSecret     string
	webhookSecret string
	httpClient    *http.Client
}

// NewMarzPayGateway creates a new production MarzPay gateway client.
func NewMarzPayGateway(apiBase, apiKey, apiSecret, webhookSecret string, client *http.Client) *MarzPayGateway {
	if apiBase == "" {
		apiBase = "https://wallet.wearemarz.com/api/v1"
	}
	apiBase = strings.TrimRight(apiBase, "/")
	if client == nil {
		client = &http.Client{Timeout: 30 * time.Second}
	}
	return &MarzPayGateway{
		apiBase:       apiBase,
		apiKey:        apiKey,
		apiSecret:     apiSecret,
		webhookSecret: webhookSecret,
		httpClient:    client,
	}
}

func (g *MarzPayGateway) authHeader() string {
	creds := fmt.Sprintf("%s:%s", g.apiKey, g.apiSecret)
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(creds))
}

// FormatUgandaPhone normalizes raw Uganda phone numbers into E.164 (+256...) format.
func FormatUgandaPhone(raw string) string {
	cleaned := regexp.MustCompile(`[^\d+]`).ReplaceAllString(raw, "")
	if strings.HasPrefix(cleaned, "+256") {
		return cleaned
	}
	if strings.HasPrefix(cleaned, "256") {
		return "+" + cleaned
	}
	if strings.HasPrefix(cleaned, "0") {
		return "+256" + cleaned[1:]
	}
	if len(cleaned) == 9 && (strings.HasPrefix(cleaned, "7") || strings.HasPrefix(cleaned, "3")) {
		return "+256" + cleaned
	}
	return cleaned
}

func (g *MarzPayGateway) CollectMobileMoney(ctx context.Context, req MobileMoneyCollectionReq) (*CollectionResp, error) {
	country := req.Country
	if country == "" {
		country = "UG"
	}
	phone := FormatUgandaPhone(req.PhoneNumber)

	payload := map[string]interface{}{
		"amount":       int64(req.Amount),
		"phone_number": phone,
		"reference":    req.Reference,
		"country":      country,
		"method":       "mobile_money",
		"description":  req.Description,
	}
	if req.CallbackURL != "" {
		payload["callback_url"] = req.CallbackURL
	}
	if len(req.Metadata) > 0 {
		payload["metadata"] = req.Metadata
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal mobile money payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, g.apiBase+"/collect-money", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Authorization", g.authHeader())
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gateway request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read gateway response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gateway error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var jsonResp struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Data    struct {
			Transaction struct {
				UUID      string `json:"uuid"`
				Reference string `json:"reference"`
				Status    string `json:"status"`
			} `json:"transaction"`
			Collection struct {
				Amount struct {
					Raw      float64 `json:"raw"`
					Currency string  `json:"currency"`
				} `json:"amount"`
			} `json:"collection"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBody, &jsonResp); err != nil {
		return nil, fmt.Errorf("failed to parse gateway response: %w", err)
	}

	txnUUID := jsonResp.Data.Transaction.UUID
	if txnUUID == "" {
		txnUUID = req.Reference
	}

	return &CollectionResp{
		TransactionUUID: txnUUID,
		Reference:       jsonResp.Data.Transaction.Reference,
		Status:          jsonResp.Data.Transaction.Status,
		Amount:          jsonResp.Data.Collection.Amount.Raw,
		Currency:        jsonResp.Data.Collection.Amount.Currency,
		Message:         jsonResp.Message,
	}, nil
}

func (g *MarzPayGateway) CollectCard(ctx context.Context, req CardCollectionReq) (*CollectionResp, error) {
	country := req.Country
	if country == "" {
		country = "UG"
	}

	payload := map[string]interface{}{
		"amount":      int64(req.Amount),
		"method":      "card",
		"reference":   req.Reference,
		"country":     country,
		"description": req.Description,
	}
	if req.CallbackURL != "" {
		payload["callback_url"] = req.CallbackURL
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal card payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, g.apiBase+"/collect-money", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Authorization", g.authHeader())
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gateway request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read gateway response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gateway error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var jsonResp struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Data    struct {
			Transaction struct {
				UUID      string `json:"uuid"`
				Reference string `json:"reference"`
				Status    string `json:"status"`
			} `json:"transaction"`
			Collection struct {
				RedirectURL string `json:"redirect_url"`
				Amount      struct {
					Raw      float64 `json:"raw"`
					Currency string  `json:"currency"`
				} `json:"amount"`
			} `json:"collection"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBody, &jsonResp); err != nil {
		return nil, fmt.Errorf("failed to parse gateway response: %w", err)
	}

	txnUUID := jsonResp.Data.Transaction.UUID
	if txnUUID == "" {
		txnUUID = req.Reference
	}

	return &CollectionResp{
		TransactionUUID: txnUUID,
		Reference:       jsonResp.Data.Transaction.Reference,
		Status:          jsonResp.Data.Transaction.Status,
		Amount:          jsonResp.Data.Collection.Amount.Raw,
		Currency:        jsonResp.Data.Collection.Amount.Currency,
		RedirectURL:     jsonResp.Data.Collection.RedirectURL,
		Message:         jsonResp.Message,
	}, nil
}

func (g *MarzPayGateway) SendMoney(ctx context.Context, req DisbursementReq) (*DisbursementResp, error) {
	country := req.Country
	if country == "" {
		country = "UG"
	}
	phone := FormatUgandaPhone(req.PhoneNumber)

	payload := map[string]interface{}{
		"amount":       int64(req.Amount),
		"phone_number": phone,
		"reference":    req.Reference,
		"country":      country,
		"description":  req.Description,
	}
	if req.CallbackURL != "" {
		payload["callback_url"] = req.CallbackURL
	}
	if len(req.Metadata) > 0 {
		payload["metadata"] = req.Metadata
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payout payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, g.apiBase+"/send-money", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create http request: %w", err)
	}
	httpReq.Header.Set("Authorization", g.authHeader())
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gateway request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read gateway response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gateway error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var jsonResp struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Data    struct {
			Transaction struct {
				UUID              string `json:"uuid"`
				Reference         string `json:"reference"`
				ProviderReference string `json:"provider_reference"`
				Status            string `json:"status"`
			} `json:"transaction"`
			Disbursement struct {
				Amount struct {
					Raw      float64 `json:"raw"`
					Currency string  `json:"currency"`
				} `json:"amount"`
				Charge struct {
					Raw float64 `json:"raw"`
				} `json:"charge"`
			} `json:"disbursement"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBody, &jsonResp); err != nil {
		return nil, fmt.Errorf("failed to parse gateway response: %w", err)
	}

	txnUUID := jsonResp.Data.Transaction.UUID
	if txnUUID == "" {
		txnUUID = req.Reference
	}

	return &DisbursementResp{
		TransactionUUID: txnUUID,
		Reference:       jsonResp.Data.Transaction.Reference,
		ProviderRef:     jsonResp.Data.Transaction.ProviderReference,
		Status:          jsonResp.Data.Transaction.Status,
		Amount:          jsonResp.Data.Disbursement.Amount.Raw,
		Fee:             jsonResp.Data.Disbursement.Charge.Raw,
		Currency:        jsonResp.Data.Disbursement.Amount.Currency,
		Message:         jsonResp.Message,
	}, nil
}

func (g *MarzPayGateway) GetBalance(ctx context.Context, country, currency string) (*GatewayBalanceResp, error) {
	if country == "" {
		country = "UG"
	}
	reqURL := fmt.Sprintf("%s/balance?country=%s", g.apiBase, country)
	if currency != "" {
		reqURL += "&currency=" + currency
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Authorization", g.authHeader())
	httpReq.Header.Set("Accept", "application/json")

	resp, err := g.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gateway balance error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var jsonResp struct {
		Data struct {
			Account struct {
				AvailableBalance struct {
					Raw      float64 `json:"raw"`
					Currency string  `json:"currency"`
				} `json:"available_balance"`
				TotalBalance struct {
					Raw      float64 `json:"raw"`
					Currency string  `json:"currency"`
				} `json:"total_balance"`
			} `json:"account"`
			AvailableBalance struct {
				Raw float64 `json:"raw"`
			} `json:"available_balance"`
			TotalBalance struct {
				Raw float64 `json:"raw"`
			} `json:"total_balance"`
			Currency string `json:"currency"`
		} `json:"data"`
	}

	if err := json.Unmarshal(bodyBytes, &jsonResp); err != nil {
		return nil, err
	}

	avail := jsonResp.Data.AvailableBalance.Raw
	if avail == 0 && jsonResp.Data.Account.AvailableBalance.Raw != 0 {
		avail = jsonResp.Data.Account.AvailableBalance.Raw
	}
	total := jsonResp.Data.TotalBalance.Raw
	if total == 0 && jsonResp.Data.Account.TotalBalance.Raw != 0 {
		total = jsonResp.Data.Account.TotalBalance.Raw
	}
	curr := jsonResp.Data.Currency
	if curr == "" {
		curr = jsonResp.Data.Account.AvailableBalance.Currency
	}
	if curr == "" {
		curr = currency
	}

	return &GatewayBalanceResp{
		AvailableBalance: avail,
		TotalBalance:     total,
		Currency:         curr,
	}, nil
}

// VerifyWebhookSignature verifies HMAC-SHA256 signature or shared secret.
func (g *MarzPayGateway) VerifyWebhookSignature(rawBody []byte, signatureHeader string) bool {
	if g.webhookSecret == "" {
		// In development or when no secret is configured, accept webhooks
		return true
	}
	if signatureHeader == "" {
		return false
	}

	// 1. Direct secret token match (e.g. X-Webhook-Token: <secret>)
	if subtleConstantTimeCompare(signatureHeader, g.webhookSecret) {
		return true
	}

	// 2. HMAC SHA-256 signature match
	mac := hmac.New(sha256.New, []byte(g.webhookSecret))
	mac.Write(rawBody)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))

	return subtleConstantTimeCompare(strings.ToLower(signatureHeader), strings.ToLower(expectedMAC))
}

func subtleConstantTimeCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	var res byte
	for i := 0; i < len(a); i++ {
		res |= a[i] ^ b[i]
	}
	return res == 0
}

// MockGateway is an in-memory mock implementation of GatewayClient for testing.
type MockGateway struct {
	CollectMobileMoneyFunc func(ctx context.Context, req MobileMoneyCollectionReq) (*CollectionResp, error)
	CollectCardFunc        func(ctx context.Context, req CardCollectionReq) (*CollectionResp, error)
	SendMoneyFunc          func(ctx context.Context, req DisbursementReq) (*DisbursementResp, error)
	GetBalanceFunc         func(ctx context.Context, country, currency string) (*GatewayBalanceResp, error)
	VerifyWebhookFunc      func(rawBody []byte, signatureHeader string) bool
}

func NewMockGateway() *MockGateway {
	return &MockGateway{
		CollectMobileMoneyFunc: func(ctx context.Context, req MobileMoneyCollectionReq) (*CollectionResp, error) {
			return &CollectionResp{
				TransactionUUID: "mock-uuid-" + req.Reference,
				Reference:       req.Reference,
				Status:          "pending",
				Amount:          req.Amount,
				Currency:        "UGX",
				Message:         "Mock collection initiated",
			}, nil
		},
		CollectCardFunc: func(ctx context.Context, req CardCollectionReq) (*CollectionResp, error) {
			return &CollectionResp{
				TransactionUUID: "mock-card-uuid-" + req.Reference,
				Reference:       req.Reference,
				Status:          "pending",
				Amount:          req.Amount,
				Currency:        "UGX",
				RedirectURL:     "https://checkout.zoop.network/pay/" + req.Reference,
				Message:         "Mock card checkout generated",
			}, nil
		},
		SendMoneyFunc: func(ctx context.Context, req DisbursementReq) (*DisbursementResp, error) {
			return &DisbursementResp{
				TransactionUUID: "mock-disburse-" + req.Reference,
				Reference:       req.Reference,
				ProviderRef:     "PROV-REF-12345",
				Status:          "pending",
				Amount:          req.Amount,
				Fee:             0,
				Currency:        "UGX",
				Message:         "Mock payout processing",
			}, nil
		},
		GetBalanceFunc: func(ctx context.Context, country, currency string) (*GatewayBalanceResp, error) {
			return &GatewayBalanceResp{
				AvailableBalance: 10000000,
				TotalBalance:     10000000,
				Currency:         "UGX",
			}, nil
		},
		VerifyWebhookFunc: func(rawBody []byte, signatureHeader string) bool {
			return true
		},
	}
}

func (m *MockGateway) CollectMobileMoney(ctx context.Context, req MobileMoneyCollectionReq) (*CollectionResp, error) {
	return m.CollectMobileMoneyFunc(ctx, req)
}

func (m *MockGateway) CollectCard(ctx context.Context, req CardCollectionReq) (*CollectionResp, error) {
	return m.CollectCardFunc(ctx, req)
}

func (m *MockGateway) SendMoney(ctx context.Context, req DisbursementReq) (*DisbursementResp, error) {
	return m.SendMoneyFunc(ctx, req)
}

func (m *MockGateway) GetBalance(ctx context.Context, country, currency string) (*GatewayBalanceResp, error) {
	return m.GetBalanceFunc(ctx, country, currency)
}

func (m *MockGateway) VerifyWebhookSignature(rawBody []byte, signatureHeader string) bool {
	return m.VerifyWebhookFunc(rawBody, signatureHeader)
}
