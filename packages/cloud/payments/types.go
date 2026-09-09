package payments

import (
	"github.com/zoop-internet/zoop/packages/core/types"
)

// Re-export domain types from core/types for seamless convenience
type TransactionType = types.TransactionType

const (
	TypeDeposit    = types.TypeDeposit
	TypeWithdrawal = types.TypeWithdrawal
	TypeEarning    = types.TypeEarning
	TypeRefund     = types.TypeRefund
)

type PaymentMethod = types.PaymentMethod

const (
	MethodMobileMoney     = types.MethodMobileMoney
	MethodCard            = types.MethodCard
	MethodBandwidthReward = types.MethodBandwidthReward
	MethodSystemCredit    = types.MethodSystemCredit
)

type TransactionStatus = types.TransactionStatus

const (
	StatusPending   = types.StatusPending
	StatusCompleted = types.StatusCompleted
	StatusFailed    = types.StatusFailed
	StatusCancelled = types.StatusCancelled
)

type EarningSource = types.EarningSource

const (
	SourceBandwidthRelay  = types.SourceBandwidthRelay
	SourceExitNode        = types.SourceExitNode
	SourceUptimeGuarantee = types.SourceUptimeGuarantee
)

type Wallet = types.Wallet
type PaymentTransaction = types.PaymentTransaction
type EarningRecord = types.EarningRecord

// --- DTO Requests & Responses ---

// DepositMobileMoneyRequest contains parameters for initiating a mobile money collection.
type DepositMobileMoneyRequest struct {
	Amount      float64 `json:"amount"`
	PhoneNumber string  `json:"phone_number"`
	Provider    string  `json:"provider"` // "mtn" or "airtel"
	Description string  `json:"description,omitempty"`
}

// DepositCardRequest contains parameters for initiating a card collection.
type DepositCardRequest struct {
	Amount      float64 `json:"amount"`
	CallbackURL string  `json:"callback_url,omitempty"`
	Description string  `json:"description,omitempty"`
}

// WithdrawalRequest contains parameters for requesting a payout to mobile money.
type WithdrawalRequest struct {
	Amount      float64 `json:"amount"`
	PhoneNumber string  `json:"phone_number"`
	Provider    string  `json:"provider"` // "mtn" or "airtel"
	Description string  `json:"description,omitempty"`
}

// RecordEarningRequest contains parameters for crediting bandwidth rewards.
type RecordEarningRequest struct {
	OwnerID      types.ID      `json:"owner_id"`
	Source       EarningSource `json:"source"`
	SessionID    string        `json:"session_id,omitempty"`
	BytesRelayed uint64        `json:"bytes_relayed"`
	Amount       float64       `json:"amount"`
	Description  string        `json:"description,omitempty"`
}

// DepositResponse returns initiation details for a deposit.
type DepositResponse struct {
	TransactionID types.ID          `json:"transaction_id"`
	Reference     string            `json:"reference"`
	Status        TransactionStatus `json:"status"`
	Amount        float64           `json:"amount"`
	Currency      string            `json:"currency"`
	CheckoutURL   string            `json:"checkout_url,omitempty"`
	Message       string            `json:"message"`
}

// WithdrawalResponse returns initiation details for a withdrawal.
type WithdrawalResponse struct {
	TransactionID types.ID          `json:"transaction_id"`
	Reference     string            `json:"reference"`
	Status        TransactionStatus `json:"status"`
	Amount        float64           `json:"amount"`
	Currency      string            `json:"currency"`
	Message       string            `json:"message"`
}

// TransactionListResponse encapsulates a paginated list of transactions.
type TransactionListResponse struct {
	Transactions []*PaymentTransaction `json:"transactions"`
	Total        int                   `json:"total"`
	Limit        int                   `json:"limit"`
	Offset       int                   `json:"offset"`
}

// EarningsSummaryResponse encapsulates a paginated list of earnings with totals.
type EarningsSummaryResponse struct {
	Earnings    []*EarningRecord `json:"earnings"`
	TotalEarned float64          `json:"total_earned"`
	Total       int              `json:"total"`
	Limit       int              `json:"limit"`
	Offset      int              `json:"offset"`
}

// GatewayWebhookPayload models incoming callback notifications from payment gateways.
type GatewayWebhookPayload struct {
	Event           string            `json:"event"`
	TransactionUUID string            `json:"transaction_uuid"`
	Reference       string            `json:"reference"`
	ProviderRef     string            `json:"provider_reference,omitempty"`
	Status          string            `json:"status"` // "success", "failed", "pending"
	Amount          float64           `json:"amount"`
	Currency        string            `json:"currency"`
	PhoneNumber     string            `json:"phone_number,omitempty"`
	FailureReason   string            `json:"failure_reason,omitempty"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}
