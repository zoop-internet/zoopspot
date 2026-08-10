package muxbind

import (
	"encoding/binary"
	"fmt"
	"strings"
	"sync"

	"golang.zx2c4.com/wireguard/conn"
)

// PacketHandler is a function that receives intercepted UDP packets.
// Returns true if the packet was handled and should NOT be passed to WireGuard.
type PacketHandler func(packet []byte, ep conn.Endpoint) bool

// MuxBind implements conn.Bind to multiplex STUN, probing, and WireGuard traffic over a single socket.
type MuxBind struct {
	inner    conn.Bind
	mu       sync.RWMutex
	handlers []PacketHandler
}

// New creates a new MuxBind wrapping an underlying conn.Bind.
func New(inner conn.Bind) *MuxBind {
	if inner == nil {
		inner = conn.NewDefaultBind()
	}
	mb := &MuxBind{
		inner: inner,
	}

	// Register default auto-reply handler for ZOOP_PING probes
	mb.AddHandler(func(packet []byte, ep conn.Endpoint) bool {
		msg := string(packet)
		if strings.HasPrefix(msg, "ZOOP_PING:") {
			reqID := strings.TrimPrefix(msg, "ZOOP_PING:")
			replyMsg := []byte("ZOOP_PONG:" + reqID)
			_ = mb.SendTo(replyMsg, ep)
			return true
		}
		return false
	})

	return mb
}

// AddHandler appends a custom packet handler callback.
func (m *MuxBind) AddHandler(h PacketHandler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handlers = append(m.handlers, h)
}

// RemoveHandler removes a previously added handler.
func (m *MuxBind) RemoveHandler(h PacketHandler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var updated []PacketHandler
	for _, existing := range m.handlers {
		if fmt.Sprintf("%p", existing) != fmt.Sprintf("%p", h) {
			updated = append(updated, existing)
		}
	}
	m.handlers = updated
}

// SetHandler replaces all handlers with a single handler.
func (m *MuxBind) SetHandler(h PacketHandler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if h == nil {
		m.handlers = nil
	} else {
		m.handlers = []PacketHandler{h}
	}
}

// Open opens the underlying bind and wraps the receive functions.
func (m *MuxBind) Open(port uint16) ([]conn.ReceiveFunc, uint16, error) {
	fns, actualPort, err := m.inner.Open(port)
	if err != nil {
		return nil, 0, err
	}

	wrappedFns := make([]conn.ReceiveFunc, len(fns))
	for i, fn := range fns {
		wrappedFns[i] = m.wrapReceive(fn)
	}

	return wrappedFns, actualPort, nil
}

// Close closes the underlying bind.
func (m *MuxBind) Close() error {
	return m.inner.Close()
}

// SetMark sets the mark on the underlying bind.
func (m *MuxBind) SetMark(mark uint32) error {
	return m.inner.SetMark(mark)
}

// Send writes packets to the endpoint via the underlying bind.
func (m *MuxBind) Send(bufs [][]byte, ep conn.Endpoint) error {
	return m.inner.Send(bufs, ep)
}

// SendTo sends a single custom buffer to an endpoint.
func (m *MuxBind) SendTo(buf []byte, ep conn.Endpoint) error {
	bufs := [][]byte{buf}
	return m.inner.Send(bufs, ep)
}

// SendToAddr sends a single custom buffer to a string address ("ip:port").
func (m *MuxBind) SendToAddr(buf []byte, addrStr string) error {
	ep, err := m.inner.ParseEndpoint(addrStr)
	if err != nil {
		return fmt.Errorf("failed to parse endpoint %s: %w", addrStr, err)
	}
	return m.SendTo(buf, ep)
}

// ParseEndpoint parses an endpoint string via the underlying bind.
func (m *MuxBind) ParseEndpoint(s string) (conn.Endpoint, error) {
	return m.inner.ParseEndpoint(s)
}

// BatchSize returns the batch size of the underlying bind.
func (m *MuxBind) BatchSize() int {
	return m.inner.BatchSize()
}

func (m *MuxBind) wrapReceive(innerFn conn.ReceiveFunc) conn.ReceiveFunc {
	return func(packets [][]byte, sizes []int, eps []conn.Endpoint) (int, error) {
		for {
			n, err := innerFn(packets, sizes, eps)
			if err != nil || n == 0 {
				return n, err
			}

			m.mu.RLock()
			handlers := make([]PacketHandler, len(m.handlers))
			copy(handlers, m.handlers)
			m.mu.RUnlock()

			filteredN := 0
			for i := 0; i < n; i++ {
				pkt := packets[i][:sizes[i]]

				handled := false
				for hIdx := len(handlers) - 1; hIdx >= 0; hIdx-- {
					if handlers[hIdx](pkt, eps[i]) {
						handled = true
						break
					}
				}

				if handled {
					continue
				}

				// WireGuard packet: retain
				if filteredN != i {
					packets[filteredN] = packets[i]
					sizes[filteredN] = sizes[i]
					eps[filteredN] = eps[i]
				}
				filteredN++
			}

			if filteredN > 0 {
				return filteredN, nil
			}
			// If all received packets in this batch were intercepted, loop to read next batch
		}
	}
}

// IsSTUN returns true if the packet appears to be a STUN message.
func IsSTUN(pkt []byte) bool {
	if len(pkt) < 20 {
		return false
	}
	cookie := binary.BigEndian.Uint32(pkt[4:8])
	return cookie == 0x2112A442
}

// IsZoopProbe returns true if the packet is a ZOOP_PING or ZOOP_PONG probe.
func IsZoopProbe(pkt []byte) bool {
	str := string(pkt)
	return strings.HasPrefix(str, "ZOOP_PING:") || strings.HasPrefix(str, "ZOOP_PONG:")
}
