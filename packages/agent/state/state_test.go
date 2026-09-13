package state_test

import (
	"sync"
	"testing"

	"github.com/allannuwamanya/zoop/packages/agent/state"
)

func TestManager(t *testing.T) {
	m := state.NewManager()

	if m.Get() != state.StateStarting {
		t.Errorf("expected initial state %s, got %s", state.StateStarting, m.Get())
	}

	m.Set(state.StateRunning)
	if m.Get() != state.StateRunning {
		t.Errorf("expected state %s, got %s", state.StateRunning, m.Get())
	}
}

func TestManagerConcurrency(t *testing.T) {
	m := state.NewManager()
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			m.Set(state.StateRunning)
			_ = m.Get()
		}()
	}
	wg.Wait()

	if m.Get() != state.StateRunning {
		t.Errorf("expected state %s after concurrent writes", state.StateRunning)
	}
}
