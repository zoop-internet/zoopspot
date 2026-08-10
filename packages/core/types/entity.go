package types

import "github.com/google/uuid"

// ID represents a unique identifier in the Zoop system.
type ID uuid.UUID

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
