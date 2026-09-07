# Google Play VPN Service Policy Compliance Declaration

## 1. Application Details
- **Application Name**: Zoop
- **Package Name**: `network.zoop.app`
- **Primary Category**: Tools / Communication
- **Architecture**: Decentralized Peer-to-Peer Mesh VPN & Egress Gateway
- **Target SDK**: Android 14+ (API Level 34)

---

## 2. Core Functionality Justification for `VpnService`

Under Google Play Developer Policy regarding the **VPN Service Policy**:
> *"Applications that use the `VpnService` must declare the VPN functionality as their primary core feature and must provide clear disclosures to the user."*

### Why Zoop Requires `VpnService`
Zoop is a direct, cryptographically sovereign device-to-device mesh networking platform. The core capability of the application is establishing end-to-end encrypted tunnels (powered by kernel-grade WireGuard and user-space virtual network interfaces) directly between a user's mobile device, personal laptops, home servers, and authorized peer gateways.

Without the Android `VpnService` API (`android.net.VpnService`):
1. Zoop cannot create the virtual TUN network interface (`100.64.0.0/10` CGNAT overlay and `fd00:7a6f:6f70::/64` IPv6 overlay).
2. Zoop cannot securely route device IP packets directly across the peer mesh or into authorized exit nodes.
3. Users cannot achieve encrypted, leak-free tunnel protection or multi-device mesh routing.

Therefore, `VpnService` is the **fundamental core functionality** of Zoop.

---

## 3. Data Safety & Privacy Declarations

Zoop strictly adheres to the Google Play Data Safety requirements:

| Category | Policy / Behavior |
|---|---|
| **Traffic Data Logging** | **ZERO LOGS**. Zoop does NOT inspect, record, log, store, or transmit user payload traffic, browsing history, DNS queries, or destination IP addresses. |
| **Data Selling & Sharing** | **NO DATA SHARED**. Zoop does not sell, rent, monetize, or transmit any user data to third parties, data brokers, or advertising networks. |
| **Personal Identifiers** | **NO PII**. Accounts in Zoop are backed by decentralized Ed25519 cryptographic keypairs generated locally on the device. No phone numbers, real names, or credit cards are required for core mesh connectivity. |
| **Encryption in Transit** | **ALWAYS ENCRYPTED**. All data plane packets are encrypted end-to-end using WireGuard (ChaCha20-Poly1305 and Noise Protocol). Control plane signaling uses TLS 1.3 with canonical Ed25519 authentication signatures. |

---

## 4. Prominent Disclosure & User Consent

In compliance with the Prominent Disclosure requirements:
1. **Onboarding Presentation**: Upon first launch, the user is presented with the Onboarding and Permissions screen explicitly describing how the VPN operates, that it creates a local tunnel, and that zero traffic logs are captured.
2. **System Dialog**: The standard Android OS `VpnService.prepare(context)` system authorization dialog is presented before any tunnel is initiated.
3. **Persistent Notification**: While connected, a non-dismissible foreground service notification (`IMPORTANCE_LOW`) displays the active tunnel status, direct P2P vs. relay mode, and provides an immediate "Disconnect" action.

---

## 5. Foreground Service Type Declaration

Under Android 14+ foreground service restrictions:
- **Permission**: `android.permission.FOREGROUND_SERVICE`
- **Foreground Service Type**: `android:foregroundServiceType="connectedDevice|specialUse"`
- **Service Class**: `network.zoop.app.vpn.ZoopVpnService`
- **Justification**: Maintains uninterrupted WireGuard UDP tunnel sockets and manages NAT traversal keepalives while the device screen is off or navigating other apps.
