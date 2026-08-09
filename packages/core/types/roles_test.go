package types

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestRolesJSON(t *testing.T) {
	id := ID(uuid.New())

	prov := Provider{EndpointID: id}
	data, err := json.Marshal(prov)
	if err != nil {
		t.Fatalf("failed to marshal provider: %v", err)
	}

	var parsedProv Provider
	if err := json.Unmarshal(data, &parsedProv); err != nil {
		t.Fatalf("failed to unmarshal provider: %v", err)
	}
	if parsedProv.EndpointID != prov.EndpointID {
		t.Errorf("expected %v, got %v", prov.EndpointID, parsedProv.EndpointID)
	}

	rec := Recipient{EndpointID: id}
	data2, err := json.Marshal(rec)
	if err != nil {
		t.Fatalf("failed to marshal recipient: %v", err)
	}

	var parsedRec Recipient
	if err := json.Unmarshal(data2, &parsedRec); err != nil {
		t.Fatalf("failed to unmarshal recipient: %v", err)
	}
	if parsedRec.EndpointID != rec.EndpointID {
		t.Errorf("expected %v, got %v", rec.EndpointID, parsedRec.EndpointID)
	}
}
