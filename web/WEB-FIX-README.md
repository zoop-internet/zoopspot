# Zoop Internet — Web Remediation Plan (`web/`)
**Target Host:** `zoopnetwork.app` (`zoopnetwork.pages.dev`)  
**Package:** `web/`  
**Reference Document:** [AUDIT-AND-FIX-LOG.md](../AUDIT-AND-FIX-LOG.md)

This README provides the step-by-step technical execution blueprint for remediating the `web/` codebase across all 8 audit phases. Follow each phase sequentially and run validation checks before proceeding to the next.

---

## Architecture & Build Overview

The `web/` workspace is a React 19 application built with Vite and TypeScript:
- **Build Command**: `npm run build` (`tsc -b && vite build && node scripts/prerender.mjs`)
- **Lint Command**: `npm run lint` (`oxlint`)
- **Prerender Engine**: `scripts/prerender.mjs` generates 24 static route directories in `dist/` with custom `<head>` metadata and structured data.
- **Edge Deployment**: Cloudflare Pages (`zoopnetwork`), served from `dist/` with `_headers` and `_redirects`.

---

## Phase Execution Checklist

### Phase 1: Technical SEO (Crawl, Index, Architecture)
- [x] **1.1 Fix Soft-404 in `_redirects` & generate `dist/404.html`** [DONE - Deployed & verified with curl HTTP 404]
  - Updated `scripts/prerender.mjs` and added `public/404.html` to emit true HTTP 404 on unmapped paths.
  - Updated `public/_redirects` to only proxy explicit SPA client-side routes (`/app/*`, `/org/*`, `/admin/*`) to `/index.html 200`. Unmatched requests drop to `404.html` natively.
- [x] **1.2 Update `robots.txt` Disallow directives** [DONE - Deployed & verified with curl]
  - In `scripts/prerender.mjs` and `public/robots.txt`, disallowed `/app/`, `/org/`, `/admin/`, and `/api/`. Preserved all AI bot allowances (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, etc.).
- [x] **1.3 Clean `public/sitemap.xml`** [DONE - Deployed & verified with curl]
  - Replaced legacy `zoop.network` with `https://zoopnetwork.app` across all URLs.
  - Added valid ISO-8601 `<lastmod>` timestamps and removed private `/app`.
- [x] **1.4 Disambiguate `/architecture` & `/how-it-works`** [DONE - Deployed & verified with curl HTTP 301]
  - Configured clean HTTP 301 redirect in `_redirects` and client router from `/architecture` to `/how-it-works`. Omitted non-canonical alias from sitemap.

### Phase 2: On-Page SEO & Content Quality
- [x] **2.1 Semantic Navigation Anchors** [DONE - Deployed & verified]
  - Converted topbar nav, brand logo, mobile drawer, hero CTAs, pricing action buttons, and all footer links to semantic `<a href="...">` elements with `onClick={(e) => { e.preventDefault(); handleNav('/...'); }}` SPA routing.
  - Added matching CSS styling in `src/landing/LandingPage.css`.
- [x] **2.2 Eliminate Nested `<main>` Elements** [DONE - Deployed & verified]
  - In `src/landing/LandingPage.tsx`, replaced nested `<main className="lp-page-wrapper">` tags with `<div className="lp-page-wrapper">` across Pricing, Downloads, HowItWorks, Products, Security, Privacy, and Terms views.
  - Moved `lp-trust-bar` and `lp-faq` inside `<main id="main-content">`. Replaced `<h1>` in `<noscript>` with `<p>`. Exactly one `<main>` landmark exists on every page.
- [x] **2.3 Prerender Fallback Content into `<div id="root">`** [DONE - Deployed & verified]
  - In `scripts/prerender.mjs`, inserted route-specific semantic HTML (H1, route summary paragraph, and primary links) into `<div id="root">` so non-JS scrapers receive rich indexed text.
  - Standardized GitHub links across landing page and docs to `https://github.com/zoop-internet/zoop`.

### Phase 3: AI-Search Visibility (AEO/GEO) & Structured Data
- [x] **3.1 Update AI Knowledge Documents** [DONE - Deployed & verified]
  - In `public/llms-full.txt`, `public/llms.txt`, `public/ai.txt`, and `public/humans.txt`, updated all references from `zoop.network` to `https://zoopnetwork.app`.
  - Updated all GitHub repository references to `https://github.com/zoop-internet/zoop`.
- [x] **3.2 Add Schema.org `WebSite` Definition** [DONE - Deployed & verified]
  - In `index.html`, added `WebSite` JSON-LD schema with name, URL, description, and publisher attributes.
  - Updated `Organization` logo from unoptimized PNG to `/zoopicon-192.png`.
- [x] **3.3 Multi-tier Breadcrumb for Documentation** [DONE - Deployed & verified]
  - In `scripts/prerender.mjs`, verified docs breadcrumbs include the parent `/docs` hierarchy (`Home` -> `Docs` -> `Page`).
  - Added automated assertions to `scripts/verify-build.mjs`.

### Phase 4: Core Web Vitals & Performance
- [x] **4.1 Replace 743 KB Logo with Optimized WebP** [DONE - Deployed & verified]
  - Replaced `/zoopicontransparent.png` across `LandingPage.tsx`, `AdminConsole.tsx`, `OrgDashboard.tsx`, `UserDashboard.tsx`, and `AuthPage.tsx` with `/zoopicon-32.webp` (and `/zoopicon-192.webp 2x` srcSet).
- [x] **4.2 Remove `og-image.webp` Preload** [DONE - Deployed & verified]
  - In `index.html`, removed the unused `og-image.webp` preload and updated primary icon preload to WebP.
- [x] **4.3 Eliminate Artificial 180ms Navigation Latency** [DONE - Deployed & verified]
  - In `src/landing/LandingPage.tsx` (`handleNav`), trigger `onNavigate(path)` immediately rather than deferring inside a 180ms `setTimeout`, eliminating artificial latency and optimizing INP.

### Phase 5: Modern UI/UX
- [x] **5.1 404 Experience Upgrade** [DONE - Deployed & verified]
  - Enhanced `NotFound` component in `src/App.tsx` and static `public/404.html` with clean brand header, recovery navigation cards, and home navigation.
- [x] **5.2 Interactive Element Focus States & Architecture Illustration** [DONE - Deployed & verified]
  - Added explicit `:focus-visible` styling to `.lp-device-node` and nav links in `src/landing/LandingPage.css`.
  - Generated and embedded optimized WebP architecture diagram (`/assets/zoop-mesh-architecture.webp`, 25 KB) in the `/how-it-works` view.
- [x] **5.3 Mobile Horizontal Scroll Affordance** [DONE - Deployed & verified]
  - Added `.lp-scroll-hint` ("← Swipe horizontally to compare all features →") above the comparison table on screens <=768px with momentum scrolling.
- [x] **5.4 Contextual Action Buttons on Product Cards** [DONE - Deployed & verified]
  - Added direct action buttons to Desktop ("Download for PC & Mac"), Mobile ("Get Mobile App"), and Web Console ("Open Web Console") cards.
- [x] **5.5 Client-side Platform Detection** [DONE - Deployed & verified]
  - Added `useMemo` OS detection in `/downloads` with `.lp-recommended-badge` highlighting the user's active operating system.
- [x] **5.6 Pricing Reassurance & Guarantees FAQ** [DONE - Deployed & verified]
  - Added open-source and license guarantees callout to `/pricing` answering personal free-forever, organization fleet, and self-hosted control plane questions.
- [x] **5.7 Security Disclosure & Vulnerability Reporting** [DONE - Deployed & verified]
  - Added vulnerability reporting channel (`security@zoopnetwork.app`), 24h response commitment, and PGP key advisory link to `/security`.
- [x] **5.8 Docs Search Zero-State & Mobile Navigation Drawer** [DONE - Deployed & verified]
  - Added responsive `.docs-mobile-toggle` drawer and `.docs-empty-state` with "Clear search" button to `/docs`. Added `@media print` rules.

### Phase 6: Accessibility (WCAG 2.2 AA)
- [x] **6.1 Accessible Media & Decorative Icons** [DONE - Deployed & verified]
  - Audited all `<img>` tags across `LandingPage.tsx` and console dashboards; added `aria-hidden="true"` to decorative icons and descriptive `alt` text to informative graphics.
- [x] **6.2 Contrast Optimization** [DONE - Deployed & verified]
  - Verified `--muted` text variable (`#9aa8bd`, 6.1:1 contrast on `#0c1219`) exceeds the WCAG AA 4.5:1 requirement. Standardized secondary text styles.
- [x] **6.3 Skip Link Styles & Transition (WCAG 2.4.1)** [DONE - Deployed & verified]
  - Implemented `.skip-link` styles in `LandingPage.css` and `AuthPage.css` with smooth transition and high-contrast focus state (`#38bdf8` on `#020904`, 3px white outline).
- [x] **6.4 Global Focus Visible Rings (WCAG 2.4.7 / 2.4.13)** [DONE - Deployed & verified]
  - Implemented 2px cyan outlines with 2px offset for all interactive controls (brand, hamburger, user badges, logout, toast dismiss, FAQ summaries, drawer items, copy buttons, tabs, footer links).
- [x] **6.5 Mobile Drawer Focus Trap & Escape Restoration (WCAG 2.1.2)** [DONE - Deployed & verified]
  - Added focus trap in `Navbar.tsx` that moves focus inside the drawer on open, traps Tab/Shift+Tab, handles Escape dismissal, and returns focus to the hamburger button on close.
- [x] **6.6 Keyboard Operable Code Snippets (WCAG 2.1.1)** [DONE - Deployed & verified]
  - Converted `.lp-code-snippet` in `/downloads` and "Copy as Markdown" in `/docs` to native `<button type="button">` with descriptive `aria-label` attributes.
- [x] **6.7 WAI-ARIA Tablist Pattern & Form Error Linking (WCAG 4.1.2 & 3.3.1)** [DONE - Deployed & verified]
  - Added keyboard arrow navigation (`ArrowLeft`/`ArrowRight`/`Home`/`End`) to documentation tabs; linked waitlist and authentication inputs with live status messages using `aria-describedby` and `aria-invalid`. Added `role="tabpanel"` on auth tabs.

### Phase 7: Security & Trust Signals
- [x] **7.1 Add HSTS to `_headers`** [DONE - Deployed & verified]
  - Added `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` to root rules. Verified live via edge curl.
- [x] **7.2 Add COOP & CORP to `_headers`** [DONE - Deployed & verified]
  - Added `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` globally, with `Cross-Origin-Resource-Policy: cross-origin` for static assets (`/assets/*`, `/*.webp`, `/*.png`, `/*.svg`, `/*.ico`). Verified live via edge curl.
- [x] **7.3 CSP & Permissions-Policy Hardening** [DONE - Deployed & verified]
  - Hardened Content-Security-Policy with `base-uri 'self'`, `object-src 'none'`, and `upgrade-insecure-requests`.
  - Expanded Permissions-Policy to explicitly restrict `camera=()`, `microphone=()`, `geolocation=()`, `payment=()`, `usb=()`, `interest-cohort=()`, and `screen-wake-lock=()`.
- [x] **7.4 RFC 9116 Machine-Readable Security Disclosure** [DONE - Deployed & verified]
  - Implemented `web/public/.well-known/security.txt` conforming to RFC 9116 with `Contact`, `Expires`, `Preferred-Languages`, `Canonical`, `Policy`, `Acknowledgments`, and `Hiring` directives.
  - Implemented fallback `web/public/security.txt` and HTTP 301 permanent redirect in `_redirects`. Verified live via edge curl with `Content-Type: text/plain; charset=utf-8`.
- [x] **7.5 Repository Security Policy & Privacy Policy Synchronization** [DONE - Deployed & verified]
  - Synchronized `SECURITY.md` with official disclosure email `security@zoopnetwork.app`, 24h SLA acknowledgment commitment, and RFC 9116 reference.
  - Synchronized `docs/compliance/privacy_policy.md` contact email and repository links.
- [x] **7.6 Complete Legacy Domain Elimination** [DONE - Deployed & verified]
  - Replaced all legacy `zoop.network` domain occurrences across `web/public/docs/web.md`, `web/src/admin/AdminConsole.css`, `web/src/landing/data/docsData.ts`, and `web/.env.example` with canonical `zoopnetwork.app`. Standardized GitHub links to `https://github.com/zoop-internet/zoop`.

### Phase 8: Verification & Monitoring Setup
- [x] **8.1 Automated Build Verification Script** [DONE - Deployed & verified]
  - Implemented `scripts/verify-build.mjs` running 100+ automated assertions across:
    1. Existence of all 23 prerendered canonical route directories and flat HTML files.
    2. Non-empty `<div id="root">` crawler fallback body content in all HTML files.
    3. `dist/sitemap.xml` validity and route synchronization (zero legacy domains).
    4. `dist/404.html` presence with `noindex, nofollow`.
    5. `dist/robots.txt` disallow directives for private paths + AI bot allowances.
    6. `_headers` validation (HSTS, COOP, CORP, CSP, Permissions-Policy) and architecture asset presence.
    7. RFC 9116 `dist/.well-known/security.txt` and `dist/security.txt` verification.
    8. WCAG 2.2 AA accessibility rules (`<html lang="en">`, `.skip-link`, `:focus-visible`, image `alt`/`aria-hidden`).
- [x] **8.2 Synthetic Edge Probing & Live Health Monitoring** [DONE - Deployed & verified]
  - Implemented `scripts/monitor-edge.mjs` executing automated synthetic probes against the live edge deployment.
  - Probes root security headers, canonical route HTTP 200 responses, 301 redirects, RFC 9116 security disclosure, soft-404 rejection (returns true HTTP 404), and AI discovery documents.
- [x] **8.3 Automated CI/CD Gating in GitHub Actions** [DONE - Deployed & verified]
  - Integrated `node scripts/verify-build.mjs` into `.github/workflows/ci.yml` (Web job) and `.github/workflows/deploy-pages.yml` (prior to Cloudflare Pages deployment).
  - Added `npm run test:verify`, `npm run test:edge`, and `npm test` scripts to `web/package.json`.
- [x] **8.4 Zero-Redirect Edge Prerendering (Dual Emit)** [DONE - Deployed & verified]
  - Configured `scripts/prerender.mjs` to emit both `dir/index.html` and flat `${route}.html` to ensure Cloudflare Pages serves canonical paths directly with HTTP 200 OK without intermediate 308 redirects.
- [x] **8.5 Cloudflare Pages Edge Deployment & Live Edge Verification** [DONE - Deployed & verified]
  - Deployed to Cloudflare Pages (`zoopnetwork.pages.dev`) and verified live edge HTTP 200, 301, and 404 responses along with security headers. All 18 edge probes passed with 0 errors.
