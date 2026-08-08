# Control Plane

The Control Plane manages the metadata, orchestration, and trust in the Zoop network. It helps endpoints find each other but does not handle actual user traffic.

## Responsibilities

- **Identity**: Managing user and device identities.
- **Authentication**: Verifying that users and devices are who they claim to be.
- **Authorization**: Enforcing permissions and access control.
- **Discovery**: Allowing endpoints to find each other across the internet (e.g., matching a recipient with an appropriate provider).
- **Signaling**: Exchanging connection parameters (like STUN/TURN candidates) so endpoints can establish direct P2P connections.
- **Relationships**: Managing the sharing agreements between providers and recipients.
- **Policies**: Distributing routing, sharing, and security policies to endpoints.

## What Belongs Here

Only control and signaling data belongs in the Control Plane. This includes public keys, IP addresses for signaling, policy definitions, and telemetry.

## What Does NOT Belong Here

User internet traffic (Data Plane) does NOT belong in the Control Plane. The Zoop Cloud should not act as a centralized relay for user bandwidth unless absolutely necessary (and even then, it should be minimized).
