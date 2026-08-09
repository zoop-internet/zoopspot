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

Conceptual endpoints:

```text
POST /v1/connections
GET  /v1/connections
GET  /v1/connections/{connection_id}
DELETE /v1/connections/{connection_id}
```

A connection contains information such as:

```text
Connection ID
Provider
Recipient
State
Path
Created time
Updated time
```

---

# 18. Connection States

The Control Plane recognizes the following lifecycle:

```text
DISCOVERING
     ↓
AUTHENTICATING
     ↓
AUTHORIZING
     ↓
CONNECTING
     ↓
CONNECTED
     │
     ├── DIRECT
     │
     └── RELAYED
     │
     ↓
DEGRADED
     ↓
RECONNECTING
     ↓
DISCONNECTED
```

A connection may also become:

```text
REVOKED
```

when authorization is removed.

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
