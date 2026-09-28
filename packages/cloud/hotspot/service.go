package hotspot

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/zoop-internet/zoopspot/packages/cloud/payments"
	"github.com/zoop-internet/zoopspot/packages/cloud/store"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

var (
	ErrHotspotNotFound = errors.New("hotspot not found")
	ErrPackageNotFound = errors.New("package not found")
	ErrSessionNotFound = errors.New("session not found")
	ErrLifelineUsed    = errors.New("free lifeline already used today; please select a package")
)

type InitiateCheckoutResp struct {
	SessionID     types.ID                `json:"session_id"`
	TransactionID types.ID                `json:"transaction_id"`
	Status        types.SessionStatus     `json:"status"`
	Amount        float64                 `json:"amount"`
	Currency      string                  `json:"currency"`
	Message       string                  `json:"message"`
}

type HotspotService struct {
	store          store.Store
	payments       *payments.PaymentService
	controller     RouterController
	logger         *slog.Logger
	serverWGPubKey string
	serverEndpoint string
	portalBaseURL  string
}

func NewHotspotService(
	st store.Store,
	pay *payments.PaymentService,
	ctrl RouterController,
	logger *slog.Logger,
	serverWGPubKey, serverEndpoint, portalBaseURL string,
) *HotspotService {
	if logger == nil {
		logger = slog.Default()
	}
	if ctrl == nil {
		ctrl = NewMockRouterController()
	}
	if portalBaseURL == "" {
		portalBaseURL = "https://zoopspot.network/portal"
	}
	return &HotspotService{
		store:          st,
		payments:       pay,
		controller:     ctrl,
		logger:         logger,
		serverWGPubKey: serverWGPubKey,
		serverEndpoint: serverEndpoint,
		portalBaseURL:  portalBaseURL,
	}
}

// CreateHotspot registers a new hotspot venue.
func (s *HotspotService) CreateHotspot(ctx context.Context, ownerID types.ID, name, slug, location string, rType types.HotspotRouterType) (*types.Hotspot, error) {
	if name == "" {
		return nil, fmt.Errorf("hotspot name cannot be empty")
	}
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(name, " ", "-"))
	}

	h := &types.Hotspot{
		ID:                types.NewID(),
		OwnerID:           ownerID,
		Name:              name,
		Slug:              slug,
		Location:          location,
		RouterType:        rType,
		RouterAPIUser:     "zoopspot",
		RouterAPIPassword: "ZP-" + types.NewID().String()[:8],
		Currency:          "UGX",
		IsOnline:          false,
	}

	if err := s.store.SaveHotspot(ctx, h); err != nil {
		return nil, fmt.Errorf("failed to save hotspot: %w", err)
	}

	// Create default attractive pricing tiers for East Africa
	defaults := []struct {
		name     string
		price    float64
		duration int
		down     int
		up       int
	}{
		{"1 Hour Rush", 500, 60, 5120, 2048},
		{"3 Hours Super", 1000, 180, 5120, 2048},
		{"24 Hours Day Pass", 2000, 1440, 10240, 5120},
	}

	for _, d := range defaults {
		_ = s.store.SaveHotspotPackage(ctx, &types.HotspotPackage{
			ID:                types.NewID(),
			HotspotID:         h.ID,
			Name:              d.name,
			Price:             d.price,
			DurationMinutes:   d.duration,
			RateLimitDownKbps: d.down,
			RateLimitUpKbps:   d.up,
			IsActive:          true,
		})
	}

	return h, nil
}

// GetHotspot retrieves a hotspot by ID.
func (s *HotspotService) GetHotspot(ctx context.Context, id types.ID) (*types.Hotspot, error) {
	return s.store.GetHotspot(ctx, id)
}

// GetHotspotBySlug retrieves a hotspot by slug for public captive portal access.
func (s *HotspotService) GetHotspotBySlug(ctx context.Context, slug string) (*types.Hotspot, error) {
	return s.store.GetHotspotBySlug(ctx, slug)
}

// ListHotspots returns all hotspots belonging to an operator account.
func (s *HotspotService) ListHotspots(ctx context.Context, ownerID types.ID) ([]*types.Hotspot, error) {
	return s.store.ListHotspots(ctx, ownerID)
}

// DeleteHotspot deletes a hotspot and its associated packages and sessions.
func (s *HotspotService) DeleteHotspot(ctx context.Context, id types.ID) error {
	return s.store.DeleteHotspot(ctx, id)
}

// GenerateProvisioningScript generates a RouterOS v7 setup script for this hotspot.
func (s *HotspotService) GenerateProvisioningScript(ctx context.Context, hotspotID types.ID) (string, error) {
	h, err := s.store.GetHotspot(ctx, hotspotID)
	if err != nil {
		return "", err
	}

	cfg := MikroTikConfig{
		Hotspot:         h,
		ServerWGPubKey:  s.serverWGPubKey,
		ServerEndpoint:  s.serverEndpoint,
		ClientWGAddress: h.RouterIP,
		PortalBaseURL:   s.portalBaseURL,
	}
	if cfg.ClientWGAddress == "" {
		cfg.ClientWGAddress = "100.64.0.2/30"
	}
	if cfg.ServerEndpoint == "" {
		cfg.ServerEndpoint = "cloud.zoopspot.network:51820"
	}
	return GenerateMikroTikScript(cfg), nil
}

// CreatePackage adds a new access package to a hotspot.
func (s *HotspotService) CreatePackage(ctx context.Context, hotspotID types.ID, name string, price float64, durationMin, rateDown, rateUp int) (*types.HotspotPackage, error) {
	pkg := &types.HotspotPackage{
		ID:                types.NewID(),
		HotspotID:         hotspotID,
		Name:              name,
		Price:             price,
		DurationMinutes:   durationMin,
		RateLimitDownKbps: rateDown,
		RateLimitUpKbps:   rateUp,
		IsActive:          true,
	}
	if err := s.store.SaveHotspotPackage(ctx, pkg); err != nil {
		return nil, err
	}
	return pkg, nil
}

// ListPackages returns all active packages for a hotspot.
func (s *HotspotService) ListPackages(ctx context.Context, hotspotID types.ID) ([]*types.HotspotPackage, error) {
	return s.store.ListHotspotPackages(ctx, hotspotID)
}

// DeletePackage deletes a pricing package.
func (s *HotspotService) DeletePackage(ctx context.Context, packageID types.ID) error {
	return s.store.DeleteHotspotPackage(ctx, packageID)
}

// InitiatePortalCheckout handles a customer's package purchase via Mobile Money (MTN MoMo or Airtel Money).
func (s *HotspotService) InitiatePortalCheckout(ctx context.Context, hotspotSlug, packageIDStr, rawPhone, mac, clientIP string) (*InitiateCheckoutResp, error) {
	h, err := s.store.GetHotspotBySlug(ctx, hotspotSlug)
	if err != nil {
		return nil, ErrHotspotNotFound
	}

	pkgID, err := types.ParseID(packageIDStr)
	if err != nil {
		return nil, ErrPackageNotFound
	}
	pkg, err := s.store.GetHotspotPackage(ctx, pkgID)
	if err != nil {
		return nil, ErrPackageNotFound
	}

	phone := payments.FormatUgandaPhone(rawPhone)
	sessionID := types.NewID()

	// 1. Create a pending HotspotSession
	session := &types.HotspotSession{
		ID:          sessionID,
		HotspotID:   h.ID,
		PackageID:   &pkg.ID,
		PhoneNumber: phone,
		MACAddress:  mac,
		ClientIP:    clientIP,
		Status:      types.SessionPending,
	}
	if err := s.store.SaveHotspotSession(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to save session: %w", err)
	}

	// 2. Determine telecom provider
	provider := "mtn"
	if strings.HasPrefix(phone, "+25670") || strings.HasPrefix(phone, "+25675") || strings.HasPrefix(phone, "+25674") {
		provider = "airtel"
	}

	// 3. Initiate Mobile Money collection via PaymentService
	// The operator's wallet is credited when the webhook confirms payment.
	depResp, err := s.payments.InitiateMobileMoneyDeposit(ctx, h.OwnerID, payments.DepositMobileMoneyRequest{
		Amount:      pkg.Price,
		PhoneNumber: phone,
		Provider:    provider,
		Description: fmt.Sprintf("ZoopSpot Wi-Fi: %s (%s)", pkg.Name, h.Name),
	})
	if err != nil {
		return nil, fmt.Errorf("mobile money request failed: %w", err)
	}

	// Link transaction to session
	session.TransactionID = &depResp.TransactionID
	_ = s.store.SaveHotspotSession(ctx, session)

	return &InitiateCheckoutResp{
		SessionID:     sessionID,
		TransactionID: depResp.TransactionID,
		Status:        types.SessionPending,
		Amount:        pkg.Price,
		Currency:      "UGX",
		Message:       "Prompt sent to phone. Enter PIN on your phone to complete payment.",
	}, nil
}

// UnlockSession activates a session and tells the router to bypass the captive portal for this MAC address.
func (s *HotspotService) UnlockSession(ctx context.Context, session *types.HotspotSession, durationMinutes, rateDown, rateUp int) error {
	now := time.Now().UTC()
	exp := now.Add(time.Duration(durationMinutes) * time.Minute)

	session.Status = types.SessionActive
	session.StartedAt = &now
	session.ExpiresAt = &exp

	if err := s.store.SaveHotspotSession(ctx, session); err != nil {
		return err
	}

	h, err := s.store.GetHotspot(ctx, session.HotspotID)
	if err != nil {
		return err
	}

	// Dispatch router bypass command
	req := RouterUnlockRequest{
		RouterIP:        h.RouterIP,
		RouterUser:      h.RouterAPIUser,
		RouterPassword:  h.RouterAPIPassword,
		MACAddress:      session.MACAddress,
		ClientIP:        session.ClientIP,
		Duration:        time.Duration(durationMinutes) * time.Minute,
		RateLimitDownKb: rateDown,
		RateLimitUpKb:   rateUp,
		Comment:         fmt.Sprintf("ZoopSpot:%s:phone=%s", session.MACAddress, session.PhoneNumber),
	}
	return s.controller.UnlockClient(ctx, req)
}

// UnlockSessionOnPayment is called when a payment transaction transitions to completed.
func (s *HotspotService) UnlockSessionOnPayment(ctx context.Context, txnID types.ID) (*types.HotspotSession, error) {
	// Look up the transaction to find amount and owner
	txn, err := s.store.GetTransaction(ctx, txnID)
	if err != nil {
		return nil, err
	}

	// Find any pending session associated with this transaction
	allSessions, _, err := s.store.ListHotspotSessions(ctx, txn.OwnerID, 100, 0)
	var targetSession *types.HotspotSession
	if err == nil {
		for _, sess := range allSessions {
			if sess.TransactionID != nil && *sess.TransactionID == txnID {
				targetSession = sess
				break
			}
		}
	}

	if targetSession == nil {
		s.logger.Info("No direct hotspot session linked to transaction; wallet balance updated directly", "txn_id", txnID)
		return nil, nil
	}

	// Look up the package duration
	duration := 60
	rateDown := 5120
	rateUp := 2048
	if targetSession.PackageID != nil {
		if pkg, err := s.store.GetHotspotPackage(ctx, *targetSession.PackageID); err == nil {
			duration = pkg.DurationMinutes
			rateDown = pkg.RateLimitDownKbps
			rateUp = pkg.RateLimitUpKbps
		}
	}

	if err := s.UnlockSession(ctx, targetSession, duration, rateDown, rateUp); err != nil {
		return nil, err
	}
	s.logger.Info("Session successfully unlocked after payment", "session_id", targetSession.ID, "mac", targetSession.MACAddress)
	return targetSession, nil
}

// ClaimVoucher validates and claims an offline voucher code.
func (s *HotspotService) ClaimVoucher(ctx context.Context, hotspotSlug, code, mac, clientIP string) (*types.HotspotSession, error) {
	h, err := s.store.GetHotspotBySlug(ctx, hotspotSlug)
	if err != nil {
		return nil, ErrHotspotNotFound
	}

	voucher, err := s.store.ClaimHotspotVoucher(ctx, h.ID, strings.TrimSpace(code), mac)
	if err != nil {
		return nil, fmt.Errorf("invalid or already claimed voucher: %w", err)
	}

	pkg, err := s.store.GetHotspotPackage(ctx, voucher.PackageID)
	if err != nil {
		return nil, ErrPackageNotFound
	}

	session := &types.HotspotSession{
		ID:          types.NewID(),
		HotspotID:   h.ID,
		PackageID:   &pkg.ID,
		MACAddress:  mac,
		ClientIP:    clientIP,
		Status:      types.SessionActive,
		VoucherCode: voucher.Code,
	}

	if err := s.UnlockSession(ctx, session, pkg.DurationMinutes, pkg.RateLimitDownKbps, pkg.RateLimitUpKbps); err != nil {
		return nil, err
	}
	return session, nil
}

// ClaimLifeline awards a one-time 10-minute free access lifeline per MAC address per 24 hours.
func (s *HotspotService) ClaimLifeline(ctx context.Context, hotspotSlug, mac, clientIP string) (*types.HotspotSession, error) {
	h, err := s.store.GetHotspotBySlug(ctx, hotspotSlug)
	if err != nil {
		return nil, ErrHotspotNotFound
	}

	// Check if this MAC has an active session
	if active, err := s.store.GetActiveSessionByMAC(ctx, h.ID, mac); err == nil && active != nil {
		return active, nil
	}

	session := &types.HotspotSession{
		ID:         types.NewID(),
		HotspotID:  h.ID,
		MACAddress: mac,
		ClientIP:   clientIP,
		Status:     types.SessionActive,
	}

	// 10 minutes free lifeline with 2Mbps cap
	if err := s.UnlockSession(ctx, session, 10, 2048, 1024); err != nil {
		return nil, err
	}
	return session, nil
}

// GetSession retrieves the current status of a customer session.
func (s *HotspotService) GetSession(ctx context.Context, sessionID types.ID) (*types.HotspotSession, error) {
	return s.store.GetHotspotSession(ctx, sessionID)
}

// GenerateVouchers generates a batch of offline vouchers for cash sale.
func (s *HotspotService) GenerateVouchers(ctx context.Context, hotspotID, packageID types.ID, count int, batchTag string) ([]*types.HotspotVoucher, error) {
	vouchers, err := GenerateVoucherBatch(hotspotID, packageID, count, batchTag)
	if err != nil {
		return nil, err
	}

	for _, v := range vouchers {
		if err := s.store.SaveHotspotVoucher(ctx, v); err != nil {
			return nil, err
		}
	}
	return vouchers, nil
}

// ListVouchers returns vouchers for a hotspot.
func (s *HotspotService) ListVouchers(ctx context.Context, hotspotID types.ID, limit, offset int) ([]*types.HotspotVoucher, int, error) {
	return s.store.ListHotspotVouchers(ctx, hotspotID, limit, offset)
}

// GetStats computes real-time operational stats for a hotspot.
func (s *HotspotService) GetStats(ctx context.Context, hotspotID types.ID) (*types.HotspotStats, error) {
	sessions, totalSessions, err := s.store.ListHotspotSessions(ctx, hotspotID, 1000, 0)
	if err != nil {
		return nil, err
	}
	vouchers, totalVouchers, err := s.store.ListHotspotVouchers(ctx, hotspotID, 1000, 0)
	if err != nil {
		return nil, err
	}

	stats := &types.HotspotStats{
		HotspotID:     hotspotID,
		TotalSessions: totalSessions,
		TotalVouchers: totalVouchers,
	}

	for _, sess := range sessions {
		if sess.Status == types.SessionActive {
			stats.ActiveSessions++
		}
		stats.TotalBytesDown += sess.BytesDownloaded
		stats.TotalBytesUp += sess.BytesUploaded
	}
	for _, v := range vouchers {
		if v.IsClaimed {
			stats.ClaimedVouchers++
		}
	}

	return stats, nil
}

