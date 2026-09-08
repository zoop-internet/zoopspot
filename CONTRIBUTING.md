# Contributing to Zoop Internet

Welcome! This guide explains our engineering workflows, standards, and guidelines for contributing to Zoop across the control plane, system daemon, router gateway, web dashboard, and mobile applications.

---

## 1. Prerequisites & Environment Setup

Ensure you have the following toolchains installed:

| Toolchain | Minimum Version | Required For |
|---|---|---|
| **Go** | `1.22+` (`1.25` recommended) | `cmd/zoop`, `cmd/zoopd`, `cloud`, `router`, `packages/*` |
| **Node.js** | `20+` (LTS) & `npm` | Web management dashboard (`web/`) |
| **Flutter / Dart** | `3.24+` | Mobile cross-platform application (`mobile/`) |
| **Docker** | Latest | Container builds, local PostgreSQL/Neon, and NAT testbed |
| **golangci-lint** | `v1.60+` | Go static analysis and linting |

---

## 2. Repository Structure

```text
zoop/
├── cmd/                      # Executable entrypoints (zoop CLI, zoopd daemon, mobile wrapper)
├── packages/                 # Shared internal libraries
│   ├── agent/                # WireGuard tunnel, STUN discovery, roaming, health, relay client
│   ├── cloud/                # REST API, PostgreSQL/Neon store, WebSocket signaling hub
│   ├── core/                 # Shared types, config, error definitions, networking utilities
│   ├── platform/             # OS abstractions (Linux netlink, Darwin, Windows, Android, iOS)
│   └── router/               # IPTables NAT masquerade and LAN policy routing
├── cloud/                    # Zoop Cloud control plane daemon
├── router/                   # Zoop Router gateway daemon
├── web/                      # React + TypeScript management console
├── mobile/                   # Flutter cross-platform mobile client
├── infrastructure/           # Docker Compose environments and Helm charts
├── deployments/              # systemd units and launchd plists
└── test/                     # End-to-end network simulations and test fixtures
```

---

## 3. Git Workflow & Branch Conventions

1. **Branch Naming**:
   Use descriptive, prefix-based branch names:
   - `feat/<short-description>` — New features (e.g., `feat/adaptive-stun-interval`)
   - `fix/<bug-description>` — Bug fixes (e.g., `fix/wireguard-handshake-retry`)
   - `refactor/<scope>` — Code improvements without behavioral changes
   - `docs/<topic>` — Documentation and runbook updates
   - `chore/<task>` — CI/CD, dependency upgrades, or tooling

2. **Commit Message Format**:
   We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   ```text
   <type>(<scope>): <subject>

   [optional body]

   [optional footer(s)]
   ```
   *Examples:*
   - `feat(agent): add adaptive STUN candidate re-probing`
   - `fix(router): ensure iptables cleanup executes on SIGTERM`
   - `docs(api): document WebSocket signaling handshake protocol`

---

## 4. Building & Running Locally

### Building Go Binaries
```bash
# Compile all core binaries (zoop, zoopd, zoop-cloud, zoop-router) into bin/
make build
```

### Running the Web Dashboard
```bash
cd web
npm ci
npm run dev
```

### Running Mobile Tests
```bash
# Run Go mobile binding tests
make mobile-test

# Run Flutter mobile tests
cd mobile
flutter pub get
flutter test
```

---

## 5. Quality Assurance & Testing

Before opening a Pull Request, verify that all checks pass locally:

```bash
# Run all Go unit tests
make test

# Run Go static analysis
make lint

# Format Go code
make format
```

For web contributions, run type checking and linting:
```bash
cd web
npm run lint
npm run build
```

---

## 6. Pull Request Guidelines

1. **Focused Scope**: Keep PRs small, well-scoped, and focused on a single responsibility.
2. **Test Coverage**: Accompany bug fixes and new features with comprehensive unit tests.
3. **Template Completion**: Fill out the [Pull Request Template](.github/pull_request_template.md) completely.
4. **Clean Git History**: Rebase against `main` before submitting; avoid merge commits on feature branches.
5. **Review Approval**: All PRs require approval from designated subsystem owners (defined in [`.github/CODEOWNERS`](.github/CODEOWNERS)) before merging.
