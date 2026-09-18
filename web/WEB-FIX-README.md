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
- [ ] **1.1 Fix Soft-404 in `_redirects` & generate `dist/404.html`**
  - Update `scripts/prerender.mjs` to emit `dist/404.html` with full styling and HTTP 404 response capability.
  - Update `public/_redirects` to only proxy explicit SPA client-side routes (`/app/*`, `/org/*`, `/admin/*`) to `/index.html 200`. Unmatched requests drop to `404.html` natively.
- [ ] **1.2 Update `robots.txt` Disallow directives**
  - In `scripts/prerender.mjs` and `public/robots.txt`, disallow `/app/`, `/org/`, `/admin/`, and `/api/`. Preserve AI bot allowances (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`).
- [ ] **1.3 Clean `public/sitemap.xml`**
  - Replace any remaining references to `zoop.network` with `https://zoopinternet.app`.
  - Remove private `/app` from public sitemap.
- [ ] **1.4 Disambiguate `/architecture` & `/how-it-works`**
  - Update `scripts/prerender.mjs` and `src/App.tsx` so `/architecture` has a distinct technical title and description, and self-canonicalizes to `https://zoopinternet.app/architecture`.

### Phase 2: On-Page SEO & Content Quality
- [ ] **2.1 Semantic Navigation Anchors**
  - In `src/landing/LandingPage.tsx`, convert topbar nav buttons and mobile drawer buttons to `<a href="...">` elements while keeping SPA navigation with `e.preventDefault(); handleNav('/...');`.
  - In footer links, add `href` attributes to all `<a>` tags (e.g. `href="/products"`, `href="/downloads"`).
- [ ] **2.2 Eliminate Nested `<main>` Elements**
  - In `src/landing/LandingPage.tsx`, replace nested `<main className="lp-page-wrapper">` tags with `<div className="lp-page-wrapper">` across Pricing, Downloads, HowItWorks, Products, Security, Privacy, and Terms views.
- [ ] **2.3 Prerender Fallback Content into `<div id="root">`**
  - In `scripts/prerender.mjs`, insert route-specific semantic HTML (H1, route summary paragraph, and primary links) into `<div id="root">` so non-JS scrapers receive rich indexed text.

### Phase 3: AI-Search Visibility (AEO/GEO) & Structured Data
- [ ] **3.1 Update AI Knowledge Documents**
  - In `public/llms-full.txt`, `public/llms.txt`, `public/ai.txt`, and `public/humans.txt`, update all references from `zoop.network` to `https://zoopinternet.app`.
  - Remove deprecated `FAQPage` schema references.
- [ ] **3.2 Add Schema.org `WebSite` Definition**
  - In `index.html` and `scripts/prerender.mjs`, add `WebSite` JSON-LD schema with site name, URL, and search/publisher attributes.
- [ ] **3.3 Multi-tier Breadcrumb for Documentation**
  - In `scripts/prerender.mjs`, update docs breadcrumbs to include the parent `/docs` hierarchy (`Home` -> `Docs` -> `Page`).

### Phase 4: Core Web Vitals & Performance
- [ ] **4.1 Replace 743 KB Logo with Optimized WebP**
  - In `src/landing/LandingPage.tsx` (line 787), replace `/zoopicontransparent.png` with `/zoopicon-32.webp` (or `/zoopicon-192.webp`).
  - Update similar usages in `src/admin/AdminConsole.tsx`, `src/app/org/OrgDashboard.tsx`, `src/app/user/UserDashboard.tsx`, and `src/auth/AuthPage.tsx`.
- [ ] **4.2 Remove `og-image.webp` Preload**
  - In `index.html`, remove `<link rel="preload" href="/og-image.webp" ...>`.
- [ ] **4.3 Eliminate Artificial 180ms Navigation Latency**
  - In `src/landing/LandingPage.tsx` (`handleNav`), trigger `onNavigate(path)` immediately rather than deferring inside a 180ms `setTimeout`, boosting INP score.

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
