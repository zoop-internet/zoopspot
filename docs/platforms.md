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
┌───────────────────────────────────────────────────────────────┐
│                    Flutter Application UI                     │
│          (Identity, Dashboard, Sharing, Diagnostics)          │
└───────────────────────────────┬───────────────────────────────┘
                                │ (MethodChannel / Events)
┌───────────────────────────────▼───────────────────────────────┐
│              ZoopVpnService (Kotlin Background FGS)           │
│        (VpnService.Builder, tun0 allocation, protect())       │
└───────────────────────────────┬───────────────────────────────┘
                                │ (JNI via ZoopMobileBridge)
┌───────────────────────────────▼───────────────────────────────┐
│               libzoop.so (Go C-Shared Native Core)            │
│  - MuxBind (UDP Socket Multiplexer & STUN Hole Punching)      │
│  - wireguard-go Device (Tun Adapter attached to native FD)    │
│  - ConnectionRecoveryManager (Candidate Probing & DPD)        │
│  - WebSocket Relay Bridge Client (DERP Fallback)              │
└───────────────────────────────────────────────────────────────┘
```

Android can serve as:

* **Recipient (Consumer)**: Routes device applications through an authorized Provider via encrypted WireGuard tunnel (`tun0`).
* **Provider (Sharer)**: Shares cellular or Wi-Fi internet connectivity with trusted endpoints.
* **Normal Zoop endpoint**: Participates in mutual identity discovery and control plane signaling.

---

# 5. Android Native Implementation & Socket Protection

The Android platform layer integrates the Go WireGuard core with the Android OS networking model:

### 5.1 Native JNI Bridge (`cmd/zoop-mobile`)
* The Go core is compiled as a C-shared library (`libzoop.so`) using the Android NDK (`clang` targeting `x86_64`, `arm64-v8a`, `armeabi-v7a`).
* JNI exports (`cmd/zoop-mobile/jni.c`) provide native bridge functions:
  - `initMobile(configJSON, callback)`: Initializes the device configuration and registers the JNI callback object.
  - `startTunnel(fd, ifName)`: Attaches the native `wireguard-go` TUN device directly to the OS-allocated file descriptor (`ParcelFileDescriptor.detachFd()`).
  - `connectPeer(peerPubKey, candidatesJSON, relayURL)`: Configures the remote peer, initiates UDP candidate probing, and sets up recovery managers.
  - `notifyNetworkChange(networkType)`: Signals network interface switches (Wi-Fi $\leftrightarrow$ Cellular) for zero-drop roaming.
  - `protect(fd)`: Callback invoking `VpnService.protect(int fd)` on all underlying UDP sockets.

### 5.2 Critical UDP Socket Protection (`VpnService.protect`)
When an Android application configures `VpnService` with default routing (`0.0.0.0/0`), the OS kernel routes all system UDP and TCP sockets into `tun0`.
* If the WireGuard UDP socket itself is captured by `tun0`, an **infinite routing loop** occurs, deadlocking the device and stalling all network traffic.
* **Requirement**: WireGuard's underlying UDP sockets must be explicitly protected by calling `VpnService.protect(fd)`.
* **Activation Lifecycle**: The WireGuard device manager must explicitly invoke `wgDev.Up()` during device configuration. Calling `Up()` triggers `MuxBind.Open()`, creates the listening UDP sockets, retrieves their file descriptors (`fd4` and `fd6`), and passes them through the native JNI callback into `VpnService.protect()`.

### 5.3 AllowedIPs Routing for Internet Sharing
When an Android device connects as a Recipient to a Provider for internet sharing:
* The peer configuration on WireGuard MUST set `AllowedIPs = 0.0.0.0/0, ::/0` (not restricted to a single `/32` overlay IP).
* Restricting AllowedIPs to `100.64.0.2/32` causes WireGuard cryptokey routing to drop all public internet packets (`8.8.8.8`) and provider overlay traffic (`100.64.0.17`).
* Setting `0.0.0.0/0, ::/0` allows both direct overlay node-to-node communication and routed public internet egress.

### 5.4 Flexible Public Key Parsing
The mobile bridge supports WireGuard public keys encoded in both standard **Base64** (44 characters, ending with `=`) and **Hex** (64 characters), preventing crashes from format mismatches during signaling.

---

# 6. Android Network Changes & Dead Peer Detection (DPD)

Android devices frequently switch networks:

```text
Wi-Fi (Home / Work)
       │
       ▼
Cellular (4G / 5G)
       │
       ▼
Wi-Fi (Public / Roaming)
```

1. **Active Network Monitoring**: `ZoopVpnService` registers an Android `ConnectivityManager.NetworkCallback` that monitors `onAvailable` and `onLost` events.
2. **Instant Roaming Trigger**: When a network switch occurs, `notifyNetworkChange()` notifies the native runtime without tearing down `tun0` or terminating active user connections.
3. **Candidate Re-Probing**: `ConnectionRecoveryManager` uses `ProbeCandidatesMux` to probe known host and reflexive STUN candidates concurrently.
4. **Dead Peer Detection (DPD)**: If a direct peer fails to respond to keepalive packets within a threshold (e.g. 15s), DPD marks the peer dead and transparently fails over to the WebSocket relay cluster (`ws://.../v1/relay`). When direct candidates recover, the session automatically upgrades back to direct P2P.

---

# 7. Android Provider

An Android device may act as a Provider, sharing its active internet connection:

```text
Cellular Internet (4G/5G)
       │
       ▼
Android Phone (Provider)
       │
       │ Encrypted WireGuard P2P Tunnel
       ▼
Laptop / Tablet (Recipient)
       │
       ▼
Internet
```

* **Battery & Thermals**: Provider mode monitors battery percentage (`BatteryManager`) and pauses sharing when unmetered power is disconnected or battery falls below threshold.
* **Carrier Metering**: Distinguishes between metered cellular data and unmetered Wi-Fi connections.

---

# 8. Android Recipient

An Android device acting as a Recipient consumes another endpoint's shared connectivity:

```text
Provider (Home Router / Server / Laptop)
       │
       ▼
Encrypted WireGuard P2P Tunnel (AllowedIPs 0.0.0.0/0)
       │
       ▼
Android Phone (tun0 @ 100.64.0.18)
       │
       ▼
All Installed Applications (Zero DNS Leaks)
```

* All device applications seamlessly access the internet via the Provider.
* DNS queries are sent to secure upstream resolvers (`1.1.1.1`, `8.8.8.8`) inside the tunnel, completely eliminating local ISP eavesdropping and DNS leaks.

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
