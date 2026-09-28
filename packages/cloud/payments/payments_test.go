package payments

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"

	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func setupTestService(t *testing.T) (*PaymentService, *MockGateway, *store.InMemoryStore) {
	st := store.NewInMemoryStore()
	gw := NewMockGateway()
	svc := NewPaymentService(st, gw, slog.Default())
	return svc, gw, st
}

func TestWalletLifecycle(t *testing.T) {
	svc, _, _ := setupTestService(t)
	ctx := context.Background()
	ownerID := types.NewID()

	wallet, err := svc.GetOrCreateWallet(ctx, ownerID)
	if err != nil {
		t.Fatalf("GetOrCreateWallet failed: %v", err)
	}

	if wallet.OwnerID != ownerID {
		t.Errorf("expected owner ID %s, got %s", ownerID, wallet.OwnerID)
	}
	if wallet.AvailableBalance != 0 {
		t.Errorf("expected initial available balance 0, got %f", wallet.AvailableBalance)
	}
	if wallet.Currency != "UGX" {
		t.Errorf("expected currency UGX, got %s", wallet.Currency)
	}

	// Calling again should return the existing wallet
	wallet2, err := svc.GetOrCreateWallet(ctx, ownerID)
	if err != nil {
		t.Fatalf("second GetOrCreateWallet failed: %v", err)
	}
	if wallet2.ID != wallet.ID {
		t.Errorf("expected same wallet ID %s, got %s", wallet.ID, wallet2.ID)
	}
}

func TestMobileMoneyDeposit(t *testing.T) {
	svc, gw, _ := setupTestService(t)
	ctx := context.Background()
	ownerID := types.NewID()

	// 1. Invalid amount
	_, err := svc.InitiateMobileMoneyDeposit(ctx, ownerID, DepositMobileMoneyRequest{
		Amount:      0,
		PhoneNumber: "0771234567",
		Provider:    "mtn",
	})
	if !errors.Is(err, ErrInvalidAmount) {
		t.Fatalf("expected ErrInvalidAmount, got %v", err)
	}

	// 2. Empty phone
	_, err = svc.InitiateMobileMoneyDeposit(ctx, ownerID, DepositMobileMoneyRequest{
		Amount:      5000,
		PhoneNumber: "",
		Provider:    "mtn",
	})
	if !errors.Is(err, ErrInvalidPhone) {
		t.Fatalf("expected ErrInvalidPhone, got %v", err)
	}

	// 3. Successful initiation
	resp, err := svc.InitiateMobileMoneyDeposit(ctx, ownerID, DepositMobileMoneyRequest{
		Amount:      10000,
		PhoneNumber: "0771234567",
		Provider:    "mtn",
		Description: "Test Deposit",
	})
	if err != nil {
		t.Fatalf("InitiateMobileMoneyDeposit failed: %v", err)
	}

	if resp.Reference == "" {
		t.Errorf("expected non-empty reference")
	}
	if resp.Status != StatusPending {
		t.Errorf("expected status pending, got %s", resp.Status)
	}
	if resp.Amount != 10000 {
		t.Errorf("expected amount 10000, got %f", resp.Amount)
	}

	// 4. Gateway error simulation
	gw.CollectMobileMoneyFunc = func(ctx context.Context, req MobileMoneyCollectionReq) (*CollectionResp, error) {
		return nil, errors.New("network timeout to telco switch")
	}
	_, err = svc.InitiateMobileMoneyDeposit(ctx, ownerID, DepositMobileMoneyRequest{
		Amount:      5000,
		PhoneNumber: "0771234567",
		Provider:    "mtn",
	})
	if err == nil {
		t.Fatal("expected error on gateway failure, got nil")
	}
}

func TestCardDeposit(t *testing.T) {
	svc, _, _ := setupTestService(t)
	ctx := context.Background()
	ownerID := types.NewID()

	resp, err := svc.InitiateCardDeposit(ctx, ownerID, DepositCardRequest{
		Amount:      25000,
		CallbackURL: "https://zoop.network/wallet/success",
		Description: "Card top up",
	})
	if err != nil {
		t.Fatalf("InitiateCardDeposit failed: %v", err)
	}

	if resp.Status != StatusPending {
		t.Errorf("expected status pending, got %s", resp.Status)
	}
	if resp.CheckoutURL == "" {
		t.Errorf("expected checkout redirect URL for card deposit")
	}
}

func TestWithdrawal(t *testing.T) {
	svc, _, _ := setupTestService(t)
	ctx := context.Background()
	ownerID := types.NewID()

	// Initial balance is 0, withdrawal should fail with insufficient funds
	_, err := svc.InitiateWithdrawal(ctx, ownerID, WithdrawalRequest{
		Amount:      5000,
		PhoneNumber: "0701234567",
		Provider:    "airtel",
	})
	if !errors.Is(err, ErrInsufficientFunds) {
		t.Fatalf("expected ErrInsufficientFunds, got %v", err)
	}

	// Credit wallet by recording earnings
	_, err = svc.RecordEarning(ctx, RecordEarningRequest{
		OwnerID:      ownerID,
		Source:       SourceBandwidthRelay,
		BytesRelayed: 10 * 1024 * 1024 * 1024, // 10 GB
		Amount:       20000,
		Description:  "10 GB bandwidth relay earnings",
	})
	if err != nil {
		t.Fatalf("RecordEarning failed: %v", err)
	}

	wallet, _ := svc.GetOrCreateWallet(ctx, ownerID)
	if wallet.AvailableBalance != 20000 {
		t.Fatalf("expected available balance 20000, got %f", wallet.AvailableBalance)
	}

	// Now initiate withdrawal of 5000
	wdrResp, err := svc.InitiateWithdrawal(ctx, ownerID, WithdrawalRequest{
		Amount:      5000,
		PhoneNumber: "0701234567",
		Provider:    "airtel",
		Description: "Payout to Airtel Money",
	})
	if err != nil {
		t.Fatalf("InitiateWithdrawal failed: %v", err)
	}

	if wdrResp.Status != StatusPending {
		t.Errorf("expected status pending, got %s", wdrResp.Status)
	}

	// Wallet available balance should be reduced by 5000, and pending balance increased by 5000
	walletAfter, _ := svc.GetOrCreateWallet(ctx, ownerID)
	if walletAfter.AvailableBalance != 15000 {
		t.Errorf("expected available balance 15000, got %f", walletAfter.AvailableBalance)
	}
	if walletAfter.PendingBalance != 5000 {
		t.Errorf("expected pending balance 5000, got %f", walletAfter.PendingBalance)
	}
}

func TestWebhookSettlement(t *testing.T) {
	svc, _, _ := setupTestService(t)
	ctx := context.Background()
	ownerID := types.NewID()

	// 1. Create a deposit
	depResp, err := svc.InitiateMobileMoneyDeposit(ctx, ownerID, DepositMobileMoneyRequest{
		Amount:      50000,
		PhoneNumber: "0770000000",
		Provider:    "mtn",
	})
	if err != nil {
		t.Fatalf("InitiateMobileMoneyDeposit failed: %v", err)
	}

	// Webhook payload confirming success
	payload := GatewayWebhookPayload{
		Event:           "collection.successful",
		TransactionUUID: "gw-uuid-1",
		Reference:       depResp.Reference,
		ProviderRef:     "MTN-MOCK-9999",
		Status:          "success",
		Amount:          50000,
		Currency:        "UGX",
	}
	body, _ := json.Marshal(payload)

	err = svc.ProcessWebhook(ctx, body, "mock-valid-sig")
	if err != nil {
		t.Fatalf("ProcessWebhook failed: %v", err)
	}

	// Wallet balance should now have 50000 available
	wallet, _ := svc.GetOrCreateWallet(ctx, ownerID)
	if wallet.AvailableBalance != 50000 {
		t.Errorf("expected available balance 50000 after webhook, got %f", wallet.AvailableBalance)
	}

	// Idempotency: replay the same webhook, balance should NOT double
	err = svc.ProcessWebhook(ctx, body, "mock-valid-sig")
	if err != nil {
		t.Fatalf("Replay ProcessWebhook failed: %v", err)
	}
	wallet, _ = svc.GetOrCreateWallet(ctx, ownerID)
	if wallet.AvailableBalance != 50000 {
		t.Errorf("idempotency violated: expected available balance 50000, got %f", wallet.AvailableBalance)
	}

	// 2. Now initiate a withdrawal and confirm via webhook
	wdrResp, err := svc.InitiateWithdrawal(ctx, ownerID, WithdrawalRequest{
		Amount:      10000,
		PhoneNumber: "0770000000",
		Provider:    "mtn",
	})
	if err != nil {
		t.Fatalf("InitiateWithdrawal failed: %v", err)
	}

	wdrPayload := GatewayWebhookPayload{
		Event:           "disbursement.successful",
		TransactionUUID: "gw-uuid-wdr-1",
		Reference:       wdrResp.Reference,
		Status:          "success",
		Amount:          10000,
		Currency:        "UGX",
	}
	wdrBody, _ := json.Marshal(wdrPayload)
	if err := svc.ProcessWebhook(ctx, wdrBody, "mock-valid-sig"); err != nil {
		t.Fatalf("Withdrawal webhook failed: %v", err)
	}

	wallet, _ = svc.GetOrCreateWallet(ctx, ownerID)
	if wallet.AvailableBalance != 40000 {
		t.Errorf("expected available balance 40000, got %f", wallet.AvailableBalance)
	}
	if wallet.PendingBalance != 0 {
		t.Errorf("expected pending balance 0, got %f", wallet.PendingBalance)
	}
	if wallet.TotalWithdrawn != 10000 {
		t.Errorf("expected total withdrawn 10000, got %f", wallet.TotalWithdrawn)
	}

	// 3. Test failed withdrawal refunds pending back to available
	wdrResp2, err := svc.InitiateWithdrawal(ctx, ownerID, WithdrawalRequest{
		Amount:      15000,
		PhoneNumber: "0770000000",
		Provider:    "mtn",
	})
	if err != nil {
		t.Fatalf("InitiateWithdrawal 2 failed: %v", err)
	}

	failedPayload := GatewayWebhookPayload{
		Event:         "disbursement.failed",
		Reference:     wdrResp2.Reference,
		Status:        "failed",
		FailureReason: "Subscriber phone number barred",
	}
	failBody, _ := json.Marshal(failedPayload)
	if err := svc.ProcessWebhook(ctx, failBody, "mock-valid-sig"); err != nil {
		t.Fatalf("Failed webhook processing failed: %v", err)
	}

	wallet, _ = svc.GetOrCreateWallet(ctx, ownerID)
	if wallet.AvailableBalance != 40000 {
		t.Errorf("refund failed: expected available balance restored to 40000, got %f", wallet.AvailableBalance)
	}
	if wallet.PendingBalance != 0 {
		t.Errorf("refund failed: expected pending balance 0, got %f", wallet.PendingBalance)
	}
}

func TestListTransactionsAndEarnings(t *testing.T) {
	svc, _, _ := setupTestService(t)
	ctx := context.Background()
	ownerID := types.NewID()

	// Add 3 earnings
	for i := 1; i <= 3; i++ {
		_, err := svc.RecordEarning(ctx, RecordEarningRequest{
			OwnerID:      ownerID,
			Source:       SourceBandwidthRelay,
			BytesRelayed: uint64(i * 1024 * 1024 * 1024),
			Amount:       float64(i * 1000),
			Description:  "Relay reward",
		})
		if err != nil {
			t.Fatalf("RecordEarning failed: %v", err)
		}
	}

	// List earnings
	earningsList, err := svc.ListEarnings(ctx, ownerID, 10, 0)
	if err != nil {
		t.Fatalf("ListEarnings failed: %v", err)
	}
	if earningsList.Total != 3 {
		t.Errorf("expected 3 earning records, got %d", earningsList.Total)
	}
	if earningsList.TotalEarned != 6000 {
		t.Errorf("expected total earned 6000, got %f", earningsList.TotalEarned)
	}

	// List transactions
	txnsList, err := svc.ListTransactions(ctx, ownerID, 10, 0)
	if err != nil {
		t.Fatalf("ListTransactions failed: %v", err)
	}
	if txnsList.Total != 3 {
		t.Errorf("expected 3 transactions, got %d", txnsList.Total)
	}
}

func TestMarzPayPhoneFormatting(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"0771234567", "+256771234567"},
		{"256771234567", "+256771234567"},
		{"+256771234567", "+256771234567"},
		{"771234567", "+256771234567"},
		{"070-123-4567", "+256701234567"},
	}

	for _, c := range cases {
		actual := FormatUgandaPhone(c.input)
		if actual != c.expected {
			t.Errorf("FormatUgandaPhone(%q): expected %q, got %q", c.input, c.expected, actual)
		}
	}
}

func TestMarzPayHMACSignatureVerification(t *testing.T) {
	gw := NewMarzPayGateway("https://api.test", "key", "secret", "my-secret-webhook-key", nil)
	body := []byte(`{"event":"collection.successful","reference":"ZP-DEP-1234"}`)

	// Valid HMAC
	mac := hmac.New(sha256.New, []byte("my-secret-webhook-key"))
	mac.Write(body)
	validSig := hex.EncodeToString(mac.Sum(nil))

	if !gw.VerifyWebhookSignature(body, validSig) {
		t.Error("expected valid HMAC signature to pass verification")
	}

	// Invalid HMAC
	if gw.VerifyWebhookSignature(body, "invalid-hex-signature") {
		t.Error("expected invalid HMAC signature to fail verification")
	}

	// Direct token match
	if !gw.VerifyWebhookSignature(body, "my-secret-webhook-key") {
		t.Error("expected direct token match to pass verification")
	}
}
