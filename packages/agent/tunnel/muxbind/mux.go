package muxbind

import (
	"encoding/binary"
	"fmt"
	"log/slog"
	"net"
	"reflect"
	"strings"
	"sync"
	"unsafe"

	"golang.zx2c4.com/wireguard/conn"
)

// PacketHandler is a function that receives intercepted UDP packets.
// Returns true if the packet was handled and should NOT be passed to WireGuard.
type PacketHandler func(packet []byte, ep conn.Endpoint) bool

// MuxBind implements conn.Bind to multiplex STUN, probing, and WireGuard traffic over a single socket.
type MuxBind struct {
	inner           conn.Bind
	actualPort      uint16
	isOpen          bool
	mu              sync.RWMutex
	handlers        []PacketHandler
	socketProtector func(fd int)
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

	m.mu.Lock()
	m.isOpen = true
	m.actualPort = actualPort
	sp := m.socketProtector
	m.mu.Unlock()

	slog.Info("MuxBind.Open completed", "port", port, "actualPort", actualPort, "hasProtector", sp != nil)
	if sp != nil {
		fds := m.GetSocketFDs()
		slog.Info("MuxBind.Open invoking protector", "fdCount", len(fds))
		for _, fd := range fds {
			sp(fd)
		}
	}

	wrappedFns := make([]conn.ReceiveFunc, len(fns))
	for i, fn := range fns {
		wrappedFns[i] = m.wrapReceive(fn)
	}

	return wrappedFns, actualPort, nil
}

// SetSocketProtector registers a callback to protect sockets created by the bind (e.g. Android VpnService.protect).
func (m *MuxBind) SetSocketProtector(sp func(fd int)) {
	m.mu.Lock()
	m.socketProtector = sp
	isOpen := m.isOpen
	m.mu.Unlock()

	slog.Info("MuxBind.SetSocketProtector called", "isOpen", isOpen, "hasProtector", sp != nil)
	if sp != nil && isOpen {
		fds := m.GetSocketFDs()
		slog.Info("MuxBind.SetSocketProtector invoking protector", "fdCount", len(fds))
		for _, fd := range fds {
			sp(fd)
		}
	}
}

// extractFDsFromBind extracts socket file descriptors from a conn.Bind implementation.
// It first attempts the conn.PeekLookAtSocketFd interface, and if unsupported (such as
// on standard Linux/Android *conn.StdNetBind), inspects the private ipv4 and ipv6 UDPConn
// fields using reflection to extract the raw syscall socket descriptors.
func extractFDsFromBind(b conn.Bind) (fd4 int, fd6 int) {
	fd4 = -1
	fd6 = -1
	if b == nil {
		return -1, -1
	}

	// 1. Check if underlying bind implements PeekLookAtSocketFd
	if peeker, ok := b.(conn.PeekLookAtSocketFd); ok {
		if f4, err := peeker.PeekLookAtSocketFd4(); err == nil && f4 >= 0 {
			fd4 = f4
		}
		if f6, err := peeker.PeekLookAtSocketFd6(); err == nil && f6 >= 0 {
			fd6 = f6
		}
		if fd4 >= 0 || fd6 >= 0 {
			return fd4, fd6
		}
	}

	// 2. Reflection fallback for *conn.StdNetBind
	defer func() {
		_ = recover()
	}()

	val := reflect.ValueOf(b)
	if val.Kind() == reflect.Pointer {
		val = val.Elem()
	}
	if val.Kind() == reflect.Struct {
		f4 := val.FieldByName("ipv4")
		if f4.IsValid() && !f4.IsNil() {
			p := unsafe.Pointer(f4.UnsafeAddr())
			actualConn := *(**net.UDPConn)(p)
			if actualConn != nil {
				if sc, err := actualConn.SyscallConn(); err == nil {
					_ = sc.Control(func(fd uintptr) {
						fd4 = int(fd)
					})
				}
			}
		}
		f6 := val.FieldByName("ipv6")
		if f6.IsValid() && !f6.IsNil() {
			p := unsafe.Pointer(f6.UnsafeAddr())
			actualConn := *(**net.UDPConn)(p)
			if actualConn != nil {
				if sc, err := actualConn.SyscallConn(); err == nil {
					_ = sc.Control(func(fd uintptr) {
						fd6 = int(fd)
					})
				}
			}
		}
	}

	return fd4, fd6
}

// GetSocketFDs returns underlying open socket file descriptors.
func (m *MuxBind) GetSocketFDs() []int {
	m.mu.RLock()
	isOpen := m.isOpen
	m.mu.RUnlock()
	if !isOpen {
		slog.Warn("MuxBind.GetSocketFDs called but bind is not open")
		return nil
	}

	defer func() {
		if r := recover(); r != nil {
			slog.Error("MuxBind.GetSocketFDs recovered panic", "recover", r)
		}
	}()

	var fds []int
	fd4, fd6 := extractFDsFromBind(m.inner)
	if fd4 >= 0 {
		slog.Info("MuxBind.GetSocketFDs got fd4", "fd", fd4)
		fds = append(fds, fd4)
	}
	if fd6 >= 0 {
		slog.Info("MuxBind.GetSocketFDs got fd6", "fd", fd6)
		fds = append(fds, fd6)
	}
	slog.Info("MuxBind.GetSocketFDs completed", "fds", fds, "innerType", fmt.Sprintf("%T", m.inner))
	return fds
}

func (m *MuxBind) PeekLookAtSocketFd4() (int, error) {
	m.mu.RLock()
	isOpen := m.isOpen
	m.mu.RUnlock()
	if !isOpen {
		return -1, fmt.Errorf("bind is not open")
	}

	defer func() {
		_ = recover()
	}()

	fd4, _ := extractFDsFromBind(m.inner)
	if fd4 >= 0 {
		return fd4, nil
	}
	return -1, fmt.Errorf("underlying bind does not have an active IPv4 socket")
}

func (m *MuxBind) PeekLookAtSocketFd6() (int, error) {
	m.mu.RLock()
	isOpen := m.isOpen
	m.mu.RUnlock()
	if !isOpen {
		return -1, fmt.Errorf("bind is not open")
	}

	defer func() {
		_ = recover()
	}()

	_, fd6 := extractFDsFromBind(m.inner)
	if fd6 >= 0 {
		return fd6, nil
	}
	return -1, fmt.Errorf("underlying bind does not have an active IPv6 socket")
}

// Port returns the actual listening UDP port of the multiplexer.
func (m *MuxBind) Port() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return int(m.actualPort)
}

// Close closes the underlying bind.
func (m *MuxBind) Close() error {
	m.mu.Lock()
	m.isOpen = false
	m.actualPort = 0
	m.mu.Unlock()
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
