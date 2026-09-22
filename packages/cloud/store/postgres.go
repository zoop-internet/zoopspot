package store

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/url"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/allannuwamanya/zoop/packages/core/types"
)

//go:embed migrations/001_initial_schema.sql
var initialSchemaSQL string

//go:embed migrations/002_user_identity.sql
var userIdentitySQL string

//go:embed migrations/003_payments_and_wallets.sql
var paymentsAndWalletsSQL string

//go:embed migrations/004_auth_updates.sql
var authUpdatesSQL string

// CleanPostgresURL sanitizes PostgreSQL connection strings for lib/pq compatibility.
// Drivers like lib/pq do not support parameters like channel_binding, which modern
// cloud providers (e.g. Neon) append by default.
func CleanPostgresURL(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	q := u.Query()
	if q.Has("channel_binding") {
		q.Del("channel_binding")
		u.RawQuery = q.Encode()
	}
	return u.String()
}

// PostgresStore implements Store against a PostgreSQL database.
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore connects to PostgreSQL, sets connection pool parameters,
// and applies pending schema migrations.
func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	cleanedURL := CleanPostgresURL(databaseURL)
	db, err := sql.Open("postgres", cleanedURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	pingCtx, pingCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer pingCancel()

	if err := db.PingContext(pingCtx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	store := &PostgresStore{db: db}
	migrateCtx, migrateCancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer migrateCancel()

	if err := store.Migrate(migrateCtx); err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return store, nil
}

// Migrate applies the embedded schema migrations in order.
func (s *PostgresStore) Migrate(ctx context.Context) error {
	if _, err := s.db.ExecContext(ctx, initialSchemaSQL); err != nil {
		return fmt.Errorf("migration 001_initial_schema: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, userIdentitySQL); err != nil {
		return fmt.Errorf("migration 002_user_identity: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, paymentsAndWalletsSQL); err != nil {
		return fmt.Errorf("migration 003_payments_and_wallets: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, authUpdatesSQL); err != nil {
		return fmt.Errorf("migration 004_auth_updates: %w", err)
	}
	return nil
}

// Close closes the underlying database connection pool.
func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// ─── Devices ──────────────────────────────────────────────────

func (s *PostgresStore) SaveDevice(ctx context.Context, device *types.Device) error {
	query := `
		INSERT INTO devices (id, name, os, description, state, owner_id, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			os = EXCLUDED.os,
			description = EXCLUDED.description,
			state = EXCLUDED.state,
			owner_id = COALESCE(EXCLUDED.owner_id, devices.owner_id),
			updated_at = NOW();
	`
	var ownerID any
	if device.AccountID != (types.ID{}) && device.AccountID.String() != "00000000-0000-0000-0000-000000000000" {
		ownerID = device.AccountID.String()
	}
	_, err := s.db.ExecContext(ctx, query,
		device.ID.String(),
		device.Name,
		device.OS,
		device.Description,
		string(device.State),
		ownerID,
	)
	return err
}

func (s *PostgresStore) GetDevice(ctx context.Context, id types.ID) (*types.Device, error) {
	query := `SELECT id, name, os, description, state, owner_id, created_at, updated_at FROM devices WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var d types.Device
	var stateStr string
	var idStr string
	var ownerID sql.NullString
	err := row.Scan(&idStr, &d.Name, &d.OS, &d.Description, &stateStr, &ownerID, &d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	d.ID = parsedID
	d.State = types.DeviceState(stateStr)
	if ownerID.Valid && ownerID.String != "" {
		if oID, err := types.ParseID(ownerID.String); err == nil {
			d.AccountID = oID
		}
	}
	return &d, nil
}

func (s *PostgresStore) ListDevices(ctx context.Context) ([]*types.Device, error) {
	query := `SELECT id, name, os, description, state, owner_id, created_at, updated_at FROM devices ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []*types.Device
	for rows.Next() {
		var d types.Device
		var stateStr string
		var idStr string
		var ownerID sql.NullString
		if err := rows.Scan(&idStr, &d.Name, &d.OS, &d.Description, &stateStr, &ownerID, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, err
		}
		parsedID, err := types.ParseID(idStr)
		if err != nil {
			return nil, err
		}
		d.ID = parsedID
		d.State = types.DeviceState(stateStr)
		if ownerID.Valid && ownerID.String != "" {
			if oID, err := types.ParseID(ownerID.String); err == nil {
				d.AccountID = oID
			}
		}
		devices = append(devices, &d)
	}
	if devices == nil {
		devices = []*types.Device{}
	}
	return devices, nil
}

func (s *PostgresStore) DeleteDevice(ctx context.Context, id types.ID) error {
	query := `DELETE FROM devices WHERE id = $1`
	result, err := s.db.ExecContext(ctx, query, id.String())
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ─── Identities ───────────────────────────────────────────────

func (s *PostgresStore) SaveIdentity(ctx context.Context, identity *types.Identity) error {
	query := `
		INSERT INTO identities (endpoint_id, public_key, wireguard_public_key)
		VALUES ($1, $2, $3)
		ON CONFLICT (endpoint_id) DO UPDATE SET
			public_key = EXCLUDED.public_key,
			wireguard_public_key = EXCLUDED.wireguard_public_key;
	`
	_, err := s.db.ExecContext(ctx, query,
		identity.EndpointID.String(),
		identity.PublicKey,
		identity.WireGuardPublicKey,
	)
	return err
}

func (s *PostgresStore) GetIdentity(ctx context.Context, endpointID types.ID) (*types.Identity, error) {
	query := `SELECT endpoint_id, public_key, wireguard_public_key FROM identities WHERE endpoint_id = $1`
	row := s.db.QueryRowContext(ctx, query, endpointID.String())

	var ident types.Identity
	var idStr string
	err := row.Scan(&idStr, &ident.PublicKey, &ident.WireGuardPublicKey)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	ident.EndpointID = parsedID
	return &ident, nil
}

func (s *PostgresStore) GetIdentityByPublicKey(ctx context.Context, pubKey []byte) (*types.Identity, error) {
	query := `SELECT endpoint_id, public_key, wireguard_public_key FROM identities WHERE public_key = $1`
	row := s.db.QueryRowContext(ctx, query, pubKey)

	var ident types.Identity
	var idStr string
	err := row.Scan(&idStr, &ident.PublicKey, &ident.WireGuardPublicKey)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	ident.EndpointID = parsedID
	return &ident, nil
}

func (s *PostgresStore) DeleteIdentity(ctx context.Context, endpointID types.ID) error {
	query := `DELETE FROM identities WHERE endpoint_id = $1`
	result, err := s.db.ExecContext(ctx, query, endpointID.String())
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

// ─── Users ────────────────────────────────────────────────────

func (s *PostgresStore) SaveUser(ctx context.Context, account *types.Account) error {
	query := `
		INSERT INTO users (id, name, zoop_id, username, pin_hash)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''))
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			zoop_id = COALESCE(EXCLUDED.zoop_id, users.zoop_id),
			username = COALESCE(EXCLUDED.username, users.username),
			pin_hash = COALESCE(EXCLUDED.pin_hash, users.pin_hash);
	`
	_, err := s.db.ExecContext(ctx, query, account.ID.String(), account.Name, account.ZoopID, account.Username, account.PinHash)
	return err
}

func (s *PostgresStore) GetUser(ctx context.Context, id types.ID) (*types.Account, error) {
	query := `SELECT id, name, COALESCE(zoop_id, ''), COALESCE(username, ''), COALESCE(pin_hash, '') FROM users WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var u types.Account
	var idStr string
	err := row.Scan(&idStr, &u.Name, &u.ZoopID, &u.Username, &u.PinHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	u.ID = parsedID
	return &u, nil
}

func (s *PostgresStore) GetUserByZoopID(ctx context.Context, zoopID string) (*types.Account, error) {
	query := `SELECT id, name, COALESCE(zoop_id, ''), COALESCE(username, ''), COALESCE(pin_hash, '') FROM users WHERE zoop_id = $1`
	row := s.db.QueryRowContext(ctx, query, zoopID)

	var u types.Account
	var idStr string
	err := row.Scan(&idStr, &u.Name, &u.ZoopID, &u.Username, &u.PinHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	u.ID = parsedID
	return &u, nil
}

func (s *PostgresStore) GetUserByUsername(ctx context.Context, username string) (*types.Account, error) {
	query := `SELECT id, name, COALESCE(zoop_id, ''), COALESCE(username, ''), COALESCE(pin_hash, '') FROM users WHERE username = $1`
	row := s.db.QueryRowContext(ctx, query, username)

	var u types.Account
	var idStr string
	err := row.Scan(&idStr, &u.Name, &u.ZoopID, &u.Username, &u.PinHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	u.ID = parsedID
	return &u, nil
}

// ─── Organizations ────────────────────────────────────────────

func (s *PostgresStore) SaveOrganization(ctx context.Context, org *types.Organization) error {
	query := `
		INSERT INTO organizations (id, name, owner_device_id, slug, status)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			owner_device_id = EXCLUDED.owner_device_id,
			slug = EXCLUDED.slug,
			status = EXCLUDED.status;
	`
	var ownerDevice any
	if org.OwnerDevice != types.ID(uuid.Nil) {
		ownerDevice = org.OwnerDevice.String()
	}
	var slug any
	if org.Slug != "" {
		slug = org.Slug
	}
	status := org.Status
	if status == "" {
		status = "active"
	}
	_, err := s.db.ExecContext(ctx, query, org.ID.String(), org.Name, ownerDevice, slug, status)
	return err
}

func (s *PostgresStore) GetOrganization(ctx context.Context, id types.ID) (*types.Organization, error) {
	query := `SELECT id, name, owner_device_id, slug, status, created_at FROM organizations WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var o types.Organization
	var idStr string
	var ownerDevice, slug sql.NullString
	err := row.Scan(&idStr, &o.Name, &ownerDevice, &slug, &o.Status, &o.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	parsedID, err := types.ParseID(idStr)
	if err != nil {
		return nil, err
	}
	o.ID = parsedID
	if ownerDevice.Valid {
		if od, err := types.ParseID(ownerDevice.String); err == nil {
			o.OwnerDevice = od
		}
	}
	if slug.Valid {
		o.Slug = slug.String
	}
	return &o, nil
}

func (s *PostgresStore) ListOrganizations(ctx context.Context) ([]*types.Organization, error) {
	query := `SELECT id, name, owner_device_id, slug, status, created_at FROM organizations ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []*types.Organization
	for rows.Next() {
		var o types.Organization
		var idStr string
		var ownerDevice, slug sql.NullString
		if err := rows.Scan(&idStr, &o.Name, &ownerDevice, &slug, &o.Status, &o.CreatedAt); err != nil {
			return nil, err
		}
		parsedID, err := types.ParseID(idStr)
		if err != nil {
			return nil, err
		}
		o.ID = parsedID
		if ownerDevice.Valid {
			if od, err := types.ParseID(ownerDevice.String); err == nil {
				o.OwnerDevice = od
			}
		}
		if slug.Valid {
			o.Slug = slug.String
		}
		orgs = append(orgs, &o)
	}
	if orgs == nil {
		orgs = []*types.Organization{}
	}
	return orgs, nil
}

// ─── Org Members ──────────────────────────────────────────────

func (s *PostgresStore) SaveOrgMember(ctx context.Context, member *types.OrgMember) error {
	query := `
		INSERT INTO org_members (id, organization_id, device_id, name, email, role, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO UPDATE SET
			device_id = EXCLUDED.device_id,
			name = EXCLUDED.name,
			email = EXCLUDED.email,
			role = EXCLUDED.role,
			status = EXCLUDED.status;
	`
	var deviceID any
	if member.DeviceID != types.ID(uuid.Nil) {
		deviceID = member.DeviceID.String()
	}
	_, err := s.db.ExecContext(ctx, query,
		member.ID.String(),
		member.OrganizationID.String(),
		deviceID,
		member.Name,
		member.Email,
		member.Role,
		member.Status,
	)
	return err
}

func (s *PostgresStore) GetOrgMembers(ctx context.Context, orgID types.ID) ([]*types.OrgMember, error) {
	query := `SELECT id, organization_id, device_id, name, email, role, status, created_at FROM org_members WHERE organization_id = $1 ORDER BY created_at ASC`
	rows, err := s.db.QueryContext(ctx, query, orgID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*types.OrgMember
	for rows.Next() {
		var m types.OrgMember
		var idStr, orgIDStr string
		var deviceID sql.NullString
		if err := rows.Scan(&idStr, &orgIDStr, &deviceID, &m.Name, &m.Email, &m.Role, &m.Status, &m.CreatedAt); err != nil {
			return nil, err
		}
		mID, err := types.ParseID(idStr)
		if err != nil {
			return nil, err
		}
		oID, err := types.ParseID(orgIDStr)
		if err != nil {
			return nil, err
		}
		m.ID = mID
		m.OrganizationID = oID
		if deviceID.Valid {
			if dID, err := types.ParseID(deviceID.String); err == nil {
				m.DeviceID = dID
			}
		}
		members = append(members, &m)
	}
	if members == nil {
		members = []*types.OrgMember{}
	}
	return members, nil
}

// ListOrgMembersAll returns every org member across all organizations (admin use).
func (s *PostgresStore) ListOrgMembersAll(ctx context.Context) ([]*types.OrgMember, error) {
	query := `SELECT id, organization_id, device_id, name, email, role, status, created_at FROM org_members ORDER BY created_at ASC`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []*types.OrgMember
	for rows.Next() {
		var m types.OrgMember
		var idStr, orgIDStr string
		var deviceID sql.NullString
		if err := rows.Scan(&idStr, &orgIDStr, &deviceID, &m.Name, &m.Email, &m.Role, &m.Status, &m.CreatedAt); err != nil {
			return nil, err
		}
		mID, err := types.ParseID(idStr)
		if err != nil {
			return nil, err
		}
		oID, err := types.ParseID(orgIDStr)
		if err != nil {
			return nil, err
		}
		m.ID = mID
		m.OrganizationID = oID
		if deviceID.Valid {
			if dID, err := types.ParseID(deviceID.String); err == nil {
				m.DeviceID = dID
			}
		}
		members = append(members, &m)
	}
	if members == nil {
		members = []*types.OrgMember{}
	}
	return members, nil
}

// ListOrgsByDevice returns organizations the given device is a member of.
func (s *PostgresStore) ListOrgsByDevice(ctx context.Context, deviceID types.ID) ([]*types.Organization, error) {
	query := `
		SELECT o.id, o.name, o.owner_device_id, o.slug, o.status, o.created_at
		FROM organizations o
		JOIN org_members m ON m.organization_id = o.id
		WHERE m.device_id = $1
		ORDER BY o.created_at DESC
	`
	rows, err := s.db.QueryContext(ctx, query, deviceID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orgs []*types.Organization
	for rows.Next() {
		var o types.Organization
		var idStr string
		var ownerDevice, slug sql.NullString
		if err := rows.Scan(&idStr, &o.Name, &ownerDevice, &slug, &o.Status, &o.CreatedAt); err != nil {
			return nil, err
		}
		parsedID, err := types.ParseID(idStr)
		if err != nil {
			return nil, err
		}
		o.ID = parsedID
		if ownerDevice.Valid {
			if od, err := types.ParseID(ownerDevice.String); err == nil {
				o.OwnerDevice = od
			}
		}
		if slug.Valid {
			o.Slug = slug.String
		}
		orgs = append(orgs, &o)
	}
	if orgs == nil {
		orgs = []*types.Organization{}
	}
	return orgs, nil
}

// ─── Sharing Relationships ────────────────────────────────────

func (s *PostgresStore) SaveSharingRelationship(ctx context.Context, share *types.SharingRelationship) error {
	query := `
		INSERT INTO sharing_relationships (id, provider_id, recipient_id, is_active)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE SET is_active = EXCLUDED.is_active;
	`
	_, err := s.db.ExecContext(ctx, query,
		share.ID.String(),
		share.ProviderID.String(),
		share.RecipientID.String(),
		share.IsActive,
	)
	return err
}

func (s *PostgresStore) GetSharingRelationship(ctx context.Context, id types.ID) (*types.SharingRelationship, error) {
	query := `SELECT id, provider_id, recipient_id, is_active, created_at FROM sharing_relationships WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var sh types.SharingRelationship
	var idStr, provStr, recStr string
	err := row.Scan(&idStr, &provStr, &recStr, &sh.IsActive, &sh.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	pID, _ := types.ParseID(provStr)
	rID, _ := types.ParseID(recStr)
	sID, _ := types.ParseID(idStr)
	sh.ID = sID
	sh.ProviderID = pID
	sh.RecipientID = rID
	return &sh, nil
}

func (s *PostgresStore) GetSharingRelationshipByEndpoints(ctx context.Context, providerID, recipientID types.ID) (*types.SharingRelationship, error) {
	query := `SELECT id, provider_id, recipient_id, is_active, created_at FROM sharing_relationships WHERE provider_id = $1 AND recipient_id = $2 AND is_active = TRUE LIMIT 1`
	row := s.db.QueryRowContext(ctx, query, providerID.String(), recipientID.String())

	var sh types.SharingRelationship
	var idStr, provStr, recStr string
	err := row.Scan(&idStr, &provStr, &recStr, &sh.IsActive, &sh.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	pID, _ := types.ParseID(provStr)
	rID, _ := types.ParseID(recStr)
	sID, _ := types.ParseID(idStr)
	sh.ID = sID
	sh.ProviderID = pID
	sh.RecipientID = rID
	return &sh, nil
}

func (s *PostgresStore) ListShares(ctx context.Context, endpointID types.ID) ([]*types.SharingRelationship, error) {
	query := `
		SELECT id, provider_id, recipient_id, is_active, created_at
		FROM sharing_relationships
		WHERE provider_id = $1 OR recipient_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.QueryContext(ctx, query, endpointID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []*types.SharingRelationship
	for rows.Next() {
		var sh types.SharingRelationship
		var idStr, provStr, recStr string
		if err := rows.Scan(&idStr, &provStr, &recStr, &sh.IsActive, &sh.CreatedAt); err != nil {
			return nil, err
		}
		pID, _ := types.ParseID(provStr)
		rID, _ := types.ParseID(recStr)
		sID, _ := types.ParseID(idStr)
		sh.ID = sID
		sh.ProviderID = pID
		sh.RecipientID = rID
		shares = append(shares, &sh)
	}
	if shares == nil {
		shares = []*types.SharingRelationship{}
	}
	return shares, nil
}

// ListSharesAll returns every sharing relationship (admin use).
func (s *PostgresStore) ListSharesAll(ctx context.Context) ([]*types.SharingRelationship, error) {
	query := `
		SELECT id, provider_id, recipient_id, is_active, created_at
		FROM sharing_relationships
		ORDER BY created_at DESC
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []*types.SharingRelationship
	for rows.Next() {
		var sh types.SharingRelationship
		var idStr, provStr, recStr string
		if err := rows.Scan(&idStr, &provStr, &recStr, &sh.IsActive, &sh.CreatedAt); err != nil {
			return nil, err
		}
		pID, _ := types.ParseID(provStr)
		rID, _ := types.ParseID(recStr)
		sID, _ := types.ParseID(idStr)
		sh.ID = sID
		sh.ProviderID = pID
		sh.RecipientID = rID
		shares = append(shares, &sh)
	}
	if shares == nil {
		shares = []*types.SharingRelationship{}
	}
	return shares, nil
}

func (s *PostgresStore) DeleteSharingRelationship(ctx context.Context, id types.ID) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM sharing_relationships WHERE id = $1`, id.String())
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) DeleteOrgMember(ctx context.Context, orgID, memberID types.ID) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM org_members WHERE organization_id = $1 AND id = $2`, orgID.String(), memberID.String())
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ─── Connections ──────────────────────────────────────────────

func (s *PostgresStore) SaveConnection(ctx context.Context, conn *types.Connection) error {
	query := `
		INSERT INTO connections (id, provider_id, recipient_id, state, provider_ip, recipient_ip, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (id) DO UPDATE SET
			state = EXCLUDED.state,
			provider_ip = EXCLUDED.provider_ip,
			recipient_ip = EXCLUDED.recipient_ip,
			updated_at = NOW();
	`
	_, err := s.db.ExecContext(ctx, query,
		conn.ID.String(),
		conn.ProviderID.String(),
		conn.RecipientID.String(),
		string(conn.State),
		conn.ProviderIP,
		conn.RecipientIP,
	)
	return err
}

func (s *PostgresStore) GetConnection(ctx context.Context, id types.ID) (*types.Connection, error) {
	query := `SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip, created_at, updated_at FROM connections WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var c types.Connection
	var idStr, provStr, recStr, stateStr string
	var provIP, recIP sql.NullString
	err := row.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	cID, _ := types.ParseID(idStr)
	pID, _ := types.ParseID(provStr)
	rID, _ := types.ParseID(recStr)
	c.ID = cID
	c.ProviderID = pID
	c.RecipientID = rID
	c.State = types.ConnectionState(stateStr)
	if provIP.Valid {
		c.ProviderIP = provIP.String
	}
	if recIP.Valid {
		c.RecipientIP = recIP.String
	}
	return &c, nil
}

func (s *PostgresStore) GetPendingConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error) {
	query := `
		SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip, created_at, updated_at
		FROM connections
		WHERE (provider_id = $1 OR recipient_id = $1) AND state = $2
	`
	rows, err := s.db.QueryContext(ctx, query, endpointID.String(), string(types.ConnectionStateRequested))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pending []*types.Connection
	for rows.Next() {
		var c types.Connection
		var idStr, provStr, recStr, stateStr string
		var provIP, recIP sql.NullString
		if err := rows.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cID, _ := types.ParseID(idStr)
		pID, _ := types.ParseID(provStr)
		rID, _ := types.ParseID(recStr)
		c.ID = cID
		c.ProviderID = pID
		c.RecipientID = rID
		c.State = types.ConnectionState(stateStr)
		if provIP.Valid {
			c.ProviderIP = provIP.String
		}
		if recIP.Valid {
			c.RecipientIP = recIP.String
		}
		pending = append(pending, &c)
	}
	if pending == nil {
		pending = []*types.Connection{}
	}
	return pending, nil
}

func (s *PostgresStore) ListConnections(ctx context.Context, endpointID types.ID) ([]*types.Connection, error) {
	query := `
		SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip, created_at, updated_at
		FROM connections
		WHERE provider_id = $1 OR recipient_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.db.QueryContext(ctx, query, endpointID.String())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conns []*types.Connection
	for rows.Next() {
		var c types.Connection
		var idStr, provStr, recStr, stateStr string
		var provIP, recIP sql.NullString
		if err := rows.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cID, _ := types.ParseID(idStr)
		pID, _ := types.ParseID(provStr)
		rID, _ := types.ParseID(recStr)
		c.ID = cID
		c.ProviderID = pID
		c.RecipientID = rID
		c.State = types.ConnectionState(stateStr)
		if provIP.Valid {
			c.ProviderIP = provIP.String
		}
		if recIP.Valid {
			c.RecipientIP = recIP.String
		}
		conns = append(conns, &c)
	}
	if conns == nil {
		conns = []*types.Connection{}
	}
	return conns, nil
}

// ListAllConnections returns every connection across the platform (admin use).
func (s *PostgresStore) ListAllConnections(ctx context.Context) ([]*types.Connection, error) {
	query := `
		SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip, created_at, updated_at
		FROM connections
		ORDER BY created_at DESC
	`
	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conns []*types.Connection
	for rows.Next() {
		var c types.Connection
		var idStr, provStr, recStr, stateStr string
		var provIP, recIP sql.NullString
		if err := rows.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		cID, _ := types.ParseID(idStr)
		pID, _ := types.ParseID(provStr)
		rID, _ := types.ParseID(recStr)
		c.ID = cID
		c.ProviderID = pID
		c.RecipientID = rID
		c.State = types.ConnectionState(stateStr)
		if provIP.Valid {
			c.ProviderIP = provIP.String
		}
		if recIP.Valid {
			c.RecipientIP = recIP.String
		}
		conns = append(conns, &c)
	}
	if conns == nil {
		conns = []*types.Connection{}
	}
	return conns, nil
}

// ─── IPAM Pool Allocation ─────────────────────────────────────

func (s *PostgresStore) AllocateConnectionIPs(ctx context.Context) (string, string, error) {
	// Atomic increment and return counter value
	query := `
		UPDATE ipam_counter
		SET allocated_pairs = allocated_pairs + 1
		WHERE id = 1
		RETURNING allocated_pairs - 1;
	`
	var n uint32
	err := s.db.QueryRowContext(ctx, query).Scan(&n)
	if err != nil {
		return "", "", fmt.Errorf("failed to allocate IPAM pair: %w", err)
	}

	const maxPairs = 64 * 256 * 64 // 1,048,576

	if n >= maxPairs {
		return "", "", fmt.Errorf("IPAM pool exhausted (allocated %d connections)", n)
	}

	second := 64 + (n / (64 * 256))
	third := (n / 64) % 256
	fourthBase := (n % 64) * 4

	providerIP := fmt.Sprintf("100.%d.%d.%d", second, third, fourthBase+1)
	recipientIP := fmt.Sprintf("100.%d.%d.%d", second, third, fourthBase+2)

	return providerIP, recipientIP, nil
}

func (s *PostgresStore) ReleaseConnectionIPs(ctx context.Context, _, _ string) error {
	// Best-effort reclaim: decrement allocated counter (InMemory uses free list for exact reuse)
	_, err := s.db.ExecContext(ctx, `UPDATE ipam_counter SET allocated_pairs = GREATEST(0, allocated_pairs - 1) WHERE id = 1`)
	return err
}

func (s *PostgresStore) IPAMUsage(ctx context.Context) (allocated, capacity uint32, err error) {
	var allocatedPairs uint32
	err = s.db.QueryRowContext(ctx, `SELECT allocated_pairs FROM ipam_counter WHERE id = 1`).Scan(&allocatedPairs)
	if err != nil {
		return 0, 0, err
	}
	return allocatedPairs, ipamMaxPairs, nil
}

// ─── Wallets & Payments ──────────────────────────────────────────

func (s *PostgresStore) SaveWallet(ctx context.Context, wallet *types.Wallet) error {
	query := `
		INSERT INTO wallets (id, owner_id, currency, available_balance, pending_balance, total_earned, total_withdrawn, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (owner_id) DO UPDATE SET
			currency = EXCLUDED.currency,
			available_balance = EXCLUDED.available_balance,
			pending_balance = EXCLUDED.pending_balance,
			total_earned = EXCLUDED.total_earned,
			total_withdrawn = EXCLUDED.total_withdrawn,
			updated_at = NOW();
	`
	_, err := s.db.ExecContext(ctx, query,
		wallet.ID.String(),
		wallet.OwnerID.String(),
		wallet.Currency,
		wallet.AvailableBalance,
		wallet.PendingBalance,
		wallet.TotalEarned,
		wallet.TotalWithdrawn,
	)
	return err
}

func (s *PostgresStore) GetWallet(ctx context.Context, ownerID types.ID) (*types.Wallet, error) {
	query := `
		SELECT id, owner_id, currency, available_balance, pending_balance, total_earned, total_withdrawn, created_at, updated_at
		FROM wallets
		WHERE owner_id = $1;
	`
	var w types.Wallet
	var idStr, ownerStr string
	err := s.db.QueryRowContext(ctx, query, ownerID.String()).Scan(
		&idStr,
		&ownerStr,
		&w.Currency,
		&w.AvailableBalance,
		&w.PendingBalance,
		&w.TotalEarned,
		&w.TotalWithdrawn,
		&w.CreatedAt,
		&w.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return nil, err
	}
	w.ID = types.ID(id)
	w.OwnerID = ownerID
	return &w, nil
}

func (s *PostgresStore) SaveTransaction(ctx context.Context, txn *types.PaymentTransaction) error {
	metaBytes, err := json.Marshal(txn.Metadata)
	if err != nil {
		metaBytes = []byte("{}")
	}
	query := `
		INSERT INTO payment_transactions (
			id, wallet_id, owner_id, reference, gateway_reference, type, method, provider,
			amount, fee, currency, status, phone_number, checkout_url, description, metadata, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
		ON CONFLICT (id) DO UPDATE SET
			gateway_reference = EXCLUDED.gateway_reference,
			status = EXCLUDED.status,
			checkout_url = EXCLUDED.checkout_url,
			metadata = EXCLUDED.metadata,
			updated_at = NOW();
	`
	_, err = s.db.ExecContext(ctx, query,
		txn.ID.String(),
		txn.WalletID.String(),
		txn.OwnerID.String(),
		txn.Reference,
		txn.GatewayReference,
		string(txn.Type),
		string(txn.Method),
		txn.Provider,
		txn.Amount,
		txn.Fee,
		txn.Currency,
		string(txn.Status),
		txn.PhoneNumber,
		txn.CheckoutURL,
		txn.Description,
		string(metaBytes),
	)
	return err
}

func (s *PostgresStore) GetTransaction(ctx context.Context, id types.ID) (*types.PaymentTransaction, error) {
	query := `
		SELECT id, wallet_id, owner_id, reference, gateway_reference, type, method, provider,
		       amount, fee, currency, status, phone_number, checkout_url, description, metadata, created_at, updated_at
		FROM payment_transactions
		WHERE id = $1;
	`
	return s.scanTransaction(s.db.QueryRowContext(ctx, query, id.String()))
}

func (s *PostgresStore) GetTransactionByReference(ctx context.Context, ref string) (*types.PaymentTransaction, error) {
	query := `
		SELECT id, wallet_id, owner_id, reference, gateway_reference, type, method, provider,
		       amount, fee, currency, status, phone_number, checkout_url, description, metadata, created_at, updated_at
		FROM payment_transactions
		WHERE reference = $1;
	`
	return s.scanTransaction(s.db.QueryRowContext(ctx, query, ref))
}

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func (s *PostgresStore) scanTransaction(scanner rowScanner) (*types.PaymentTransaction, error) {
	var t types.PaymentTransaction
	var idStr, walletStr, ownerStr, typeStr, methodStr, statusStr string
	var metaBytes []byte

	err := scanner.Scan(
		&idStr,
		&walletStr,
		&ownerStr,
		&t.Reference,
		&t.GatewayReference,
		&typeStr,
		&methodStr,
		&t.Provider,
		&t.Amount,
		&t.Fee,
		&t.Currency,
		&statusStr,
		&t.PhoneNumber,
		&t.CheckoutURL,
		&t.Description,
		&metaBytes,
		&t.CreatedAt,
		&t.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	id, _ := uuid.Parse(idStr)
	walletID, _ := uuid.Parse(walletStr)
	ownerID, _ := uuid.Parse(ownerStr)

	t.ID = types.ID(id)
	t.WalletID = types.ID(walletID)
	t.OwnerID = types.ID(ownerID)
	t.Type = types.TransactionType(typeStr)
	t.Method = types.PaymentMethod(methodStr)
	t.Status = types.TransactionStatus(statusStr)

	if len(metaBytes) > 0 {
		_ = json.Unmarshal(metaBytes, &t.Metadata)
	}
	return &t, nil
}

func (s *PostgresStore) ListTransactions(ctx context.Context, ownerID types.ID, limit, offset int) ([]*types.PaymentTransaction, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM payment_transactions WHERE owner_id = $1;`
	if err := s.db.QueryRowContext(ctx, countQuery, ownerID.String()).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, wallet_id, owner_id, reference, gateway_reference, type, method, provider,
		       amount, fee, currency, status, phone_number, checkout_url, description, metadata, created_at, updated_at
		FROM payment_transactions
		WHERE owner_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3;
	`
	rows, err := s.db.QueryContext(ctx, query, ownerID.String(), limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var txns []*types.PaymentTransaction
	for rows.Next() {
		t, err := s.scanTransaction(rows)
		if err != nil {
			return nil, 0, err
		}
		txns = append(txns, t)
	}
	if txns == nil {
		txns = []*types.PaymentTransaction{}
	}
	return txns, total, nil
}

func (s *PostgresStore) SaveEarningRecord(ctx context.Context, earning *types.EarningRecord) error {
	query := `
		INSERT INTO earning_records (id, wallet_id, owner_id, source, session_id, bytes_relayed, rate_per_gb, amount, currency, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());
	`
	_, err := s.db.ExecContext(ctx, query,
		earning.ID.String(),
		earning.WalletID.String(),
		earning.OwnerID.String(),
		string(earning.Source),
		earning.SessionID,
		earning.BytesRelayed,
		earning.RatePerGB,
		earning.Amount,
		earning.Currency,
	)
	return err
}

func (s *PostgresStore) ListEarnings(ctx context.Context, ownerID types.ID, limit, offset int) ([]*types.EarningRecord, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM earning_records WHERE owner_id = $1;`
	if err := s.db.QueryRowContext(ctx, countQuery, ownerID.String()).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, wallet_id, owner_id, source, session_id, bytes_relayed, rate_per_gb, amount, currency, created_at
		FROM earning_records
		WHERE owner_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3;
	`
	rows, err := s.db.QueryContext(ctx, query, ownerID.String(), limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var earnings []*types.EarningRecord
	for rows.Next() {
		var e types.EarningRecord
		var idStr, walletStr, ownerStr, sourceStr string
		err := rows.Scan(
			&idStr,
			&walletStr,
			&ownerStr,
			&sourceStr,
			&e.SessionID,
			&e.BytesRelayed,
			&e.RatePerGB,
			&e.Amount,
			&e.Currency,
			&e.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		id, _ := uuid.Parse(idStr)
		walletID, _ := uuid.Parse(walletStr)
		ownerID, _ := uuid.Parse(ownerStr)
		e.ID = types.ID(id)
		e.WalletID = types.ID(walletID)
		e.OwnerID = types.ID(ownerID)
		e.Source = types.EarningSource(sourceStr)

		earnings = append(earnings, &e)
	}
	if earnings == nil {
		earnings = []*types.EarningRecord{}
	}
	return earnings, total, nil
}
