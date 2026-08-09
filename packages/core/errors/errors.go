package errors

import "errors"

var (
	ErrDeviceNotFound    = errors.New("device not found")
	ErrEndpointNotFound  = errors.New("endpoint not found")
	ErrUnauthorized      = errors.New("unauthorized action")
	ErrConnectionFailed  = errors.New("connection failed")
	ErrInvalidState      = errors.New("invalid connection state")
	ErrTunnelUnavailable = errors.New("tunnel unavailable")
)
