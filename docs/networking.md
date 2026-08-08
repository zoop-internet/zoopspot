# Networking Concepts

This document outlines the networking concepts that Zoop needs to handle at the architecture level.

*Note: No functionality is implemented yet.*

- **P2P Connectivity**: Establishing peer-to-peer links between disparate devices.
- **NAT Traversal**: Navigating through various NAT types (Cone, Symmetric) using techniques like STUN/ICE to establish direct connections.
- **Direct Connections**: Ensuring endpoints communicate directly rather than via relays.
- **Path Selection**: Dynamically choosing the best route or provider when multiple options are available.
- **Connection Failures**: Detecting dead links, timeouts, or unresponsive peers.
- **Roaming**: Maintaining seamless connectivity when a device switches physical networks (e.g., moving from Wi-Fi to Cellular).
- **Recovery**: Automatically re-establishing tunnels and routing when connections drop.
