package tunnel

import (
	"fmt"
	"strings"

	"golang.zx2c4.com/wireguard/conn"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// DeviceManager handles the WireGuard TUN interface and OS-level IP assignment.
type DeviceManager struct {
	ifName   string
	tunDev   tun.Device
	wgDev    *device.Device
	wgPubKey wgtypes.Key
}

// NewDeviceManager allocates a new user-space TUN device and initializes WireGuard on it.
func NewDeviceManager(ifName string, logger *device.Logger) (*DeviceManager, error) {
	// Allocate TUN device
	tunDev, err := tun.CreateTUN(ifName, device.DefaultMTU)
	if err != nil {
		return nil, fmt.Errorf("failed to create TUN device: %w", err)
	}

	// Initialize WireGuard device over the TUN interface
	wgDev := device.NewDevice(tunDev, conn.NewDefaultBind(), logger)

	return &DeviceManager{
		ifName: ifName,
		tunDev: tunDev,
		wgDev:  wgDev,
	}, nil
}

// AssignIP assigns an IP address to the TUN interface using OS-specific methods.
func (m *DeviceManager) AssignIP(ipAddress string) error {
	return platformAssignIP(m.ifName, ipAddress)
}

// EnableForwarding enables IP forwarding and NAT (MASQUERADE) on the host OS.
func (m *DeviceManager) EnableForwarding() error {
	return platformEnableForwarding(m.ifName)
}

// GetListenPort returns the actual UDP port the WireGuard device bound to.
func (m *DeviceManager) GetListenPort() (int, error) {
	uapi, err := m.wgDev.IpcGet()
	if err != nil {
		return 0, fmt.Errorf("failed to get ipc info: %w", err)
	}

	lines := strings.Split(uapi, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "listen_port=") {
			portStr := strings.TrimPrefix(line, "listen_port=")
			var port int
			if _, err := fmt.Sscanf(portStr, "%d", &port); err == nil {
				return port, nil
			}
		}
	}
	
	return 0, fmt.Errorf("listen_port not found in ipc info")
}

// PublicKey returns the configured WireGuard public key.
func (m *DeviceManager) PublicKey() wgtypes.Key {
	return m.wgPubKey
}

// Close tears down the WireGuard device and the underlying TUN interface.
func (m *DeviceManager) Close() {
	if m.wgDev != nil {
		m.wgDev.Close()
	}
	if m.tunDev != nil {
		m.tunDev.Close()
	}
}

