# Privacy Policy — Zoop Internet

**Effective Date:** September 7, 2026  
**Last Updated:** September 7, 2026  
**Official Domain:** [zoopinternet.online](https://zoopinternet.online)  
**Support & Inquiries:** [support@zoopinternet.online](mailto:support@zoopinternet.online)  

---

## 1. Introduction & Core Privacy Commitment

Zoop Internet ("Zoop", "we", "us", or "our") develops and operates an open-source, decentralized device-to-device mesh connectivity platform. Our mission is to provide secure, resilient, and direct peer-to-peer (P2P) networking between authorized devices without routing personal data through centralized surveillance choke points.

We believe privacy is an absolute fundamental right. Unlike traditional commercial Virtual Private Network (VPN) providers that backhaul all your traffic through corporate datacenters, **Zoop is built on a Zero-Knowledge, Zero-Inspection architecture**. 

> ### 🔒 Crucial Privacy Summary (App Store & Google Play Disclosure)
> * **We DO NOT inspect, monitor, store, or log your network traffic, payload data, browsing history, DNS queries, or destination IP addresses.**
> * **We DO NOT sell, rent, or monetize your personal data or network activity under any circumstances.**
> * **All data transit between devices is end-to-end encrypted using modern WireGuard® cryptography (Noise_IK protocol, ChaCha20-Poly1305, Curve25519).**
> * **Our Control Plane servers only coordinate peer-to-peer signaling, cryptographic identity verification, and IPAM allocation. Relays only forward opaque, encrypted binary frames when direct NAT traversal is impossible.**

---

## 2. Information We Do NOT Collect

To provide unambiguous transparency in accordance with Apple App Store Review Guideline 5.4 and the Google Play Developer Policy for VPN Services, Zoop explicitly affirms that we **never** collect, log, or store:

1. **Traffic Payload**: Any packets, content, or data transmitted across active tunnels.
2. **Browsing Activity**: Webpages visited, domains resolved, search history, or online services accessed.
3. **DNS Queries**: Domain name lookups made while connected to a Zoop tunnel.
4. **Destination IP Addresses**: The remote servers, hosts, or endpoints you connect to through a Provider peer.
5. **Connection Timestamps & Duration**: Individual session logs correlating when you connected to specific destinations.
6. **Hardware Fingerprints or Advertising IDs**: IDFA, AAID, IMEI, or advertising tracking beacons.

---

## 3. Information We Process (Data Minimization)

Zoop adheres strictly to the principle of data minimization. We only collect the minimal technical data necessary to establish peer-to-peer tunnels and manage account authentication:

### A. Account & Cryptographic Identity
* **Zoop Identifier (`ZP-...`)**: A unique, pseudonymized identifier derived from your public cryptographic identity.
* **Public Cryptographic Keys**: Ed25519 public keys used to authenticate control plane API requests and Curve25519 public keys used for WireGuard peer handshakes. **Your private keys never leave your local device.**
* **Device Metadata**: User-defined device friendly names (e.g., "MacBook Pro", "Pixel 9"), operating system type, and client software version to facilitate device pairing within your account.

### B. Ephemeral Signaling & NAT Traversal Metadata
When two devices negotiate a direct peer-to-peer connection:
* **Reflexive Candidate Endpoints**: Public IP addresses and port numbers discovered via STUN (Session Traversal Utilities for NAT) servers (such as `stun.l.google.com:19302` or our Coturn infrastructure) to enable UDP hole punching.
* **Signaling Messages**: Ephemeral WebSocket messages exchanged between the two peers containing connection offers, answers, and WireGuard handshake parameters.
* **Retention**: Signaling messages are processed in-memory and are discarded immediately once the direct connection is negotiated or abandoned.

### C. Fallback Relay Transit (When P2P Fails)
If both devices are behind symmetric NATs or Carrier-Grade NAT (CGNAT) and direct UDP hole punching fails:
* Traffic is routed via an encrypted WebSocket relay node.
* Relays receive only **opaque WireGuard-encrypted frames**.
* The relay operator and control plane have no access to the cryptographic keys; it is computationally impossible for relays to inspect, decrypt, or tamper with the transit payload.
* Relay memory buffers are flushed continuously; no packet data is written to disk.

### D. Optional Aggregated Telemetry (Client Diagnostics)
If you run `zoop doctor` or view live connection graphs in the app:
* Real-time metrics (latency/RTT, packet loss, instantaneous transfer speed) are computed locally on your device for user display.
* These metrics are never exfiltrated to central servers unless explicitly submitted by you in an open-source bug report or crash log.

---

## 4. How We Use Information

The limited data processed by Zoop is used exclusively for:
1. **Authenticating API Requests**: Verifying Ed25519 digital signatures to ensure only authorized devices access your mesh network.
2. **Peer Signaling & IPAM**: Assigning internal overlay IP addresses (within the Carrier-Grade `100.64.0.0/10` block) to prevent routing collisions.
3. **Service Security**: Defending the central control plane against Distributed Denial of Service (DDoS) attacks and replay attacks using short-lived timestamp nonces.

---

## 5. Third-Party Services & Infrastructure

Zoop relies on reputable infrastructure providers configured for strict data isolation:
* **Hosting**: Cloud-agnostic architecture currently hosted on AWS EC2 (`eu-central-1`, Frankfurt, Germany) protected by automated TLS reverse proxy (Caddy).
* **Database**: Neon Serverless PostgreSQL (`eu-central-1`), storing encrypted user account records and device public keys.
* **Frontend Delivery**: Cloudflare Pages edge CDN for delivering static web dashboard assets.
* **STUN Infrastructure**: Standard public STUN servers for reflexive IP discovery. STUN servers only reflect the external IP/port back to the querying client and do not store logs.

None of these infrastructure providers have access to decrypted tunnel payloads or private user keys.

---

## 6. Data Retention & Deletion

* **Ephemeral Data**: Signaling messages and STUN candidates are held in volatile RAM only for the duration of the connection negotiation (seconds) and never stored.
* **Account Records**: Retained until you delete your account or revoke a device.
* **Account & Device Deletion**: You can permanently remove any device or delete your entire Zoop account at any time through the web console or CLI. Upon deletion, associated public keys and device records are purged from the database immediately.

---

## 7. Your Legal Rights (GDPR, CCPA/CPRA & Global Privacy)

Under international data protection frameworks, including the EU General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA):
* **Right of Access**: You may request a copy of all metadata stored in relation to your Zoop ID.
* **Right to Erasure ("Right to be Forgotten")**: You may delete your account and all associated cryptographic records.
* **Right to Portability**: You may export your public device configurations at any time.
* **Right to Non-Discrimination**: Zoop does not sell data and provides identical security guarantees to all users.

To exercise any of these rights, contact [privacy@zoopinternet.online](mailto:privacy@zoopinternet.online) or [support@zoopinternet.online](mailto:support@zoopinternet.online).

---

## 8. Mobile Platform Disclosures (iOS & Android)

### iOS (NetworkExtension / PacketTunnelProvider)
* The Zoop iOS application utilizes Apple's `NetworkExtension` framework to route packets into the local user-space WireGuard engine.
* We do not read personal identifiers, contact lists, photos, or location data.
* Network permissions are utilized solely to establish the virtual network interface.

### Android (VpnService)
* The Zoop Android application utilizes Android's `VpnService` API to establish a local TUN interface.
* In accordance with Google Play's VpnService Policy:
  * We do not manipulate, intercept, or monetize user traffic.
  * No personal or sensitive data is collected from device storage or other apps.
  * A continuous foreground notification is displayed while the tunnel is active to ensure the user is always informed of the connection state.

---

## 9. Security Safeguards

We implement defense-in-depth technical safeguards to protect all system components:
* **WireGuard Noise_IK**: State-of-the-art key exchange with forward secrecy.
* **Cryptographic Signatures**: All API requests require Ed25519 signatures with bounded nonces (preventing replay attacks).
* **Automated TLS**: Strict HTTPS / WSS communication via Caddy with Let's Encrypt certificates.
* **Open Source Auditability**: All client and daemon code is publicly auditable on GitHub at [github.com/allannuwamanya/zoop](https://github.com/allannuwamanya/zoop).

---

## 10. Changes to This Privacy Policy

We may update this Privacy Policy periodically to reflect changes in our technology or legal requirements. Material updates will be announced via our website ([zoopinternet.online](https://zoopinternet.online)) and documented in the git repository revision history.

---

## 11. Contact & Data Protection Officer

For questions, privacy inquiries, or data requests:

* **Email:** [support@zoopinternet.online](mailto:support@zoopinternet.online)
* **Security Team:** [security@zoopinternet.online](mailto:security@zoopinternet.online)
* **Website:** [https://zoopinternet.online](https://zoopinternet.online)
* **GitHub Issues:** [https://github.com/allannuwamanya/zoop/issues](https://github.com/allannuwamanya/zoop/issues)
