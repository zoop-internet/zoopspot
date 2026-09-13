package types_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

func TestNewID(t *testing.T) {
	id := types.NewID()

	if id.String() == "" {
		t.Error("expected valid string representation for ID")
	}

	_, err := uuid.Parse(id.String())
	if err != nil {
		t.Errorf("expected valid UUID, got %v", err)
	}
}

func TestAccountCreation(t *testing.T) {
	id := types.NewID()
	acc := types.Account{
		ID:   id,
		Name: "Test Account",
	}

	if acc.Name != "Test Account" {
		t.Errorf("expected name 'Test Account', got %s", acc.Name)
	}
}
