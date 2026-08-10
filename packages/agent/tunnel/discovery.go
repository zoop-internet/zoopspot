package tunnel

import (
	"fmt"
	"net"
	"os"
	"time"

	"github.com/pion/stun/v3"
	"github.com/zoop-internet/zoop/packages/agent/tunnel/muxbind"
	"github.com/zoop-internet/zoop/packages/core/types"
	"golang.zx2c4.com/wireguard/conn"
)

// DiscoverPublicEndpoint connects to a STUN server to discover the public Server-Reflexive IP and port.
func DiscoverPublicEndpoint(localPort int) (string, int, error) {
	if val := os.Getenv("ZOOP_LOCAL_TEST"); val != "" {
		if val == "1" {
			return "127.0.0.1", localPort, nil
		}
		if ip := net.ParseIP(val); ip == nil {
			ips, err := net.LookupIP(val)
			if err == nil && len(ips) > 0 {
				return ips[0].String(), localPort, nil
			}
		}
		return val, localPort, nil
	}

	type result struct {
		ip   string
		port int
		err  error
	}
	resChan := make(chan result, 1)

	go func() {
		// 1. Resolve STUN server
		stunServerAddr, err := net.ResolveUDPAddr("udp", "stun.l.google.com:19302")
		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to resolve stun server: %w", err)}
			return
		}

		conn, err := net.DialUDP("udp", nil, stunServerAddr)
		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to dial stun server: %w", err)}
			return
		}
		defer conn.Close()

		client, err := stun.NewClient(conn)
		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to create stun client: %w", err)}
			return
		}
		defer client.Close()

		message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)

		var publicIP string
		var stunErr error
		done := make(chan bool, 1)

		err = client.Do(message, func(res stun.Event) {
			if res.Error != nil {
				stunErr = res.Error
				done <- true
				return
			}
			var xorAddr stun.XORMappedAddress
			if getErr := xorAddr.GetFrom(res.Message); getErr != nil {
				stunErr = getErr
				done <- true
				return
			}
			publicIP = xorAddr.IP.String()
			done <- true
		})

		if err != nil {
			resChan <- result{"", 0, fmt.Errorf("failed to start stun client: %w", err)}
			return
		}

		<-done
		if stunErr != nil {
			resChan <- result{"", 0, stunErr}
		} else {
			resChan <- result{publicIP, localPort, nil}
		}
	}()

	select {
	case res := <-resChan:
		return res.ip, res.port, res.err
	case <-time.After(3 * time.Second):
		return "", 0, fmt.Errorf("stun discovery timed out")
	}
}

// DiscoverPublicEndpointMux discovers the server-reflexive public IP and port via the multiplexed WireGuard socket.
func DiscoverPublicEndpointMux(mb *muxbind.MuxBind) (string, int, error) {
	if val := os.Getenv("ZOOP_LOCAL_TEST"); val != "" {
		if val == "1" {
			return "127.0.0.1", 0, nil
		}
		if ip := net.ParseIP(val); ip == nil {
			ips, err := net.LookupIP(val)
			if err == nil && len(ips) > 0 {
				return ips[0].String(), 0, nil
			}
		}
		return val, 0, nil
	}

	if mb == nil {
		return "", 0, fmt.Errorf("muxbind is nil")
	}

	stunAddr, err := net.ResolveUDPAddr("udp", "stun.l.google.com:19302")
	if err != nil {
		return "", 0, fmt.Errorf("failed to resolve stun server: %w", err)
	}

	message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)

	type resStruct struct {
		ip   string
		port int
		err  error
	}
	resChan := make(chan resStruct, 1)

	stunHandler := func(pkt []byte, ep conn.Endpoint) bool {
		if muxbind.IsSTUN(pkt) {
			m := &stun.Message{Raw: pkt}
			if err := m.Decode(); err == nil && m.TransactionID == message.TransactionID {
				var xorAddr stun.XORMappedAddress
				if getErr := xorAddr.GetFrom(m); getErr == nil {
					select {
					case resChan <- resStruct{ip: xorAddr.IP.String(), port: xorAddr.Port, err: nil}:
					default:
					}
					return true
				}
			}
		}
		return false
	}
	mb.AddHandler(stunHandler)
	defer mb.RemoveHandler(stunHandler)

	if err := mb.SendToAddr(message.Raw, stunAddr.String()); err != nil {
		return "", 0, fmt.Errorf("failed to send STUN request: %w", err)
	}

	select {
	case res := <-resChan:
		return res.ip, res.port, res.err
	case <-time.After(3 * time.Second):
		return "", 0, fmt.Errorf("stun discovery via muxbind timed out")
	}
}

// DiscoverLocalAddresses enumerates active, non-loopback local network interface IPv4 addresses.
func DiscoverLocalAddresses() ([]string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get network interfaces: %w", err)
	}

	var addresses []string
	for _, iface := range ifaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch v := addr.(type) {
			case *net.IPNet:
				ip = v.IP
			case *net.IPAddr:
				ip = v.IP
			}

			if ip == nil || ip.IsLoopback() {
				continue
			}

			if ip4 := ip.To4(); ip4 != nil {
				addresses = append(addresses, ip4.String())
			}
		}
	}

	return addresses, nil
}

// GatherCandidates collects all host (local LAN) and server-reflexive (STUN public) candidates.
func GatherCandidates(localPort int) ([]types.EndpointCandidate, error) {
	return GatherCandidatesMux(nil, localPort)
}

// GatherCandidatesMux collects candidates using the MuxBind socket if available.
func GatherCandidatesMux(mb *muxbind.MuxBind, fallbackPort int) ([]types.EndpointCandidate, error) {
	var candidates []types.EndpointCandidate

	// 1. Local Host Candidates
	localIPs, err := DiscoverLocalAddresses()
	if err == nil {
		for _, ip := range localIPs {
			candidates = append(candidates, types.EndpointCandidate{
				IP:       ip,
				Port:     fallbackPort,
				Type:     types.CandidateTypeHost,
				Priority: 100,
			})
		}
	}

	// 2. Public STUN Candidate
	var pubIP string
	var pubPort int
	if mb != nil {
		pubIP, pubPort, err = DiscoverPublicEndpointMux(mb)
	} else {
		pubIP, pubPort, err = DiscoverPublicEndpoint(fallbackPort)
	}

	if err == nil && pubIP != "" {
		if pubPort == 0 {
			pubPort = fallbackPort
		}
		duplicate := false
		for _, c := range candidates {
			if c.IP == pubIP && c.Port == pubPort {
				duplicate = true
				break
			}
		}
		if !duplicate {
			candidates = append(candidates, types.EndpointCandidate{
				IP:       pubIP,
				Port:     pubPort,
				Type:     types.CandidateTypeSrflx,
				Priority: 50,
			})
		}
	}

	if len(candidates) == 0 {
		candidates = append(candidates, types.EndpointCandidate{
			IP:       "127.0.0.1",
			Port:     fallbackPort,
			Type:     types.CandidateTypeHost,
			Priority: 10,
		})
	}

	return candidates, nil
}
