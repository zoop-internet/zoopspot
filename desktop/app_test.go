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

	// Test GetPeers
	peers := app.GetPeers()
	if len(peers) == 0 {
		t.Errorf("Expected at least one peer in list")
	}

	// Test ConnectPeer
	newStatus, err := app.ConnectPeer(peers[0].ID)
	if err != nil {
		t.Fatalf("Failed to connect peer: %v", err)
	}
	if !newStatus.Connected || newStatus.State != "connected" {
		t.Errorf("Expected status to be connected, got %+v", newStatus)
	}

	// Test GetTelemetry when connected
	telemetry := app.GetTelemetry()
	if telemetry.LatencyMs == 0 && telemetry.DownloadRateKBps == 0 {
		t.Errorf("Expected positive telemetry data when connected, got %+v", telemetry)
	}

	// Test Disconnect
	discStatus, err := app.Disconnect()
	if err != nil {
		t.Fatalf("Failed to disconnect: %v", err)
	}
	if discStatus.Connected || discStatus.State != "idle" {
		t.Errorf("Expected status to be idle after disconnect, got %+v", discStatus)
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
	if len(diag.Details) == 0 {
		t.Errorf("Expected diagnostics details")
	}

	app.Shutdown(ctx)
}
