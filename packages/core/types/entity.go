package types

import (
	"encoding/json"

	"github.com/google/uuid"
)

// ID represents a unique identifier in the Zoop system.
type ID uuid.UUID

// MarshalJSON serializes the ID as a UUID string.
func (id ID) MarshalJSON() ([]byte, error) {
	return json.Marshal(uuid.UUID(id).String())
}

// UnmarshalJSON parses a UUID string into an ID.
func (id *ID) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	u, err := uuid.Parse(s)
	if err != nil {
		return err
	}
	*id = ID(u)
	return nil
}

// Account represents the identity and ownership context of a Zoop participant.
type Account struct {
	ID   ID     `json:"id"`
	Name string `json:"name"`
}

// Organization represents a group that manages participants, devices, networks, or policies.
type Organization struct {
	ID   ID     `json:"id"`
	Name string `json:"name"`
}

// OrgMember represents a member of an Organization.
type OrgMember struct {
	ID             ID     `json:"id"`
	OrganizationID ID     `json:"organization_id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Role           string `json:"role"`
	Status         string `json:"status"`
}

// NewID generates a new random ID.
func NewID() ID {
	return ID(uuid.New())
}

// String returns the string representation of the ID.
func (id ID) String() string {
	return uuid.UUID(id).String()
}

// ParseID parses a string into an ID.
func ParseID(s string) (ID, error) {
	u, err := uuid.Parse(s)
	return ID(u), err
}
