# Zoop Privacy Policy

**Effective Date:** September 7, 2026  
**Last Updated:** September 7, 2026  

---

## 1. Introduction

Zoop ("we", "our", or "the Platform") is dedicated to protecting user privacy, digital sovereignty, and communication security. This Privacy Policy details how Zoop operates across mobile applications (Android, iOS), desktop clients, and cloud signaling infrastructure.

Our core design principle is **architectural privacy**: we build systems that are mathematically and structurally incapable of violating your confidentiality.

---

## 2. Information We Do NOT Collect

We believe that the best way to protect user data is never to collect it in the first place. When using Zoop:

- **We do NOT log or inspect your internet traffic**: We do not record the websites you visit, the data you transmit, the files you download, or the applications you use.
- **We do NOT record your destination IP addresses**: WireGuard tunnel packets are encrypted end-to-end between your device and your authorized peer gateway or exit node.
- **We do NOT record DNS query logs**: DNS requests are forwarded strictly through encrypted resolvers specified by your selected routing configuration.
- **We do NOT collect advertising or tracking identifiers**: We do not use Google Ad ID, Apple IDFA, cookies, fingerprinting, or tracking beacons.
- **We do NOT require personally identifiable information (PII)**: You can generate a sovereign identity without submitting an email address, phone number, real name, or payment card.

---

## 3. Information We Process

To enable decentralized mesh peer discovery and NAT traversal, our cloud signaling service processes minimal, non-sensitive metadata:

1. **Cryptographic Identity**:
   - **Public Keys**: Your device's Ed25519 public key and WireGuard public key.
   - **Zoop Identifier**: A pseudonym derived from your public key (e.g. `zp-xxxx`).
   - Private keys and BIP-39 24-word recovery seeds **never leave your device**.
2. **Ephemeral Network Candidates**:
   - Local and public IP:port candidates discovered via STUN to facilitate direct UDP NAT hole punching.
   - Once a direct P2P connection is established, traffic flows directly between devices without transiting our servers.
3. **Voluntary Diagnostic Bundles**:
   - If you actively choose to submit a diagnostic report via the in-app Diagnostics tool, a sanitized archive containing interface error codes, NAT classification, and HMAC-pseudonymized peer IDs is uploaded.
   - These bundles strictly exclude real IP addresses, payload contents, and browsing history.

---

## 4. Cryptographic Security Standards

All communication within Zoop uses modern, peer-reviewed cryptographic primitives:
- **Tunnel Encryption**: WireGuard protocol utilizing ChaCha20 for symmetric encryption, Poly1305 for authentication, Curve25519 for ECDH, and BLAKE2s for hashing.
- **Signaling Authentication**: Canonical Ed25519 digital signatures (Auth v2) over timestamped, nonce-protected request payloads.
- **Key Storage**: Android KeyStore (Hardware-backed Keystore / StrongBox) and Apple Keychain with AES-256 GCM encryption.

---

## 5. Third-Party Sharing

We **never** sell, license, rent, or monetize your data. We do not provide user information to commercial data brokers, advertising partners, or marketing analytics providers.

---

## 6. User Rights (GDPR & CCPA Compliance)

Under the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA):
- **Right to Erasure ("Right to be Forgotten")**: You may delete your device registration at any time through the in-app settings or CLI (`zoop unregister`). All public keys and associated routing entries are permanently wiped from the signaling store.
- **Right to Data Portability**: You may export your device configurations and cryptographic recovery phrases at any time.
- **Right to Access**: You have full visibility into your registered fleet devices, active sharing relationships, and audit records.

---

## 7. Contact Information

For inquiries regarding this Privacy Policy or technical security audits:
- **Project**: Zoop Open-Source Internet
- **Repository**: [https://github.com/zoop-internet/zoop](https://github.com/zoop-internet/zoop)
- **Security Contact**: `security@zoopnetwork.app`
