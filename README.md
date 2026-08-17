# Zoop Internet

<div align="center">

**High-Performance Direct Device-to-Device Mesh & Connectivity Platform**

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows%20%7C%20Android%20%7C%20iOS%20%7C%20OpenWrt-green.svg)](#platform-support)
[![Encryption](https://img.shields.io/badge/Tunnel-WireGuard%20(Noise_IK)-9b59b6.svg)](https://www.wireguard.com)

</div>

---

## Overview

**Zoop Internet** is an open-source, resilient direct connectivity platform that allows authorized devices to securely share, route, and access network connectivity peer-to-peer. Built on top of modern **user-space WireGuard** cryptography and reflexive **STUN/TURN NAT traversal**, Zoop Internet automatically forms point-to-point encrypted tunnels between endpoints without routing sensitive payload traffic through centralized servers.

```
┌────────────────────────────────────────────────────────┐
│                      ZOOP CLOUD                        │
│   (Control Plane: Identity, Auth, Signaling & IPAM)    │
└───────────────────▲────────────────┬───────────────────┘
                    │                │
            Signaling / Auth  Signaling / Auth
                    │                │
       ┌────────────┴───┐        ┌───┴────────────┐
       │    Provider    │◄──────►│   Recipient    │
       │    (zoopd)     │ Direct │    (zoopd)     │
       └───────┬────────┘ Tunnel └────────────────┘
               │ (WireGuard)
               ▼
            Internet
```

---

## Key Features

- **Direct Peer-to-Peer WireGuard Mesh**: End-to-end encrypted tunnels using state-of-the-art ChaCha20-Poly1305 authenticated encryption and Curve25519 key exchanges.
- **Adaptive NAT Traversal & Hole Punching**: Automatic discovery of local LAN, reflexive STUN, and UPnP endpoints to achieve direct connectivity across restrictive home and enterprise NATs.
- **Distributed Relay Fallback**: Low-latency WebSocket TURN/Relay cluster failover for symmetric and carrier-grade NATs (CGNAT) where direct P2P is impossible.
- **Zero-Drop Connection Roaming**: Instant network transition detection (Wi-Fi ↔ Ethernet ↔ Cellular) via kernel Netlink events with automatic IP re-probing without breaking active TCP/UDP sockets.
- **Privileged Background Daemon (`zoopd`)**: Lightweight system service (`systemd`, `launchd`, Windows Service) managing WireGuard TUN adapters with unprivileged local UNIX socket IPC.
- **Developer-First CLI (`zoop`)**: Terminal management tool for inspecting peer latency, monitoring real-time throughput, initiating connections, and running diagnostics.
- **Web Management Dashboard**: Modern React + TypeScript interface for managing devices, sharing relationships, organizations, and security audit logs.
- **Native Mobile & Router Integration**: Gomobile bindings and C-shared libraries for Android (`VpnService`), iOS (`NetworkExtension`), and OpenWrt router firmware.
- **Comprehensive Diagnostics & Observability**: Integrated Prometheus `/metrics` scraper endpoint, `/v1/health` probes, and interactive `zoop doctor` diagnostics.

---

## Architecture

Zoop strictly decouples the **Control Plane** from the **Data Plane**:

| Plane | Component | Responsibilities |
|---|---|---|
| **Control Plane** | `zoop-cloud` | Device registration, Ed25519 identity verification, mutual share authorization, WebSocket signaling, and IPAM allocation. |
| **Data Plane** | `zoopd` (Daemon) | TUN interface lifecycle, WireGuard handshake negotiation, STUN candidate gathering, packet forwarding, and NAT masquerading. |
| **User Space** | `zoop` (CLI) | Non-root Unix domain socket client for interacting with the background daemon. |
| **Fallback** | `zoop-relay` | Geographically distributed multi-region relay nodes that stream encrypted frames when direct UDP paths fail. |

---

## Platform Support

| Operating System | Daemon Support | Interface Method | Status |
|---|---|---|---|
| **Linux** | `zoopd` (systemd) | Native TUN / WireGuard Go | Production Ready |
| **macOS** | `zoopd` (launchd) | `utun` / User-space TUN | Production Ready |
| **Windows** | `zoopd` (Windows Service) | `Wintun` driver | Supported |
| **OpenWrt** | `zoop-router` | UCI / iptables NAT / IP policy | Supported |
| **Android** | `zoopcore.aar` | `VpnService` / Gomobile | Native Core Binding |
| **iOS** | `ZoopCore.xcframework` | `PacketTunnelProvider` / Gomobile | Native Core Binding |

---

## Quick Start

### 1. Prerequisites
- **Go 1.22+**
- **Docker** (optional, for cloud orchestration & multi-node testbeds)
- **Linux/macOS/Windows** with administrative permissions for TUN device allocation

### 2. Building from Source
Clone the repository and build the core binaries using the `Makefile`:

```bash
git clone https://github.com/zoop-internet/zoop.git
cd zoop

# Compile all binaries into bin/
make build
```

This generates:
- `bin/zoop` — Zoop User CLI
- `bin/zoopd` — Zoop System Daemon
- `bin/zoop-cloud` — Zoop Cloud Control Plane
- `bin/zoop-router` — Zoop Router Integration Binary

---

### 3. Running Zoop Cloud (Control Plane)

To start the central coordinator locally:

```bash
# In-memory storage for development:
./bin/zoop-cloud

# Or with persistent PostgreSQL:
export ZOOP_DATABASE_URL="postgres://user:password@localhost:5432/zoop?sslmode=disable"
./bin/zoop-cloud
```

---

### 4. Running the System Daemon (`zoopd`)

#### Foreground Mode:
```bash
sudo ./bin/zoopd -tun zoop0 -api-port 9090
```

#### Installing as a Background Service:
```bash
# Install and register as a system service (systemd on Linux, launchd on macOS)
sudo ./bin/zoopd service install

# Start the background service
sudo ./bin/zoopd service start

# Check service and socket health
sudo ./bin/zoopd service status
```

---

### 5. Using the CLI (`zoop`)

Once `zoopd` is active, interact with the daemon without needing root privileges:

```bash
# Verify daemon status & local WireGuard public key
zoop status

# List available peer devices in your organization
zoop peers

# Connect to a target provider device
zoop connect <provider_endpoint_id>

# Stream live network metrics (throughput, latency, packet loss)
zoop telemetry

# Subscribe to real-time daemon state updates
zoop subscribe

# Disconnect the active tunnel
zoop disconnect

# Run network & environment diagnostics
zoop doctor
```

---

## Diagnostics: `zoop doctor`

Zoop Internet includes an integrated diagnostic engine that probes the status of local TUN adapters, user privileges, control plane API reachability, DNS resolution, and STUN/NAT traversal:

```bash
zoop doctor
```

---

## Configuration Reference

Zoop is configured via environment variables or CLI flags:

| Environment Variable | CLI Flag | Default | Description |
|---|---|---|---|
| `ZOOP_CONTROL_PLANE_URL` | — | `http://localhost:8080` | URL of the central Zoop Cloud API |
| `ZOOP_STUN_SERVER` | — | `stun.l.google.com:19302` | STUN server for reflexive candidate discovery |
| `ZOOP_SOCKET_PATH` | `-socket` | `/var/run/zoopd.sock` | UNIX domain socket for daemon/CLI IPC |
| `ZOOP_TUN_NAME` | `-tun` | `zoop0` | Virtual WireGuard interface name |
| `ZOOP_API_PORT` | `-api-port` | `9090` | Prometheus `/metrics` and health HTTP port |
| `ZOOP_CONFIG_DIR` | `-config-dir` | `~/.zoop` | Directory for cryptographic keys and identity |
| `ZOOP_DATABASE_URL` | — | `""` | PostgreSQL connection string for `zoop-cloud` |
| `ZOOP_REDIS_URL` | — | `""` | Redis connection string for multi-node signaling |
| `ZOOP_LOG_LEVEL` | — | `info` | Log verbosity (`debug`, `info`, `warn`, `error`) |

---

## Repository Structure

```text
zoop/
├── cmd/
│   ├── zoop/                 # Unified CLI tool
│   ├── zoopd/                # Background system daemon & service manager
│   ├── zoop-mobile/          # C-shared library wrapper for mobile
│   └── zoop-router/          # OpenWrt router binary
│
├── packages/
│   ├── agent/                # Tunnel (WireGuard), STUN discovery, roaming, identity
│   ├── cloud/                # Signaling hub, PostgreSQL store, REST API, Relay
│   ├── core/                 # Shared types, crypto, config, error definitions
│   ├── platform/             # OS bindings: Linux netlink, Android, iOS, mobile
│   └── router/               # NAT MASQUERADE and LAN routing policies
│
├── cloud/                    # Zoop Cloud entrypoint
├── router/                   # Router daemon entrypoint
├── web/                      # React + TypeScript management web app
├── tests/                    # End-to-end integration and simulation tests
├── infrastructure/           # Docker Compose & Helm chart definitions
└── scripts/                  # Network degradation and service install scripts
```

---

## Development & Testing

### Running Unit Tests
```bash
make test
```

### Running Mobile Core Builds
```bash
# Build Android AAR library
make build-android-core

# Build iOS XCFramework
make build-ios-core

# Build C-shared library
make mobile-cshared
```

### Running E2E Testbed Simulation
```bash
# Run multi-node Docker Compose network simulation (NAT, packet loss, roaming)
ZOOP_E2E_TESTS=1 go test -v ./test/e2e/...
```

---

## Security & Cryptography

- **Noise Protocol Framework**: Uses the Noise_IK handshake pattern (via WireGuard) for mutual authentication and forward secrecy.
- **Identity Keys**: Ed25519 signatures authenticate every control plane API request.
- **Replay Protection**: Cryptographic nonces and bounded TTL timestamps mitigate replay attacks.
- **Zero-Knowledge Traffic**: The control plane and relays only coordinate signaling and metadata; payload packets are end-to-end encrypted and completely opaque to relays.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
