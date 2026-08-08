# Technology

This document records the candidate technology direction for Zoop.

**Important**: Clearly distinguish between "chosen direction", "candidate", and "not yet decided". Do not treat every technology as finalized.

## Backend / Core / Agent
- **Direction**: Go
- **Status**: Candidate
- **Reasoning**: Strong concurrency, good network primitives, cross-platform compilation.

## Web UI
- **Direction**: React + TypeScript
- **Status**: Candidate
- **Reasoning**: Industry standard, strong typing, wide ecosystem.

## Mobile - Android
- **Direction**: Kotlin
- **Status**: Candidate

## Mobile - iOS
- **Direction**: Swift
- **Status**: Candidate

## Database / Persistence
- **Direction**: PostgreSQL
- **Status**: Candidate
- **Reasoning**: Robust, reliable relational data store for the cloud control plane.

## Tunnel Technology
- **Direction**: WireGuard
- **Status**: Candidate
- **Reasoning**: Modern, fast, secure cryptographic tunnel.

## Connection / NAT Traversal
- **Direction**: ICE/STUN
- **Status**: Candidate
- **Reasoning**: Standard protocols for NAT traversal and peer discovery.

## Control / Signaling
- **Direction**: HTTPS / WebSocket
- **Status**: Candidate
- **Reasoning**: Ubiquitous, firewall-friendly protocols for cloud communication.

## Network Integration
- **Direction**: Linux / OpenWrt
- **Status**: Candidate
- **Reasoning**: Broadest compatibility for hardware routers.
