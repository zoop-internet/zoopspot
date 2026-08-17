package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config represents high-level configuration for Zoop agents and clouds.
type Config struct {
	ControlPlaneURL  string
	AgentListenAddr  string
	LogLevel         string
	IdentityPath     string
	DatabaseURL      string
	RedisURL         string
	SignalingTimeout time.Duration
	AllowedOrigins   []string
	TURNSecret       string
	TURNRealm        string
	STUNServer       string
}

// LoadConfig returns a configuration loaded from environment variables, falling back to sane defaults.
func LoadConfig() Config {
	cfg := Config{
		ControlPlaneURL:  "http://localhost:8080",
		AgentListenAddr:  "127.0.0.1:8080",
		LogLevel:         "info",
		IdentityPath:     "",
		DatabaseURL:      "",
		RedisURL:         "",
		SignalingTimeout: 60 * time.Second,
		AllowedOrigins:   []string{},
		TURNSecret:       "zoop-turn-secret",
		TURNRealm:        "zoop.network",
		STUNServer:       "stun.l.google.com:19302",
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
	if dbURL := os.Getenv("ZOOP_DATABASE_URL"); dbURL != "" {
		cfg.DatabaseURL = dbURL
	} else if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		cfg.DatabaseURL = dbURL
	}
	if redisURL := os.Getenv("ZOOP_REDIS_URL"); redisURL != "" {
		cfg.RedisURL = redisURL
	} else if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		cfg.RedisURL = redisURL
	}
	if timeoutStr := os.Getenv("ZOOP_SIGNALING_TIMEOUT"); timeoutStr != "" {
		if timeout, err := strconv.Atoi(timeoutStr); err == nil {
			cfg.SignalingTimeout = time.Duration(timeout) * time.Second
		}
	}
	if origins := os.Getenv("ZOOP_ALLOWED_ORIGINS"); origins != "" {
		cfg.AllowedOrigins = parseCommaSeparated(origins)
	}
	if secret := os.Getenv("ZOOP_TURN_SECRET"); secret != "" {
		cfg.TURNSecret = secret
	}
	if realm := os.Getenv("ZOOP_TURN_REALM"); realm != "" {
		cfg.TURNRealm = realm
	}
	if stun := os.Getenv("ZOOP_STUN_SERVER"); stun != "" {
		cfg.STUNServer = stun
	}

	return cfg
}

func parseCommaSeparated(s string) []string {
	var res []string
	for _, item := range strings.Split(s, ",") {
		trimmed := strings.TrimSpace(item)
		if trimmed != "" {
			res = append(res, trimmed)
		}
	}
	return res
}

