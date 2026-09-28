# Zoop API

## 1. Purpose

The Zoop API is the Control Plane interface used to manage identities, devices, organizations, sharing relationships, authorization, discovery, signaling, and connection state.

The API coordinates Zoop endpoints.

It does **not** carry user Internet traffic.

```text
                    ZOOP
                      │
          ┌───────────┴───────────┐
          │                       │
     CONTROL PLANE            DATA PLANE
          │                       │
       Go API                 WireGuard
          │                       │
    Coordination            User Traffic
```

---

# 2. Technology

The Zoop API uses:

| Component              | Technology                |
| ---------------------- | ------------------------- |
| Backend                | Go                        |
| API                    | HTTP/REST                 |
| Data format            | JSON                      |
| Secure transport       | HTTPS/TLS                 |
| Persistent data        | PostgreSQL                |
| Ephemeral coordination | Redis                     |
| Real-time signaling    | WebSocket                 |
| Authentication         | Zoop device/user identity |
| Data Plane             | WireGuard                 |

The API is part of the Go-based Zoop Control Plane.

---

# 3. API Responsibilities

The API provides the Control Plane operations required by Zoop:

```text
Identity
Authentication
Authorization
Devices
Organizations
Sharing
Discovery
Signaling
Connections
Connection status
```

The API does not perform normal packet forwarding.

---

# 4. API Boundary

```text
                 ZOOP API
                    │
        ┌───────────┼───────────┐
        │           │           │
     Identity    Discovery   Signaling
        │           │           │
        ├────── Authorization ──┤
        │                       │
        └──── Connection State ─┘
```

After coordination:

```text
Provider
    │
    │ WireGuard
    │
Recipient
    │
    ▼
Internet
```

---

# 5. Resource Model

The main API resources are:

```text
Users
Organizations
Devices
Identities
Sharing Relationships
Connections
Signaling Sessions
```

Conceptually:

```text
Organization
    │
    ├── Users
    │
    └── Devices
          │
          ├── Identity
          ├── Provider capability
          └── Recipient capability

Provider
    │
    └── Sharing Relationship
              │
           Recipient
```

---

# 6. Authentication

Every protected API request must identify the caller.

Authentication establishes:

```text
Who is making the request?
Which device is making the request?
Which organization does the device belong to?
```

Authentication and authorization are separate operations.

```text
Authentication
      ↓
Who are you?

Authorization
      ↓
What are you allowed to do?
```

---

# 7. Device Identity

Each Zoop device has a persistent cryptographic identity.

A device identity is associated with:

```text
Device ID
Public key
Owner
Organization
Platform
Capabilities
Status
```

Private keys remain on the device.

The Control Plane stores the public identity required for authentication and connection coordination.

---

# 8. Device Registration

A device registers itself with Zoop.

```text
POST /v1/devices
```

Conceptual request:

```json
{
  "name": "My Phone",
  "platform": "android",
  "public_key": "...",
  "capabilities": [
    "recipient"
  ]
}
```

The API validates the authenticated identity and creates the device record.

Conceptual response:

```json
{
  "id": "device_...",
  "status": "active"
}
```

---

# 9. Devices

The API provides device management.

```text
GET    /v1/devices
GET    /v1/devices/{device_id}
PATCH  /v1/devices/{device_id}
DELETE /v1/devices/{device_id}
```

Operations include:

* list devices
* retrieve device
* update device metadata
* revoke/remove device

---

# 10. Device Status

A device exposes Control Plane status such as:

```text
online
offline
connecting
connected
revoked
```

Connection status should represent the Control Plane's knowledge of the endpoint.

It must not be treated as proof that Internet traffic is successfully flowing.

---

# 11. Organizations

Organizations group users and devices.

```text
GET    /v1/organizations
POST   /v1/organizations
GET    /v1/organizations/{organization_id}
PATCH  /v1/organizations/{organization_id}
```

Organizations control access to:

```text
Users
Devices
Sharing relationships
Policies
```

---

# 12. Organization Membership

Organization membership determines which users can manage organization resources.

Conceptually:

```text
Organization
     │
     ├── User A
     ├── User B
     └── User C
```

Membership operations include:

```text
Add member
Remove member
Change role
List members
```

---

# 13. Sharing Relationships

A Provider explicitly shares connectivity with a Recipient.

```text
Provider
    │
    │ sharing relationship
    ▼
Recipient
```

The API manages this relationship.

Conceptual endpoints:

```text
POST   /v1/shares
GET    /v1/shares
GET    /v1/shares/{share_id}
PATCH  /v1/shares/{share_id}
DELETE /v1/shares/{share_id}
```

A sharing relationship contains:

```text
Provider
Recipient
Permissions
Status
Created time
Updated time
```

---

# 14. Authorization

Before a connection is established, Zoop verifies:

```text
Recipient identity
Provider identity
Organization permissions
Sharing relationship
Device status
Connection permissions
```

Conceptually:

```text
Recipient
   │
   │ request connection
   ▼
Zoop API
   │
   ├── authenticated?
   ├── authorized?
   ├── Provider available?
   ├── sharing allowed?
   └── device valid?
   │
   ▼
Authorized
```

---

# 15. Discovery

Discovery allows an authorized endpoint to obtain the information required to locate another endpoint.

```text
GET /v1/devices/{device_id}/endpoints
```

Discovery may provide:

```text
Public endpoint information
Candidate network addresses
Supported protocols
Capabilities
Public key
Connection metadata
```

Only information necessary for connection establishment should be exposed.

---

# 16. Signaling

Signaling exchanges connection information between endpoints.

The signaling channel uses **WebSocket** for persistent real-time communication.

Conceptually:

```text
Provider
   │
   │ WebSocket
   ▼
Zoop Control Plane
   │
   │ WebSocket
   ▼
Recipient
```

Signaling is used for:

* connection negotiation
* endpoint information
* connection updates
* path changes
* connection state events

The signaling channel does not carry ordinary Internet traffic.

---

# 17. Connection Resource

A connection represents an authorized Provider ↔ Recipient relationship being established or maintained.

Endpoints:

```text
POST   /v1/connections
GET    /v1/connections
GET    /v1/connections/{id}
PUT    /v1/connections/{id}/state
DELETE /v1/connections/{id}
GET    /v1/devices/{id}/pending-connections
```

### Connection Creation (`POST /v1/connections`)

Initiated by the Recipient to establish connectivity with an authorized Provider.

**Request Schema:**

```json
{
  "provider_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recipient_id": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
  "wireguard_public_key": "xGZ94a73+bK...",
  "endpoint_ip": "192.168.1.50",
  "endpoint_port": 51820,
  "candidates": [
    {"type": "host", "ip": "192.168.1.50", "port": 51820, "priority": 100},
    {"type": "srflx", "ip": "203.0.113.10", "port": 43210, "priority": 80}
  ]
}
```

**Response Schema (`201 Created` or `200 OK`):**

```json
{
  "id": "7fa85f64-5717-4562-b3fc-2c963f66afa8",
  "provider_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "recipient_id": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
  "state": "pending",
  "provider_ip": "100.64.0.1",
  "recipient_ip": "100.64.0.2",
  "wireguard_public_key": "pWG82b99+cM...",
  "endpoint_ip": "192.168.1.100",
  "endpoint_port": 51820,
  "candidates": [
    {"type": "host", "ip": "192.168.1.100", "port": 51820, "priority": 100},
    {"type": "srflx", "ip": "198.51.100.22", "port": 51820, "priority": 80}
  ]
}
```

**Session Reconnection & Idempotency:**
- If an active connection session already exists for the authorized share, the Control Plane reuses the session, updates the client candidate list and WireGuard public key, and returns the active connection details rather than rejecting with `409 Conflict`.
- Carrier-Grade NAT (CGNAT `100.64.0.0/10`) tunnel addresses (`provider_ip`, `recipient_ip`) are allocated by IPAM and preserved across reconnects.

---

# 18. Connection States & Transitions

The Control Plane recognizes the following connection lifecycle:

```text
       PENDING (Requested)
           │
           ▼
       CONNECTING (Signaling & ICE)
           │
           ▼
       CONNECTED (WireGuard Tunnel Active)
           ├── DIRECT
           └── RELAYED
           │
     ┌─────┴───────────────┐
     ▼                     ▼
  DEGRADED / RECONNECTING  DISCONNECTED
     │                     ▲
     └─────────────────────┘
```

A connection may also transition to `REVOKED` if access is revoked by the Provider or administrator.

### State Update (`PUT /v1/connections/{id}/state`)

**Request Schema:**

```json
{
  "state": "connected"
}
```

**Transition Rules:**
1. **Self-Transition Idempotency**: State updates where `from == to` (e.g. reporting `connected` when the session is already marked `connected`) succeed as safe no-ops.
2. **Direct Progression**: When an endpoint establishes a direct WireGuard handshake asynchronously, it is permitted to transition directly to `connected`.
3. **Audit & Signaling Broadcast**: Every state change publishes an event across the real-time WebSocket signaling channel to both endpoints and appends an entry to the audit log.


---

# 19. Connection Establishment

The Control Plane coordinates connection establishment.

```text
Recipient
    │
    │ connection request
    ▼
Zoop API
    │
    │ authorization
    ▼
Provider
    │
    │ signaling
    ▼
Recipient
    │
    │ WireGuard establishment
    ▼
Provider
```

The final packet path is created by the Data Plane.

---

# 20. Direct Path

Zoop prefers direct Provider ↔ Recipient connectivity.

```text
Provider
    │
    │ direct WireGuard
    │
Recipient
```

The Control Plane assists with discovery and signaling.

It does not become the normal traffic path.

---

# 21. Relay Path

When a direct path cannot be established, Zoop uses the relay system.

```text
Provider
    │
    ▼
  Relay
    │
    ▼
Recipient
```

The relay carries encrypted tunnel traffic.

The Control Plane manages coordination; it is not itself the relay.

---

# 22. Path State

A connection reports its current path:

```json
{
  "connection_id": "connection_...",
  "state": "connected",
  "path": "direct"
}
```

Possible path values:

```text
direct
relay
```

The path can change during the lifetime of a connection.

---

# 23. Connection Termination

A connection can be explicitly terminated.

```text
DELETE /v1/connections/{connection_id}
```

Termination removes the active connection relationship.

The endpoint is responsible for shutting down the corresponding Data Plane tunnel.

---

# 24. Revocation

Revocation prevents a device or relationship from continuing to use Zoop.

Revocation can apply to:

```text
Device
User
Sharing relationship
Organization membership
```

Example:

```text
Provider
   │
   │ revoke Recipient
   ▼
Zoop API
   │
   ▼
Authorization denied
   │
   ▼
Connection terminated
```

---

# 25. API Error Model

Errors use a consistent JSON structure.

Example:

```json
{
  "error": {
    "code": "authorization_denied",
    "message": "The requested operation is not permitted."
  }
}
```

Common error classes:

```text
invalid_request
unauthenticated
authorization_denied
not_found
conflict
rate_limited
unavailable
internal_error
```

Clients must be able to distinguish retryable failures from permanent failures.

---

# 26. Idempotency

Operations that can be retried must be safe against duplicate requests.

This applies particularly to:

```text
Device registration
Sharing creation
Connection creation
Revocation
```

Idempotency keys may be used for operations where duplicate execution would otherwise create inconsistent state.

---

# 27. Pagination

Collection endpoints use pagination.

Examples:

```text
GET /v1/devices
GET /v1/connections
GET /v1/shares
GET /v1/organizations/{id}/members
```

The API should avoid returning unbounded collections.

---

# 28. API Security

All production API communication uses:

```text
HTTPS
TLS
```

The API enforces:

```text
Authentication
Authorization
Input validation
Rate limiting
Access control
Secure session handling
Audit events
```

Private keys, passwords, authentication secrets, and tunnel traffic must not be exposed through ordinary API responses.

---

# 29. API and Data Plane Separation

This is a core Zoop rule.

```text
             CONTROL PLANE
                  │
             Zoop API
                  │
       ┌──────────┴──────────┐
       │                     │
    Provider              Recipient
       │                     │
       └──── WireGuard ──────┘
                  │
                  ▼
             DATA PLANE
                  │
                  ▼
             User Traffic
```

The API:

```text
Authenticates
Authorizes
Discovers
Signals
Coordinates
Reports state
```

The Data Plane:

```text
Creates tunnel
Routes packets
Forwards packets
Performs NAT
Carries Internet traffic
```

---

# 30. API Events

The Control Plane generates events for important state changes.

Examples:

```text
device.registered
device.revoked

share.created
share.accepted
share.revoked

connection.requested
connection.authorized
connection.established
connection.path_changed
connection.degraded
connection.disconnected
```

These events support signaling, monitoring, and user interfaces.

---

# 31. Audit Events

Security-sensitive operations should generate audit records.

Examples:

```text
Authentication
Device registration
Device revocation
Sharing creation
Sharing revocation
Authorization changes
Organization membership changes
```

Audit records must avoid storing sensitive traffic data.

---

# 32. API Responsibilities by Client

### Go Agent

The Agent uses the API for:

```text
Authentication
Registration
Discovery
Signaling
Connection coordination
Status reporting
```

### Web

The Web application uses the API for:

```text
Users
Devices
Organizations
Sharing
Connections
Security
Diagnostics
```

### Android / iOS

Mobile clients use the API for:

```text
Authentication
Device registration
Device management
Discovery
Connection coordination
Status
```

---

# 33. API Lifecycle

The API follows this general connection flow:

```text
1. Device authenticates
        ↓
2. Device registers
        ↓
3. Devices discover each other
        ↓
4. Recipient requests connection
        ↓
5. Authorization is checked
        ↓
6. Signaling begins
        ↓
7. Endpoints establish WireGuard
        ↓
8. Connection becomes direct or relay
        ↓
9. Data Plane carries traffic
        ↓
10. Control Plane monitors state
```

---

# 34. Initial API Surface

The first implementation should focus on the APIs required by the core Zoop connection:

```text
Authentication
Device registration
Device lookup
Device discovery
Sharing
Authorization
Connection creation
Connection status
Signaling
Revocation
```

Everything else can build on these primitives.

---

# 35. Core Principle

The Zoop API exists to **coordinate trusted endpoints**.

It should never become the default path for the Internet traffic that Zoop is designed to transport.

```text
              ZOOP CLOUD
                  │
       Authentication
       Authorization
       Discovery
       Signaling
                  │
          ┌───────┴───────┐
          │               │
       PROVIDER       RECIPIENT
          │               │
          └── WireGuard ──┘
                  │
                  ▼
               INTERNET
```

**Control Plane coordinates.**

**Data Plane transports.**

---

# 14. ZoopSpot Hotspots & Captive Portal API

ZoopSpot introduces specialized endpoints for operator fleet management and customer captive portal monetization.

## 14.1 Operator Fleet Endpoints

All operator endpoints require authenticated device/user headers (`X-Zoop-Device-ID`, `X-Zoop-Timestamp`, `X-Zoop-Signature`).

### `POST /v1/hotspots`
Creates a new hotspot venue.
```json
{
  "name": "Acacia Cyber Hub",
  "slug": "acacia-hub",
  "location": "Acacia Mall, Level 2, Kampala",
  "router_type": "mikrotik"
}
```

### `GET /v1/hotspots`
Lists all hotspots managed by the caller.

### `GET /v1/hotspots/{id}`
Returns full configuration and status for a specific hotspot.

### `DELETE /v1/hotspots/{id}`
Deletes a hotspot venue.

### `GET /v1/hotspots/{id}/script`
Auto-generates a ready-to-paste MikroTik RouterOS v7 provisioning script, configuring the WireGuard management interface, `/30` overlay IP (`100.64.x.x`), REST API credentials, and Walled Garden rules.

### `POST /v1/hotspots/{id}/packages`
Creates an internet package tier.
```json
{
  "name": "1 Hour Fast Access",
  "price": 1000,
  "duration_minutes": 60,
  "rate_down_kbps": 5120,
  "rate_up_kbps": 2048
}
```

### `GET /v1/hotspots/{id}/packages`
Returns all packages configured for a venue.

### `POST /v1/hotspots/{id}/vouchers`
Batch-generates 8-character cryptographic offline vouchers for retail cash sales.
```json
{
  "package_id": "pkg_123",
  "count": 50,
  "batch_tag": "march-batch-1"
}
```

### `GET /v1/hotspots/{id}/vouchers`
Lists generated vouchers with claimed status and customer MAC.

### `GET /v1/hotspots/{id}/stats`
Returns live operational metrics: active sessions, total sessions, claimed vs total vouchers, and total bandwidth served.

---

## 14.2 Public Captive Portal Endpoints

These endpoints are **unauthenticated** because venue Wi-Fi clients are not yet logged into the network.

### `GET /v1/portal/hotspot/{slug}`
Returns venue details, online status, and available packages for display on the captive landing page.

### `POST /v1/portal/checkout`
Initiates an automated MTN or Airtel Mobile Money STK prompt.
```json
{
  "hotspot_slug": "acacia-hub",
  "package_id": "pkg_123",
  "phone_number": "0771234567",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "client_ip": "192.168.88.254"
}
```
Returns a `session_id` and `transaction_id`. The client immediately receives a USSD PIN prompt on their phone.

### `POST /v1/portal/voucher`
Redeems an offline scratch voucher code.
```json
{
  "hotspot_slug": "acacia-hub",
  "code": "A8K9M3X2",
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```
Returns the activated session and instructs the router to bypass the client MAC.

### `POST /v1/portal/lifeline`
Awards a 10-minute free emergency lifeline (capped at 2 Mbps) once per 24 hours per client MAC.

### `GET /v1/portal/session/{id}`
Polled by the captive portal front-end to verify when Mobile Money payment is confirmed and the session status changes to `active`.

