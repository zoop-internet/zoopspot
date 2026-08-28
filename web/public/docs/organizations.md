# Zoop Organizations

## 1. Purpose

An Organization is a group of people, devices, and resources managed together within Zoop.

Organizations allow Zoop to move beyond individual device-to-device connections and support:

* teams
* companies
* schools
* families
* communities
* managed networks
* other groups

The Organization is primarily a **Control Plane concept**.

---

# 2. Organization Model

The basic relationship is:

```text
Organization
     │
     ├── Members
     │
     ├── Devices
     │
     ├── Providers
     │
     ├── Recipients
     │
     ├── Relationships
     │
     └── Policies
```

The Organization does not itself carry Data Plane traffic.

It manages who is allowed to connect and how.

---

# 3. Organization and Users

A user can belong to an Organization.

```text
Organization
      │
 ┌────┼────┐
 │    │    │
User User User
```

Users can have different permissions.

For example:

```text
Owner
Admin
Member
Viewer
```

The exact role system can evolve later.

---

# 4. Organization and Devices

Users can have multiple devices.

```text
Organization
      │
      ▼
    User
      │
 ┌────┼────┐
 │    │    │
Phone Laptop Tablet
```

Devices become Zoop endpoints.

Each endpoint has its own identity and connection capabilities.

---

# 5. Organization and Endpoints

An organization may contain:

```text
Organization
      │
      ├── Android Phone
      ├── iPhone
      ├── Laptop
      ├── Desktop
      └── Zoop Router
```

Each endpoint can have a different role.

For example:

```text
Router → Provider
Laptop → Recipient
Phone  → Recipient
```

---

# 6. Provider

A Provider is an endpoint that makes a resource available to authorized recipients.

The resource could include:

* Internet connectivity
* network access
* other future Zoop services

Example:

```text
Organization
      │
      ▼
Zoop Router
   Provider
      │
      │ Internet
      ▼
Authorized Devices
```

---

# 7. Recipient

A Recipient is an endpoint that consumes a shared resource.

Example:

```text
Provider
    │
    │ Zoop tunnel
    ▼
Recipient
    │
    ▼
Internet
```

Provider and Recipient are **connection roles**, not necessarily permanent device types.

A device may potentially perform either role.

---

# 8. Sharing

Organizations manage sharing relationships.

```text
Provider
    │
    │ share
    ▼
Organization
    │
    │ authorize
    ▼
Recipient
```

The organization determines whether a recipient is allowed to use a Provider.

---

# 9. Sharing Relationship

A relationship can conceptually be represented as:

```text
Provider
   │
   │
   ▼
Sharing Relationship
   │
   │
   ▼
Recipient
```

The relationship can include:

* who is providing
* who can receive
* what is shared
* when it is available
* applicable policies
* status

---

# 10. Organization Policy

Organizations may define policies governing connectivity.

Examples:

```text
Who can connect?
What can they use?
When can they connect?
Which Providers can they use?
Which devices are trusted?
```

Conceptually:

```text
Organization
      │
      ▼
   Policies
      │
      ▼
Authorization
```

---

# 11. Authorization

Authorization answers:

> Is this endpoint allowed to use this resource?

Example:

```text
Recipient
    │
    ▼
Authorization Check
    │
 ┌──┴──┐
 │     │
Yes    No
 │
 ▼
Connect
```

Authorization belongs to the Control Plane.

The Data Plane enforces the resulting connection permissions.

---

# 12. Organization Roles

A simple initial model can be:

```text
Owner
  │
  ├── Full organization control
  │
Admin
  │
  ├── Manage members/devices/policies
  │
Member
  │
  ├── Use permitted Zoop resources
  │
Viewer
  │
  └── View organization information
```

The exact permission matrix can be defined later.

---

# 13. Organization Ownership

An Organization should have an owner.

```text
Organization
      │
      ▼
    Owner
```

The owner is responsible for the organization and can manage its administrative configuration.

Organizations should also support multiple administrators to avoid creating a single point of administrative failure.

---

# 14. Members

Members represent people belonging to the organization.

```text
Organization
      │
 ┌────┼────────┐
 │    │        │
Alice Bob     Carol
```

A member may have:

* identity
* roles
* devices
* permissions
* organization relationships

---

# 15. Devices

A device belongs to a user or organization context.

```text
Member
  │
  ├── Phone
  ├── Laptop
  └── Desktop
```

Devices should have their own cryptographic identity.

The user's identity and the device's identity should not be treated as the same thing.

---

# 16. Device Enrollment

A device must be enrolled before an organization can manage it.

Conceptually:

```text
User
 │
 ▼
Organization
 │
 ▼
Device Enrollment
 │
 ▼
Trusted Device
```

Enrollment establishes the relationship between the device and the organization.

---

# 17. Device Revocation

Organizations must be able to remove a device.

```text
Trusted Device
      │
      ▼
   Revoke
      │
      ▼
Untrusted Device
```

Revocation should prevent the device from continuing to use organization-controlled resources.

The detailed mechanism belongs in `security.md`.

---

# 18. Organizations and the Control Plane

Organizations are managed by Zoop Cloud.

```text
                 Zoop Cloud
                     │
             ┌───────┴───────┐
             │               │
        Organization      Identity
             │               │
       ┌─────┼─────┐         │
       │     │     │         │
    Members Devices Policies
```

The Cloud maintains the authoritative organization state.

---

# 19. Organizations and the Data Plane

The Organization does not sit in the path of normal endpoint traffic.

Preferred architecture:

```text
              Zoop Cloud
                  │
             Authorization
                  │
        ┌─────────┴─────────┐
        │                   │
     Provider            Recipient
        │                   │
        └──── Direct ───────┘
              Tunnel
```

This preserves the goal of direct endpoint connectivity.

---

# 20. Organization Example

A company could have:

```text
Acme Organization
      │
      ├── Admins
      │
      ├── Employees
      │
      ├── Zoop Router
      │      └── Provider
      │
      ├── Laptops
      │      └── Recipients
      │
      └── Phones
             └── Recipients
```

The router can provide Internet connectivity to authorized employee devices.

---

# 21. Multiple Organizations

A user may eventually belong to multiple organizations.

```text
              User
             /    \
            /      \
           ▼        ▼
      Organization A   Organization B
```

This is useful for people who:

* work for multiple companies
* belong to a school and a community
* manage multiple businesses
* use Zoop personally and professionally

The exact multi-organization model can be finalized later.

---

# 22. Organization Isolation

Organizations should be logically isolated.

```text
Organization A
      │
      └── Devices / Policies

Organization B
      │
      └── Devices / Policies
```

Membership in one organization should not automatically grant access to another organization's resources.

---

# 23. Organization Boundaries

The organization boundary should control:

```text
Identity
Members
Devices
Roles
Policies
Sharing
Authorization
```

It should not define:

```text
Packet forwarding
Tunnel transport
Internet routing
```

Those belong to the Data Plane.

---

# 24. Personal vs Organization Zoop

Zoop can support both personal and organizational use.

### Personal

```text
User
 │
 ├── Phone
 ├── Laptop
 └── Router
```

### Organization

```text
Organization
 │
 ├── Members
 ├── Devices
 ├── Providers
 ├── Recipients
 └── Policies
```

The underlying Zoop endpoint and connection architecture should remain the same.

---

# 25. Organization Architecture

The complete conceptual model is:

```text
                         ZOOP
                           │
                     Zoop Cloud
                           │
                    Organization
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
    Members              Devices            Policies
       │                   │                   │
       │            ┌──────┴──────┐            │
       │            │             │            │
       │         Provider      Recipient       │
       │            │             │            │
       └────────────┼─────────────┘            │
                    │                          │
                    └──── Authorization ───────┘
                               │
                               ▼
                         Direct Tunnel
```

---

# 26. Organization Security

Organizations should have control over:

* membership
* device enrollment
* device removal
* roles
* sharing
* authorization
* policies
* administrative actions

Security details are defined separately in `security.md`.

---

# 27. Organization Audit

The Control Plane should eventually be able to record important organizational events.

Examples:

```text
Member added
Device enrolled
Device revoked
Provider shared
Recipient authorized
Policy changed
Administrator changed
```

This provides accountability for organizational deployments.

---

# 28. Organization Scaling

The architecture should support organizations ranging from:

```text
1 person
   │
   ▼
small team
   │
   ▼
company
   │
   ▼
large organization
```

The fundamental model should not change as the organization grows.

---

# 29. Organization Principle

The key principle is:

> **Organizations define who belongs to Zoop, what they are allowed to use, and how resources are shared. They coordinate access but do not need to carry the Data Plane.**

This preserves Zoop's central architectural goal:

```text
Control Plane
      │
   authorize
      │
      ▼
Direct Data Plane
      │
      ▼
Provider ↔ Recipient
```

---

# 30. Summary

Zoop Organizations provide the management layer for groups of users and devices.

The hierarchy is:

```text
Organization
     │
     ├── Members
     │      │
     │      └── Devices
     │
     ├── Providers
     │
     ├── Recipients
     │
     ├── Sharing Relationships
     │
     └── Policies
```

The Control Plane manages these relationships.

The Data Plane carries the actual traffic.

The intended result is:

> **Organizations control access; endpoints carry the traffic.**
