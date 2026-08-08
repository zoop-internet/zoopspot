# Security

This document outlines Zoop's security model at a conceptual level.

*Note: Zoop relies on established, proven cryptographic standards and does not invent new cryptographic protocols.*

- **Identity**: Every entity has a strongly verifiable cryptographic identity.
- **Trust**: Trust relationships are explicitly defined and securely verifiable.
- **Authentication**: Strict verification of identity before any control or data plane interaction.
- **Authorization**: Least-privilege access enforced at the endpoint level.
- **Cryptographic Device Identity**: Devices use private keys stored in secure enclaves/hardware when possible.
- **Key Management**: Procedures for generating, rotating, and storing cryptographic keys.
- **Device Revocation**: Immediate capability to revoke compromised devices from the network.
- **Privacy**: End-to-end encryption for the data plane tunnel. The control plane cannot inspect data plane traffic.
- **Threat Model**: Assumes the internet is hostile and endpoints may be compromised. Validates all inputs and strictly isolates control and data flows.
