package store

import (
	"context"
	"database/sql"
	_ "embed"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/google/uuid"
	"github.com/zoop-internet/zoop/packages/core/types"
)

//go:embed migrations/001_initial_schema.sql
var initialSchemaSQL string

// PostgresStore implements Store against a PostgreSQL database.
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore connects to PostgreSQL, sets connection pool parameters,
// and applies pending schema migrations.
func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	store := &PostgresStore{db: db}
	if err := store.Migrate(ctx); err != nil {
		return nil, fmt.Errorf("failed to run database migrations: %w", err)
	}

	return store, nil
}

// Migrate applies the embedded initial schema migration.
func (s *PostgresStore) Migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, initialSchemaSQL)
	return err
}

// Close closes the underlying database connection pool.
func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// ─── Devices ──────────────────────────────────────────────────

func (s *PostgresStore) SaveDevice(ctx context.Context, device *types.Device) error {
	query := `
		INSERT INTO devices (id, name, os, description, state, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			os = EXCLUDED.os,
			description = EXCLUDED.description,
			state = EXCLUDED.state,
			updated_at = NOW();
	`
	_, err := s.db.ExecContext(ctx, query,
		device.ID.String(),
		device.Name,
		device.OS,
		device.Description,
		string(device.State),
	)
	return err
}

func (s *PostgresStore) GetDevice(ctx context.Context, id types.ID) (*types.Device, error) {
	query := `SELECT id, name, os, description, state FROM devices WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var d types.Device
	var stateStr string
	var idStr string
	err := row.Scan(&idStr, &d.Name, &d.OS, &d.Description, &stateStr)
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
	return &d, nil
}

func (s *PostgresStore) ListDevices(ctx context.Context) ([]*types.Device, error) {
	query := `SELECT id, name, os, description, state FROM devices ORDER BY created_at DESC`
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
		if err := rows.Scan(&idStr, &d.Name, &d.OS, &d.Description, &stateStr); err != nil {
			return nil, err
		}
		parsedID, err := types.ParseID(idStr)
		if err != nil {
			return nil, err
		}
		d.ID = parsedID
		d.State = types.DeviceState(stateStr)
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
		INSERT INTO users (id, name)
		VALUES ($1, $2)
		ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
	`
	_, err := s.db.ExecContext(ctx, query, account.ID.String(), account.Name)
	return err
}

func (s *PostgresStore) GetUser(ctx context.Context, id types.ID) (*types.Account, error) {
	query := `SELECT id, name FROM users WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var u types.Account
	var idStr string
	err := row.Scan(&idStr, &u.Name)
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
	query := `SELECT id, name, owner_device_id, slug, status FROM organizations WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var o types.Organization
	var idStr string
	var ownerDevice, slug sql.NullString
	err := row.Scan(&idStr, &o.Name, &ownerDevice, &slug, &o.Status)
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
	query := `SELECT id, name, owner_device_id, slug, status FROM organizations ORDER BY created_at DESC`
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
		if err := rows.Scan(&idStr, &o.Name, &ownerDevice, &slug, &o.Status); err != nil {
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
	query := `SELECT id, organization_id, device_id, name, email, role, status FROM org_members WHERE organization_id = $1 ORDER BY created_at ASC`
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
		if err := rows.Scan(&idStr, &orgIDStr, &deviceID, &m.Name, &m.Email, &m.Role, &m.Status); err != nil {
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
		members = append(members, &m)
	}
	if members == nil {
		members = []*types.OrgMember{}
	}
	return members, nil
}

// ListOrgMembersAll returns every org member across all organizations (admin use).
func (s *PostgresStore) ListOrgMembersAll(ctx context.Context) ([]*types.OrgMember, error) {
	query := `SELECT id, organization_id, device_id, name, email, role, status FROM org_members ORDER BY created_at ASC`
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
		if err := rows.Scan(&idStr, &orgIDStr, &deviceID, &m.Name, &m.Email, &m.Role, &m.Status); err != nil {
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
		SELECT o.id, o.name, o.owner_device_id, o.slug, o.status
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
		if err := rows.Scan(&idStr, &o.Name, &ownerDevice, &slug, &o.Status); err != nil {
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
	query := `SELECT id, provider_id, recipient_id, is_active FROM sharing_relationships WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var sh types.SharingRelationship
	var idStr, provStr, recStr string
	err := row.Scan(&idStr, &provStr, &recStr, &sh.IsActive)
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
	query := `SELECT id, provider_id, recipient_id, is_active FROM sharing_relationships WHERE provider_id = $1 AND recipient_id = $2 AND is_active = TRUE LIMIT 1`
	row := s.db.QueryRowContext(ctx, query, providerID.String(), recipientID.String())

	var sh types.SharingRelationship
	var idStr, provStr, recStr string
	err := row.Scan(&idStr, &provStr, &recStr, &sh.IsActive)
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
		SELECT id, provider_id, recipient_id, is_active
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
		if err := rows.Scan(&idStr, &provStr, &recStr, &sh.IsActive); err != nil {
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
		SELECT id, provider_id, recipient_id, is_active
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
		if err := rows.Scan(&idStr, &provStr, &recStr, &sh.IsActive); err != nil {
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
	query := `SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip FROM connections WHERE id = $1`
	row := s.db.QueryRowContext(ctx, query, id.String())

	var c types.Connection
	var idStr, provStr, recStr, stateStr string
	var provIP, recIP sql.NullString
	err := row.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP)
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
		SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip
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
		if err := rows.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP); err != nil {
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
		SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip
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
		if err := rows.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP); err != nil {
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
		SELECT id, provider_id, recipient_id, state, provider_ip, recipient_ip
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
		if err := rows.Scan(&idStr, &provStr, &recStr, &stateStr, &provIP, &recIP); err != nil {
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
