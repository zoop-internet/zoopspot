package network

// PathType indicates the nature of the network route.
type PathType string

const (
	PathTypeDirect PathType = "DIRECT"
	PathTypeRelay  PathType = "RELAY"
)

// Interface represents a network interface on a device (e.g., Wi-Fi, Cellular).
type Interface struct {
	Name    string
	Address string
	IsUp    bool
}

// Path represents a network route used to transport traffic between endpoints.
type Path struct {
	Type       PathType
	LocalAddr  string
	RemoteAddr string
}

// Tunnel represents the secure Data Plane transport between endpoints.
type Tunnel interface {
	Connect(path Path) error
	Close() error
	IsActive() bool
}
