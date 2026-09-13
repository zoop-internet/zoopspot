package identity_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/allannuwamanya/zoop/packages/agent/identity"
)

func TestLoadOrGenerate(t *testing.T) {
	dir := t.TempDir()
	keyPath := filepath.Join(dir, "identity.key")
	m := identity.NewManager()

	// 1. Generate new
	ident1, err := m.LoadOrGenerate(keyPath)
	if err != nil {
		t.Fatalf("failed to generate identity: %v", err)
	}
	if len(ident1.PublicKey) == 0 {
		t.Error("expected non-empty public key")
	}
	if ident1.EndpointID.String() == "" {
		t.Error("expected valid endpoint ID")
	}

	// 2. Load existing
	ident2, err := m.LoadOrGenerate(keyPath)
	if err != nil {
		t.Fatalf("failed to load identity: %v", err)
	}

	if ident1.EndpointID != ident2.EndpointID {
		t.Errorf("expected same endpoint ID on load, got %s and %s", ident1.EndpointID, ident2.EndpointID)
	}

	// 3. Verify permissions (0600)
	info, err := os.Stat(keyPath)
	if err != nil {
		t.Fatalf("failed to stat key file: %v", err)
	}
	if info.Mode().Perm() != 0600 {
		t.Errorf("expected permissions 0600, got %v", info.Mode().Perm())
	}
}
