package config

import (
	"os"
	"reflect"
	"testing"
	"time"
)

func TestLoadConfig(t *testing.T) {
	// Clear environment variables before testing
	os.Clearenv()

	// Test default values
	cfg := LoadConfig()
	if cfg.ControlPlaneURL != "https://zoop-cloud.onrender.com" {
		t.Errorf("Expected default ControlPlaneURL to be https://zoop-cloud.onrender.com, got %s", cfg.ControlPlaneURL)
	}
	if cfg.AgentListenAddr != "127.0.0.1:8080" {
		t.Errorf("Expected default AgentListenAddr to be 127.0.0.1:8080, got %s", cfg.AgentListenAddr)
	}
	if cfg.SignalingTimeout != 60*time.Second {
		t.Errorf("Expected default SignalingTimeout to be 60s, got %v", cfg.SignalingTimeout)
	}
	if cfg.TURNSecret != "" {
		t.Errorf("Expected default TURNSecret to be empty (must be set via ZOOP_TURN_SECRET), got %s", cfg.TURNSecret)
	}
	if cfg.TURNRealm != "zoop.network" {
		t.Errorf("Expected default TURNRealm to be zoop.network, got %s", cfg.TURNRealm)
	}

	// Test overrides
	os.Setenv("ZOOP_CONTROL_PLANE_URL", "https://api.zoop.network")
	os.Setenv("ZOOP_AGENT_LISTEN_ADDR", "0.0.0.0:9090")
	os.Setenv("ZOOP_SIGNALING_TIMEOUT", "30")
	os.Setenv("ZOOP_ALLOWED_ORIGINS", "http://localhost:3000, https://app.zoop.network, https://dashboard.zoop.network")
	os.Setenv("ZOOP_TURN_SECRET", "custom-secret")
	os.Setenv("ZOOP_TURN_REALM", "turn.custom.org")

	cfg = LoadConfig()
	if cfg.ControlPlaneURL != "https://api.zoop.network" {
		t.Errorf("Expected overridden ControlPlaneURL to be https://api.zoop.network, got %s", cfg.ControlPlaneURL)
	}
	if cfg.AgentListenAddr != "0.0.0.0:9090" {
		t.Errorf("Expected overridden AgentListenAddr to be 0.0.0.0:9090, got %s", cfg.AgentListenAddr)
	}
	if cfg.SignalingTimeout != 30*time.Second {
		t.Errorf("Expected overridden SignalingTimeout to be 30s, got %v", cfg.SignalingTimeout)
	}
	expectedOrigins := []string{"http://localhost:3000", "https://app.zoop.network", "https://dashboard.zoop.network"}
	if !reflect.DeepEqual(cfg.AllowedOrigins, expectedOrigins) {
		t.Errorf("Expected AllowedOrigins to be %v, got %v", expectedOrigins, cfg.AllowedOrigins)
	}
	if cfg.TURNSecret != "custom-secret" {
		t.Errorf("Expected overridden TURNSecret to be custom-secret, got %s", cfg.TURNSecret)
	}
	if cfg.TURNRealm != "turn.custom.org" {
		t.Errorf("Expected overridden TURNRealm to be turn.custom.org, got %s", cfg.TURNRealm)
	}

	// Test DatabaseURL fallback with ZOOP_POSTGRES_URL
	os.Clearenv()
	os.Setenv("ZOOP_POSTGRES_URL", "postgres://user:pass@ep-host.neon.tech/db")
	cfg = LoadConfig()
	if cfg.DatabaseURL != "postgres://user:pass@ep-host.neon.tech/db" {
		t.Errorf("Expected DatabaseURL from ZOOP_POSTGRES_URL, got %s", cfg.DatabaseURL)
	}
}

func TestParseCommaSeparated(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"", nil},
		{"   ", nil},
		{"a,b,c", []string{"a", "b", "c"}},
		{"  foo  ,  bar  , baz  ", []string{"foo", "bar", "baz"}},
		{",,,", nil},
		{"a,,b,", []string{"a", "b"}},
	}

	for _, tc := range tests {
		result := parseCommaSeparated(tc.input)
		if len(result) == 0 && len(tc.expected) == 0 {
			continue
		}
		if !reflect.DeepEqual(result, tc.expected) {
			t.Errorf("parseCommaSeparated(%q) = %v, expected %v", tc.input, result, tc.expected)
		}
	}
}
