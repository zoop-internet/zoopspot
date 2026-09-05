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

	if len(userIdentitySQL) == 0 {
		t.Fatalf("embedded user identity SQL is empty")
	}
	if !strings.Contains(userIdentitySQL, "zoop_id") || !strings.Contains(userIdentitySQL, "username") {
		t.Errorf("user identity SQL missing zoop_id or username column definitions")
	}
}

func TestCleanPostgresURL(t *testing.T) {
	neonURL := "postgresql://neondb_owner:npg_1IzjiMtqr7CS@ep-icy-sun-b1yw1ua6-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
	cleaned := CleanPostgresURL(neonURL)

	if strings.Contains(cleaned, "channel_binding") {
		t.Errorf("CleanPostgresURL failed to strip channel_binding, got %s", cleaned)
	}
	if !strings.Contains(cleaned, "sslmode=require") {
		t.Errorf("CleanPostgresURL lost sslmode=require, got %s", cleaned)
	}
	if !strings.Contains(cleaned, "ep-icy-sun-b1yw1ua6-pooler") {
		t.Errorf("CleanPostgresURL lost hostname, got %s", cleaned)
	}

	// Normal URL without channel_binding should remain unchanged
	standardURL := "postgres://user:pass@localhost:5432/db?sslmode=disable"
	if CleanPostgresURL(standardURL) != standardURL {
		t.Errorf("CleanPostgresURL altered standard URL unexpectedly")
	}
}
