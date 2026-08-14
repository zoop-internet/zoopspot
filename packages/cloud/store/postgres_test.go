package store

import (
	"strings"
	"testing"
)

func TestPostgresSchema_Embedded(t *testing.T) {
	if len(initialSchemaSQL) == 0 {
		t.Fatalf("embedded schema SQL is empty")
	}

	requiredTables := []string{
		"CREATE TABLE IF NOT EXISTS devices",
		"CREATE TABLE IF NOT EXISTS identities",
		"CREATE TABLE IF NOT EXISTS users",
		"CREATE TABLE IF NOT EXISTS organizations",
		"CREATE TABLE IF NOT EXISTS org_members",
		"CREATE TABLE IF NOT EXISTS sharing_relationships",
		"CREATE TABLE IF NOT EXISTS connections",
		"CREATE TABLE IF NOT EXISTS ipam_counter",
	}

	for _, tbl := range requiredTables {
		if !strings.Contains(initialSchemaSQL, tbl) {
			t.Errorf("schema missing table statement: %s", tbl)
		}
	}
}
