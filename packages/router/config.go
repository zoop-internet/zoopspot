package router

type RouterMode string

const (
	ModeProvider  RouterMode = "provider"
	ModeRecipient RouterMode = "recipient"
)

// RouterConfig holds settings for a Zoop Router gateway deployment.
type RouterConfig struct {
	Mode         RouterMode `json:"mode"`
	WANInterface string     `json:"wan_interface"`
	LANInterface string     `json:"lan_interface"`
	LANSubnet    string     `json:"lan_subnet"`
	TunnelIfName string     `json:"tunnel_if_name"`
	TableID      int        `json:"table_id"`
}

// DefaultConfig returns standard defaults for OpenWrt/Linux routers.
func DefaultConfig() RouterConfig {
	return RouterConfig{
		Mode:         ModeProvider,
		WANInterface: "eth0",
		LANInterface: "br-lan",
		LANSubnet:    "192.168.1.0/24",
		TunnelIfName: "zoop0",
		TableID:      200,
	}
}
