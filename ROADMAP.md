# ZOOP: Product & Engineering Roadmap

This roadmap defines the core phases and milestones to take ZOOP to a shippable, consumer-ready Minimum Viable Product (MVP).

The foundational networking engine (Data Plane, Control Plane, Cloud Infrastructure) is operational. The current focus is on **the Mobile Client, Native Platform Integrations, and Public Store Launch**.

> [!NOTE]
> **Space for Innovation**: This roadmap outlines functional capabilities, architectural milestones, and user goals. Specific visual layouts, color palettes, typography, and interaction patterns are deliberately left open to allow design freedom and continuous innovation based on user feedback and evolving platform capabilities.

---

## Phase 1: Infrastructure & Store Compliance
*Establish production hosting and fulfill store prerequisites.*

- [ ] **1.1 Production Domain & Routing** *(Pending custom domain purchase)*
  - [ ] Connect production custom domain (`zoopinternet.online`).
  - [ ] Configure production API endpoints and edge routing.
- [x] **1.2 Legal & Privacy Prerequisites**
  - [x] Publish comprehensive Privacy Policy declaring zero logging of traffic payloads, DNS, or browsing activity (`PRIVACY.md`).
  - [x] Publish Terms of Service & EULA defining acceptable use and provider/recipient guidelines (`TERMS.md`).
  - [x] Host legal pages on the public web edge (`/privacy`, `/terms`).
  - [x] Establish official support and compliance communication channels.

---

## Phase 2: Mobile Application Foundation (Completed)
*Cross-platform client architecture and foundational application infrastructure.*

- [x] **2.1 Mobile Workspace & Toolchain**
  - [x] Initialize cross-platform mobile application in `mobile/` (`network.zoop.app`).
  - [x] Configure build toolchains, SDK dependencies, and development environment.
- [x] **2.2 Design System & Component Library**
  - [x] Establish core design tokens, thematic styles, and reusable UI components.
  - [x] Create extensible visual foundations adaptable to future styling iterations.
- [x] **2.3 Application Architecture & State Management**
  - [x] Implement reactive state management across app modules.
  - [x] Configure declarative routing supporting deep linking and screen transitions.
- [x] **2.4 Secure Local Storage**
  - [x] Implement encrypted key-value storage using hardware-backed platform keystores.
  - [x] Protect cryptographic identity credentials and authentication tokens at rest.

---

## Phase 3: Identity & Onboarding
*First-run user journey establishing decentralized identity and device trust.*

- [ ] **3.1 Frictionless Onboarding**
  - [ ] Introduce Zoop's decentralized connectivity model without commercial VPN cliches.
  - [ ] Support zero-knowledge account creation (no email, phone number, or third-party sign-in required).
- [ ] **3.2 Cryptographic Identity Generation**
  - [ ] Generate cryptographic keypairs locally on the client device.
  - [ ] Derive user-friendly device identifiers and cryptographic fingerprints.
  - [ ] Authenticate and register the device with the cloud signaling control plane.
- [ ] **3.3 Identity Protection & Recovery**
  - [ ] Provide simple, secure backup and recovery mechanisms for user keys.
  - [ ] Guard sensitive key export behind device biometric authentication.

---

## Phase 4: Native VPN & Packet Routing Engine
*Operating system packet routing and background tunnel lifecycle.*

- [ ] **4.1 Android VPN Service**
  - [ ] Establish communication bridge between cross-platform UI and Android background VPN service.
  - [ ] Handle system VPN permissions, TUN interface provisioning, and routing tables.
  - [ ] Stream real-time connection lifecycle and network events to the UI.
- [ ] **4.2 iOS NetworkExtension**
  - [ ] Integrate packet tunnel provider for iOS network extension.
  - [ ] Manage system VPN configurations and memory optimization.
- [ ] **4.3 Background Persistence & Power Optimization**
  - [ ] Configure persistent background service and status notifications.
  - [ ] Handle system sleep states and provide battery optimization guidance.

---

## Phase 5: Connecting (Recipient Experience)
*Discovering, connecting to, and monitoring secure tunnels through trusted providers.*

- [ ] **5.1 Provider Discovery**
  - [ ] Discover and list available authorized providers across personal devices, peers, and organizations.
  - [ ] Display real-time availability and provider status.
- [ ] **5.2 Connection Flow & State Transparency**
  - [ ] Establish secure tunnels with transparent connection phase feedback.
  - [ ] Clearly indicate connection type (direct peer-to-peer vs. encrypted relay).
- [ ] **5.3 Real-Time Network Observability**
  - [ ] Display live connection telemetry: latency, throughput, and protocol health.
  - [ ] Handle seamless network roaming during network transitions (Wi-Fi <-> Cellular).

---

## Phase 6: Sharing (Provider Experience)
*Enabling devices to act as secure egress gateways for authorized peers.*

- [ ] **6.1 Gateway Sharing Controls**
  - [ ] Provide clear, intentional controls to enable or disable connection sharing.
  - [ ] Communicate provider responsibilities and network boundaries.
- [ ] **6.2 Connected Peer Management**
  - [ ] Provide real-time visibility into connected peers and resource usage.
  - [ ] Support instant access revocation and session termination.
- [ ] **6.3 Access Authorization & Safeguards**
  - [ ] Handle inbound connection requests with flexible authorization rules.
  - [ ] Apply automated safeguards for metered networks and low battery states.

---

## Phase 7: Multi-Device Mesh & Fleet Management
*Unified device management and collaborative network relationships.*

- [ ] **7.1 Multi-Device Management**
  - [ ] Manage all personal devices under a unified cryptographic identity.
  - [ ] Enable frictionless device pairing across platforms.
  - [ ] Support team networks, shared access circles, and organization policies.
- [ ] **7.2 Diagnostics & Self-Healing**
  - [ ] Provide built-in network path testing, NAT detection, and diagnostic tools.
  - [ ] Generate sanitized logs for troubleshooting without compromising privacy.

---

## Phase 8: Hardening & App Store Distribution
*Validation, platform compliance, and public release.*

- [ ] **8.1 Quality Assurance & Resilience**
  - [ ] Validate tunnel stability across real-world network disruptions and edge cases.
  - [ ] Verify zero-leak kill-switch behavior during transitions.
- [ ] **8.2 Store Compliance & Assets**
  - [ ] Complete Google Play and Apple App Store privacy questionnaires and documentation.
  - [ ] Prepare store presentation assets and demonstration materials.
- [ ] **8.3 Distribution & Release**
  - [ ] Launch internal and public beta test tracks (TestFlight / Google Play Console).
  - [ ] Public store submission and general availability.
