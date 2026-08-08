# Zoop Platforms

## 1. Overview

Zoop is a multi-platform networking system.

The core architecture should remain consistent across platforms while allowing each platform to use its native networking capabilities.

The primary platforms are:

```text
                         ZOOP
                           │
          ┌────────────────┼────────────────┐
          │                │                │
        Mobile           Desktop          Router
          │                │                │
      ┌───┴───┐        ┌───┴───┐            │
    Android   iOS     Linux   Other        Linux/
                                             Embedded
```

The platform architecture should separate:

```text
Zoop Core
    │
    ├── Identity
    ├── Discovery
    ├── Signaling
    ├── Connection
    ├── Tunnel
    ├── Routing
    └── Policy
           │
           ▼
Platform Integration
```

This allows the networking architecture to remain consistent while platform-specific code handles operating-system restrictions.

---

# 2. Platform Goals

Zoop should provide:

* consistent identity
* consistent connection model
* consistent sharing relationships
* secure networking
* direct connectivity where possible
* automatic network changes
* platform-native user experience
* minimal battery usage on mobile
* high throughput on desktop and routers

The user should experience Zoop as one system regardless of the device being used.

---

# 3. Platform Categories

Zoop currently consists conceptually of:

```text
┌───────────────────────────────────────┐
│              Zoop Cloud               │
│             Control Plane             │
└───────────────────┬───────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
     Mobile      Desktop      Router
        │           │           │
    Android/iOS Linux/etc.  Router OS
```

---

# 4. Android

Android is one of the primary Zoop endpoint platforms.

```text
Android Device
      │
      ├── Zoop App
      │
      ├── Zoop Agent
      │
      └── VPN / Network Integration
              │
              ▼
          Zoop Tunnel
```

Android can serve as:

* Provider
* Recipient
* normal Zoop endpoint
* mobile Internet source
* mobile Internet consumer

---

# 5. Android Responsibilities

The Android platform layer is responsible for integrating Zoop with Android networking.

It may handle:

* VPN interface integration
* network changes
* Wi-Fi state
* cellular state
* application lifecycle
* background execution
* permissions
* notifications
* battery constraints
* secure local storage

The Zoop networking core should remain as platform-independent as practical.

---

# 6. Android Network Changes

Android devices frequently switch networks.

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

Zoop should detect these transitions and allow the networking layer to reassess the connection path.

The user should not have to manually reconnect whenever possible.

---

# 7. Android Provider

An Android device may act as a Provider.

```text
Android Phone
      │
      │ Internet connection
      ▼
    Zoop
      │
      ▼
Recipient
```

Example:

```text
Cellular Internet
       │
       ▼
Android Phone
       │
       │ Zoop tunnel
       ▼
Laptop
       │
       ▼
Internet
```

The exact Android capabilities and restrictions must be validated during implementation planning.

---

# 8. Android Recipient

An Android device may also consume another endpoint's connectivity.

```text
Provider
    │
    ▼
Zoop Tunnel
    │
    ▼
Android Phone
    │
    ▼
Applications
```

---

# 9. iOS

iOS is another primary mobile endpoint platform.

```text
iPhone / iPad
      │
      ├── Zoop App
      │
      ├── Zoop Agent
      │
      └── Network Extension
              │
              ▼
          Zoop Tunnel
```

iOS has stricter networking and background-execution rules than many desktop platforms.

Therefore the platform integration must be designed around Apple's supported networking APIs.

---

# 10. iOS Responsibilities

The iOS platform layer may handle:

* Network Extension integration
* VPN interface
* network transitions
* Wi-Fi/cellular changes
* application lifecycle
* permissions
* secure storage
* background behavior
* system networking events

The core Zoop networking logic should remain independent of the UI.

---

# 11. iOS Provider

If supported by the platform and the chosen implementation, an iOS device may participate as a Provider.

```text
iPhone
   │
   │ Internet
   ▼
Zoop
   │
   ▼
Recipient
```

Platform restrictions must be treated as architectural constraints rather than assumed capabilities.

---

# 12. iOS Recipient

An iOS device can consume Zoop connectivity through the platform's supported networking mechanisms.

```text
Provider
    │
    ▼
Zoop Tunnel
    │
    ▼
iPhone
    │
    ▼
Applications
```

---

# 13. Desktop

Desktop platforms provide more freedom for networking operations.

The initial desktop target can be:

```text
Linux
```

Additional platforms can be added later.

Conceptually:

```text
Desktop
   │
   ├── Zoop Agent
   ├── Zoop CLI
   └── Network Interface
```

---

# 14. Linux

Linux is particularly important because it can serve as:

* desktop endpoint
* server endpoint
* Provider
* Recipient
* router
* gateway
* development environment
* infrastructure component

Linux can therefore become the reference platform for advanced networking functionality.

---

# 15. Linux Networking

A Linux Zoop endpoint may integrate with:

* virtual network interfaces
* routing tables
* firewall facilities
* NAT
* packet forwarding
* network namespaces
* system services

Conceptually:

```text
Applications
     │
     ▼
Zoop Agent
     │
     ▼
Virtual Interface
     │
     ▼
Routing
     │
     ▼
Tunnel
     │
     ▼
Linux Network Stack
```

---

# 16. Router

A router is a specialized Zoop platform.

```text
                 ZOOP ROUTER
                     │
          ┌──────────┴──────────┐
          │                     │
       LAN side             WAN side
          │                     │
      Devices                Internet
```

A Zoop Router may act as a Provider for multiple recipients.

---

# 17. Router Responsibilities

A router may provide:

* packet forwarding
* NAT
* tunnel termination
* routing
* Provider functionality
* network policy
* multiple endpoint support

Example:

```text
                INTERNET
                    │
                    ▼
              Zoop Router
                    │
          ┌─────────┼─────────┐
          │         │         │
       Laptop     Phone     Tablet
```

---

# 18. Router as Provider

A router can provide connectivity to multiple authorized endpoints.

```text
                 Provider
              Zoop Router
                    │
       ┌────────────┼────────────┐
       │            │            │
   Recipient A  Recipient B  Recipient C
```

This makes routers useful for:

* homes
* offices
* universities
* organizations
* community networks
* managed environments

---

# 19. Router vs Normal Endpoint

A normal endpoint generally represents one device.

A router can represent a network gateway.

```text
Endpoint:

Device
  │
  └── Zoop
```

versus:

```text
Router:

Network
   │
   ▼
Zoop Router
   │
   ├── Device A
   ├── Device B
   └── Device C
```

The architecture should support both.

---

# 20. Web

The Zoop web application is primarily a Control Plane interface.

```text
Browser
   │
   ▼
Zoop Web
   │
   ▼
Zoop Cloud
```

The web interface may provide:

* account management
* identity management
* device management
* sharing management
* Provider management
* Recipient management
* connection status
* policy management
* usage information

The web application should not be responsible for carrying Data Plane traffic.

---

# 21. Web vs Agent

The distinction is important.

### Web

```text
Manage Zoop
```

### Agent

```text
Operate Zoop networking
```

For example:

```text
Browser
   │
   │ "Connect this device"
   ▼
Zoop Cloud
   │
   ▼
Zoop Agent
   │
   ▼
Tunnel
```

The browser coordinates the user experience.

The Agent performs networking.

---

# 22. Mobile App vs Agent

On mobile, the UI and networking responsibilities should also remain conceptually separate.

```text
Mobile App
     │
     ▼
Zoop Platform Layer
     │
     ▼
Zoop Core
     │
     ▼
Network Extension / VPN
```

The UI should not directly implement the networking protocol.

---

# 23. Platform Architecture

A common conceptual architecture is:

```text
                    Zoop Core
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       Android         iOS          Linux
          │             │             │
   Platform Layer Platform Layer Platform Layer
          │             │             │
          ▼             ▼             ▼
      OS APIs         OS APIs       OS APIs
```

This provides a common networking model while respecting platform-specific requirements.

---

# 24. Core vs Platform Code

The architecture should distinguish:

### Core

Platform-independent logic such as:

* identity protocol
* connection state
* peer management
* discovery model
* signaling protocol
* tunnel management
* path selection
* connection health
* policy evaluation

### Platform

Operating-system integration such as:

* VPN APIs
* virtual interfaces
* routing configuration
* secure storage
* lifecycle
* permissions
* network monitoring

---

# 25. Recommended Core Boundary

Conceptually:

```text
┌─────────────────────────────────┐
│          Zoop Core              │
│                                 │
│ Identity                        │
│ Peer management                 │
│ Discovery                       │
│ Signaling                       │
│ Connection state                │
│ Path selection                  │
│ Tunnel management               │
│ Policy                          │
└────────────────┬────────────────┘
                 │
        Platform Interface
                 │
 ┌───────────────┼────────────────┐
 │               │                │
 ▼               ▼                ▼
Android         iOS             Linux
```

This boundary should be maintained carefully.

---

# 26. Technology Direction

The current technology direction is:

```text
Core Networking
       │
       ▼
      Rust
       │
 ┌─────┼─────┐
 │     │     │
Android iOS Linux
```

Rust is a strong candidate for the networking core because it can provide:

* high performance
* memory safety
* predictable resource usage
* cross-platform compilation
* low-level networking access

The exact bindings and platform integration remain to be designed.

---

# 27. Kotlin

Kotlin is appropriate for Android application development.

Conceptually:

```text
Android
   │
   ├── Kotlin
   │     │
   │     └── UI / Android integration
   │
   └── Rust
         │
         └── Zoop networking core
```

Kotlin should not replace the networking core merely because it is the Android-native language.

---

# 28. Swift

Swift is appropriate for iOS application development.

Conceptually:

```text
iOS
 │
 ├── Swift
 │     │
 │     └── UI / Apple platform integration
 │
 └── Rust
       │
       └── Zoop networking core
```

This gives the application native platform integration while preserving shared networking logic.

---

# 29. Web Technology

The Zoop Web application can use a modern web framework.

A reasonable direction is:

```text
React
   │
   ▼
Web Application
   │
   ▼
Zoop Cloud API
```

React is appropriate for the UI layer.

It should remain separate from the networking core.

---

# 30. Cloud

Zoop Cloud hosts the Control Plane.

Conceptually:

```text
                    ZOOP CLOUD
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Discovery          Auth          Signaling
        │                │                │
        └────────────────┼────────────────┘
                         │
                       API
                         │
                       Data
```

The Cloud does not need to be implemented in the same language as the Data Plane.

---

# 31. Cloud vs Endpoint

This distinction should remain clear.

### Zoop Cloud

```text
Coordinate
Authenticate
Authorize
Discover
Signal
Manage
```

### Endpoint

```text
Connect
Encrypt
Route
Forward
Transmit
Receive
```

---

# 32. Platform Capability Matrix

Conceptually:

| Capability           |            Android |                iOS |  Linux | Router |
| -------------------- | -----------------: | -----------------: | -----: | -----: |
| Zoop identity        |                Yes |                Yes |    Yes |    Yes |
| Recipient            |                Yes |                Yes |    Yes |    Yes |
| Provider             | Platform-dependent | Platform-dependent |    Yes |    Yes |
| Direct tunnel        |                Yes |                Yes |    Yes |    Yes |
| NAT traversal        |                Yes |                Yes |    Yes |    Yes |
| Routing              |       OS-dependent |       OS-dependent |    Yes |    Yes |
| Forwarding           |         Restricted |         Restricted |    Yes |    Yes |
| NAT                  |         Restricted |         Restricted |    Yes |    Yes |
| Full router role     |            Limited |            Limited |    Yes |    Yes |
| Background operation |         Restricted |         Restricted | Strong | Strong |

The exact capabilities must be validated against each operating system's APIs and policies before implementation.

---

# 33. Mobile Constraints

Mobile platforms are fundamentally different from routers and servers.

Important constraints include:

```text
Battery
Background execution
Permissions
OS lifecycle
Network switching
VPN APIs
Memory
CPU
```

Therefore Zoop should not simply copy the Linux networking implementation onto mobile.

Instead:

```text
Common Core
     │
     ▼
Mobile Platform Adapter
     │
     ▼
Native OS networking
```

---

# 34. Desktop Advantages

Desktop platforms generally provide:

* longer-running processes
* more networking control
* larger CPU budgets
* larger memory budgets
* fewer background restrictions
* better diagnostic capabilities

They are useful for:

* development
* advanced Provider operation
* testing
* server workloads
* network gateways

---

# 35. Router Advantages

Routers are particularly valuable as persistent Providers.

They can remain online continuously:

```text
24/7
 │
 ▼
Zoop Router
 │
 ├── Provider
 ├── NAT
 ├── Forwarding
 └── Routing
```

This makes them a strong platform for persistent connectivity sharing.

---

# 36. Platform Security

Each platform should protect:

* device identity
* private keys
* credentials
* connection state
* policy information

Where available, platform-native secure storage should be used.

Examples include:

```text
Android → Android secure storage mechanisms
iOS     → Keychain / Secure Enclave capabilities where appropriate
Linux   → OS-supported secure storage
Router  → hardware/OS-specific secure storage
```

The exact security design belongs in `security.md`.

---

# 37. Platform Updates

Zoop should be designed so that platform-specific changes do not require redesigning the entire networking architecture.

For example:

```text
iOS networking API changes
          │
          ▼
iOS Adapter
          │
          ▼
Zoop Core remains stable
```

This is one reason for maintaining a strong Core/Platform boundary.

---

# 38. Cross-Platform Protocol

All Zoop endpoints should communicate using defined Zoop protocols rather than platform-specific assumptions.

For example:

```text
Android ─────┐
             │
iOS ─────────┼──► Zoop Protocols
             │
Linux ───────┤
             │
Router ──────┘
```

The protocol should define:

* identity
* authentication
* discovery
* signaling
* connection negotiation
* tunnel configuration
* capabilities
* state

---

# 39. Platform Independence

The architecture should avoid:

```text
Android implementation
        │
        ▼
iOS-specific assumptions
        │
        ▼
Linux-specific assumptions
```

Instead:

```text
                    Zoop Protocol
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     Android            iOS             Linux
```

This allows endpoints to interoperate regardless of platform.

---

# 40. Example: Phone to Laptop

A simple cross-platform connection might be:

```text
                 Zoop Cloud
                     │
              Discovery/Auth
                     │
          ┌──────────┴──────────┐
          │                     │
       Android                Linux
        Phone                Laptop
          │                     │
          └──── Secure Tunnel ──┘
```

The Android implementation and Linux implementation can be different internally while speaking the same Zoop protocols.

---

# 41. Example: Phone to Router

```text
                 Zoop Cloud
                     │
                  Signaling
                     │
          ┌──────────┴──────────┐
          │                     │
       Android              Zoop Router
       Recipient              Provider
          │                     │
          └──── Secure Tunnel ──┘
                                  │
                                  ▼
                               Internet
```

---

# 42. Example: Router to Router

Zoop may eventually support:

```text
Router A
   │
   │ Zoop tunnel
   ▼
Router B
   │
   ▼
Network
```

This enables more advanced network-to-network connectivity.

It is not required for the initial system but should not be excluded by the architecture.

---

# 43. Platform Expansion

Future platforms could include:

```text
Windows
macOS
Linux distributions
ChromeOS
Embedded Linux
Network appliances
Cloud servers
```

The architecture should allow these without changing the fundamental Zoop model.

---

# 44. Development Platforms

Development should prioritize a small number of reference platforms rather than attempting to implement everything simultaneously.

A sensible architecture sequence is:

```text
Rust Core
    │
    ▼
Linux reference implementation
    │
    ├── networking validation
    ├── tunnel validation
    ├── routing validation
    └── NAT validation
           │
           ▼
Android / iOS integration
           │
           ▼
Router platform
```

This is a development strategy, not a limitation of the architecture.

---

# 45. Testing Across Platforms

Networking must eventually be tested across real combinations.

Examples:

```text
Android ↔ Linux
Android ↔ Android
iOS ↔ Linux
iOS ↔ Android
Router ↔ Android
Router ↔ Linux
Router ↔ iOS
```

And across network conditions:

```text
Wi-Fi ↔ Wi-Fi
Wi-Fi ↔ Cellular
Cellular ↔ Cellular
NAT ↔ NAT
Restrictive NAT
IPv4 ↔ IPv4
IPv6 ↔ IPv6
```

---

# 46. Platform Observability

Each platform should expose useful networking diagnostics.

For example:

```text
Platform:
Android

Network:
Cellular

Path:
Direct

Tunnel:
Healthy

Latency:
X ms

Packet loss:
X%

Internet:
Reachable
```

The exact metrics will be defined later.

---

# 47. Platform Architecture Summary

The complete platform architecture is:

```text
                           ZOOP
                             │
             ┌───────────────┴───────────────┐
             │                               │
        ZOOP CLOUD                       ZOOP ENDPOINTS
        CONTROL PLANE                         │
             │                   ┌────────────┼────────────┐
             │                   │            │            │
         Web / API            Mobile       Desktop       Router
             │                   │            │            │
             │              ┌────┴────┐       │            │
             │              │         │       │            │
             │           Android     iOS    Linux       Router OS
             │              │         │       │            │
             │              └────┬────┘       │            │
             │                   │            │            │
             │                   └────────────┼────────────┘
             │                                │
             │                         Zoop Core
             │                                │
             │                         Data Plane
             │                                │
             └──────────── coordination ──────┘
```

---

# 48. Current Technology Direction

The current conceptual technology stack is:

```text
                    ZOOP
                      │
        ┌─────────────┴─────────────┐
        │                           │
   CONTROL PLANE                DATA PLANE
        │                           │
   Zoop Cloud                   Zoop Core
        │                           │
   API / Services                  Rust
        │                           │
      Web                        Tunnel
     React                     Networking
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
             Android             iOS              Linux
             Kotlin             Swift              Rust
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  │
                               Routers
```

This is a **technology direction**, not yet a final implementation specification.

---

# 49. Architecture Principle

The most important platform decision is:

> **Zoop should have one networking architecture and multiple platform integrations, not a separate networking architecture for every platform.**

The shared core defines the behavior.

The platform layer adapts that behavior to each operating system.

---

# 50. Summary

Zoop should ultimately operate across:

```text
Android
iOS
Linux
Routers
Web / Cloud
```

with the following separation:

```text
Web
 │
 └── Management

Cloud
 │
 └── Control Plane

Zoop Core
 │
 └── Networking Logic

Platform Layer
 │
 ├── Android
 ├── iOS
 ├── Linux
 └── Router

Data Plane
 │
 └── Endpoint-to-endpoint traffic
```

The core objective remains:

> **One Zoop network model, multiple native platforms, direct secure endpoint connectivity whenever possible.**
