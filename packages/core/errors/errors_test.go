package errors

import (
	"errors"
	"testing"
)

func TestSentinelErrors(t *testing.T) {
	tests := []struct {
		err         error
		expectedMsg string
	}{
		{ErrDeviceNotFound, "device not found"},
		{ErrEndpointNotFound, "endpoint not found"},
		{ErrUnauthorized, "unauthorized action"},
		{ErrConnectionFailed, "connection failed"},
		{ErrInvalidState, "invalid connection state"},
		{ErrTunnelUnavailable, "tunnel unavailable"},
	}

	for _, tt := range tests {
		if tt.err == nil {
			t.Errorf("Expected non-nil error")
		}
		if tt.err.Error() != tt.expectedMsg {
			t.Errorf("Expected error message %q, got %q", tt.expectedMsg, tt.err.Error())
		}
		if !errors.Is(tt.err, tt.err) {
			t.Errorf("Expected errors.Is to match sentinel error %v", tt.err)
		}
	}
}
