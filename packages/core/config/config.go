package config

import (
	"os"
	"strconv"
	"time"
)

// Config represents high-level configuration for Zoop agents and clouds.
type Config struct {
	ControlPlaneURL   string
	AgentListenAddr   string
	LogLevel          string
	IdentityPath      string
	SignalingTimeout  time.Duration
}

// LoadConfig returns a configuration loaded from environment variables, falling back to sane defaults.
func LoadConfig() Config {
	cfg := Config{
		ControlPlaneURL:  "http://localhost:8080",
		AgentListenAddr:  "127.0.0.1:8080",
		LogLevel:         "info",
		IdentityPath:     "",
		SignalingTimeout: 60 * time.Second,
	}

	if url := os.Getenv("ZOOP_CONTROL_PLANE_URL"); url != "" {
		cfg.ControlPlaneURL = url
	}
	if addr := os.Getenv("ZOOP_AGENT_LISTEN_ADDR"); addr != "" {
		cfg.AgentListenAddr = addr
	}
	if level := os.Getenv("ZOOP_LOG_LEVEL"); level != "" {
		cfg.LogLevel = level
	}
	if path := os.Getenv("ZOOP_IDENTITY_PATH"); path != "" {
		cfg.IdentityPath = path
	}
	if timeoutStr := os.Getenv("ZOOP_SIGNALING_TIMEOUT"); timeoutStr != "" {
		if timeout, err := strconv.Atoi(timeoutStr); err == nil {
			cfg.SignalingTimeout = time.Duration(timeout) * time.Second
		}
	}

	return cfg
}
