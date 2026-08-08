# Data Plane

The Data Plane is responsible for the actual movement of user traffic across the Zoop network.

## Concepts

- **Endpoints**: The nodes that actually send and receive user traffic.
- **Connection Establishment**: The process of negotiating the tunnel and crypto parameters directly between two endpoints.
- **Tunnel**: The encrypted, point-to-point secure channel carrying the traffic.
- **Routing**: Deciding which packets go to which tunnel based on the network topology.
- **Forwarding**: The actual pushing of packets from one interface to another.
- **NAT**: Network Address Translation applied at the provider endpoint to allow the recipient's traffic to access the public Internet.
- **Internet Access**: The ultimate goal of the data plane—providing the recipient with connectivity to the outside world through the provider.

## Direct Connections Policy

Actual Internet traffic should preferably travel directly between endpoints whenever technically possible. Unnecessarily consuming a central relay (like a TURN server in the cloud) should be avoided to minimize latency, reduce infrastructure costs, and maximize privacy.
