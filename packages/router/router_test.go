package router

import (
	"log/slog"
	"os"
	"testing"
)

func TestRouterGatewayAndDiagnostics(t *testing.T) {
	cfg := DefaultConfig()
	if cfg.Mode != ModeProvider {
		t.Errorf("expected default mode provider, got %s", cfg.Mode)
	}

	diag := RunDiagnostics(cfg)
	if !diag.LANInterfaceOK {
		t.Errorf("expected LAN interface check OK")
	}

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	gw := NewGatewayManager(cfg, logger)

	if err := gw.EnableProviderNAT(); err != nil {
		t.Errorf("EnableProviderNAT returned error: %v", err)
	}

	cfgRecipient := cfg
	cfgRecipient.Mode = ModeRecipient
	gwRec := NewGatewayManager(cfgRecipient, logger)

	if err := gwRec.EnableRecipientRouting("100.64.0.1"); err != nil {
		t.Errorf("EnableRecipientRouting returned error: %v", err)
	}

	if err := gw.Teardown(); err != nil {
		t.Errorf("Teardown returned error: %v", err)
	}
	if err := gwRec.Teardown(); err != nil {
		t.Errorf("Teardown returned error: %v", err)
	}
}
