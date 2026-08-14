package services

import (
	"context"
	"log/slog"
	"testing"

	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/core/types"
)

func TestAuditService_ChainContinuation(t *testing.T) {
	audit := NewAuditService([]byte("test-secret"), slog.Default())
	actorID := types.ID(uuid.New())

	_, err := audit.Log(context.Background(), actorID, "device_registered", "dev-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	event2, err := audit.Log(context.Background(), actorID, "device_revoked", "dev-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if event2.Signature == "" {
		t.Fatalf("expected non-empty signature for event 2")
	}

	// Simulate service restart by creating a new AuditService instance and restoring history
	audit2 := NewAuditService([]byte("test-secret"), slog.Default())
	audit2.InitHistory(audit.ListEvents())

	event3, err := audit2.Log(context.Background(), actorID, "device_connected", "dev-1", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if event3.Signature == "" {
		t.Fatalf("expected non-empty signature for event 3")
	}

	events := audit2.ListEvents()
	if len(events) != 3 {
		t.Errorf("expected 3 events, got %d", len(events))
	}
}
