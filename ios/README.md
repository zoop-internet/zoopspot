# Zoop iOS Native SDK & NetworkExtension Harness

This directory contains the **standalone native iOS Swift project** demonstrating how to run Zoop's WireGuard mesh core inside Apple's **NetworkExtension** framework (`PacketTunnelProvider`).

> [!NOTE]
> **Working on the Mobile App UI?**
> If you are contributing to or testing the cross-platform mobile user interface, please see the [**`mobile/`**](../mobile/) directory, which houses the complete **Flutter** mobile application.

---

## 1. Overview & Architecture

iOS requires VPN tunnels to run in an isolated system process via an `NEPacketTunnelProvider` NetworkExtension. This harness bridges Apple's `NEPacketTunnelNetworkSettings` and `packetFlow` directly to the compiled Go WireGuard core (`ZoopCore.xcframework`).

```text
┌────────────────────────────────────────────────────────┐
│             iOS Container App / Swift UI               │
└───────────────────────────┬────────────────────────────┘
                            │ (NETunnelProviderManager)
┌───────────────────────────▼────────────────────────────┐
│   ZoopBridge / ZoopNativeBridge.swift (Swift Bridge)   │
└───────────────────────────┬────────────────────────────┘
                            │ (IPC / Mach Port)
┌───────────────────────────▼────────────────────────────┐
│ ZoopPacketTunnel / PacketTunnelProvider.swift          │
│ (Apple NetworkExtension System Process)                │
└───────────────────────────┬────────────────────────────┘
                            │ (PacketFlow / NEVirtualInterface)
┌───────────────────────────▼────────────────────────────┐
│ ZoopCore.xcframework (Go WireGuard Engine / Noise_IK)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Key Components

- **[`PacketTunnelProvider.swift`](ZoopPacketTunnel/PacketTunnelProvider.swift)**:
  - Extends `NEPacketTunnelProvider`.
  - Configures `NEPacketTunnelNetworkSettings`, MTU (1280–1420), DNS resolvers (`1.1.1.1`), and virtual IPv4/IPv6 subnets.
  - Starts packet capture loops through `packetFlow.readPackets` and forwards packets to Go.
- **[`ZoopNativeBridge.swift`](ZoopBridge/ZoopNativeBridge.swift)**:
  - Configures and saves `NETunnelProviderManager` preferences into System VPN settings.
  - Controls connection states (`startTunnel`, `stopTunnel`, `getConnectionStatus`).
- **[`KeychainHelper.swift`](ZoopBridge/KeychainHelper.swift)**:
  - Stores Ed25519 node identity keys securely in the Apple Secure Enclave / iOS Keychain with `kSecAttrAccessibleAfterFirstUnlock`.

---

## 3. Building

### 1. Build the Go Core XCFramework:
```bash
# In repository root:
make build-ios-core
```
This runs `gomobile bind -target=ios` and outputs `ios/Frameworks/ZoopCore.xcframework`.

### 2. Open in Xcode:
Open the Xcode project or workspace, ensure your Apple Developer team provisioning profile is selected for both the container app and the `ZoopPacketTunnel` extension target, and run on a physical iOS device (VPN extensions require a physical device).
