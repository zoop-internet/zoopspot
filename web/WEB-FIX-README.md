# Zoop Internet — Web Remediation Plan (`web/`)
**Target Host:** `zoopinternet.app` (`zoopnetwork.pages.dev`)  
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
  - Replaced legacy `zoop.network` with `https://zoopinternet.app` across all URLs.
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
  - In `public/llms-full.txt`, `public/llms.txt`, `public/ai.txt`, and `public/humans.txt`, updated all references from `zoop.network` to `https://zoopinternet.app`.
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
- [ ] **5.1 404 Experience Upgrade**
  - Enhance `NotFound` component in `src/App.tsx` and `dist/404.html` with clean brand header, search/recovery cards, and home navigation.
- [ ] **5.2 Interactive Element Focus States**
  - In `src/landing/LandingPage.css`, add explicit `:focus-visible` styling to `.lp-device-node` and nav links.

### Phase 6: Accessibility (WCAG 2.2 AA)
- [ ] **6.1 Accessible Media & Decorative Icons**
  - Audit all `<img>` tags in `LandingPage.tsx` to ensure decorative icons have `aria-hidden="true"` and informative images have descriptive `alt`.
- [ ] **6.2 Contrast Optimization**
  - In `src/index.css` and `src/landing/LandingPage.css`, adjust low-contrast secondary text (`#64748b` -> `#94a3b8`) to ensure at least 4.5:1 contrast against `#020617` and `#0a0e14`.

### Phase 7: Security & Trust Signals
- [ ] **7.1 Add HSTS to `_headers`**
  - Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` to root rules.
- [ ] **7.2 Add COOP to `_headers`**
  - Add `Cross-Origin-Opener-Policy: same-origin`.
- [ ] **7.3 Standardize GitHub Repository Links**
  - Update public GitHub URLs from `https://github.com/allannuwamanya/zoop` to `https://github.com/zoop-internet/zoop`.

### Phase 8: Verification & Monitoring Setup
- [ ] **8.1 Automated Build Verification Script**
  - Create `scripts/verify-build.mjs` to check:
    1. Existence of all 24 prerendered route directories.
    2. Non-empty `<div id="root">` content in prerendered HTML files.
    3. `dist/sitemap.xml` validity and route synchronization.
    4. `dist/404.html` presence.
    5. `dist/robots.txt` disallow directives.
    6. No asset in initial bundle exceeding 100 KB.
- [ ] **8.2 Cloudflare Pages Edge Deployment & curl Verification**
  - Deploy with Wrangler and test headers (`curl -sI https://zoopnetwork.pages.dev/`).
