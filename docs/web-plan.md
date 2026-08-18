# Web Functionalization Plan

**Goal:** Make the Zoop Web application fully functional as the management surface for
non-technical users. A user who cannot use the CLI opens the web, sees their connected
devices and live tunnel state, manages connections (connect/disconnect), manages shares
and organizations, and operators get a working admin console.

## Sprint status

- **Phase 0 (identity & auth fix)** — DONE: `Register` returns `endpoint_id`, web signs
  with it, `types.ID` JSON fixed, unregister endpoint added.
- **Phase 1 (API surface)** — DONE: list shares/connections endpoints + store methods;
  org routes now behind `authMw` with owner/membership checks, `OrgMember.DeviceID`,
  `Organization.OwnerDevice`/`Slug`, admin-scoped endpoints
  (`GET /v1/admin/overview`, `/organizations`, `/organizations/{id}/members`) via
  `ZOOP_ADMIN_IDS` allow-list; duplicate-slug rejection; browser auto-recovers stale
  identities after cloud reset.
- **Phase 2 (lifecycle)** — DONE: `connection_disconnected` signaling, teardown, truthful
  CONNECTED reporting, daemon disconnect wired.
- **Phase 3 (daemon API)** — DONE: full `127.0.0.1:9090` REST + SSE + `-mock-tun`.
- **Phase 4 (web UI)** — MOSTLY DONE: user portal wired to real data; auto-register;
  fleet/shares/connections dropdowns; SSE real-time (live `share_created` /
  `connection_updated` events refresh the UI automatically); dead `'desktop'` mode and
  `Desktop*` types removed; **local-mode daemon client** (`web/src/api/daemon.ts` +
  `DaemonStatusCard` in Overview: probes `127.0.0.1:9090`, shows live status,
  telemetry/throughput, peers, and subscribes to the daemon SSE stream). REMAINING:
  routing (App-level view routing).
- **Phase 5 (admin console)** — MOSTLY DONE: Devices/Organizations/Overview/Connections/
  System tabs now fetch real data via admin endpoints (`/v1/admin/devices`,
  `/v1/admin/connections`, `/v1/admin/services` added; middleware via `ZOOP_ADMIN_IDS`).
  REMAINING: Users tab (account model), Operations/Usage/Billing (no telemetry backend yet),
  Network/Relays/Security/Abuse still placeholders.
- **Phase 6 (deployment)** — MOSTLY DONE: `VITE_API_BASE` build-time env for the web app
  (`web/.env.example`); `CORSMiddleware` honoring `ZOOP_ALLOWED_ORIGINS`; `SecurityHeaders
  Middleware` (CSP, HSTS, X-Frame-Options, nosniff, referrer/permissions policies);
  SPA static hosting of `web/dist` via `ZOOP_WEB_DIST` (API routes take precedence,
  unknown paths fall back to `index.html`). REMAINING: serving over TLS in prod.
- **Phase 7 (multi-tenant workspaces)** — PENDING, spec added below.

## The Product Model (verified against code + `docs/web.md`)

- `zoopd` runs on the real device and performs the networking: it creates the WireGuard
  TUN (`zoop0`), registers the device with the cloud, runs the signaling client, and on
  `connection_request` authorizes → `AddPeer` → `AssignIP` → `EnableForwarding`
  (NAT/MASQUERADE, i.e. internet/hotspot sharing) → replies `connection_accepted`.
  Recipients do the same to join the tunnel. **The web does not perform networking.**
- The web is the **management layer**. It shows what real devices are doing and lets the
  user act on it. This is the same role the removed Wails desktop app played (via daemon
  IPC); the web reaches the daemon over localhost HTTP/WebSocket instead.
- The web has two sources of truth it must merge, exactly like the desktop app did:
  1. **Local daemon state** (live WireGuard peers, telemetry, status) — only reachable
     when the browser runs on the same machine as `zoopd`.
  2. **Cloud records** (connections, shares, organizations, devices) — reachable remotely.

## Root Causes (what is broken/missing today)

1. **Web cannot authenticate to the cloud.** The web saves the random `device.ID` as its
   identity (`web/src/context/NetworkContext.tsx:109`), but `AuthMiddleware` resolves
   identities only by `endpoint_id` = `uuid.NewSHA1(uuid.NameSpaceOID, ed25519_pubkey)`
   (`packages/cloud/api/middleware.go:151-157`). Every authenticated call returns 401.
   The Go agent signs with `EndpointID` (`packages/agent/client/client.go:72`).
2. **No share/connection listing.** `refreshShares` is a no-op stub; the backend has no
   `GET /v1/shares` and no `GET /v1/connections` list; the store has no list methods.
3. **State bug.** Web sends `'disconnected'`; Go states are uppercase
   `"DISCONNECTED"` (`packages/core/types/connection.go:7-12`) → 409.
4. **No real-time updates.** Zero WebSocket/SSE in `web/src`, while the signaling
   protocol exists end-to-end (`agent/client/signaling.go`, server `GET /v1/signaling`).
5. **Daemon IPC is mostly mocked.** `cmd/zoopd/main.go`: `disconnect` is a no-op,
   `get_peers`/`get_telemetry`/`subscribe` return fake data — while real per-peer state
   exists in `telemetry.GetTracker()` and `PathMonitor.GetPeerPathState` (WireGuard UAPI).
6. **No disconnect lifecycle end-to-end.** No `connection_disconnected` signaling type;
   the signaling client never calls `RemovePeer`/`DisableForwarding`; cloud connection
   state never advances to `CONNECTED` even when the tunnel is live.
7. **Orgs unauthenticated**, no account/device ownership link on `OrgMember`.
8. **Admin console is a static mock**; audit/metrics/health services already exist to
   power it.
9. **Security.** Ed25519 private key stored plaintext (PKCS8, base64) in localStorage;
   `'dev-placeholder'` signature fallback; no production serving path; `API_BASE` hardcoded.

## Architecture: dual-mode web

```
                  BROWSER (non-technical user)
                        │
        ┌───────────────┼──────────────────┐
        │  same machine                  remote
        ▼  (daemon reachable)             │
   ┌──────────────┐                       ▼
   │  zoopd HTTP  │ 127.0.0.1:9090   ┌──────────────┐
   │  /api/...    │──────────────────▶│   Zoop Cloud │
   │  (signs as   │  via POST /api/cloud  (Go API)   │
   │  real device)│  or direct         └──────────────┘
   └──────┬───────┘                        │
          │  real WG peers / telemetry     │
          ▼                                ▼
   local WireGuard (zoop0)          Postgres / Redis
```

- **Local mode:** cloud calls go through the daemon (`POST /api/cloud`), which signs with
  the real device identity → connections actually tunnel. Live status/peers/telemetry +
  connect/disconnect via `127.0.0.1:9090`.
- **Remote mode:** cloud calls go direct with a browser-held management identity
  (register/manage shares/orgs/connections). Tunnels always require real agents.

## Phases

### Phase 0 — Identity model & auth fix (blocking, everything depends on it)

Backend:
- `DeviceResponse` gains `EndpointID`; `Register` returns it
  (`packages/cloud/services/devices.go:66-69`, `packages/cloud/api/models.go:25-30`).
- Keep `GetIdentityByPublicKey` (already in store) as a lookup fallback for the relay.

Web:
- `web/src/api/identity.ts`: store `endpoint_id` as the auth identity; remove the
  `'dev-placeholder'` fallback; stop storing the private key in plaintext localStorage —
  use IndexedDB with a non-extractable `CryptoKey` (keep session-scoped in-memory copy).
- `web/src/api/client.ts`: add `endpoint_id` to `ApiDevice`; align types with Go
  (`os`, not `platform`; `is_active`, `state` casing); send proper signed headers for
  every authenticated call.
- `web/src/context/NetworkContext.tsx`: persist and use `endpoint_id`; fix `doDisconnect`
  to send `"DISCONNECTED"`.

### Phase 1 — Complete cloud API surface

Store (`packages/cloud/store/store.go` + `postgres.go` + migrations):
- `ListSharingRelationships(ctx, endpointID)` — shares where caller is provider or
  recipient.
- `ListConnections(ctx, endpointID)` — all states, not just pending.
- `ListUsers`, `ListAllConnections`, IPAM usage (allocated pairs) for admin.

Endpoints (`packages/cloud/server/server.go`):
- `GET /v1/shares` (authed, caller-scoped).
- `GET /v1/connections` (authed, caller-scoped).
- Wire org routes behind `authMw`; add `AccountID`/`DeviceID` link to `OrgMember`
  (`packages/core/types/entity.go`, `packages/cloud/services/organizations.go`) and
  ownership checks (caller must be a member/owner of the org).

### Phase 2 — Connect/disconnect lifecycle (make "manage" real)

- New signaling message type `connection_disconnected`
  (`packages/core/types/signaling.go`).
- Server: `CreateConnection` already signals the provider. Extend `UpdateConnectionState`
  to push state changes (authorized/connected/disconnected) to both peers over signaling.
- Agent (`packages/agent/client/signaling.go`):
  - Handle `connection_disconnected` → `RemovePeer(peerPubKey)` +
    `DisableForwarding()` (tear down tunnel + stop sharing).
  - Handle `connection_rejected` (currently unhandled).
  - After a successful handshake/`AddPeer`, report `UpdateConnectionState(CONNECTED)` so
    cloud state is truthful; on teardown report `DISCONNECTED`.

### Phase 3 — Real daemon API (replaces desktop bridge, powers local mode)

Extend `zoopd`'s `127.0.0.1:9090` HTTP server (localhost-only, CORS for localhost
origins). Back these with **real** data, not the mocked IPC:
- `GET /api/status` — device, tun, WG port/key, forwarding state.
- `GET /api/peers` — live peers from `telemetry.GetTracker().GetSnapshots()` +
  `PathMonitor.GetPeerPathState` (last handshake, rx/tx bytes, path, RTT).
- `GET /api/telemetry` — same tracker data, JSON.
- `POST /api/connect {peer_id}` — existing `RequestConnection`.
- `POST /api/disconnect {conn_id}` — `RemovePeer` + `DisableForwarding` +
  `UpdateConnectionState(DISCONNECTED)` + signaling broadcast.
- `POST /api/cloud {method, path, body}` — forward via `apiClient.do(...)` signed as the
  real device. **This is the gateway that lets the web act as the device.**
- `GET /api/settings`, `POST /api/settings` (auto-connect, kill-switch, DNS, etc.).
- `POST /api/diagnostics` — `health.Checker.RunDiagnostics`.
- `GET /api/stream` (SSE) — live tunnel/telemetry/state events (replaces the fake
  `subscribe` loop; a subscriber registry broadcasting tracker updates).

### Phase 4 — Web UI: dual mode + real-time + non-technical UX

- On load, probe `http://127.0.0.1:9090/health`. Set `localMode` true if reachable.
- **API layer** (`web/src/api`):
  - `daemon.ts`: client for `/api/*` (status, peers, telemetry, connect, disconnect,
    diagnostics, settings, stream).
  - `cloud.ts`: existing client refactored; in local mode route through `POST /api/cloud`.
  - `signaling.ts`: port of `agent/client/signaling.go` — signed WebSocket
    `wss://…/v1/signaling` with reconnect/backoff, handling
    `connection_request/accepted/rejected/disconnected` to update live state.
- **State** (`NetworkContext`): merge local daemon state + cloud records into one view:
  - "Connected devices" = live WG peers (local) + connection records (cloud).
  - Refresh on signaling/SSE events, not manual polling only.
- **UX** (`UserDashboard`, `OrgDashboard`): simple, human labels — "My device", "Who can
  use my internet", "Connected right now", connect/disconnect buttons, share
  create/accept/revoke, device list, diagnostics and settings when local.
- Done: removed the dead `'desktop'` PortalMode and `Desktop*` types.

### Phase 5 — Admin console (real endpoints)

- Admin middleware: allow-list of admin `endpoint_id`s via `ZOOP_ADMIN_IDS`; every admin
  action recorded via `AuditService.Log`.
- Endpoints: `GET /v1/admin/overview` (aggregates), `GET /v1/admin/services` (reuse
  `CheckHealth`), `GET /v1/admin/users`, `GET /v1/admin/organizations` + members,
  `GET /v1/admin/devices` + `POST /v1/admin/devices/{id}/revoke`,
  `GET /v1/admin/connections`, `GET /v1/admin/network` (IPAM usage),
  `GET /v1/admin/relays` (+ add/remove), `GET /v1/admin/audit`, `GET /v1/admin/usage`.
- Wire every tab in `web/src/admin/AdminConsole.tsx`; remove mock badges.

### Phase 6 — Deployment & hardening

- Serve `web/dist` (reverse proxy / static hosting), configurable `API_BASE`
  (env `VITE_API_BASE`), CORS via `ZOOP_ALLOWED_ORIGINS` on cloud and localhost-only CORS
  on the daemon API.
- Content-Security-Policy; HSTS; proper key storage (Phase 0); signed requests only
  (no placeholder).
- Document local-mode vs remote-mode behavior for users.

### Phase 7 — Account-centric workspaces (Cloudflare-style, no subdomains)

Product model: every user has **one account**. The account contains a **Personal
workspace** (their own devices/shares/connections) and any number of **organizations**
("workspaces") they create or join. A workspace switcher (like Cloudflare's account
dropdown) moves between them — all on the same app, no separate domains/subdomains.

- **Workspace switcher** (`web/src`): a dropdown in the top bar listing
  "Personal" + each organization the account belongs to + "Create organization…".
  Selecting one switches the portal body:
  - Personal → the existing user portal (devices/shares/connections).
  - Organization → the org portal (members, managed devices, policies, logs).
  - Platform operator console stays separate (`admin` mode).
- **Create-org flow**: inline form (name + slug) in the switcher menu; on success the
  caller becomes owner and the switcher jumps to the new org.
- **Backend** (foundation, already partly landed in Phase 1): orgs are authed, owner
  linked via `owner_device_id`, members linked via `device_id`, and `GET /v1/organizations`
  is caller-scoped — exactly what a switcher needs to list.
- **Personal workspace** is implicit (no org record needed): it is the caller's own
  devices/shares/connections via the existing user-portal endpoints.
- **Admin** (Phase 5) lists all workspaces (personal + org) with owner, slug, member count.

Dependencies: needs Phase 1 (org auth + ownership) and Phase 4 (routing) foundations.

## Sequencing & dependencies

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──▶ Phase 5 ──▶ Phase 6 ──▶ Phase 7
  auth fix    API       lifecycle   daemon API   web UI       admin       ship       multi-tenant
 (blocking)  surface    (disconnect) (local mode) (dual mode)  console                            workspaces
```

- Phases 0–1 make the web *work* against the cloud remotely.
- Phase 2 makes "manage/disconnect" *real* (tunnels actually tear down).
- Phases 3–4 deliver the desktop-equivalent local experience for non-technical users.
- Phase 5 delivers the operator console; Phase 6 ships it.
- Phase 7 delivers the Cloudflare/Vercel-style workspace model with per-org domains.

## Definition of done (web fully functional)

- A non-technical user can: register/login → see their device and the devices currently
  connected through it (live handshake state) → connect to a provider → disconnect and see
  the tunnel actually go down → create/accept/revoke shares → manage organizations.
- The web never carries Internet traffic; all networking stays in `zoopd` (per
  `docs/web.md` §35-36).
- All screens show real data; no stubs, mocks, or fake telemetry.
