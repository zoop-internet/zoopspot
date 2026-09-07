# Apple App Store Review Guide: NetworkExtension Entitlement

## 1. Overview
- **App Name**: Zoop
- **Bundle Identifier**: `network.zoop.mobile`
- **Requested Entitlement**: `com.apple.developer.networking.networkextension`
- **Target Component**: Packet Tunnel Provider (`NEPacketTunnelProvider`)

---

## 2. Technical Justification for `NEPacketTunnelProvider`

Zoop is a decentralized peer-to-peer mesh connectivity platform. It utilizes the WireGuard protocol and dynamic UDP NAT traversal (STUN/ICE) to form direct, end-to-end encrypted tunnels between authorized user devices.

### Why Standard VPN Protocols Are Insufficient:
1. **P2P NAT Hole-Punching**: Zoop establishes direct point-to-point connections through consumer NATs without central gateways using interactive ICE candidate probing. Built-in IKEv2 / IPsec profiles cannot perform multi-candidate UDP hole-punching.
2. **User-Space Data Plane**: Zoop runs a low-power user-space WireGuard tunnel engine that requires raw IP packet capture (`NEPacketTunnelFlow`) to encapsulate packets into Curve25519-authenticated UDP datagrams.
3. **Split Routing & CGNAT Overlays**: Zoop dynamically manages `100.64.0.0/10` and `fd00:7a6f:6f70::/64` routing overlays for mesh communication while preserving the primary interface for local traffic.

Thus, `NEPacketTunnelProvider` is the only Apple-approved API capable of hosting this specialized network transport on iOS.

---

## 3. App Store Privacy Nutrition Labels Mapping

Below is the disclosure mapping for the App Store Connect **App Privacy** questionnaire:

| Questionnaire Field | Response | Justification |
|---|---|---|
| **Data Collection** | **Data Not Collected** | The app does not collect personal identity, user content, contact info, search history, or financial info. |
| **Browsing History** | **Not Collected** | Traffic flows through encrypted tunnels; zero URLs or destinations are logged or inspected. |
| **Diagnostics** | **Not Linked to You** | Voluntary diagnostic reports (NAT type, MTU, packet drop counts) are pseudonymous and cannot be correlated with user identities. |
| **Tracking** | **No** | Zoop does not track users across third-party apps or websites. |

---

## 4. Test Account & Demo Credentials for Reviewers

For Apple App Store review verification:
1. Launch Zoop on iOS.
2. Select **"Create New Sovereign Identity"** (no phone number or email required).
3. The app will generate an Ed25519 keypair and display the BIP-39 recovery mnemonic.
4. Tap **"Connect"** to initiate the local mesh test tunnel. The iOS system prompt *"Zoop Would Like to Add VPN Configurations"* will appear.
5. Tap **"Allow"** and enter device passcode.
6. The tunnel will transition to **"Connected (Direct P2P)"** state, verifying complete functionality.
