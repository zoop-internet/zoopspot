# Zoop Website — Improvement Roadmap
**From 60.4 → ≥90.0 average** — 10 categories

> Every finding from `WEBSITE_AUDIT.md` is converted to an actionable task with outcome, priority, complexity, effort, deps, acceptance criteria. Grouped into 5 sprints.

---

## Task Schema Legend
- **Priority:** P0 Critical / P1 High / P2 Medium
- **Complexity:** S (≤1h) / M (1-4h) / L (4-8h)
- **Effort:** story points

---

## Sprint 1 — Critical Foundations (P0)

### S1-01 — SEO Foundation Meta Package
- **Problem:** Generic title/description, no OG/Twitter/canonical/theme-color, no manifest (`SEO-01..04, 08-09`)
- **Outcome:** Click-worth + share-ready previews on Google/X/Slack; no CLS
- **Priority:** P0 **Complexity:** S **Effort:** 2 **Deps:** none
- **Accept:** Title 50-60 ch with value prop, desc 150-160 ch with keywords+CTA, OG image 1200×630, `theme-color`, `preconnect` to fonts, `width/height` on imgs, `rel=canonical`.
- **Files:** `web/index.html`, `web/public/manifest.webmanifest`

### S1-02 — Robots & Sitemap
- **Problem:** No `robots.txt`/`sitemap.xml` (`SEO-05`)
- **Outcome:** Crawlable & indexable
- **Priority:** P0 **Complexity:** S **Effort:** 1
- **Accept:** `public/robots.txt` allows GPTBot/ClaudeBot/Perplexity, sitemap lists /, /how-it-works, /products, /downloads, /security, /auth.
- **Files:** `public/robots.txt`, `public/sitemap.xml`

### S1-03 — WCAG Contrast + Token Fix
- **Problem:** `--text-muted #505668` 2.8:1 fails AA (`A11Y-02`, `UI-01`)
- **Outcome:** All text ≥4.5:1 (7:1 for muted), AA pass
- **Priority:** P0 **Complexity:** S **Effort:** 2
- **Accept:** `--text-muted` → `#8b9bb0` (7.2:1 on #0f1117), `--text-secondary` → `#b6bcc3` (>4.5:1), verified via contrast checker.
- **Files:** `src/index.css`, `src/AdminConsole.css`

### S1-04 — Landmarks + Skip Link + Heading Hygiene
- **Problem:** No skip link, no `<main>/<nav>/<header>/<footer>` landmarks, heading jumps (`A11Y-01,03,07`, `PERF-08`)
- **Outcome:** Screen reader navigable, tab stop #1 skips to main
- **Priority:** P0 **Complexity:** M **Effort:** 3
- **Accept:** `SkipLink` component, landing uses `<main id="main-content">` + `<nav aria-label>`, tab dashboards use `<main>` + `<section aria-labelledby>`, heading order h1→h2→h3 validated. All interactive SVGs `aria-hidden`.
- **Files:** `src/components/SkipLink.tsx` (new), `src/App.tsx`, `src/landing/*`, `src/app/**/*`, `src/admin/*`

### S1-05 — Vite Performance Baseline
- **Problem:** No code split, fonts @import blocks, unoptimized PNG (`PERF-01..05`)
- **Outcome:** Faster LCP, smaller JS, non-blocking fonts
- **Priority:** P0 **Complexity:** M **Effort:** 3 **Deps:** S1-01 (preconnect)
- **Accept:** `vite.config.ts` with `manualChunks` (vendor, landing, app), `build.target esnext`, `cssCodeSplit`, `<link preconnect>` moved from CSS @import to head, font `display=swap` via link not import, image `loading=lazy` where offscreen, `zoopicon` webp variant noted.
- **Files:** `vite.config.ts`, `index.html`, `landing/*`

### S1-06 — Mobile Nav & Touch Targets Fix
- **Problem:** Missing touch targets, bottom nav absent for user (`MOB-01,02`)
- **Outcome:** 44px min targets, thumb-reachable nav on phone
- **Priority:** P0 **Complexity:** M **Effort:** 4
- **Accept:** User + Admin both have bottom-tab on ≤768, `btn-xs` min 32×32 with 44 hit area via padding, `background-attachment: scroll` on mobile, auth card `max-width 440` fits 320 viewport.
- **Files:** `src/index.css`, `src/admin/AdminConsole.css`, `src/app/**/*`

---

## Sprint 2 — High-Impact UX & Conversion (P1)

### S2-01 — Onboarding Empty States + Guided Start
- **Problem:** First-time user sees "Not registered" dead end (`UX-01`)
- **Outcome:** 3-step wizard context in empty states with value prop + next action
- **Priority:** P1 **Complexity:** M **Effort:** 3
- **Accept:** Every empty state has headline, 1-sentence benefit, primary CTA, illustration; no dead ends.
- **Files:** `src/app/user/*`, `src/app/org/*`

### S2-02 — Loading Skeletons
- **Problem:** Spinners only (`UX-02`)
- **Outcome:** Perceived speed + CLS avoidance
- **Priority:** P1 **Complexity:** M **Effort:** 2
- **Accept:** `SkeletonTable`, `SkeletonMetrics` components replace spinner during initial load; shimmer 1.2s.
- **Files:** `src/components/Skeleton.tsx` (new), dashboards

### S2-03 — Error Boundaries + Inline Validation Live Regions
- **Problem:** White screen on crash, validation not announced (`UX-04,05`)
- **Outcome:** Graceful fallback + SR announces errors immediately
- **Priority:** P1 **Complexity:** M **Effort:** 3
- **Accept:** `ErrorBoundary` wraps portal content, `aria-describedby` links inputs to `field-feedback` with `role=alert`, `aria-live="polite"` for success.
- **Files:** `src/components/ErrorBoundary.tsx` (new), `src/auth/*`, `src/app/**/*`

### S2-04 — Workspace Switcher Keyboard Full Support
- **Problem:** No arrow navigation (`UX-03`, `A11Y-04`)
- **Outcome:** WAI-ARIA listbox pattern fully operable by keyboard
- **Priority:** P1 **Complexity:** M **Effort:** 2
- **Accept:** ArrowUp/Down, Home/End, Enter, Escape, Tab close; roving `tabIndex`, focus return; tested via keyboard.
- **Files:** `src/components/WorkspaceSwitcher.tsx`

### S2-05 — Trust & Conversion Block Upgrade
- **Problem:** No social proof, pricing vague, CTA not sticky (`CRO-01..07`)
- **Outcome:** Increased signup CTR; trust at auth/PIN moment
- **Priority:** P1 **Complexity:** L **Effort:** 5
- **Accept:** Landing adds: trusted-by bar (OSS stars, WireGuard badge, MIT), pricing comparison mini table (Free vs Teams), sticky bottom CTA after 60% scroll (dismissible), auth adds trust row (shield + "End-to-end encrypted · No tracking · Open source" + links), download hierarchy: primary gradient, secondary neutral clearly different.
- **Files:** `src/landing/LandingPage.tsx/.css`, `src/auth/AuthPage.tsx`

### S2-06 — Download Realism & CTA Hierarchy
- **Problem:** Mock downloads, hierarchy weak (`UX-06`, `CRO-07`)
- **Outcome:** Honest pending state, clear primary action
- **Priority:** P1 **Complexity:** S **Effort:** 2
- **Accept:** Toast says "Builds rolling out — join waitlist" with email capture (local only), primary btn larger + icon; secondary list collapses into details.
- **Files:** `src/landing/*`

---

## Sprint 3 — UI Refinement (P2)

### S3-01 — Elevation & Shadow System Documented
- **Priority:** P2 **Complexity:** S **Effort:** 1
- **Outcome:** `--elevation-1..3` tokens replace ad-hoc shadows
- **Accept:** `index.css` defines 3 elevations, all cards use them.
- **Files:** `src/index.css`

### S3-02 — Focus & Motion System
- **Problem:** `prefers-reduced-motion` missing, focus low contrast (`UI-03,05`, `A11Y-10`)
- **Outcome:** Reduced-motion users see no infinite animations, focus visible 3:1
- **Priority:** P2 **Complexity:** S **Effort:** 2
- **Accept:** `@media (prefers-reduced-motion: reduce)` disables pulse, counter, dash; focus ring 2px with `outline-offset` + shadow.
- **Files:** `src/index.css`, `src/landing/LandingPage.css`

### S3-03 — Icon Grid & Typography Polish
- **Priority:** P2 **Complexity:** S **Effort:** 1
- **Accept:** Icon sizes normalized to 14/16/18/20, text `line-height` 1.6 consistent, tabular-nums on metrics.

### S3-04 — Empty State Illustration Consistency
- **Priority:** P2 **Complexity:** S **Effort:** 2
- **Accept:** All empty states share `empty-icon` + `h3` + `p` + CTA structure; no bare text tables.

---

## Sprint 4 — SEO / Content / AI Readiness (P1)

### S4-01 — JSON-LD Structured Data
- **Problem:** No schema (`SEO-06`, `AI-05`)
- **Outcome:** Rich results + LLM citation ready
- **Priority:** P1 **Complexity:** M **Effort:** 3
- **Accept:** `index.html` injects `Organization` + `SoftwareApplication` JSON-LD; landing FAQ injects `FAQPage` JSON-LD.
- **Files:** `public/schemas/*` or inline in `index.html` & `LandingPage.tsx`

### S4-02 — FAQ Section (Human + LLM)
- **Problem:** No Q/A chunkable content (`AI-02,03`)
- **Outcome:** 6 FAQs answer "What is Zoop vs VPN?", "Is it private?", "Does it work behind NAT?" etc.
- **Priority:** P1 **Complexity:** M **Effort:** 3
- **Accept:** `<section aria-labelledby="faq-heading">` with `<details>` or accordion, each Q as `h3`, FAQPage JSON-LD mirrors text verbatim.
- **Files:** `src/landing/LandingPage.tsx/.css`

### S4-03 — Content Depth & Jargon Glossing
- **Problem:** Security thin, jargon unexplained (`Content Quality`)
- **Outcome:** Security adds 80-word "How we encrypt" explainer; tooltips for STUN/CGNAT
- **Priority:** P1 **Complexity:** S **Effort:** 2
- **Accept:** Security page 2× content; `abbr title="STUN — ..."` used.
- **Files:** `src/landing/LandingPage.tsx`

### S4-04 — llms.txt + ai.txt + Humans.txt
- **Problem:** No AI crawler guidance (`AI-01,04`)
- **Outcome:** LLM harvestable summary
- **Priority:** P1 **Complexity:** S **Effort:** 1
- **Accept:** `public/llms.txt` (Markdown summary of Zoop + links + FAQ), `public/ai.txt`, `public/humans.txt`, `robots.txt` references.
- **Files:** `public/llms.txt`, `public/ai.txt`, `public/humans.txt`

### S4-05 — Per-Route SPA Meta (Prerender-ready)
- **Problem:** All routes share same meta (`SEO-10`)
- **Outcome:** Router updates `document.title` + `meta description` per `currentPath`
- **Priority:** P1 **Complexity:** S **Effort:** 2
- **Accept:** `LandingPage.tsx` effect switches title/desc for /downloads, /security etc.; test nav updates head.
- **Files:** `src/landing/LandingPage.tsx`, `src/App.tsx`

---

## Sprint 5 — Final Optimization & QA (P0)

### S5-01 — Performance Budget & Lazy Splits
- **Problem:** Single chunk, heavy landing SVG eager (`PERF-01,06`)
- **Outcome:** Landing <180KB JS, dashboards lazy
- **Priority:** P0 **Complexity:** M **Effort:** 3 **Deps:** S1-05
- **Accept:** `React.lazy(() => import('./landing/...'))` for each route, `Suspense` fallback skeleton; Lighthouse Perf ≥90.
- **Files:** `src/App.tsx`, `vite.config.ts`

### S5-02 — Accessibility Full Pass & Axe-like Manual
- **Priority:** P0 **Complexity:** M **Effort:** 4
- **Accept:** Run checklist: Tab through every page without mouse, modal focus trap + Escape, screen reader landmark announced, color contrast ≥4.5:1, forms error-linked. Fix residuals.
- **Files:** all

### S5-03 — Mobile E2E (320/375/768/1024)
- **Priority:** P0 **Complexity:** S **Effort:** 2
- **Accept:** No horizontal overflow, bottom nav reachable, inputs not zoomed (16px), table cards stack on 320.
- **Files:** `src/index.css`, `src/landing/LandingPage.css`

### S5-04 — Content Proof & Microcopy Sweep
- **Priority:** P2 **Complexity:** S **Effort:** 1
- **Accept:** No typos, consistent sentence case, date formatting `en-US`, testimonial disclaimer "(Illustrative — community feedback)".

### S5-05 — Re-Score + CHANGELOG + Maintenance Plan
- **Priority:** P1 **Complexity:** S **Effort:** 2
- **Accept:** Fill `FINAL_REPORT` with Before/After table all ≥90, list closed issues, maintenance cadence.

---

## Dependencies Graph

```
S1-01 → S1-05 → S5-01
S1-03 → S5-02
S1-04 → S5-02
S1-06 → S5-03
S2-04 → S5-02
S4-01 + S4-02 → S5-02 (AI validation)
S4-05 → S1-01 complements
```

## Risk Register
- **Over-darkening muted text** may look harsh → test AA not AAA overkill, keep secondary softer but passing.
- **Bottom tab addition** adds JS weight → keep CSS-only as much as possible.
- **llms.txt** new spec unstable → reference https://llmstxt.org/ minimal required fields only.
