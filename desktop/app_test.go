package main

import (
	"context"
	"testing"
)

func TestAppLifecycle(t *testing.T) {
	app := NewApp()
	if app == nil {
		t.Fatalf("Expected non-nil App")
	}

	ctx := context.Background()
	app.Startup(ctx)

	status := app.GetStatus()
	if status.Connected {
		t.Errorf("Expected disconnected initially")
	}
	if status.State != "idle" {
		t.Errorf("Expected initial state 'idle', got %s", status.State)
	}

	// Test GetPeers (graceful when daemon is offline)
	peers := app.GetPeers()
	t.Logf("Discovered peers: %d", len(peers))

	// Test ConnectPeer with auto-gateway or peer
	peerID := ""
	if len(peers) > 0 {
		peerID = peers[0].ID
	}
	newStatus, _ := app.ConnectPeer(peerID)
	t.Logf("Connect status: %+v", newStatus)

	// Test Telemetry
	telemetry := app.GetTelemetry()
	t.Logf("Telemetry: %+v", telemetry)

	// Test Disconnect
	discStatus, _ := app.Disconnect()
	if discStatus.Connected {
		t.Errorf("Expected disconnected after Disconnect call, got %+v", discStatus)
	}

	// Test Tray update
	if app.trayMgr != nil {
		app.trayMgr.UpdateState()
	}

	// Test Settings
	settings := app.GetSettings()
	settings.AutoConnectOnLaunch = true
	settings.KillSwitch = true
	if !app.SaveSettings(settings) {
		t.Errorf("Expected SaveSettings to return true")
	}
	updated := app.GetSettings()
	if !updated.AutoConnectOnLaunch || !updated.KillSwitch {
		t.Errorf("Expected updated settings, got %+v", updated)
	}

	// Test Diagnostics
	diag := app.RunDiagnostics()
	if len(diag.Checks) == 0 && len(diag.Details) == 0 {
		t.Errorf("Expected diagnostics output")
	}

	app.Shutdown(ctx)
}
