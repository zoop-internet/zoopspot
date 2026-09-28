package hotspot

import (
	"context"
	"strings"
	"testing"

	"github.com/zoop-internet/zoopspot/packages/cloud/payments"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

func TestHotspot_MikroTikScriptGeneration(t *testing.T) {
	h := &types.Hotspot{
		ID:                types.NewID(),
		OwnerID:           types.NewID(),
		Name:              "Kampala Student Hub",
		Slug:              "kla-hub",
		RouterType:        types.RouterMikroTik,
		RouterAPIUser:     "zoopspot",
		RouterAPIPassword: "secretPassword123",
	}

	cfg := MikroTikConfig{
		Hotspot:         h,
		ServerWGPubKey:  "4YhZ3z8b4...=",
		ServerEndpoint:  "vpn.zoopspot.network:51820",
		ClientWGAddress: "100.64.0.2/30",
		PortalBaseURL:   "https://zoopspot.network/portal",
	}

	script := GenerateMikroTikScript(cfg)
	if !strings.Contains(script, "wg-zoopspot") {
		t.Errorf("script missing WireGuard interface definition")
	}
	if !strings.Contains(script, "100.64.0.2/30") {
		t.Errorf("script missing overlay IP")
	}
	if !strings.Contains(script, "walled-garden") {
		t.Errorf("script missing walled-garden entries")
	}
	if !strings.Contains(script, "wearemarz.com") {
		t.Errorf("script missing MarzPay walled-garden bypass")
	}
	if !strings.Contains(script, "mtn.co.ug") {
		t.Errorf("script missing MTN walled-garden bypass")
	}
}

func TestHotspot_ServiceFlow(t *testing.T) {
	st := store.NewInMemoryStore()
	pay := payments.NewPaymentService(st, payments.NewMockGateway(), nil)
	ctrl := NewMockRouterController()
	svc := NewHotspotService(st, pay, ctrl, nil, "serverPubKey", "vpn.zoopspot.network:51820", "https://zoopspot.network/portal")
	ctx := context.Background()

	ownerID := types.NewID()

	// 1. Create Hotspot
	h, err := svc.CreateHotspot(ctx, ownerID, "Makerere Hostel Wi-Fi", "mak-hostel", "Makerere", types.RouterMikroTik)
	if err != nil {
		t.Fatalf("CreateHotspot failed: %v", err)
	}

	// 2. Verify default packages created
	pkgs, err := svc.ListPackages(ctx, h.ID)
	if err != nil || len(pkgs) != 3 {
		t.Fatalf("ListPackages failed: %v, count %d", err, len(pkgs))
	}

	// 3. Initiate Checkout via Mobile Money
	checkout, err := svc.InitiatePortalCheckout(ctx, "mak-hostel", pkgs[0].ID.String(), "0771234567", "AA:BB:CC:11:22:33", "192.168.88.20")
	if err != nil {
		t.Fatalf("InitiatePortalCheckout failed: %v", err)
	}
	if checkout.Amount != pkgs[0].Price {
		t.Errorf("expected amount %f, got %f", pkgs[0].Price, checkout.Amount)
	}

	// 4. Test Voucher Generation & Claiming
	vouchers, err := svc.GenerateVouchers(ctx, h.ID, pkgs[1].ID, 5, "batch-1")
	if err != nil || len(vouchers) != 5 {
		t.Fatalf("GenerateVouchers failed: %v, count %d", err, len(vouchers))
	}

	voucherCode := vouchers[0].Code
	claimedSess, err := svc.ClaimVoucher(ctx, "mak-hostel", voucherCode, "DD:EE:FF:33:44:55", "192.168.88.30")
	if err != nil {
		t.Fatalf("ClaimVoucher failed: %v", err)
	}
	if claimedSess.Status != types.SessionActive {
		t.Errorf("expected active session, got %s", claimedSess.Status)
	}
	if _, ok := ctrl.UnlockedMACs["DD:EE:FF:33:44:55"]; !ok {
		t.Errorf("expected router unlock for MAC DD:EE:FF:33:44:55")
	}

	// 5. Test 10-Minute Ad Lifeline
	lifeSess, err := svc.ClaimLifeline(ctx, "mak-hostel", "11:22:33:44:55:66", "192.168.88.40")
	if err != nil {
		t.Fatalf("ClaimLifeline failed: %v", err)
	}
	if lifeSess.Status != types.SessionActive {
		t.Errorf("expected active lifeline session")
	}
	if _, ok := ctrl.UnlockedMACs["11:22:33:44:55:66"]; !ok {
		t.Errorf("expected router unlock for lifeline MAC")
	}
}
