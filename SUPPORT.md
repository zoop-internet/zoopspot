# Support & Troubleshooting

This document outlines how team members, testers, and internal operators can obtain assistance and report issues with the Zoop platform.

---

## 1. Getting Help

- **Documentation**: Comprehensive architecture, API specifications, and operational runbooks are located in the [`docs/`](docs/) directory.
- **Team Communications**: For real-time questions, reach out on the internal engineering Slack / Discord channels:
  - `#zoop-networking`: WireGuard tunnels, STUN, NAT hole punching, roaming.
  - `#zoop-cloud`: Control plane, Neon PostgreSQL, WebSocket signaling, relays.
  - `#zoop-frontend`: Web console and Flutter mobile apps.

---

## 2. Self-Service Diagnostics

Before reporting a connectivity problem, run the built-in diagnostic suite:

```bash
# Run human-readable health check
zoop doctor

# Export diagnostic bundle as JSON for bug reports
zoop doctor --json > zoop_diag.json

# Export a complete diagnostic snapshot including routing tables and network adapters
zoop doctor --bundle > zoop_bundle.json
```

The diagnostic engine automatically verifies:
- Virtual TUN adapter availability (`zoop0`, `utun`, `Wintun`).
- Operating system root/administrative privileges.
- Control plane API reachability and TLS certificate validity.
- STUN server resolution and reflexive candidate gathering.
- DNS resolution through active tunnel interfaces.

---

## 3. Reporting Bugs

If you discover a bug or network degradation:
1. Check existing issues on GitHub to avoid duplicates.
2. Open a new issue using the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml).
3. Always include the output of `zoop doctor --json` and relevant system daemon logs (`journalctl -u zoopd -n 100`).
