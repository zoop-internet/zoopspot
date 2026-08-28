# Zoop Entities

## 1. Overview

This document defines the major entities that make up the Zoop system.

The purpose is to establish a common vocabulary before implementation.

Zoop should distinguish between:

* people
* accounts
* organizations
* devices
* endpoints
* providers
* recipients
* networks
* relationships
* connections
* policies

These concepts are related, but they are not interchangeable.

---

# 2. Entity Overview

The high-level relationship is:

```text
                         ZOOP
                           │
             ┌─────────────┴─────────────┐
             │                           │
          PEOPLE                    ORGANIZATIONS
             │                           │
             └─────────────┬─────────────┘
                           │
                         ACCOUNT
                           │
                         Device
                           │
                        Endpoint
                           │
                  ┌────────┴────────┐
                  │                 │
               Provider          Recipient
                  │                 │
                  └────────┬────────┘
                           │
                    Sharing Relationship
                           │
                        Connection
                           │
                         Network
```

Not every relationship shown here is necessarily one-to-one.

---

# 3. Person

A **Person** represents a human participant in Zoop.

A person may:

* own an account
* operate devices
* act as a Provider
* act as a Recipient
* belong to an organization
* participate in sharing relationships

Conceptually:

```text
Person
   │
   ▼
Account
   │
   ▼
Devices
```

A Person is not itself a network endpoint.

The person's devices may become endpoints.

---

# 4. Account

An **Account** represents the identity and ownership context of a Zoop participant.

An account may belong to:

```text
Person
```

or:

```text
Organization
```

An account may be associated with multiple devices.

```text
Account
   │
   ├── Device A
   ├── Device B
   └── Device C
```

The exact account model will be defined during identity design.

---

# 5. Organization

An **Organization** represents a group that manages participants, devices, networks, or policies.

Examples may include:

* university
* company
* community
* institution
* managed network operator

Conceptually:

```text
Organization
      │
      ├── Members
      ├── Accounts
      ├── Devices
      ├── Endpoints
      ├── Networks
      └── Policies
```

Organizations are an extension of the core Zoop model.

The initial Zoop system does not need to depend on organizations.

---

# 6. Identity

An **Identity** represents the authenticated identity of a participant or device.

Identity is distinct from an account.

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
Device Identity
```

Identity is used by the Control Plane to answer:

> Who is this participant?

Identity may involve cryptographic credentials.

The exact identity architecture is defined separately in `security.md`.

---

# 7. Device

A **Device** represents a physical computing device.

Examples:

```text
Phone
Laptop
Desktop
Router
Server
Network appliance
```

A device may have:

* operating system
* network interfaces
* local storage
* hardware identity
* Zoop software

A device is not necessarily an active Zoop endpoint.

---

# 8. Endpoint

An **Endpoint** represents a device participating in Zoop networking.

```text
Device
   │
   ▼
Zoop Agent
   │
   ▼
Endpoint
```

The endpoint is the entity that participates in the Data Plane.

It may:

* establish tunnels
* send packets
* receive packets
* route traffic
* forward traffic
* provide connectivity
* consume connectivity

An endpoint may be associated with one or more network interfaces.

---

# 9. Provider

A **Provider** is an endpoint that provides network connectivity to another authorized endpoint.

```text
Provider
   │
   ▼
Internet connectivity
   │
   ▼
Recipient
```

A Provider could be:

* a phone
* a laptop
* a router
* an organization-managed device
* another supported network device

Provider is a **role**, not necessarily a permanent entity type.

An endpoint can potentially be a Provider at one time and a Recipient at another.

---

# 10. Recipient

A **Recipient** is an endpoint that consumes connectivity from a Provider.

```text
Provider
    │
    ▼
Recipient
    │
    ▼
Internet
```

The Recipient must be authorized to use the Provider according to the relevant sharing relationship and policies.

Like Provider, Recipient is a role.

---

# 11. Provider and Recipient Are Roles

Provider and Recipient should not be treated as completely different device types.

For example:

```text
                    Endpoint
                       │
             ┌─────────┴─────────┐
             │                   │
          Provider            Recipient
```

The same endpoint could potentially participate in both roles.

For example:

```text
Phone A
   │
   └── Provider to Phone B

Phone A
   │
   └── Recipient from Router C
```

This makes the model more flexible.

---

# 12. Network

A **Network** represents a network environment to which an endpoint is connected.

Examples:

```text
Wi-Fi
Cellular
Ethernet
Home network
University network
Public network
Internet service
```

An endpoint can change networks over time.

```text
Endpoint
   │
   ├── Wi-Fi
   │
   ├── Cellular
   │
   └── Ethernet
```

This is especially important for mobile endpoints.

---

# 13. Network Interface

A **Network Interface** represents a specific networking interface on a device.

Examples:

```text
Wi-Fi interface
Cellular interface
Ethernet interface
Virtual interface
```

Conceptually:

```text
Device
   │
   ├── Wi-Fi interface
   ├── Cellular interface
   └── Ethernet interface
```

The Data Plane may use one or more interfaces when establishing connectivity.

---

# 14. Internet Connection

An **Internet Connection** represents upstream Internet connectivity available to an endpoint.

For a Provider:

```text
Provider
   │
   ▼
Internet Connection
```

The connection may be provided through:

* cellular
* Wi-Fi
* Ethernet
* fiber
* fixed wireless
* another upstream network

The Internet Connection is distinct from a Zoop tunnel.

---

# 15. Sharing Relationship

A **Sharing Relationship** represents the Control Plane relationship between a Provider and Recipient.

```text
Provider
   │
   ▼
Sharing Relationship
   │
   ▼
Recipient
```

It answers questions such as:

* Is sharing allowed?
* Who is allowed?
* What policy applies?
* Is the relationship active?
* What limitations exist?

A Sharing Relationship is not itself the Data Plane tunnel.

---

# 16. Authorization

**Authorization** represents permission to perform an action.

For example:

```text
Recipient
   │
   ▼
Authorization
   │
   ▼
Can use Provider?
```

Authorization may depend on:

* identity
* sharing relationship
* policy
* organization rules
* time
* usage
* other conditions

Authentication establishes identity.

Authorization determines permission.

---

# 17. Policy

A **Policy** defines rules governing how an entity may participate in Zoop.

Examples:

```text
Provider Policy
   │
   ├── Allowed recipients
   ├── Time limits
   ├── Data limits
   ├── Bandwidth limits
   └── Other restrictions
```

Policies may be applied to:

* Providers
* Recipients
* Relationships
* Organizations
* Networks

---

# 18. Connection

A **Connection** represents an active or attempted network relationship between endpoints.

```text
Provider
   │
   ▼
Connection
   ▲
   │
Recipient
```

A connection may move through states such as:

```text
Requested
   ↓
Authorized
   ↓
Connecting
   ↓
Connected
   ↓
Disconnected
```

The exact state model will be defined later.

---

# 19. Tunnel

A **Tunnel** represents the secure Data Plane transport between endpoints.

```text
Provider
   │
   │ encrypted tunnel
   ▼
Recipient
```

A tunnel is an implementation of a connection path.

Therefore:

```text
Connection
    │
    ▼
Tunnel
```

A connection can have different underlying paths or transport states.

---

# 20. Path

A **Path** represents the network route used to transport traffic between endpoints.

Possible path types include:

```text
Direct
   │
   ├── Local network
   └── Internet

Fallback
   │
   └── Relay
```

The preferred path is generally direct endpoint-to-endpoint connectivity.

Path selection belongs primarily to the connection and Data Plane architecture.

---

# 21. Relay

A **Relay** is a network participant that forwards encrypted traffic when endpoints cannot establish a direct path.

Conceptually:

```text
Provider
    │
    ▼
Relay
    │
    ▼
Recipient
```

A relay is different from the Zoop Control Plane.

```text
Control Plane
    │
    └── coordinates

Relay
    │
    └── forwards Data Plane traffic
```

Zoop should prefer direct connectivity whenever possible.

---

# 22. Cloud

**Zoop Cloud** represents the cloud infrastructure responsible primarily for Control Plane services.

It may contain:

```text
Zoop Cloud
   │
   ├── Identity
   ├── Authentication
   ├── Authorization
   ├── Discovery
   ├── Signaling
   ├── Relationships
   └── Policy
```

The Cloud should not automatically be assumed to carry normal Internet traffic.

---

# 23. Discovery Record

A **Discovery Record** represents information that allows an endpoint to be discovered and potentially connected to.

It may conceptually contain:

```text
Endpoint identity
Availability
Network information
Connection candidates
Capabilities
```

The exact structure will be determined later.

Discovery information should be treated as potentially sensitive metadata.

---

# 24. Signaling Session

A **Signaling Session** represents Control Plane communication used to coordinate connection establishment.

```text
Provider
   │
   ▼
Signaling
   ▲
   │
Recipient
```

Signaling may coordinate:

* connection candidates
* connection state
* path establishment
* connection updates
* recovery

Signaling is not the actual Data Plane traffic.

---

# 25. Route

A **Route** describes where packets should be sent.

For example:

```text
Recipient
   │
   ▼
Route
   │
   ▼
Zoop Tunnel
```

Routes may determine whether traffic goes:

```text
Local network
```

or:

```text
Zoop Provider
```

Routing is a Data Plane concern.

---

# 26. NAT Context

A **NAT Context** represents the address translation state involved when an endpoint communicates through a network using NAT.

For example:

```text
Recipient
   │
   ▼
Provider
   │
   ▼
NAT
   │
   ▼
Internet
```

NAT is not a user-facing Zoop entity in the same sense as Account or Endpoint.

It is a networking state associated with the Data Plane.

---

# 27. Usage Record

A **Usage Record** represents information about how a Zoop relationship or connection is being used.

Possible measurements include:

```text
Duration
Data transferred
Connection time
Bandwidth
Other usage metrics
```

Usage may eventually support:

* limits
* quotas
* billing
* reporting
* organizational management

The exact usage model remains open.

---

# 28. Organization Membership

An **Organization Membership** represents the relationship between an account and an organization.

```text
Account
   │
   ▼
Organization Membership
   │
   ▼
Organization
```

Membership may eventually contain:

* role
* permissions
* status
* organizational policies

The exact model is not yet finalized.

---

# 29. Entity Relationships

The core relationship model can be represented as:

```text
                         Person
                           │
                           ▼
                        Account
                           │
                 ┌─────────┴─────────┐
                 │                   │
              Device             Organization
                 │                   │
                 ▼                   │
              Endpoint ◄─────────────┘
                 │
        ┌────────┴────────┐
        │                 │
     Provider          Recipient
        │                 │
        └────────┬────────┘
                 │
          Sharing Relationship
                 │
              Policy
                 │
            Authorization
                 │
              Connection
                 │
               Tunnel
                 │
                Path
                 │
              Network
                 │
              Internet
```

This diagram represents relationships conceptually, not a database schema.

---

# 30. Identity Relationship

A simplified identity model is:

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
Endpoint Identity
```

An organization may also own or manage accounts and devices:

```text
Organization
   │
   ├── Accounts
   ├── Devices
   └── Endpoints
```

---

# 31. Provider Relationship

The Provider side can be represented as:

```text
Provider Endpoint
       │
       ▼
Internet Connection
       │
       ▼
Sharing Relationship
       │
       ▼
Recipient Endpoint
```

The Provider supplies the connectivity.

The Sharing Relationship determines whether the Recipient may use it.

---

# 32. Recipient Relationship

The Recipient side is:

```text
Recipient Endpoint
       │
       ▼
Authorization
       │
       ▼
Sharing Relationship
       │
       ▼
Provider Endpoint
       │
       ▼
Internet Connection
```

The Recipient does not automatically gain access simply because it can discover a Provider.

Authorization is required.

---

# 33. Entity Lifecycle

A simplified endpoint lifecycle is:

```text
Device Created
      │
      ▼
Identity Established
      │
      ▼
Endpoint Registered
      │
      ▼
Discovery Available
      │
      ▼
Relationship Created
      │
      ▼
Authorization Granted
      │
      ▼
Connection Established
      │
      ▼
Data Plane Active
      │
      ▼
Connection Closed / Revoked
```

This lifecycle spans both Control Plane and Data Plane.

---

# 34. Entity Ownership

Entities may have different ownership relationships.

For example:

```text
Person
  │
  └── owns ──► Account
                  │
                  └── manages ──► Device
                                      │
                                      └── runs ──► Endpoint
```

An organization may instead manage devices:

```text
Organization
      │
      └── manages ──► Device
```

The exact ownership model remains to be finalized.

---

# 35. Entity vs Role

It is important not to turn every concept into a permanent database entity.

For example:

```text
Provider
Recipient
```

are primarily **roles**.

Whereas:

```text
Account
Device
Endpoint
Organization
```

are more fundamental entities.

Similarly:

```text
Tunnel
Route
NAT Context
```

are primarily Data Plane/networking concepts.

This distinction should prevent unnecessary complexity in the eventual data model.

---

# 36. Entity Categories

The entities can be grouped into four categories.

### Identity entities

```text
Person
Account
Organization
Identity
Device
Endpoint
```

### Relationship entities

```text
Sharing Relationship
Organization Membership
Authorization
Policy
```

### Networking entities

```text
Network
Network Interface
Internet Connection
Connection
Tunnel
Path
Relay
Route
NAT Context
```

### Operational entities

```text
Discovery Record
Signaling Session
Usage Record
```

---

# 37. Control Plane Entities

The Control Plane primarily manages:

```text
Person
Account
Organization
Identity
Device
Endpoint
Sharing Relationship
Authorization
Policy
Discovery Record
Signaling Session
Usage Record
```

---

# 38. Data Plane Concepts

The Data Plane primarily operates on:

```text
Endpoint
Network Interface
Connection
Tunnel
Path
Route
NAT Context
Relay
Internet Connection
```

The same Endpoint participates in both planes.

```text
                   Endpoint
                      │
          ┌───────────┴───────────┐
          │                       │
      Control Plane           Data Plane
          │                       │
     Identity/Auth           Tunnel/Routing
     Discovery               Forwarding/NAT
     Signaling
```

---

# 39. Important Distinctions

### Account ≠ Device

An account represents a participant.

A device is a physical or computing resource.

### Device ≠ Endpoint

A device becomes an endpoint when it participates in Zoop networking.

### Identity ≠ Account

An account represents an ownership/participation context.

Identity proves who or what is participating.

### Provider ≠ Device Type

Provider is a role an endpoint performs.

### Recipient ≠ Device Type

Recipient is also a role.

### Connection ≠ Tunnel

A connection represents the broader connectivity relationship.

A tunnel is one mechanism used to carry traffic.

### Control Plane ≠ Data Plane

Control coordinates.

Data transports.

### Zoop Cloud ≠ Relay

Zoop Cloud provides Control Plane services.

A relay, if used, participates in the Data Plane.

---

# 40. Complete Entity Model

The current conceptual entity model is:

```text
                         PERSON
                           │
                           ▼
                        ACCOUNT
                           │
              ┌────────────┴────────────┐
              │                         │
            DEVICE                  ORGANIZATION
              │                         │
              ▼                         │
           ENDPOINT ◄───────────────────┘
              │
       ┌──────┴──────┐
       │             │
    PROVIDER      RECIPIENT
       │             │
       └──────┬──────┘
              │
       SHARING RELATIONSHIP
              │
          AUTHORIZATION
              │
            POLICY
              │
          CONNECTION
              │
            TUNNEL
              │
             PATH
              │
           ROUTING
              │
          FORWARDING
              │
             NAT
              │
           NETWORK
              │
           INTERNET
```

This is the current vocabulary for Zoop.

---

# 41. Current Open Questions

The following should remain open until the relevant architecture is designed:

* Exact Account model
* Person vs Account relationship
* Organization ownership model
* Device registration model
* Endpoint identity model
* Multiple endpoints per device
* Provider/Recipient role model
* Sharing relationship representation
* Authorization model
* Policy model
* Discovery record structure
* Signaling session model
* Connection identity
* Usage accounting
* Organization membership
* Device revocation
* Entity lifecycle
* Data retention
* Metadata privacy

These questions should be resolved progressively rather than prematurely.

---

# 42. Summary

Zoop's most important entities are:

```text
Person
Account
Organization
Identity
Device
Endpoint
Provider
Recipient
Network
Sharing Relationship
Authorization
Policy
Connection
Tunnel
Path
Relay
Route
Internet Connection
```

The most important conceptual relationship is:

```text
Provider Endpoint
        │
        │
 Sharing Relationship
        │
        ▼
Recipient Endpoint
        │
        │
      Tunnel
        │
        ▼
     Internet
```

The most important modeling principle is:

> **Provider and Recipient are roles performed by endpoints, not fundamentally different kinds of devices.**

The entity model should remain simple enough to support future Zoop capabilities without forcing future assumptions into the core architecture.
