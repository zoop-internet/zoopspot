package services

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoopspot/packages/core/types"
)

// AuditEvent represents a single security audit log entry.
type AuditEvent struct {
	ID        types.ID  `json:"id"`
	ActorID   types.ID  `json:"actor_id"`
	Action    string    `json:"action"` // e.g. device_registered, device_revoked, org_created
	TargetID  string    `json:"target_id"`
	Metadata  string    `json:"metadata,omitempty"`
	Timestamp time.Time `json:"timestamp"`
	Signature string    `json:"signature"` // HMAC-SHA256 log chain signature
}

// AuditService records and cryptographically chains audit log entries.
type AuditService struct {
	mu      sync.Mutex
	secret  []byte
	events  []*AuditEvent
	logger  *slog.Logger
	lastSig string
}

// NewAuditService creates an audit logger with an HMAC signing secret.
func NewAuditService(secret []byte, logger *slog.Logger) *AuditService {
	if len(secret) == 0 {
		logger.Warn("ZOOP_AUDIT_HMAC_KEY not set; audit log chain integrity is disabled")
		secret = []byte("disabled")
	}
	return &AuditService{
		secret:  secret,
		events:  make([]*AuditEvent, 0),
		logger:  logger,
		lastSig: "genesis",
	}
}

// InitHistory initializes the audit chain from existing historical events (e.g. on server restart).
func (s *AuditService) InitHistory(events []*AuditEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = make([]*AuditEvent, len(events))
	copy(s.events, events)

	if len(events) > 0 {
		s.lastSig = events[len(events)-1].Signature
	} else {
		s.lastSig = "genesis"
	}
}

// SetLastSignature forces the chain's predecessor signature (e.g., loaded from persistent store).
func (s *AuditService) SetLastSignature(sig string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if sig != "" {
		s.lastSig = sig
	}
}

// Log records an audit event with an HMAC signature chaining to the previous entry.
func (s *AuditService) Log(ctx context.Context, actorID types.ID, action, targetID, metadata string) (*AuditEvent, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	eventID := types.ID(uuid.New())

	// Compute chained HMAC signature
	canonical := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s",
		eventID.String(),
		actorID.String(),
		action,
		targetID,
		metadata,
		now.Format(time.RFC3339Nano),
		s.lastSig,
	)

	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(canonical))
	sig := hex.EncodeToString(h.Sum(nil))

	event := &AuditEvent{
		ID:        eventID,
		ActorID:   actorID,
		Action:    action,
		TargetID:  targetID,
		Metadata:  metadata,
		Timestamp: now,
		Signature: sig,
	}

	s.lastSig = sig
	s.events = append(s.events, event)

	s.logger.Info("Audit event recorded",
		"action", action,
		"actor_id", actorID.String(),
		"target_id", targetID,
		"sig", sig[:8]+"...",
	)

	return event, nil
}

// ListEvents returns recorded audit events.
func (s *AuditService) ListEvents() []*AuditEvent {
	s.mu.Lock()
	defer s.mu.Unlock()

	res := make([]*AuditEvent, len(s.events))
	copy(res, s.events)
	return res
}
