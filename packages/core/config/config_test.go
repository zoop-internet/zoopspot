package config

import (
	"os"
	"testing"
	"time"
)

func TestLoadConfig(t *testing.T) {
	// Clear environment variables before testing
	os.Clearenv()

	// Test default values
	cfg := LoadConfig()
	if cfg.ControlPlaneURL != "http://localhost:8080" {
		t.Errorf("Expected default ControlPlaneURL to be http://localhost:8080, got %s", cfg.ControlPlaneURL)
	}
	if cfg.AgentListenAddr != "127.0.0.1:8080" {
		t.Errorf("Expected default AgentListenAddr to be 127.0.0.1:8080, got %s", cfg.AgentListenAddr)
	}
	if cfg.SignalingTimeout != 60*time.Second {
		t.Errorf("Expected default SignalingTimeout to be 60s, got %v", cfg.SignalingTimeout)
	}

	// Test overrides
	os.Setenv("ZOOP_CONTROL_PLANE_URL", "https://api.zoop.com")
	os.Setenv("ZOOP_AGENT_LISTEN_ADDR", "0.0.0.0:9090")
	os.Setenv("ZOOP_SIGNALING_TIMEOUT", "30")

	cfg = LoadConfig()
	if cfg.ControlPlaneURL != "https://api.zoop.com" {
		t.Errorf("Expected overridden ControlPlaneURL to be https://api.zoop.com, got %s", cfg.ControlPlaneURL)
	}
	if cfg.AgentListenAddr != "0.0.0.0:9090" {
		t.Errorf("Expected overridden AgentListenAddr to be 0.0.0.0:9090, got %s", cfg.AgentListenAddr)
	}
	if cfg.SignalingTimeout != 30*time.Second {
		t.Errorf("Expected overridden SignalingTimeout to be 30s, got %v", cfg.SignalingTimeout)
	}
}
