# Zoop

Zoop is a project for exploring and eventually building a system that allows Internet connectivity and bandwidth to be shared between remote endpoints. The goal is to support an ecosystem of devices including phones, laptops, routers, organizations, universities, communities, and other network-capable hardware.

## Current State: Architecture-First

**Important**: This repository is currently in the **architecture and design phase**. There is no functional networking implementation, API, authentication, tunnel, routing, NAT traversal, or discovery system implemented yet.

The purpose of this repository is to give us a complete, clean map of the Zoop system so we can understand and design every part before any code is written.

## High-Level Architecture Overview

At a high level, Zoop will be divided into two main planes:

1. **Control Plane**: Handles identity, authentication, authorization, discovery, signaling, relationships, and policies.
2. **Data Plane**: Handles actual endpoints, connection establishment, tunneling, routing, forwarding, NAT traversal, and internet access.

For more details, please refer to the documentation in the `docs/` directory:
- [Architecture](docs/architecture.md)
- [Entities](docs/entities.md)
- [Control Plane](docs/control-plane.md)
- [Data Plane](docs/data-plane.md)
- [Networking](docs/networking.md)
- [Security](docs/security.md)
- [Platforms](docs/platforms.md)
- [Organizations](docs/organizations.md)
- [Technology](docs/technology.md)
- [Decisions](docs/decisions.md)
- [Future Ideas](docs/future.md)
