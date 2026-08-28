# Zoop Security

## 1. Purpose

This document defines the security model for Zoop.

Zoop security must protect:

* users
* devices
* identities
* organizations
* sharing relationships
* tunnels
* network traffic
* Control Plane services
* Data Plane connections

The primary principle is:

> **Only authenticated and authorized endpoints should be able to establish and use Zoop connections.**

---

# 2. Security Architecture

Zoop security spans both planes:

```text
                         ZOOP SECURITY
                              │
             ┌────────────────┴────────────────┐
             │                                 │
        CONTROL PLANE                      DATA PLANE
             │                                 │
        Identity/Auth                    Endpoint Identity
        Authorization                    Secure Tunnel
        Policies                         Encryption
        Device Management                Peer Authentication
             │                                 │
             └──────────────┬──────────────────┘
                            │
                         Endpoint
```

The Control Plane establishes **who is allowed to connect**.

The Data Plane protects the actual connection.

---

# 3. Security Principles

Zoop follows these principles:

1. Identity first
2. Explicit authorization
3. Encryption in transit
4. Least privilege
5. Device-level trust
6. Separation of Control Plane and Data Plane
7. No custom cryptography
8. Secure defaults
9. Revocation
10. Minimal unnecessary data collection

---

# 4. Human Identity

A user has a Zoop account identity.

```text id="4lq6gx"
Human
  │
  ▼
Account
  │
  ▼
Authenticated User
```

Authentication establishes that the user controls the account.

However, the user account alone is not sufficient to identify every network endpoint.

---

# 5. Device Identity

Every Zoop endpoint should have its own identity.

```text id="f1k8h2"
User
 │
 ├── Phone
 │     └── Device Identity
 │
 ├── Laptop
 │     └── Device Identity
 │
 └── Router
       └── Device Identity
```

This allows Zoop to distinguish individual devices belonging to the same user.

---

# 6. Device Keys

A device should possess cryptographic key material used to establish its identity.

Conceptually:

```text id="w8f1qt"
Device
  │
  └── Private Key
          │
          ▼
     Device Identity
```

Private keys must remain under the control of the device.

They should not be unnecessarily transmitted to Zoop Cloud.

---

# 7. Public and Private Keys

The general model is:

```text id="e2w9mz"
Device
  │
  ├── Private Key → kept secret
  │
  └── Public Key  → can be shared
```

The public key can be associated with the device's identity.

The private key is used to prove control of the device identity.

---

# 8. Authentication

Authentication occurs primarily in the Control Plane.

```text id="d3w7r9"
User
 │
 ▼
Authentication
 │
 ▼
Zoop Account
 │
 ▼
Authorized Session
```

Authentication may eventually support mechanisms such as:

* passwordless authentication
* passkeys
* OAuth-style identity providers
* multi-factor authentication

The exact authentication mechanisms are an implementation decision.

---

# 9. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Zoop keeps these concepts separate.

```text id="s4f1y2"
Identity
   │
   ▼
Authentication
   │
   ▼
Authorization
   │
   ▼
Allowed Action
```

---

# 10. Connection Authorization

Before a Recipient uses a Provider:

```text id="j7v5q2"
Recipient
    │
    ▼
Is this device authorized?
    │
 ┌──┴──┐
 │     │
 YES    NO
 │
 ▼
Connect
```

Unauthorized endpoints should not be able to use the resource.

---

# 11. Sharing Security

Sharing creates an explicit authorization relationship.

```text id="x5a8m1"
Provider
   │
   ▼
Sharing Relationship
   │
   ▼
Authorized Recipient
```

A Provider should not automatically become available to every Zoop user.

---

# 12. Organization Security

Organizations control access to their resources.

```text id="j9v3c6"
Organization
      │
      ├── Members
      ├── Devices
      ├── Roles
      └── Policies
```

Membership alone should not necessarily grant access to every resource.

Authorization policies determine what a member or device may use.

---

# 13. Roles

Organizations can use roles to control administrative capabilities.

Example:

```text id="a3h7k8"
Owner
  │
Admin
  │
Member
  │
Viewer
```

Roles should follow least-privilege principles.

A user should receive only the permissions necessary for their role.

---

# 14. Device Enrollment

A device should be enrolled before becoming a trusted organization endpoint.

```text id="k2d9m5"
New Device
    │
    ▼
Authentication
    │
    ▼
Enrollment
    │
    ▼
Trusted Device
```

Enrollment establishes the relationship between:

```text
User
Organization
Device
```

---

# 15. Device Revocation

A compromised or unwanted device must be revocable.

```text id="v5n8c2"
Trusted Device
      │
      ▼
    Revoke
      │
      ▼
No longer trusted
```

Revocation should prevent continued access to organization-controlled resources.

---

# 16. Tunnel Security

The Data Plane must use an established secure tunnel protocol.

The current direction is to use a proven technology such as WireGuard rather than creating a custom cryptographic tunnel.

```text id="y2f8p6"
Provider
   │
   │ encrypted tunnel
   ▼
Recipient
```

The tunnel protects traffic while it traverses untrusted networks.

---

# 17. End-to-End Data Protection

The preferred model is:

```text id="g7m4x1"
Provider
   │
   │ encrypted
   ▼
Network
   │
   │ encrypted
   ▼
Recipient
```

Intermediate infrastructure should not need access to the user's plaintext traffic.

---

# 18. Zoop Cloud and User Traffic

Zoop Cloud should primarily coordinate connections.

```text id="h8k2p9"
                 Zoop Cloud
                     │
              Coordination
                     │
        ┌────────────┴────────────┐
        │                         │
     Provider                 Recipient
        │                         │
        └──── encrypted tunnel ───┘
```

The normal Data Plane should not require Zoop Cloud to inspect or forward user Internet traffic.

---

# 19. Relay Security

If a relay is required:

```text id="c3v7m8"
Provider
   │
   │ encrypted
   ▼
 Relay
   │
   │ encrypted
   ▼
Recipient
```

The relay should forward encrypted traffic without requiring access to the plaintext.

Direct connectivity remains preferred.

---

# 20. Control Plane Security

Zoop Cloud must protect:

* account credentials
* device identities
* public keys
* authorization relationships
* organization data
* policies
* session information
* administrative actions

The Cloud is a high-value security boundary.

---

# 21. API Security

Zoop APIs must authenticate clients and authorize actions.

Conceptually:

```text id="q4n6s1"
Client
  │
  ▼
Authentication
  │
  ▼
Authorization
  │
  ▼
API
  │
  ▼
Action
```

An authenticated client should not automatically have unrestricted access.

---

# 22. Session Security

Control Plane sessions should have:

* expiration
* revocation
* appropriate token protection
* secure transport
* scoped permissions

Long-lived credentials should be avoided where unnecessary.

---

# 23. Transport Security

Control Plane communication should use secure transport.

Conceptually:

```text id="z7b2p4"
Endpoint
   │
   │ secure connection
   ▼
Zoop API
```

TLS or another established secure transport mechanism should be used rather than plaintext communication.

---

# 24. Key Management

Keys are one of the most important security components of Zoop.

The architecture should support:

```text id="n5h3r7"
Key generation
Key storage
Key rotation
Key revocation
Key replacement
```

Private keys should remain protected by the endpoint whenever possible.

---

# 25. Key Rotation

Zoop should support replacing cryptographic keys when necessary.

```text id="p2k8w5"
Old Key
   │
   ▼
Rotation
   │
   ▼
New Key
```

Reasons can include:

* suspected compromise
* device replacement
* security policy
* periodic rotation
* administrative action

---

# 26. Compromised Device

If a device is compromised:

```text id="m8c4y1"
Compromised Device
       │
       ▼
Revoke Identity
       │
       ▼
Invalidate Access
       │
       ▼
Replace Keys
```

The architecture should allow one compromised device to be isolated without compromising the entire organization.

---

# 27. Least Privilege

Every identity should have only the permissions required for its purpose.

For example:

```text id="r6p3v9"
Recipient
   │
   └── Can use authorized Provider

Member
   │
   └── Can perform permitted actions

Admin
   │
   └── Can manage organization resources
```

No role should automatically receive unnecessary privileges.

---

# 28. Zero-Trust Principle

Zoop should not assume that a device is trustworthy simply because it is connected to a particular network.

The model should be:

```text id="t4m8q6"
Identity
   +
Device
   +
Authorization
   +
Policy
   ↓
Access
```

Network location alone should not determine trust.

---

# 29. Device Trust

A device can have different trust states.

Conceptually:

```text id="q1v7x3"
Unknown
   │
   ▼
Registered
   │
   ▼
Trusted
   │
   ├── Revoked
   │
   └── Suspended
```

The exact state model can evolve.

---

# 30. Network Security

Zoop must assume that the underlying network can be hostile.

For example:

```text id="b5x2m8"
Public Wi-Fi
Untrusted ISP
Corporate network
Cellular network
Internet
```

The Zoop tunnel should protect traffic from network-level observation or modification where the protocol provides those guarantees.

---

# 31. NAT and Firewall Security

NAT traversal should not mean blindly opening permanent access to devices.

Zoop should establish connectivity based on:

```text id="n3w8f5"
Authenticated identity
+
Authorized relationship
+
Secure tunnel
```

NAT traversal is a connectivity mechanism, not an authorization mechanism.

---

# 32. Provider Security

A Provider is exposing network access to another endpoint.

Therefore Providers need controls over:

* who can connect
* when they can connect
* what is shared
* whether sharing can be revoked

Example:

```text id="s7c4m2"
Provider
   │
   ▼
Sharing Policy
   │
   ▼
Authorized Recipients
```

---

# 33. Recipient Security

Recipients should not be able to access Providers without authorization.

A Recipient must have:

```text id="y6k2q9"
Valid identity
     +
Valid authorization
     +
Valid connection
```

before using the Provider.

---

# 34. Router Security

Routers require additional protection because they can provide access to an entire network.

```text id="h2p7c5"
Zoop Router
    │
    ├── WAN
    ├── LAN
    ├── Routing
    ├── NAT
    └── Zoop Tunnel
```

Router administration should be strongly authenticated and restricted.

---

# 35. Organization Isolation

Organizations should be isolated from one another.

```text id="v4m8s2"
Organization A
    │
    └── Resources

Organization B
    │
    └── Resources
```

Membership in Organization A should not automatically provide access to Organization B.

---

# 36. Data Minimization

Zoop should collect only the Control Plane information necessary to operate the service.

The architecture should avoid unnecessary collection of:

* user traffic contents
* unnecessary browsing information
* unnecessary packet data
* unnecessary location information

The Data Plane should remain separate from Control Plane metadata whenever possible.

---

# 37. Privacy Boundary

The intended boundary is:

```text id="p8x4w1"
             Zoop Cloud
                 │
       Knows coordination data
                 │
                 X
                 │
          User traffic
                 │
                 ▼
          Secure Data Plane
```

Zoop should minimize visibility into the contents of user traffic.

---

# 38. Auditability

Organizations should eventually be able to see important security events.

Examples:

```text id="f3q7m5"
Login
Device enrolled
Device revoked
Provider shared
Permission changed
Policy changed
Administrator action
```

This helps organizations investigate security events.

---

# 39. Abuse Prevention

Zoop must account for potential misuse.

Potential controls include:

```text id="r2m6x9"
Rate limits
Account controls
Provider controls
Organization policies
Device revocation
Abuse reporting
Connection restrictions
```

The exact abuse-prevention system can be designed later.

---

# 40. Secrets

Secrets should never be committed to source control.

Examples:

```text id="w5n8k3"
API credentials
Private keys
Database credentials
Signing keys
Service secrets
```

These should be managed through appropriate secret-management mechanisms.

---

# 41. Secure Development

Zoop development should include:

* dependency updates
* vulnerability scanning
* code review
* automated tests
* security testing
* secret scanning
* dependency auditing
* minimal privileges for services

Security should be part of development rather than a final-stage activity.

---

# 42. Dependency Security

Zoop should prefer:

* established libraries
* actively maintained dependencies
* well-understood protocols
* minimal unnecessary dependencies

Critical security dependencies should be monitored for vulnerabilities.

---

# 43. Cryptographic Principle

Zoop will not invent cryptographic algorithms.

The principle is:

> **Use proven cryptographic protocols and implementations rather than designing custom cryptography.**

This applies especially to:

* encryption
* authentication
* key exchange
* secure tunnels
* signatures

---

# 44. Security Boundaries

The major security boundaries are:

```text id="j3f7q2"
User
 │
 ▼
Identity
 │
 ▼
Zoop Cloud
 │
 ▼
Authorization
 │
 ▼
Device
 │
 ▼
Secure Tunnel
 │
 ▼
Remote Device
```

Each boundary must be explicitly protected.

---

# 45. Threat Model

Zoop should consider threats including:

```text id="m9c2v7"
Account compromise
Device compromise
Stolen credentials
Malicious users
Unauthorized devices
Network interception
Man-in-the-middle attacks
Replay attempts
Cloud compromise
Relay compromise
Misconfigured sharing
Abusive Providers
```

Detailed threat modeling can be expanded as the implementation progresses.

---

# 46. Security vs Connectivity

Security must not be weakened simply to make connectivity easier.

The desired sequence is:

```text id="q8m4z1"
Discover
   │
   ▼
Authenticate
   │
   ▼
Authorize
   │
   ▼
Establish secure tunnel
   │
   ▼
Exchange traffic
```

Not:

```text id="b7x3k5"
Connect first
   │
   ▼
Figure out security later
```

---

# 47. Security and Direct Connectivity

Direct connectivity does not mean unauthenticated connectivity.

The correct model is:

```text id="d6r2p8"
        Direct
          │
          +
     Authenticated
          │
          +
      Authorized
          │
          +
       Encrypted
          │
          ▼
       Connection
```

This is a fundamental Zoop principle.

---

# 48. Future Security

Future security capabilities may include:

```text id="s5n9w3"
Passkeys
Hardware-backed keys
Device attestation
Advanced organization policies
Fine-grained network policies
Security analytics
Automated key rotation
Advanced threat detection
```

These are future possibilities, not current requirements.

---

# 49. Security Decisions

Current security decisions:

```text id="v8m2q6"
✓ Separate Control Plane and Data Plane
✓ Device-level identity
✓ Explicit authorization
✓ Encrypted Data Plane
✓ Direct connectivity preferred
✓ Relay as fallback
✓ No custom cryptography
✓ Device revocation
✓ Organization isolation
✓ Least privilege
✓ Minimize unnecessary traffic visibility
```

---

# 50. Open Security Decisions

The following remain open for later technical design:

```text id="n4c7s2"
Exact authentication mechanism
Exact identity protocol
Exact key storage mechanism
Exact WireGuard integration
Exact device enrollment protocol
Exact token format
Exact API security model
Detailed threat model
Security monitoring architecture
Compliance requirements
```

These should be resolved when implementation design begins.

---

# 51. Security Summary

The Zoop security model can be summarized as:

```text id="p6w3x9"
                       USER
                         │
                         ▼
                     IDENTITY
                         │
                         ▼
                   AUTHENTICATION
                         │
                         ▼
                   AUTHORIZATION
                         │
                         ▼
                      DEVICE
                         │
                         ▼
                  SECURE TUNNEL
                         │
                         ▼
               PROVIDER ↔ RECIPIENT
                         │
                         ▼
                      TRAFFIC
```

The central principle is:

> **Identity determines who an endpoint is. Authorization determines what it may access. The secure Data Plane protects the resulting connection.**

Zoop should therefore remain secure without sacrificing its primary networking objective:

> **Direct, fast, reliable, authorized device-to-device connectivity.**
