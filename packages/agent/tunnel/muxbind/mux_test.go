package muxbind_test

import (
	"fmt"
	"testing"
	"time"

	"github.com/allannuwamanya/zoop/packages/agent/tunnel/muxbind"
	"golang.zx2c4.com/wireguard/conn"
)

func TestMuxBind_Intercept(t *testing.T) {
	mb := muxbind.New(conn.NewDefaultBind())

	intercepted := make(chan string, 5)
	mb.SetHandler(func(pkt []byte, ep conn.Endpoint) bool {
		str := string(pkt)
		if muxbind.IsZoopProbe(pkt) {
			intercepted <- str
			return true
		}
		return false
	})

	fns, port, err := mb.Open(0)
	if err != nil {
		t.Fatalf("failed to open MuxBind: %v", err)
	}
	defer mb.Close()

	if port == 0 {
		t.Fatalf("expected non-zero port")
	}

	// Create a sender client
	senderBind := conn.NewDefaultBind()
	_, sPort, err := senderBind.Open(0)
	if err != nil {
		t.Fatalf("failed to open sender: %v", err)
	}
	defer senderBind.Close()

	_ = sPort

	ep, err := senderBind.ParseEndpoint(tAddr(port))
	if err != nil {
		t.Fatalf("failed to parse ep: %v", err)
	}

	// Send probe
	probeMsg := []byte("ZOOP_PING:test1234")
	if err := senderBind.Send([][]byte{probeMsg}, ep); err != nil {
		t.Fatalf("failed to send probe: %v", err)
	}

	// Run receive in background for all fns
	batchSize := mb.BatchSize()
	for _, fn := range fns {
		receiveFn := fn
		go func() {
			bufs := make([][]byte, batchSize)
			for i := range bufs {
				bufs[i] = make([]byte, 1500)
			}
			sizes := make([]int, batchSize)
			eps := make([]conn.Endpoint, batchSize)

			_, _ = receiveFn(bufs, sizes, eps)
		}()
	}

	select {
	case msg := <-intercepted:
		if msg != "ZOOP_PING:test1234" {
			t.Errorf("expected ZOOP_PING:test1234, got %s", msg)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timed out waiting for probe packet interception")
	}
}

func tAddr(port uint16) string {
	return fmt.Sprintf("127.0.0.1:%d", port)
}

func TestMuxBind_SocketProtectionBeforeOpen(t *testing.T) {
	mb := muxbind.New(conn.NewDefaultBind())

	// Calling SetSocketProtector before Open must NOT panic even if the inner bind has nil sockets
	protectedFDs := []int{}
	mb.SetSocketProtector(func(fd int) {
		protectedFDs = append(protectedFDs, fd)
	})

	// GetSocketFDs should return nil and not panic
	fds := mb.GetSocketFDs()
	if len(fds) != 0 {
		t.Fatalf("expected 0 fds before open, got %d", len(fds))
	}

	// Now open the bind
	_, port, err := mb.Open(0)
	if err != nil {
		t.Fatalf("failed to open bind: %v", err)
	}
	defer mb.Close()

	if port == 0 {
		t.Fatalf("expected non-zero port")
	}

	// After open, socket protector callback should have fired or GetSocketFDs should be accessible
	openFDs := mb.GetSocketFDs()
	t.Logf("Open sockets discovered: %v (protected count: %d)", openFDs, len(protectedFDs))
	if len(openFDs) == 0 {
		t.Fatalf("expected at least 1 open socket FD from StdNetBind")
	}
	if len(protectedFDs) == 0 {
		t.Fatalf("expected socket protector to be invoked with at least 1 FD")
	}
}

