# ZOOP: Full-Stack Product & Engineering Roadmap

This roadmap defines the architectural milestones, functional capabilities, and engineering phases required to deliver ZOOP as a production-grade, globally distributed connectivity platform.

ZOOP is an end-to-end ecosystem connecting **Android Mobile**, **Desktop Clients**, **Edge Routers (OpenWrt/Linux)**, and the **Cloud Control Plane (`zoop-cloud`)** backed by **Neon Lakebase Postgres**, **Signaling Hubs**, **Encrypted Relays**, and the **Web Management Console**.

> [!NOTE]
> **Space for Innovation**: This roadmap focuses strictly on functional capabilities, architectural contracts, security guarantees, and user outcomes. Specific visual layouts, color schemes, typography, and micro-interactions are intentionally left flexible to empower creative design and continuous platform-native innovation.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXPERIENCE LAYER                               │
│      Mobile Client (Android / iOS)    •    Web Console    •    Desktop      │
├─────────────────────────────────────────────────────────────────────────────┤
│                           CONTROL & SIGNALING PLANE                         │
│   Zoop Cloud Control Plane (`zoop-cloud` on EC2)  •  Neon Postgres Database  │
│   WebSocket Signaling Hub  •  STUN / TURN (Port 3478)  •  Encrypted Relays  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              DATA PLANE & MESH                              │
│       Native VpnService (Android)     •    Virtual TUN Routing Engine       │
│       Direct P2P Encrypted Tunnels    •    Edge Gateways (OpenWrt/Linux)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Global Infrastructure, Cloud Control Plane & Compliance

*Establish production cloud services, database orchestration, and legal foundations.*

- [x] **1.1 Cloud Control Plane Infrastructure**
  - [x] Deploy `zoop-cloud` service on cloud instance (`3.70.135.200.sslip.io`) with automated systemd supervision.
  - [x] Provision Neon Lakebase Postgres database in Frankfurt with automated schema migrations.
  - [x] Configure automated TLS certificate provisioning via Caddy reverse proxy.
  - [x] Implement cryptographic authentication (`zoop-auth-v2`) with Ed25519 signature verification and replay prevention.
- [ ] **1.2 Production Domain & Global Edge**
  - [ ] Provision production domain (`zoopinternet.online`) and DNS routing.
  - [ ] Deploy edge reverse proxy with DDoS protection and low-latency API termination.
- [x] **1.3 Legal, Privacy & Compliance Foundations**
  - [x] Publish comprehensive zero-log Privacy Policy (`PRIVACY.md`) guaranteeing no traffic, payload, or DNS logging.
  - [x] Publish Terms of Service & Acceptable Use Policy (`TERMS.md`) covering provider and recipient guidelines.
  - [x] Deploy public legal edge on Cloudflare Pages (`/privacy`, `/terms`).
  - [x] Establish official privacy and security compliance channels.

---

## Phase 2: Mobile Client Architecture & Toolchains (Completed)

*Establish the cross-platform mobile foundation, native compilation environment, and core app structure.*

- [x] **2.1 Host Environment & Native Toolchains**
  - [x] Configure Flutter SDK (v3.47.2) and Dart toolchain.
  - [x] Configure Android SDK (API 34/35/36) and command-line build tools.
  - [x] Accept all platform licenses and verify environment readiness via `flutter doctor`.
- [x] **2.2 Mobile Client Scaffolding**
  - [x] Initialize Flutter application workspace in `mobile/` (`network.zoop.app`).
  - [x] Establish reactive state management architecture using Riverpod.
  - [x] Implement declarative routing with GoRouter supporting deep links and navigation flows.
- [x] **2.3 Flexible Design System & Tokens**
  - [x] Define theme tokens, semantic palettes, and dynamic typography foundations.
  - [x] Build reusable layout containers and interactive components adaptable to future design evolutions.
- [x] **2.4 Hardware-Backed Secure Storage**
  - [x] Implement encrypted key-value storage backed by Android Keystore and iOS Keychain.
  - [x] Secure cryptographic keypairs, authentication tokens, and sensitive state at rest.
- [x] **2.5 Native Android VPN Service Scaffolding**
  - [x] Create native `ZoopVpnService.kt` and network state listener in Kotlin.
  - [x] Declare required permissions and background service attributes in `AndroidManifest.xml`.

---

## Phase 3: Decentralized Identity, Cloud Handshake & Device Trust (Completed)

*Generate zero-knowledge device identities and establish cryptographically authenticated sessions with the Cloud Control Plane.*

- [x] **3.1 Client-Side Identity Generation**
  - [x] Generate Ed25519 cryptographic keypairs entirely on the local device without requiring personal identifiers.
  - [x] Derive canonical Zoop identifiers and verifiable fingerprints (`ZP-XXXXXX`).
  - [x] Provide seamless backup, recovery phrase generation (BIP-39 24 words), and biometric-gated key export.
- [x] **3.2 Cloud Registration & Mutual Handshake**
  - [x] Perform mutual cryptographic handshake with `zoop-cloud` using `zoop-auth-v2` signed headers.
  - [x] Register new device records in Neon Postgres via `/api/v1/devices` with public key binding.
  - [x] Securely store session credentials and device tokens in hardware-backed storage.
- [x] **3.3 Real-Time Device Presence & Signaling Session**
  - [x] Establish authenticated WebSocket connection to the Cloud Signaling Hub.
  - [x] Maintain lightweight heartbeat for live presence detection, peer reachability, and incoming session signaling.

---

## Phase 4: Android Native Packet Routing Engine & Data Plane Bridge (Completed)

*Implement system-level TUN interface provisioning, IP routing rules, and packet forwarding.*

- [x] **4.1 Flutter-to-Native IPC Bridge**
  - [x] Build bi-directional platform channels (MethodChannel for commands, EventChannel for real-time telemetry).
  - [x] Handle system VPN permissions dialog and user consent lifecycle.
- [x] **4.2 Virtual TUN Interface & System Routing**
  - [x] Provision Android virtual TUN interface via `VpnService.Builder`.
  - [x] Configure IP routing rules (IPv4/IPv6 CIDR routing, MTU configuration, and DNS server assignment).
  - [x] Implement robust DNS routing to prevent platform DNS leakage.
- [x] **4.3 Data Plane Core Integration**
  - [x] Integrate compiled Go mobile data plane engine (`libzoop`) via JNI/CGO.
  - [x] Pass TUN file descriptor to the data plane worker for zero-copy packet encryption and routing.
- [x] **4.4 Fail-Closed Kill-Switch & Leak Prevention**
  - [x] Enforce strict firewall rules: block all non-tunnel traffic when the tunnel drops unexpectedly.
  - [x] Verify zero data leaks during interface switching or engine re-initialization.
- [x] **4.5 Background Persistence & Power Optimization**
  - [x] Configure persistent foreground service with user-friendly status notification.
  - [x] Gracefully handle Android Doze mode and system low-memory conditions without dropping active sessions.

---

## Phase 5: Peer Discovery, Cloud Signaling & Dynamic NAT Traversal (Completed)

*Coordinate direct peer-to-peer tunnels between mobile clients and edge providers, with seamless relay fallback.*

- [x] **5.1 Cloud-Mediated Peer Discovery**
  - [x] Query authorized providers and accessible networks via `zoop-cloud` APIs.
  - [x] Receive real-time peer availability updates through the WebSocket signaling channel.
- [x] **5.2 STUN/TURN & Interactive Connectivity Establishment (ICE)**
  - [x] Perform STUN discovery against Zoop infrastructure (port 3478) to identify public endpoints and NAT mapping behaviors.
  - [x] Exchange candidate endpoints and cryptographic handshake tokens via Cloud Signaling.
  - [x] Execute UDP hole punching to establish direct, low-latency P2P tunnels.
- [x] **5.3 Zero-Knowledge Encrypted Relay Fallback**
  - [x] Detect symmetric NAT or restrictive corporate/cellular firewalls that prevent direct P2P.
  - [x] Transparently fall back to Zoop encrypted relays without exposing plaintext traffic or session keys to the relay server.
  - [x] Continuously probe for direct path recovery in the background.

---

## Phase 6: Recipient Experience & Transparent Routing (Completed)

*Deliver an intuitive, high-performance connection experience for browsing and accessing networks.*

- [x] **6.1 Provider Selection & Dynamic Routing Modes**
  - [x] Display available provider gateways across personal devices, shared circles, and authorized networks.
  - [x] Support flexible routing policies: full internet egress vs. split-tunnel access for specific networks.
- [x] **6.2 Connection Lifecycle & Status Feedback**
  - [x] Provide transparent, step-by-step progress through connection phases (negotiating, punching, authenticating, connected).
  - [x] Clearly display whether the active path is direct peer-to-peer or routed through an encrypted relay.
- [x] **6.3 Real-Time Network Telemetry**
  - [x] Stream real-time performance indicators: round-trip latency, transfer throughput (RX/TX), packet loss, and tunnel uptime.
  - [x] Maintain an active connection log for user review.
- [x] **6.4 Seamless Network Roaming**
  - [x] Handle uninterrupted tunnel migration across network changes (e.g., transition between Wi-Fi and Cellular).
  - [x] Re-negotiate cryptographic session keys and ICE candidates without dropping user application sockets.

---

## Phase 7: Provider Experience & Controlled Gateway Sharing (Completed)

*Transform mobile and edge devices into secure egress gateways with strict owner controls and safety limits.*

- [x] **7.1 Gateway Mode Activation**
  - [x] Provide clear, intentional activation controls for sharing internet access.
  - [x] Enforce client-side cryptographic access checks before routing any third-party packets.
- [x] **7.2 Granular Access Policies**
  - [x] Define sharing boundaries: restrict to personal devices, approved contacts, or explicit access tokens.
  - [x] Enable per-peer approval workflows and dynamic session revocation.
- [x] **7.3 Real-Time Session Monitoring**
  - [x] Display active recipient sessions, current bandwidth consumption, and total data routed.
  - [x] Provide one-tap session disconnection for any active recipient.
- [x] **7.4 Automated Resource Safeguards**
  - [x] Automatically pause or disable sharing on metered cellular connections based on user preferences.
  - [x] Enforce battery and thermal thresholds to prevent device overheating or unexpected power drain.

---

## Phase 8: Multi-Device Mesh, Web Console & Fleet Coordination (Completed)

*Unify mobile devices, desktop nodes, and edge routers into an integrated personal or organizational network.*

- [x] **8.1 Unified Device Graph**
  - [x] Link multiple endpoints (Android, Desktop, OpenWrt Routers) under a single cryptographic account entity.
  - [x] Synchronize authorized peer lists and access rules via the Cloud Control Plane.
- [x] **8.2 Frictionless Device Pairing**
  - [x] Implement fast cross-device pairing using cryptographic QR codes and short-lived out-of-band tokens.
  - [x] Enable mutual authorization between mobile clients and router/desktop nodes.
- [x] **8.3 Edge Router Integration**
  - [x] Connect home and office routers running `zoop-router` to act as dedicated high-speed providers.
  - [x] Allow mobile clients to route egress traffic through home/office routers from anywhere in the world.
- [x] **8.4 Web Management Console Synchronization**
  - [x] Reflect live device fleet status, active sessions, and access permissions in the Zoop Web Console.
  - [x] Enable centralized policy management for teams and organizations.

---

## Phase 9: Diagnostics, Observability & Network Self-Healing

*Empower users and network operators with built-in testing tools and autonomous recovery.*

- [x] **9.1 In-App Diagnostic Tools**
  - [x] Path MTU discovery and packet fragmentation analysis.
  - [x] NAT type classification probe (Full Cone, Restricted Cone, Port Restricted, Symmetric).
  - [x] End-to-end latency and throughput benchmarking against test endpoints.
  - [x] Upstream DNS resolution and leak validation tests.
- [x] **9.2 Privacy-Preserving Troubleshooting Telemetry**
  - [x] Generate sanitized client diagnostic bundles containing connection states and interface error codes.
  - [x] Guarantee zero capture of user payload data, destination IPs, or browsing history in diagnostics.
- [x] **9.3 Autonomous Self-Healing**
  - [x] Implement automated dead-peer detection (DPD) with exponential backoff retries.
  - [x] Seamlessly re-route around failing relays or offline providers to alternate authorized gateways.

---

## Phase 10: Production Hardening, Compliance & App Store Launch

*Verify security, optimize system efficiency, and achieve public release on mobile distribution channels.*

- [ ] **10.1 Security & Leak Verification**
  - [ ] Conduct end-to-end audit for IPv6 leaks, DNS leaks, and WebRTC address leaks under all network transitions.
  - [ ] Validate cryptographic security of key storage, handshake nonces, and packet encryption.
- [ ] **10.2 Battery & Performance Optimization**
  - [ ] Profile CPU and memory overhead during sustained high-throughput transfers.
  - [ ] Minimize wake locks and background polling to ensure negligible battery impact in idle state.
- [ ] **10.3 App Store Compliance & Submission**
  - [ ] Complete Google Play Console safety questionnaires, VPN service policy declarations, and permission disclosures.
  - [ ] Complete Apple App Store NetworkExtension entitlement review and privacy declarations.
  - [ ] Prepare store presentation assets, product documentation, and release metadata.
- [ ] **10.4 Deployment Tracks & General Availability**
  - [ ] Distribute release builds through internal testing tracks (Google Play Internal / TestFlight).
  - [ ] Expand to open beta and execute public store release.
