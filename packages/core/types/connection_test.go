package types

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestConnectionJSON(t *testing.T) {
	id := ID(uuid.New())
	provId := ID(uuid.New())
	recId := ID(uuid.New())

	conn := Connection{
		ID:          id,
		ProviderID:  provId,
		RecipientID: recId,
		State:       ConnectionStateConnecting,
	}

	data, err := json.Marshal(conn)
	if err != nil {
		t.Fatalf("failed to marshal connection: %v", err)
	}

	var parsed Connection
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal connection: %v", err)
	}

	if parsed.ID != conn.ID {
		t.Errorf("expected ID %v, got %v", conn.ID, parsed.ID)
	}
	if parsed.State != conn.State {
		t.Errorf("expected State %v, got %v", conn.State, parsed.State)
	}
}

func TestSharingRelationshipJSON(t *testing.T) {
	id := ID(uuid.New())
	provId := ID(uuid.New())
	recId := ID(uuid.New())

	rel := SharingRelationship{
		ID:          id,
		ProviderID:  provId,
		RecipientID: recId,
		IsActive:    true,
	}

	data, err := json.Marshal(rel)
	if err != nil {
		t.Fatalf("failed to marshal relationship: %v", err)
	}

	var parsed SharingRelationship
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal relationship: %v", err)
	}

	if parsed.ID != rel.ID {
		t.Errorf("expected ID %v, got %v", rel.ID, parsed.ID)
	}
	if parsed.IsActive != rel.IsActive {
		t.Errorf("expected IsActive %v, got %v", rel.IsActive, parsed.IsActive)
	}
}
