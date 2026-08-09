package types

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestDeviceJSON(t *testing.T) {
	id := ID(uuid.New())
	accId := ID(uuid.New())

	dev := Device{
		ID:          id,
		AccountID:   accId,
		Name:        "Test Device",
		OS:          "linux",
		Description: "A test device",
	}

	data, err := json.Marshal(dev)
	if err != nil {
		t.Fatalf("failed to marshal device: %v", err)
	}

	var parsed Device
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal device: %v", err)
	}

	if parsed.ID != dev.ID {
		t.Errorf("expected ID %v, got %v", dev.ID, parsed.ID)
	}
	if parsed.Name != dev.Name {
		t.Errorf("expected Name %s, got %s", dev.Name, parsed.Name)
	}
}

func TestEndpointJSON(t *testing.T) {
	id := ID(uuid.New())
	devId := ID(uuid.New())

	ep := Endpoint{
		ID:       id,
		DeviceID: devId,
	}

	data, err := json.Marshal(ep)
	if err != nil {
		t.Fatalf("failed to marshal endpoint: %v", err)
	}

	var parsed Endpoint
	if err := json.Unmarshal(data, &parsed); err != nil {
		t.Fatalf("failed to unmarshal endpoint: %v", err)
	}

	if parsed.ID != ep.ID {
		t.Errorf("expected ID %v, got %v", ep.ID, parsed.ID)
	}
}
