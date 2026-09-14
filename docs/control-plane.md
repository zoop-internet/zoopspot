# Zoop Control Plane

## 1. Overview

The Zoop Control Plane is responsible for **coordination, identity, discovery, authorization, relationships, and connection establishment**.

It helps Zoop answer questions such as:

```text
Who is this?
      ↓
Can they prove it?
      ↓
What are they allowed to do?
      ↓
Who can they connect to?
      ↓
Where is the other endpoint?
      ↓
How should the connection be established?
```

The Control Plane does **not** normally carry the Provider's Internet traffic.

The actual traffic belongs to the Data Plane.

```text
                 ZOOP
                   │
        ┌──────────┴──────────┐
        │                     │
   CONTROL PLANE          DATA PLANE
        │                     │
    Zoop Cloud             Endpoints
        │                     │
 Coordination              Traffic
```

---

# 2. Control Plane Responsibilities

The Control Plane currently consists of these major responsibilities:

```text
                         CONTROL PLANE
                              │
        ┌───────────┬─────────┼─────────┬───────────┐
        │           │         │         │           │
     Identity   Discovery  Auth/Authz  Signaling  Policy
        │           │         │         │           │
        └───────────┴─────────┼─────────┴───────────┘
                              │
                        Relationships
```

The exact boundaries between these components may evolve as Zoop is designed further.

---

# 3. Control Plane vs Data Plane

This is the most important boundary.

### Control Plane

Answers:

> **How should the network connection exist?**

### Data Plane

Answers:

> **How should the actual packets travel?**

For example:

```text
Control Plane

Provider
   │
   ▼
Identity
   │
   ▼
Authorization
   │
   ▼
Discovery
   │
   ▼
Signaling
   │
   ▼
Connection information
```

Then:

```text
Data Plane

Recipient
   │
   ▼
Tunnel
   │
   ▼
Provider
   │
   ▼
Internet
```

The Control Plane establishes the conditions for the Data Plane.

---

# 4. Identity

Identity answers:

> **Who or what is participating in Zoop?**

Zoop may need to represent:

```text
Person
Organization
Account
Device
Endpoint
```

These are related but not identical concepts.

For example:

```text
Person
  │
  ▼
Account
  │
  ▼
Device
  │
  ▼
Endpoint
```

An endpoint is the actual participant in network communication.

---

# 5. Authentication

Authentication answers:

> **Can this participant prove its identity?**

Conceptually:

```text
Claimed Identity
      │
      ▼
Authentication
      │
      ▼
Verified Identity
```

Authentication should apply to both cloud interactions and endpoint-to-endpoint connection establishment where appropriate.

The exact authentication mechanisms are a technology decision.

---

# 6. Authorization

Authentication and authorization are different.

Authentication establishes:

> "This is the endpoint it claims to be."

Authorization establishes:

> "This endpoint is allowed to perform this action."

For example:

```text
Recipient
   │
   ▼
Authentication
   │
   ▼
Identity confirmed
   │
   ▼
Authorization
   │
   ▼
Provider access permitted
```

Authorization should be able to consider the Provider's sharing rules and the relationship between the participants.

---

# 7. Provider and Recipient Authorization

Zoop's connectivity model depends heavily on authorization.

A Provider should be able to define who may use its connectivity.

Conceptually:

```text
                    PROVIDER
                       │
                       ▼
                Sharing Policy
                       │
          ┌────────────┼────────────┐
          │            │            │
        Friend       Family      Community
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                 Authorization
                       │
                       ▼
                   Recipient
```

The exact sharing model remains open.

Possible relationship types include:

* individual sharing
* friend-to-friend sharing
* family sharing
* community sharing
* organization-managed sharing
* public or paid access

These should not be assumed to be the final model.

---

# 8. Relationships

A relationship represents the connection between participants at the Control Plane level.

For example:

```text
Provider
   │
   ▼
Relationship
   │
   ▼
Recipient
```

The relationship can eventually contain information about:

* who can connect
* what they can access
* when they can access it
* how much they can use
* what limits apply
* whether access is currently active

The relationship is not itself the network tunnel.

It is the Control Plane representation of the permission and relationship.

---

# 9. Sharing Policy

The Provider may establish policies governing connectivity.

Conceptually:

```text
Provider
   │
   ▼
Sharing Policy
   │
   ├── Who?
   ├── When?
   ├── How long?
   ├── How much?
   ├── Under what conditions?
   └── What limitations?
```

Policies may eventually include:

* time-based limits
* data-volume limits
* recipient limits
* availability windows
* relationship-based access
* community rules
* organizational policies
* paid access

The Control Plane stores and evaluates policy.

The Data Plane may enforce the resulting restrictions.

---

# 10. Discovery

Discovery answers:

> **Where can an endpoint be found?**

A simplified process is:

```text
Provider
   │
   │ registers
   ▼
Zoop Discovery
   ▲
   │ requests information
   │
Recipient
```

Discovery may provide information needed to attempt a connection.

It may involve:

* endpoint identity
* endpoint availability
* network information
* connection candidates
* supported capabilities
* connection state

Discovery should not carry normal Internet traffic.

---

# 11. Endpoint Registration

An endpoint needs a way to make itself known to Zoop.

Conceptually:

```text
Endpoint
   │
   │ authenticate
   ▼
Zoop Cloud
   │
   │ register
   ▼
Discovery System
```

The registration process allows Zoop to know that an endpoint exists and is participating.

Registration should be associated with a verified identity.

---

# 12. Presence

Discovery also needs to understand endpoint availability.

An endpoint may be:

```text
ONLINE
OFFLINE
CONNECTING
AVAILABLE
UNAVAILABLE
```

These states are conceptual.

The exact state model will be defined later.

For example:

```text
Provider
   │
   ▼
Online
   │
   ▼
Available for sharing
```

Being online does not automatically mean that the Provider is authorized to share connectivity.

---

# 13. Signaling

Discovery tells Zoop where endpoints can potentially be found.

Signaling coordinates the process of establishing the connection.

Conceptually:

```text
Discovery
    │
    ▼
Find endpoints
    │
    ▼
Signaling
    │
    ▼
Exchange connection information
    │
    ▼
Connection attempt
```

Signaling is therefore a bridge between Control Plane coordination and Data Plane connection establishment.

The exact signaling protocol remains undecided.

---

# 14. Connection Coordination

The Control Plane should coordinate the initial connection process.

A conceptual flow is:

```text
Recipient
    │
    ▼
Authenticate
    │
    ▼
Check authorization
    │
    ▼
Discover Provider
    │
    ▼
Obtain connection information
    │
    ▼
Signaling
    │
    ▼
Attempt connection
    │
    ▼
Data Plane
```

Once the Data Plane connection is established, the Control Plane should not need to carry the normal Internet traffic.

---

# 15. Control Plane Does Not Forward Internet Traffic

This distinction is fundamental.

Incorrect conceptual architecture:

```text
Provider
    │
    ▼
Zoop Cloud
    │
    ▼
Recipient
```

That would make Zoop Cloud a traffic bottleneck.

Preferred architecture:

```text
                 Zoop Cloud
                     │
             Coordination only
                     │
          ┌──────────┴──────────┐
          │                     │
      Provider ◄────────────► Recipient
                Data Plane
```

The Control Plane helps create the relationship and connection.

The Data Plane carries the traffic.

---

# 16. Connection State

The Control Plane may maintain information about the state of a connection.

Conceptually:

```text
DISCOVERING
     │
     ▼
AUTHORIZING
     │
     ▼
CONNECTING
     │
     ▼
CONNECTED
     │
     ├──────────────► DISCONNECTED
     │
     └──────────────► RECOVERING
```

This is useful for coordination and visibility.

However, the actual packet flow remains a Data Plane responsibility.

---

# 17. Policy Enforcement

The Control Plane determines what should be allowed.

For example:

```text
Recipient requests access
          │
          ▼
Authorization
          │
          ▼
Policy evaluation
          │
     ┌────┴────┐
     │         │
   Allow     Deny
     │
     ▼
Connection
```

The Data Plane then operates according to the resulting authorization and policy.

---

# 18. Usage Information

Zoop may eventually need to track usage.

For example:

```text
Provider
   │
   ▼
Sharing relationship
   │
   ▼
Recipient
   │
   ▼
Usage
   │
   ├── Duration
   ├── Data transferred
   └── Other measurements
```

Usage information may support:

* limits
* quotas
* billing
* reporting
* community policies
* organizational policies

The exact accounting model remains open.

---

# 19. Revocation

Authorization must be reversible.

A Provider or administrator may need to stop access.

```text
Authorized
    │
    ▼
Access Active
    │
    │ revoke
    ▼
Access Revoked
```

Revocation may apply to:

* a device
* an account
* a Recipient
* a relationship
* a Provider
* an organization member

The Data Plane must eventually respond appropriately when authorization is revoked.

---

# 20. Offline Conditions

The Control Plane cannot assume endpoints are always online.

For example:

```text
Provider
   │
   ▼
Offline
```

Discovery should therefore represent availability accurately.

If a Provider is unavailable:

```text
Recipient
   │
   ▼
Discovery
   │
   ▼
Provider unavailable
```

The system should not attempt to establish a connection as though the Provider were active.

---

# 21. Security Boundary

The Control Plane handles sensitive information.

This may include:

* identities
* device identities
* relationships
* authorization decisions
* connection metadata
* policy
* usage information

Therefore the Control Plane must be designed with strong security and privacy boundaries.

The Control Plane should not need access to the contents of encrypted Data Plane traffic merely to coordinate the connection.

---

# 22. Control Plane Components

At a high level:

```text
                         ZOOP CLOUD
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
     Identity             Discovery           Authorization
        │                     │                     │
        ├──────────────┐      │      ┌──────────────┤
        │              │      │      │              │
 Authentication    Devices    │   Policies      Relationships
        │                     │
        └─────────────────────┼─────────────────────┘
                              │
                          Signaling
                              │
                              ▼
                           Endpoints
```

These components should remain conceptually separate even if they eventually run within the same service or process.

---

# 23. Zoop Cloud Boundary

Zoop Cloud is responsible for Control Plane services.

It may eventually expose APIs to:

```text
Web
Mobile
Desktop
Endpoint Agent
Router
Organization systems
```

Conceptually:

```text
                     ZOOP CLOUD
                          │
             ┌────────────┼────────────┐
             │            │            │
           Web          Mobile       Agent
             │            │            │
             └────────────┼────────────┘
                          │
                 Control Plane
```

The cloud should provide coordination without becoming a mandatory traffic relay.

---

# 24. Control Plane and Endpoint

The Control Plane is distributed between Zoop Cloud and endpoint-side software.

```text
             ZOOP CLOUD
                  │
       ┌──────────┼──────────┐
       │          │          │
    Identity   Discovery  Signaling
       │          │          │
       └──────────┼──────────┘
                  │
                  ▼
             ZOOP AGENT
                  │
        ┌─────────┼─────────┐
        │         │         │
     Identity  Discovery  Connection
                            │
                            ▼
                         Data Plane
```

The endpoint must therefore be capable of participating in Control Plane operations while also operating the Data Plane.

---

# 25. Control Plane Lifecycle

A simplified Zoop lifecycle is:

```text
1. Identity
      │
      ▼
2. Authentication
      │
      ▼
3. Registration
      │
      ▼
4. Discovery
      │
      ▼
5. Authorization
      │
      ▼
6. Signaling
      │
      ▼
7. Connection
      │
      ▼
8. Data Plane
      │
      ▼
9. Monitoring / Policy
      │
      ▼
10. Disconnect / Revoke
```

Not every connection will necessarily follow these steps in exactly this order.

The diagram represents the conceptual lifecycle.

---

# 26. What the Control Plane Does Not Define

The Control Plane does not itself define:

* packet forwarding
* Internet routing
* NAT implementation
* tunnel packet processing
* network interface implementation
* physical network transport

Those belong to the Data Plane and underlying networking layers.

---

# 27. Technology Direction

The Control Plane currently has the following technology direction:

| Area                          | Current Direction                                   |
| ----------------------------- | --------------------------------------------------- |
| Cloud services                | Go                                                  |
| Endpoint control software     | Go                                                  |
| Persistent data               | PostgreSQL                                          |
| API communication             | HTTPS                                               |
| Real-time signaling candidate | WebSocket                                           |
| Identity                      | Established authentication/cryptographic mechanisms |
| Discovery                     | To be designed                                      |
| Signaling                     | To be designed                                      |
| Authorization                 | To be designed                                      |

These are directions rather than final implementation requirements.

The architecture should remain valid if individual technologies change.

---

# 28. Important Design Principle

The Control Plane should provide **enough coordination to establish and manage a connection, but not become unnecessarily involved in the traffic itself**.

The desired relationship is:

```text
             CONTROL PLANE
                  │
          "Find and authorize"
                  │
                  ▼
             CONNECTION
                  │
                  ▼
              DATA PLANE
                  │
          "Carry the traffic"
```

This separation is one of the central architectural principles of Zoop.

---

# 29. Current Open Questions

The following are intentionally not finalized yet:

* Exact discovery protocol
* Exact signaling protocol
* Endpoint registration model
* Presence model
* Identity architecture details
* Authorization model
* Sharing relationship model
* Policy representation
* Usage accounting model
* Revocation mechanism
* Cloud service boundaries
* Cloud scaling strategy
* Metadata privacy model
* Connection state model

These should be explored individually before implementation.

---

# 30. Summary

The Zoop Control Plane is the **coordination system** of Zoop.

Its fundamental responsibilities are:

```text
Identity
   ↓
Authentication
   ↓
Authorization
   ↓
Discovery
   ↓
Relationships / Policy
   ↓
Signaling
   ↓
Connection Coordination
```

Its fundamental boundary is:

> **The Control Plane decides and coordinates; the Data Plane transports.**

The Control Plane should enable Provider and Recipient endpoints to establish secure, authorized, preferably direct connectivity without becoming the normal path for their Internet traffic.

This definition provides the foundation for the next stages of Zoop networking design.

---

# 31. Cloud Implementation & Modular Structure

The Zoop Cloud Control Plane is implemented in Go under `packages/cloud/server/` and organized into dedicated, domain-specific modules rather than a monolithic handler:

```text
packages/cloud/server/
├── server.go          # Core server lifecycle, mux router, global middleware, base struct
├── devices.go         # Device registration, authentication, status, heartbeat (/v1/devices)
├── users.go           # User management, profile settings, API keys (/v1/users)
├── shares.go          # Bandwidth sharing rules, invite links, quotas (/v1/shares)
├── organizations.go   # Multi-tenant organization boundaries and RBAC (/v1/organizations)
├── connections.go     # Connection coordination, candidate signaling, IPAM (/v1/connections)
├── signaling.go       # Real-time WebSocket signaling hub (/v1/signaling)
├── admin.go           # Administrative overview, metrics scrapers, health probes (/v1/admin, /v1/health)
├── relays.go          # Relay cluster discovery, region topology, credentials (/v1/relays)
├── pairing.go         # One-time pairing codes and mutual key exchange (/v1/pairing)
└── payments.go        # Bandwidth metering, token settlement records (/v1/payments)
```

Each module exposes clean HTTP/JSON handlers registered onto the central `http.ServeMux`, backed by persistent PostgreSQL storage (`packages/cloud/store/`) and domain services (`packages/cloud/services/`).

---

# 32. Connection Coordination & Session Idempotency

Connection establishment via `POST /v1/connections` coordinates between the Recipient and the Provider. In distributed mobile and unreliable network conditions, requests can be retried or sent concurrently. The Control Plane enforces **idempotent connection coordination**:

### 1. Active Session Reuse
When a client requests a connection (`POST /v1/connections`) for an active share:
- The Control Plane checks for an existing active session between the Recipient and Provider for that share.
- Rather than returning `409 Conflict`, the server reuses the active session.
- Client candidate endpoints and public keys are updated with fresh network state.
- The full existing connection session—including the assigned Carrier-Grade NAT (CGNAT) IPs (`100.64.0.0/10`), Provider endpoint candidates, and signaling status—is returned immediately.

### 2. State Transition Idempotency
- **No-op Self-Transitions (`from == to`)**: Redundant state notifications (e.g., reporting `connected` when already in `connected` state) are treated as successful no-ops rather than illegal state errors.
- **Direct Progression**: When an asynchronous WireGuard handshake completes before intermediary discovery states finish reporting, the state machine permits direct progression to `connected`.
- **Dynamic Candidate Refresh**: As mobile clients roam between Wi-Fi, cellular, or VPN states, updated reflexive ICE/STUN candidates can be posted to `/v1/connections/{id}/candidates` and dispatched over the signaling channel without resetting the tunnel session.
