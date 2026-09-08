# Zoop Internet Documentation Hub

Welcome to the technical documentation library for **Zoop Internet**. This directory contains architectural specifications, protocol designs, implementation guides, operational runbooks, and compliance documentation.

---

## 1. System Architecture & Fundamentals

| Document | Description |
|---|---|
| **[Architecture Overview](architecture.md)** | Core principles, control plane vs. data plane separation, and high-level system topology. |
| **[Data Plane Specification](data-plane.md)** | WireGuard user-space tunneling, TUN lifecycle, MTU clamping, and packet forwarding mechanics. |
| **[Control Plane Specification](control-plane.md)** | Central coordinator architecture, identity verification, authorization rules, and signaling hub. |
| **[Networking & NAT Traversal](networking.md)** | STUN reflexive discovery, `muxbind` UDP socket sharing, NAT hole punching, and zero-drop roaming. |
| **[IPAM & Relays](ipam-and-relays.md)** | Carrier-Grade NAT (`100.64.0.0/10`) allocation algorithms and zero-knowledge WebSocket relay fallback. |
| **[Technology Stack](technology.md)** | Engineering rationale for Go, user-space WireGuard, PostgreSQL/Neon, React, and Flutter. |

---

## 2. Security, Cryptography & Identity

| Document | Description |
|---|---|
| **[Identity & Cryptography](identity.md)** | Ed25519 node identity generation, public key fingerprinting, and account/device relationships. |
| **[Security Architecture](security.md)** | Threat models, WireGuard `Noise_IK` handshake pattern, replay mitigation, and memory safety. |
| **[Abuse & Safety](abuse-and-safety.md)** | Rate limiting, anomalous traffic detection, peer revocation, and network safety controls. |
| **[Entities & Domain Models](entities.md)** | Core domain entity relationships (Accounts, Devices, Endpoints, Shares, Connections). |

---

## 3. Platform Integrations & Endpoints

| Document | Description |
|---|---|
| **[Platform Implementations](platforms.md)** | Operating system abstractions across Linux Netlink, macOS `utun`, Windows `Wintun`, and OpenWrt router firmware. |
| **[Mobile Architecture](mobile.md)** | Native Gomobile bindings, Android `VpnService` integration, and iOS `PacketTunnelProvider` extension. |
| **[Web Console Architecture](web.md)** | React 19 + TypeScript management dashboard, state management, and edge caching on Cloudflare Pages. |
| **[Organizations & Fleet Management](organizations.md)** | Multi-tenant organization policies, RBAC roles (Owner, Admin, Member), and audit logging. |

---

## 4. API & Protocol Specifications

| Document | Description |
|---|---|
| **[API Specification](api.md)** | Comprehensive REST HTTP endpoints and WebSocket signaling protocol specification with payload examples. |
| **[Future Protocol Exploration](future.md)** | Protocol evolution roadmap, multipath routing, and decentralized signaling investigations. |

---

## 5. Operational Runbooks & Compliance

### Operational Runbooks ([`runbooks/`](runbooks/))
- **[Incident Response Runbook](runbooks/incident-response.md)**: Procedures for relay outages, signaling degradations, and security events.
- **[Disaster Recovery Runbook](runbooks/disaster-recovery.md)**: Database recovery, failover procedures, and control plane restoration.
- **[Scaling & Capacity Planning](runbooks/scaling-and-capacity.md)**: Relay cluster sizing, WebSocket connection scaling, and database pooling.

### App Store & Regulatory Compliance ([`compliance/`](compliance/))
- **[Google Play VPN Policy Compliance](compliance/google_play_vpn_policy.md)**: Justifications and declarations for Android `BIND_VPN_SERVICE`.
- **[Apple NetworkExtension Review](compliance/apple_network_extension_review.md)**: App Store review documentation for iOS `PacketTunnelProvider`.
- **[Privacy Policy Specification](compliance/privacy_policy.md)**: Zero-logging disclosure and end-to-end encryption privacy commitments.
