package tunnel

import (
	"fmt"
	"net"
	"os"
	"time"

	"github.com/pion/stun/v3"
	"github.com/zoop-internet/zoop/packages/core/types"
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

// DiscoverLocalAddresses enumerates active, non-loopback local network interface IPv4 addresses.
func DiscoverLocalAddresses() ([]string, error) {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get network interfaces: %w", err)
	}

	var addresses []string
	for _, iface := range ifaces {
		// Ignore interfaces that are down or loopback
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

			// For now, prioritize IPv4 addresses
			if ip4 := ip.To4(); ip4 != nil {
				addresses = append(addresses, ip4.String())
			}
		}
	}

	return addresses, nil
}

// GatherCandidates collects all host (local LAN) and server-reflexive (STUN public) candidates.
func GatherCandidates(localPort int) ([]types.EndpointCandidate, error) {
	var candidates []types.EndpointCandidate

	// 1. Gather Local Host Candidates
	localIPs, err := DiscoverLocalAddresses()
	if err == nil {
		for _, ip := range localIPs {
			candidates = append(candidates, types.EndpointCandidate{
				IP:       ip,
				Port:     localPort,
				Type:     types.CandidateTypeHost,
				Priority: 100,
			})
		}
	}

	// 2. Gather Public STUN Candidate
	pubIP, pubPort, err := DiscoverPublicEndpoint(localPort)
	if err == nil && pubIP != "" {
		// Avoid duplicate if STUN returned local IP (e.g. in test env)
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

	// Fallback if no candidates were found at all
	if len(candidates) == 0 {
		candidates = append(candidates, types.EndpointCandidate{
			IP:       "127.0.0.1",
			Port:     localPort,
			Type:     types.CandidateTypeHost,
			Priority: 10,
		})
	}

	return candidates, nil
}
