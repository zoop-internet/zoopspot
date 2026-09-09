package types

import "time"

// TransactionType defines the nature of the transaction.
type TransactionType string

const (
	TypeDeposit    TransactionType = "deposit"
	TypeWithdrawal TransactionType = "withdrawal"
	TypeEarning    TransactionType = "earning"
	TypeRefund     TransactionType = "refund"
)

// PaymentMethod specifies the underlying financial rail.
type PaymentMethod string

const (
	MethodMobileMoney     PaymentMethod = "mobile_money"
	MethodCard            PaymentMethod = "card"
	MethodBandwidthReward PaymentMethod = "bandwidth_reward"
	MethodSystemCredit    PaymentMethod = "system_credit"
)

// TransactionStatus denotes the lifecycle state of a payment.
type TransactionStatus string

const (
	StatusPending   TransactionStatus = "pending"
	StatusCompleted TransactionStatus = "completed"
	StatusFailed    TransactionStatus = "failed"
	StatusCancelled TransactionStatus = "cancelled"
)

// EarningSource specifies the origin of network earnings.
type EarningSource string

const (
	SourceBandwidthRelay  EarningSource = "bandwidth_relay"
	SourceExitNode        EarningSource = "exit_node"
	SourceUptimeGuarantee EarningSource = "uptime_guarantee"
)

// Wallet holds an authoritative balance and history summary for an account or device.
type Wallet struct {
	ID               ID        `json:"id"`
	OwnerID          ID        `json:"owner_id"`
	Currency         string    `json:"currency"`
	AvailableBalance float64   `json:"available_balance"`
	PendingBalance   float64   `json:"pending_balance"`
	TotalEarned      float64   `json:"total_earned"`
	TotalWithdrawn   float64   `json:"total_withdrawn"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// PaymentTransaction represents an individual financial transaction record.
type PaymentTransaction struct {
	ID               ID                `json:"id"`
	WalletID         ID                `json:"wallet_id"`
	OwnerID          ID                `json:"owner_id"`
	Reference        string            `json:"reference"`
	GatewayReference string            `json:"gateway_reference,omitempty"`
	Type             TransactionType   `json:"type"`
	Method           PaymentMethod     `json:"method"`
	Provider         string            `json:"provider"`
	Amount           float64           `json:"amount"`
	Fee              float64           `json:"fee"`
	Currency         string            `json:"currency"`
	Status           TransactionStatus `json:"status"`
	PhoneNumber      string            `json:"phone_number,omitempty"`
	CheckoutURL      string            `json:"checkout_url,omitempty"`
	Description      string            `json:"description,omitempty"`
	Metadata         map[string]string `json:"metadata,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
}

// EarningRecord represents income credited from providing bandwidth or gateway services.
type EarningRecord struct {
	ID           ID            `json:"id"`
	WalletID     ID            `json:"wallet_id"`
	OwnerID      ID            `json:"owner_id"`
	Source       EarningSource `json:"source"`
	SessionID    string        `json:"session_id,omitempty"`
	BytesRelayed uint64        `json:"bytes_relayed"`
	RatePerGB    float64       `json:"rate_per_gb"`
	Amount       float64       `json:"amount"`
	Currency     string        `json:"currency"`
	CreatedAt    time.Time     `json:"created_at"`
}
