# Zoop Web Architecture
## 1. Purpose
The Zoop Web application is the **management interface for Zoop**.
It provides separate experiences for:
- Individual Zoop users
- Organization administrators and members
- Zoop operators and administrators
The Web layer manages Zoop through the Control Plane API.
It does **not** carry normal Zoop Internet traffic.
```text
                         ZOOP WEB
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       USERS          ORGANIZATIONS       ZOOP ADMIN
   app.zoop.com       app.zoop.com      admin.zoop.com
          │                 │                 │
      Personal          Organization       Zoop
      Zoop use          Management        Operations
```
The fundamental separation is:
```text
Web        → manages Zoop
Control    → coordinates Zoop
Agent      → performs networking
Data Plane → carries Internet traffic
```
---
# 2. Web Applications
Zoop uses two distinct Web applications.
```text
Customer Application
app.zoop.com
        │
        ├── Individual Users
        └── Organizations
Zoop Administration
admin.zoop.com
        │
        └── Zoop Operators
```
The applications are separately deployed and separately protected.
The customer application does not contain the Zoop Admin application functionality.
The Admin application is accessible only to authorized Zoop personnel.
---
# 3. Technology
The Web layer uses:
* **React** — user interface
* **TypeScript** — application and API type safety
* **Vanilla CSS** — styling and design system
* **Zoop API (Go)** — Control Plane communication
* **REST / JSON** — standard API communication
* **WebSocket** — real-time Control Plane updates
```text
React + TypeScript
        │
        │ HTTPS / WebSocket
        ▼
    Zoop API
        │
        ▼
   Go Control Plane
        │
   ┌────┴────┐
   │         │
PostgreSQL Redis
```
---
# 4. Access Model
Access is determined by:
1. Identity
2. Authentication
3. Role
4. Organization membership
5. Resource ownership
6. Authorization policy
7. Application/domain access
```text
                         ZOOP WEB
                            │
             ┌──────────────┼──────────────┐
             │              │              │
           USER          ORG USER       ZOOP ADMIN
             │              │              │
       Personal Zoop    Org resources   Platform
                                          operations
```
A user does not gain organization-wide access simply because they own a device.
An organization administrator does not gain Zoop platform administration privileges.
A Zoop administrator is a separate platform role.
---
# 5. Individual Users
Individual users access Zoop through:
```text
app.zoop.com
```
Their Web experience is focused on managing their personal Zoop identity, devices, connections, and sharing relationships.
## User capabilities
Users can:
* manage their account
* manage identity and security
* register and manage devices
* view device status
* act as a Provider
* act as a Recipient
* create sharing relationships
* accept sharing requests
* revoke sharing
* establish authorized connections
* disconnect connections
* view connection status
* view direct/relay path status
* view usage
* manage account settings
---
# 6. Individual User Dashboard
The dashboard provides a high-level view of the user's Zoop activity.
```text
Dashboard
│
├── Devices
├── Active Connections
├── Provider Status
├── Recipient Status
├── Sharing
├── Usage
└── Security
```
The dashboard should make the state of Zoop understandable without requiring the user to understand networking internals.
---
# 7. User Devices
Users can manage their registered Zoop endpoints.
```text
Devices
│
├── Device list
├── Device details
├── Device status
├── Device capabilities
├── Rename device
└── Revoke device
```
The Web application manages the device record.
The actual Zoop Agent running on the device performs networking.
---
# 8. User Connections
Users can view and manage authorized connections.
```text
Connections
│
├── Active
├── Connecting
├── Direct
├── Relayed
├── Reconnecting
└── Disconnected
```
A connection may show:
* Provider
* Recipient
* Connection state
* Path
* Connection duration
* Relevant usage
* Availability
The Web interface does not transport the connection's Internet traffic.
---
# 9. User Sharing
Sharing is a core Zoop feature.
```text
Provider
    │
    │ shares connectivity
    ▼
Recipient
```
Users can:
* create sharing relationships
* view sharing relationships
* accept requests
* reject requests
* modify permissions
* revoke access
The Control Plane enforces the authorization.
---
# 10. Provider Experience
A user can configure an eligible device as a Provider.
The Web interface allows the Provider to manage:
* Provider status
* sharing relationships
* authorized Recipients
* device availability
* usage
* connection history
* permissions
The Provider's device is responsible for actually forwarding traffic.
---
# 11. Recipient Experience
A user can act as a Recipient.
The Web interface allows the Recipient to:
* view available authorized Providers
* request access
* manage approved relationships
* establish connections
* view connection state
* view usage
* disconnect
The Recipient's Zoop Agent establishes the Data Plane tunnel.
---
# 12. Usage
Users can view relevant connectivity information.
Examples include:
* data transferred
* active connection time
* Provider usage
* Recipient usage
* connection history
Usage information comes from the Control Plane and endpoint reporting.
The Web application does not inspect the contents of Internet traffic.
---
# 13. Security
Users can manage:
* authentication
* account security
* MFA
* registered devices
* device revocation
* active sessions
* security credentials
Sensitive cryptographic material remains on the appropriate endpoint.
The Web application must never expose:
* private device keys
* WireGuard private keys
* passwords in plaintext
* authentication secrets
---
# 14. Organizations
Organizations access their management environment through:
```text
app.zoop.com
```
Organizations provide multi-user and multi-device management.
```text
Organization
│
├── Members
├── Devices
├── Providers
├── Recipients
├── Connections
├── Sharing
├── Policies
├── Usage
├── Security
└── Settings
```
---
# 15. Organization Members
Organizations can have different roles.
Example:
```text
Owner
Admin
Member
Viewer
```
### Owner
Controls the organization and its highest-level settings.
### Admin
Manages organization resources according to assigned permissions.
### Member
Uses Zoop resources assigned to them.
### Viewer
Can view authorized organization information without making management changes.
The exact permissions are enforced by the Control Plane authorization system.
---
# 16. Organization Devices
Organization administrators can manage devices belonging to the organization.
They can:
* view devices
* assign devices
* revoke devices
* view device status
* manage device ownership
* manage device roles
* monitor organization connectivity
---
# 17. Organization Providers and Recipients
Organizations can manage connectivity relationships across their devices and members.
```text
Organization
     │
 ┌───┴──────────────┐
 │                  │
Providers        Recipients
 │                  │
 └──── Sharing ─────┘
```
This allows organizations to manage Zoop as a connectivity platform rather than only as individual user accounts.
---
# 18. Organization Policies
Organizations can define policies governing their Zoop environment.
Policies may control:
* who can connect
* which devices may connect
* which Providers can be used
* sharing permissions
* device access
* security requirements
* organization membership
Policy enforcement belongs to the Control Plane.
The Web application provides the management interface.
---
# 19. Organization Usage
Organization administrators can view:
* device usage
* connection usage
* Provider usage
* Recipient usage
* active connections
* historical usage
This allows an organization to understand how its Zoop connectivity is being used.
---
# 20. Zoop Administration
Zoop operators access:
```text
admin.zoop.com
```
This is a separate internal application from the customer Web application.
The Admin Console is used to **operate, secure, monitor, and support the Zoop platform**.
```text
Zoop Admin
│
├── Overview
├── Users
├── Organizations
├── Devices
├── Connections
├── Network
├── Relays
├── Security
├── Abuse
├── Operations
├── Usage
├── Billing
└── Configuration
```
---
# 21. Zoop Admin Roles
Zoop should use role-based access for internal operations.
Possible roles include:
```text
Platform Owner
Platform Administrator
Network Operator
Security Administrator
Support Operator
Finance / Billing Operator
Read-only Operator
```
Each role receives only the permissions required for its responsibilities.
The exact permissions are enforced by the Control Plane.
---
# 22. Platform Owner
The Zoop platform owner has the highest operational authority.
The owner can manage:
* platform configuration
* administrator access
* organizations
* infrastructure
* security policies
* commercial configuration
* critical platform operations
Owner privileges should be strongly protected.
---
# 23. Platform Administration
Zoop administrators manage the overall service.
They can view and operate:
* users
* organizations
* devices
* connections
* services
* system health
* platform configuration
* operational incidents
Administrative actions should be audited.
---
# 24. Network Operations
Network operators manage Zoop networking infrastructure.
They can monitor:
* direct connections
* relayed connections
* relay availability
* connection failures
* latency
* network health
* tunnel establishment
* path changes
The goal is to operate the network without inspecting user Internet payloads.
---
# 25. Relay Management
Zoop relay infrastructure is managed through the Admin Console.
Operators can view:
* relay nodes
* relay availability
* relay health
* capacity
* active relay connections
* errors
* performance
* geographic/region information
The relay is part of the Data Plane infrastructure.
The Admin Console manages the infrastructure; it does not become the traffic path merely because it displays relay information.
---
# 26. Security Operations
Zoop security operators manage:
* authentication events
* authorization failures
* suspicious activity
* device revocations
* administrator access
* security incidents
* security policies
Security events are recorded as audit information.
---
# 27. Abuse Operations
Zoop operators may need to handle:
* abuse reports
* compromised accounts
* malicious devices
* policy violations
* fraudulent activity
* connectivity misuse
Actions should be logged and tied to an authorized administrator.
---
# 28. Platform Operations
The Operations area provides platform-level visibility.
```text
Operations
│
├── Service Health
├── API Health
├── Control Plane Health
├── Database Health
├── Redis Health
├── Relay Health
├── Incidents
└── System Events
```
This is operational information, not user Internet traffic.
---
# 29. Billing and Commercial Operations
Zoop administrators can manage platform-level commercial information.
This may include:
* plans
* subscriptions
* connectivity transactions
* Provider payouts
* Zoop fees
* organization billing
* revenue
* refunds
* payment status
Customer billing information is separated from sensitive networking information.
---
# 30. Platform Usage
Zoop operators can view aggregated platform information such as:
* total users
* active users
* registered devices
* active connections
* direct connection percentage
* relay usage
* traffic volume
* system capacity
* geographic usage
This supports business and infrastructure decisions.
---
# 31. Configuration
Platform administrators can manage controlled Zoop configuration.
Examples:
* platform policies
* supported features
* relay configuration
* service configuration
* operational limits
* security configuration
Critical configuration changes should require appropriate authorization and auditing.
---
# 32. Administrative Separation
Customer and internal applications are separated.
```text
                CUSTOMER SIDE
               app.zoop.com
                    │
          ┌─────────┴─────────┐
          │                   │
       Users             Organizations
          │                   │
          └─────────┬─────────┘
                    │
                Zoop API
                ZOOP SIDE
              admin.zoop.com
                    │
          ┌─────────┼─────────┐
          │         │         │
      Operations Security   Business
          │         │         │
          └─────────┼─────────┘
                    │
                Zoop API
```
The two applications have separate authentication and authorization boundaries.
---
# 33. Security Boundary
Zoop operates the platform without becoming a reader of users' Internet traffic.
The Control Plane does not carry normal user Internet payload traffic.
The Web layer does not carry normal user Internet payload traffic.
The Data Plane carries the encrypted traffic.
```text
                 CONTROL PLANE
                      │
                Coordination
                      │
        ┌─────────────┴─────────────┐
        │                           │
     Provider                    Recipient
        │                           │
        └────── Encrypted Tunnel ───┘
                      │
                 DATA PLANE
                      │
                   Internet
```
Zoop personnel should not have access to endpoint private keys or raw Internet payloads through the Web or Control Plane.
---
# 34. WebSocket
WebSocket is used for real-time Control Plane information.
Customer WebSocket events may include:
```text
device.connected
device.disconnected
connection.requested
connection.authorized
connection.established
connection.disconnected
connection.path_changed
provider.availability_changed
```
Admin WebSocket events may additionally include:
```text
relay.status_changed
service.status_changed
security.event
incident.created
incident.updated
```
Customer and administrative event streams are authorization-scoped.
---
# 35. Relationship With Agents
The Web application does not replace the Zoop Agent.
```text
                         ZOOP
                           │
             ┌─────────────┴─────────────┐
             │                           │
          WEB/API                    AGENTS
             │                           │
        Management                Network Endpoint
             │                           │
       Control Plane                  WireGuard
             │                           │
             └──────────────┬────────────┘
                            │
                         DATA PLANE
                            │
                         INTERNET
```
### Web
Manages Zoop.
### Control Plane
Authenticates, authorizes, discovers, signals, and coordinates.
### Agent
Runs on the actual endpoint and performs networking.
### Data Plane
Carries encrypted user traffic.
---
# 36. Web Does Not Perform Networking
The Web application does not:
* route user packets
* forward user packets
* perform NAT for user traffic
* terminate user WireGuard tunnels
* act as a Provider
* act as a Recipient
* become a relay
Those responsibilities belong to the Agent and Data Plane.
---
# 37. Direct and Relay Connectivity
Zoop prefers direct connectivity.
```text
Provider
    │
    │ Direct WireGuard
    ▼
Recipient
```
If direct connectivity cannot be established:
```text
Provider
    │
    ▼
 Relay
    │
    ▼
Recipient
```
The Web displays the connection state and path.
It does not carry the traffic.
---
# 38. Web Architecture
```text
                         ZOOP
                           │
          ┌────────────────┴────────────────┐
          │                                 │
     CONTROL PLANE                     DATA PLANE
          │                                 │
     ┌────┴─────┐                     ┌─────┴─────┐
     │          │                     │           │
 Customer     Admin                 Direct      Relay
    Web        Web                  Tunnel       Path
     │          │                     │           │
     └────┬─────┘                     └─────┬─────┘
          │                                 │
       React                              Agent
     TypeScript                              │
          │                              WireGuard
          │                                 │
       Go API                            Internet
```
---
# 39. Core Principles
The Zoop Web architecture follows these principles:
1. **Users manage their own Zoop resources.**
2. **Organizations manage their authorized organizational resources.**
3. **Zoop operators manage the Zoop platform.**
4. **Customer and administrative applications are separated.**
5. **Authorization is enforced by the Control Plane, not merely by the UI.**
6. **Web applications never carry normal Internet traffic.**
7. **Agents perform endpoint networking.**
8. **The Control Plane coordinates connections.**
9. **The Data Plane carries encrypted traffic.**
10. **Zoop operators should not need access to users' private keys or Internet payloads.**
11. **Administrative actions are authenticated, authorized, and audited.**
12. **Direct connectivity is preferred, with relay fallback when necessary.**
---
# 40. Final Model
```text
                              ZOOP
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
        CONTROL PLANE                         DATA PLANE
              │                                   │
      ┌───────┴────────┐                    ┌─────┴─────┐
      │                │                    │           │
 Customer Web      Admin Web             Direct      Relay
 app.zoop.com    admin.zoop.com          Tunnel       Path
      │                │                    │           │
      │                │                    └─────┬─────┘
      │                │                          │
      └───────┬────────┘                       Agents
              │                                  │
           Zoop API                           WireGuard
              │                                  │
         Go Control Plane                       │
              │                                  │
       ┌──────┴──────┐                           │
       │             │                           │
   PostgreSQL      Redis                         │
              │                                  │
              └──────────────┬───────────────────┘
                             │
                          INTERNET
```
## The fundamental distinction
**Users use Zoop.**
**Organizations manage Zoop for their people and devices.**
**Zoop owners/operators run the Zoop platform.**
**The Web manages all three experiences according to their permissions.**
**The Control Plane coordinates them.**
**The Agents perform the networking.**
**The Data Plane carries the traffic.**