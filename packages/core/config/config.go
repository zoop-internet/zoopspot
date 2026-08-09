package config

import "os"

// Config represents high-level configuration for Zoop agents and clouds.
type Config struct {
	ControlPlaneURL string
	AgentListenAddr string
	LogLevel        string
}

// LoadConfig returns a configuration loaded from environment variables, falling back to sane defaults.
func LoadConfig() Config {
	cfg := Config{
		ControlPlaneURL: "http://localhost:8080",
		AgentListenAddr: "127.0.0.1:8080",
		LogLevel:        "info",
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

	return cfg
}
