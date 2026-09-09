package payments

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/cloud/store"
	"github.com/zoop-internet/zoop/packages/core/types"
)

var (
	ErrInsufficientFunds   = errors.New("insufficient wallet balance")
	ErrInvalidAmount       = errors.New("amount must be greater than zero")
	ErrInvalidPhone        = errors.New("phone number cannot be empty")
	ErrTransactionNotFound = errors.New("payment transaction not found")
	ErrInvalidSignature    = errors.New("invalid webhook signature")
)

// PaymentService manages wallet ledgers, deposit/withdrawal lifecycles, and gateway interactions.
type PaymentService struct {
	store   store.Store
	gateway GatewayClient
	logger  *slog.Logger
	mu      sync.Mutex // guards concurrent wallet ledger balances
}

// NewPaymentService creates a new PaymentService instance.
func NewPaymentService(st store.Store, gateway GatewayClient, logger *slog.Logger) *PaymentService {
	if logger == nil {
		logger = slog.Default()
	}
	return &PaymentService{
		store:   st,
		gateway: gateway,
		logger:  logger,
	}
}

// GetOrCreateWallet retrieves an owner's wallet or initializes an empty one with default currency.
func (s *PaymentService) GetOrCreateWallet(ctx context.Context, ownerID types.ID) (*Wallet, error) {
	w, err := s.store.GetWallet(ctx, ownerID)
	if err == nil {
		return w, nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return nil, fmt.Errorf("failed to retrieve wallet: %w", err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Double check after acquiring lock
	w, err = s.store.GetWallet(ctx, ownerID)
	if err == nil {
		return w, nil
	}

	now := time.Now()
	newWallet := &Wallet{
		ID:               types.NewID(),
		OwnerID:          ownerID,
		Currency:         "UGX",
		AvailableBalance: 0,
		PendingBalance:   0,
		TotalEarned:      0,
		TotalWithdrawn:   0,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := s.store.SaveWallet(ctx, newWallet); err != nil {
		return nil, fmt.Errorf("failed to create initial wallet: %w", err)
	}
	s.logger.Info("Created new wallet for owner", "owner_id", ownerID, "wallet_id", newWallet.ID)
	return newWallet, nil
}

// InitiateMobileMoneyDeposit triggers a Mobile Money STK push / collection.
func (s *PaymentService) InitiateMobileMoneyDeposit(ctx context.Context, ownerID types.ID, req DepositMobileMoneyRequest) (*DepositResponse, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if strings.TrimSpace(req.PhoneNumber) == "" {
		return nil, ErrInvalidPhone
	}

	wallet, err := s.GetOrCreateWallet(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	ref := fmt.Sprintf("ZP-DEP-%s", strings.ToUpper(uuid.New().String()[:8]))
	now := time.Now()

	txn := &PaymentTransaction{
		ID:          types.NewID(),
		WalletID:    wallet.ID,
		OwnerID:     ownerID,
		Reference:   ref,
		Type:        TypeDeposit,
		Method:      MethodMobileMoney,
		Provider:    strings.ToLower(req.Provider),
		Amount:      req.Amount,
		Fee:         0,
		Currency:    wallet.Currency,
		Status:      StatusPending,
		PhoneNumber: req.PhoneNumber,
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.SaveTransaction(ctx, txn); err != nil {
		return nil, fmt.Errorf("failed to save pending transaction: %w", err)
	}

	colResp, err := s.gateway.CollectMobileMoney(ctx, MobileMoneyCollectionReq{
		Amount:      req.Amount,
		PhoneNumber: req.PhoneNumber,
		Reference:   ref,
		Country:     "UG",
		Description: req.Description,
	})
	if err != nil {
		s.logger.Error("Mobile money collection failed at gateway", "error", err, "reference", ref)
		txn.Status = StatusFailed
		txn.UpdatedAt = time.Now()
		_ = s.store.SaveTransaction(ctx, txn)
		return nil, fmt.Errorf("gateway error: %w", err)
	}

	txn.GatewayReference = colResp.TransactionUUID
	txn.UpdatedAt = time.Now()
	_ = s.store.SaveTransaction(ctx, txn)

	return &DepositResponse{
		TransactionID: txn.ID,
		Reference:     ref,
		Status:        StatusPending,
		Amount:        txn.Amount,
		Currency:      txn.Currency,
		Message:       "Payment prompt sent to mobile device. Approve on your phone to complete deposit.",
	}, nil
}

// InitiateCardDeposit requests a secure checkout URL for credit/debit cards.
func (s *PaymentService) InitiateCardDeposit(ctx context.Context, ownerID types.ID, req DepositCardRequest) (*DepositResponse, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	wallet, err := s.GetOrCreateWallet(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	ref := fmt.Sprintf("ZP-CRD-%s", strings.ToUpper(uuid.New().String()[:8]))
	now := time.Now()

	txn := &PaymentTransaction{
		ID:          types.NewID(),
		WalletID:    wallet.ID,
		OwnerID:     ownerID,
		Reference:   ref,
		Type:        TypeDeposit,
		Method:      MethodCard,
		Provider:    "card",
		Amount:      req.Amount,
		Fee:         0,
		Currency:    wallet.Currency,
		Status:      StatusPending,
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.SaveTransaction(ctx, txn); err != nil {
		return nil, fmt.Errorf("failed to save card pending transaction: %w", err)
	}

	colResp, err := s.gateway.CollectCard(ctx, CardCollectionReq{
		Amount:      req.Amount,
		Reference:   ref,
		Country:     "UG",
		Description: req.Description,
		CallbackURL: req.CallbackURL,
	})
	if err != nil {
		s.logger.Error("Card collection initiation failed at gateway", "error", err, "reference", ref)
		txn.Status = StatusFailed
		txn.UpdatedAt = time.Now()
		_ = s.store.SaveTransaction(ctx, txn)
		return nil, fmt.Errorf("gateway error: %w", err)
	}

	txn.GatewayReference = colResp.TransactionUUID
	txn.CheckoutURL = colResp.RedirectURL
	txn.UpdatedAt = time.Now()
	_ = s.store.SaveTransaction(ctx, txn)

	return &DepositResponse{
		TransactionID: txn.ID,
		Reference:     ref,
		Status:        StatusPending,
		Amount:        txn.Amount,
		Currency:      txn.Currency,
		CheckoutURL:   colResp.RedirectURL,
		Message:       "Secure card payment checkout created. Redirect user to checkout URL.",
	}, nil
}

// InitiateWithdrawal deducts available balance to pending and requests a mobile money payout.
func (s *PaymentService) InitiateWithdrawal(ctx context.Context, ownerID types.ID, req WithdrawalRequest) (*WithdrawalResponse, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if strings.TrimSpace(req.PhoneNumber) == "" {
		return nil, ErrInvalidPhone
	}

	wallet, err := s.GetOrCreateWallet(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	if wallet.AvailableBalance < req.Amount {
		s.mu.Unlock()
		return nil, ErrInsufficientFunds
	}

	// Move funds from available to pending
	wallet.AvailableBalance -= req.Amount
	wallet.PendingBalance += req.Amount
	wallet.UpdatedAt = time.Now()
	if err := s.store.SaveWallet(ctx, wallet); err != nil {
		s.mu.Unlock()
		return nil, fmt.Errorf("failed to update wallet balance: %w", err)
	}
	s.mu.Unlock()

	ref := fmt.Sprintf("ZP-WDR-%s", strings.ToUpper(uuid.New().String()[:8]))
	now := time.Now()

	txn := &PaymentTransaction{
		ID:          types.NewID(),
		WalletID:    wallet.ID,
		OwnerID:     ownerID,
		Reference:   ref,
		Type:        TypeWithdrawal,
		Method:      MethodMobileMoney,
		Provider:    strings.ToLower(req.Provider),
		Amount:      req.Amount,
		Currency:    wallet.Currency,
		Status:      StatusPending,
		PhoneNumber: req.PhoneNumber,
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.store.SaveTransaction(ctx, txn); err != nil {
		return nil, fmt.Errorf("failed to save withdrawal transaction: %w", err)
	}

	disResp, err := s.gateway.SendMoney(ctx, DisbursementReq{
		Amount:      req.Amount,
		PhoneNumber: req.PhoneNumber,
		Reference:   ref,
		Country:     "UG",
		Description: req.Description,
	})
	if err != nil {
		s.logger.Error("Withdrawal payout failed at gateway, refunding wallet", "error", err, "reference", ref)
		// Revert funds back to available
		s.mu.Lock()
		w, _ := s.store.GetWallet(ctx, ownerID)
		if w != nil {
			w.AvailableBalance += req.Amount
			w.PendingBalance = math.Max(0, w.PendingBalance-req.Amount)
			w.UpdatedAt = time.Now()
			_ = s.store.SaveWallet(ctx, w)
		}
		s.mu.Unlock()

		txn.Status = StatusFailed
		txn.UpdatedAt = time.Now()
		_ = s.store.SaveTransaction(ctx, txn)
		return nil, fmt.Errorf("disbursement gateway error: %w", err)
	}

	txn.GatewayReference = disResp.TransactionUUID
	txn.Fee = disResp.Fee
	txn.UpdatedAt = time.Now()
	_ = s.store.SaveTransaction(ctx, txn)

	return &WithdrawalResponse{
		TransactionID: txn.ID,
		Reference:     ref,
		Status:        StatusPending,
		Amount:        txn.Amount,
		Currency:      txn.Currency,
		Message:       "Withdrawal initiated successfully. Funds will arrive on mobile money shortly.",
	}, nil
}

// RecordEarning credits network bandwidth sharing or exit node rewards to an owner's wallet.
func (s *PaymentService) RecordEarning(ctx context.Context, req RecordEarningRequest) (*EarningRecord, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}

	wallet, err := s.GetOrCreateWallet(ctx, req.OwnerID)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	wallet.AvailableBalance += req.Amount
	wallet.TotalEarned += req.Amount
	wallet.UpdatedAt = time.Now()
	if err := s.store.SaveWallet(ctx, wallet); err != nil {
		s.mu.Unlock()
		return nil, fmt.Errorf("failed to update wallet balance: %w", err)
	}
	s.mu.Unlock()

	now := time.Now()
	earning := &EarningRecord{
		ID:           types.NewID(),
		WalletID:     wallet.ID,
		OwnerID:      req.OwnerID,
		Source:       req.Source,
		SessionID:    req.SessionID,
		BytesRelayed: req.BytesRelayed,
		Amount:       req.Amount,
		Currency:     wallet.Currency,
		CreatedAt:    now,
	}

	if err := s.store.SaveEarningRecord(ctx, earning); err != nil {
		return nil, fmt.Errorf("failed to save earning record: %w", err)
	}

	ref := fmt.Sprintf("ZP-ERN-%s", strings.ToUpper(uuid.New().String()[:8]))
	txn := &PaymentTransaction{
		ID:          types.NewID(),
		WalletID:    wallet.ID,
		OwnerID:     req.OwnerID,
		Reference:   ref,
		Type:        TypeEarning,
		Method:      MethodBandwidthReward,
		Provider:    "zoop_network",
		Amount:      req.Amount,
		Currency:    wallet.Currency,
		Status:      StatusCompleted,
		Description: req.Description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	_ = s.store.SaveTransaction(ctx, txn)

	return earning, nil
}

// ProcessWebhook validates incoming callbacks and updates transaction and wallet balances idempotently.
func (s *PaymentService) ProcessWebhook(ctx context.Context, rawBody []byte, signatureHeader string) error {
	if !s.gateway.VerifyWebhookSignature(rawBody, signatureHeader) {
		s.logger.Warn("Rejected webhook with invalid signature")
		return ErrInvalidSignature
	}

	var payload GatewayWebhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return fmt.Errorf("malformed webhook payload: %w", err)
	}

	ref := payload.Reference
	if ref == "" {
		s.logger.Warn("Webhook received without reference, skipping")
		return nil
	}

	txn, err := s.store.GetTransactionByReference(ctx, ref)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			s.logger.Warn("Webhook referenced unknown transaction", "reference", ref)
			return nil // Acknowledge to prevent endless webhook retries
		}
		return fmt.Errorf("failed to lookup transaction: %w", err)
	}

	// Idempotency: if transaction is already completed or failed, ignore duplicates
	if txn.Status == StatusCompleted || txn.Status == StatusFailed {
		s.logger.Info("Webhook received for already settled transaction", "reference", ref, "status", txn.Status)
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	wallet, err := s.store.GetWallet(ctx, txn.OwnerID)
	if err != nil {
		return fmt.Errorf("failed to get wallet for settlement: %w", err)
	}

	statusLower := strings.ToLower(payload.Status)
	isSuccess := statusLower == "success" || statusLower == "completed" || statusLower == "successful"
	isFailed := statusLower == "failed" || statusLower == "cancelled" || statusLower == "rejected"

	if isSuccess {
		if txn.Type == TypeDeposit {
			wallet.AvailableBalance += txn.Amount
			txn.Status = StatusCompleted
		} else if txn.Type == TypeWithdrawal {
			wallet.PendingBalance = math.Max(0, wallet.PendingBalance-txn.Amount)
			wallet.TotalWithdrawn += txn.Amount
			txn.Status = StatusCompleted
		}
		s.logger.Info("Transaction settled successfully via webhook", "reference", ref, "type", txn.Type, "amount", txn.Amount)
	} else if isFailed {
		if txn.Type == TypeWithdrawal {
			// Refund pending balance back to available
			wallet.PendingBalance = math.Max(0, wallet.PendingBalance-txn.Amount)
			wallet.AvailableBalance += txn.Amount
		}
		txn.Status = StatusFailed
		s.logger.Warn("Transaction marked failed via webhook", "reference", ref, "reason", payload.FailureReason)
	}

	wallet.UpdatedAt = time.Now()
	txn.UpdatedAt = time.Now()
	if payload.ProviderRef != "" {
		txn.GatewayReference = payload.ProviderRef
	}

	if err := s.store.SaveWallet(ctx, wallet); err != nil {
		return fmt.Errorf("failed to persist wallet settlement: %w", err)
	}
	if err := s.store.SaveTransaction(ctx, txn); err != nil {
		return fmt.Errorf("failed to persist settled transaction: %w", err)
	}

	return nil
}

// ListTransactions retrieves paginated transactions for an owner.
func (s *PaymentService) ListTransactions(ctx context.Context, ownerID types.ID, limit, offset int) (*TransactionListResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	txns, total, err := s.store.ListTransactions(ctx, ownerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list transactions: %w", err)
	}

	return &TransactionListResponse{
		Transactions: txns,
		Total:        total,
		Limit:        limit,
		Offset:       offset,
	}, nil
}

// ListEarnings retrieves paginated earnings records for an owner.
func (s *PaymentService) ListEarnings(ctx context.Context, ownerID types.ID, limit, offset int) (*EarningsSummaryResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	wallet, _ := s.store.GetWallet(ctx, ownerID)
	totalEarned := 0.0
	if wallet != nil {
		totalEarned = wallet.TotalEarned
	}

	records, total, err := s.store.ListEarnings(ctx, ownerID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list earnings: %w", err)
	}

	return &EarningsSummaryResponse{
		Earnings:    records,
		TotalEarned: totalEarned,
		Total:       total,
		Limit:       limit,
		Offset:      offset,
	}, nil
}
