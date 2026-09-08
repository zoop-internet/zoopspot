# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Multi-stage GitHub Actions CI pipeline covering Go, Web, and Mobile test suites.
- Structured GitHub Issue forms for bug reporting and feature requests.
- Comprehensive PR template with testing verification checklist.
- Repository CODEOWNERS and formal security vulnerability reporting policy.
- Unified developer targets in Makefile (`format`, `dev-cloud`, `dev-web`, `test-all`).

---

## [0.1.0-alpha] - 2026-09-08

### Added
- **Core Networking**: User-space WireGuard tunnel engine (`packages/agent/tunnel`) with `Noise_IK` handshake pattern.
- **NAT Traversal**: STUN reflexive candidate gathering and `muxbind` UDP socket sharing.
- **Relay Fallback**: Zero-knowledge WebSocket relay failover for symmetric NAT scenarios.
- **Roaming Engine**: Linux Netlink link state monitoring with dynamic endpoint updates.
- **System Daemon (`zoopd`)**: Privileged background service managing TUN interfaces with local UNIX domain socket IPC.
- **Developer CLI (`zoop`)**: Commands for `status`, `peers`, `connect`, `disconnect`, `telemetry`, `subscribe`, and `doctor`.
- **Control Plane (`zoop-cloud`)**: REST API, PostgreSQL/Neon persistent storage, WebSocket signaling hub, and IPAM allocation.
- **Router Gateway (`zoop-router`)**: OpenWrt firmware integration with WAN NAT masquerading (Provider) and LAN policy routing (Recipient).
- **Web Management Dashboard (`web/`)**: React 19 + TypeScript console with personal device manager, org fleet controls, and admin portal.
- **Mobile Client (`mobile/`)**: Cross-platform Flutter UI with gomobile native bindings for Android (`VpnService`) and iOS (`PacketTunnelProvider`).
