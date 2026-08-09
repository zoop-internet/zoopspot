package tunnel

import (
	"fmt"

	"github.com/vishvananda/netlink"
	"golang.zx2c4.com/wireguard/conn"
	"golang.zx2c4.com/wireguard/device"
	"golang.zx2c4.com/wireguard/tun"
	"golang.zx2c4.com/wireguard/wgctrl"
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

// AssignIP assigns an IP address and brings up the TUN interface using netlink (Linux-specific for now).
func (m *DeviceManager) AssignIP(ipAddress string) error {
	link, err := netlink.LinkByName(m.ifName)
	if err != nil {
		return fmt.Errorf("failed to get link %s: %w", m.ifName, err)
	}

	addr, err := netlink.ParseAddr(ipAddress)
	if err != nil {
		return fmt.Errorf("failed to parse IP %s: %w", ipAddress, err)
	}

	if err := netlink.AddrAdd(link, addr); err != nil {
		return fmt.Errorf("failed to add address to link: %w", err)
	}

	if err := netlink.LinkSetUp(link); err != nil {
		return fmt.Errorf("failed to bring up link: %w", err)
	}

	return nil
}

// GetListenPort returns the actual UDP port the WireGuard device bound to.
func (m *DeviceManager) GetListenPort() (int, error) {
	client, err := wgctrl.New()
	if err != nil {
		return 0, fmt.Errorf("failed to open wgctrl: %w", err)
	}
	defer client.Close()

	dev, err := client.Device(m.ifName)
	if err != nil {
		return 0, fmt.Errorf("failed to get wireguard device info: %w", err)
	}
	return dev.ListenPort, nil
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
