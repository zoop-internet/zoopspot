# Zoop Implementation Roadmap

This document outlines the 22 concrete milestones and implementation tasks required to build the Zoop system.

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

- [ ] Detect connection failure
- [ ] Reconnect
- [ ] Network-change detection
- [ ] Wi-Fi → Cellular
- [ ] Cellular → Wi-Fi
- [ ] IP address changes
- [ ] NAT mapping changes
- [ ] Tunnel restart
- [ ] Provider restart
- [ ] Recipient restart
- [ ] Control Plane interruption
- [ ] Relay recovery
- [ ] State synchronization

**Done when:** Normal network failures don't permanently break a Zoop connection.

---

## 13. Security Hardening

- [ ] Harden device identity
- [ ] Secure key storage
- [ ] Authentication hardening
- [ ] Authorization enforcement
- [ ] Device revocation
- [ ] Key rotation
- [ ] Session security
- [ ] API security
- [ ] Secure configuration
- [ ] Secret management
- [ ] Unauthorized-device testing
- [ ] Threat-model testing
- [ ] Dependency security scanning

**Done when:** The security model is enforced rather than merely documented.

---

## 14. Platform Implementations

### Linux
- [ ] Linux Agent
- [ ] Linux networking
- [ ] Routing
- [ ] Forwarding
- [ ] NAT
- [ ] Service management

### Android
- [ ] Android Agent
- [ ] Kotlin integration
- [ ] VPN integration
- [ ] Permissions
- [ ] Background behavior
- [ ] Network changes
- [ ] Battery constraints

### iOS
- [ ] Swift integration
- [ ] Network/VPN integration
- [ ] Permissions
- [ ] Background limitations
- [ ] Network changes

### Shared
- [ ] Common identity
- [ ] Common protocol behavior
- [ ] Common Control Plane communication
- [ ] Common connection state

**Done when:** Supported platforms can participate in Zoop using the same underlying architecture.

---

## 15. Router

- [ ] Router Agent
- [ ] Router identity
- [ ] WAN configuration
- [ ] LAN configuration
- [ ] Routing
- [ ] Forwarding
- [ ] NAT
- [ ] Provider mode
- [ ] Recipient mode where applicable
- [ ] Router management
- [ ] Router diagnostics

**Done when:** A Zoop Router can provide connectivity to devices behind it.

---

## 16. Web Application

- [ ] React + TypeScript setup
- [ ] Authentication UI
- [ ] Device management
- [ ] Provider management
- [ ] Recipient management
- [ ] Sharing management
- [ ] Connection status
- [ ] Network status
- [ ] Security settings
- [ ] Organization management
- [ ] Diagnostics

**Done when:** Users can manage Zoop without manually manipulating the underlying system.

---

## 17. Observability

- [ ] Agent logs
- [ ] Cloud logs
- [ ] Connection state
- [ ] Tunnel state
- [ ] Direct/relay status
- [ ] NAT status
- [ ] Latency
- [ ] Packet loss
- [ ] Throughput
- [ ] Connection events
- [ ] Error reporting
- [ ] Health monitoring
- [ ] User-facing diagnostics

Example:

```text
Identity        ✓
Authorization   ✓
Discovery       ✓
NAT traversal   ✓
Direct path     ✗
Relay           ✓
Tunnel          ✓
Internet        ✓
```

**Done when:** We can explain why a connection works, fails, or is using a relay.

---

## 18. Real-Network Validation

Test with actual devices and networks:

- [ ] Phone → Provider
- [ ] Phone → Internet
- [ ] Wi-Fi → Wi-Fi
- [ ] Wi-Fi → Cellular
- [ ] Cellular → Wi-Fi
- [ ] Cellular → Cellular
- [ ] NAT → NAT
- [ ] IPv4 → IPv4
- [ ] IPv6 → IPv6
- [ ] Restricted networks
- [ ] Direct connection
- [ ] Relay connection
- [ ] Relay → Direct
- [ ] Network switching
- [ ] Device restart
- [ ] Long-running connections

**Done when:** Zoop works outside our development machine/network.

---

## 19. Performance Optimization

- [ ] Measure latency
- [ ] Measure throughput
- [ ] Measure CPU
- [ ] Measure memory
- [ ] Measure tunnel overhead
- [ ] Measure direct path
- [ ] Measure relay path
- [ ] Measure connection establishment
- [ ] Measure recovery time
- [ ] Identify bottlenecks
- [ ] Optimize
- [ ] Re-test

**Done when:** Performance meets the requirements established for Zoop.

---

## 20. Production Infrastructure

- [ ] Choose production infrastructure
- [ ] Deploy Control Plane
- [ ] Deploy database
- [ ] Configure DNS
- [ ] Configure TLS
- [ ] Configure secrets
- [ ] Configure networking
- [ ] Configure monitoring
- [ ] Configure backups
- [ ] Configure CI/CD
- [ ] Configure environments
- [ ] Configure deployment automation

**Done when:** Zoop Cloud can operate reliably outside development.

---

## 21. Production Hardening

- [ ] Security audit
- [ ] Dependency audit
- [ ] API security testing
- [ ] Network security testing
- [ ] Load testing
- [ ] Failure testing
- [ ] Recovery testing
- [ ] Upgrade testing
- [ ] Backup restoration
- [ ] Access-control review
- [ ] Privacy review
- [ ] Operational procedures

**Done when:** The system is prepared for real users rather than only development testing.

---

## 22. Complete System Validation

Finally test the entire chain:

```text
                    ZOOP CLOUD
                        │
              Identity / Discovery
                        │
              Authorization / Signaling
                        │
             ┌──────────┴──────────┐
             │                     │
          PROVIDER              RECIPIENT
             │                     │
             └──── DIRECT TUNNEL ──┘
                        │
                        ▼
                     INTERNET
```

Verify:

- [ ] Identity works
- [ ] Authorization works
- [ ] Discovery works
- [ ] Signaling works
- [ ] Direct connectivity works
- [ ] NAT traversal works
- [ ] Tunnel works
- [ ] Routing works
- [ ] Forwarding works
- [ ] NAT works
- [ ] DNS works
- [ ] Real Internet traffic works
- [ ] Relay fallback works
- [ ] Recovery works
- [ ] Mobile works
- [ ] Router works
- [ ] Security works
- [ ] Performance works
- [ ] Observability works

**Done when:** The implemented system satisfies the Zoop architecture and the original idea has been demonstrated with real devices and real network traffic.
