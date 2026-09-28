package tunnel

import (
	"context"
	"fmt"
	"net"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/zoop-internet/zoopspot/packages/agent/tunnel/muxbind"
	"github.com/zoop-internet/zoopspot/packages/core/types"
	"golang.zx2c4.com/wireguard/conn"
)

// ProbeServer listens for UDP candidate probes and replies to ping requests.
type ProbeServer struct {
	conn   *net.UDPConn
	stopCh chan struct{}
}

// StartProbeServer starts a UDP probe listener on the given port.
func StartProbeServer(port int) (*ProbeServer, error) {
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", port))
	if err != nil {
		return nil, fmt.Errorf("failed to resolve probe UDP addr: %w", err)
	}
	conn, err := net.ListenUDP("udp", addr)
	if err != nil {
		return nil, fmt.Errorf("failed to listen on probe UDP port: %w", err)
	}

	ps := &ProbeServer{
		conn:   conn,
		stopCh: make(chan struct{}),
	}

	go ps.listen()
	return ps, nil
}

func (ps *ProbeServer) listen() {
	buf := make([]byte, 1024)
	for {
		select {
		case <-ps.stopCh:
			return
		default:
		}

		_ = ps.conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
		n, remoteAddr, err := ps.conn.ReadFromUDP(buf)
		if err != nil {
			continue
		}

		msg := string(buf[:n])
		if strings.HasPrefix(msg, "ZOOP_PING:") {
			connID := strings.TrimPrefix(msg, "ZOOP_PING:")
			reply := "ZOOP_PONG:" + connID
			_, _ = ps.conn.WriteToUDP([]byte(reply), remoteAddr)
		}
	}
}

// Close stops the probe server listener.
func (ps *ProbeServer) Close() {
	close(ps.stopCh)
	if ps.conn != nil {
		ps.conn.Close()
	}
}

// CandidateResult represents a probe attempt result for a specific candidate.
type CandidateResult struct {
	Candidate types.EndpointCandidate
	RTT       time.Duration
	Err       error
}

// ProbeCandidates sends UDP ping probes to all given candidates using a standard UDP socket.
func ProbeCandidates(ctx context.Context, candidates []types.EndpointCandidate, connID string, defaultProbePort int) (*types.EndpointCandidate, error) {
	return ProbeCandidatesMux(ctx, nil, candidates, connID, defaultProbePort)
}

// ProbeCandidatesMux sends UDP ping probes using the MuxBind socket if available.
func ProbeCandidatesMux(ctx context.Context, mb *muxbind.MuxBind, candidates []types.EndpointCandidate, connID string, defaultProbePort int) (*types.EndpointCandidate, error) {
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no candidates provided for probing")
	}

	if mb == nil {
		// Fallback to standalone UDP probing
		return fallbackProbe(ctx, candidates, connID, defaultProbePort)
	}

	var mu sync.Mutex
	var working []CandidateResult
	var wg sync.WaitGroup

	pongChan := make(chan string, len(candidates)*2)

	pongHandler := func(pkt []byte, ep conn.Endpoint) bool {
		msg := string(pkt)
		if strings.HasPrefix(msg, "ZOOP_PONG:") {
			reqID := strings.TrimPrefix(msg, "ZOOP_PONG:")
			if reqID == connID {
				select {
				case pongChan <- ep.DstToString():
				default:
				}
				return true
			}
		}
		return false
	}
	mb.AddHandler(pongHandler)
	defer mb.RemoveHandler(pongHandler)

	pingMsg := []byte("ZOOP_PING:" + connID)

	for _, cand := range candidates {
		wg.Add(1)
		go func(c types.EndpointCandidate) {
			defer wg.Done()

			targetPort := c.Port
			if targetPort == 0 {
				targetPort = defaultProbePort
			}

			addrStr := fmt.Sprintf("%s:%d", c.IP, targetPort)
			start := time.Now()

			// Send up to 3 pings spaced 100ms apart for UDP reliability
			for i := 0; i < 3; i++ {
				_ = mb.SendToAddr(pingMsg, addrStr)
				time.Sleep(100 * time.Millisecond)
			}

			// Check if pong arrived within 1.5s
			timeout := time.After(1500 * time.Millisecond)
			for {
				select {
				case pongAddr := <-pongChan:
					if strings.Contains(pongAddr, c.IP) || pongAddr == addrStr {
						rtt := time.Since(start)
						mu.Lock()
						working = append(working, CandidateResult{
							Candidate: c,
							RTT:       rtt,
						})
						mu.Unlock()
						return
					}
				case <-timeout:
					return
				}
			}
		}(cand)
	}

	wg.Wait()

	if len(working) == 0 {
		return nil, fmt.Errorf("no candidate responded to UDP connectivity checks via MuxBind")
	}

	sort.Slice(working, func(i, j int) bool {
		if working[i].Candidate.Priority != working[j].Candidate.Priority {
			return working[i].Candidate.Priority > working[j].Candidate.Priority
		}
		return working[i].RTT < working[j].RTT
	})

	return &working[0].Candidate, nil
}

func fallbackProbe(ctx context.Context, candidates []types.EndpointCandidate, connID string, defaultProbePort int) (*types.EndpointCandidate, error) {
	var mu sync.Mutex
	var working []CandidateResult
	var wg sync.WaitGroup

	pingMsg := []byte("ZOOP_PING:" + connID)

	for _, cand := range candidates {
		wg.Add(1)
		go func(c types.EndpointCandidate) {
			defer wg.Done()

			targetPort := c.Port
			if targetPort == 0 {
				targetPort = defaultProbePort
			}

			raddr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", c.IP, targetPort))
			if err != nil {
				return
			}

			conn, err := net.ListenUDP("udp", nil)
			if err != nil {
				return
			}
			defer conn.Close()

			start := time.Now()
			_, err = conn.WriteToUDP(pingMsg, raddr)
			if err != nil {
				return
			}

			buf := make([]byte, 1024)
			_ = conn.SetReadDeadline(time.Now().Add(1500 * time.Millisecond))
			n, _, err := conn.ReadFromUDP(buf)
			if err != nil {
				return
			}
			if string(buf[:n]) == "ZOOP_PONG:"+connID {
				rtt := time.Since(start)
				mu.Lock()
				working = append(working, CandidateResult{
					Candidate: c,
					RTT:       rtt,
				})
				mu.Unlock()
			}
		}(cand)
	}

	wg.Wait()

	if len(working) == 0 {
		return nil, fmt.Errorf("no candidate responded to UDP connectivity checks")
	}

	sort.Slice(working, func(i, j int) bool {
		if working[i].Candidate.Priority != working[j].Candidate.Priority {
			return working[i].Candidate.Priority > working[j].Candidate.Priority
		}
		return working[i].RTT < working[j].RTT
	})

	return &working[0].Candidate, nil
}
