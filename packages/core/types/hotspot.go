package types

import "time"

// HotspotRouterType defines the supported router operating system.
type HotspotRouterType string

const (
	RouterMikroTik HotspotRouterType = "mikrotik"
	RouterOpenWrt  HotspotRouterType = "openwrt"
	RouterLinux    HotspotRouterType = "linux"
)

// Hotspot represents a physical Wi-Fi venue / router gateway managed by ZoopSpot.
type Hotspot struct {
	ID                ID                `json:"id"`
	OwnerID           ID                `json:"owner_id"`
	Name              string            `json:"name"`
	Slug              string            `json:"slug"`
	Location          string            `json:"location"`
	RouterType        HotspotRouterType `json:"router_type"`
	RouterIP          string            `json:"router_ip"` // WireGuard overlay IP (100.64.x.x)
	RouterAPIUser     string            `json:"router_api_user"`
	RouterAPIPassword string            `json:"router_api_password,omitempty"`
	WireGuardPubKey   string            `json:"wireguard_pubkey"`
	Currency          string            `json:"currency"`
	IsOnline          bool              `json:"is_online"`
	LastHeartbeat     *time.Time        `json:"last_heartbeat,omitempty"`
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}

// HotspotPackage defines a purchasable Wi-Fi access tier with duration and bandwidth limits.
type HotspotPackage struct {
	ID                ID        `json:"id"`
	HotspotID         ID        `json:"hotspot_id"`
	Name              string    `json:"name"`
	Price             float64   `json:"price"` // In UGX (e.g. 500, 1000, 2000)
	DurationMinutes   int       `json:"duration_minutes"`
	DataLimitBytes    uint64    `json:"data_limit_bytes"` // 0 = unlimited
	RateLimitDownKbps int       `json:"rate_limit_down_kbps"`
	RateLimitUpKbps   int       `json:"rate_limit_up_kbps"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
}

// SessionStatus tracks the life of a customer's captive portal connection.
type SessionStatus string

const (
	SessionPending    SessionStatus = "pending"
	SessionActive     SessionStatus = "active"
	SessionExpired    SessionStatus = "expired"
	SessionTerminated SessionStatus = "terminated"
)

// HotspotSession represents an authenticated customer Wi-Fi session on a router.
type HotspotSession struct {
	ID              ID            `json:"id"`
	HotspotID       ID            `json:"hotspot_id"`
	PackageID       *ID           `json:"package_id,omitempty"`
	PhoneNumber     string        `json:"phone_number,omitempty"`
	MACAddress      string        `json:"mac_address"`
	ClientIP        string        `json:"client_ip"`
	Status          SessionStatus `json:"status"`
	TransactionID   *ID           `json:"transaction_id,omitempty"`
	VoucherCode     string        `json:"voucher_code,omitempty"`
	BytesDownloaded uint64        `json:"bytes_downloaded"`
	BytesUploaded   uint64        `json:"bytes_uploaded"`
	StartedAt       *time.Time    `json:"started_at,omitempty"`
	ExpiresAt       *time.Time    `json:"expires_at,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
}

// HotspotVoucher represents an offline prepaid voucher code for cash sales.
type HotspotVoucher struct {
	ID           ID         `json:"id"`
	HotspotID    ID         `json:"hotspot_id"`
	PackageID    ID         `json:"package_id"`
	Code         string     `json:"code"`
	BatchTag     string     `json:"batch_tag"`
	IsClaimed    bool       `json:"is_claimed"`
	ClaimedByMAC string     `json:"claimed_by_mac,omitempty"`
	ClaimedAt    *time.Time `json:"claimed_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// HotspotStats aggregates operational and revenue metrics for a hotspot site.
type HotspotStats struct {
	HotspotID       ID      `json:"hotspot_id"`
	ActiveSessions  int     `json:"active_sessions"`
	TotalSessions   int     `json:"total_sessions"`
	RevenueTodayUGX float64 `json:"revenue_today_ugx"`
	TotalRevenueUGX float64 `json:"total_revenue_ugx"`
	BytesToday      uint64  `json:"bytes_today"`
	TotalVouchers   int     `json:"total_vouchers"`
	ClaimedVouchers int     `json:"claimed_vouchers"`
	TotalBytesDown  uint64  `json:"total_bytes_down"`
	TotalBytesUp    uint64  `json:"total_bytes_up"`
}

