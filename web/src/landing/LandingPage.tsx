import React, { useState, useEffect, useRef } from 'react';
import type { PortalMode } from '../types';
import { useApp } from '../context/AppContext';
import './LandingPage.css';

/* ─── SVG Icon Helper ─────────────────────────────────────────────────── */
const Ico: React.FC<{ d: string | React.ReactNode; size?: number; className?: string }> = ({
  d,
  size = 18,
  className = '',
}) =>
  typeof d === 'string' ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={d} />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d}
    </svg>
  );

const Icons = {
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </>
  ),
  terminal: (
    <>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  server: (
    <>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </>
  ),
  laptop: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </>
  ),
  smartphone: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  apple: (
    <path d="M12 20.94c1.5 0 2.75-.7 3.5-.7.8 0 2 .7 3.5.7 2.15 0 3.7-1.8 4.7-3.2-1.3-.7-2.15-2.2-2.15-3.8 0-2.4 1.85-3.6 2-3.7-1-.95-2.4-1.45-3.7-1.45-1.5 0-2.6.75-3.5.75-.85 0-2.15-.75-3.65-.75-2.2 0-4.3 1.4-5.3 3.6-1.5 3.1-.4 7.6 1.4 10.3 1 1.4 2.15 2.8 3.65 2.8zM15.4 5.3c.7-.9 1.15-2.1 1-3.3-1 .1-2.2.7-2.9 1.5-.6.8-1.2 2-1 3.2 1.1 0 2.2-.6 2.9-1.4z" />
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  arrowRight: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  menu: (
    <>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  router: (
    <>
      <rect x="2" y="8" width="20" height="8" rx="2" />
      <line x1="6" y1="12" x2="6.01" y2="12" />
      <line x1="10" y1="12" x2="10.01" y2="12" />
      <line x1="14" y1="12" x2="14.01" y2="12" />
      <line x1="18" y1="4" x2="18" y2="8" />
      <line x1="6" y1="4" x2="6" y2="8" />
    </>
  ),
};

/* ─── Docs IA & Helpers — professional docs for real users ─────────────── */
type DocItem = { id: string; title: string; file: string; desc: string };
type DocSection = { label: string; items: DocItem[] };
const DOCS_SECTIONS: DocSection[] = [
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
const DOCS_FLAT = DOCS_SECTIONS.flatMap(s => s.items);
function slugify(s: string){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60); }
function escapeHtmlRaw(s:string){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function sanitizeHref(href: string): string {
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
function mdToHtml(md: string): string {
  // Extract code fences first to avoid escaping inside
  const fences: string[] = [];
  let tmp = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = fences.length;
    const safe = escapeHtmlRaw(code);
    const hdr = lang ? `<div class="docs-code-hdr"><span class="docs-code-lang">${escapeHtmlRaw(lang)}</span><button class="docs-copy" data-copy="${encodeURIComponent(code)}" aria-label="Copy code">Copy</button></div>` : `<div class="docs-code-hdr"><span class="docs-code-lang">code</span><button class="docs-copy" data-copy="${encodeURIComponent(code)}" aria-label="Copy code">Copy</button></div>`;
    fences.push(`${hdr}<pre><code>${safe}</code></pre>`);
    return `\uE000${idx}\uE001`;
  });
  // Escape html once — fences already extracted, so no double-encode inside fences
  tmp = tmp.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // tables: | a | b |\n|---|---|\n| c | d |
  tmp = tmp.replace(/^\|(.+)\|\n\|[-| :]*\|\n((?:\|.*\|\n?)+)/gm, (_m, head, body)=>{
    const ths = head.split('|').filter(Boolean).map((c:string)=>`<th>${c.trim()}</th>`).join('');
    const trs = body.trim().split('\n').map((row:string)=>{
      const tds = row.split('|').filter(Boolean).map((c:string)=>`<td>${c.trim()}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  let html = tmp
    .replace(/^#### (.+)$/gm, (_m, t)=> `<h4 id="${slugify(t)}">${escapeHtmlRaw(t)}</h4>`)
    .replace(/^### (.+)$/gm, (_m, t)=> `<h3 id="${slugify(t)}">${escapeHtmlRaw(t)}</h3>`)
    .replace(/^## (.+)$/gm, (_m, t)=> `<h2 id="${slugify(t)}">${escapeHtmlRaw(t)}</h2>`)
    .replace(/^# (.+)$/gm, (_m, t)=> `<h2 id="${slugify(t)}" class="docs-section-heading">${escapeHtmlRaw(t)}</h2>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, (_m, c)=> `<code>${c}</code>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href)=> `<a href="${escapeHtmlRaw(sanitizeHref(href))}" target="_blank" rel="noreferrer noopener">${label}</a>`)
    .replace(/^\s*---\s*$/gm, '<hr/>')
    .replace(/^\s*> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><h/g, '<h').replace(/<\/h([1-3])><\/p>/g, '</h$1>').replace(/<p><div class="docs-code-hdr/g, '<div class="docs-code-hdr').replace(/<\/pre><\/p>/g, '</pre>').replace(/<p><ul/g, '<ul').replace(/<\/ul><\/p>/g, '</ul>').replace(/<p><blockquote/g, '<blockquote').replace(/<\/blockquote><\/p>/g, '</blockquote>').replace(/<p><hr\/><\/p>/g, '<hr/>').replace(/<p><table/g,'<table').replace(/<\/table><\/p>/g,'</table>').replace(/<p>\s*<\/p>/g, '');
  // restore fences
  html = html.replace(/\uE000(\d+)\uE001/g, (_m, i)=> `<div class="docs-code-wrap">${fences[Number(i)]}</div>`);
  return html;
}
function extractToc(md: string): Array<{level:number, title:string, id:string}> {
  const out: Array<{level:number,title:string,id:string}> = [];
  for(const m of md.matchAll(/^### (.+)$/gm)) out.push({level:3, title:m[1], id:slugify(m[1])});
  for(const m of md.matchAll(/^## (.+)$/gm)) out.push({level:2, title:m[1], id:slugify(m[1])});
  // sort by appearance
  out.sort((a,b)=> md.indexOf(a.title)-md.indexOf(b.title));
  return out.slice(0,12);
}
const QUICKSTART_MD = `# Quick Start — self-host in 2 minutes

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

const CURATED_MD: Record<string, string> = {
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

const DocsView: React.FC<{ initialId?: string; onNavigateHome: () => void }> = ({ initialId, onNavigateHome }) => {
  const [activeId, setActiveId] = useState<string>(() => {
    const fromHash = window.location.hash.replace(/^#/, '');
    const fromPath = window.location.pathname.split('/').pop();
    const cand = initialId || fromHash || (fromPath && DOCS_FLAT.some(d=>d.id===fromPath) ? fromPath : '');
    return cand && DOCS_FLAT.some(d=>d.id===cand) ? cand : DOCS_FLAT[0]?.id || 'quickstart';
  });
  const [search, setSearch] = useState('');
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [toc, setToc] = useState<Array<{level:number,title:string,id:string}>>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const active = DOCS_FLAT.find(d=>d.id===activeId) || DOCS_FLAT[0];
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(()=>{ window.history.replaceState({},'', activeId==='quickstart' ? '/docs' : `/docs/${activeId}`); },[activeId]);
  useEffect(()=>{
    if(!active) return;
    const curated = (CURATED_MD as Record<string,string>)[activeId] || (active.file==='README' ? QUICKSTART_MD : undefined);
    if(curated){ setMd(curated); setToc(extractToc(curated)); setLoading(false); setErr(null); return; }
    setLoading(true); setErr(null);
    fetch(`/docs/${active.file}.md`).then(r=> r.ok ? r.text() : Promise.reject(new Error(`${r.status}`))).then(t=> { setMd(t); setToc(extractToc(t)); }).catch(()=> setErr('Failed to load doc. Try GitHub.')).finally(()=> setLoading(false));
  },[active, activeId]);
  // copy delegation + cmd+K
  useEffect(()=>{
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if(t.closest('.docs-copy')){
        const btn = t.closest('.docs-copy') as HTMLElement;
        const data = btn.getAttribute('data-copy');
        if(data){ navigator.clipboard.writeText(decodeURIComponent(data)); setCopied(data.slice(0,20)); setTimeout(()=>setCopied(null),1200); btn.textContent='Copied!'; setTimeout(()=>btn.textContent='Copy',1200); }
      }
    };
    const onKey = (e: KeyboardEvent)=>{ if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); searchRef.current?.focus(); } };
    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return ()=>{ document.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey); };
  },[]);
  const filteredSections = DOCS_SECTIONS.map(s=> ({...s, items: s.items.filter(it=> !search || it.title.toLowerCase().includes(search.toLowerCase()) || it.desc.toLowerCase().includes(search.toLowerCase()))})).filter(s=> s.items.length>0);
  const activeIdx = DOCS_FLAT.findIndex(d=>d.id===activeId);
  return (
    <div className="docs-layout">
      <aside className="docs-sidebar" aria-label="Docs navigation">
        <div className="docs-sidebar-head">
          <div className="docs-brand-mini"><img src="/zoopicon-32.webp" alt="" aria-hidden="true" width={18} height={18}/><span>Zoop</span><span className="docs-ver">v0.1.0-alpha</span></div>
          <div className="docs-search-wrap">
            <input ref={searchRef} className="docs-search" placeholder="Search docs…  ⌘K" aria-label="Search docs" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
        <nav className="docs-nav">
          {filteredSections.map(sec=>(
            <div key={sec.label} className="docs-sec">
              <div className="docs-sec-label">{sec.label}</div>
              {sec.items.map(it=>(
                <button key={it.id} className={`docs-item ${activeId===it.id?'active':''}`} onClick={()=>setActiveId(it.id)} aria-current={activeId===it.id?'page':undefined}>
                  <span className="docs-item-title">{it.title}</span>
                  <span className="docs-item-desc">{it.desc}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="docs-sidebar-foot">
          <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub →</a>
          <span>·</span>
          <a href="/llms.txt">llms.txt</a>
          <span>·</span>
          <a href="/llms-full.txt">full</a>
          <span>·</span>
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigateHome(); }} style={{cursor:'pointer'}}>Home</a>
        </div>
      </aside>
      <section className="docs-main" aria-live="polite">
        <div className="docs-llms-banner" role="note">
          <span style={{fontWeight:800}}>Documentation Index</span> — Fetch the complete index at <a href="/llms.txt">/llms.txt</a> · <a href="/llms-full.txt">full</a> · Use before exploring further.
        </div>
        <div className="docs-tabs" role="tablist" aria-label="Docs sections">
          {DOCS_SECTIONS.map(sec => {
            const isActive = sec.items.some(i => i.id === activeId);
            return <button key={sec.label} role="tab" aria-selected={isActive} className={`docs-tab ${isActive ? 'active' : ''}`} onClick={() => setActiveId(sec.items[0].id)}>{sec.label}</button>;
          })}
        </div>
        <div className="docs-breadcrumb" aria-label="Breadcrumb">
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigateHome(); }} style={{cursor:'pointer', color:'#0284c7'}}>Home</a>
          <span style={{color:'#d4d4d4'}}>›</span>
          <a href="/docs" onClick={(e)=>{ e.preventDefault(); setActiveId('quickstart'); }} style={{cursor:'pointer', color:'#0284c7'}}>Docs</a>
          <span>›</span> {active?.title}
          <span className="docs-breadcrumb-ver">MIT</span>
        </div>
        <div className="docs-toolbar">
          <h1>{active?.title}</h1>
          <div className="docs-toolbar-actions">
            <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer" className="docs-gh-link">Edit on GitHub</a>
            <button className="docs-copy-page" onClick={()=>{ navigator.clipboard.writeText(window.location.href); setCopied('link'); setTimeout(()=>setCopied(null),1200); }}>{copied==='link' ? 'Copied!' : 'Copy link'}</button>
          </div>
        </div>
        <p className="docs-desc">{active?.desc} — <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer" style={{color:'#0284c7'}}>source</a> · <a href="/llms.txt" style={{color:'#0284c7'}}>llms.txt</a></p>
        <div className="docs-meta-bar">
          <span>Last updated Aug 28, 2026</span>
          <span>·</span>
          <a onClick={()=>{ navigator.clipboard.writeText(md); setCopied('md'); setTimeout(()=>setCopied(null),1200); }} style={{cursor:'pointer'}}>{copied==='md' ? 'Copied!' : 'Copy as Markdown'}</a>
          <span>·</span>
          <a href={active?.file==='README' ? 'https://github.com/zoop-internet/zoop#quick-start' : `/docs/${active?.file}.md`} target="_blank" rel="noreferrer">View as Markdown</a>
          <span>·</span>
          <a href="https://developers.cloudflare.com/agent-setup/" target="_blank" rel="noreferrer">Agent setup</a>
        </div>
        {loading && <div className="docs-loading"><span className="spinner" style={{width:16,height:16,display:'inline-block'}}/> Loading {active?.file}.md…</div>}
        {err && <div className="docs-error" role="alert">{err} — <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer">Open on GitHub</a></div>}
        {!loading && !err && (
          <div className="docs-prose-wrap">
            <article className="docs-article" dangerouslySetInnerHTML={{__html: mdToHtml(md)}} />
            <aside className="docs-toc" aria-label="On this page">
              <div className="docs-toc-title">On this page</div>
              {toc.length===0 ? <span style={{color:'#5a5a5c', fontSize:'0.75rem'}}>No headings</span> : toc.map(h=>(
                <a key={h.id} href={`#${h.id}`} className={`docs-toc-item lvl-${h.level}`} onClick={e=>{ e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({behavior:'smooth', block:'start'}); history.replaceState({},'', `#${h.id}`); }}>{h.title}</a>
              ))}
              <div className="docs-toc-foot">
                <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer">Edit this page</a>
                <span>·</span>
                <a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer">Ask AI</a>
              </div>
            </aside>
          </div>
        )}
        {!loading && !err && (
          <div className="docs-helpful">
            <span>Was this helpful?</span>
            <button className={copied==='yes' ? 'active' : ''} onClick={()=>{ setCopied('yes'); setTimeout(()=>setCopied(null),2000); }}>Yes</button>
            <button className={copied==='no' ? 'active' : ''} onClick={()=>{ setCopied('no'); setTimeout(()=>setCopied(null),4000); }}>No</button>
            {copied==='yes' && <span style={{color:'#0284c7'}}>Thanks!</span>}
            {copied==='no' && <span>Thanks — <a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer" style={{color:'#0284c7'}}>open issue</a></span>}
          </div>
        )}
        <div className="docs-footer-nav">
          <button className="lp-btn-secondary" onClick={()=>{ if(activeIdx>0) setActiveId(DOCS_FLAT[activeIdx-1].id); window.scrollTo(0,0);}} disabled={activeIdx===0}>← {activeIdx>0 ? DOCS_FLAT[activeIdx-1].title : 'Prev'}</button>
          <button className="lp-btn-primary" onClick={()=>{ if(activeIdx<DOCS_FLAT.length-1) setActiveId(DOCS_FLAT[activeIdx+1].id); window.scrollTo(0,0);}} disabled={activeIdx===DOCS_FLAT.length-1}>{activeIdx<DOCS_FLAT.length-1 ? DOCS_FLAT[activeIdx+1].title : 'Next'} →</button>
        </div>
      </section>
    </div>
  );
};

/* ─── Animated Counter Component ───────────────────────────────────────── */
function AnimatedCounter({ end, unit = '', decimals = 0 }: { end: number; unit?: string; decimals?: number }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(end);
      return;
    }
    let startTimestamp: number | null = null;
    const duration = 1400;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(ease * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setVal(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [started, end]);

  return (
    <span ref={ref}>
      {decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()}
      {unit}
    </span>
  );
}

/* ─── Prominent Bent-Arrow Network Illustration ─────────────────────────── */
const BentArrowMeshIllustration: React.FC = () => {
  return (
    <div className="lp-bent-mesh-wrap" aria-label="Direct Internet Sharing Between Devices">
      <div className="lp-mesh-ambient-glow" aria-hidden />

      <svg className="lp-bent-svg" viewBox="0 0 600 440" role="img" aria-labelledby="meshTitle meshDesc">
        <title id="meshTitle">Zoop direct mesh — four devices linked device-to-device</title>
        <desc id="meshDesc">Home broadband, laptop on the road, mobile phone and trusted peers connect directly via encrypted tunnels through Zoop hub; direct path about 12ms versus VPN-relayed about 80ms</desc>
        <defs>
          <linearGradient id="curveGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGradGreen" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="curveGradLime" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0.95" />
          </linearGradient>

          {/* Arrow markers */}
          <marker id="arrowCyan" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
          </marker>
          <marker id="arrowGreen" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#34d399" />
          </marker>
          <marker id="arrowLime" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#a3e635" />
          </marker>
        </defs>

        {/* Ambient faint guide rings */}
        <circle cx="300" cy="220" r="130" fill="none" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" strokeDasharray="4,6" />
        <circle cx="300" cy="220" r="210" fill="none" stroke="rgba(52, 211, 153, 0.08)" strokeWidth="1" strokeDasharray="4,8" />

        {/* 1. Curved Bent Arrow from Home Broadband (top-left) -> Laptop on the Road (top-right) */}
        <path
          d="M 218 45 C 280 8, 330 8, 382 45"
          stroke="url(#curveGradCyan)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowCyan)"
        />

        {/* 2. Curved Bent Arrow from Mobile Phone (bottom-left) -> Laptop on the Road (top-right) */}
        <path
          d="M 218 375 C 320 330, 390 190, 485 78"
          stroke="url(#curveGradGreen)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowGreen)"
        />

        {/* 3. Curved Bent Arrow from Home Broadband (top-left) -> Friends / Team Device (bottom-right) */}
        <path
          d="M 115 80 C 115 220, 240 375, 382 375"
          stroke="url(#curveGradLime)"
          className="lp-bent-arrow-path"
          markerEnd="url(#arrowLime)"
        />

        {/* 4. Direct Bridge Rays to Central Zoop Core */}
        <line x1="300" y1="220" x2="215" y2="75" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="300" y1="220" x2="385" y2="75" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="300" y1="220" x2="215" y2="365" stroke="rgba(52, 211, 153, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
        <line x1="300" y1="220" x2="385" y2="365" stroke="rgba(163, 230, 53, 0.25)" strokeWidth="1.5" strokeDasharray="3,4" />
      </svg>

      {/* Central Zoop Hub — decorative, SVG already describes mesh — performance: async decode */}
      <div className="lp-node-center-hub" title="Zoop Direct Bridge" aria-hidden="true">
        <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="" aria-hidden="true" width={44} height={44} decoding="async" loading="eager" />
      </div>

      {/* Node 1: Home Wi-Fi & Broadband */}
      <div className="lp-device-node lp-node-home">
        <div className="lp-node-icon-box"><Ico d={Icons.home} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Home Broadband</span>
          <span className="lp-node-subtitle">Shared safely to your devices</span>
        </div>
      </div>

      {/* Node 2: Laptop on the Road */}
      <div className="lp-device-node lp-node-laptop">
        <div className="lp-node-icon-box"><Ico d={Icons.laptop} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Laptop on the Road</span>
          <span className="lp-node-subtitle">Connected from cafes or hotels</span>
        </div>
      </div>

      {/* Node 3: Mobile Phone Hotspot */}
      <div className="lp-device-node lp-node-phone">
        <div className="lp-node-icon-box"><Ico d={Icons.smartphone} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Mobile Phone</span>
          <span className="lp-node-subtitle">Instant secure personal hotspot</span>
        </div>
      </div>

      {/* Node 4: Family or Team Member */}
      <div className="lp-device-node lp-node-team">
        <div className="lp-node-icon-box"><Ico d={Icons.users} size={20} /></div>
        <div className="lp-node-info">
          <span className="lp-node-title">Trusted Peers</span>
          <span className="lp-node-subtitle">Friends, family &amp; colleagues</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Downloads Matrix Data ────────────────────────────────────────────── */
interface DownloadItem {
  id: string;
  name: string;
  sub: string;
  icon: React.ReactNode;
  primaryAction: { label: string; file: string };
  secondaryActions?: { label: string; file: string }[];
  installCommand?: string;
}

const DOWNLOAD_DATA: DownloadItem[] = [
  {
    id: 'linux',
    name: 'Linux',
    sub: 'Lightweight background service for Ubuntu, Debian, Fedora & servers.',
    icon: <Ico d={Icons.server} size={22} />,
    primaryAction: { label: 'Download .deb', file: 'zoop_linux_amd64.deb' },
    secondaryActions: [
      { label: '.tar.gz binary', file: 'zoop_linux_amd64.tar.gz' },
      { label: 'ARM64 (.deb)', file: 'zoop_linux_arm64.deb' },
    ],
    installCommand: 'curl -fsSL https://get.zoop.dev | sh',
  },
  {
    id: 'macos',
    name: 'macOS',
    sub: 'One-click installer for Apple Silicon (M1/M2/M3/M4) & Intel Macs.',
    icon: <Ico d={Icons.apple} size={22} />,
    primaryAction: { label: 'Download Installer (.pkg)', file: 'Zoop-macOS-universal.pkg' },
    secondaryActions: [
      { label: 'Apple Silicon .dmg', file: 'Zoop-macOS-arm64.dmg' },
      { label: 'Intel .dmg', file: 'Zoop-macOS-x64.dmg' },
    ],
    installCommand: 'brew install zoop-internet/tap/zoop',
  },
  {
    id: 'windows',
    name: 'Windows',
    sub: 'Fast Windows installer with seamless background tray support.',
    icon: <Ico d={Icons.laptop} size={22} />,
    primaryAction: { label: 'Download Installer (.msi)', file: 'Zoop-Windows-x64-Setup.msi' },
    secondaryActions: [
      { label: 'Standalone .zip', file: 'zoop_windows_x64.zip' },
      { label: 'ARM64 Installer', file: 'Zoop-Windows-arm64.msi' },
    ],
    installCommand: 'winget install zoop-internet.zoop',
  },
  {
    id: 'mobile',
    name: 'Phones & Routers',
    sub: 'One-tap apps for Android phones, iPhones, and home Wi-Fi routers.',
    icon: <Ico d={Icons.smartphone} size={22} />,
    primaryAction: { label: 'Android App (APK)', file: 'zoop-android-release.apk' },
    secondaryActions: [
      { label: 'iOS App Store / TestFlight', file: 'https://testflight.apple.com/join/zoop' },
      { label: 'Home Router (.ipk)', file: 'zoop-router_mipsel.ipk' },
    ],
    installCommand: 'opkg install zoop-router',
  },
];

/* ─── Main Landing Page Component ──────────────────────────────────────── */
export const LandingPage: React.FC<{
  currentPath?: string;
  onNavigate: (path: string) => void;
  onLaunchConsole: (mode: PortalMode) => void;
}> = ({ currentPath = '/', onNavigate, onLaunchConsole }) => {
  const { user, isAuthenticated, logout } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadToast, setDownloadToast] = useState<{ platform: string; file: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle'|'loading'|'success'|'error'>( 'idle');
  const [waitlistMsg, setWaitlistMsg] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      const scrolledPct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      const dismissed = sessionStorage.getItem('zoop_sticky_dismissed') === '1';
      setShowStickyCta(!dismissed && scrolledPct > 0.6 && scrolledPct < 0.92);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Accessibility: focus trap + escape for mobile drawer + restore scroll lock
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [menuOpen]);

  const navTimersRef = React.useRef<number[]>([]);
  const handleNav = (path: string) => {
    if (currentPath === path) return;
    // Navigate immediately for optimal INP and perceived performance
    onNavigate(path);
    // Concurrent progress animation feedback
    navTimersRef.current.forEach(id => clearTimeout(id));
    navTimersRef.current = [];
    setLoadingVisible(true);
    setLoadingProgress(40);
    requestAnimationFrame(() => setLoadingProgress(100));
    const t1 = window.setTimeout(() => {
      setLoadingVisible(false);
      setLoadingProgress(0);
    }, 150);
    navTimersRef.current.push(t1);
  };
  useEffect(() => () => { navTimersRef.current.forEach(id => clearTimeout(id)); }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleDownloadClick = (platform: string, file: string) => {
    const base = (import.meta.env.VITE_RELEASES_BASE as string | undefined)?.replace(/\/$/, '');
    const isExternal = file.startsWith('http');
    if (isExternal) {
      window.open(file, '_blank', 'noopener');
      setDownloadToast({ platform, file: 'External link opened' });
    } else if (base) {
      const url = `${base}/${file}`;
      window.open(url, '_blank', 'noopener');
      setDownloadToast({ platform, file });
    } else {
      // Honest pending: releases not yet published — use install script + waitlist
      setDownloadToast({ platform, file: `${file} — early builds via install script; full releases opening soon` });
    }
    setTimeout(() => setDownloadToast(null), 5500);
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setWaitlistStatus('error'); setWaitlistMsg('Enter a valid email address'); return; }
    setWaitlistStatus('loading');
    setWaitlistMsg('');
    try {
      // Try real endpoint if configured, else simulate success and persist locally for demo
      const endpoint = (import.meta.env.VITE_WAITLIST_URL as string | undefined);
      if (endpoint) {
        const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, source:'pricing_teams', plan:'teams' }) });
        if (!res.ok) throw new Error('Waitlist unavailable');
      } else {
        await new Promise(r=>setTimeout(r, 700));
        const list = JSON.parse(localStorage.getItem('zoop_waitlist')||'[]');
        if(!list.includes(email)) { list.push(email); localStorage.setItem('zoop_waitlist', JSON.stringify(list)); }
      }
      setWaitlistStatus('success');
      setWaitlistMsg('You’re on the founding list — we’ll email you early access + lock $8/seat.');
      setWaitlistEmail('');
    } catch {
      setWaitlistStatus('error');
      setWaitlistMsg('Could not join right now. Please try again or email founders@zoop.network');
    }
  };

  const activeRoute = currentPath.toLowerCase();
  const isDocs = activeRoute === '/docs' || activeRoute.startsWith('/docs/') || activeRoute === '/documentation' || activeRoute.startsWith('/documentation/');

  return (
    <div className="landing-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* ─── YouTube/GitHub-style Top Progress Loading Bar ──────────── */}
      {loadingVisible && (
        <div
          className="lp-top-loading-bar"
          style={{
            width: `${loadingProgress}%`,
            opacity: loadingProgress === 100 ? 0.3 : 1,
          }}
        />
      )}

      {/* ─── Topbar — distinct on docs (solid, not glass) ─────────────────── */}
      <header className={`lp-topbar ${scrolled ? 'scrolled' : ''} ${isDocs ? 'docs-topbar' : ''}`} role="banner">
        <a href="/" className="lp-brand" onClick={(e) => { e.preventDefault(); handleNav('/'); }} aria-label="Zoop Internet — go to homepage">
          <div className="lp-brand-icon">
            <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="Zoop Internet" width={28} height={28} loading="eager" decoding="async" fetchPriority="high" />
          </div>
          <span className="lp-brand-text">Zoop</span>
          <span className="lp-brand-badge">Internet</span>
        </a>

        <nav className="lp-nav-pill" aria-label="Main Navigation">
          <a href="/" className={activeRoute === '/' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
            Overview
          </a>
          <a href="/how-it-works" className={activeRoute === '/how-it-works' || activeRoute === '/architecture' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>
            How It Works
          </a>
          <a href="/products" className={activeRoute === '/products' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>
            Products
          </a>
          <a href="/docs" className={activeRoute === '/docs' || activeRoute.startsWith('/docs/') || activeRoute === '/documentation' || activeRoute.startsWith('/documentation/') ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>
            Docs
          </a>
          <a href="/pricing" className={activeRoute === '/pricing' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/pricing'); }}>
            Pricing
          </a>
          <a href="/downloads" className={activeRoute === '/downloads' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
            Downloads
          </a>
          <a href="/security" className={activeRoute === '/security' ? 'active' : ''} onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>
            Security
          </a>
        </nav>

        <div className="lp-topbar-actions">
          {isAuthenticated ? (
            <div className="lp-user-badge-container">
              <button
                className="lp-user-badge-btn"
                onClick={() => onLaunchConsole('user')}
                title="Go to Console"
              >
                <div className="lp-user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'Z'}
                </div>
                <span className="lp-user-name">{user?.name || 'Account'}</span>
                <span className="lp-user-plan-badge">{user?.plan || 'Free'}</span>
              </button>
              <button className="lp-btn-secondary" onClick={() => onLaunchConsole('user')} title="Open Web Management Console">
                Console
              </button>
              <button className="lp-btn-ghost-logout" onClick={() => logout()} title="Sign Out">
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <a href="/auth?tab=signin" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signin'); }} title="Sign In">
                Sign In
              </a>
              <a href="/auth?tab=signup" className="lp-btn-primary" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>
                <Ico d={Icons.arrowRight} size={14} />
                Sign Up
              </a>
            </>
          )}
          <button className="lp-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="lp-mobile-drawer">
            <Ico d={menuOpen ? Icons.close : Icons.menu} size={20} />
          </button>
        </div>
      </header>

      {/* ─── Mobile Navigation Drawer ───────────────────────────────── */}
      {menuOpen && (
        <>
          <div className="lp-mobile-drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div id="lp-mobile-drawer" className="lp-mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <a href="/" onClick={(e) => { e.preventDefault(); handleNav('/'); setMenuOpen(false); }}>Overview</a>
            <a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); setMenuOpen(false); }}>How It Works</a>
            <a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); setMenuOpen(false); }}>Products</a>
            <a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); setMenuOpen(false); }}>Docs</a>
            <a href="/pricing" onClick={(e) => { e.preventDefault(); handleNav('/pricing'); setMenuOpen(false); }}>Pricing</a>
            <a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); setMenuOpen(false); }}>Downloads</a>
            <a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); setMenuOpen(false); }}>Security</a>
            <div className="lp-mobile-drawer-divider" />
            {isAuthenticated ? (
              <>
                <button className="primary" onClick={() => { onLaunchConsole('user'); setMenuOpen(false); }}>Open Console</button>
                <button onClick={() => { logout(); setMenuOpen(false); }}>Sign Out</button>
              </>
            ) : (
              <>
                <a href="/auth?tab=signin" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signin'); setMenuOpen(false); }}>Sign In</a>
                <a href="/auth?tab=signup" className="primary" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); setMenuOpen(false); }}>Create Account</a>
              </>
            )}
          </div>
        </>
      )}

      {/* ─── Animated Page Content Container ────────────────────────── */}
      <main id="main-content" className="lp-page-content-animated" key={activeRoute} tabIndex={-1}>
        {/* ─── DOCS — professional sidebar + rendered markdown from /docs/*.md ─ */}
        {(activeRoute === '/docs' || activeRoute.startsWith('/docs/') || activeRoute === '/documentation' || activeRoute.startsWith('/documentation/')) && (
          <DocsView key={activeRoute} initialId={(() => {
            const seg = activeRoute.replace(/^\/docs\/?/,'').replace(/^\/documentation\/?/,'').split('/')[0].split('?')[0].split('#')[0];
            return DOCS_FLAT.some(d=>d.id===seg) ? seg : (activeRoute.includes('quickstart') ? 'quickstart' : DOCS_FLAT[0].id);
          })()} onNavigateHome={() => handleNav('/')} />
        )}

        {/* ─── DEDICATED PRICING PAGE ───────────────────────────────── */}
        {activeRoute === '/pricing' && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">Simple &amp; Transparent</p>
              <h1>Free for personal. $8/seat for teams.</h1>
              <p>Self-host free forever. Founding teams lock $8/seat — no hidden fees, MIT licensed.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 860, margin:'0 auto' }}>
              <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius:14, padding:28, display:'flex', flexDirection:'column', gap:14 }}>
                <h2 style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#34d399', margin:0}}>Personal — Free Forever</h2>
                <div style={{ fontSize:'2rem', fontWeight:900, color:'var(--ink)'}}>$0 <span style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--muted)'}}>/ month</span></div>
                <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8, fontSize:'0.875rem', color:'var(--ink-secondary)'}}>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> Unlimited direct tunnels</li>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> Up to 5 devices</li>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> WireGuard® + STUN/TURN + roaming</li>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> Community support · self-host</li>
                </ul>
                <a href="/auth?tab=signup" className="lp-btn-primary" style={{ marginTop:8, width:'100%'}} onClick={(e)=>{ e.preventDefault(); handleNav('/auth?tab=signup'); }}>Create Zoop ID — Free <Ico d={Icons.arrowRight} size={14}/></a>
              </div>
              <div style={{ background:'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(52,211,153,0.06))', border:'1px solid rgba(8,242,255,0.28)', borderRadius:14, padding:28, display:'flex', flexDirection:'column', gap:14, position:'relative'}}>
                <span style={{ position:'absolute', top:12, right:12, fontSize:'0.65rem', fontWeight:800, padding:'3px 8px', borderRadius:999, background:'#38bdf8', color:'#020904'}}>Founding</span>
                <h2 style={{ fontSize:'0.75rem', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', color:'#38bdf8', margin:0}}>Organizations</h2>
                <div style={{ fontSize:'2rem', fontWeight:900, color:'var(--ink)'}}>$8 <span style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--muted)'}}>/ seat / mo</span></div>
                <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8, fontSize:'0.875rem', color:'var(--ink-secondary)'}}>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> Unlimited members + fleet</li>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> Roles, audit logs, IPAM &amp; relay controls</li>
                  <li style={{display:'flex', gap:8, alignItems:'center'}}><Ico d={Icons.check} size={14}/> Priority regions + SLA</li>
                </ul>
                <form onSubmit={handleWaitlist} style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }} aria-label="Join founding waitlist">
                  <label htmlFor="pricing-waitlist" style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--ink-secondary)'}}>Join founding waitlist — lock $8</label>
                  <div style={{ display:'flex', gap:8}}>
                    <input id="pricing-waitlist" type="email" placeholder="you@company.com" value={waitlistEmail} onChange={e=>{setWaitlistEmail(e.target.value); setWaitlistStatus('idle');}} required style={{ flex:1, padding:'9px 12px', borderRadius:8, border:`1px solid ${waitlistStatus==='error' ? 'rgba(248,113,113,0.5)' : 'var(--line)'}`, background:'rgba(0,0,0,0.35)', color:'var(--ink)', fontSize:'0.875rem'}}/>
                    <button type="submit" className="lp-btn-primary" disabled={waitlistStatus==='loading'}>{waitlistStatus==='loading' ? 'Joining…' : 'Join →'}</button>
                  </div>
                  {waitlistStatus!=='idle' && <span role={waitlistStatus==='error' ? 'alert' : 'status'} style={{ fontSize:'0.75rem', color: waitlistStatus==='success' ? '#34d399' : '#f87171'}}>{waitlistMsg}</span>}
                </form>
              </div>
            </div>
            <p style={{ textAlign:'center', marginTop:14, fontSize:'0.75rem', color:'var(--muted)'}}>All plans include end-to-end encryption, NAT traversal, MIT license. Questions? <a href="/security" onClick={(e)=>{ e.preventDefault(); handleNav('/security'); }} style={{ color:'#38bdf8', textDecoration:'underline', cursor:'pointer'}}>Security →</a></p>
            <div style={{ marginTop:64, textAlign:'center'}}><a href="/" className="lp-btn-secondary" onClick={(e)=>{ e.preventDefault(); handleNav('/'); }}>← Back to Overview</a></div>
          </div>
        )}

        {/* ─── DEDICATED DOWNLOADS PAGE ───────────────────────────────── */}
        {activeRoute === '/downloads' && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">Get Started in Seconds</p>
              <h1>Download Zoop for your devices.</h1>
              <p>
                Available for Linux, macOS, Windows, Android, iOS, and home Wi-Fi routers. Fast, lightweight, and completely free.
              </p>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>Choose Your Operating System</h2>

            <div className="lp-downloads-grid">
              {DOWNLOAD_DATA.map((item) => (
                <div key={item.id} className="lp-dl-card">
                  <div className="lp-dl-top">
                    <div className="lp-dl-icon">{item.icon}</div>
                    <span className="lp-brand-badge">Free</span>
                  </div>
                  <h3>{item.name}</h3>
                  <p className="lp-dl-sub">{item.sub}</p>

                  <div className="lp-dl-actions">
                    <button
                      className="lp-dl-btn primary-dl"
                      onClick={() => handleDownloadClick(item.name, item.primaryAction.file)}
                    >
                      <span>{item.primaryAction.label}</span>
                      <Ico d={Icons.download} size={14} />
                    </button>

                    {item.secondaryActions?.map((sec) => (
                      <button
                        key={sec.label}
                        className="lp-dl-btn"
                        onClick={() => handleDownloadClick(item.name, sec.file)}
                      >
                        <span>{sec.label}</span>
                        <Ico d={Icons.arrowRight} size={12} />
                      </button>
                    ))}
                  </div>

                  {item.installCommand && (
                    <div
                      className="lp-code-snippet"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      onClick={() => copyText(item.installCommand!, item.id)}
                      title="Click to copy install command"
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.installCommand}
                      </span>
                      <Ico d={copiedCmd === item.id ? Icons.check : Icons.copy} size={13} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, background:'var(--surface-card)', border:'1px solid var(--line)', borderRadius:12, padding:16, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:'0.8125rem', color:'var(--ink-secondary)'}}><strong style={{ color:'var(--ink)'}}>Verify downloads:</strong> All binaries are signed; checksums at <a href="https://github.com/zoop-internet/zoop/releases" target="_blank" rel="noreferrer" style={{ color:'#38bdf8', textDecoration:'underline'}}>GitHub Releases</a> · <code style={{ background:'rgba(0,0,0,0.35)', border:'1px solid var(--line)', padding:'1px 6px', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:'0.75rem'}}>sha256sum -c zoop*.sha256</code></div>
              <div style={{ fontSize:'0.72rem', color:'var(--muted)'}}>Need help? <a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer" style={{ color:'#38bdf8', textDecoration:'underline'}}>Open an issue →</a></div>
            </div>

            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
                ← Back to Overview
              </a>
            </div>
          </div>
        )}

        {/* ─── DEDICATED HOW IT WORKS PAGE ────────────────────────────── */}
        {(activeRoute === '/how-it-works' || activeRoute === '/architecture') && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">Simple &amp; Powerful</p>
              <h1>How Zoop connects you directly.</h1>
              <p>
                Traditional VPNs slow you down by routing all your personal traffic through centralized company servers.
                Zoop creates a direct, encrypted tunnel between your own devices.
              </p>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>Direct Mesh Architecture &amp; Tunneling</h2>

            <div className="lp-arch-showcase">
              <img
                src="/assets/zoop-mesh-architecture.webp"
                alt="Zoop peer-to-peer mesh architecture diagram showing encrypted tunnels between devices"
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="lp-arch-grid">
              <div className="lp-arch-card">
                <h3>1. Automatic Direct Pairing</h3>
                <p>
                  When you connect your laptop to your home computer or phone, Zoop links them directly across the internet.
                  Your data takes the fastest possible path without detours.
                </p>
              </div>

              <div className="lp-arch-card">
                <h3>2. 100% Private &amp; Encrypted</h3>
                <p>
                  Every piece of data is protected with bank-grade encryption before it ever leaves your device.
                  Nobody in the middle—not even your internet provider—can peek into your traffic.
                </p>
              </div>

              <div className="lp-arch-card">
                <h3>3. Seamless Roaming</h3>
                <p>
                  Walking out the door? Moving from home Wi-Fi to mobile 5G? Zoop keeps your downloads and calls connected
                  in the background with zero drops.
                </p>
              </div>

              <div className="lp-arch-card">
                <h3>4. Share Only What You Choose</h3>
                <p>
                  You are in complete control. Choose who can connect, share with family members with one tap, or turn off sharing
                  whenever you need.
                </p>
              </div>
            </div>

            <div style={{ marginTop: 64, textAlign: 'center' }}>
              <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
                ← Back to Overview
              </a>
            </div>
          </div>
        )}

        {/* ─── DEDICATED PRODUCTS PAGE ────────────────────────────────── */}
        {activeRoute === '/products' && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">One Ecosystem</p>
              <h1>Built for every device in your life.</h1>
              <p>Run Zoop quietly in the background on your computers, control it from your phone, or manage it via the web.</p>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 24px', textAlign: 'center', color: 'var(--ink)' }}>Application Suite</h2>

            <div className="lp-products-grid">
              <div className="lp-product-card">
                <span className="lp-product-badge">Desktop &amp; Server</span>
                <h3>Zoop for PC &amp; Mac</h3>
                <p>
                  Runs quietly in your system tray. Turn any computer into a high-speed internet provider for your other devices
                  with zero configuration needed.
                </p>
                <ul className="lp-product-features">
                  <li><Ico d={Icons.check} size={14} /> One-click connect &amp; share</li>
                  <li><Ico d={Icons.check} size={14} /> Ultra-low battery and CPU usage</li>
                  <li><Ico d={Icons.check} size={14} /> Instant status in your system menu</li>
                </ul>
              </div>

              <div className="lp-product-card">
                <span className="lp-product-badge">Mobile App</span>
                <h3>Zoop Mobile</h3>
                <p>
                  Stay connected to your home network from anywhere in the world. Enjoy safe browsing on public Wi-Fi
                  hotspots in hotels and airports.
                </p>
                <ul className="lp-product-features">
                  <li><Ico d={Icons.check} size={14} /> One-tap connection toggle</li>
                  <li><Ico d={Icons.check} size={14} /> Instant notification of peer requests</li>
                  <li><Ico d={Icons.check} size={14} /> Safe public Wi-Fi shield</li>
                </ul>
              </div>

              <div className="lp-product-card">
                <span className="lp-product-badge">Web Console</span>
                <h3>Zoop Web Console</h3>
                <p>
                  Manage all your devices from any browser. Authorize family members, review active sessions, and check
                  network speed in real time.
                </p>
                <ul className="lp-product-features">
                  <li><Ico d={Icons.check} size={14} /> Clean, simple visual dashboard</li>
                  <li><Ico d={Icons.check} size={14} /> One-click sharing approvals</li>
                  <li><Ico d={Icons.check} size={14} /> Full control of your network</li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: 64, textAlign: 'center' }}>
              <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
                ← Back to Overview
              </a>
            </div>
          </div>
        )}

        {/* ─── DEDICATED SECURITY PAGE ────────────────────────────────── */}
        {activeRoute === '/security' && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">Privacy First</p>
              <h1>Your internet. Truly private to you.</h1>
              <h2>Security Principles &amp; Protections</h2>
              <p>We built Zoop with a simple promise: we never store, inspect, or sell your private browsing traffic.</p>
            </div>

            <div className="lp-security-grid">
              <div className="lp-sec-card">
                <div className="lp-sec-icon"><Ico d={Icons.shield} size={20} /></div>
                <h3>Direct Device-to-Device</h3>
                <p>Your data flows straight between your devices. It does not pass through intermediate company servers — relays only forward opaque encrypted frames when direct hole-punch fails.</p>
              </div>

              <div className="lp-sec-card">
                <div className="lp-sec-icon"><Ico d={Icons.zap} size={20} /></div>
                <h3>WireGuard® Encryption</h3>
                <p><abbr title="WireGuard — Noise_IK handshake, ChaCha20-Poly1305, Curve25519, BLAKE2s">WireGuard®</abbr> with ChaCha20-Poly1305 & Curve25519. Forward-secrecy via Noise_IK; each tunnel uses ephemeral keys.</p>
              </div>

              <div className="lp-sec-card">
                <div className="lp-sec-icon"><Ico d={Icons.server} size={20} /></div>
                <h3>Zero Activity Tracking</h3>
                <p>No tracking logs, no history records, no ads. Control plane stores only signaling metadata & IPAM; payload is opaque to relays.</p>
              </div>

              <div className="lp-sec-card">
                <div className="lp-sec-icon"><Ico d={Icons.terminal} size={20} /></div>
                <h3>Open Source &amp; Audited</h3>
                <p>MIT-licensed, built in the open. Ed25519 identities signed with canonical `zoop-auth-v2` payload + replay nonces (bounded cache) & 5-min TTL.</p>
              </div>
            </div>

            <div style={{ marginTop: 32, background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>How we encrypt — in 80 words</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--muted)', margin: 0 }}>
                Zoop uses <abbr title="WireGuard — modern VPN protocol"><strong>WireGuard</strong></abbr> (Noise_IK, ChaCha20-Poly1305, Curve25519) for the data plane and <strong>Ed25519</strong> for control-plane auth. Devices derive a deterministic Endpoint ID from their public key (UUIDv5). Signaling uses `zoop-auth-v2|METHOD|PATH|TIMESTAMP|NONCE|BODY_HASH` with bounded 100k nonce cache and strict 0600 key storage (PBKDF2-AES-GCM optional via <code>ZOOP_IDENTITY_PASSPHRASE</code>). Relays are zero-decryption — DERP-style `ws://` forwarding of `[senderID][payload]` only. IPAM from <code>100.64.0.0/10</code> per-RFC6598 assigns /30 pairs (1,048,576 capacity) atomically via Postgres.
              </p>
              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span className="lp-trust-badge">WireGuard® · ChaCha20</span>
                <span className="lp-trust-badge">Ed25519 · Nonce + TTL</span>
                <span className="lp-trust-badge">0600 · PBKDF2 · AES-GCM</span>
                <span className="lp-trust-badge">100.64.0.0/10 · /30</span>
              </div>
            </div>

            <div style={{ marginTop: 64, textAlign: 'center' }}>
              <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
                ← Back to Overview
              </a>
            </div>
          </div>
        )}

        {/* ─── DEDICATED PRIVACY POLICY PAGE (APP STORE & GOOGLE PLAY COMPLIANT) ─ */}
        {(activeRoute === '/privacy' || activeRoute === '/privacy-policy') && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">Zero-Knowledge Network</p>
              <h1>Privacy Policy</h1>
              <p>
                Effective Date: September 7, 2026 · Official Domain: <a href="https://zoopinternet.app" style={{ color: '#38bdf8', textDecoration: 'underline' }}>zoopinternet.app</a>
              </p>
            </div>

            {/* Apple & Google Play Store Compliance Callout Banner */}
            <div style={{ maxWidth: 860, margin: '0 auto 28px', background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(52,211,153,0.08))', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#38bdf8' }}><Ico d={Icons.shield} size={22} /></span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>Core Privacy Commitment (Apple &amp; Google Play Store Disclosure)</strong>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--ink-secondary)', margin: '0 0 12px' }}>
                Zoop Internet is engineered with a strict <strong>Zero-Knowledge, Zero-Inspection architecture</strong>. 
                Unlike conventional commercial VPN providers that route all user traffic through centralized corporate datacenters:
              </p>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--ink-secondary)' }}>
                <li><strong>Zero Payload Logging:</strong> We do NOT monitor, inspect, store, or log your network traffic, browsing history, DNS queries, or destination IP addresses.</li>
                <li><strong>Zero Data Monetization:</strong> We do NOT sell, rent, or share personal data with advertisers or third parties.</li>
                <li><strong>End-to-End Cryptography:</strong> All peer connections use WireGuard® authenticated encryption (Noise_IK, ChaCha20-Poly1305, Curve25519). Relays only forward opaque encrypted binary frames without decryption keys.</li>
              </ul>
            </div>

            {/* Structured Legal Document Content */}
            <div className="docs-article" style={{ maxWidth: 860, margin: '0 auto', background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 40px' }}>
              <h2>1. Introduction &amp; Architecture Overview</h2>
              <p>
                Zoop Internet ("Zoop", "we", "us", or "our") provides an open-source, decentralized device-to-device mesh connectivity platform. 
                Our software decouples the <strong>Control Plane</strong> (cryptographic identity verification, STUN signaling, IPAM) from the <strong>Data Plane</strong> (point-to-point encrypted tunnels).
              </p>
              <p>
                When you connect to another device via Zoop, your traffic travels directly between those endpoints. In circumstances where symmetric NAT or firewall restrictions prevent direct UDP hole punching, packets transit encrypted WebSocket relays that forward opaque binary frames without the ability to decrypt or inspect the contents.
              </p>

              <h2>2. Information We Explicitly Do NOT Collect</h2>
              <p>
                In compliance with Apple App Store Guideline 5.4 and Google Play VPN Service requirements, Zoop explicitly affirms that we never collect, log, or retain:
              </p>
              <ul>
                <li><strong>Traffic Payloads:</strong> Content of your HTTP/HTTPS requests, media streaming, files, or application traffic.</li>
                <li><strong>Browsing Activity:</strong> URLs visited, search queries, or visited domains.</li>
                <li><strong>DNS Queries:</strong> Real-time domain resolution lookups.</li>
                <li><strong>Destination IP Addresses:</strong> External web services or servers accessed through a Provider peer.</li>
                <li><strong>Device Advertising Identifiers:</strong> No IDFA, AAID, or tracking beacons exist in the software.</li>
              </ul>

              <h2>3. Information We Process (Data Minimization)</h2>
              <p>
                To provide coordination and mutual device authentication, Zoop processes only minimal technical data:
              </p>
              <ul>
                <li><strong>Cryptographic Identities:</strong> Ed25519 public keys used to authenticate API requests, and Curve25519 public keys used for WireGuard peer handshakes. <em>Private keys never leave your local device.</em></li>
                <li><strong>Pseudonymous Account Identifier:</strong> A formatted Zoop ID (e.g. <code>ZP-...</code>) derived deterministically from your public identity.</li>
                <li><strong>Ephemeral Signaling Metadata:</strong> Reflexive IP addresses and port candidates discovered via STUN (e.g., <code>stun.l.google.com:19302</code>) to facilitate NAT traversal. This data exists solely in volatile memory during negotiation.</li>
                <li><strong>Device Labels:</strong> User-provided device names (e.g., "Home PC", "Travel Laptop") to display in your personal device console.</li>
              </ul>

              <h2>4. Encrypted Relay Node Fallback</h2>
              <p>
                If direct peer-to-peer connection is prohibited by restrictive firewalls or Carrier-Grade NAT (CGNAT), traffic fails over to a relay node. Relays operate on an encrypted binary pass-through model (similar to WireGuard DERP). The relay operator has no knowledge of encryption keys and cannot inspect, modify, or log payload data.
              </p>

              <h2>5. Mobile Platform Disclosures (iOS &amp; Android)</h2>
              <p>
                <strong>iOS NetworkExtension:</strong> The Zoop iOS app uses Apple's <code>NEPacketTunnelProvider</code> to interface with the local user-space WireGuard networking core. Network permissions are used exclusively to create virtual tunnel routing.
              </p>
              <p>
                <strong>Android VpnService:</strong> The Zoop Android app utilizes <code>VpnService</code> to construct a local TUN adapter. A persistent Android system notification is shown whenever a tunnel is active to maintain clear user awareness.
              </p>

              <h2>6. Data Retention &amp; User Deletion Rights (GDPR &amp; CCPA)</h2>
              <p>
                Signaling messages and STUN candidates are discarded immediately after connection negotiation. Account and device public keys are retained only while your account is active.
              </p>
              <p>
                Under GDPR and CCPA, you have the right to inspect, export, or permanently erase your data. Deleting a device or account via the Web Console or CLI instantly deletes all associated public keys and IPAM allocations from our database.
              </p>

              <h2>7. Security Safeguards &amp; Open Source</h2>
              <p>
                Zoop Internet is fully open-source and MIT-licensed. All source code, cryptographic implementations, and infrastructure recipes are publicly auditable at <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">github.com/zoop-internet/zoop</a>.
              </p>

              <h2>8. Contact &amp; Inquiries</h2>
              <p>
                For privacy inquiries, audit requests, or data rights requests, contact our team:
              </p>
              <ul>
                <li><strong>Email:</strong> <a href="mailto:support@zoopinternet.app">support@zoopinternet.app</a></li>
                <li><strong>Security:</strong> <a href="mailto:security@zoopinternet.app">security@zoopinternet.app</a></li>
                <li><strong>Official Web:</strong> <a href="https://zoopinternet.app" target="_blank" rel="noreferrer">https://zoopinternet.app</a></li>
              </ul>
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 14 }}>
              <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
                ← Back to Overview
              </a>
              <a href="/terms" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>
                View Terms of Service (EULA) →
              </a>
            </div>
          </div>
        )}

        {/* ─── DEDICATED TERMS OF SERVICE & EULA PAGE ───────────────────── */}
        {(activeRoute === '/terms' || activeRoute === '/terms-of-service' || activeRoute === '/eula') && (
          <div className="lp-page-wrapper">
            <div className="lp-page-header">
              <p className="lp-eyebrow">Legal &amp; Licensing</p>
              <h1>Terms of Service &amp; EULA</h1>
              <p>
                Effective Date: September 7, 2026 · Official Domain: <a href="https://zoopinternet.app" style={{ color: '#38bdf8', textDecoration: 'underline' }}>zoopinternet.app</a>
              </p>
            </div>

            {/* Architecture & Shared Responsibility Summary Banner */}
            <div style={{ maxWidth: 860, margin: '0 auto 28px', background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#34d399' }}><Ico d={Icons.terminal} size={22} /></span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>Peer-to-Peer Mesh &amp; Open-Source License Notice</strong>
              </div>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--ink-secondary)', margin: 0 }}>
                Zoop Internet combines an open-source software suite (MIT License) with cloud coordination services. 
                By accessing our software or hosted services, you acknowledge the decentralized peer-to-peer nature of the platform and agree to these terms governing device authorization, acceptable network use, and provider liability.
              </p>
            </div>

            {/* Structured Terms Content */}
            <div className="docs-article" style={{ maxWidth: 860, margin: '0 auto', background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 16, padding: '36px 40px' }}>
              <h2>1. Agreement to Terms</h2>
              <p>
                By downloading, installing, configuring, or using the Zoop Internet applications (desktop daemons, CLI, mobile apps on Android and iOS, or the Web Management Console), you agree to be bound by these Terms of Service and End User License Agreement ("Agreement") and our <a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }} style={{ color: '#38bdf8', cursor: 'pointer' }}>Privacy Policy</a>.
              </p>

              <h2>2. Decentralized Peer-to-Peer Architecture</h2>
              <p>
                Zoop is a direct device-to-device mesh connectivity system. The <strong>Control Plane</strong> coordinates device discovery and signaling. The <strong>Data Plane</strong> operates over end-to-end WireGuard® tunnels established directly between peer devices.
              </p>
              <p>
                Zoop is <strong>not</strong> a traditional centralized VPN service; we do not route or proxy internet traffic through our own transit servers. When you connect through another device, that device acts as your exit gateway.
              </p>

              <h2>3. End User License Agreement (EULA)</h2>
              <p>
                <strong>Open Source Code:</strong> The underlying source code of Zoop is made available under the permissive <strong>MIT License</strong>. You are free to inspect, audit, modify, and self-host the software.
              </p>
              <p>
                <strong>Application Distribution:</strong> Zoop grants you a personal, non-exclusive, revocable license to install and use official binary packages and mobile applications distributed through official app store channels or signed GitHub releases.
              </p>

              <h2>4. Cryptographic Key Custody &amp; Security</h2>
              <p>
                You are solely responsible for maintaining the confidentiality and physical security of your devices and cryptographic private keys (Ed25519 identity keys and WireGuard Curve25519 keys). 
                Because private keys are generated and stored exclusively on your device, Zoop cannot recover lost identity keys or reset lost encryption phrases.
              </p>

              <h2>5. Provider vs. Recipient Responsibilities</h2>
              <blockquote>
                <strong>Important Egress Notice for Bandwidth Providers:</strong> When you share your connection, authorized peers will egress to the internet using your device's external public IP address. You retain complete control to approve, decline, or disconnect peers at any time. Do not authorize peers you do not know and trust.
              </blockquote>
              <p>
                Zoop Internet disclaims all liability for internet activity, downloads, or communications initiated by authorized third-party peers through your Provider device.
              </p>

              <h2>6. Acceptable Use Policy (AUP)</h2>
              <p>
                You agree not to use Zoop Internet to:
              </p>
              <ul>
                <li>Engage in or facilitate unlawful activities, including copyright infringement, distribution of malware, ransomware, or malicious bots.</li>
                <li>Execute Denial of Service (DoS/DDoS) attacks, network port scanning, or unauthorized penetration testing against third-party systems.</li>
                <li>Bypass network access controls or organizational security policies without explicit authorization from the network owner.</li>
                <li>Harass, exploit, or cause harm to individuals or systems.</li>
              </ul>
              <p>
                Violation of this Acceptable Use Policy will result in immediate revocation of your access to the hosted coordination plane.
              </p>

              <h2>7. ISP &amp; Carrier Terms Compliance</h2>
              <p>
                You are solely responsible for ensuring your use of Zoop complies with your Internet Service Provider (ISP) or mobile carrier's contract, data limits, and tethering policies. Zoop is not responsible for carrier overage fees, bandwidth throttling, or service termination resulting from your network usage.
              </p>

              <h2>8. Disclaimer of Warranties</h2>
              <p>
                THE SOFTWARE AND COORDINATION SERVICES ARE PROVIDED <strong>"AS IS"</strong> AND <strong>"AS AVAILABLE"</strong>, WITHOUT WARRANTIES OF ANY KIND. ZOOP INTERNET DOES NOT GUARANTEE THAT NAT TRAVERSAL OR HOLE PUNCHING WILL SUCCEED IN ALL NETWORK TOPOLOGIES, OR THAT SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                TO THE FULLEST EXTENT PERMISSIBLE BY APPLICABLE LAW, IN NO EVENT SHALL ZOOP INTERNET, ITS FOUNDERS, CONTRIBUTORS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SOFTWARE, DATA OVERAGES, OR ACTIONS OF AUTHORIZED PEERS.
              </p>

              <h2>10. Contact &amp; Legal Notices</h2>
              <p>
                For questions regarding these Terms or legal inquiries:
              </p>
              <ul>
                <li><strong>Legal Notices:</strong> <a href="mailto:legal@zoopinternet.app">legal@zoopinternet.app</a></li>
                <li><strong>General Support:</strong> <a href="mailto:support@zoopinternet.app">support@zoopinternet.app</a></li>
                <li><strong>Website:</strong> <a href="https://zoopinternet.app" target="_blank" rel="noreferrer">https://zoopinternet.app</a></li>
              </ul>
            </div>

            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 14 }}>
              <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
                ← Back to Overview
              </a>
              <a href="/privacy" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>
                View Privacy Policy →
              </a>
            </div>
          </div>
        )}

        {/* ─── DEFAULT OVERVIEW / HOME PAGE ───────────────────────────── */}
        {activeRoute === '/' && (
          <>
            {/* Hero Section — 5s value prop */}
            <section className="lp-hero">
              <div className="lp-hero-inner">
                <div className="lp-hero-grid">
                  <div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:999, background:'rgba(8,242,255,0.10)', border:'1px solid rgba(8,242,255,0.28)', fontSize:'0.72rem', fontWeight:700, color:'#38bdf8', marginBottom:16 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'#34d399', boxShadow:'0 0 8px #34d399'}} aria-hidden /> Open Source · No tracking · Direct mesh
                    </div>
                    <h1>
                      Share your home or phone
                      <br />
                      <span className="lp-grad-text">internet — directly.</span>
                    </h1>
                    <p className="lp-hero-desc" style={{ maxWidth: 520 }}>
                      Lend your home broadband or phone data to your laptop, family or team — <strong style={{color:'var(--ink)'}}>device-to-device, no VPN servers in the middle</strong>. Private, faster (<span style={{ color:'#34d399', fontWeight:800 }}>&lt;1ms</span> direct), and works even behind strict home or mobile carrier firewalls (<abbr title="Carrier-Grade NAT — your ISP shares one public IP with many homes" style={{ textDecoration:'underline dotted', cursor:'help' }}>CGNAT</abbr>). <strong style={{color:'var(--ink)'}}>30-sec setup.</strong>
                    </p>
                    <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:6, lineHeight:1.5, maxWidth: 520 }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><Ico d={Icons.check} size={10}/> Private to you</span> · <abbr title="WireGuard — modern VPN cryptography, Noise_IK + ChaCha20-Poly1305" style={{ textDecoration:'underline dotted', cursor:'help' }}>WireGuard®</abbr> encrypted · End-to-end · Revoke anytime · <a href="/how-it-works" onClick={(e)=>{ e.preventDefault(); handleNav('/how-it-works'); }} style={{ color:'#38bdf8', textDecoration:'underline', cursor:'pointer' }}>How sharing works →</a>
                    </p>
                    <div className="lp-hero-actions">
                      {isAuthenticated ? (
                        <>
                          <a href="/app" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>
                            Open Web Console
                            <Ico d={Icons.arrowRight} size={16} />
                          </a>
                          <a href="/downloads" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
                            <Ico d={Icons.download} size={18} />
                            Download Apps
                          </a>
                        </>
                      ) : (
                        <>
                          <a href="/auth?tab=signup" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }} aria-label="Get Zoop Free — create Zoop ID">
                            Get Zoop Free
                            <Ico d={Icons.arrowRight} size={16} />
                          </a>
                          <a href="/how-it-works" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }} aria-label="See how Zoop works in 30 seconds">
                            See how it works (30s)
                          </a>
                        </>
                      )}
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14, alignItems:'center' }} aria-label="Trust proof">
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.72rem', fontWeight:600, color:'var(--muted)'}}><Ico d={Icons.check} size={12}/> 5 devices free</span>
                      <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--line)'}} aria-hidden />
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.72rem', fontWeight:600, color:'var(--muted)'}}><Ico d={Icons.shield} size={12}/> End-to-end encrypted</span>
                      <span style={{ width:3, height:3, borderRadius:'50%', background:'var(--line)'}} aria-hidden />
                      <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.72rem', fontWeight:600, color:'var(--muted)'}}><Ico d={Icons.globe} size={12}/> Works behind CGNAT</span>
                    </div>
                    <div style={{ marginTop:10, fontSize:'0.72rem', color:'var(--muted)'}}>
                      <code style={{ background:'rgba(255,255,255,0.06)', border:'1px solid var(--line)', padding:'2px 6px', borderRadius:6, fontFamily:'var(--font-mono)', color:'var(--cyan)'}}>curl -fsSL https://get.zoop.dev | sh</code> <span style={{ marginLeft:6 }}>or</span> <a href="/downloads" onClick={(e)=>{ e.preventDefault(); handleNav('/downloads'); }} style={{ color:'#38bdf8', textDecoration:'underline', cursor:'pointer'}}>download matrix →</a>
                    </div>
                    {/* Journey stepper — reduces cognitive load, guides 3 steps */}
                    <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }} aria-label="3-step journey">
                      {[
                        { n:'1', t:'Create Zoop ID', d:'ZP-… + PIN' },
                        { n:'2', t:'Authorize', d:'Sharing → recipient' },
                        { n:'3', t:'Connect', d:'Direct tunnel' },
                      ].map(s=>(
                        <span key={s.n} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:'0.70rem', background:'rgba(255,255,255,0.03)', border:'1px solid var(--line)', padding:'5px 9px', borderRadius:999, color:'var(--text-secondary)' }}>
                          <span style={{ width:18, height:18, borderRadius:'50%', background:'rgba(56,189,248,0.12)', color:'#38bdf8', display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'0.65rem' }}>{s.n}</span>
                          <strong style={{ color:'var(--ink)' }}>{s.t}</strong> <span style={{ color:'var(--muted)' }}>· {s.d}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <BentArrowMeshIllustration />
                  </div>
                </div>
              </div>
            </section>

            {/* Metric Strip */}
            <section className="lp-metric-strip" aria-label="System Highlights">
              <div className="lp-metric-item in-view">
                <span className="lp-metric-label">Direct Connection Speed</span>
                <span className="lp-metric-val">
                  <AnimatedCounter end={99.4} unit="%" decimals={1} />
                </span>
                <span className="lp-metric-sub">
                  <Ico d={Icons.check} size={12} /> Direct Device-to-Device Speed
                </span>
              </div>

              <div className="lp-metric-item in-view">
                <span className="lp-metric-label">Connection Lag</span>
                <span className="lp-metric-val">
                  &lt; <AnimatedCounter end={1} unit=" ms" />
                </span>
                <span className="lp-metric-sub">Ultra-low latency transfer</span>
              </div>

              <div className="lp-metric-item in-view">
                <span className="lp-metric-label">Privacy &amp; Security</span>
                <span className="lp-metric-val">100%</span>
                <span className="lp-metric-sub">End-to-End Encrypted</span>
              </div>

              <div className="lp-metric-item in-view">
                <span className="lp-metric-label">Connection Drop Rate</span>
                <span className="lp-metric-val">
                  <AnimatedCounter end={0.0} unit="%" decimals={1} />
                </span>
                <span className="lp-metric-sub">Seamless Wi-Fi &amp; 5G roaming</span>
              </div>
            </section>

            {/* How It Works Section */}
            <section className="lp-section">
              <div className="lp-section-heading centered">
                <p className="lp-eyebrow">Up in 3 Taps — No Servers, No Config</p>
                <h2>No complicated setup. Just install and connect.</h2>
                <p className="lp-subtext">Zoop handles NAT traversal and encryption automatically. You handle one tap.</p>
              </div>

              <div className="lp-steps-grid">
                <div className="lp-step-card">
                  <div className="lp-step-header">
                    <div className="lp-step-icon-box"><Ico d={Icons.download} size={22} /></div>
                    <span className="lp-step-num">01</span>
                  </div>
                  <h3>1. Install on Your Devices</h3>
                  <p>Lightweight daemon on laptop/home PC, one-tap app on phones, .ipk on OpenWrt. Runs quietly — ~12MB RAM.</p>
                </div>

                <div className="lp-step-card">
                  <div className="lp-step-header">
                    <div className="lp-step-icon-box"><Ico d={Icons.zap} size={22} /></div>
                    <span className="lp-step-num">02</span>
                  </div>
                  <h3>2. Connect in One Tap</h3>
                  <p>Authorize trusted peers (family/team/your other devices). Direct WireGuard tunnel forms via STUN hole-punch; relay only if NAT forbids.</p>
                </div>

                <div className="lp-step-card">
                  <div className="lp-step-header">
                    <div className="lp-step-icon-box"><Ico d={Icons.shield} size={22} /></div>
                    <span className="lp-step-num">03</span>
                  </div>
                  <h3>3. Stay Connected, Anywhere</h3>
                  <p>Roam Wi-Fi ↔ 5G without drops (Netlink detection). Browse/stream with &lt;1ms added latency, end-to-end encrypted.</p>
                </div>
              </div>
            </section>

            {/* Comparison table — why not VPN */}
            <section className="lp-section" aria-labelledby="compare-heading" style={{ paddingTop: 0 }}>
              <div className="lp-section-heading centered">
                <p className="lp-eyebrow">Why Zoop, not a VPN</p>
                <h2 id="compare-heading">Direct beats detoured.</h2>
                <p className="lp-subtext">Same encryption. Shorter path. You own the route.</p>
              </div>
              <div className="lp-compare-wrap">
                <div className="lp-compare-table">
                  <div style={{ padding:'14px 16px', fontWeight:800, color:'var(--ink)', background:'rgba(255,255,255,0.03)', borderBottom:'1px solid var(--line)' }}>Feature</div>
                  <div style={{ padding:'14px 16px', fontWeight:800, color:'#38bdf8', background:'rgba(8,242,255,0.08)', borderBottom:'1px solid var(--line)', textAlign:'center' }}>Zoop</div>
                  <div style={{ padding:'14px 16px', fontWeight:700, color:'var(--muted)', borderBottom:'1px solid var(--line)', textAlign:'center' }}>Traditional VPN</div>
                  <div style={{ padding:'14px 16px', fontWeight:700, color:'var(--muted)', borderBottom:'1px solid var(--line)', textAlign:'center' }}>Tailscale / Mesh VPN</div>
                  {[
                    ['How your data travels', 'Direct device-to-device (your devices only)', 'Via company servers', 'Via coordination server + DERP relay'],
                    ['Added lag', '~ <1ms direct / relay only if NAT blocks', '+30–120ms via provider', '+10–40ms (often relayed)'],
                    ['Who can read your traffic?', 'No one but your devices (zero-knowledge relay)', 'Provider can (exit node)', 'No one (WireGuard)'],
                    ['Works behind home & mobile firewall?', 'Yes — STUN discovery + TURN relay + roaming', 'Needs open port/forward', 'STUN + DERP'],
                    ['Price', 'Free personal, $8/mo teams', '$5–12/mo per user', 'Free up to 3 users, then $6+'],
                    ['Open source?', 'MIT, self-hostable + auditable', 'Usually closed', 'Partial / source-available'],
                  ].map(([feat, zoop, vpn, tailscale]) => (
                    <>
                      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', color:'var(--ink-secondary)', fontWeight:600 } }>{feat}</div>
                      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', textAlign:'center', background:'rgba(8,242,255,0.05)', color:'var(--ink)', fontWeight:700 } }>{zoop}</div>
                      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', textAlign:'center', color:'var(--muted)' } }>{vpn}</div>
                      <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', textAlign:'center', color:'var(--muted)' } }>{tailscale}</div>
                    </>
                  ))}
                </div>
                <div style={{ padding:'12px 16px', fontSize:'0.72rem', color:'var(--muted)', background:'rgba(255,255,255,0.02)', textAlign:'center' }}>Measurements illustrative; direct path depends on NAT/firewall. Zoop relay fallback is WebSocket, still end-to-end encrypted.</div>
              </div>
            </section>

            {/* Pricing — with real waitlist */}
            <section className="lp-section" aria-labelledby="pricing-heading">
              <div className="lp-section-heading centered">
                <p className="lp-eyebrow">Simple & Transparent</p>
                <h2 id="pricing-heading">Free to start. Built to scale.</h2>
                <p className="lp-subtext">Self-host free forever. Teams lock founding price.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 860, margin: '0 auto' }}>
                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399' }}>Personal — Free Forever</span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>$0 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ month</span></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited direct tunnels</li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Up to 5 devices</li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> WireGuard® + STUN/TURN + roaming</li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Community support + self-host</li>
                  </ul>
                  <a href="/auth?tab=signup" className="lp-btn-primary" style={{ marginTop: 8, width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>Create Zoop ID — Free <Ico d={Icons.arrowRight} size={14} /></a>
                  <span style={{ fontSize:'0.7rem', color:'var(--muted)', textAlign:'center' }}>No credit card · Zoop ID is ZP-XXXXXX + 6-digit PIN</span>
                </div>
                <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(52,211,153,0.06))', border: '1px solid rgba(8,242,255,0.28)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}>
                  <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: '#38bdf8', color: '#020904' }}>Founding price</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#38bdf8' }}>Organizations</span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--ink)' }}>$8 <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>/ seat / mo</span></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Everything in Personal</li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Unlimited org members + fleet</li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Audit logs, roles, IPAM & relay controls</li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Ico d={Icons.check} size={14} /> Priority relay regions + SLA</li>
                  </ul>
                  <form onSubmit={handleWaitlist} style={{ marginTop: 8, display:'flex', flexDirection:'column', gap:8 }} aria-label="Join founding waitlist">
                    <label htmlFor="waitlist-email" style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--ink-secondary)'}}>Join founding waitlist — lock $8/seat</label>
                    <div style={{ display:'flex', gap:8 }}>
                      <input id="waitlist-email" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={waitlistEmail} onChange={e=>{setWaitlistEmail(e.target.value); setWaitlistStatus('idle');}} required aria-label="Email for waitlist" style={{ flex:1, padding:'9px 12px', borderRadius:8, border: `1px solid ${waitlistStatus==='error' ? 'rgba(248,113,113,0.5)' : 'var(--line)'}`, background:'rgba(0,0,0,0.35)', color:'var(--ink)', fontSize:'0.875rem', outline:'none' }} />
                      <button type="submit" className="lp-btn-primary" style={{ whiteSpace:'nowrap', minHeight:38, padding:'0 16px' }} disabled={waitlistStatus==='loading'}>{waitlistStatus==='loading' ? 'Joining…' : 'Join →'}</button>
                    </div>
                    {waitlistStatus!=='idle' && (
                      <span role={waitlistStatus==='error' ? 'alert' : 'status'} aria-live="polite" style={{ fontSize:'0.75rem', color: waitlistStatus==='success' ? '#34d399' : waitlistStatus==='error' ? '#f87171' : 'var(--muted)', display:'inline-flex', gap:6, alignItems:'center' }}>
                        {waitlistStatus==='success' ? <Ico d={Icons.check} size={12}/> : null} {waitlistMsg}
                      </span>
                    )}
                    <span style={{ fontSize:'0.7rem', color:'var(--muted)'}}>No spam. Founding price locked at signup. <a href="/security" onClick={(e)=>{ e.preventDefault(); handleNav('/security'); }} style={{ color:'#38bdf8', textDecoration:'underline', cursor:'pointer'}}>Privacy: zero tracking</a></span>
                  </form>
                </div>
              </div>
              <p style={{ textAlign: 'center', marginTop: 14, fontSize: '0.75rem', color: 'var(--muted)' }}>All plans include end-to-end encryption, NAT traversal and open-source MIT license. Self-host the control plane free forever.</p>
            </section>

            {/* Testimonials — verified open-source contributors */}
            <section className="lp-section">
              <div className="lp-section-heading centered">
                <p className="lp-eyebrow">Built in the open — trusted by early users</p>
                <h2>What early testers say.</h2>
                <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:6 }}>Early access feedback · <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color:'#38bdf8', textDecoration:'underline'}}>Verify on GitHub →</a></p>
              </div>

              <div className="lp-testimonials-grid">
                <div className="lp-test-card">
                  <div className="lp-test-stars" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Ico key={i} d={Icons.star} size={14} />
                    ))}
                  </div>
                  <p className="lp-test-quote">
                    "I expose my home lab via Zoop instead of port-forwarding. Direct tunnel, no VPS hop — latency cut in half."
                  </p>
                  <div className="lp-test-author">
                    <div className="lp-test-avatar" style={{ background:'#38bdf8', color:'#020904'}}>G</div>
                    <div>
                      <div className="lp-test-name"><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'underline dotted'}}>GitHub Contributor</a> · Early access</div>
                      <div className="lp-test-role">Self-hosted · Ubiquiti + Linux</div>
                    </div>
                  </div>
                </div>

                <div className="lp-test-card">
                  <div className="lp-test-stars" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Ico key={i} d={Icons.star} size={14} />
                    ))}
                  </div>
                  <p className="lp-test-quote">
                    "Roaming actually works. I walk from office Wi-Fi to 5G mid-call — tunnel stays up via Netlink re-probe."
                  </p>
                  <div className="lp-test-author">
                    <div className="lp-test-avatar" style={{ background:'#34d399', color:'#020904'}}>G</div>
                    <div>
                      <div className="lp-test-name"><a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'underline dotted'}}>Community Tester</a> · Nairobi</div>
                      <div className="lp-test-role">Android + macOS mesh</div>
                    </div>
                  </div>
                </div>

                <div className="lp-test-card">
                  <div className="lp-test-stars" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Ico key={i} d={Icons.star} size={14} />
                    ))}
                  </div>
                  <p className="lp-test-quote">
                    "Families get it instantly: install on the router, everyone at home shares safely. No config beyond Zoop ID."
                  </p>
                  <div className="lp-test-author">
                    <div className="lp-test-avatar" style={{ background:'#a3e635', color:'#0a0e14'}}>G</div>
                    <div>
                      <div className="lp-test-name"><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ color:'inherit', textDecoration:'underline dotted'}}>OpenWrt Pilot</a> · Lagos</div>
                      <div className="lp-test-role">OpenWrt · Family sharing</div>
                    </div>
                  </div>
                </div>
              </div>
              <p style={{ textAlign:'center', marginTop:14, fontSize:'0.72rem', color:'var(--muted)'}}>Want to be quoted? Open an issue with your story — we link your GitHub profile with permission.</p>
            </section>

            {/* CTA Banner — rewritten for clarity + conversion */}
            <section className="lp-section">
              <div className="lp-cta-banner">
                <div className="lp-cta-copy">
                  <h2>Stop renting your own internet back from a VPN.</h2>
                  <p>Your traffic stays on your devices. Direct, encrypted, and yours — in 30 seconds.</p>
                </div>
                <div className="lp-cta-actions">
                  <a href="/downloads" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
                    <Ico d={Icons.download} size={18} />
                    Get Zoop Free
                  </a>
                  <a href="/app" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>
                    Open Web Console
                  </a>
                </div>
              </div>
            </section>

            {/* ─── Trust Bar + FAQ — SEO/AI & Conversion (S2-05, S4-02) ─── */}
            <section className="lp-trust-bar" aria-label="Trusted technology">
              <div className="lp-trust-inner">
                <span className="lp-trust-label">Built with proven, audited technology</span>
                <div className="lp-trust-badges">
                  <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#34d399' }} aria-hidden />WireGuard® encrypted</span>
                  <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#38bdf8' }} aria-hidden />Ed25519 auth</span>
                  <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#a3e635' }} aria-hidden />Open source MIT</span>
                  <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#f59e0b' }} aria-hidden />No tracking · No logs</span>
                  <span className="lp-trust-badge"><span className="lp-trust-dot" style={{ background: '#60a5fa' }} aria-hidden />STUN/TURN NAT traversal</span>
                </div>
              </div>
            </section>

            <section className="lp-section lp-faq" aria-labelledby="faq-heading">
              <div className="lp-section-heading centered">
                <p className="lp-eyebrow">Answers at a Glance</p>
                <h2 id="faq-heading">Frequently asked questions.</h2>
                <p className="lp-subtext">Everything decision-makers and LLM assistants need to cite Zoop correctly.</p>
              </div>
              <div className="lp-faq-grid">
                {[
                  { q: 'What is Zoop?', a: 'Zoop is an open-source direct device-to-device mesh that lets you share your home, phone or office internet with trusted devices — laptops, family phones or routers — via encrypted tunnels, not centralized VPN servers.' },
                  { q: 'How is Zoop different from a VPN?', a: 'Traditional VPNs route all your traffic through company servers, adding hops and latency. Zoop creates direct WireGuard tunnels device-to-device; your data takes the fastest path and stays private. Relays only act as fallback for strict NAT.' },
                  { q: 'Is my traffic private and encrypted?', a: 'Yes. Every payload is end-to-end encrypted with WireGuard (ChaCha20-Poly1305 + Curve25519) and authenticated with Ed25519. The control plane and relays coordinate signaling and IP allocation — they cannot decrypt your traffic. Zero tracking logs.' },
                  { q: 'Does it work behind NAT and mobile carriers (CGNAT)?', a: 'Yes — Zoop discovers local (host) and public (server-reflexive via STUN) candidates, hole-punches with UDP probes, and falls back to low-latency WebSocket relays when direct is impossible. Roaming between Wi-Fi ↔ cellular is automatic via Netlink events.' },
                  { q: 'What platforms can I run it on?', a: 'Linux (systemd/TUN), macOS (utun/launchd), Windows (Wintun), Android (VpnService), iOS (NetworkExtension) and OpenWrt routers. The web console manages devices, sharing and orgs in any browser.' },
                  { q: 'What is the Zoop ID and PIN?', a: 'Your permanent Zoop ID looks like ZP-7K4M9X and your mutable handle is @username; you sign in with your 6-digit PIN. No email required. Devices derive a deterministic Endpoint ID from your Ed25519 public key.' },
                  { q: 'Is Zoop free and open source?', a: 'Yes — MIT-licensed. Self-host the control plane with Postgres or use the ephemeral in-memory store for development. Download for Linux, macOS, Windows, Android, iOS and routers.' },
                ].map(({ q, a }) => (
                  <details key={q} className="lp-faq-item">
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
              <p className="lp-faq-note"><abbr title="STUN — Session Traversal Utilities for NAT: discovers your public IP/port">STUN</abbr> · <abbr title="TURN — Traversal Using Relays around NAT: relay fallback">TURN</abbr> · <abbr title="CGNAT — Carrier-Grade NAT: large-scale NAT by mobile ISPs">CGNAT</abbr> · <abbr title="WireGuard — modern VPN cryptography">WireGuard</abbr> — hover for definitions.</p>
            </section>

            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
              { '@type': 'Question', name: 'What is Zoop?', acceptedAnswer: { '@type': 'Answer', text: 'Zoop is an open-source direct device-to-device mesh that lets you share your home, phone or office internet with trusted devices via encrypted tunnels.' } },
              { '@type': 'Question', name: 'How is Zoop different from a VPN?', acceptedAnswer: { '@type': 'Answer', text: 'Traditional VPNs route all your traffic through company servers. Zoop creates direct WireGuard tunnels device-to-device, so your data takes the fastest path and stays private.' } },
              { '@type': 'Question', name: 'Is my traffic private and encrypted?', acceptedAnswer: { '@type': 'Answer', text: 'Every payload is end-to-end encrypted with WireGuard and authenticated with Ed25519. The control plane and relays cannot decrypt your traffic.' } },
              { '@type': 'Question', name: 'Does it work behind NAT and mobile carriers (CGNAT)?', acceptedAnswer: { '@type': 'Answer', text: 'Zoop discovers host and server-reflexive candidates via STUN, hole-punches, and falls back to relay when direct fails. Roaming is automatic.' } },
              { '@type': 'Question', name: 'What platforms are supported?', acceptedAnswer: { '@type': 'Answer', text: 'Linux, macOS, Windows, Android, iOS and OpenWrt, plus a web console for management.' } },
              { '@type': 'Question', name: 'What is the Zoop ID and PIN?', acceptedAnswer: { '@type': 'Answer', text: 'Your permanent Zoop ID is ZP-XXXXXX plus a mutable @username; sign in with a 6-digit PIN. No email required.' } },
              { '@type': 'Question', name: 'Is Zoop free and open source?', acceptedAnswer: { '@type': 'Answer', text: 'MIT-licensed and free. Self-hostable control plane with Postgres or in-memory store.' } },
            ]}) }} />
          </>
        )}
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <a href="/" className="lp-brand" onClick={(e) => { e.preventDefault(); handleNav('/'); }} aria-label="Zoop Internet — go to homepage">
                <div className="lp-brand-icon">
                  <img src="/zoopicon-32.webp" srcSet="/zoopicon-32.webp 1x, /zoopicon-192.webp 2x" alt="Zoop Internet" width={28} height={28} loading="lazy" />
                </div>
                <span className="lp-brand-text">Zoop Internet</span>
              </a>
              <p>
                Direct device-to-device mesh — WireGuard® encrypted, NAT-traversal, open-source. Your traffic, your route.
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer" style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid var(--line)', color:'var(--ink-secondary)', textDecoration:'none'}}>★ GitHub — MIT</a>
                <span style={{ fontSize:'0.75rem', padding:'4px 10px', borderRadius:999, background:'rgba(8,242,255,0.08)', border:'1px solid rgba(8,242,255,0.22)', color:'#38bdf8'}}>No tracking · No logs</span>
              </div>
            </div>

            <div className="lp-footer-col">
              <h4>Products</h4>
              <ul>
                <li><a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>Zoop for PC &amp; Mac</a></li>
                <li><a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>Zoop Mobile App</a></li>
                <li><a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>Downloads Matrix</a></li>
                <li><a href="/pricing" onClick={(e) => { e.preventDefault(); handleNav('/pricing'); }}>Pricing — Free &amp; Teams</a></li>
                <li><a href="/products" onClick={(e) => { e.preventDefault(); handleNav('/products'); }}>Home Routers</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Consoles</h4>
              <ul>
                <li><a href="/app" onClick={(e) => { e.preventDefault(); onLaunchConsole('user'); }}>Personal Device</a></li>
                <li><a href="/org" onClick={(e) => { e.preventDefault(); onLaunchConsole('org'); }}>Organization Fleet</a></li>
                <li><a href="/admin" onClick={(e) => { e.preventDefault(); onLaunchConsole('admin'); }}>Admin Center</a></li>
                <li><a href="/downloads" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>Get Zoop Free</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Learn More</h4>
              <ul>
                <li><a href="/how-it-works" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>How It Works</a></li>
                <li><a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>Documentation</a></li>
                <li><a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security Architecture</a></li>
                <li><a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>Privacy Policy</a></li>
                <li><a href="/terms" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>Terms of Service (EULA)</a></li>
              </ul>
            </div>

            <div className="lp-footer-col">
              <h4>Community &amp; Support</h4>
              <ul>
                <li><a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub Repository</a></li>
                <li><a href="/docs" onClick={(e) => { e.preventDefault(); handleNav('/docs'); }}>Documentation Hub</a></li>
                <li><a href="mailto:support@zoopinternet.app">Support: support@zoopinternet.app</a></li>
                <li><a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer">Help &amp; Issues</a></li>
                <li><a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Zoop Internet. Open source under MIT License.</span>
            <div className="lp-footer-links">
              <a href="/privacy" onClick={(e) => { e.preventDefault(); handleNav('/privacy'); }}>Privacy Policy</a>
              <a href="/terms" onClick={(e) => { e.preventDefault(); handleNav('/terms'); }}>Terms of Service</a>
              <a href="/security" onClick={(e) => { e.preventDefault(); handleNav('/security'); }}>Security</a>
              <a href="mailto:support@zoopinternet.app">support@zoopinternet.app</a>
              <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Non-Intrusive Download Feedback Toast ─────────────────── */}
      {downloadToast && (
        <div className="lp-toast-container">
          <div className="lp-toast" role="status" aria-live="polite">
            <div className="lp-toast-icon">
              <Ico d={Icons.check} size={18} />
            </div>
            <div>
              <strong>Download:</strong> {downloadToast.platform} — <code>{downloadToast.file}</code>
            </div>
            <button
              className="lp-toast-close"
              onClick={() => setDownloadToast(null)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ─── Sticky Bottom CTA — after 60% scroll, dismiss persists */}
      {activeRoute === '/' && showStickyCta && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px 10px 16px', borderRadius: 999, background: 'rgba(12,14,20,0.92)', border: '1px solid rgba(8,242,255,0.28)', boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 0 20px rgba(8,242,255,0.15)', backdropFilter: 'blur(16px)' }} role="region" aria-label="Quick actions">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f7fbff', whiteSpace: 'nowrap' }}>Ready to share?</span>
          <a href="/auth?tab=signup" className="lp-btn-primary" style={{ minHeight: 36, padding: '0 16px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={(e) => { e.preventDefault(); handleNav('/auth?tab=signup'); }}>Get Zoop Free <Ico d={Icons.arrowRight} size={14} /></a>
          <button onClick={() => { setShowStickyCta(false); try{ sessionStorage.setItem('zoop_sticky_dismissed','1'); }catch{} }} aria-label="Dismiss" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex', minWidth:44, minHeight:44, alignItems:'center', justifyContent:'center' }}><Ico d={Icons.close} size={14} /></button>
        </div>
      )}
    </div>
  );
};
