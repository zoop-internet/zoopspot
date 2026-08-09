package tunnel

import (
	"fmt"
	"net"
	"time"

	"golang.zx2c4.com/wireguard/wgctrl"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"
)

// ConfigureDevice sets the local private key and listen port for the WireGuard device.
func (m *DeviceManager) ConfigureDevice(privKey wgtypes.Key, listenPort int) error {
	client, err := wgctrl.New()
	if err != nil {
		return fmt.Errorf("failed to open wgctrl: %w", err)
	}
	defer client.Close()

	cfg := wgtypes.Config{
		PrivateKey: &privKey,
		ListenPort: &listenPort, // 0 for dynamic/ephemeral port
	}

	if err := client.ConfigureDevice(m.ifName, cfg); err != nil {
		return fmt.Errorf("failed to configure wireguard device: %w", err)
	}

	m.wgPubKey = privKey.PublicKey()

	return nil
}

// AddPeer adds a remote peer to the WireGuard configuration.
func (m *DeviceManager) AddPeer(peerPubKey wgtypes.Key, endpointIP string, endpointPort int, allowedIPs []string) error {
	client, err := wgctrl.New()
	if err != nil {
		return fmt.Errorf("failed to open wgctrl: %w", err)
	}
	defer client.Close()

	var parsedAllowedIPs []net.IPNet
	for _, aip := range allowedIPs {
		_, ipNet, err := net.ParseCIDR(aip)
		if err != nil {
			return fmt.Errorf("failed to parse allowed IP %s: %w", aip, err)
		}
		parsedAllowedIPs = append(parsedAllowedIPs, *ipNet)
	}

	endpointAddr := &net.UDPAddr{
		IP:   net.ParseIP(endpointIP),
		Port: endpointPort,
	}

	keepalive := 25 * time.Second

	peerCfg := wgtypes.PeerConfig{
		PublicKey:                   peerPubKey,
		Endpoint:                    endpointAddr,
		AllowedIPs:                  parsedAllowedIPs,
		PersistentKeepaliveInterval: &keepalive,
		ReplaceAllowedIPs:           true,
	}

	cfg := wgtypes.Config{
		Peers: []wgtypes.PeerConfig{peerCfg},
	}

	if err := client.ConfigureDevice(m.ifName, cfg); err != nil {
		return fmt.Errorf("failed to add peer to wireguard device: %w", err)
	}
	return nil
}

// RemovePeer removes a remote peer from the WireGuard configuration.
func (m *DeviceManager) RemovePeer(peerPubKey wgtypes.Key) error {
	client, err := wgctrl.New()
	if err != nil {
		return fmt.Errorf("failed to open wgctrl: %w", err)
	}
	defer client.Close()

	peerCfg := wgtypes.PeerConfig{
		PublicKey: peerPubKey,
		Remove:    true,
	}

	cfg := wgtypes.Config{
		Peers: []wgtypes.PeerConfig{peerCfg},
	}

	if err := client.ConfigureDevice(m.ifName, cfg); err != nil {
		return fmt.Errorf("failed to remove peer from wireguard device: %w", err)
	}
	return nil
}
