# Zoop Networking

## 1. Overview

Networking is the layer that turns a Zoop relationship into an actual network connection.

The high-level flow is:

```text
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
Connection Establishment
   │
   ▼
Tunnel
   │
   ▼
Routing
   │
   ▼
Forwarding
   │
   ▼
NAT
   │
   ▼
Internet
```

Zoop's primary networking objective is:

> **Create the fastest, most reliable secure path possible between authorized endpoints, preferably directly between the devices.**

The Zoop Cloud coordinates the connection but should not normally carry the user's Internet traffic.

---

# 2. Networking Architecture

The networking architecture is divided into two major planes.

```text
                         ZOOP
                           │
            ┌──────────────┴──────────────┐
            │                             │
       CONTROL PLANE                  DATA PLANE
            │                             │
       Zoop Cloud                    Endpoints
            │                             │
   ┌────────┼────────┐              ┌─────┴─────┐
   │        │        │              │           │
Discovery  Auth   Signaling       Tunnel      Routing
                                      │           │
                                      └─────┬─────┘
                                            │
                                      Forwarding
                                            │
                                           NAT
                                            │
                                            ▼
                                         Internet
```

The Control Plane decides **who can connect and how they can find each other**.

The Data Plane carries **the actual packets**.

---

# 3. Networking Principles

Zoop networking should follow these principles:

### Direct first

Prefer endpoint-to-endpoint connectivity.

### Secure by default

Traffic between Zoop endpoints should be authenticated and encrypted.

### Cloud coordination, not mandatory traffic forwarding

The cloud should primarily coordinate connections.

### Relay only when necessary

If direct connectivity is impossible, a relay may be used as a fallback.

### Automatic path selection

Users should not need to manually configure ports or networking whenever possible.

### Network changes should be tolerated

Wi-Fi, cellular, NAT mappings, and public IP addresses can change.

### Failure should be recoverable

Zoop should automatically attempt to restore connectivity.

---

# 4. Endpoint Networking Model

A Zoop endpoint consists conceptually of:

```text
                         ENDPOINT
                            │
                ┌───────────┴───────────┐
                │                       │
           CONTROL LOGIC            DATA PLANE
                │                       │
        ┌───────┼───────┐        ┌──────┼──────┐
        │       │       │        │      │      │
     Identity Discovery Signal  Tunnel Routing NAT
                                        │
                                   Forwarding
```

The exact implementation differs between Android, iOS, Linux, routers, and other platforms.

The conceptual responsibilities remain the same.

---

# 5. Network Interfaces

An endpoint can have multiple network interfaces.

For example:

```text
                         DEVICE
                           │
             ┌─────────────┼─────────────┐
             │             │             │
            Wi-Fi       Cellular       Ethernet
             │             │             │
             └─────────────┼─────────────┘
                           │
                      Zoop Endpoint
```

The endpoint may need to determine which interface can provide the best connectivity to another endpoint.

---

# 6. Network Changes

Mobile devices commonly move between networks.

Example:

```text
Wi-Fi
  │
  ▼
Cellular
  │
  ▼
Wi-Fi
```

The endpoint's:

* local IP address
* public IP address
* NAT mapping
* network interface
* route

may all change.

Zoop networking should therefore treat network changes as normal events rather than exceptional failures.

---

# 7. Discovery

Discovery answers:

> Where might this endpoint be reachable?

A simplified process is:

```text
Provider
   │
   ▼
Zoop Cloud
   │
   │ endpoint information
   ▼
Recipient
```

Discovery information may include:

* endpoint identity
* public network candidates
* local network candidates
* transport information
* endpoint capabilities
* connectivity state

Discovery does not itself establish the Data Plane.

---

# 8. Signaling

Signaling allows endpoints to exchange information required to establish a connection.

Conceptually:

```text
Provider
   │
   │ signaling
   ▼
Zoop Cloud
   ▲
   │ signaling
   │
Recipient
```

The Cloud may coordinate:

* connection candidates
* public addresses
* network information
* connection attempts
* path changes
* connection state

The signaling channel is separate from the Data Plane.

---

# 9. Connection Establishment

A simplified connection sequence is:

```text
1. Recipient requests connection
             │
             ▼
2. Control Plane checks authorization
             │
             ▼
3. Endpoints discover each other
             │
             ▼
4. Signaling exchanges candidates
             │
             ▼
5. Endpoints test connectivity
             │
             ▼
6. Best path is selected
             │
             ▼
7. Secure tunnel established
             │
             ▼
8. Routing configured
             │
             ▼
9. Data Plane becomes active
```

---

# 10. Candidate Paths

An endpoint may have multiple possible paths to another endpoint.

For example:

```text
Provider
   │
   ├── Local network path
   │
   ├── Public Internet path
   │
   └── Relay path
   │
   ▼
Recipient
```

Zoop should evaluate available paths and prefer the best usable one.

---

# 11. Direct Connectivity

The preferred path is:

```text
Provider
   │
   │ direct encrypted connection
   ▼
Recipient
```

The Cloud is not in the normal packet path.

This provides:

* lower latency
* better throughput
* lower cloud bandwidth usage
* lower infrastructure cost
* better scalability

---

# 12. Local Direct Connectivity

If both endpoints are on the same local network:

```text
                 Wi-Fi / LAN
                     │
          ┌──────────┴──────────┐
          │                     │
       Provider ◄────────────► Recipient
```

Zoop should ideally use the local path rather than sending traffic through the Internet.

This can provide extremely low latency.

---

# 13. Internet Direct Connectivity

If endpoints are on different networks:

```text
Provider
   │
   │
Internet
   │
   ▼
Recipient
```

Zoop should attempt to establish a direct encrypted path through the available network infrastructure.

This is where NAT traversal becomes important.

---

# 14. NAT

Many endpoints are behind NAT.

A simplified topology is:

```text
Private Network A                  Private Network B
       │                                  │
    Provider                            Recipient
       │                                  │
      NAT                                NAT
       │                                  │
       └──────────── Internet ────────────┘
```

Neither endpoint may have a directly reachable public address.

Zoop therefore needs NAT traversal mechanisms.

---

# 15. NAT Traversal

The purpose of NAT traversal is:

> Find a path through the existing network infrastructure without requiring users to manually configure router ports.

A conceptual process is:

```text
Discover candidates
       │
       ▼
Exchange candidates
       │
       ▼
Attempt connectivity
       │
       ▼
Connectivity checks
       │
       ▼
Select usable path
```

Technologies such as STUN and ICE are candidates for this layer.

The final implementation should be selected during the detailed connection-layer design.

---

# 16. Hole Punching

A common NAT traversal technique is UDP hole punching.

Conceptually:

```text
Provider NAT
     │
     │ UDP
     ▼
  Internet
     ▲
     │ UDP
     │
Recipient NAT
```

Both endpoints initiate traffic so that their NAT devices create mappings allowing subsequent packets to flow.

The exact behavior depends on the NAT types and firewall policies involved.

---

# 17. NAT Types

Not all NATs behave identically.

Possible environments include:

```text
Open / easily traversable NAT
        │
        ▼
Moderate NAT
        │
        ▼
Restrictive NAT
        │
        ▼
Symmetric / difficult NAT
```

Zoop should not assume that every network permits direct connectivity.

---

# 18. Firewalls

Firewalls may also prevent direct connectivity.

```text
Provider
   │
Firewall
   X
Internet
   X
Firewall
   │
Recipient
```

NAT traversal and connection establishment must therefore account for both:

* NAT behavior
* firewall behavior

---

# 19. Path Selection

When multiple paths work, Zoop should select the best path.

Possible criteria include:

* reachability
* latency
* packet loss
* throughput
* stability
* network type
* policy
* cost

Conceptually:

```text
Candidate A ── latency: low
Candidate B ── latency: high
Candidate C ── relay
                    │
                    ▼
              Select best path
```

The exact scoring algorithm remains an open design decision.

---

# 20. Tunnel

Once a usable path exists, Zoop establishes the secure tunnel.

```text
Provider
   │
   │ encrypted tunnel
   ▼
Recipient
```

The tunnel provides the Data Plane transport.

WireGuard is currently a strong candidate for the underlying secure tunnel technology because of its performance, simplicity, and modern cryptographic design.

The final choice belongs to the technology decision process.

---

# 21. Tunnel vs Transport Path

These concepts should not be confused.

```text
Transport Path
    │
    ▼
Network route used to reach peer

Tunnel
    │
    ▼
Secure logical connection carrying Zoop traffic
```

For example:

```text
Physical / Internet path
        │
        ▼
     Transport
        │
        ▼
      Tunnel
        │
        ▼
     IP traffic
```

---

# 22. Routing

Once the tunnel exists, the endpoint must determine which traffic should enter it.

Example:

```text
Recipient
    │
    ▼
Routing decision
    │
    ├── Local destination ──► Local network
    │
    └── Zoop destination ──► Tunnel
```

For Internet sharing:

```text
Recipient
    │
    ▼
Internet destination
    │
    ▼
Zoop route
    │
    ▼
Tunnel
```

---

# 23. Full-Tunnel Routing

In a full-tunnel configuration:

```text
Recipient
   │
   ├── Web traffic
   ├── App traffic
   ├── DNS traffic
   └── Other Internet traffic
              │
              ▼
           Zoop
              │
              ▼
           Provider
              │
              ▼
           Internet
```

This allows the Provider to become the Recipient's Internet exit point.

---

# 24. Split-Tunnel Routing

In a split-tunnel configuration:

```text
Recipient
    │
    ├── Local traffic ─────► Local network
    │
    ├── Some Internet ────► Local Internet
    │
    └── Selected traffic ─► Zoop ─► Provider
```

This can reduce unnecessary traffic through the Provider.

The exact Zoop routing policy remains to be defined.

---

# 25. Forwarding

The Provider must forward traffic from the Zoop tunnel toward its Internet interface.

```text
Recipient
    │
    ▼
Tunnel
    │
    ▼
Provider
    │
    ▼
Forwarding
    │
    ▼
Internet interface
```

Forwarding is a Provider-side Data Plane responsibility.

---

# 26. NAT and Internet Sharing

If the Provider's upstream network expects traffic to originate from the Provider's address, NAT may be required.

```text
Recipient
   │
   │ Zoop address
   ▼
Provider
   │
   │ NAT
   ▼
Provider public address
   │
   ▼
Internet
```

Return traffic is translated back and delivered through the tunnel.

---

# 27. Complete Packet Path

A packet from a Recipient to the Internet may follow:

```text
Application
    │
    ▼
Operating System
    │
    ▼
Routing
    │
    ▼
Zoop Virtual Interface
    │
    ▼
Tunnel Encryption
    │
    ▼
Network
    │
    ▼
Provider Endpoint
    │
    ▼
Tunnel Decryption
    │
    ▼
Forwarding
    │
    ▼
NAT
    │
    ▼
Provider Internet
    │
    ▼
Internet
```

Return traffic follows the reverse direction.

---

# 28. Relay

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

The relay should forward encrypted traffic without becoming the normal path.

The desired priority is:

```text
1. Local direct
        ↓
2. Internet direct
        ↓
3. Alternative direct path
        ↓
4. Relay fallback
```

The exact priority rules will depend on testing.

---

# 29. Why Relay Is Not the Preferred Path

A relay introduces:

```text
Provider
   │
   ▼
Relay
   │
   ▼
Recipient
```

instead of:

```text
Provider
   │
   ▼
Recipient
```

The relay can therefore add:

* latency
* bandwidth consumption
* infrastructure cost
* another failure point

Zoop should minimize relay usage.

---

# 30. Relay Bandwidth

If a relay carries traffic, the relay becomes part of the Data Plane.

For example:

```text
Provider
   │
   │ 100 Mbps
   ▼
Relay
   │
   │ 100 Mbps
   ▼
Recipient
```

The relay infrastructure must therefore provision enough bandwidth.

This is precisely why direct endpoint connectivity remains the preferred architecture.

---

# 31. Connection Upgrade

A connection may initially use a relay:

```text
Provider
   │
   ▼
Relay
   │
   ▼
Recipient
```

If a direct path becomes available:

```text
Provider ◄────────────► Recipient
```

Zoop should be able to prefer the direct path.

Conceptually:

```text
Relay
  │
  │ direct path becomes available
  ▼
Direct
```

This should happen automatically where technically possible.

---

# 32. Roaming

A device may change its network while connected.

```text
Wi-Fi
  │
  ▼
Cellular
  │
  ▼
Wi-Fi
```

The networking layer should detect changes and attempt to restore the best path.

The goal is:

```text
Network changes
      │
      ▼
Path changes
      │
      ▼
Tunnel remains usable or rapidly recovers
```

---

# 33. Keepalive

NAT mappings and firewalls may expire inactive connections.

The networking layer may therefore need keepalive traffic.

Conceptually:

```text
Endpoint A
   │
   │ small keepalive
   ▼
Network
   │
   ▼
Endpoint B
```

Keepalive behavior should balance:

* connection reliability
* battery consumption
* cellular data usage
* NAT timeout behavior

This is especially important on mobile devices.

---

# 34. Mobile Networking

Mobile platforms introduce additional constraints.

Examples include:

* battery management
* background execution restrictions
* network transitions
* cellular/Wi-Fi changes
* OS-managed VPN interfaces
* application lifecycle

Zoop's networking architecture should therefore separate:

```text
Core networking logic
```

from:

```text
Platform networking integration
```

---

# 35. DNS

Internet connectivity also requires DNS behavior to be defined.

Possible models include:

```text
Recipient
   │
   ├── Existing DNS
   │
   ├── Provider DNS
   │
   └── Zoop-managed DNS
```

DNS traffic may need to follow the same routing policy as other Internet traffic.

The final DNS architecture remains open.

---

# 36. IPv4

Zoop should support IPv4 environments.

The architecture needs to account for:

* private IPv4 addresses
* public IPv4 addresses
* NAT
* routing
* tunnel addresses

IPv4 remains important because many networks still depend on it.

---

# 37. IPv6

Zoop should also be designed with IPv6 in mind.

A network may provide:

```text
IPv6
```

without requiring IPv4 NAT.

This can potentially simplify direct connectivity in some environments.

The architecture should avoid making IPv4 assumptions that prevent future IPv6 support.

---

# 38. MTU

Tunnel encapsulation adds packet overhead.

Therefore:

```text
Original packet
      │
      ▼
Tunnel headers
      │
      ▼
Larger packet
```

The networking layer must eventually handle:

* MTU calculation
* packet sizing
* fragmentation
* path MTU discovery
* platform-specific behavior

This should be tested across real networks.

---

# 39. Packet Loss

Packets can be lost because of:

* Wi-Fi interference
* cellular congestion
* overloaded routers
* Internet congestion
* network changes

Zoop should rely on appropriate transport and networking mechanisms rather than assuming perfect packet delivery.

Metrics should eventually expose packet loss for diagnostics.

---

# 40. Latency

Latency is influenced by:

```text
Device
  │
  ▼
Local network
  │
  ▼
ISP
  │
  ▼
Internet
  │
  ▼
Peer
```

A direct path generally minimizes unnecessary hops.

A relay can increase the path length:

```text
Provider
   │
   ▼
Relay
   │
   ▼
Recipient
```

Therefore path selection should consider latency.

---

# 41. Throughput

Throughput depends on:

* endpoint CPU
* encryption performance
* network interface
* Wi-Fi/cellular quality
* ISP capacity
* Provider bandwidth
* path quality
* relay capacity if used

Zoop should avoid imposing unnecessary bandwidth bottlenecks.

The target architecture is:

```text
Provider bandwidth
        │
        ▼
Direct tunnel
        │
        ▼
Recipient
```

rather than:

```text
Provider
   │
   ▼
Cloud relay
   │
   ▼
Recipient
```

for normal operation.

---

# 42. Security Boundary

The networking architecture should maintain a clear security boundary.

```text
                 Zoop Cloud
                     │
               coordination
                     │
          ┌──────────┴──────────┐
          │                     │
       Provider ◄────────────► Recipient
                encrypted
```

The Cloud does not need to inspect normal application traffic.

The Data Plane should provide confidentiality and integrity between authorized endpoints.

---

# 43. Private Network Isolation

Using a Provider's Internet connection should not automatically mean that the Recipient can access every device on the Provider's LAN.

For example:

```text
Provider LAN
   │
   ├── Printer
   ├── Laptop
   ├── NAS
   └── Router
```

Zoop should distinguish:

```text
Internet sharing
```

from:

```text
Private LAN access
```

Private network access should require explicit policy where appropriate.

---

# 44. Network State

Zoop should expose meaningful networking states.

For example:

```text
DISCOVERING
     │
     ▼
CONNECTING
     │
     ▼
DIRECT
     │
     ├── DEGRADED
     │
     └── HEALTHY
```

Or:

```text
RELAYED
```

if direct connectivity is unavailable.

This is more useful than a simple:

```text
CONNECTED
```

status.

---

# 45. Connection Health

A connection can be technically established but unhealthy.

Useful health indicators may include:

```text
Path:
DIRECT

Latency:
Low

Packet Loss:
Low

Tunnel:
Healthy

Internet:
Reachable
```

These metrics should help distinguish:

```text
Tunnel problem
```

from:

```text
Internet problem
```

---

# 46. Failure Scenarios

Zoop should account for:

### Provider offline

```text
Provider ──X── Recipient
```

### Recipient offline

```text
Recipient ──X── Provider
```

### NAT traversal failure

```text
Provider ──X── Recipient
```

### Relay unavailable

```text
Provider ── Relay ──X── Recipient
```

### Provider Internet unavailable

```text
Provider
   │
   X
Internet
```

### Network transition

```text
Wi-Fi
  │
  X
Cellular
```

Each failure should have a recovery strategy.

---

# 47. Recovery

A simplified recovery process is:

```text
Connection failure
       │
       ▼
Detect failure
       │
       ▼
Check current path
       │
       ▼
Attempt path recovery
       │
       ├── Direct path restored
       │
       ├── Alternative direct path
       │
       └── Relay fallback
       │
       ▼
Connection restored
```

The system should avoid requiring manual user intervention for ordinary network changes.

---

# 48. Control Plane Failure

The Control Plane and Data Plane should be loosely coupled.

Conceptually:

```text
Zoop Cloud
     X
     │
     │ unavailable
     │
Provider ◄────────────► Recipient
            Data Plane
```

An important future design question is how long an already-established Data Plane connection can continue without Control Plane availability.

The architecture should avoid unnecessary dependence on continuous cloud connectivity.

---

# 49. Scalability

The preferred architecture scales because normal traffic is distributed across endpoints.

Instead of:

```text
Thousands of users
       │
       ▼
Zoop Cloud
       │
       ▼
Internet
```

Zoop aims for:

```text
Provider ◄────► Recipient
Provider ◄────► Recipient
Provider ◄────► Recipient
Provider ◄────► Recipient
```

The Cloud primarily coordinates relationships and connections.

---

# 50. Bandwidth Cost

Direct connectivity also reduces cloud bandwidth requirements.

### Central relay model

```text
Provider
   │
   ▼
Cloud
   │
   ▼
Recipient
```

The Cloud carries user traffic.

### Direct model

```text
Provider
   │
   ▼
Recipient
```

The Cloud primarily carries coordination traffic.

The second architecture is preferred.

---

# 51. Networking Technology Candidates

The networking stack will likely contain several technologies rather than one technology.

Conceptually:

```text
Application
     │
     ▼
Zoop Agent
     │
     ├── Identity
     ├── Discovery
     ├── Signaling
     ├── NAT Traversal
     │
     ▼
Secure Tunnel
     │
     ▼
OS Networking
     │
     ▼
Network Interface
```

Potential technologies include:

```text
Secure tunnel:
WireGuard

NAT traversal:
ICE / STUN
possibly additional mechanisms

Transport:
UDP primarily
with fallback mechanisms where required

Routing:
OS-native routing / virtual interfaces

NAT:
Platform-native firewall/NAT facilities
```

These are technology candidates, not final implementation commitments.

---

# 52. Why UDP Is Important

UDP is useful for modern real-time and tunnel networking because it avoids some limitations of TCP-over-TCP designs and works well with NAT traversal.

Conceptually:

```text
Zoop Tunnel
     │
     ▼
   UDP
     │
     ▼
Internet
```

The exact transport strategy should be validated across real-world networks.

---

# 53. TCP Fallback

Some restrictive networks may interfere with UDP.

Zoop may eventually need a fallback mechanism.

Conceptually:

```text
Preferred
    │
    ▼
UDP
    │
    X
Blocked
    │
    ▼
Fallback transport
```

The exact fallback technology is an open decision.

It should not undermine the primary direct-connectivity architecture.

---

# 54. Networking Stack

The conceptual Zoop networking stack is:

```text
┌───────────────────────────────┐
│          Applications         │
├───────────────────────────────┤
│         Zoop Agent            │
├───────────────────────────────┤
│ Routing / Policy              │
├───────────────────────────────┤
│ Secure Tunnel                 │
├───────────────────────────────┤
│ NAT Traversal / Path Mgmt     │
├───────────────────────────────┤
│ OS Networking                 │
├───────────────────────────────┤
│ Wi-Fi / Cellular / Ethernet   │
├───────────────────────────────┤
│ Internet                      │
└───────────────────────────────┘
```

---

# 55. Complete Zoop Connection

Putting everything together:

```text
                         ZOOP CLOUD
                              │
                  ┌───────────┼───────────┐
                  │           │           │
              Discovery      Auth      Signaling
                  │           │           │
                  └───────────┼───────────┘
                              │
                    Connection Coordination
                              │
              ┌───────────────┴───────────────┐
              │                               │
           PROVIDER                        RECIPIENT
              │                               │
         Network Interface               Network Interface
              │                               │
              └───────────┬───────────────────┘
                          │
                    NAT Traversal
                          │
                    Path Selection
                          │
                    Secure Tunnel
                          │
              ┌───────────┴───────────┐
              │                       │
           Routing                 Routing
              │                       │
              └───────────┬───────────┘
                          │
                     Forwarding
                          │
                         NAT
                          │
                          ▼
                       INTERNET
```

---

# 56. Ideal Zoop Path

The ideal user experience is:

```text
User opens Zoop
       │
       ▼
Recipient authenticates
       │
       ▼
Provider discovered
       │
       ▼
Permission verified
       │
       ▼
Connection established
       │
       ▼
Direct path selected
       │
       ▼
Secure tunnel established
       │
       ▼
Routes configured
       │
       ▼
Internet traffic flows
```

The user should not need to understand NAT traversal, routing, tunnels, or firewall behavior.

Zoop handles those mechanisms underneath.

---

# 57. Core Networking Goal

The ultimate networking goal is:

```text
                    ZOOP CLOUD
                         │
                  coordination
                         │
          ┌──────────────┴──────────────┐
          │                             │
       PROVIDER ◄════════════════════► RECIPIENT
                    secure
                  direct path
                         │
                         ▼
                      INTERNET
```

The ideal system therefore has:

* direct connectivity
* secure transport
* automatic NAT traversal
* intelligent path selection
* automatic routing
* correct forwarding
* NAT when required
* seamless network changes
* automatic recovery
* relay fallback only when necessary

---

# 58. Open Networking Decisions

The following decisions remain intentionally open:

* Exact tunnel implementation
* Exact NAT traversal implementation
* ICE/STUN architecture
* UDP strategy
* TCP/fallback strategy
* Relay protocol
* Relay infrastructure
* Path scoring
* Connection migration
* Full-tunnel policy
* Split-tunnel policy
* DNS architecture
* IPv4 strategy
* IPv6 strategy
* MTU strategy
* Keepalive strategy
* Mobile background networking
* Router implementation
* Private LAN access policy
* Control Plane dependency
* Connection recovery behavior
* Bandwidth management
* QoS

These should be decided after the architectural requirements are understood and before implementation of the corresponding subsystem.

---

# 59. Summary

Zoop networking is fundamentally:

```text
DISCOVER
   │
   ▼
AUTHORIZE
   │
   ▼
SIGNAL
   │
   ▼
TRAVERSE NAT
   │
   ▼
SELECT PATH
   │
   ▼
ESTABLISH TUNNEL
   │
   ▼
ROUTE
   │
   ▼
FORWARD
   │
   ▼
NAT
   │
   ▼
INTERNET
```

The preferred path is:

```text
Provider ◄════════════► Recipient
             │
          Internet
```

rather than:

```text
Provider
    │
    ▼
Zoop Cloud
    │
    ▼
Recipient
```

The central networking principle is:

> **Zoop Cloud coordinates connectivity; Zoop endpoints carry the traffic. Direct endpoint-to-endpoint connectivity is preferred, while relay infrastructure exists only as a fallback for networks where direct connectivity cannot be established.**
