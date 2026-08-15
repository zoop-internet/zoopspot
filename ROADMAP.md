# Zoop Implementation Roadmap

This document outlines the 25 concrete milestones and implementation tasks required to build the Zoop system.

Each milestone has clear exit criteria ("**Done when**") and sub-tasks that can be tracked as work progresses.

---

## 1. Repository Foundation

- [x] Create Git repository
- [x] Create directory structure
- [x] Initialize Go modules
- [x] Set up `.gitignore`
- [x] Set up GitHub Actions CI
- [x] Add formatting/linting
- [x] Add basic test framework
- [x] Add development configuration
- [x] Add contribution/development conventions
- [x] Verify clean build and test

**Done when:** The repository is clean, builds, tests, and CI passes. (COMPLETED)

---

## 2. Go Core

- [x] Create core Go packages
- [x] Define common types
- [x] Define Device
- [x] Define Provider
- [x] Define Recipient
- [x] Define Identity
- [x] Define Connection
- [x] Define Connection State
- [x] Define network interfaces/abstractions
- [x] Define configuration structures
- [x] Define common errors
- [x] Add unit tests

**Done when:** The core provides stable primitives for the rest of Zoop. (COMPLETED)

---

## 3. Zoop Agent

- [x] Create Agent executable
- [x] Agent configuration
- [x] Agent startup/shutdown
- [x] Agent lifecycle
- [x] Device identity creation
- [x] Secure local identity storage
- [x] Agent state
- [x] Agent status
- [x] Logging
- [x] Error handling
- [x] Health checks
- [x] Agent tests

**Done when:** An endpoint can run a Zoop Agent and maintain its own identity/state. (COMPLETED)

---

## 4. Control Plane

- [x] Create Go Cloud service
- [x] Create API
- [x] Create user model
- [x] Create device model
- [x] Device registration
- [x] Device authentication
- [x] Device lookup
- [x] Device discovery
- [x] Basic signaling
- [x] Store public keys
- [x] Store connection metadata
- [x] Basic authorization
- [x] Control Plane tests

**Done when:** Zoop Cloud can manage and coordinate registered devices. (COMPLETED)

---

## 5. Agent ↔ Control Plane

- [x] Agent connects to Cloud
- [x] Agent authenticates
- [x] Device registration
- [x] Device synchronization
- [x] Device discovery
- [x] Peer lookup
- [x] Peer authorization
- [x] Exchange connection information
- [x] Signaling
- [x] Connection state synchronization
- [x] Handle Cloud disconnects

**Done when:** Two real Agents can discover and authorize each other through Zoop Cloud. (COMPLETED)

---

## 6. Secure Tunnel

- [x] Integrate WireGuard
- [x] Generate/manage tunnel keys
- [x] Create tunnel configuration
- [x] Create tunnel interface
- [x] Configure peers
- [x] Establish Provider ↔ Recipient tunnel
- [x] Bring tunnel up/down
- [x] Detect tunnel state
- [x] Remove tunnel
- [x] Tunnel tests

**Done when:** Two endpoints can establish an authenticated encrypted tunnel. (COMPLETED)

---

## 7. Real Packet Forwarding

*This is the first major **real Data Plane** milestone.*

- [x] Connect tunnel interface to networking
- [x] Receive packets
- [x] Forward packets
- [x] Route packets
- [x] Return packets
- [x] Configure forwarding
- [x] Handle packet addresses
- [x] Test TCP
- [x] Test UDP
- [x] Test bidirectional traffic
- [x] Verify packet integrity

**Done when:** Actual packets travel through Zoop between two endpoints. (COMPLETED)

---

## 8. Real Internet Traffic

*Now prove the system can actually do what we want.*

- [x] Configure Provider Internet interface
- [x] Configure Recipient routes
- [x] Enable forwarding
- [x] Configure NAT
- [x] Configure DNS
- [x] Route Recipient traffic
- [x] Return Internet traffic
- [x] Test HTTP
- [x] Test HTTPS
- [x] Test DNS
- [x] Test UDP applications
- [x] Test multiple connections

```text
PHONE
  │
  │ Zoop
  ▼
PROVIDER
  │
  ▼
INTERNET
```

**Done when:** A real phone can browse the Internet through the Provider. (COMPLETED)

---

## 9. Direct Connectivity

*Now make the connection truly **device-to-device**.*

- [x] Discover local addresses
- [x] Discover public addresses
- [x] Exchange endpoint information
- [x] Test direct UDP connectivity
- [x] Establish direct path
- [x] Verify direct path
- [x] Detect path type
- [x] Prefer direct connection
- [x] Monitor direct connection

**Done when:** Endpoints can establish a direct connection without sending traffic through Zoop Cloud. (COMPLETED)

---

## 10. NAT Traversal

- [x] Identify NAT conditions
- [x] Endpoint discovery
- [x] STUN integration/implementation where appropriate
- [x] UDP hole punching
- [x] NAT mapping discovery
- [x] NAT-to-NAT connection
- [x] Different NAT scenarios
- [x] Restricted networks
- [x] Connection verification
- [x] NAT failure handling

**Done when:** Zoop can establish direct connectivity across common real-world NAT configurations. (COMPLETED)

---

## 11. Relay Fallback

- [x] Create relay service
- [x] Relay authentication
- [x] Relay connection
- [x] Forward encrypted packets
- [x] Detect direct-path failure
- [x] Switch to relay
- [x] Monitor relay
- [x] Attempt direct recovery
- [x] Switch relay → direct
- [x] Relay failure handling

**Done when:** Traffic reliably falls back to relay when direct connectivity fails, and upgrades when direct connectivity becomes available. (COMPLETED)

```text
Direct available
      ↓
   DIRECT

Direct unavailable
      ↓
    RELAY

Direct becomes available
      ↓
   DIRECT
```

**Done when:** Fallback to relay and automatic promotion to direct connection works seamlessly.

---

## 12. Connection Recovery

- [x] Detect connection failure
- [x] Reconnect
- [x] Network-change detection
- [x] Wi-Fi → Cellular
- [x] Cellular → Wi-Fi
- [x] IP address changes
- [x] NAT mapping changes
- [x] Tunnel restart
- [x] Provider restart
- [x] Recipient restart
- [x] Control Plane interruption
- [x] Relay recovery
- [x] State synchronization

**Done when:** Normal network failures don't permanently break a Zoop connection. (COMPLETED)

---

## 13. Security Hardening

- [x] Harden device identity
- [x] Secure key storage
- [x] Authentication hardening
- [x] Authorization enforcement
- [x] Device revocation
- [x] Key rotation
- [x] Session security
- [x] API security
- [x] Secure configuration
- [x] Secret management
- [x] Unauthorized-device testing
- [x] Threat-model testing
- [x] Dependency security scanning

**Done when:** The security model is enforced rather than merely documented. (COMPLETED)

---

## 14. Desktop / Server Agent Hardening

- [x] Linux daemonization
- [x] macOS Agent
- [x] Windows Agent
- [x] Cross-platform local APIs
- [x] CLI polish
- [x] System service integration

**Done when:** The Go agent runs robustly as a background service on standard desktop/server OSs. (COMPLETED)

---

## 15. Router Integration

- [x] Router Agent
- [x] OpenWrt package compilation
- [x] UCI configuration integration
- [x] Multi-device LAN gateway routing
- [x] Provider mode
- [x] Router diagnostics

**Done when:** A Zoop Router can provide connectivity to devices behind it via embedded Linux systems. (COMPLETED)

---

## 16. Management Web Application

- [x] React + TypeScript setup
- [x] Web Architecture & Domain Separation (`docs/web.md`)
- [x] Device management UI (`app.zoop.com`)
- [x] Provider management UI (`app.zoop.com`)
- [x] Recipient management UI (`app.zoop.com`)
- [x] Sharing management UI (`app.zoop.com`)
- [x] Connection status UI (`app.zoop.com`)
- [x] Organization management UI (`app.zoop.com/org`)
- [x] Zoop Admin Console & Relays UI (`admin.zoop.com`)
- [x] Authentication UI Integration
- [x] Live WebSocket signal sync

**Done when:** Users can manage Zoop relationships, devices, and providers via a web dashboard before mobile clients are built. (COMPLETED)

---

## 17. Mobile Core Integration (Native Bindings)

- [x] Export Go core to C-shared library (`libzoop.so` / `libzoop.h`)
- [x] Generate gomobile bindings (`packages/platform/mobile`)
- [x] Android AAR packaging (`mobile/android`)
- [x] iOS XCFramework packaging (`mobile/ios`)
- [x] Expose connection state to native bridging (`StateCallback`)
- [x] Verify bindings in mobile integration tests

**Done when:** The core Go agent can be invoked and controlled from native Java/Kotlin and Swift environments. (COMPLETED)

---

## 18. Persistent Database & State Layer (PostgreSQL + Redis)

- [x] PostgreSQL store implementation for Control Plane `Store` interface (`packages/cloud/store/postgres.go`)
- [x] Relational schema migrations (`packages/cloud/store/migrations/001_initial_schema.sql`)
- [x] Indexed UUID lookups and cryptographic public key indices
- [x] Redis integration for ephemeral signaling sessions, presence, and pub/sub (`packages/cloud/store/redis.go`)
- [x] Persistent IPAM subnet pool allocator
- [x] Database integration tests and schema validation

**Done when:** All Control Plane data survives server restarts and scales horizontally across stateless API replicas. (COMPLETED)

---

## 19. Cryptographic Security, Auth & Abuse Prevention

- [x] Strict Ed25519 request signature verification on all protected endpoints (`packages/cloud/api/middleware.go`)
- [x] Cryptographic nonce & timestamp replay attack mitigation (`NonceCache` with 5-minute sliding window)
- [x] Real-time device revocation and instant token / WebSocket session eviction
- [x] API rate limiting & DDoS mitigation middleware (`packages/cloud/api/ratelimit.go`)
- [x] Cryptographically signed audit logging for all organizational changes (`packages/cloud/services/audit.go`)
- [x] Security vulnerability and unit test suite (`packages/cloud/api/security_test.go`)

**Done when:** Control Plane endpoints cannot be spoofed, replayed, or abused, and revoked devices are instantly severed. (COMPLETED)

---

## 20. Distributed Multi-Node Relay & STUN/TURN Infrastructure

- [x] Multi-region relay cluster coordination in Control Plane
- [x] Dynamic relay selection based on geo-location and RTT latency probes
- [x] STUN/TURN server allocation for restrictive symmetric NAT traversal
- [x] Relay bandwidth metering and session isolation
- [x] Relay failover stress testing under network partition

**Done when:** Peers on restrictive symmetric NATs can relay through the lowest-latency geo-distributed relay nodes. (COMPLETED)

---

## 21. Observability, Telemetry & Diagnostics

- [x] Prometheus metrics exporter (`/metrics`) for Control Plane and Agent
- [x] Structured distributed tracing across signaling and data plane
- [x] Deep connection state machine telemetry (P2P vs Relay, handshake RTT, packet loss, bandwidth)
- [x] CLI and API diagnostic health probes (`zoop doctor` / `/v1/health`)
- [x] Real-time alerting for signaling disconnects and relay saturation

**Done when:** We can inspect, trace, and diagnose any connection failure, latency spike, or route degradation in real time. (COMPLETED)

---

## 22. Multi-Node Real-Network Simulation & E2E Validation

- [ ] Docker Compose multi-subnet testbed simulating WAN, CGNAT, Symmetric NAT, and Port-Restricted Cones
- [ ] Automated network degradation simulation (packet loss, jitter, bandwidth throttling)
- [ ] Seamless Wi-Fi ↔ Cellular roaming validation under heavy traffic
- [ ] Long-running tunnel endurance and memory leak validation
- [ ] Router LAN policy routing validation with real forwarding traffic

**Done when:** Zoop is proven rock-solid across hostile, degraded, and complex real-world network topologies.

---

## 23. Android Native Client Implementation

- [ ] Kotlin UI (Jetpack Compose / Material 3) for device & connection management
- [ ] Foreground Service lifecycle with persistent status notification
- [ ] Android Doze & aggressive battery optimization handling
- [ ] Automatic network roaming listener (Wi-Fi <-> 5G)
- [ ] VPN consent and runtime permission handling

**Done when:** Android devices can act as Zoop endpoints using a polished native app.

---

## 24. iOS Native Client Implementation

- [ ] SwiftUI views for connection management and QR pairing
- [ ] Apple NetworkExtension (`NEPacketTunnelProvider`) integration
- [ ] iOS background execution limits and `NWPathMonitor` transitions
- [ ] Secure Enclave / Keychain integration for cryptographic keys
- [ ] System VPN profile configuration and permissions

**Done when:** iOS devices can act as Zoop endpoints using a polished native app.

---

## 25. Production Infrastructure & Global Validation

- [ ] Production deployment automation (Terraform / Helm / Docker)
- [ ] High-availability PostgreSQL and Redis clustering
- [ ] Automated TLS certificate provisioning and anycast DNS
- [ ] End-to-end global validation across international endpoints
- [ ] Production operational runbooks and disaster recovery testing

**Done when:** The complete Zoop ecosystem is deployed, secure, observable, and running reliably for global production traffic. The implemented system satisfies the Zoop architecture and the original idea has been demonstrated with real devices and real network traffic.
