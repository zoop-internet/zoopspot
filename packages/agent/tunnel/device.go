package tunnel

import (
	"fmt"
	"os"

	"github.com/zoop-internet/zoop/packages/agent/tunnel/muxbind"
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
	muxBind  *muxbind.MuxBind

	// mockMode skips OS-level platform operations (ip addr/route, iptables) so
	// the manager can be exercised in unprivileged test environments.
	mockMode bool
}

// NewDeviceManager allocates a new user-space TUN device and initializes WireGuard on it.
func NewDeviceManager(ifName string, logger *device.Logger) (*DeviceManager, error) {
	if logger == nil {
		logger = device.NewLogger(device.LogLevelSilent, "")
	}

	// Allocate TUN device
	tunDev, err := tun.CreateTUN(ifName, device.DefaultMTU)
	if err != nil {
		return nil, fmt.Errorf("failed to create TUN device (do you have CAP_NET_ADMIN privileges?): %w", err)
	}

	mb := muxbind.New(conn.NewDefaultBind())

	// Initialize WireGuard device over the TUN interface using MuxBind
	wgDev := device.NewDevice(tunDev, mb, logger)

	return &DeviceManager{
		ifName:  ifName,
		tunDev:  tunDev,
		wgDev:   wgDev,
		muxBind: mb,
	}, nil
}

// NewMockDeviceManager allocates a mock user-space WireGuard device manager.
// This allows testing WireGuard crypto, STUN discovery, and socket multiplexing in unprivileged environments.
func NewMockDeviceManager(ifName string, logger *device.Logger) (*DeviceManager, error) {
	if logger == nil {
		logger = device.NewLogger(device.LogLevelSilent, "")
	}

	tunDev := newMockTUN(ifName)
	mb := muxbind.New(conn.NewDefaultBind())
	wgDev := device.NewDevice(tunDev, mb, logger)

	return &DeviceManager{
		ifName:   ifName,
		tunDev:   tunDev,
		wgDev:    wgDev,
		muxBind:  mb,
		mockMode: true,
	}, nil
}

// NewDeviceManagerWithFD initializes WireGuard over an existing TUN file descriptor (e.g., from Android VpnService).
func NewDeviceManagerWithFD(fd int, ifName string, logger *device.Logger) (*DeviceManager, error) {
	if logger == nil {
		logger = device.NewLogger(device.LogLevelSilent, "")
	}

	tunDev, err := platformCreateTUNFromFD(fd, ifName)
	if err != nil {
		return nil, fmt.Errorf("failed to create TUN device from file descriptor: %w", err)
	}

	mb := muxbind.New(conn.NewDefaultBind())
	wgDev := device.NewDevice(tunDev, mb, logger)

	return &DeviceManager{
		ifName:   ifName,
		tunDev:   tunDev,
		wgDev:    wgDev,
		muxBind:  mb,
	}, nil
}

// GetMuxBind returns the underlying MuxBind multiplexer.
func (m *DeviceManager) GetMuxBind() *muxbind.MuxBind {
	return m.muxBind
}

// AssignIP assigns an IP address to the TUN interface using OS-specific methods.
func (m *DeviceManager) AssignIP(ipAddress string) error {
	if m.mockMode {
		return nil
	}
	return platformAssignIP(m.ifName, ipAddress)
}

// EnableForwarding enables IP forwarding and NAT (MASQUERADE) on the host OS.
func (m *DeviceManager) EnableForwarding() error {
	if m.mockMode {
		return nil
	}
	return platformEnableForwarding(m.ifName)
}

// GetListenPort returns the actual UDP port the WireGuard device bound to.
func (m *DeviceManager) GetListenPort() (int, error) {
	if m.muxBind != nil && m.muxBind.Port() > 0 {
		return m.muxBind.Port(), nil
	}

	client, err := wgctrl.New()
	if err != nil {
		return 0, fmt.Errorf("failed to create wgctrl client: %w", err)
	}
	defer client.Close()

	wgdev, err := client.Device(m.ifName)
	if err != nil {
		return 0, fmt.Errorf("failed to get device info for %s: %w", m.ifName, err)
	}

	return wgdev.ListenPort, nil
}

// PublicKey returns the configured WireGuard public key.
func (m *DeviceManager) PublicKey() wgtypes.Key {
	return m.wgPubKey
}

// RotateKeyPair updates the local WireGuard device with a new private key.
func (m *DeviceManager) RotateKeyPair(newPrivKey wgtypes.Key) error {
	port, _ := m.GetListenPort()
	return m.ConfigureDevice(newPrivKey, port)
}

// DisableForwarding disables IP forwarding and tears down iptables NAT rules.
func (m *DeviceManager) DisableForwarding() error {
	if m.mockMode {
		return nil
	}
	return platformDisableForwarding(m.ifName)
}

// Close tears down the WireGuard device and the underlying TUN interface.
func (m *DeviceManager) Close() {
	_ = platformDisableForwarding(m.ifName)
	if m.wgDev != nil {
		m.wgDev.Close()
	}
	if m.tunDev != nil {
		m.tunDev.Close()
	}
}

type mockTUN struct {
	name   string
	events chan tun.Event
	closed chan struct{}
}

func newMockTUN(name string) *mockTUN {
	ev := make(chan tun.Event, 2)
	ev <- tun.EventUp
	return &mockTUN{
		name:   name,
		events: ev,
		closed: make(chan struct{}),
	}
}

func (m *mockTUN) File() *os.File { return nil }
func (m *mockTUN) Read(bufs [][]byte, sizes []int, offset int) (int, error) {
	<-m.closed
	return 0, os.ErrClosed
}
func (m *mockTUN) Write(bufs [][]byte, offset int) (int, error) {
	return len(bufs), nil
}
func (m *mockTUN) MTU() (int, error) { return 1420, nil }
func (m *mockTUN) Name() (string, error) { return m.name, nil }
func (m *mockTUN) Events() <-chan tun.Event { return m.events }
func (m *mockTUN) Close() error {
	select {
	case <-m.closed:
	default:
		close(m.closed)
	}
	return nil
}
func (m *mockTUN) BatchSize() int { return 1 }


