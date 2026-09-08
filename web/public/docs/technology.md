# Zoop Technology

## 1. Purpose

This document defines the technology direction for Zoop.

It describes:

* programming languages
* application frameworks
* networking technologies
* platform technologies
* infrastructure direction
* development tooling
* technology boundaries

The goal is to keep Zoop technologically consistent while allowing implementation details to evolve.

---

# 2. Technology Principles

Zoop follows these principles:

1. Use proven technologies.
2. Prefer simplicity over unnecessary complexity.
3. Use Go as the core systems language.
4. Use native technologies where platform integration requires them.
5. Avoid custom cryptography.
6. Keep Control Plane and Data Plane technologies clearly separated.
7. Prefer technologies with strong performance and reliability.
8. Minimize unnecessary dependencies.
9. Keep the architecture portable.
10. Do not choose infrastructure before the architectural requirement is understood.

---

# 3. Technology Stack Overview

The current stack is:

```text
                         ZOOP
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       CONTROL          DATA PLANE       CLIENTS
        PLANE               │                │
          │                 │                │
          Go                Go        ┌──────┼──────┐
          │                 │         │      │      │
       Zoop Cloud       Networking  Android  iOS   Web
                                      │      │      │
                                    Kotlin Swift TypeScript
                                             │
                                            React
```

---

# 4. Core Language

## Go

**Status:** Decided

Go is the primary technology for Zoop's core.

Go will be used for:

```text
Cloud services
Networking core
Endpoint agent
Linux implementation
Router software
Networking utilities
Backend services
```

The main reason for choosing Go is that Zoop needs a combination of:

* networking performance
* concurrency
* reliability
* portability
* simple deployment
* strong standard-library support
* straightforward maintenance

---

# 5. Why Go

Go is particularly suitable for Zoop because the system will contain many concurrent network operations.

Examples include:

```text
Connections
Sockets
NAT traversal
Device communication
Control Plane requests
Connection monitoring
Routing
Background services
```

Go's concurrency model makes this type of software practical without requiring a highly complex runtime architecture.

---

# 6. Go in the Data Plane

The Data Plane is performance-sensitive.

The goal is:

```text
Provider
   │
   │
   │ secure tunnel
   ▼
Recipient
```

Go will provide the Zoop networking layer around the underlying secure transport technology.

However, Zoop should avoid unnecessarily implementing low-level cryptographic primitives itself.

---

# 7. Go in the Control Plane

Go will also power Zoop Cloud services.

Conceptually:

```text
Web
 │
Mobile
 │
Agent
 │
Router
 │
 ▼
Zoop API
 │
 ▼
Go Services
 │
 ├── Identity
 ├── Authorization
 ├── Discovery
 ├── Signaling
 ├── Sharing
 └── Organization
```

---

# 8. Android

## Kotlin

**Status:** Decided

Android applications will use Kotlin.

Kotlin is responsible for Android-specific functionality such as:

```text
UI
Android lifecycle
Permissions
Notifications
System integration
Network APIs
VPN APIs
Device management
```

The core networking architecture should remain consistent with the rest of Zoop.

---

# 9. iOS

## Swift

**Status:** Decided

iOS applications will use Swift.

Swift handles:

```text
UI
Apple lifecycle
Permissions
System integration
Network APIs
VPN/network extensions
Notifications
Device management
```

The iOS implementation must respect Apple's networking and background-execution constraints.

---

# 10. Web

## TypeScript + React

**Status:** Decided

The Zoop Web application will use:

```text
TypeScript
      │
    React
      │
Zoop Web Application
```

React is responsible for the user interface.

TypeScript provides type safety and maintainability.

The Web application primarily interacts with the Control Plane.

It does not carry Zoop Data Plane traffic.

---

# 11. Web Responsibilities

The Web application may eventually provide:

```text
Account management
Device management
Sharing management
Organization management
Provider management
Recipient management
Connection status
Security settings
Administrative controls
```

---

# 12. Control Plane Technology

The Control Plane is primarily:

```text
Go
 │
 ├── API
 ├── Identity
 ├── Authentication
 ├── Authorization
 ├── Discovery
 ├── Signaling
 ├── Sharing
 └── Organization services
```

The exact service decomposition is intentionally not finalized yet.

Zoop should avoid creating many microservices before there is a real scaling requirement.

---

# 13. Data Plane Technology

The Data Plane consists of:

```text
Endpoint
   │
   ├── Network interface
   ├── Secure tunnel
   ├── Routing
   ├── Forwarding
   └── NAT
```

Go provides the Zoop networking layer.

An established secure tunnel technology will provide the cryptographic transport.

---

# 14. Secure Tunnel

## WireGuard

**Status:** Direction

WireGuard is the leading technology direction for the Zoop secure tunnel.

The architecture benefits from using an established VPN/tunnel protocol rather than creating a custom protocol.

Conceptually:

```text
Provider
    │
    │ WireGuard-based secure tunnel
    ▼
Recipient
```

The exact implementation and integration remain engineering decisions.

---

# 15. Why WireGuard

WireGuard is attractive because it provides:

* modern cryptography
* small protocol surface
* strong performance
* low overhead
* roaming support
* UDP-based transport
* established implementations

Zoop's innovation should therefore focus on:

```text
Identity
Authorization
Discovery
Sharing
NAT traversal
Connection orchestration
User experience
```

rather than inventing a new encryption protocol.

---

# 16. NAT Traversal

Zoop requires NAT traversal technology to establish direct connections.

The architecture may use established mechanisms such as:

```text
STUN
ICE concepts
UDP hole punching
Endpoint discovery
```

The exact implementation is **not yet finalized**.

The important architectural requirement is:

> Zoop must attempt direct connectivity before falling back to relays.

---

# 17. Direct Connectivity

The desired connection path is:

```text
Provider
    │
    │ direct
    ▼
Recipient
```

Possible path selection:

```text
Local
  ↓
Direct IPv4
  ↓
Direct IPv6
  ↓
Alternative direct path
  ↓
Relay
```

The exact ordering can evolve according to implementation and network conditions.

---

# 18. Relay Technology

Relays are a fallback mechanism.

```text
Provider
    │
    ▼
 Relay
    │
    ▼
Recipient
```

The relay should forward encrypted traffic.

The relay should not become the default path for normal Zoop traffic.

---

# 19. Networking

Zoop networking will primarily use:

```text
IP
UDP
TCP where required
IPv4
IPv6
```

The secure tunnel will primarily operate over UDP.

Zoop should remain compatible with both IPv4 and IPv6.

---

# 20. Operating-System Networking

Zoop should use native operating-system networking facilities wherever practical.

Examples include:

```text
Routing
Interfaces
Forwarding
NAT
Firewalling
Network extensions
```

Zoop should not recreate functionality that the operating system already provides reliably.

---

# 21. Linux

Linux is especially important because it provides strong networking capabilities.

The Linux implementation may use:

```text
Linux networking stack
Network namespaces
Routing tables
iptables/nftables where appropriate
TUN/TAP interfaces
Kernel networking facilities
```

The exact components will be selected during implementation.

---

# 22. TUN/TAP

**Status:** Direction

Zoop may use TUN interfaces where userspace networking integration requires them.

Conceptually:

```text
Zoop Agent
    │
    ▼
TUN Interface
    │
    ▼
Operating System
    │
    ▼
Network
```

Whether and where TUN/TAP is required depends on the final Data Plane implementation.

---

# 23. Router Technology

A Zoop Router is an endpoint with additional networking capabilities.

```text
Zoop Router
     │
     ├── Go
     ├── Network interfaces
     ├── Routing
     ├── Forwarding
     ├── NAT
     └── Zoop tunnel
```

The router software should remain as close as possible to the same core Zoop networking implementation.

---

# 24. Mobile Networking

Mobile networking is different from desktop networking because the operating system controls much of the network lifecycle.

Zoop must account for:

```text
Wi-Fi → Cellular
Cellular → Wi-Fi
Sleep
Background restrictions
Network changes
VPN APIs
Battery constraints
```

The underlying Zoop connection model should remain consistent even though platform integration differs.

---

# 25. Seamless Roaming

The architecture should support endpoints changing network addresses.

Example:

```text
Wi-Fi
  │
  ▼
Cellular
  │
  ▼
New IP address
  │
  ▼
Existing Zoop identity
```

The logical device identity should not depend on a fixed IP address.

---

# 26. Database

**Status:** Open

The database technology has not been finalized.

The architecture should first identify the data requirements.

Likely Control Plane data includes:

```text
Users
Devices
Organizations
Relationships
Policies
Public keys
Sessions
Connection metadata
```

The final database should be selected based on:

* consistency requirements
* scale
* operational complexity
* availability
* query patterns

---

# 27. API

**Status:** Open

The exact API architecture is not yet finalized.

Possible technologies include:

```text
REST
gRPC
WebSockets
Server-Sent Events
```

Different APIs may be appropriate for different Control Plane functions.

The decision should be made during implementation design.

---

# 28. Service Architecture

**Status:** Direction

Zoop should initially favor a modular architecture rather than prematurely creating a large microservice ecosystem.

Conceptually:

```text
Zoop Cloud
    │
    ├── Identity
    ├── Authorization
    ├── Devices
    ├── Sharing
    ├── Discovery
    └── Signaling
```

These modules can later become independent services if scale requires it.

---

# 29. Infrastructure

**Status:** Open

The exact infrastructure provider is not yet selected.

Possible infrastructure components include:

```text
Compute
Database
Object storage
DNS
Load balancing
Monitoring
Secrets
CI/CD
```

The infrastructure should be selected based on Zoop's actual requirements.

---

# 30. Containers

Containers may be used for Control Plane services.

For example:

```text
Go Service
    │
    ▼
Container
    │
    ▼
Cloud Infrastructure
```

Containers are useful for deployment consistency but are not a requirement for the Data Plane.

---

# 31. Deployment

The repository separates deployment configuration from application code:

```text
deployments/
infrastructure/
```

This allows infrastructure to evolve without mixing it with core networking code.

---

# 32. Testing Technology

Testing should exist at several levels:

```text
Unit Tests
     │
     ▼
Integration Tests
     │
     ▼
Networking Tests
     │
     ▼
End-to-End Tests
     │
     ▼
Real Device Tests
```

Networking cannot be validated entirely through unit tests.

---

# 33. Data Plane Testing

The Data Plane must eventually be tested using real network conditions.

Examples:

```text
Wi-Fi → Wi-Fi
Wi-Fi → Cellular
Cellular → Wi-Fi
NAT → NAT
IPv4 → IPv4
IPv6 → IPv6
Restricted network
High latency
Packet loss
Network switching
```

The goal is to validate real connectivity rather than only simulated behavior.

---

# 34. Performance Testing

Zoop performance testing should measure:

```text
Latency
Throughput
CPU usage
Memory usage
Connection establishment time
Packet loss
Roaming recovery
NAT traversal success
```

The key comparison is:

```text
Direct path
    vs
Relay path
```

Direct connectivity should be the primary performance target.

---

# 35. Observability

Zoop should eventually provide visibility into system health.

Possible signals include:

```text
Connection state
Path type
Latency
Packet loss
Throughput
NAT status
Relay usage
Control Plane availability
```

Observability must avoid unnecessarily exposing user traffic contents.

---

# 36. Logging

Logs should focus on operational events rather than user traffic.

Good:

```text
Connection established
NAT traversal succeeded
Relay selected
Device enrolled
Authorization denied
```

Avoid unnecessarily logging:

```text
Packet contents
User Internet traffic
Sensitive credentials
Private keys
Secrets
```

---

# 37. Security Technology

Security technology should be based on established standards.

The stack should include:

```text
TLS for secure Control Plane communication
Established identity mechanisms
Established cryptographic libraries
WireGuard-based secure tunneling
Secure key storage where supported
```

Zoop should not implement cryptographic algorithms itself.

---

# 38. Dependency Philosophy

Zoop should keep dependencies intentional.

Before adding a dependency, consider:

```text
Do we need it?
Is it maintained?
Is it secure?
Is it portable?
Does the standard library already provide this?
Does it add significant complexity?
```

---

# 39. Tooling

Development tooling should support:

```text
Formatting
Linting
Static analysis
Testing
Dependency auditing
Security scanning
Build automation
CI
```

Go's standard tooling should be used wherever possible.

---

# 40. Repository Technology Boundaries

The repository should roughly follow these technology boundaries:

```text
cloud/
    Go

agent/
    Go

router/
    Go

web/
    TypeScript + React

mobile/android/
    Kotlin

mobile/ios/
    Swift

packages/
    Shared supporting code

test/
    Cross-component testing
```

---

# 41. What We Are Not Choosing

At this stage, Zoop is intentionally **not** committing to:

```text
Rust as the core language
A specific cloud provider
A specific database
A specific Kubernetes architecture
A microservices-first architecture
A custom VPN protocol
A custom cryptographic protocol
A centralized traffic gateway
A permanent relay architecture
```

These decisions can be revisited when requirements justify them.

---

# 42. Technology Evolution

The stack can evolve.

For example:

```text
Current
   │
   ▼
Go core
   │
   ▼
Proven networking implementation
   │
   ▼
Scale requirements
   │
   ▼
Targeted optimization
```

Optimization should be driven by measured bottlenecks rather than assumptions.

---

# 43. Technology Decision Rule

When selecting a new technology:

```text
Requirement
    │
    ▼
Evaluate existing stack
    │
    ▼
Can current technology solve it?
    │
 ┌──┴──┐
YES    NO
 │      │
 ▼      ▼
Use   Evaluate alternatives
existing
```

A new language or framework should only be introduced when there is a clear technical reason.

---

# 44. Current Stack Summary

| Area           | Technology             | Status    |
| -------------- | ---------------------- | --------- |
| Core           | Go                     | Decided   |
| Cloud          | Go                     | Decided   |
| Endpoint Agent | Go                     | Decided   |
| Router         | Go                     | Decided   |
| Android        | Kotlin                 | Decided   |
| iOS            | Swift                  | Decided   |
| Web            | TypeScript + React     | Decided   |
| Secure Tunnel  | WireGuard direction    | Direction |
| NAT Traversal  | Established techniques | Direction |
| Database       | TBD                    | Open      |
| API            | TBD                    | Open      |
| Cloud Provider | TBD                    | Open      |
| Infrastructure | TBD                    | Open      |
| Observability  | TBD                    | Open      |

---

# 45. Final Technology Architecture

The current technology picture is:

```text
                           ZOOP
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
      CONTROL PLANE       DATA PLANE        CLIENTS
          │                  │                  │
         Go                 Go          ┌───────┼───────┐
          │                  │          │       │       │
      Zoop Cloud        Secure Tunnel Android  iOS    Web
          │             + Networking    │       │       │
          │                  │         Kotlin  Swift TypeScript
          │                  │                         │
          │                  │                       React
          │                  │
          └────── coordination ────────┐
                                       │
                              Provider ↔ Recipient
                                       │
                                    Internet
```

---

# 46. Core Technology Principle

The technology direction can be summarized as:

> **Go is the core of Zoop.**

> **Kotlin, Swift, and React/TypeScript handle platform-specific user experiences.**

> **Established networking and cryptographic technologies provide the secure transport foundation.**

> **Zoop's engineering value is in orchestration, identity, authorization, discovery, direct connectivity, and user experience—not in reinventing cryptography or basic networking protocols.**

> **Choose additional technologies only when a real requirement justifies them.**
