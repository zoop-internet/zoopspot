# ZOOP: The Real MVP Roadmap

This roadmap defines the outcome-oriented execution plan to take ZOOP from a proven backend architecture to a **shippable, consumer-ready Minimum Viable Product (MVP)**.

The core networking (Data Plane, Control Plane, Cloud Infrastructure) is **operational**. The roadmap focuses on **the Mobile Product Experience, Native OS Bridges, Trust & Sharing Architecture, and Store Launch**.

> [!NOTE]
> **Product & Design Philosophy**: Aligned with the **[Zoop Mobile Product Experience Specification](mobile/README.md)**, this roadmap describes **real user outcomes, system capabilities, behavioral expectations, and technical boundaries**. It intentionally avoids prescribing rigid UI widgets or micro-wireframes ("put an icon here"), empowering the engineering and design agent to utilize its skills and best judgment to create a distinct, modern, dark-mode experience that feels authentically like Zoop.

---

## Phase 1: Production Infrastructure & Legal Compliance (Store Prerequisites)
*Ensure legal compliance, zero-logging transparency, and cloud endpoints meet Apple App Store and Google Play requirements.*

- [ ] **1.1 Custom Domain & Production Edge Integration** *(Pending domain purchase by user)*
  - [ ] Acquire and configure target apex domain `zoopinternet.online`.
  - [ ] Attach Cloudflare Pages production web frontend (`app.zoopinternet.online` / apex).
  - [ ] Configure AWS EC2 control plane API endpoint (`api.zoopinternet.online`) with automated Caddy TLS.
  - [ ] Point frontend and mobile environment configuration to the production API.
- [x] **1.2 Legal, Privacy & Store Compliance**
  - [x] Formulate legally binding **Privacy Policy** declaring zero logging of traffic payloads, DNS, or browsing destinations (`PRIVACY.md`).
  - [x] Establish **Terms of Service & EULA** governing P2P mesh usage, provider egress responsibilities, and acceptable use (`TERMS.md`).
  - [x] Host prerendered legal pages on the public web edge (`/privacy`, `/terms`) with full sitemap and SEO support.
  - [x] Set up official store contact and compliance channels (`support@zoopinternet.online`, `legal@zoopinternet.online`).

---

## Phase 2: Mobile Platform & Architecture Foundation (Completed)
*Cross-platform Flutter application foundation with production tooling, reactive state architecture, and hardware-backed security.*

- [x] **2.1 Mobile Application Toolchain & Project Initialization**
  - [x] Initialize cross-platform Flutter application in `mobile/` with bundle ID `network.zoop.app`.
  - [x] Set up host development toolchain with Flutter 3.47 (Channel stable), Dart 3.13, and Android SDK (API 34/36).
  - [x] Establish Android build automation using Gradle 9.3.1 and persistent environment configuration.
- [x] **2.2 Design System & Visual Foundation**
  - [x] Establish dark-mode design system tokens (`ZoopColors`) featuring deep space surfaces (`#0B0F19`), slate card elevations, brand cyan (`#00D2FF`), and emerald green status accents.
  - [x] Configure global typography with Inter for primary readability and JetBrains Mono for cryptographic identifiers.
  - [x] Establish high-contrast Material 3 dark theme with standardized component elevations and button treatments.
- [x] **2.3 Reactive State & Declarative Routing**
  - [x] Integrate Riverpod reactive state management at the application root (`ProviderScope`).
  - [x] Implement declarative routing via `GoRouter` supporting deep linking and unified screen transitions.
- [x] **2.4 Hardware-Backed Secure Storage**
  - [x] Implement secure storage service backed by Android Keystore (encrypted shared preferences) and iOS Keychain.
  - [x] Ensure Ed25519 identity keypairs and sensitive auth tokens never touch unencrypted local storage.

---

## Phase 3: Identity, Cryptographic Trust & Onboarding Experience
*First-run user journey establishing decentralized identity and device trust without invasive personal data collection.*

- [ ] **3.1 Frictionless Decentralized Onboarding**
  - [ ] Introduce Zoop's core mental model: a private connectivity mesh connecting people, devices, and networks — not a conventional commercial VPN.
  - [ ] Emphasize zero-knowledge architecture: no phone number, email, or third-party OAuth account required to establish an identity.
- [ ] **3.2 Cryptographic Identity Generation & Registration**
  - [ ] Generate secure Ed25519 keypairs entirely on the local device.
  - [ ] Derive a deterministic, user-friendly ZoopID and device fingerprint.
  - [ ] Execute an authenticated cryptographic handshake (`zoop-auth-v2`) with the `zoop-cloud` control plane to register the new device.
- [ ] **3.3 Identity Protection, Export & Recovery**
  - [ ] Provide clear, secure mechanisms for users to backup and restore their identity keypair (exportable phrase / offline backup).
  - [ ] Guard identity export actions behind device-level biometric authentication (Fingerprint / FaceID).

---

## Phase 4: Native OS VPN & Packet Routing Engine Bridge
*Low-level operating system integration routing system network traffic through the userspace WireGuard engine.*

- [ ] **4.1 Android VpnService Lifecycle & Permission Management**
  - [ ] Wire Flutter `MethodChannel` to manage `ZoopVpnService` lifecycle (prepare, start, pause, resume, terminate).
  - [ ] Handle OS VPN preparation dialogs and establish native TUN interface with appropriate MTU and route configurations.
  - [ ] Stream real-time native connection lifecycle and roaming updates into Flutter via `EventChannel`.
- [ ] **4.2 iOS NetworkExtension & Packet Tunnel Provider**
  - [ ] Wire Flutter bridge to communicate with `ZoopPacketTunnelProvider` (NetworkExtension).
  - [ ] Manage VPN profile installation via `NETunnelProviderManager`.
  - [ ] Ensure tunnel memory profile stays strictly within iOS memory ceilings (<50MB).
- [ ] **4.3 Background Persistence & Power Optimization**
  - [ ] Configure Android persistent foreground notification displaying live tunnel status and quick-disconnect capability.
  - [ ] Implement power-aware polling backoff during device sleep (Android Doze mode / iOS background execution).
  - [ ] Provide user guidance for battery optimization whitelisting to prevent unintended background process termination.

---

## Phase 5: Connection Experience (Recipient Mode — Consuming Connectivity)
*Empowering users to discover, connect to, and monitor secure tunnels through trusted providers.*

- [ ] **5.1 Relationship Discovery & Provider Availability**
  - [ ] Fetch and display authorized providers across personal devices, shared circles, and organizations.
  - [ ] Clearly distinguish between provider types: personal home gateways, trusted peers, and organization exit nodes.
- [ ] **5.2 Transparent Connection Progression**
  - [ ] Provide continuous, clear feedback through all connection phases: local TUN setup, STUN/TURN discovery, direct P2P NAT traversal, or encrypted relay fallback.
  - [ ] Ensure the user can always answer: *"Who or what am I connected through, and is this connection direct or relayed?"*
- [ ] **5.3 Real-Time Connection Health & Telemetry**
  - [ ] Surface real-time connection telemetry: round-trip latency (ping), upstream/downstream throughput, and tunnel protocol confirmation.
  - [ ] Implement seamless network roaming: automatically adjust routing and re-probe endpoints during Wi-Fi <-> Cellular handovers without dropping TCP sessions.

---

## Phase 6: Sharing Experience (Provider Mode — Gateway & Trust Management)
*Transforming the mobile device into a secure gateway for authorized peers with full provider autonomy.*

- [ ] **6.1 Provider Sharing Controls & Responsibilities**
  - [ ] Provide explicit, unambiguous controls to enable or disable connection sharing.
  - [ ] Clearly communicate provider responsibilities (acting as the network egress for connected recipients).
- [ ] **6.2 Connected Recipient Visibility & Session Control**
  - [ ] Provide real-time visibility into all currently connected peer devices.
  - [ ] Display per-peer session duration and bandwidth consumption.
  - [ ] Implement immediate, one-tap session termination to instantly sever a recipient's tunnel.
- [ ] **6.3 Inbound Connection Authorization & Safeguards**
  - [ ] Handle inbound connection requests via real-time signaling with options for one-time, session-based, or permanent authorization.
  - [ ] Enforce automated safeguards: pause sharing on metered cellular networks, low battery thresholds, or high thermal state.

---

## Phase 7: Multi-Device Mesh, Organizations & Diagnostics
*Deepening user capability across device fleets, team networks, and advanced troubleshooting.*

- [ ] **7.1 Multi-Device Fleet Management**
  - [ ] Manage all devices belonging to the user's ZoopID (mobile, laptop, home server, router) in a unified view.
  - [ ] Enable peer-to-peer pairing between user devices via QR code scan or ephemeral exchange code.
- [ ] **7.2 Organization & Workspace Scoping**
  - [ ] Allow users to join or switch between personal and organizational network contexts.
  - [ ] Enforce organization access policies and custom gateway routing rules.
- [ ] **7.3 Diagnostics, Connectivity Probing & Self-Healing**
  - [ ] Built-in diagnostic tools: STUN NAT type detection, TURN relay reachability testing, MTU path probing, and DNS leak checks.
  - [ ] Exportable, sanitized diagnostic logs to facilitate user support without exposing private payload metadata.

---

## Phase 8: Quality Assurance, Hardening & Public Store Launch
*Rigorous real-world validation, store submission compliance, and release distribution.*

- [ ] **8.1 Real-World Chaos & Roaming Validation**
  - [ ] Validate tunnel survival through cellular signal drops, captive portal transitions, and rapid network switching.
  - [ ] Verify zero traffic leakage during tunnel establishment and teardown (fail-closed kill switch behavior).
- [ ] **8.2 Store Assets & Compliance Questionnaires**
  - [ ] Complete Google Play Data Safety declaration (confirming zero collection of payload or browsing data).
  - [ ] Complete Apple Privacy Nutrition Labels and App Store Review Guideline 5.4 compliance documentation.
  - [ ] Prepare high-fidelity store screenshots, demo walk-through video, and clear value-proposition descriptions.
- [ ] **8.3 Distribution & Public Availability**
  - [ ] Release internal test tracks (Google Play Internal Testing & Apple TestFlight).
  - [ ] Conduct end-to-end beta with distributed nodes.
  - [ ] Public store submission and global release.
