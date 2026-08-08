# Entities

This document defines all major entities within the Zoop ecosystem and how they relate to each other.

- **Account**: The highest-level billing and administrative entity. An account can own multiple identities and devices.
- **Identity**: A cryptographic and verifiable representation of a user or system within Zoop.
- **Device**: Physical or virtual hardware (e.g., phone, laptop, router) that belongs to an account.
- **Endpoint**: A software instance of the Zoop agent running on a device, participating in the network.
- **Provider**: An endpoint that is actively sharing its Internet connection and bandwidth with others.
- **Recipient**: An endpoint that is consuming Internet connectivity provided by a Provider.
- **Sharing Relationship**: A defined policy and agreement between a Provider and Recipient detailing terms of bandwidth sharing (e.g., duration, limits, trust).
- **Organization**: A logical grouping of multiple accounts, identities, and devices, typically representing a company, university, or community.
- **Network**: A collection of connected endpoints that can route traffic among each other according to defined policies.
