# Zoop IPAM, DNS, and Relay Architecture

## 1. Overview

This document specifies three core technical mechanisms required for complete Data Plane connectivity:

1. **IP Address Management (IPAM):** Assigning overlay addresses for secure endpoint tunnels.
2. **DNS Resolution Architecture:** Preventing DNS leaks and ensuring secure domain resolution.
3. **NAT Traversal & Encrypted Relays:** Guaranteeing 100% connectivity fallback when STUN hole punching fails.

All three mechanisms strictly respect Zoop's core architecture:

> **Direct endpoint-to-endpoint connectivity is preferred; relays are used as fallback only.**

---

## 2. Overlay IP Address Management (IPAM)

To communicate over the WireGuard tunnel, endpoints require virtual IP addresses assigned to their local Zoop interface (`zoop0`).

Zoop reserves the RFC 6598 Carrier-Grade NAT (CGNAT) space and IPv6 Unique Local Address space:

```text
IPv4 Subnet: 100.64.0.0/10
IPv6 Subnet: fd00:zoop::/48
```

### IPAM Allocation Lifecycle

When a connection is authorized by the Control Plane:

```text
Recipient Agent                         Zoop API (Control Plane)
       │                                         │
       ├──── POST /v1/connections ──────────────►│
       │                                         ├── Allocates virtual IPs
       │                                         │   Provider:  100.64.0.1/32
       │                                         │   Recipient: 100.64.0.2/32
       │                                         │
       │◄─── Returns Connection & IPAM config ───┤
```

Each Provider endpoint acts as the gateway (`100.64.0.1`) for its active Recipient tunnels.

---

## 3. DNS Resolution & DNS Leak Prevention

When a Recipient routes traffic through a Provider, domain name lookups (DNS) must be handled securely to prevent **DNS Leaks** (where DNS queries leak out over the Recipient's local Wi-Fi instead of traveling through the secure tunnel).

### Secure DNS Routing

```text
Recipient App ──► Virtual Interface (zoop0) ──► Encrypted WireGuard Tunnel ──► Provider ──► Upstream DNS / Internet
```

1. **Resolver Assignment:** The Recipient configures its system DNS resolver to point to the Provider's virtual gateway address (`100.64.0.1`) or a secure public resolver (such as `1.1.1.1` or `8.8.8.8`) inside the tunnel interface.
2. **DNS Tunneling:** All DNS queries on port `53` (or DNS-over-HTTPS) travel inside the encrypted WireGuard tunnel to the Provider.
3. **Provider Forwarding:** The Provider resolves the domain through its upstream network and returns the result through the tunnel.

This guarantees that the Recipient's local network ISP cannot monitor or log DNS queries.

---

## 4. NAT Traversal & Encrypted Relay Architecture

Direct P2P connectivity is always attempted first using UDP hole punching and STUN discovery.

However, when both endpoints are behind **Symmetric NATs** or strict enterprise firewalls, direct UDP hole punching fails. In these cases, Zoop falls back to an **Encrypted Relay**.

```text
                       ZOOP RELAY
                           │
       Encrypted WireGuard │ Encrypted WireGuard
       Tunnel Packets      │ Tunnel Packets
                           │
             ┌─────────────┴─────────────┐
             │                           │
          Provider                   Recipient
```

### Relay Protocol Principles (DERP Architecture)

1. **End-to-End Encryption Maintained:** The Relay operates over HTTPS/WebSockets. It receives WireGuard packets encapsulated in secure frame wrappers.
2. **Zero Decryption:** The Relay **cannot decrypt payload traffic**. It only reads public destination device IDs to route encrypted packets to the correct peer.
3. **Control Plane Independence:** The Control Plane API informs endpoints of available Relay nodes during signaling. The Relay node itself only forwards Data Plane packets.
4. **Automatic Promotion:** The endpoints continuously probe for direct P2P paths in the background. If a direct path becomes available, the connection seamlessly upgrades from Relayed $\rightarrow$ Direct.

---

## 5. Mobile Power & Battery Optimization

Mobile devices operate under strict operating system battery limits (such as Android Doze Mode and iOS background execution limits).

Zoop respects these boundaries:

* **Recipient Mode (Primary Mobile Mode):** Mobile devices acting as Recipients leverage native VPN APIs (`VpnService` on Android, `NetworkExtension` on iOS), which are optimized by the OS for low battery usage.
* **Provider Mode (Conditional Mobile Mode):** Mobile endpoints acting as Providers monitor battery and power state:
  * Automatically pauses Provider availability when battery drops below a configurable threshold (e.g. 20%).
  * Recommends Provider operation while connected to unmetered Wi-Fi and power charging.

---

## 6. Summary of Architecture Synchronization

| Domain | Technical Design | Aligned with Zoop Vision? |
| :--- | :--- | :---: |
| **IPAM** | CGNAT `100.64.0.0/10` overlay IP space | ✅ Yes (Clean overlay network) |
| **DNS** | Tunneled DNS inside WireGuard (`100.64.0.1`) | ✅ Yes (Zero DNS leaks) |
| **Relays** | Encrypted DERP HTTPS/WebSocket fallback | ✅ Yes (Direct first, relay fallback) |
| **Mobile** | OS-native VPN APIs & battery-aware Provider mode | ✅ Yes (Seamless mobile experience) |
