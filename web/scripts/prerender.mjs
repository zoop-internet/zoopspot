#!/usr/bin/env node
/**
 * Zoop prerender — writes static HTML for each marketing route so crawlers/AI get correct meta without JS.
 * Template: dist/index.html
 * Replaces title, description, og:title/desc/url, canonical, twitter, and injects route-specific JSON-LD if needed.
 * Usage: node scripts/prerender.mjs  (run after `vite build`)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const TEMPLATE = join(DIST, 'index.html');

const ROUTES = {
  '/': {
    title: 'Zoop — Secure Direct Device-to-Device Sharing | Private Mesh',
    desc: 'Share your home or phone internet directly with trusted devices — no VPN bottlenecks. WireGuard-encrypted, NAT-traversal, open-source & free. Install Zoop in 30 seconds.',
    canonical: 'https://zoop.network/',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/how-it-works': {
    title: 'How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks',
    desc: 'Learn how Zoop creates direct WireGuard tunnels device-to-device, with STUN/TURN NAT traversal and zero-knowledge relays. No centralized payload routing.',
    canonical: 'https://zoop.network/how-it-works',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/architecture': {
    title: 'How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks',
    desc: 'Learn how Zoop creates direct WireGuard tunnels device-to-device, with STUN/TURN NAT traversal and zero-knowledge relays. No centralized payload routing.',
    canonical: 'https://zoop.network/how-it-works',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/products': {
    title: 'Products — Zoop for Desktop, Mobile & Routers | One Ecosystem',
    desc: 'Zoop for Linux, macOS, Windows, Android, iOS & OpenWrt. One mesh across your computers, phones and home routers.',
    canonical: 'https://zoop.network/products',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/downloads': {
    title: 'Download Zoop — Free for Linux, macOS, Windows, Mobile & Routers',
    desc: 'Download Zoop free: .deb, .pkg, .msi, APK, iOS beta & router .ipk. One-tap install, open-source MIT.',
    canonical: 'https://zoop.network/downloads',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/security': {
    title: 'Security & Privacy — End-to-End Encrypted, Open Source, No Tracking',
    desc: 'Zoop is end-to-end encrypted (WireGuard), Ed25519 auth, zero tracking logs, open source & audited. Your traffic stays private.',
    canonical: 'https://zoop.network/security',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/pricing': {
    title: 'Pricing — Free Personal, Teams Coming Soon | Zoop',
    desc: 'Free forever for personal (5 devices, unlimited tunnels). Organizations with fleet, audit and relay controls — join founding waitlist.',
    canonical: 'https://zoop.network/pricing',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/docs': {
    title: 'Documentation — Quick Start, API, Architecture | Zoop',
    desc: 'Start in 30s, read architecture and API reference. Open-source MIT — GitHub docs, examples, and llms.txt for AI.',
    canonical: 'https://zoop.network/docs',
    ogImage: 'https://zoop.network/og-image.png',
  },
  '/auth': {
    title: 'Sign In — Zoop ID & PIN | Create Your Permanent Identity',
    desc: 'Sign in with your Zoop ID (ZP-...) and 6-digit PIN or create a new identity in 30 seconds. No email required.',
    canonical: 'https://zoop.network/auth',
    ogImage: 'https://zoop.network/og-image.png',
  },
};

function replaceMeta(html, route, meta) {
  let out = html;
  // title
  out = out.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`);
  // meta description
  out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(meta.desc)}$2`);
  // og:title
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(meta.title)}$2`);
  out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeAttr(meta.title)}$2`);
  // og:desc
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(meta.desc)}$2`);
  out = out.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeAttr(meta.desc.slice(0,155))}$2`);
  // canonical + og:url
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${meta.canonical}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${meta.canonical}$2`);
  // hreflang alternates — point to canonical
  out = out.replace(/(<link rel="alternate" hreflang="en" href=")[^"]*(")/, `$1${meta.canonical}$2`);
  // Inject route marker + BreadcrumbList for SEO (helps verify prerender + rich results)
  const breadcrumb = route === '/' ? '' : `  <script type="application/ld+json">${JSON.stringify({ "@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://zoop.network/"},{"@type":"ListItem","position":2,"name": meta.title.split('—')[0].trim() || route.slice(1), "item": meta.canonical}]})}<\/script>\n`;
  out = out.replace('</head>', `  <meta name="prerender" content="${route}" />\n${breadcrumb}</head>`);
  return out;
}
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

if (!existsSync(TEMPLATE)) {
  console.error(`Template not found: ${TEMPLATE}. Run vite build first.`);
  process.exit(1);
}
const template = readFileSync(TEMPLATE, 'utf8');

let count = 0;
for (const [route, meta] of Object.entries(ROUTES)) {
  if (route === '/') continue; // root already correct, but rewrite to ensure
  const html = replaceMeta(template, route, meta);
  const dir = join(DIST, route.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'index.html');
  writeFileSync(file, html, 'utf8');
  count++;
  console.log(`Prerendered ${route} -> ${file}`);
}
// Also ensure root has prerender tag
{
  const html = replaceMeta(template, '/', ROUTES['/']);
  writeFileSync(TEMPLATE, html, 'utf8');
  console.log(`Updated ${TEMPLATE} with prerender marker for /`);
}
console.log(`Done. ${count+1} routes.`);

