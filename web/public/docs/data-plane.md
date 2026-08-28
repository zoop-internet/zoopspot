# Zoop Data Plane

## 1. Overview

The Zoop Data Plane is the part of Zoop responsible for **carrying actual network traffic** between endpoints.

The Control Plane coordinates identity, discovery, authorization, and connection establishment.

The Data Plane carries the resulting traffic.

```text
                         ZOOP
                           │
            ┌──────────────┴──────────────┐
            │                             │
       CONTROL PLANE                  DATA PLANE
            │                             │
        Zoop Cloud                    Endpoints
            │                             │
   Identity / Discovery           Tunnel / Routing
   Authorization / Signaling      Forwarding / NAT
```

The fundamental Data Plane objective is:

> **Allow an authorized Recipient to send and receive Internet traffic through an authorized Provider.**

---

# 2. Core Principle

Zoop should prefer **direct endpoint-to-endpoint data paths** whenever technically possible.

The desired architecture is:

```text
                    CONTROL PLANE
                         │
                  coordination
                         │
             ┌───────────┴───────────┐
             │                       │
          Provider ◄──────────────► Recipient
                     DATA PLANE
                         │
                         ▼
                     Internet
```

The Zoop Cloud should not automatically become the path through which all Internet traffic flows.

This is important for:

* latency
* throughput
* scalability
* cloud bandwidth costs
* provider bandwidth efficiency
* reliability

---

# 3. Data Plane Responsibilities

The Data Plane is responsible for:

```text
Connection
    │
    ├── Tunnel
    │
    ├── Routing
    │
    ├── Forwarding
    │
    ├── NAT
    │
    └── Internet access
```

These responsibilities work together to turn an established Zoop relationship into actual network connectivity.

---

# 4. Endpoint Architecture

The Data Plane exists primarily on the endpoints.

```text
                         ENDPOINT
                            │
                  ┌─────────┴─────────┐
                  │                   │
             Control Plane        Data Plane
                                      │
                         ┌────────────┼────────────┐
                         │            │            │
                      Tunnel       Routing      Forwarding
                                                   │
                                                  NAT
```

An endpoint may be:

* Android phone
* iPhone
* laptop
* desktop
* Linux machine
* router
* OpenWrt device
* future supported network device

The implementation may differ between platforms, but the Data Plane responsibilities should remain conceptually consistent.

---

# 5. Provider and Recipient

The basic Data Plane relationship is:

```text
Provider
    │
    │ provides connectivity
    ▼
Recipient
    │
    │ uses connectivity
    ▼
Internet
```

The Provider supplies access to an upstream network.

The Recipient sends traffic through the Zoop connection toward the Provider.

---

# 6. Complete Traffic Path

The fundamental traffic path is:

```text
Recipient
    │
    ▼
Recipient Network Interface
    │
    ▼
Zoop Data Plane
    │
    ▼
Secure Tunnel
    │
    ▼
Provider Zoop Data Plane
    │
    ▼
Provider Routing
    │
    ▼
NAT / Forwarding
    │
    ▼
Provider Internet Connection
    │
    ▼
Internet
```

Return traffic follows the reverse path.

```text
Internet
    │
    ▼
Provider
    │
    ▼
NAT / Connection State
    │
    ▼
Provider Zoop Data Plane
    │
    ▼
Secure Tunnel
    │
    ▼
Recipient Zoop Data Plane
    │
    ▼
Recipient
```

---

# 7. Tunnel

The tunnel is the secure transport between the participating endpoints.

Conceptually:

```text
Provider Endpoint
       │
       │
       │  encrypted tunnel
       │
       ▼
Recipient Endpoint
```

The tunnel protects the traffic while it travels between endpoints.

A tunnel technology should provide the required properties for:

* confidentiality
* integrity
* endpoint authentication
* efficient packet transport
* connection recovery

WireGuard is currently the leading candidate for this layer.

The final tunnel design remains an implementation decision.

---

# 8. Tunnel Does Not Equal Internet Access

A successful tunnel does not automatically mean that the Recipient has Internet access.

For example:

```text
Provider ◄──── Tunnel ────► Recipient
```

may be working while:

```text
Recipient ──X── Internet
```

is still failing.

Internet access requires the complete chain:

```text
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
Provider Internet
```

Therefore Zoop must treat **tunnel connectivity** and **Internet connectivity** as separate states.

---

# 9. Routing

Routing determines where packets should be sent.

The Recipient's traffic may need to be directed into the Zoop tunnel.

Conceptually:

```text
Recipient
    │
    ▼
Routing decision
    │
    ├── Local traffic ──► Local network
    │
    └── Internet traffic
              │
              ▼
          Zoop tunnel
```

The routing model must eventually define:

* which destinations use Zoop
* which destinations remain local
* how routes are installed
* how routes are removed
* how conflicts are handled
* how routing changes when connections change

---

# 10. Full-Tunnel and Selective Routing

Zoop may support different routing models.

### Full tunnel

Most or all Internet traffic uses the Provider.

```text
Recipient
    │
    ├── Internet traffic
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

### Selective routing

Only specific traffic uses the Provider.

```text
Recipient
    │
    ├── Destination A ──► Local Internet
    │
    └── Destination B ──► Zoop ──► Provider
```

The exact routing policy remains to be defined.

---

# 11. Forwarding

Forwarding moves packets from one network context to another.

For a Provider:

```text
Zoop Tunnel
     │
     ▼
Provider Network Stack
     │
     ▼
Internet Interface
```

For a Recipient:

```text
Recipient Interface
     │
     ▼
Zoop Network Stack
     │
     ▼
Tunnel
```

Forwarding is a Data Plane operation.

---

# 12. NAT

The Provider may need to perform NAT when the Recipient uses the Provider's Internet connection.

Conceptually:

```text
Recipient
   │
   │ private Zoop address
   ▼
Provider
   │
   │ NAT
   ▼
Public Internet
```

The Provider translates traffic from the Recipient's Zoop-side address space into the address space used by the Provider's upstream Internet connection.

The exact NAT implementation depends on the platform and network topology.

---

# 13. Return Traffic

Internet traffic is bidirectional.

For example:

```text
Recipient
   │
   │ request
   ▼
Provider
   │
   ▼
Internet
```

The response must return:

```text
Internet
   │
   ▼
Provider
   │
   ▼
Zoop Tunnel
   │
   ▼
Recipient
```

NAT and connection state must therefore support the return path.

---

# 14. Packet Lifecycle

A simplified outbound packet lifecycle is:

```text
1. Application
      │
      ▼
2. Operating System Network Stack
      │
      ▼
3. Routing Decision
      │
      ▼
4. Zoop Tunnel Interface
      │
      ▼
5. Encryption / Encapsulation
      │
      ▼
6. Network Transport
      │
      ▼
7. Provider Endpoint
      │
      ▼
8. Decryption / Decapsulation
      │
      ▼
9. Forwarding
      │
      ▼
10. NAT
      │
      ▼
11. Internet
```

This is a conceptual packet path.

The exact implementation will depend on the platform.

---

# 15. Connection Establishment

Before the Data Plane can carry traffic, endpoints must establish a usable path.

Conceptually:

```text
Control Plane
     │
     ▼
Connection information
     │
     ▼
Endpoint connection attempt
     │
     ▼
NAT traversal
     │
     ▼
Secure tunnel
     │
     ▼
Data Plane active
```

The Control Plane coordinates the process.

The Data Plane begins carrying traffic once the path is established.

---

# 16. Direct Connectivity

Direct connectivity is the preferred path.

```text
Provider
    ▲
    │
    │ direct encrypted path
    │
    ▼
Recipient
```

This avoids unnecessary traffic through a central relay.

Advantages include:

* lower latency
* higher throughput
* lower infrastructure bandwidth usage
* better scalability
* reduced dependency on central infrastructure

---

# 17. NAT Traversal

Direct endpoint connectivity can be difficult because endpoints may be behind NATs or restrictive firewalls.

The connection layer therefore needs to discover viable paths.

Conceptually:

```text
Provider
   │
   │ candidate paths
   ▼
Connection Coordination
   ▲
   │ candidate paths
   │
Recipient
```

Then:

```text
Candidate paths
      │
      ▼
Connectivity checks
      │
      ▼
Best usable path
      │
      ▼
Secure tunnel
```

ICE/STUN are candidates for this layer.

The exact NAT traversal architecture remains to be finalized.

---

# 18. Relay as a Fallback

Direct connectivity may sometimes be impossible.

Zoop therefore needs to decide what happens when:

```text
Provider ◄──X──► Recipient
```

cannot establish a direct path.

A relay can theoretically provide:

```text
Provider
    │
    ▼
Relay
    │
    ▼
Recipient
```

However, a relay has important disadvantages:

* additional latency
* relay bandwidth consumption
* infrastructure cost
* possible throughput limitations
* additional dependency on cloud infrastructure

Therefore the Zoop architecture should treat relaying as a **fallback**, not the preferred Data Plane.

The system should continuously prefer a direct path when one is available.

The exact relay strategy remains an open architectural decision.

---

# 19. No Mandatory Central Traffic Path

Zoop should avoid an architecture like:

```text
Provider
   │
   ▼
Zoop Cloud
   │
   ▼
Recipient
```

for normal Internet traffic.

Instead:

```text
                Zoop Cloud
                    │
             coordination only
                    │
        ┌───────────┴───────────┐
        │                       │
     Provider ◄────────────► Recipient
                  │
                  ▼
               Internet
```

This is fundamental to Zoop's scalability and performance goals.

---

# 20. Path Selection

When multiple paths are available, Zoop may need to select the best path.

Potential paths could include:

```text
Direct
   │
   ├── Local network
   ├── Public Internet
   └── Other direct route

Fallback
   │
   └── Relay
```

Possible path-selection factors include:

* reachability
* latency
* packet loss
* throughput
* stability
* network cost
* connection type
* policy

The exact path-selection algorithm is not yet defined.

---

# 21. Connection Upgrade

If a connection starts using a fallback path and a better direct path later becomes available, Zoop should be able to transition toward the better path.

Conceptually:

```text
Relay path
    │
    │ direct path becomes available
    ▼
Direct path
```

This avoids unnecessarily keeping traffic on a relay.

The transition must preserve the user experience as much as technically possible.

---

# 22. Roaming

Endpoints may change networks.

For example:

```text
Wi-Fi
  │
  ▼
Cellular
  │
  ▼
Different Wi-Fi
```

The Data Plane should be designed to tolerate changes in:

* IP address
* network interface
* NAT mapping
* network type

The connection layer should attempt to maintain or rapidly restore connectivity.

---

# 23. Connection Failure

A Data Plane connection can fail.

Possible reasons include:

* Provider goes offline
* Recipient goes offline
* network changes
* NAT mapping expires
* firewall changes
* Internet connection disappears
* tunnel failure
* routing failure

Conceptually:

```text
CONNECTED
    │
    ▼
FAILURE
    │
    ▼
DETECT
    │
    ▼
RECOVER
    │
    ├── direct reconnect
    │
    └── alternative path
```

The Control Plane may assist with rediscovery and coordination.

---

# 24. Provider Internet Failure

A Provider can have a working Zoop connection while its own Internet connection is unavailable.

```text
Provider ◄──── Tunnel ────► Recipient
    │
    X
Internet unavailable
```

Therefore Zoop should distinguish:

```text
Tunnel status
```

from:

```text
Internet reachability
```

A connected tunnel does not guarantee upstream Internet connectivity.

---

# 25. Recipient Internet State

Similarly, the Recipient may have:

```text
Tunnel: CONNECTED
Internet: NOT WORKING
```

or:

```text
Tunnel: DISCONNECTED
Internet: NOT AVAILABLE
```

The system should eventually expose meaningful connection state rather than simply showing "connected."

---

# 26. Bandwidth

The Data Plane must account for the fact that the Provider's Internet connection has finite capacity.

```text
Provider Internet
       │
       ▼
     Zoop
       │
       ├── Recipient A
       ├── Recipient B
       └── Recipient C
```

Multiple recipients can consume Provider bandwidth.

Therefore future Data Plane policy may need to support:

* bandwidth limits
* prioritization
* per-recipient limits
* traffic accounting
* fairness

These mechanisms are not yet defined.

---

# 27. Performance Goals

The Data Plane should optimize for:

### Low latency

Avoid unnecessary network hops.

### High throughput

Avoid unnecessary central bottlenecks.

### Efficient processing

Minimize packet-processing overhead.

### Stability

Recover quickly from network changes.

### Direct connectivity

Prefer endpoint-to-endpoint paths.

### Predictable behavior

Make connection state and failure behavior understandable.

---

# 28. Security

Data Plane traffic must be protected from unauthorized interception or modification.

The tunnel should provide appropriate:

* encryption
* authentication
* integrity protection
* replay protection where applicable

The Control Plane should not need to inspect the contents of encrypted user traffic.

The final cryptographic architecture will be defined in `security.md`.

---

# 29. Privacy

The Data Plane should minimize unnecessary exposure of user traffic and metadata.

The architecture should distinguish between:

```text
Traffic contents
```

and:

```text
Connection metadata
```

Zoop Cloud should not need the contents of the Recipient's Internet traffic simply to coordinate the connection.

---

# 30. Data Plane and Control Plane Interaction

The two planes cooperate but have different responsibilities.

```text
                 CONTROL PLANE
                      │
      Identity / Authorization / Discovery
                      │
                   Signaling
                      │
                      ▼
                 DATA PLANE
                      │
             Connection / Tunnel
                      │
              Routing / Forwarding
                      │
                     NAT
                      │
                      ▼
                  Internet
```

The Control Plane can tell the Data Plane:

```text
Who
What
Whether
Where
How to connect
```

The Data Plane handles:

```text
Packets
Routing
Forwarding
Tunnel transport
Internet access
```

---

# 31. Data Plane State

A conceptual state model is:

```text
NO CONNECTION
      │
      ▼
CONNECTING
      │
      ▼
TUNNEL ESTABLISHED
      │
      ▼
DATA PATH ACTIVE
      │
      ├───────────────┐
      │               │
      ▼               ▼
DEGRADED           DISCONNECTED
      │               │
      ▼               ▼
RECOVERING        RECONNECTING
      │               │
      └───────┬───────┘
              ▼
        DATA PATH ACTIVE
```

This is conceptual and should be refined during implementation design.

---

# 32. Endpoint Data Plane Components

A Zoop endpoint will conceptually contain:

```text
                         ZOOP AGENT
                              │
                    ┌─────────┴─────────┐
                    │                   │
               CONTROL LOGIC        DATA PLANE
                                        │
                          ┌─────────────┼─────────────┐
                          │             │             │
                       Tunnel        Routing      Forwarding
                                                        │
                                                       NAT
```

The exact software boundaries may differ by platform.

---

# 33. Platform Differences

The Data Plane cannot be implemented identically on every platform.

For example:

```text
Android
  └── OS-managed virtual networking

Linux
  └── Linux networking stack

OpenWrt
  └── Router/firewall/network stack

iOS
  └── Platform networking constraints
```

The architecture therefore defines common responsibilities while allowing platform-specific implementations.

---

# 34. Router Data Plane

A router can provide a particularly powerful Provider implementation.

```text
                    INTERNET
                       │
                       ▼
                    ROUTER
                       │
              ┌────────┴────────┐
              │                 │
           Local LAN          Zoop
                                │
                                ▼
                           Recipient
```

A router could potentially provide connectivity to multiple recipients.

Router support should therefore be considered an important future Data Plane target.

---

# 35. Multiple Recipients

A Provider may eventually serve multiple Recipients.

```text
                         Provider
                            │
                 ┌──────────┼──────────┐
                 │          │          │
             Recipient A Recipient B Recipient C
                 │          │          │
                 └──────────┼──────────┘
                            │
                         Internet
```

The Provider Data Plane must therefore eventually account for:

* multiple tunnels
* bandwidth consumption
* isolation
* authorization
* routing
* fairness
* resource limits

---

# 36. Isolation

Recipients should not automatically gain access to the Provider's private network.

The architecture should distinguish:

```text
Internet access
```

from:

```text
Private network access
```

For example:

```text
Recipient
   │
   ├── Internet ─────────────► Allowed
   │
   └── Provider private LAN ─► Policy dependent
```

The default security posture should avoid granting unnecessary access.

---

# 37. DNS

Internet access may also require DNS handling.

Conceptually:

```text
Recipient
   │
   ▼
DNS request
   │
   ▼
Configured DNS path
   │
   ▼
DNS response
```

Zoop must eventually decide how DNS behaves when the Recipient uses a Provider.

Possible models include:

* Recipient's existing DNS
* Provider DNS
* Zoop-managed DNS
* policy-based DNS

The final model is not yet defined.

---

# 38. IPv4 and IPv6

The Data Plane should account for both:

```text
IPv4
IPv6
```

The architecture should not unnecessarily assume that every network is IPv4-only.

The exact addressing and translation strategy remains to be designed.

---

# 39. MTU and Packet Handling

Tunneling adds overhead to packets.

Therefore the Data Plane must eventually account for:

* MTU
* fragmentation
* packet sizing
* encapsulation overhead
* path MTU discovery

These are implementation-level networking concerns but are important to the final Data Plane design.

---

# 40. Observability

The Data Plane should expose enough information to diagnose connectivity problems.

Useful states may eventually include:

```text
Tunnel:
CONNECTED

Path:
DIRECT

Internet:
REACHABLE

Latency:
...

Packet loss:
...

Throughput:
...
```

Observability must avoid exposing unnecessary private traffic contents.

---

# 41. Data Plane Failure Domains

Failures should be distinguishable.

For example:

```text
Control Plane failure
        ≠
Tunnel failure
        ≠
Provider Internet failure
        ≠
Recipient network failure
```

This distinction is important for troubleshooting.

Example:

```text
Zoop Cloud unavailable
        │
        ▼
Existing direct tunnel
        │
        ▼
May potentially continue operating
```

Whether and how long an existing Data Plane connection can continue without the Control Plane is an important future design decision.

---

# 42. Relay Architecture

If Zoop eventually implements relays, they should be considered part of the fallback connection architecture.

```text
                         CONNECTION
                              │
                 ┌────────────┴────────────┐
                 │                         │
              DIRECT                     RELAY
                 │                         │
                 ▼                         ▼
              Preferred                Fallback
```

A relay should not be confused with the Control Plane.

The Control Plane coordinates.

A relay participates in the Data Plane.

That distinction is important.

---

# 43. Desired Data Path

The ideal Zoop path is:

```text
                 ZOOP CLOUD
                     │
              Coordination only
                     │
                     │
          ┌──────────┴──────────┐
          │                     │
       Provider ◄────────────► Recipient
          │       encrypted       │
          │        tunnel         │
          │                      │
          └──────────┬───────────┘
                     │
                  Internet
```

The Cloud helps establish the relationship and connection.

The endpoints carry the traffic.

---

# 44. Complete Data Plane

The complete conceptual Data Plane can therefore be represented as:

```text
                         ZOOP DATA PLANE
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
              RECIPIENT                    PROVIDER
                  │                           │
             Network Stack               Network Stack
                  │                           │
               Routing                     Routing
                  │                           │
                  └──────────┬────────────────┘
                             │
                           Tunnel
                             │
                    ┌────────┴────────┐
                    │                 │
                Forwarding           NAT
                    │                 │
                    └────────┬────────┘
                             │
                             ▼
                          INTERNET
```

---

# 45. Data Plane Principles

Zoop's Data Plane should follow these principles:

### 1. Direct first

Prefer direct endpoint-to-endpoint paths.

### 2. Relay only when necessary

A relay should be a fallback rather than the normal architecture.

### 3. Encrypt traffic

Traffic should be protected between endpoints.

### 4. Separate tunnel from Internet access

A tunnel being established does not automatically mean Internet connectivity works.

### 5. Keep routing explicit

Traffic paths should be predictable and policy-aware.

### 6. Minimize unnecessary hops

Every unnecessary hop can add latency, cost, and bandwidth consumption.

### 7. Support network changes

Mobile and changing networks are normal conditions.

### 8. Design for failure

Connection loss should be expected and recoverable.

### 9. Protect private networks

Internet sharing should not automatically expose the Provider's private LAN.

### 10. Keep the cloud out of normal traffic

Zoop Cloud should primarily coordinate rather than transport user Internet traffic.

---

# 46. Current Open Questions

The following Data Plane questions remain intentionally open:

* Exact tunnel implementation
* Exact NAT traversal mechanism
* Direct-path establishment
* Relay architecture
* Relay selection
* Path scoring
* Full-tunnel vs selective routing
* DNS model
* IPv4/IPv6 strategy
* MTU handling
* NAT implementation
* Multi-recipient bandwidth management
* QoS
* Traffic accounting
* Connection migration
* Failure recovery
* Control Plane independence
* Platform-specific networking implementation
* Router implementation

These should be addressed progressively during the networking design phase.

---

# 47. Summary

The Zoop Data Plane is the **actual connectivity layer**.

Its conceptual flow is:

```text
Recipient
   │
   ▼
Routing
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
NAT
   │
   ▼
Internet
```

The Control Plane establishes:

```text
Identity
Authorization
Discovery
Signaling
Connection coordination
```

The Data Plane provides:

```text
Tunnel
Routing
Forwarding
NAT
Internet access
```

The central objective is:

> **An authorized Recipient should be able to use an authorized Provider's Internet connection through a secure, efficient, preferably direct endpoint-to-endpoint data path.**

The cloud coordinates the connection.

The endpoints carry the traffic.
