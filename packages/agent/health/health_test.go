package health_test

import (
	"testing"

	"github.com/zoop-internet/zoop/packages/agent/health"
	"github.com/zoop-internet/zoop/packages/agent/state"
)

func TestChecker(t *testing.T) {
	sm := state.NewManager()
	checker := health.NewChecker(sm)

	if checker.IsHealthy() {
		t.Error("expected to be unhealthy in starting state")
	}

	sm.Set(state.StateRunning)
	if !checker.IsHealthy() {
		t.Error("expected to be healthy in running state")
	}

	sm.Set(state.StateError)
	if checker.IsHealthy() {
		t.Error("expected to be unhealthy in error state")
	}
}
