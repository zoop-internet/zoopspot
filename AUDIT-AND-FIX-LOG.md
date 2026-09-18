# Zoop Internet — Website Audit & Fix Log
**Domain:** `zoopinternet.app` / `zoopnetwork.pages.dev`  
**Date:** September 2026  
**Auditor:** Senior Web Performance, SEO & UI/UX Engineer (Antigravity)  
**Status:** Audit Complete — Remediation Plan Ready for Execution  

---

## 1. Executive Summary

A comprehensive 8-phase audit was conducted across the Zoop Internet web frontend (`web/` directory and Cloudflare Pages deployment pipeline). The audit examined technical crawlability, indexing, semantic structure, AI engine discoverability (AEO/GEO), Core Web Vitals (LCP, INP, CLS), accessibility (WCAG 2.2 AA), security headers, and edge hosting configurations.

### Key Audit Highlights:
- **Critical Performance Finding**: A **743 KB uncompressed PNG** (`/zoopicontransparent.png`) was being fetched at page load for small 24–44px icon slots in the hero section and console views. Replacing this with optimized WebP reduces payload by **>740 KB (99.8%)** per user visit.
- **Critical Crawl/Index Finding**: Unmatched paths were rewritten to `/index.html 200` via `_redirects`, causing **Soft-404 errors** that dilute domain crawl budget.
- **AI Search & Knowledge Graph**: Legacy domain (`zoop.network`) remained hardcoded in `llms-full.txt`, `sitemap.xml`, `ai.txt`, and `humans.txt`.
- **Interaction Responsiveness (INP)**: An artificial 180ms `setTimeout` was intentionally delaying route navigation on the landing page, degrading INP.
- **Semantic Structure & Accessibility**: Top-level navigation buttons lacked `href` attributes, multiple nested `<main>` tags were present, and secondary text contrast in certain views fell below WCAG AA 4.5:1.

---

## 2. Complete Repository Inventory

### 2.1 Stack & Tooling
- **Framework**: React 19.2.8 (`react`, `react-dom`)
- **Language**: TypeScript 6.0.2
- **Bundler & Dev Server**: Vite 8.2.0 (`@vitejs/plugin-react` 6.0.4)
- **Linter**: Oxlint 1.75.0
- **Styling**: Pure CSS with CSS custom properties (variables), no external CSS framework bloat
- **Fonts**: Inter (weights 400-900), JetBrains Mono (weights 400-600) via Google Fonts (`display=swap`)
- **Hosting Platform**: Cloudflare Pages (Project: `zoopnetwork`, Account: `7335973a10147fee3168dac18331dbab`)
- **Edge Routing**: Cloudflare Pages `_redirects` and `_headers`

### 2.2 Architecture & Rendering Strategy
- **Client-Side Routing (SPA)**: Custom pushState / popstate router in `src/App.tsx` avoiding router bundle weight.
- **Static Pre-rendering (SSG)**: `scripts/prerender.mjs` executes after `vite build`, taking `dist/index.html` as a template and emitting dedicated `index.html` files with page-specific titles, descriptions, canonical links, Open Graph tags, and Schema.org BreadcrumbList for all 24 public marketing and documentation routes.

### 2.3 Complete Route Map
| Route | Type | Prerendered | Title / Purpose |
|---|---|---|---|
| `/` | Landing / Hero | Yes | Zoop — Secure Direct Device-to-Device Sharing \| Private Mesh |
| `/how-it-works` | Marketing / Deep Dive | Yes | How Zoop Works — Direct Encrypted Mesh Without VPN Bottlenecks |
| `/architecture` | Technical Deep Dive | Yes | System Architecture & Network Plane Overview |
| `/products` | Product Catalog | Yes | Products — Zoop for Desktop, Mobile & Routers \| One Ecosystem |
| `/downloads` | Matrix & Binaries | Yes | Download Zoop — Free for Linux, macOS, Windows, Mobile & Routers |
| `/security` | Trust & Threat Model | Yes | Security & Privacy — End-to-End Encrypted, Open Source, No Tracking |
| `/pricing` | Commercial Plans | Yes | Pricing — Free Personal, Teams Coming Soon \| Zoop |
| `/docs` | Documentation Hub | Yes | Documentation — Quick Start, API, Architecture \| Zoop |
| `/docs/quickstart` | Guide | Yes | Quick Start Guide — Docs \| Zoop |
| `/docs/installation` | Guide | Yes | Installation Guide — Docs \| Zoop |
| `/docs/configuration` | Guide | Yes | Configuration Guide — Docs \| Zoop |
| `/docs/web-console` | Guide | Yes | Web Console Guide — Docs \| Zoop |
| `/docs/connect-share` | Guide | Yes | Connect & Share Guide — Docs \| Zoop |
| `/docs/devices` | Guide | Yes | Devices Guide — Docs \| Zoop |
| `/docs/mobile-router` | Guide | Yes | Mobile & Router Guide — Docs \| Zoop |
| `/docs/identity` | Guide | Yes | Identity & Keys Guide — Docs \| Zoop |
| `/docs/organizations` | Guide | Yes | Organizations Guide — Docs \| Zoop |
| `/docs/permissions` | Guide | Yes | Permissions Guide — Docs \| Zoop |
| `/docs/troubleshooting` | Guide | Yes | Troubleshooting Guide — Docs \| Zoop |
| `/docs/security-architecture` | Guide | Yes | Security Architecture Deep Dive — Docs \| Zoop |
| `/docs/faq` | Guide | Yes | Frequently Asked Questions — Docs \| Zoop |
| `/auth` | App / Auth | Yes | Sign In — Zoop ID & PIN \| Create Your Permanent Identity |
| `/privacy` | Legal / Policy | Yes | Privacy Policy — Zero Logging & Cryptographic Mesh \| Zoop |
| `/terms` | Legal / EULA | Yes | Terms of Service & EULA — Peer-to-Peer Mesh \| Zoop |
| `/app` | Private Application | No (SPA) | Personal Device Console (Requires Auth) |
| `/org` | Private Application | No (SPA) | Organization Fleet Console (Requires Auth) |
| `/admin` | Private Application | No (SPA) | Cloud Operator Console (Requires Auth) |

---

## 3. Phase-by-Phase Audit Findings & Planned Remediation

### Phase 1: Technical SEO (Crawl, Index, Architecture)

#### Finding 1.1: Soft-404 Responses on Nonexistent URLs
- **Severity**: High
- **Location**: `web/public/_redirects:1`
- **Issue**: `/* /index.html 200` causes Cloudflare Pages to return HTTP 200 for any random URL (e.g. `/random-slug`), serving the SPA index file. Search engines perceive this as a Soft 404.
- **Fix**:
  1. Generate `dist/404.html` in `prerender.mjs`.
  2. In `web/public/_redirects`, only rewrite specific SPA app routes (`/app/*`, `/org/*`, `/admin/*`) to `/index.html 200`. Cloudflare Pages will automatically serve `404.html` with status HTTP 404 for unmapped paths.

#### Finding 1.2: Overwriting of `robots.txt` Disallow Rules
- **Severity**: High
- **Location**: `web/scripts/prerender.mjs:161-166` vs `web/public/robots.txt:1-5`
- **Issue**: `prerender.mjs` generates `dist/robots.txt` containing only `User-agent: *\nAllow: /\nSitemap: ...`, wiping out `Disallow: /admin/` and `Disallow: /api/`. Additionally, `/app/` and `/org/` are missing from disallow directives.
- **Fix**: Update `prerender.mjs` and `web/public/robots.txt` to emit:
  ```txt
  User-agent: *
  Allow: /
  Disallow: /app/
  Disallow: /org/
  Disallow: /admin/
  Disallow: /api/

  # AI crawlers
  User-agent: GPTBot
  Allow: /
  User-agent: ClaudeBot
  Allow: /
  User-agent: PerplexityBot
  Allow: /
  User-agent: Google-Extended
  Allow: /

  Sitemap: https://zoopinternet.app/sitemap.xml
  ```

#### Finding 1.3: Legacy Domain & Private Route in `sitemap.xml`
- **Severity**: High
- **Location**: `web/public/sitemap.xml:3-11`
- **Issue**: `web/public/sitemap.xml` references `https://zoop.network` and includes `/app`.
- **Fix**: Replace content in `web/public/sitemap.xml` with canonical `https://zoopinternet.app` URLs, excluding authenticated `/app`.

#### Finding 1.4: Canonical Duplication between `/how-it-works` and `/architecture`
- **Severity**: Medium
- **Location**: `web/scripts/prerender.mjs:29-34`, `web/src/App.tsx:18`
- **Issue**: `/architecture` has identical title/description to `/how-it-works` and canonicalizes to `/how-it-works`, yet is listed as a separate URL in `sitemap.xml`.
- **Fix**: Give `/architecture` distinct title ("System Architecture & Deep Dive — WireGuard, STUN/TURN, IPAM | Zoop"), distinct description, and self-referencing canonical tag.

---

### Phase 2: On-Page SEO & Content Quality

#### Finding 2.1: Navigation Elements Implemented as Buttons or Hrefless Anchors
- **Severity**: High
- **Location**:
  - `web/src/landing/LandingPage.tsx:1030-1052` (Desktop topbar)
  - `web/src/landing/LandingPage.tsx:1097-1103` (Mobile drawer)
  - `web/src/landing/LandingPage.tsx:2034-2060` (Footer links)
- **Issue**:
  - Desktop nav uses `<button onClick={() => handleNav('/...')}>`.
  - Footer uses `<a onClick={() => handleNav('/...')}>` without `href`.
  - Search crawlers cannot follow these links, and users cannot middle-click / open in new tabs.
- **Fix**: Change to semantic `<a href="/target" onClick={(e) => { e.preventDefault(); handleNav('/target'); }}>`.

#### Finding 2.2: Multiple Nested `<main>` Elements
- **Severity**: Medium
- **Location**: `web/src/landing/LandingPage.tsx:1121`, 1132, 1176, 1248, 1302, 1363, 1419, 1529
- **Issue**: Outer container is `<main id="main-content">`, and individual page subviews also render `<main className="lp-page-wrapper">`. HTML5 permits only one `<main>` landmark.
- **Fix**: Change inner page wrappers from `<main className="lp-page-wrapper">` to `<div className="lp-page-wrapper">`.

#### Finding 2.3: Non-JS Crawlers Receive Empty Body Content
- **Severity**: High
- **Location**: `web/scripts/prerender.mjs:85-106`, `web/dist/*/index.html`
- **Issue**: Prerender only updates `<head>` meta tags. `<div id="root"></div>` remains completely empty until JS runs.
- **Fix**: Update `prerender.mjs` to inject route-specific semantic HTML shell (H1, route summary, primary features, and navigation links) into `<div id="root">` of prerendered files. When client-side React boots, `createRoot` cleanly hydrates/renders the interactive app.

---

### Phase 3: AI-Search Visibility (AEO/GEO) & Structured Data

#### Finding 3.1: Stale Domain in `llms-full.txt` and `ai.txt`
- **Severity**: High
- **Location**: `web/public/llms-full.txt:3, 12, 62, 65`, `web/public/ai.txt:8`
- **Issue**: Mentions `zoop.network` 7 times and instructs LLMs to query deprecated `FAQPage` JSON-LD.
- **Fix**: Update all references to `https://zoopinternet.app` and align structured data recommendations.

#### Finding 3.2: Missing `WebSite` Schema
- **Severity**: Medium
- **Location**: `web/index.html:56-84`
- **Issue**: Contains `Organization` and `SoftwareApplication`, but lacks `WebSite` schema.
- **Fix**: Add Schema.org `WebSite` JSON-LD definition.

#### Finding 3.3: Incomplete BreadcrumbList Hierarchy for Docs Subpages
- **Severity**: Low
- **Location**: `web/scripts/prerender.mjs:103`
- **Issue**: Emits 2-level breadcrumb (`Home` -> `Topic`) instead of 3-level (`Home` -> `Docs` -> `Topic`).
- **Fix**: Update breadcrumb generation in `prerender.mjs` to include the parent `/docs` step for all `/docs/*` subpages.

---

### Phase 4: Core Web Vitals & Performance

#### Finding 4.1: Massive 743 KB Uncompressed PNG in Critical Viewports
- **Severity**: Critical
- **Location**:
  - `web/src/landing/LandingPage.tsx:787` (`/zoopicontransparent.png` rendered at 44x44px in hero hub)
  - `web/src/admin/AdminConsole.tsx:2930`
  - `web/src/app/org/OrgDashboard.tsx:308`
  - `web/src/app/user/UserDashboard.tsx:1707`
  - `web/src/auth/AuthPage.tsx:265`
- **Issue**: Loads a 743 KB image where a 1.3 KB WebP icon (`/zoopicon-32.webp`) is needed.
- **Fix**: Replace all occurrences with `/zoopicon-32.webp` (or `/zoopicon-192.webp` for 2x displays).

#### Finding 4.2: Unused Preload of Social Share Image (`og-image.webp`)
- **Severity**: High
- **Location**: `web/index.html:54`
- **Issue**: `<link rel="preload" href="/og-image.webp" ...>` forces mobile and desktop browsers to download an image that is never visible in the viewport.
- **Fix**: Delete line 54 in `web/index.html`.

#### Finding 4.3: Artificial 180ms Navigation Latency Worsening INP
- **Severity**: High
- **Location**: `web/src/landing/LandingPage.tsx:940-950`
- **Issue**: `handleNav` defers `onNavigate(path)` inside a 180ms `setTimeout` to show a progress bar animation.
- **Fix**: Trigger `onNavigate(path)` immediately; run the progress bar animation concurrently without holding back navigation.

---

### Phase 5: Modern UI/UX

#### Finding 5.1: Suboptimal 404 Experience
- **Severity**: Medium
- **Location**: `web/src/App.tsx:141-152`
- **Issue**: Standalone 404 view lacks brand header, breadcrumbs, and quick route recovery cards.
- **Fix**: Enhance the 404 component with clear navigation links, search suggestion, and create an identical standalone `dist/404.html`.

#### Finding 5.2: Keyboard Focus Ring on Interactive Hero Nodes
- **Severity**: Low
- **Location**: `web/src/landing/LandingPage.css:430-444`
- **Issue**: Interactive `.lp-device-node` elements have hover transitions but lack explicit `:focus-visible` styling.
- **Fix**: Add `:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }`.

---

### Phase 6: Accessibility (WCAG 2.2 AA)

#### Finding 6.1: Missing `aria-hidden="true"` on Decorative Icons
- **Severity**: Medium
- **Location**: `web/src/landing/LandingPage.tsx:565, 787`
- **Issue**: Small decorative icons have empty alt attributes without explicit parent `aria-hidden`.
- **Fix**: Add `aria-hidden="true"` to decorative wrappers or provide meaningful alt text.

#### Finding 6.2: Low Contrast Secondary Text
- **Severity**: Low
- **Location**: `web/src/App.tsx:150`, `web/src/landing/LandingPage.css:177`
- **Issue**: `#64748b` on `#020617` provides a ~3.6:1 contrast ratio (WCAG AA requires 4.5:1).
- **Fix**: Upgrade to `#94a3b8` (contrast ratio ~5.8:1).

---

### Phase 7: Security & Trust Signals

#### Finding 7.1: Missing HSTS Header
- **Severity**: High
- **Location**: `web/public/_headers:1-6`
- **Issue**: `Strict-Transport-Security` is not defined in `_headers`.
- **Fix**: Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

#### Finding 7.2: Missing COOP Header
- **Severity**: Medium
- **Location**: `web/public/_headers:1-6`
- **Issue**: `Cross-Origin-Opener-Policy` is omitted.
- **Fix**: Add `Cross-Origin-Opener-Policy: same-origin`.

#### Finding 7.3: Inconsistent Repository URLs
- **Severity**: Medium (Requires human confirmation)
- **Location**: `web/index.html:66, 93`, `web/src/App.tsx:150`, `web/src/landing/LandingPage.tsx:2066`, `web/public/humans.txt:6`
- **Issue**: References `github.com/allannuwamanya/zoop` instead of the official remote `github.com/zoop-internet/zoop`.
- **Fix**: Update to `https://github.com/zoop-internet/zoop` across public documentation and site footers.

---

### Phase 8: Verification & Monitoring Setup

#### Finding 8.1: Need for Automated Build & HTML Verification
- **Severity**: Medium
- **Location**: Build pipeline
- **Issue**: No automated verification script checks that all 24 routes have non-empty body content, valid headers, and that sitemap URLs match output files.
- **Fix**: Implement `web/scripts/verify-build.mjs` and hook into post-build verification.

---

## 4. Human / External Decisions Flagged

1. **GitHub Repository URL**: Confirm migrating all public links from `https://github.com/allannuwamanya/zoop` to `https://github.com/zoop-internet/zoop`.
2. **Cloudflare DNS Records**: Ensure `CNAME @ zoopnetwork.pages.dev` and `CNAME www zoopnetwork.pages.dev` are set in the Cloudflare dashboard for `zoopinternet.app`.
3. **Contact Email**: Confirm `support@zoopinternet.app` is the primary public mailbox.
