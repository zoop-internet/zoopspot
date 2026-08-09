package core

import (
	"testing"
)

func TestVersion(t *testing.T) {
	v := Version()
	if v == "" {
		t.Fatal("expected non-empty version string")
	}

	expected := "0.1.0-alpha"
	if v != expected {
		t.Errorf("Version() = %q, want %q", v, expected)
	}
}
