#!/usr/bin/env node
/**
 * Zoop prerender — writes static HTML for each marketing route so crawlers/AI get correct meta without JS.
 * Template: dist/index.html
 * Replaces title, description, og:title/desc/url, canonical, twitter, and injects route-specific JSON-LD and crawler HTML.
 * Usage: node scripts/prerender.mjs  (run after `vite build`)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const TEMPLATE = join(DIST, 'index.html');
const BASE_DOMAIN = 'https://zoopnetwork.app';

// Canonical marketing routes (excluding /architecture which 301 redirects to /how-it-works)
const ROUTES = {
  '/': {
    title: 'Zoop — Secure Direct Device-to-Device Sharing | Private Mesh',
    desc: 'Share your home or phone internet directly with trusted devices — no VPN bottlenecks. WireGuard-encrypted, NAT-traversal, open-source & free. Install Zoop in 30 seconds.',
    canonical: `${BASE_DOMAIN}/`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/how-it-works': {
    title: 'How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks',
    desc: 'Learn how Zoop creates direct WireGuard tunnels device-to-device, with STUN/TURN NAT traversal and zero-knowledge relays. No centralized payload routing.',
    canonical: `${BASE_DOMAIN}/how-it-works`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/products': {
    title: 'Products — Zoop for Desktop, Mobile & Routers | One Ecosystem',
    desc: 'Zoop for Linux, macOS, Windows, Android, iOS & OpenWrt. One mesh across your computers, phones and home routers.',
    canonical: `${BASE_DOMAIN}/products`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/downloads': {
    title: 'Download Zoop — Free for Linux, macOS, Windows, Mobile & Routers',
    desc: 'Download Zoop free: .deb, .pkg, .msi, APK, iOS beta & router .ipk. One-tap install, open-source MIT.',
    canonical: `${BASE_DOMAIN}/downloads`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/security': {
    title: 'Security & Privacy — End-to-End Encrypted, Open Source, No Tracking',
    desc: 'Zoop is end-to-end encrypted (WireGuard), Ed25519 auth, zero tracking logs, open source & audited. Your traffic stays private.',
    canonical: `${BASE_DOMAIN}/security`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/pricing': {
    title: 'Pricing — Free Personal, Teams Coming Soon | Zoop',
    desc: 'Free forever for personal (5 devices, unlimited tunnels). Organizations with fleet, audit and relay controls — join founding waitlist.',
    canonical: `${BASE_DOMAIN}/pricing`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/docs': {
    title: 'Documentation — Quick Start, API, Architecture | Zoop',
    desc: 'Start in 30s, read architecture and API reference. Open-source MIT — GitHub docs, examples, and llms.txt for AI.',
    canonical: `${BASE_DOMAIN}/docs`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/auth': {
    title: 'Sign In — Zoop ID & PIN | Create Your Permanent Identity',
    desc: 'Sign in with your Zoop ID (ZP-...) and 6-digit PIN or create a new identity in 30 seconds. No email required.',
    canonical: `${BASE_DOMAIN}/auth`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/privacy': {
    title: 'Privacy Policy — Zero Logging & Cryptographic Mesh | Zoop',
    desc: 'Zoop Privacy Policy: Zero logging of payload traffic, browsing history, DNS or destination IPs. End-to-end WireGuard encrypted, open source.',
    canonical: `${BASE_DOMAIN}/privacy`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/terms': {
    title: 'Terms of Service & EULA — Peer-to-Peer Mesh | Zoop',
    desc: 'Zoop Terms of Service and End User License Agreement: Peer-to-peer network usage, acceptable use policy, and licensing.',
    canonical: `${BASE_DOMAIN}/terms`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/blog': {
    title: 'The Zoop Blog — Stories, Guides & Peer-to-Peer Freedom',
    desc: 'Thoughts on peer-to-peer freedom, travel connectivity, and how to get the fastest, most private internet on earth.',
    canonical: `${BASE_DOMAIN}/blog`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  },
  '/blog/why-peer-to-peer-is-the-future': {
    title: 'Why We Built Zoop: The Internet Was Meant to Be Peer-to-Peer | Blog',
    desc: 'How corporate VPNs convinced millions to rent their own internet back, and why direct device sharing is taking it back.',
    canonical: `${BASE_DOMAIN}/blog/why-peer-to-peer-is-the-future`,
    ogImage: `${BASE_DOMAIN}/assets/zoop_hero_connect.jpg`,
  },
  '/blog/share-internet-with-friends-traveling': {
    title: 'How to Share Internet with Friends While Traveling | Blog',
    desc: 'The easiest, safest way to keep your travel group connected across laptops and phones without paying for extra SIMs or sketchy hotel Wi-Fi.',
    canonical: `${BASE_DOMAIN}/blog/share-internet-with-friends-traveling`,
    ogImage: `${BASE_DOMAIN}/assets/zoop_friends_travel.jpg`,
  },
  '/blog/goodbye-vpn-lag-gaming-remote-work': {
    title: 'Goodbye Lag: Why Gamers & Remote Workers Switch to Direct Tunnels | Blog',
    desc: 'What actually happens when you cut out the VPN middleman? Sub-millisecond latency, zero dropped calls, and instant file sync.',
    canonical: `${BASE_DOMAIN}/blog/goodbye-vpn-lag-gaming-remote-work`,
    ogImage: `${BASE_DOMAIN}/assets/zoop_remote_work.jpg`,
  },
  '/blog/what-is-direct-mesh-networking': {
    title: 'Direct Mesh vs. Traditional VPNs: A Simple, Human Guide | Blog',
    desc: 'No networking degree required. Here is how device-to-device encryption works without the headache of networking textbooks.',
    canonical: `${BASE_DOMAIN}/blog/what-is-direct-mesh-networking`,
    ogImage: `${BASE_DOMAIN}/assets/zoop-mesh-architecture.webp`,
  },
};

const DOCS_IDS = [
  'quickstart', 'installation', 'configuration', 'web-console',
  'connect-share', 'devices', 'mobile-router', 'identity',
  'organizations', 'permissions', 'troubleshooting',
  'security-architecture', 'faq'
];

function replaceMeta(html, route, meta) {
  let out = html;
  // title
  out = out.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(meta.title)}</title>`);
  // meta description
  out = out.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeAttr(meta.desc)}$2`);
  // og:title & twitter:title
  out = out.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeAttr(meta.title)}$2`);
  out = out.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${escapeAttr(meta.title)}$2`);
  // og:desc & twitter:desc
  out = out.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeAttr(meta.desc)}$2`);
  out = out.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${escapeAttr(meta.desc.slice(0, 155))}$2`);
  // canonical + og:url
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${meta.canonical}$2`);
  out = out.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${meta.canonical}$2`);
  // hreflang alternates — point to canonical
  out = out.replace(/(<link rel="alternate" hreflang="en" href=")[^"]*(")/, `$1${meta.canonical}$2`);

  // Multi-tier BreadcrumbList: Home -> (Docs ->) Subpage
  let breadcrumb = '';
  if (route !== '/') {
    const isDocSub = route.startsWith('/docs/') && route !== '/docs';
    const items = [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": `${BASE_DOMAIN}/` }
    ];
    if (isDocSub) {
      items.push({ "@type": "ListItem", "position": 2, "name": "Docs", "item": `${BASE_DOMAIN}/docs` });
      items.push({ "@type": "ListItem", "position": 3, "name": meta.title.split('—')[0].trim(), "item": meta.canonical });
    } else {
      items.push({ "@type": "ListItem", "position": 2, "name": meta.title.split('—')[0].trim() || route.slice(1), "item": meta.canonical });
    }
    breadcrumb = `  <script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items })}</script>\n`;
  }

  // Per-template structured data schemas for search & AI answer engines
  let templateSchema = '';
  const today = new Date().toISOString().split('T')[0];
  if (route.startsWith('/docs/')) {
    const techArticle = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": meta.title.split('—')[0].trim(),
      "description": meta.desc,
      "inLanguage": "en",
      "mainEntityOfPage": meta.canonical,
      "author": {
        "@type": "Organization",
        "name": "Zoop Core Team",
        "url": "https://github.com/zoop-internet"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Zoop Internet",
        "url": BASE_DOMAIN,
        "logo": `${BASE_DOMAIN}/zoopicon-192.png`
      },
      "datePublished": "2024-06-01",
      "dateModified": today
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(techArticle)}</script>\n`;
  } else if (route === '/downloads') {
    const dlSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Zoop Internet",
      "applicationCategory": "NetworkingApplication",
      "operatingSystem": "Linux, macOS, Windows, Android, iOS, OpenWrt",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": meta.desc,
      "softwareVersion": "0.1.0-alpha",
      "license": "https://opensource.org/licenses/MIT",
      "url": meta.canonical,
      "downloadUrl": `${BASE_DOMAIN}/downloads`
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(dlSchema)}</script>\n`;
  } else if (route === '/products') {
    const prodSchema = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Zoop Internet Ecosystem",
      "applicationCategory": "NetworkingApplication",
      "operatingSystem": "Cross-platform (Linux, macOS, Windows, Android, iOS, OpenWrt)",
      "description": meta.desc,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "url": meta.canonical
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(prodSchema)}</script>\n`;
  } else if (route === '/pricing') {
    const pricingSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Zoop Mesh Platform",
      "description": meta.desc,
      "brand": { "@type": "Brand", "name": "Zoop" },
      "offers": [
        {
          "@type": "Offer",
          "name": "Personal Free",
          "price": "0",
          "priceCurrency": "USD",
          "description": "5 devices, unlimited direct tunnels, WireGuard encrypted, community support."
        },
        {
          "@type": "Offer",
          "name": "Organizations (Founding)",
          "price": "8.00",
          "priceCurrency": "USD",
          "description": "Per seat per month. Unlimited members, fleet controls, audit logs, IPAM & relay controls."
        }
      ]
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(pricingSchema)}</script>\n`;
  } else if (route === '/security') {
    const secSchema = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "Zoop Security & Privacy Architecture",
      "description": meta.desc,
      "inLanguage": "en",
      "mainEntityOfPage": meta.canonical,
      "author": {
        "@type": "Organization",
        "name": "Zoop Security Team",
        "url": "https://github.com/zoop-internet"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Zoop Internet",
        "url": BASE_DOMAIN,
        "logo": `${BASE_DOMAIN}/zoopicon-192.png`
      },
      "datePublished": "2024-06-01",
      "dateModified": today
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(secSchema)}</script>\n`;
  } else if (route === '/blog') {
    const blogSchema = {
      "@context": "https://schema.org",
      "@type": "Blog",
      "name": "The Zoop Blog",
      "description": meta.desc,
      "url": meta.canonical,
      "publisher": {
        "@type": "Organization",
        "name": "Zoop Internet",
        "url": BASE_DOMAIN,
        "logo": `${BASE_DOMAIN}/zoopicon-192.png`
      }
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(blogSchema)}</script>\n`;
  } else if (route.startsWith('/blog/')) {
    const postSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": meta.title.split('|')[0].trim(),
      "description": meta.desc,
      "image": meta.ogImage,
      "datePublished": "2026-09-18",
      "dateModified": today,
      "mainEntityOfPage": meta.canonical,
      "author": {
        "@type": "Organization",
        "name": "Zoop Team",
        "url": BASE_DOMAIN
      },
      "publisher": {
        "@type": "Organization",
        "name": "Zoop Internet",
        "url": BASE_DOMAIN,
        "logo": `${BASE_DOMAIN}/zoopicon-192.png`
      }
    };
    templateSchema = `  <script type="application/ld+json">${JSON.stringify(postSchema)}</script>\n`;
  }

  // Fallback body markup inside <div id="root"> for non-JS search crawlers (replaced by React createRoot on load)
  const crawlerTitle = meta.title.split('—')[0].trim();
  const fallbackBody = `
    <header style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;background:#020617">
      <a href="/" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#f8fafc;font-weight:800;font-size:1.1rem">
        <img src="/zoopicon-32.webp" alt="Zoop Logo" width="28" height="28" />
        Zoop Internet
      </a>
      <nav style="display:flex;gap:16px;font-size:0.875rem">
        <a href="/how-it-works" style="color:#38bdf8;text-decoration:none">How It Works</a>
        <a href="/products" style="color:#38bdf8;text-decoration:none">Products</a>
        <a href="/docs" style="color:#38bdf8;text-decoration:none">Docs</a>
        <a href="/downloads" style="color:#38bdf8;text-decoration:none">Downloads</a>
        <a href="/pricing" style="color:#38bdf8;text-decoration:none">Pricing</a>
      </nav>
    </header>
    <main style="max-width:960px;margin:40px auto;padding:0 24px;font-family:Inter,system-ui,sans-serif">
      <h1 style="font-size:2.25rem;font-weight:800;color:#f8fafc;line-height:1.2">${escapeHtml(crawlerTitle)}</h1>
      <p style="font-size:1.125rem;color:#94a3b8;margin-top:16px;line-height:1.6">${escapeHtml(meta.desc)}</p>
      <div style="margin-top:32px;display:flex;gap:12px;flex-wrap:wrap">
        <a href="/auth?tab=signup" style="padding:10px 20px;border-radius:8px;background:#38bdf8;color:#020617;font-weight:700;text-decoration:none">Get Started Free</a>
        <a href="/docs" style="padding:10px 20px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#f8fafc;font-weight:600;text-decoration:none">Read Documentation</a>
      </div>
    </main>
  `;
  out = out.replace('<div id="root"></div>', `<div id="root">${fallbackBody}</div>`);

  out = out.replace('</head>', `  <meta name="prerender" content="${route}" />\n${breadcrumb}${templateSchema}</head>`);
  return out;
}

function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(s) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

if (!existsSync(TEMPLATE)) {
  console.error(`Template not found: ${TEMPLATE}. Run vite build first.`);
  process.exit(1);
}
const template = readFileSync(TEMPLATE, 'utf8');

let count = 0;
// Prerender canonical top-level routes
for (const [route, meta] of Object.entries(ROUTES)) {
  if (route === '/') continue;
  const html = replaceMeta(template, route, meta);
  const relPath = route.replace(/^\//, '');
  const dir = join(DIST, relPath);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'index.html');
  writeFileSync(file, html, 'utf8');
  const flatFile = join(DIST, `${relPath}.html`);
  writeFileSync(flatFile, html, 'utf8');
  count++;
  console.log(`Prerendered ${route} -> ${file} and ${flatFile}`);
}

// Prerender docs subpages
for (const id of DOCS_IDS) {
  const route = `/docs/${id}`;
  const humanTitle = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const meta = {
    title: `${humanTitle} — Docs | Zoop`,
    desc: `Zoop documentation — ${humanTitle}: open-source WireGuard mesh, NAT traversal, and self-hosted control plane.`,
    canonical: `${BASE_DOMAIN}${route}`,
    ogImage: `${BASE_DOMAIN}/og-image.png`,
  };
  const baseMeta = ROUTES['/docs'];
  const useMeta = {
    ...baseMeta,
    ...meta,
    title: meta.title.includes('Quickstart') ? 'Quick Start — Docs | Zoop' : meta.title
  };
  const html = replaceMeta(template, route, useMeta);
  const relPath = route.replace(/^\//, '');
  const dir = join(DIST, relPath);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'index.html');
  writeFileSync(file, html, 'utf8');
  const flatFile = join(DIST, `${relPath}.html`);
  writeFileSync(flatFile, html, 'utf8');
  count++;
  console.log(`Prerendered ${route} -> ${file} and ${flatFile}`);
}

// Update root /
{
  const html = replaceMeta(template, '/', ROUTES['/']);
  writeFileSync(TEMPLATE, html, 'utf8');
  console.log(`Updated ${TEMPLATE} with prerender marker and fallback body for /`);
}

// Generate static 404.html (True 404 for Cloudflare Pages edge)
{
  if (existsSync('public/404.html')) {
    copyFileSync('public/404.html', join(DIST, '404.html'));
    console.log(`Copied public/404.html -> ${join(DIST, '404.html')}`);
  }
}

// Generate canonical sitemap.xml with lastmod dates
{
  const today = new Date().toISOString().split('T')[0];
  const allRoutes = [...Object.keys(ROUTES), ...DOCS_IDS.map(id => `/docs/${id}`)];
  const urls = allRoutes.map(r => `  <url>
    <loc>${BASE_DOMAIN}${r === '/' ? '/' : r}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r === '/' ? 'daily' : r.startsWith('/docs') ? 'weekly' : 'monthly'}</changefreq>
    <priority>${r === '/' ? '1.0' : r === '/docs' ? '0.9' : '0.7'}</priority>
  </url>`).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`Generated ${join(DIST, 'sitemap.xml')} (${allRoutes.length} canonical urls)`);
}

// Generate complete robots.txt with disallows and AI crawler allowances
{
  const robots = `User-agent: *
Allow: /
Disallow: /app/
Disallow: /org/
Disallow: /admin/
Disallow: /api/

# AI crawlers — explicitly allowed for LLM discoverability
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: Amazonbot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bytespider
Allow: /
User-agent: cohere-ai
Allow: /

Sitemap: ${BASE_DOMAIN}/sitemap.xml
`;
  writeFileSync(join(DIST, 'robots.txt'), robots, 'utf8');
  console.log(`Generated ${join(DIST, 'robots.txt')}`);
}

console.log(`Prerender complete. Emitted ${count + 1} routes.`);
