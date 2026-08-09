package config

// Config represents high-level configuration for Zoop agents and clouds.
type Config struct {
	ControlPlaneURL string
	AgentListenAddr string
	LogLevel        string
}

// DefaultConfig returns a sane default configuration.
func DefaultConfig() Config {
	return Config{
		ControlPlaneURL: "https://api.zoop.io",
		AgentListenAddr: "127.0.0.1:8080",
		LogLevel:        "info",
	}
}
