# Security Policy

Zoop takes the security and privacy of our peer-to-peer networking platform, cryptographic implementations, and user data with the highest priority.

---

## 1. Supported Components & Versions

Security maintenance is actively provided for the following releases:

| Component | Active Version | Status |
|---|---|---|
| **Zoop Cloud** (`zoop-cloud`) | `0.1.x` | :white_check_mark: Supported |
| **Zoop System Daemon** (`zoopd`) | `0.1.x` | :white_check_mark: Supported |
| **Zoop CLI** (`zoop`) | `0.1.x` | :white_check_mark: Supported |
| **Zoop Router Gateway** (`zoop-router`) | `0.1.x` | :white_check_mark: Supported |
| **Zoop Mobile Core & App** | `0.1.x` | :white_check_mark: Supported |
| **Zoop Web Management Console** | `0.1.x` | :white_check_mark: Supported |

---

## 2. Reporting a Vulnerability

**DO NOT report suspected security vulnerabilities through public GitHub issues.**

If you identify any security issue—particularly vulnerabilities involving cryptographic key generation, WireGuard handshake negotiation, signaling leaks, authentication bypasses, or relay data isolation:

1. **Internal Team Channel**: Open an encrypted inquiry or direct message to the Security Lead.
2. **Security Email**: Send an encrypted report to `security@zoopnetwork.app` (or repository administrators).
3. **GitHub Private Advisory**: Navigate to the repository **Security** tab and click **"Report a vulnerability"**.
4. **RFC 9116 Disclosure**: Machine-readable security contacts are published at `https://zoopnetwork.app/.well-known/security.txt`.

### What to Include in Your Report
To accelerate triage, please provide:
- **Affected Component(s)**: Daemon, Cloud control plane, Web frontend, Router, Mobile, or Relay.
- **Vulnerability Type**: e.g., cryptographic bypass, remote code execution, authentication bypass, IP/metadata leak, denial-of-service.
- **Steps to Reproduce**: Minimal reproducible example, test script, or curl/API payload.
- **Impact Assessment**: What an attacker could achieve (e.g., impersonate a peer, decrypt payload, deanonymize routing).
- **Diagnostics**: If applicable, attach anonymized output from `zoop doctor --json`.

---

## 3. Vulnerability Handling SLA

- **Initial Acknowledgment**: Within **24 hours** of report receipt.
- **Triage & Reproduction**: Within **5 business days**.
- **Remediation & Patching**: Critical issues are prioritized for hotfix deployment within **14 days**.
- **Confidentiality**: All vulnerability details remain confidential until patches are released across production control nodes and relays.

---

## 4. Cryptographic Security Standards

Zoop enforces the following cryptographic baselines across all implementations:
- **Tunnel Encryption**: WireGuard `Noise_IK` handshake pattern with Curve25519 ECDH, ChaCha20-Poly1305 AEAD, and BLAKE2s hashing.
- **Identity & Authentication**: Ed25519 signing keys. Every API request and signaling message requires cryptographic signatures.
- **Zero-Knowledge Traffic Forwarding**: Relays and control nodes only broker encrypted envelopes; payload contents and destination IP packets are end-to-end encrypted and completely inaccessible to relay nodes.
