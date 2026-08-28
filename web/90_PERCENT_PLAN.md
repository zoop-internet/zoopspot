# ZOOP WEB — 90-100% PER-FEATURE EXECUTION PLAN
**Goal:** Every category 90-100. No metric <90 at final QA.

## Baseline scores (pre-fix)
UX 62, UI 71, Mobile 64, A11y 59, Content 55, CRO 48, SEO-T 42, SEO-C 58, AI 67, Trust 44, Brand 68, IA 60, Perf 63, Forms 61, Modern 66 => Overall 58

## Target scores (post-8 iterations)
All 92-98. Overall 95.

## Architecture guardrails
- Keep Vite + React 19, no Next.js migration (risk). Add **prerender** via `vite-plugin-prerender-ready` + custom `scripts/prerender.mjs` that crawls routes and writes static HTML (meta/OG/JSON-LD baked). Alternative: Cloudflare Pages Functions with static HTML.
- Images: keep single source 1277x1231 but serve 3 sizes (32, 192, 512) WebP+PNG. Generate via `sharp`. Replace preload with responsive.
- Fonts: `font-display: swap`, subset Inter 400-800 only, preload woff2.
- No design-system rewrite — extend tokens.

---

### ITERATION 1 — CRITICAL FOUNDATIONS (P0) — target: SEO 90, Perf 92
**Acceptance:** `curl https://zoop.network/downloads | grep -q "<title>Download"` passes; LCP <1.8s, no 743kB eager.

- [ ] 1.1 Create `scripts/prerender.mjs` — uses `dist/index.html` template, replaces title/desc/og/json-ld/canonical per `ROUTE_META` (from `App.tsx:14`). Writes `dist/downloads/index.html` etc. Add to `package.json:build` as `tsc -b && vite build && node scripts/prerender.mjs`
- [ ] 1.2 Update `index.html:8` — add `font-display` via link `&display=swap` (already has but add `preload` woff2), add `fetchpriority=high` to hero, remove `preload` of 743kB png, replace with 32px icon + 192 manifest
- [ ] 1.3 Generate optimized images: `public/zoopicon-32.webp/png`, `zoopicon-192.webp/png`, `zoopicon-512.webp`, `og-image.png` (1200x630) + `og-image.webp`. Use `sharp` at build. Update `index.html:26,50,59`, `manifest.webmanifest`
- [ ] 1.4 Fix `public/_redirects` keep SPA fallback but ensure prerendered dirs are static (Cloudflare Pages respects files first)
- [ ] 1.5 Fix `sitemap.xml` add `lastmod`, add `/pricing` if created, add `xhtml:link hreflang`
- [ ] 1.6 Add `public/.well-known/ai-plugin.json` optional, verify `llms.txt` + `ai.txt` linked from footer
- [ ] 1.7 Build + verify

### ITERATION 2 — A11Y WCAG 2.2 AA (P0) — target: 96
- [ ] 2.1 Brand button key handling (Space), SVG title, drawer focus trap, escape, aria-expanded
- [ ] 2.2 PIN boxes: aria-invalid, aria-describedby, live region for error
- [ ] 2.3 Tables: add <caption> visually hidden, scope="col"
- [ ] 2.4 Contrast: darken `--muted` from #8b9bb0 to #93a3b8 on dark? Actually test; adjust surface-card text to 4.5:1. Update tokens.
- [ ] 2.5 Focus ring always visible, skip link already done, add `inert` to main when drawer open
- [ ] 2.6 axe-core CI

### ITERATION 3 — UX/UI + IA (P1) — target: UX 95, UI 94, IA 95
- [ ] 3.1 Hero rewrite (5s value prop) — new H1/H2/CTA hierarchy, proof line, live demo link. Reduce illustration 50%→42%, add perf tooltip.
- [ ] 3.2 Move Trust Bar under hero, add logos (GitHub stars, WireGuard)
- [ ] 3.3 Add Comparison table section (VPN vs Zoop vs Tailscale) between Steps and Pricing
- [ ] 3.4 IA: add `/pricing` route + footer links, add `/docs` stub redirect to GitHub docs, add Legal pages (Privacy, Terms) modals
- [ ] 3.5 Unify button radius 8px, nav active state, card hover

### ITERATION 4 — MOBILE EXCELLENCE (P1) — target: 95
- [ ] 4.1 Drawer a11y + backdrop + swipe, background-attachment scroll globally, node responsive, toast offset for bottom nav
- [ ] 4.2 Touch targets 44px, secondary pricing cards full-width
- [ ] 4.3 Sticky CTA hides when drawer open, respects safe-area, dismiss persists in sessionStorage
- [ ] 4.4 `MobileBottomNav` 56px + safe-area, test 320,375,414,768

### ITERATION 5 — CRO & TRUST (P1) — target: CRO 94, Trust 96
- [ ] 5.1 Pricing: replace "Coming soon" with `$8/mo seat`, waitlist email input with validation + POST placeholder + success state + founding price lock. Add FAQ under pricing.
- [ ] 5.2 Downloads: if `VITE_RELEASES_BASE` set, link to real GitHub releases; else honest "Join waitlist for early binary" + copy install command + verify checksum. Remove placebo toast or keep honest.
- [ ] 5.3 Testimonials: remove disclaimer, add 2 verifiable GitHub contributors (link to GH profile), + star count live (fallback static), add "Used by" micro-logos
- [ ] 5.4 Security: add audit badge, "No logs" guarantee, link to SECURITY.md, 30-day refund/trust footer

### ITERATION 6 — CONTENT & BRAND (P1) — target: Content 94, Brand 93
- [ ] 6.1 Rewrite weak headlines (Hero, Steps 3, CTA banner), add objection FAQ item
- [ ] 6.2 Security page depth: add threat model table, key storage (0600), replay protection, IPAM details
- [ ] 6.3 Voice: consumer landing vs infra docs split — add glossary abbr tooltips

### ITERATION 7 — FORMS & INTERACTIONS (P1) — target: 93
- [ ] 7.1 Auth: add "Forgot PIN? Restore with device key" flow (already exists but promote), add recovery email optional, add strength hint
- [ ] 7.2 Validation: inline success, shake only on error, disable submit until valid, show retry after 3 fails
- [ ] 7.3 Empty states: add illustration + CTA for no devices/no shares, skeleton loaders for tables
- [ ] 7.4 Toast system unify (portal + landing)

### ITERATION 8 — MODERN STANDARDS & POLISH (P0) — target: 96
- [ ] 8.1 OG image generate + verify `og:image:width 1200`, add `twitter:image` webp fallback
- [ ] 8.2 PWA: update manifest categories, add `screenshots`, `shortcuts` (Open Console, Downloads)
- [ ] 8.3 Add `humans.txt` polish, `_headers` with CSP, `Cache-Control`
- [ ] 8.4 Final build + Lighthouse CI thresholds (Perf 90, A11y 100, SEO 100, Best Practices 100)
- [ ] 8.5 Scorecard regenerate

## Verification matrix (each iteration)
- `npm run build` passes
- `npm run lint` 0 errors
- axe 0 critical
- Lighthouse CI thresholds
- Manual 375/768/1280 + keyboard nav + screen reader
- curl per route title check
