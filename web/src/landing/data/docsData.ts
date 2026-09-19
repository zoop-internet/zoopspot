/* ─── Docs IA & Helpers — professional docs for real users ─────────────── */
export type DocItem = { id: string; title: string; file: string; desc: string };
export type DocSection = { label: string; items: DocItem[] };

export const DOCS_SECTIONS: DocSection[] = [
  { label: 'Start Here', items: [
    { id: 'quickstart', title: 'Quick Start', file: 'README', desc: 'Self-host in 2 min — build, run, connect' },
    { id: 'installation', title: 'Install Zoop', file: 'platforms', desc: 'Linux, macOS, Windows, phones, routers' },
    { id: 'configuration', title: 'Configure', file: 'control-plane', desc: 'Env vars, STUN, TUN, ports' },
  ]},
  { label: 'Use Zoop', items: [
    { id: 'web-console', title: 'Web Console', file: 'web', desc: 'Manage devices, shares, tunnels' },
    { id: 'connect-share', title: 'Connect & Share', file: 'entities', desc: 'Share home/phone with laptop/family' },
    { id: 'devices', title: 'Devices', file: 'web', desc: 'Add, rename, revoke, check status' },
    { id: 'mobile-router', title: 'Mobile & Router', file: 'platforms', desc: 'Android, iOS, OpenWrt' },
  ]},
  { label: 'Account & Team', items: [
    { id: 'identity', title: 'Your Zoop ID', file: 'identity', desc: 'ZP-… + @username + 6-digit PIN' },
    { id: 'organizations', title: 'Teams', file: 'organizations', desc: 'Create org, invite, roles' },
    { id: 'permissions', title: 'Permissions', file: 'organizations', desc: 'Who can share, who can connect' },
  ]},
  { label: 'Help', items: [
    { id: 'troubleshooting', title: 'Troubleshooting', file: 'networking', desc: 'NAT, relay, roaming, doctor' },
    { id: 'security-architecture', title: 'Security Architecture', file: 'security', desc: 'WireGuard®, Noise_IK, cryptography' },
    { id: 'faq', title: 'FAQ', file: 'api', desc: 'Common questions, quick answers' },
  ]},
];

export const DOCS_FLAT = DOCS_SECTIONS.flatMap(s => s.items);

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function escapeHtmlRaw(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function sanitizeHref(href: string): string {
  const h = href.trim();
  if (h.startsWith('#') || h.startsWith('/') || h.startsWith('./') || h.startsWith('../')) return h;
  if (/^(https?:\/\/|mailto:)/i.test(h)) return h;
  if (h.startsWith('http://') || h.startsWith('https://')) return h;
  // block javascript:, data:, vbscript:
  if (/^(javascript|data|vbscript):/i.test(h)) return '#';
  // allow relative without slash
  if (!/:/.test(h)) return h;
  return '#';
}

export function mdToHtml(md: string): string {
  // Extract code fences first to avoid escaping inside
  const fences: string[] = [];
  let tmp = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = fences.length;
    const safe = escapeHtmlRaw(code);
    const hdr = lang
      ? `<div class="docs-code-hdr"><span class="docs-code-lang">${escapeHtmlRaw(lang)}</span><button class="docs-copy" data-copy="${encodeURIComponent(code)}" aria-label="Copy code">Copy</button></div>`
      : `<div class="docs-code-hdr"><span class="docs-code-lang">code</span><button class="docs-copy" data-copy="${encodeURIComponent(code)}" aria-label="Copy code">Copy</button></div>`;
    fences.push(`${hdr}<pre><code>${safe}</code></pre>`);
    return `\uE000${idx}\uE001`;
  });
  // Escape html once — fences already extracted, so no double-encode inside fences
  tmp = tmp.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // tables: | a | b |\n|---|---|\n| c | d |
  tmp = tmp.replace(/^\|(.+)\|\n\|[-| :]*\|\n((?:\|.*\|\n?)+)/gm, (_m, head, body) => {
    const ths = head.split('|').filter(Boolean).map((c: string) => `<th>${c.trim()}</th>`).join('');
    const trs = body.trim().split('\n').map((row: string) => {
      const tds = row.split('|').filter(Boolean).map((c: string) => `<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  let html = tmp
    .replace(/^#### (.+)$/gm, (_m, t) => `<h4 id="${slugify(t)}">${escapeHtmlRaw(t)}</h4>`)
    .replace(/^### (.+)$/gm, (_m, t) => `<h3 id="${slugify(t)}">${escapeHtmlRaw(t)}</h3>`)
    .replace(/^## (.+)$/gm, (_m, t) => `<h2 id="${slugify(t)}">${escapeHtmlRaw(t)}</h2>`)
    .replace(/^# (.+)$/gm, (_m, t) => `<h2 id="${slugify(t)}" class="docs-section-heading">${escapeHtmlRaw(t)}</h2>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => `<a href="${escapeHtmlRaw(sanitizeHref(href))}" target="_blank" rel="noreferrer noopener">${label}</a>`)
    .replace(/^\s*---\s*$/gm, '<hr/>')
    .replace(/^\s*> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
  html = `<p>${html}</p>`;
  html = html
    .replace(/<p><h/g, '<h')
    .replace(/<\/h([1-3])><\/p>/g, '</h$1>')
    .replace(/<p><div class="docs-code-hdr/g, '<div class="docs-code-hdr')
    .replace(/<\/pre><\/p>/g, '</pre>')
    .replace(/<p><ul/g, '<ul')
    .replace(/<\/ul><\/p>/g, '</ul>')
    .replace(/<p><blockquote/g, '<blockquote')
    .replace(/<\/blockquote><\/p>/g, '</blockquote>')
    .replace(/<p><hr\/><\/p>/g, '<hr/>')
    .replace(/<p><table/g, '<table')
    .replace(/<\/table><\/p>/g, '</table>')
    .replace(/<p>\s*<\/p>/g, '');
  // restore fences
  html = html.replace(/\uE000(\d+)\uE001/g, (_m, i) => `<div class="docs-code-wrap">${fences[Number(i)]}</div>`);
  return html;
}

export function extractToc(md: string): Array<{ level: number; title: string; id: string }> {
  const out: Array<{ level: number; title: string; id: string }> = [];
  for (const m of md.matchAll(/^### (.+)$/gm)) out.push({ level: 3, title: m[1], id: slugify(m[1]) });
  for (const m of md.matchAll(/^## (.+)$/gm)) out.push({ level: 2, title: m[1], id: slugify(m[1]) });
  // sort by appearance
  out.sort((a, b) => md.indexOf(a.title) - md.indexOf(b.title));
  return out.slice(0, 12);
}

export const QUICKSTART_MD = `# Quick Start — self-host in 2 minutes

\`zoop-cloud\` is the control plane (identity, signaling, IPAM). \`zoopd\` is the daemon that owns the TUN/WireGuard tunnel. Payload never transits the cloud — direct device-to-device.

## 1. Prerequisites
- Go 1.22+, Docker (optional), TUN perms (sudo for daemon)

## 2. Build
\`\`\`bash
git clone https://github.com/zoop-internet/zoop.git && cd zoop
make build   # bin/zoop, bin/zoopd, bin/zoop-cloud, bin/zoop-router
\`\`\`

## 3. Run cloud (dev)
\`\`\`bash
./bin/zoop-cloud                      # in-mem
# or
ZOOP_DATABASE_URL=postgres://user:pass@localhost:5432/zoop?sslmode=disable ./bin/zoop-cloud
\`\`\`

## 4. Run daemon
\`\`\`bash
sudo ./bin/zoopd -tun zoop0 -api-port 9090        # foreground
sudo ./bin/zoopd service install && sudo ./bin/zoopd service start  # systemd/launchd
sudo ./bin/zoopd service status
\`\`\`

## 5. CLI
\`\`\`bash
zoop status
zoop peers
zoop connect <provider_endpoint_id>
zoop telemetry
zoop doctor   # TUN, privs, API, DNS, STUN/NAT
\`\`\`

## Env (most used)
| Var | Default | What |
|---|---|---|
| ZOOP_CONTROL_PLANE_URL | http://localhost:8080 | cloud URL |
| ZOOP_STUN_SERVER | stun.l.google.com:19302 | reflexive candidate |
| ZOOP_TUN_NAME | zoop0 | iface |
| ZOOP_API_PORT | 9090 | /metrics, /v1/health |
| ZOOP_DATABASE_URL | "" | Postgres |
| ZOOP_REDIS_URL | "" | multi-node signaling |
`;

export const CURATED_MD: Record<string, string> = {
  installation: `# Install Zoop — choose your device

Zoop runs as a lightweight daemon (\`zoopd\`) on computers/routers and as a one-tap app on phones. Web console works in any browser.

## Linux (systemd)
\`\`\`bash
curl -fsSL https://get.zoop.dev | sh   # .deb + systemd unit
# or
sudo ./bin/zoopd service install && sudo ./bin/zoopd service start
sudo ./bin/zoopd service status
\`\`\`

## macOS (launchd, utun)
\`\`\`bash
brew install zoop-internet/tap/zoop
# or download Zoop-macOS-universal.pkg
sudo zoopd -tun zoop0   # foreground test
\`\`\`

## Windows (Wintun)
Download \`.msi\` from /downloads — tray icon shows status. No admin after install.

## Android / iOS
- Android: APK from /downloads or Play (soon) — uses \`VpnService\`
- iOS: TestFlight link on /downloads — uses \`NetworkExtension\`

## OpenWrt Router
\`\`\`bash
opkg install zoop-router_mipsel.ipk
uci set zoop.@zoop[0].enabled=1 && uci commit && /etc/init.d/zoop restart
\`\`\`

> **Tip:** One Zoop ID works everywhere. Install on 2 devices → they can find each other via cloud, then talk directly.

`,
  configuration: `# Configure Zoop

Only set what you change. Defaults work for dev.

## Most used
| Var | Default | When to change |
|---|---|---|
| ZOOP_CONTROL_PLANE_URL | http://localhost:8080 | point app at hosted cloud e.g. https://cloud.zoop.network |
| ZOOP_STUN_SERVER | stun.l.google.com:19302 | if you run your own STUN |
| ZOOP_TUN_NAME | zoop0 | if name collides |
| ZOOP_API_PORT | 9090 | Prometheus /metrics + /v1/health |
| ZOOP_CONFIG_DIR | ~/.zoop | keys & identity |

## Cloud persistence
\`\`\`bash
ZOOP_DATABASE_URL=postgres://user:pass@localhost:5432/zoop?sslmode=disable ./bin/zoop-cloud
ZOOP_REDIS_URL=redis://localhost:6379 ./bin/zoop-cloud  # multi-node
\`\`\`

## Daemon flags
\`\`\`bash
sudo ./bin/zoopd -tun zoop0 -api-port 9090 -socket /var/run/zoopd.sock -config-dir ~/.zoop
\`\`\`

> Keys are \`0600\` and optional \`ZOOP_IDENTITY_PASSPHRASE\` (PBKDF2-AES-GCM).

`,
  "web-console": `# Web Console — manage in browser

Open /app (Personal), /org (Teams), /admin (Operators). No email — sign in with Zoop ID \`ZP-XXXXXX\` + 6-digit PIN.

## Personal — Devices
- See fleet, platform, status (online/offline). Click ID to copy.
- \`Register new\` creates a device on this browser (Web).

## Connections
- **Initiate:** pick a provider that shared to you → Connect.
- **Pending:** provider sees Incoming → Accept / Decline. You see Awaiting approval → Cancel.
- **Active:** shows tunnel IP, state (CONNECTED/CONNECTING). Disconnect to close.

## Sharing
- Select a recipient device → Authorize. That device can now connect *through you* as provider.

## Tips
- Daemon card (\`zoopd\` on 127.0.0.1:9090) shows live tunnels if running.
- Toasts confirm copy/share. Search filters fleet.
- Settings → Unregister removes device, not your Zoop ID.

`,
  "connect-share": `# Connect & Share — the core flow

## 1. Share (provider authorizes recipient)
On the **provider** device (home PC/phone that has internet):
1. Open /app → Sharing → pick recipient device → Authorize.

Provider now allows that recipient to route via it.

## 2. Connect (recipient dials provider)
On the **recipient** (laptop on road):
1. Open /app → Connections → pick provider → Connect.
2. Provider sees Incoming → Accept.
3. State becomes CONNECTED — tunnel IP appears. Traffic now goes direct device-to-device.

## 3. Direct vs relay
- **DIRECT** (<1ms) — STUN discovered host/srflx, hole-punched — preferred.
- **RELAY** — when both behind strict NAT/CGNAT — still end-to-end encrypted via WebSocket relay.

> Roaming (Wi-Fi ↔ 5G) is automatic via Netlink re-probe — no drop. Check \`zoop telemetry\` for live bytes.

`,
  devices: `# Devices — add, rename, revoke

## Statuses
- **Trusted/Active** — registered, can be authorized
- **Suspended** — paused by admin, reconnect blocked
- **Revoked** — credential deleted, must re-register

## Actions
- **Copy ID** — click Device ID (monospace) to copy.
- **Unregister** — Settings → Unregister device (per-device credential, not your Zoop ID).

## Fleet search
Filter by name, ID prefix, platform, status. Counts show in nav (e.g. Devices 5).

> Losing a device credential does not lose your Zoop ID (\`ZP-…\`). Your ID is permanent; devices are revocable.
`,
  "mobile-router": `# Mobile & Router

## Android (VpnService, Gomobile)
- Install APK → allow VPN → toggle. Shows as WireGuard TUN. Battery-aware.

## iOS (NetworkExtension)
- TestFlight → allow VPN → toggle. Respects iOS background limits.

## OpenWrt
- \`.ipk\` via \`opkg\` → UCI configures NAT MASQUERADE + policy routing.
- Whole-home sharing: router as provider → all LAN devices can route via it.

> Phones as provider: share mobile hotspot securely without phone Settings hotspot.
`,
  identity: `# Your Zoop ID — ZP-… + @username + PIN

- **Permanent:** \`ZP-7K4M9X\` — 6-char alphabet \`23456789ABCDEFGHJKLMNPQRSTUVWXYZ\`, derived from Ed25519 pubkey (UUIDv5). Never changes.
- **Mutable:** \`@username\` — 2–24 chars, letters/numbers/._-, your handle.
- **PIN:** 6 digits, revocable, never emailed. Used for sensitive ops, rate-limited. Show/Hide toggle.

## Recovery
- PIN forgot? Use **device key** (PKCS8) import on Sign In → Use device key.
- Device lost? Unregister that device; your Zoop ID stays.

> No email required. No password reset email — your devices *are* your factors.
`,
  organizations: `# Teams — create, invite, roles

## Create
Web → /org → Create Org → name + slug (e.g. acme). You become Owner.

## Invite
Orgs → Members → Add → Zoop ID (\`ZP-…\`) or \`@username\` + role.

## Roles
- **Owner** — billing, delete, all
- **Admin** — members, devices, policies
- **Member** — share/connect within org
- **Viewer** — read only

> Orgs isolate fleet, audit logs, IPAM. Personal devices stay separate unless shared.
`,
  permissions: `# Permissions — who can share & connect

- **Share** = provider authorizes recipient (\`POST /v1/shares\`). Until shared, recipient cannot see provider in Connections.
- **Connect** = recipient requests tunnel (\`POST /v1/connections\` → REQUESTED → provider Accept → AUTHORIZED → CONNECTED).
- **Revoke** = provider or admin revokes device/org member — tunnel drops, future shares blocked.

> Sharing is directional. A can share to B without B sharing to A. Make both directions for mutual.
`,
  troubleshooting: `# Troubleshooting — fix fast

## \`zoop doctor\`
Checks TUN, privs, cloud reachability, DNS, STUN/NAT. Run first.

## NAT → relay, not direct
- Both strict/CGNAT? Expected relay. Direct needs at least one host/srflx reachable via UDP.
- Try different STUN: \`ZOOP_STUN_SERVER=stun.cloudflare.com:3478\`

## Tunnel up, no internet
- Provider NAT/forwarding? Check \`iptables -L\` / provider firewall.
- IPAM: \`100.64.0.0/10\` (/30 per pair). Conflicts? Check /admin IPAM.

## Roaming drops
- Netlink events require daemon running. \`zoopd service status\` must be active.

## Still stuck
Open issue with \`zoop doctor\` output: https://github.com/zoop-internet/zoop/issues
`,
  "security-architecture": `# Security & Cryptographic Architecture

## Cryptographic Protocols
- **Data Plane:** WireGuard® Noise_IK pattern using ChaCha20-Poly1305 authenticated encryption, Curve25519 key exchanges, and BLAKE2s hashing with 1-second ephemeral rekeying.
- **Control Plane:** Ed25519 digital signatures on canonical request strings: \`zoop-auth-v2|METHOD|PATH|TIMESTAMP|NONCE|BODY_HASH\`, 5-minute bounded TTL, and server-side replay nonces.

## Key Storage & Protection
- Key files are stored with strict POSIX \`0600\` file permissions.
- Support for \`ZOOP_IDENTITY_PASSPHRASE\` with PBKDF2-HMAC-SHA256 key derivation and AES-256-GCM envelope encryption.

## Zero-Knowledge Relays
- Distributed WebSocket relay nodes stream opaque binary WireGuard frames using sender/recipient headers. Relays possess no decryption keys and cannot inspect payload bytes.
`,
  faq: `# FAQ — quick answers

**What is Zoop?** Direct device-to-device mesh so your home/phone internet follows your laptop — no VPN hop.

**VPN vs Zoop?** VPN relays via company server (+30–120ms). Zoop direct (<1ms) or encrypted relay only if NAT forces.

**Private?** Yes, end-to-end. Relays cannot decrypt.

**Behind CGNAT?** Yes — STUN + hole punch + relay fallback + roaming.

**Platforms?** Linux, macOS, Windows, Android, iOS, OpenWrt, web.

**Zoop ID?** Permanent \`ZP-XXXXXX\` + mutable \`@username\`, 6-digit PIN.

**Free?** MIT, free personal (5 devices), Teams $8/seat founding waitlist at /pricing.

> Still stuck? Search docs (⌘K) or ask on GitHub Issues.
`,
};
