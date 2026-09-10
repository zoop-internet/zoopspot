# Zoop Web — Complete Website Improvement Blueprint

> **Master Review, Redesign & Optimization Roadmap — 14 Iterations**
> Scope: `web/` (React 19 + TypeScript + Vite, Cloudflare Pages)
> Owner: Lead Product + UX + UI + Frontend Architect + CRO + SEO + A11y
> Status: **Plan — Ready to Execute** (no code changed yet)
> Created: 2026-09-10 · Source of truth: this file
> How to use: Execute iterations **in order 1→14**. Each iteration is self-contained, shippable, and includes acceptance criteria. Do not skip ahead — later iterations depend on design tokens, routing, and a11y foundations.

This is **not an audit report**. Every problem listed below includes its exact fix, file-level implementation path, and the improved version. The team can execute directly from this document.

---

## Table of Contents

1. [Principles & Constraints](#principles--constraints)
2. [How to Read Each Iteration](#how-to-read-each-iteration)
3. [Current State Snapshot (Evidence)](#current-state-snapshot-evidence)
4. [Iteration 1 — User Experience (UX)](#iteration-1--user-experience-ux)
5. [Iteration 2 — User Interface Design (UI)](#iteration-2--user-interface-design-ui)
6. [Iteration 3 — Mobile Experience](#iteration-3--mobile-experience)
7. [Iteration 4 — Accessibility (WCAG 2.2 AA)](#iteration-4--accessibility-wcag-22-aa)
8. [Iteration 5 — Content Quality](#iteration-5--content-quality)
9. [Iteration 6 — Conversion Rate Optimization (CRO)](#iteration-6--conversion-rate-optimization-cro)
10. [Iteration 7 — SEO (Technical + Content)](#iteration-7--seo-technical--content)
11. [Iteration 8 — AI Search Readiness](#iteration-8--ai-search-readiness)
12. [Iteration 9 — Trust & Credibility](#iteration-9--trust--credibility)
13. [Iteration 10 — Brand Experience](#iteration-10--brand-experience)
14. [Iteration 11 — Information Architecture](#iteration-11--information-architecture)
15. [Iteration 12 — Performance Experience](#iteration-12--performance-experience)
16. [Iteration 13 — Forms & Interactions](#iteration-13--forms--interactions)
17. [Iteration 14 — Modern Web Standards](#iteration-14--modern-web-standards)
18. [Cross-Cutting Execution Plan](#cross-cutting-execution-plan)
19. [Definition of Done (Global)](#definition-of-done-global)
20. [Metrics & KPIs](#metrics--kpis)
21. [Risk & Out-of-Scope](#risk--out-of-scope)
22. [Immediate Next Step](#immediate-next-step)

---

## Principles & Constraints

1. **Design tokens are law.** All color, type, spacing, radius, elevation come from `src/index.css` `:root`. No ad-hoc hex.
2. **Dark-first, AA contrast.** Every text/background pair ≥ 4.5:1 (`#9aa8bd` on `#0f1117` is 6.1:1 — current fix). Keep it.
3. **One app, three portals, one router.** `landing` (marketing), `app/user` + `app/org` (member), `admin` (operator), `auth` (identity). Navigation is file + URL driven, never local-state-only.
4. **Content is not code.** Marketing copy, docs, pricing, FAQs live as data/markdown, not hardcoded TSX strings.
5. **Ship shippable.** Each iteration ends with a deployable Pages preview. No iteration breaks another.
6. **Measure, don't guess.** Every iteration has 2–3 KPIs (see end).

Constraints: No backend changes required until Iteration 8+. Web may add `public/sitemap.xml` and `public/llms.txt` generation without cloud changes. Auth remains WebCrypto Ed25519; do not regress to cookies.

---

## How to Read Each Iteration

Every iteration follows the **mandatory 8-part format**:

- **What is wrong** — concrete defect
- **Why it matters** — user/business impact
- **Evidence** — `file:line` from current codebase
- **Impact** — severity (Critical/High/Medium) + who hurts
- **Priority** — P0 (blocker) → P2 (polish) and sequence rationale
- **Exact solution** — design + engineering fix (no vagueness)
- **Improved version** — what the user will see/behavior
- **Implementation guidance** — files to touch, components to create, acceptance criteria, QA script

---

## Current State Snapshot (Evidence)

Snapshot taken from `web/src/App.tsx`, `web/src/landing/LandingPage.tsx` (~1800 lines), `web/src/app/user/UserDashboard.tsx`, `web/src/admin/AdminConsole.tsx`, `web/src/auth/AuthPage.tsx`, `web/src/api/client.ts`, `web/src/context/NetworkContext.tsx`, `web/index.html`, `web/src/index.css` (~1496 lines), `vite.config.ts`.

| Area | Evidence | Consequence |
|---|---|---|
| **Routing** | Manual `window.history.pushState` + `popstate` + `normalizePath()` in `App.tsx:32`, `VALID_ROUTES:42` set, no library, invalid route falls back to landing with `console.warn` instead of real 404 HTTP 404 | Unbookmarkable tabs (dashboard tabs are local state), SEO crawlers see SPA shell only, back-button jank, prerender misses docs sub-routes |
| **Monolith** | `LandingPage.tsx` holds hero + docs parser + downloads + pricing + security + waitlist + bent-arrow SVG; `mdToHtml():202` uses `dangerouslySetInnerHTML` + regex tabling + `document.addEventListener('click')` for `.docs-copy` delegation | Bundle bloat despite `vite.config.ts:23` manualChunks; maintainability poor; XSS surface; copy delegation leaks |
| **Dashboard UX** | `UserDashboard.tsx:28` `type UserTab = 'overview'…` driven by `useState`, no URL; `DevicesTab` search is local filter only; refresh logic in `NetworkContext.tsx` refetches all | Tab deep-links impossible, support links break, refresh loses context, share/connect flow needs mental model |
| **Tokens drift** | `index.css:9` tokens + `LandingPage.css` + `AdminConsole.css` + `AuthPage.css` duplicate spacing/radius; landing=`lp-*`, portal=`portal-*`, admin overrides `--primary` amber via `.portal-admin:1081` | Visual inconsistency; admin amber accessible but not systematized |
| **Mobile** | `index.css:1425` drawer is fixed 280px translateX, `portal-content` padding-bottom only at `768px`, tables use `margin:0 -16px` scroll hack, landing `lp-nav-pill` vs drawer duplication | Thumb reach poor, tables clip, drawer focus trap incomplete |
| **A11y** | Skip link exists `index.html:87`, but `LandingPage` hero has image `alt` empty for brand, section headings skip levels, toggles `role` missing, toasts `role="status"` vs `alert` inconsistent, pin boxes use `opacity:0` hidden input (ok) but error announced via `role="alert"` only on some fields | Screen reader order broken, keyboard traps risk, contrast fixed but focus `box-shadow` low on amber |
| **Content** | Hero mixes consumer ("Share your home internet") with protocol jargon (Noise_IK, CGNAT) in same viewport; docs `CURATED_MD:297` hardcoded in TSX, not `docs/` files; pricing waitlist writes `zoop_waitlist` localStorage fallback fakes success | Cognitive load high, CMS impossible, CRO untrustworthy, SEO thin |
| **CRO** | CTAs: `Sign Up` primary + `Console` secondary duplicate; sticky CTA logic `scrolledPct >0.6 && <0.92` in `LandingPage.tsx:912` + `sessionStorage` dismissed; downloads use `VITE_RELEASES_BASE` empty → toast "early builds…"; demo `AuthPage.tsx:242` creates random `demo${rand}` account | Friction, trust gap, no proof, waitlist unvalidated against backend |
| **SEO** | `index.html:14` has static title/desc + JSON-LD, but `App.tsx:92` rewrites `document.title` client-side only; `scripts/prerender.mjs` prerenders 24 routes, no `sitemap.xml`, dynamic `/docs/:id` not mapped | Crawlers without JS see single title, docs invisible, hreflang static |
| **AI Search** | `/llms.txt` banner in docs, but `mdToHtml` output not wrapped in `<article>` with `itemProp`, no `FAQPage` schema, no `HowTo` for install steps, no entity disambiguation | Answer engines get low-confidence chunks |
| **Trust** | Footer: GitHub + 3 links, no address/team/certifications/testimonials/case studies; privacy/terms are landing sections, not canonical pages | First-time visitor perceives alpha risk |
| **Brand** | Cyan→teal icon avg `#0f5e58` vs `--primary:#0284c7` vs `--primary-hover:#38bdf8` trio ok, but gradients inconsistent across cards; radius `--r-md:8px` vs `--r-xl:14px` both used arbitrarily | Memory weak, consistency medium |
| **IA** | `VALID_ROUTES:42` aliases `/privacy-policy`→`/privacy`, `searchParams.get('tab')` only for auth; `WorkspaceSwitcher.tsx` mixes website→portal→admin as if workspaces | Mental model fragmented |
| **Perf** | `index.html:9` Google Fonts preconnect without `display=swap` preloaded? actually `swap` present but 2 families block; `og-image.webp` preload `fetchpriority=low` but 743kB eager risk; `LandingPage` `AnimatedCounter` uses rAF without `will-change`; docs `fetch(/docs/*.md)` waterfall per tab | LCP textual but font swap causes CLS, perceived slown weight |
| **Forms** | Auth PIN 6 boxes correct, but `handleSignUp` validates username via regex after stripping, phone `formatUgandaPhone:965` without `libphonenumber-js`; `WalletTab` withdraw `withdrawAmount` default 0, no min/step | Friction, errors late, iOS zoom not prevented |
| **Standards** | No router, no component lib, no CSS modules, `index.css` 1.5k global, no Storybook, no `oxlint` design-system rule, manifest present but SW not registered | Tech debt accrues, progressive enhancement minimal |

This snapshot is the backlog for the 14 iterations below.

---

## Iteration 1 — User Experience (UX)

**Scope:** Purpose clarity, value prop in 5s, journey, navigation, guidance, findability, steps, cognitive load, action obviousness.

**What is wrong**
- First-time visitor must infer "Zoop = VPN?" Hero headline competes with 3 bent arrows + central hub + 4 device nodes; value prop is 2 sentences below the fold. Navigation has 7 pill items (Overview, How It Works, Products, Docs, Pricing, Downloads, Security) — excessive.
- Customer journey not guided: Landing → Auth → /app Overview is linear, but /app tabs are stateful, not URL. User who bookmarks "Connections" gets Overview again.
- No decision support: Share vs Connect confusion (provider→recipient mental model repeated in code but not in UI copy). Empty states tell *what* but not *next step*.

**Why it matters**
UX confusion = drop before auth. Measured funnel: landing → auth → register. Each ambiguous choice loses 15–25% (industry). Current flow hides success criteria.

**Evidence**
- `LandingPage.tsx:1003` `activeRoute` + pill count 7; hero illustration occupies ~40vh on desktop, headline + subhead pushed.
- `UserDashboard.tsx:30` `NAV: … 'overview' … 'settings'` with `useState` tab, no `?tab=` URL sync. `SharingTab:753` `handleShare` form with `recipientId` text vs `select` conditional.
- `App.tsx:65` `navigateTo` pushes state but `LandingPage` docs nav uses `setActiveId` internal.

**Impact:** Critical. Hurts first-time visitor, potential customer, mobile scroller.

**Priority:** P0 — first. All later iterations assume guided journey.

**Exact solution**

1. **Hero contract (5-second rule):**
   - Headline: verb + outcome + timeframe. Keep existing SEO title but render hero as: `Share your home internet with any device — direct, private, in 30 seconds.` Subhead: `WireGuard® end-to-end. No VPN server in the middle. No tracking. Works behind NAT & CGNAT.`
   - Add **trust strip** below CTA: 4 pills as already in `AuthPage.tsx:501` but move to hero: `WireGuard® · Ed25519 · Open Source MIT · No Tracking` — with `aria-label="Trust signals"`.
   - Reduce nav pills to 4: `Product` (groups How It Works + Products), `Docs`, `Pricing`, `Downloads`. Keep `Security` as footer/footer anchor, not top nav.
2. **Guided journey (progressive disclosure):**
   - Landing primary CTA: `Get started free` → `/auth?tab=signup&next=/app&intent=register`. Secondary: `See how it works (60s)` → anchor to `#how-it-works` section with 3 steps numbered 01–03 (already in `OverviewTab:196` reuse).
   - Dashboard empty state (`OverviewTab:184` when `!deviceId`) keeps 3 cards but makes step 1 a **real button** that triggers `register` flow; steps 2–3 are disabled with `aria-disabled` + tooltip "Register to enable".
   - Rename tabs for jobs: `Overview → Home`, keep rest, add `Help` tab linking to `/docs/quickstart` (external but styled internal).
3. **Make actions obvious:**
   - Pair Share/Connect as two halves of same workflow: in `ConnectionsTab`, when `providers.length===0`, CTA now says `Authorize a provider first → Go to Sharing` (existing but restyle as primary outline + `Ico arrowRight`). In `SharingTab`, reverse hint: "After authorizing, the other device will see you in Connections".
   - Add persistent **context bar** at top of dashboard: `Current device: {deviceName} · {deviceId.slice(0,8)}… · {localMode? "via zoopd":"Web mode"}` with `Copy ID` — proven to reduce support tickets.

**Improved version**
Headline readable in one breath, 4 nav items, hero CTA pair + trust strip, docs section anchored, dashboard tabs deep-linkable (next iteration implements URL), empty states actionable, Share/Connect language unified ("Authorize → Connect").

**Implementation guidance**

- **Files:** `web/src/landing/LandingPage.tsx` (hero, nav pill, trust strip, anchor), `web/src/app/user/UserDashboard.tsx` (empty state buttons, context bar, tab renames), `web/src/components/SkipLink.tsx` keep, `web/src/index.css` add `.lp-trust-strip`, `.context-bar`.
- **Components:** `<TrustStrip />` (reusable from Auth), `<EmptyNextStep />`, `<ContextBar />`.
- **Acceptance:**
  - [ ] New user can state Zoop's purpose after 5s (5-user hallway test script included in QA).
  - [ ] Landing nav is 4 items on desktop, hamburger on mobile, auth still reachable.
  - [ ] Dashboard empty state step 1 is clickable, steps 2–3 disabled until register.
  - [ ] Share→Connect cross-link present and keyboard reachable.
- **QA script:** Load `/`, no scroll, ask 3 users "what does Zoop do?" — 3/3 correct. Click `Get started free` → `/auth?tab=signup&next=/app`. Register → `/app?tab=devices`? handled in Iteration 11.

---

## Iteration 2 — User Interface Design (UI)

**Scope:** Visual hierarchy, layout, type, color, spacing, alignment, components, cards, buttons, icons, consistency.

**What is wrong**
- Two design languages: landing (`lp-*` glass, cyan gradient) vs portal (`portal-*` sidebar, surface cards) vs admin amber override. Radii `8/12/14` used arbitrarily. Button `btn-primary` gradient differs from `lp-btn-primary`.
- Hierarchy flat: section headers all `0.8125rem 600`, metrics `1.75rem mono`, but docs `h1` not scaled. Icons are inline SVG per file, size prop drifts 14–22px.
- Cards: `.section` radius `14px` but internal `table-wrap` radius `0` then `has()` fix `visible !important` creates edge bleed.

**Why it matters**
Inconsistency reduces perceived trust (Hick + Aesthetic-Usability). Dev velocity suffers (which class to use?).

**Evidence**
- `index.css:9–69` tokens, but `LandingPage.css` repeats shadows; `AdminConsole.css` not tokenized; `AuthPage.css` own `.auth-card` shadow.
- `LandingPage.tsx:7` `Ico` size default 18 vs `UserDashboard.tsx:20` default 15 vs `AdminConsole.tsx:9` default 16.
- `index.css:625` `.section:has(.table-wrap) { overflow: visible !important; }` patch.

**Impact:** High. Affects every page, brand memory.

**Priority:** P0 — second. Iteration 1 copy relies on visual emphasis; 3 & 4 depend on tokens.

**Exact solution**

1. **Unify tokens (no drift):**
   - Promote `index.css` as sole source. Deprecate `LandingPage.css`/`AdminConsole.css` custom values: replace with tokens `—r-*`, `—elevation-*`, `—primary*`. Document mapping in comment block at top of `index.css` (already present) and add `CONTRIBUTING.md` note: "No new hex, use tokens".
   - Lock button styles: one `btn-primary` (gradient `38bdf8→34d399` everywhere), one `lp-btn-primary` aliases to it. Remove duplicate gradients. Add `btn-primary:focus-visible` with `outline-offset:2px` already defined — audit amber focus contrast (amber on dark needs `#fde68a` outline edge per token comment).
   - Radii: `–r-md:8` for inputs/buttons, `–r-xl:14` for cards, `–r-full:9999` for pills only. Audit and fix 6 outliers: `docs-sidebar`, `modal`, `empty-icon` (48→32, use `r-lg`).
2. **Hierarchy pass:**
   - Type scale: hero `clamp(2rem, 4vw, 3rem) 800`, section title `0.9375rem 600`, card title `1.0625rem 700`, body `0.875rem`, caption `0.75rem`. Update `index.css` `.modal-title`, `.page-title`, `.section-title`, `.docs-article h2/h3` to use scale.
   - Icon system: extract `src/components/iconDefs.tsx` as single registry, delete per-file `Ico` duplicates. Sizes: `12` (micro in pills), `16` (buttons), `20` (nav), `22` (empty). Add `Icon size=sm|md|lg` prop.
   - Card fix: `.section` stays `overflow:hidden`, `.table-wrap` gets `border-radius: 0 0 var(--r-xl) var(--r-xl)` explicitly instead of `visible !important`, delete the `has()` hack after verification.
3. **Modern patterns:** glass nav (`backdrop-filter: blur(18px)` already) kept; add subtle `inset` highlight on active nav; add `prefers-color-scheme` note: dark-only by design, no light mode (document).

**Improved version**
One button language, one icon size system, 3 radii used intentionally, hero/section scales distinct, cards seamless, focus states consistent cyan vs amber.

**Implementation guidance**

- **Files:** `web/src/index.css` (token audit, type scale, card radius fix), `web/src/components/iconDefs.tsx` (unify, add `sm|md|lg`), `web/src/landing/LandingPage.css`, `web/src/admin/AdminConsole.css`, `web/src/auth/AuthPage.css` (replace hard-coded shadows/colors with tokens), `web/src/components/Icon.tsx` (new wrapper if not using).
- **Acceptance:**
  - [ ] `grep -r "#0[0-9a-f]" web/src/*.css` returns zero raw hex outside `index.css` `:root`.
  - [ ] Visual diff: landing CTA, portal primary, admin primary share same gradient; radius on cards consistent.
  - [ ] `oxlint` passes, no duplicate `Ico` definitions.
- **QA:** Snapshot 3 breakpoints (1280/768/375) before/after, check focus ring on amber buttons with axe.

---

## Iteration 3 — Mobile Experience

**Scope:** Mobile-first, responsive, touch targets, nav, text, images, forms, tables, scrolling, conversion flow.

**What is wrong**
- Desktop-first portal: sidebar fixed 240px, main hidden behind drawer on mobile via `translateX(-100%)`; bottom nav appears at 768px but `portal-content` padding-bottom insufficient → last card hidden behind nav. Tables scroll with `margin:0 -16px` but header not sticky → lost context.
- Touch targets: `btn-xs:28px`, pin boxes `44px` ok but `WorkspaceSwitcher` options have 28px avatar + text but hit area only padding; landing download tiles secondary actions small.
- Forms: Inputs set `font-size:16px` only at 480px (`index.css:1476`) — iOS zoom still triggered at 768px web console.

**Why it matters**
50–70% traffic mobile. First-time mobile user must register in 30s or bounces.

**Evidence**
- `index.css:1367` `.mobile-bottom-nav { height:56px; display:none }` + `1387` `@media (max-width:768px){ display:block }`; `1365` `.portal-content, .admin-content { padding-bottom:56px }` only inside media — but `admin-body`/`page-body` also need.
- `UserDashboard.tsx:331` search input `width:160` fixed, not responsive.
- `AuthPage.tsx:352` `PinBoxes` boxes are `div` with `onClick` but hit area = box only, no larger tap target; `AuthPage.css` defines `pin-box height 44px` only under 480px.

**Impact:** High. Mobile conversion path blocked.

**Priority:** P0 — third. Depends on UI hierarchy; needed before a11y.

**Exact solution**

1. **Responsive shell (mobile-first):**
   - Flip `index.css` to mobile-first: base = stacked, then `@media(min-width:769px)` expands to sidebar. Keep existing as fallback but add logical ordering: load `bottom-nav` first, ensure `page-body` has `padding-bottom: calc(56px + env(safe-area-inset-bottom) + 16px)` always, not only in query. Add `scroll-padding-bottom`.
   - Sticky header: `page-header` and `admin-header` already sticky; add `position: sticky` to dashboard table `thead th` with `top:0` + `backdrop-filter` so scrolled tables keep headers. Wrap with `.table-wrap { position: relative }`.
   - Search: `DevicesTab` filter input becomes `flex:1 min-width:0` instead of `width:160`; add `input[type="search"]::-webkit-search-cancel-button` reset.
2. **Touch targets (44px):**
   - Enforce min `44px` hit area: all `.nav-item`, `.admin-nav-item`, `.mobile-bottom-nav-item`, `.portal-switcher-option` get `min-height:44px`, `padding-block:10px`. Verify via `axe - touch-target-size`.
   - Expand `PinBoxes` tap target: outer `pin-boxes` gets `padding:6px` and each `.pin-box` `min-height:48px` on all breakpoints, not just 480px.
   - Downloads: `DownloadItem` secondary actions (`LandingPage.tsx:847` `secondaryActions`) become `min-height:44px` pill, gap 8px, `flex-wrap:wrap`.
3. **Mobile conversion flow:**
   - Landing mobile CTA: sticky CTA (`LandingPage.tsx:912` `showStickyCta`) kept but ensure `z-index` above bottom nav, dismissible persists `sessionStorage`, test cross-landing navigation doesn't resurrect.
   - Auth mobile: ensure `AuthPage` PIN + username fields are `font-size:16px` on all widths (not just 480) — move rule up. Add `autocomplete="one-time-code"` already present, keep.

**Improved version**
Thumb-friendly bottom nav, sticky headers, 44px targets everywhere, tables scrolled with context, mobile register completes without zoom, no hidden cards.

**Implementation guidance**

- **Files:** `web/src/index.css` (mobile-first, sticky th, target sizes, safe-area), `web/src/components/MobileBottomNav.tsx` (verify `min-height:56px` + `aria-current`), `web/src/app/user/UserDashboard.tsx` (search flex), `web/src/auth/AuthPage.css` (pin sizes), `web/src/landing/LandingPage.tsx` (sticky CTA z-index, download pills).
- **Acceptance:**
  - [ ] Lighthouse mobile audit: tap targets 100%, no content behind nav at 375px, 390px, 768px.
  - [ ] Table header sticky on iOS Safari; search input does not zoom (font 16px enforced).
  - [ ] Pin boxes reachable with thumb, spacing 8px, error not clipped.
  - [ ] Manual: iPhone SE + Pixel + iPad pass.
- **QA:** Device lab checklist + Axe mobile.

---

## Iteration 4 — Accessibility (WCAG 2.2 AA)

**Scope:** Semantics, heading order, keyboard, SR, alt, contrast, focus, forms, errors, ARIA, motion, interactions.

**What is wrong**
- Heading hierarchy skipped: landing has multiple `h1` (`DocsView` sets `h1` per doc `docs-article`, plus hero `h1` on other sections). No `main` landmark per portal; `SkipLink` exists but `page-body` not focusable.
- Keyboard: mobile drawer traps incompletely (focus trap only on menuOpen effect, no `aria-modal` focus return), workspace switcher has `role="listbox"` but options not `aria-selected` consistently.
- Forms: auth errors set `fieldErrors` but only some fields `aria-describedby`, success checkmark inside `field-feedback` not announced; wallet phone input `+256` prefix not `aria-label`.

**Why it matters**
Legal AA requirement + 15% users with assistive needs; SEO also benefits.

**Evidence**
- `LandingPage.tsx:593` `DocsView` `useState` + `aria-live="polite"` on `docs-main` but `mdToHtml:224` outputs `h1/h2/h3` without ensuring single h1.
- `WorkspaceSwitcher.tsx:92` `aria-haspopup="listbox"` correct but `listRef` focus loop not handling `Tab` vs `ArrowDown`.
- `AuthPage.tsx:352` hidden `input` `aria-invalid` but `PinBoxes` visual boxes are `aria-hidden="true"` divs — SR reads only hidden input (good) but error `pin-error` class not tied to `aria-describedby`.
- `index.css:133` `prefers-reduced-motion` blanket `animation-duration:0.01ms` good but `AnimatedCounter:664` respects it only via manual `matchMedia` check — ok but inconsistent.

**Impact:** High. Renders product unusable for SR/keyboard.

**Priority:** P0 — fourth. Must before CRO; CRO proofs rely on reachable CTAs.

**Exact solution**

1. **Landmarks & headings:**
   - Enforce single `h1` per route: `LandingPage` hero = `h1`, docs article `h1` demoted to `h2` visually same size via CSS `.docs-article h1{font-size: var(--h1)}` but semantic `h2`. Add lint check: no `h1` inside `docs-article` beyond first.
   - Add `main` landmarks: `portal-content` wraps `page-header` + `main.page-body#main-content`, same for admin. `SkipLink.tsx` already `href="#main-content"` — ensure target `tabIndex={-1}` focusable.
   - Ensure doc TOC `toc:242` anchors are real `<a href="#slug">` that move focus via `document.getElementById(...).focus()` not just scroll.
2. **Keyboard & focus:**
   - Drawer: implement `focus-trap-react`-lite (no lib) → capture `Tab` loop inside `lp-mobile-drawer` (`LandingPage.tsx:1095` `role="dialog" aria-modal="true"` already) and return focus to `lp-menu-btn` on close. Same for `CommandPalette:127` in admin and modal in `UserDashboard` share dialog.
   - Workspace switcher: add `aria-activedescendant` + ensure `aria-selected` toggles with `ps-selected` class; fix `onListKeyDown:81` to handle `Enter` activation and `Escape` close already done.
   - Focus visible: verify amber portal focus `box-shadow:0 0 0 4px rgba(245,158,11,0.22)` meets 3:1 vs dark; add to `index.css:127` with `portal-admin :focus-visible` override if contrast fails.
3. **Forms & ARIA:**
   - Pass `describedBy` consistently: `AuthPage.tsx:328` `aria-describedby=fieldErrors.identifier ? '…-error':'…-hint'` — extend to PIN `PinBoxes:101` ensure hidden input has `aria-describedby` that includes both hint + error live region. Add `role="alert"` only on error containers, `role="status"` on success.
   - Phone: `WalletTab:1003` `depositPhone` input gets `<label for>` + `aria-describedby="phone-hint"` with format example `+256 70…`; add `inputmode="tel"`.
   - Reduced motion: keep `index.css:133` global reset, ensure `BentArrowMeshIllustration:716` SVG has `aria-hidden` glow + `prefers-reduced-motion` disables pulse animation (already via media but add explicit `.lp-bent-arrow-path { animation:none }` inside reduced query).
   - Contrast: verify `--text-secondary:#b6bcc3` (7.0:1) and `--text-muted:#9aa8bd` (6.1:1) already AA — keep; check amber `f59e0b` on `0f1117` (≈9.5:1 for text but focus ring needs 3:1 against background — use `#fde68a` ring).

**Improved version**
Single predictable `h1`, landmarked `main`, focus never lost on drawer/switcher, SR hears hint→error correctly, phone announced with format, motion-sensitive users see static fallback, keyboard-only register succeeds.

**Implementation guidance**

- **Files:** `web/src/landing/LandingPage.tsx` (heading demotion, drawer trap, TOC focus), `web/src/components/WorkspaceSwitcher.tsx` (aria-selected, trap), `web/src/auth/AuthPage.tsx` & `web/src/auth/AuthPage.css` (describedBy, roles), `web/src/app/user/UserDashboard.tsx` (phone fields, alert roles), `web/src/index.css` (focus override for amber, reduced-motion SVG), `web/src/components/SkipLink.tsx` (ensure target focus).
- **Acceptance:**
  - [ ] `axe-core` 0 violations AA on `/`, `/auth`, `/app`, `/admin` (run `npm run lint` + axe DevTools).
  - [ ] Keyboard-only flow: Tab through landing→open drawer→Tab loops→Esc returns→Tab to CTA→Enter navigates; register with Tab only succeeds.
  - [ ] SR (VoiceOver/NVDA) reads heading order 1→2→3, form hint then error, phone label correct.
- **QA:** Manual screen reader + keyboard matrix + Lighthouse a11y 100.

---

## Iteration 5 — Content Quality

**Scope:** Headlines, messaging, clarity, grammar, tone, readability, brand voice, structure, customer focus, missing info; rewrite weak content.

**What is wrong**
- Jargon bleed: hero speaks to consumers but docs/hero share vocabulary "Noise_IK, CGNAT, STUN" — alienates non-technical. Tone flips between marketing ("instant secure hotspot") and engineering ("100.64.0.0/10 /30").
- Content hard-coded in TSX (`LandingPage.tsx` hero strings, `CURATED_MD` object). No source of truth, no grammar check, inconsistent.
- Missing: "Who is Zoop not for?" objection handling, data limits, cost clarity (UGX vs USD), support channel (email/GitHub/issues).

**Why it matters**
Content is trust. Consumer sees jargon → assumes complex install. Business buyer needs constraints.

**Evidence**
- `LandingPage.tsx:250–295` `QUICKSTART_MD` includes table `|Var|Default|What|` but `docs/configuration:333` repeats same table with different wording; `security-architecture:488` says "cryptographic nonce and replay protection protocols" — accurate but not user-facing.
- `UserDashboard.tsx:192` empty-state bullets repeat `OverviewTab` trio but wording differs from landing hero 3 steps.
- `AuthPage.tsx:281` copy "Your Zoop ID and PIN unlock this device." vs docs "ZP-… + @username + PIN" — drift.

**Impact:** Medium (high for CRO). Clarity directly affects auth→register.

**Priority:** P1 — fifth. Depends on UX/brand but can parallelize.

**Exact solution**

1. **Content system:**
   - Move all human copy to `web/src/content/` as JSON/Markdown:
     - `content/hero.json` (`headline`, `subhead`, `ctaPrimary`, `ctaSecondary`, `trust` array)
     - `content/how-it-works.json` (3 steps: title, desc, icon, proof)
     - `content/pricing.json`, `content/faq.json` (structured Q&A for schema)
     - Docs `QUICKSTART_MD` etc. moved to `public/docs/*.md` and `content/docs-manifest.json` (source for `DOCS_SECTIONS`).
   - Add `content/voice.md` guide: Zoop voice = "Direct, plain, private. No hype, no tracking, no jargon unless in Security page." Provide do/don't table.
2. **Rewrite passes (in place):**
   - **Hero (consumer):** headline `Share your home internet with your laptop and family — direct, encrypted, in 30 seconds.` Subhead `Zoop creates a private tunnel between your devices. No VPN server in the middle. Works behind home routers and mobile networks.` (remove CGNAT acronym here; keep in Docs/NAT)
   - **How It Works 3 steps:** *1 Register → 2 Authorize → 3 Connect* — each with 1-line plain + "Learn more" link to docs. Reuse same 3 across landing + dashboard empty state.
   - **Security page:** split into "For everyone" (plain: "End-to-end encrypted, relays can't read") + "For engineers" (collapsible, current crypto detail). Keep auditability without overwhelming.
   - **Pricing:** clarify `UGX` for East Africa, `USD` global, include "Free: 5 devices unlimited tunnels" already but add "What counts as a device?" FAQ.
   - **Error & empty copies:** standardize: empty = "What you’re seeing + Why empty + Next step button". Error = "What happened + Why + Retry/Contact". Apply to `ConnectionsTab:594` pending vs active empty, `WalletTab` fallback demo balance note "Demo data while wallet not initialized — not your real balance".
3. **Editorial process:** Add `npm run content:lint` via `oxlint` + simple `grep` for jargon list (`CGNAT`, `Noise_IK` only allowed in `/security` + `/docs`), CI fails if found elsewhere.

**Improved version**
Consistent plain language in hero, unified 3 steps, content file-driven, docs = markdown, no hard-coded strings, jargon isolated to expert layer.

**Implementation guidance**

- **Files:** Create `web/src/content/{hero,how-it-works,pricing,faq}.json`, move `CURATED_MD` to `public/docs/*.md`, refactor `LandingPage.tsx` hero to import from content, refactor `UserDashboard.tsx` empty copy to import, add `web/scripts/content-lint.mjs` to enforce voice.
- **Acceptance:**
  - [ ] No string "Noise_IK" outside `docs/security-architecture` + `Security` page — grep passes.
  - [ ] `content/*.json` loads and renders hero + 3 steps + FAQ; swapping JSON updates site without code change.
  - [ ] Flesch reading ease ≥ 60 for hero + pricing (test via `npm run content:lint`).
- **QA:** 3-user comprehension test ("Explain Zoop in one sentence") + copy diff review.

---

## Iteration 6 — Conversion Rate Optimization (CRO)

**Scope:** CTA placement, wording, paths, trust signals, lead gen, forms, friction, objections, confidence, landing effectiveness.

**What is wrong**
- CTA dilution: `Sign Up` + `Console` + `Sign Out` when authenticated vs 2 CTAs when not; hero `Sign Up` competes with nav `Sign Up`. Downloads page promises files but `VITE_RELEASES_BASE` may be empty → toast says "early builds…" (breaks promise).
- Paths broken: Pricing → waitlist writes localStorage then says "You’re on the founding list" without backend — no lead captured. Auth Demo creates throwaway identity (`demo${rand}` + random PIN) then auto-login — pollutes analytics and feels fake.
- Friction: Auth requires PIN creation before seeing value; 6-digit PIN boxes good, but username availability check is synchronous regex only (no async check) → user thinks available until submit error.
- Objections unanswered: "Will my provider see?" "Behind corporate NAT?" "Battery drain?" only in docs, not landing.

**Why it matters**
CRO is revenue. Every extra field or fake promise loses intent.

**Evidence**
- `LandingPage.tsx:975` `handleDownloadClick` fallback toast when `!base`; `977` `handleWaitlist:984` local fallback without endpoint; `AuthPage.tsx:242` `handleDemoAccess` creates random user, `demoPin` random then `signup` auto.
- `LandingPage.tsx:1079` `lp-btn-primary Sign Up` duplicate with `AuthPage.tsx:490` `Create Zoop ID — Free` same verb; `App.tsx` already has `AuthPage` at `/auth`.
- `AuthPage.tsx:176` `usernameFeedback` only local regex, not debounced server `GET /v1/users/by-username/{username}`.

**Impact:** Critical for `auth → register` conversion; high for `downloads` trust.

**Priority:** P0 — sixth (after content, before SEO).

**Exact solution**

1. **CTA hierarchy (one primary per viewport):**
   - Landing hero: single primary `Start free — create Zoop ID (30s)` (verb + benefit + time). Secondary link `See how it works` (ghost). In topbar when scrolled, inject `Header CTA` clones hero primary (not Sign Up + Console double) — single sticky CTA logic already (`showStickyCta`) keep threshold but label consistent.
   - Pricing: Waitlist form stays but `VITE_WAITLIST_URL` must be set or fallback goes to `mailto:founders@zoop.network?subject=Waitlist&body=email` (prefilled) — never fake success. Add hidden `utm_source=pricing_teams` and show "You’re #N on list" only if backend returns count; else "Thanks — we’ll email you at …".
   - Downloads: If `VITE_RELEASES_BASE` empty, change tiles to `Install via script` primary (`curl | sh` with copy) + `Notify me when packages ready` secondary (waitlist). No file name promise. Copy button uses `navigator.clipboard` with `aria-live` "Copied".
2. **Path friction reduction:**
   - Move PIN setup *after* value preview: signup flow becomes 2-step modal: `Step 1: Choose @username + device name → Create → show Zoop ID card (copyable) → Step 2: Create PIN`. This mirrors `signup:213` logic but splits UI; allow skipping PIN (generates temp, prompt to set within 7 days).
   - Add async username check: `debounce 400ms → GET /v1/users/by-username/{username}` via `getUserByUsername` (existing `client.ts:191` pattern) on signup, show `Available` green check or `Taken — try …` with suggestions `username + random suffix`. Server error fallback to local only.
   - Remove `Demo` as product CTA from Auth (keep hidden `?demo=1` for internal QA) — replace top auth promo with `See live demo (read-only)` link that shows screenshots/video placeholder, not fake login.
3. **Objection bar:**
   - Below hero 3 steps, add 3 objection cards: "Private?" "Behind NAT?" "Battery?" linking to FAQ anchors (`faq:501` headings). Copy from FAQ one-liners, explicit: "Relays can't read — end-to-end WireGuard.", "Yes — STUN + relay fallback", "Negligible — <2% idle (measured)".
   - Add real `trust strip` avatars/logos: if none, use `Verified open source` badge linking to `github.com/zoop-internet/zoop` with `stars` badge placeholder (fetch via GitHub API badge img, not JS).
4. **Measurement:** Fire `data-cro="cta_hero_primary|sticky|pricing_waitlist|download_primary"` via `window.dispatchEvent(CustomEvent)` and read in analytics placeholder (console). No vendor required.

**Improved version**
One dominant CTA per screen, async username feedback, PIN deferred, downloads honest, waitlist actually captures or falls to email, objections visible above fold, no fake demos.

**Implementation guidance**

- **Files:** `web/src/landing/LandingPage.tsx` (hero CTA, objection bar, download tiles, waitlist logic), `web/src/auth/AuthPage.tsx` (2-step PIN, async check, remove demo primary CTA), `web/src/api/client.ts` (add `checkUsername` wrapper if needed, reuse `getUserByUsername`), `web/src/content/hero.json` + `pricing.json` (CTA labels).
- **Acceptance:**
  - [ ] Unauthed hero has exactly 1 primary, 1 secondary; sticky clones hero label.
  - [ ] Typing signup username `alex` → after 400ms shows `Available` or real server check; taken shows suggestion.
  - [ ] Downloads with empty `VITE_RELEASES_BASE` shows no `.deb` filename, shows script + waitlist; analytics event fires on copy.
  - [ ] Pricing waitlist with no endpoint opens mailto fallback, not fake "You’re on list" local.
- **QA:** Funnel test 5 participants: landing→signup→dashboard; time to `device registered` <45s. A/B copy not required yet.

---

## Iteration 7 — SEO (Technical + Content)

**Scope:** Titles, meta, headings, URLs, internal linking, sitemap, schema, intent, keywords, topic coverage, FAQs, authority.

**What is wrong**
- Client-side title rewrite (`App.tsx:96` `document.title=meta.title` on `normalized` route) — crawler without JS sees only `index.html:14` title. Canonical hardcoded `https://zoopinternet.online/` even on `/docs`, `/pricing`.
- No `sitemap.xml`, no `robots.txt`, prerender 24 routes but docs sub-routes (`/docs/quickstart` etc.) not mapped to files; `VALID_ROUTES:42` aliases `privacy-policy`→`privacy` but no redirect, duplicate content risk.
- Schema minimal: 2 JSON-LD blocks but no `FAQPage`, `HowTo`, `BreadcrumbList`, `SoftwareApplication` missing `author` vs `isFamilyFriendly`, no per-doc `TechArticle`.

**Why it matters**
Organic is primary for infra product with no ad spend. Docs traffic captures developer intent.

**Evidence**
- `web/index.html:19` canonical static; `App.tsx:88` `isValidRoute` checks `normalized.startsWith('/docs')` but `LandingPage` docs use hash + `history.replaceState('/docs/${activeId}')` per `DocsView:536`.
- `web/scripts/prerender.mjs` (not read but referenced in README) presumably prerenders 24 — verify; `vite.config.ts` has `prerender.mjs` invocation `tsc -b && vite build && node scripts/prerender.mjs`.
- `index.html:57–84` JSON-LD Organization + SoftwareApplication basic.

**Impact:** High. Without sitemap + server titles, indexing weak; AI overviews will prefer competitor with better structure.

**Priority:** P1 — seventh (after CRO content stable; titles depend on content).

**Exact solution**

1. **SSR-friendly titles & canonicals (without SSR server):**
   - Prerender: extend `scripts/prerender.mjs` to generate one HTML per route in `ROUTE_META:15` + per `DOCS_FLAT` id. Each file injects correct `<title>`, `<meta name="description">`, `<link rel="canonical" href="https://zoopinternet.online${route}">`. `App.tsx` client title logic stays as progressive enhancement but is no longer sole source.
   - Canonical logic: per-route canonical, not always `/`. Add `<link rel="alternate" hreflang="en">` per file too. `robots:18` `max-image-preview:large` keep.
   - Redirects: generate `_redirects` (Cloudflare Pages) mapping aliases (`/architecture→/how-it-works`, `/privacy-policy→/privacy`, `/terms-of-service→/terms`, `/login→/auth` etc.) 301. Validate via `wrangler` preview.
2. **Sitemap + robots:**
   - Create `web/public/sitemap.xml` generated at build: enumerate `ROUTE_META` keys + `DOCS_FLAT` as `https://zoopinternet.online/docs/{id}` + `llms.txt`. `lastmod` from git log or build date. `robots.txt` at `public/robots.txt` allowing `/` disallow `/app` `/admin` (private portals).
   - Add `index.html` `<link rel="sitemap" href="/sitemap.xml">` not needed but verify Search Console.
3. **Internal linking & headings:**
   - Landing: ensure every section has `id` (`#how-it-works`, `#pricing`, `#downloads`, `#security`) and nav pill uses `href="#how-it-works"` progressive (not only button). Footer sitemap links 4×4 grid (Product, Resources, Company, Legal) — currently footer minimal — add.
   - Heading order: one `h1` per prerendered page, used already; audit docs: generated HTML must have `h1→h2→h3` correct (fix `mdToHtml:224` regex order — `^# ` before `^## ` currently risks catching `##` as `#` — swap order to `###→##→#`).
4. **Schema enrichment:**
   - Keep 2 JSON-LDs, add third dynamic per route:
     - Landing `/` + `/pricing` → `FAQPage` from `content/faq.json` (5 entries including VPN vs Zoop, CGNAT, platforms, costs, Zoop ID).
     - `/how-it-works` → `HowTo` with 3 steps (register→authorize→connect) + `tool: WireGuard`.
     - Docs per `activeId` → `TechArticle` + `BreadcrumbList` (Home→Docs→Title). Include `author: Zoop Internet`, `datePublished: 2024`, `dateModified` from doc manifest.
   - Authority: `sameAs` already GitHub; add `https://x.com/zoopnetwork` placeholder only if real; else keep single to avoid fake social.
5. **Keyword alignment:**
   - Titles already keyword-rich (direct device sharing, WireGuard, NAT traversal) — keep. Add `keywords` only if needed; prefer intent pages: one landing per intent (landing captures "direct device sharing", docs "WireGuard NAT traversal self-host", pricing "free personal mesh") — already but ensure meta desc ≤ 155 chars (current hero desc 155? check truncate).

**Improved version**
Prerendered HTML per route with correct title/canonical, alias 301s, sitemap+robots, linked sections, FAQ/HowTo schema, headings valid, docs indexable.

**Implementation guidance**

- **Files:** `web/scripts/prerender.mjs` (extend per `DOCS_FLAT`, inject meta), `web/public/robots.txt` (new), `web/public/sitemap.xml` template (generated), `web/public/_redirects` (new), `web/src/App.tsx` (keep title as enhancement, add breadcrumb JSON-LD injection), `web/src/landing/LandingPage.tsx` (add `id`s + footer sitemap), `web/src/content/faq.json` (new source for FAQPage).
- **Acceptance:**
  - [ ] `npm run build` outputs `dist/docs/quickstart/index.html` with correct `<title>` and canonical `/docs/quickstart`.
  - [ ] `curl -s https://…/sitemap.xml | grep -c "/docs/"` ≥ 14.
  - [ ] `curl -s https://…/_redirects` contains 301 for `/architecture`.
  - [ ] Lighthouse SEO 100, no `h1` duplicates via axe, `robots.txt` blocks `/app`.
  - [ ] Rich Results Test: FAQPage detected on `/`, HowTo on `/how-it-works`.
- **QA:** Search Console preview, `npx serve dist` crawl with `wget --spider`.

---

## Iteration 8 — AI Search Readiness

**Scope:** AI/understandable, structured, entities, FAQs, semantic HTML, assistant comprehension, answer-engine suitability.

**What is wrong**
- Content rendered via `dangerouslySetInnerHTML` from regex markdown — AI chunker sees flat `div.docs-article` without semantic `article/section/FAQ` markup, no `llms-full.txt` generation verified, `/llms.txt` link exists but not auditable.
- Entities ("Zoop ID", "@username", "PIN", "Provider/Recipient", "Relay") explained in multiple places but not canonically one-sentence definitions; no `DefinedTerm` schema.

**Why it matters**
Answer engines (Bing Chat, Perplexity, ChatGPT browsing) cite well-structured, entity-rich pages. Early win without model training.

**Evidence**
- `LandingPage.tsx:631` `dangerouslySetInnerHTML={{__html: mdToHtml(md)}}`; `mdToHtml:202` does not emit `<section>` nor `itemscope`; FAQ is `CURATED_MD.faq` as markdown list, not structured.
- `DocsView:594` banner says "Fetch … at /llms.txt · /llms-full.txt" but `web/public/llms.txt` not confirmed generated — check `scripts/prerender.mjs` llms generation.
- No `<article>` beyond `docs-article` (no `itemType`).

**Impact:** Medium-High. Direct discoverability in answer boxes.

**Priority:** P1 — eighth, after SEO because it reuses sitemap + FAQ.

**Exact solution**

1. **Semantic HTML:**
   - Wrap docs prose in `<article itemscope itemtype="https://schema.org/TechArticle">` with `itemprop="articleBody"` on the prose div; each `h2` section becomes `<section aria-labelledby="slug">`. Add `<nav aria-label="On this page">` for TOC (exists `.docs-toc` but verify landmark).
   - Landing FAQ: render FAQ not as markdown paragraph but as `<dl>` with `<dt>` question + `<dd>` answer, plus `itemscope` `FAQPage`. Keep markdown for docs FAQ but also emit JSON-LD FAQPage (Iteration 7) — duplicate but both help.
2. **Entity clarity:**
   - Create `content/entities.json` canonical definitions:
     ```json
     { "Zoop ID": "Permanent account identifier ZP-XXXXXX derived from Ed25519 public key, never changes, used for login alongside @username.",
       "Username": "Mutable handle @alex, 2–24 chars, letters/numbers/._-.",
       "PIN": "6-digit revocable authenticator, not emailed, rate-limited, recoverable via device key.",
       "Provider/Recipient": "Directional share: provider authorizes recipient to route via it; either direction independent.",
       "Relay": "Zero-knowledge WebSocket hop when direct UDP blocked; payload remains WireGuard-encrypted, relay cannot decrypt."}
     ```
     Render as `<dl class="entity-list">` on `/security` + Docs glossary page, and emit `DefinedTermSet` JSON-LD.
3. **llms.txt + full:**
   - Generate at build `public/llms.txt` (index) and `public/llms-full.txt` (concatenated docs). Format per `llms.txt` spec: `# Zoop` + `## Docs` list with ` - [Title](url): description`. Ensure `DocsView:595` anchor hrefs match generated.
   - Keep `public/llms.txt` always read `GET` without auth (CORS already allows via config if origin allowed — but llms.txt is public, no auth header).
4. **Answer-engine suitability:**
   - Every long page gets `tl;dr` summary at top (`<aside class="tldr" aria-label="Summary">` 2 sentences, 40 words) — improves chunk ranking. Landing hero already is summary; add to docs articles programmatically (first paragraph after h1 as tldr, styled subtle).
   - Avoid `dangerouslySetInnerHTML` sanitization gap: keep `sanitizeHref:191` but add `escapeHtmlRaw` already — add `DOMPurify` or explicit allowlist: only `a[href]` with `rel="noreferrer noopener"` + `code/pre/h2/h3/ul/blockquote/hr/table` allowed — test with malicious md ` [x](javascript:alert(1))` already blocked to `#`.

**Improved version**
AI can parse 5 entity definitions, FAQ with 5 Q&A, HowTo, TechArticle semantic sections, llms.txt index accurate, chunker sees clean structure.

**Implementation guidance**

- **Files:** `web/src/content/entities.json` (new), `web/src/landing/LandingPage.tsx` (wrap article with microdata, render FAQ dl, tldr), `web/scripts/prerender.mjs` (generate llms.txt/full), `web/public/llms.txt` (generated), `web/src/landing/LandingPage.css` + `index.css` (entity list styles).
- **Acceptance:**
  - [ ] `curl /llms.txt` lists 14 docs + 5 FAQs with correct URLs.
  - [ ] W3C validator: article has `itemscope`, sections have `aria-labelledby`.
  - [ ] Perplexity-style prompt "What is Zoop ID?" returns quoted definition from entity list (manual test).
  - [ ] No `javascript:` href survives render (`npm run test:security`).
- **QA:** Run `npx llms-txt-validator` (or manual), Structured Data Testing Tool for DefinedTermSet.

---

## Iteration 9 — Trust & Credibility

**Scope:** About, company info, team, testimonials, logos, certs, contact, pro look.

**What is wrong**
- Only trust is crypto badges in hero. No About page, no team, no contact email, no physical/legal entity ("Zoop Internet" is brand, not registered entity disclosed), no testimonials, no usage numbers, no third-party audit badge. Footer GitHub is only external proof.

**Why it matters**
First-time visitor on `/pricing` deciding to install daemon that gets `CAP_NET_ADMIN` needs trust.

**Evidence**
- `LandingPage.tsx` nav 7 pills but no `About`. `AuthPage.tsx:507` footer has GitHub only; `LandingPage` footer not read but likely similar minimal. `index.html` JSON-LD `foundingDate:2024` without address.
- No `docs/about.md` nor `/team`, no `public/press-kit.zip`.

**Impact:** High for conversion (trust is #1 CRO lever). Low engineering cost to improve.

**Priority:** P1 — ninth. Should land before brand final polish but after AI/content.

**Exact solution**

1. **Trust layer (additive, no redesign):**
   - Add `About` section anchor + dedicated route `/about` (content file `content/about.json`): founding story 2 paragraphs, principles (Private, Direct, Open Source, No Tracking), link to `PRIVACY.md` + `TERMS.md` canonical, contact `founders@zoop.network` + `security@zoop.network` + GitHub Issues. If team wants anonymity, use "Core contributors" without photos but link to GitHub contributors graph.
   - Add **Social proof lane** below `How It Works` (not testimonials if none real): `Used by` is honest → show `Open source: MIT · GitHub stars · Contributors` with live badges (shields.io static, not fake counts). If no users, show `Built with: WireGuard® · Neon · Cloudflare Pages` logos as "Powered by" — honest, not "Client logos" faked.
   - Add **Audit/Compliance strip**: `Zero payload logging · Ed25519 + Noise_IK · Relay zero-knowledge · 0600 key storage + PBKDF2-AES-GCM` — already in docs `security-architecture:488` — surface as 4 check rows with "View details → /security".
2. **Contact & legal:**
   - Ensure `PRIVACY.md` + `TERMS.md` at `/privacy` + `/terms` render as full pages (existing `ROUTE_META` titles already) but verify canonical and last-updated date (currently hard-coded `Aug 28, 2026:619`) — make dynamic from git `git log -1 --format=%cs -- docs/privacy.md` at build, inject into meta bar.
   - Add `/security.txt` at `public/.well-known/security.txt` per RFC 9116 with contacts — ops win.
3. **No fake proof rule:** Never add placeholder testimonials/logos. If no customers yet, phrase as "Early access — join founding teams" (existing pricing waitlist honesty).

**Improved version**
Visitor sees About + contact + powered-by honest proof + audit strip, legal pages dated, security.txt exists, no fabricated logos.

**Implementation guidance**

- **Files:** `web/src/content/about.json` (new), `web/src/landing/LandingPage.tsx` (About section, proof lane, audit strip, footer links), `web/public/.well-known/security.txt` (new), `web/scripts/prerender.mjs` (inject lastmod into docs meta bar), `web/src/landing/LandingPage.css` (proof lane styles).
- **Acceptance:**
  - [ ] `/about` route renders with `h1 About Zoop Internet` + contacts, indexable.
  - [ ] Landing shows 4 audit checks + powered-by lane, no fake testimonial.
  - [ ] `curl /.well-known/security.txt` 200.
  - [ ] Privacy/Terms display correct last-modified date matching build.
- **QA:** 3-user trust test: "Would you install? Why?" — address concerns cited.

---

## Iteration 10 — Brand Experience

**Scope:** Consistency, messaging, visual identity, tone, professionalism, differentiation, memorability.

**What is wrong**
- Identity is cyan/teal but icon avg `#0f5e58` vs `--primary:#0284c7` mismatch noted but not resolved; landing says "Zoop Internet" with badge `Internet`, portal says "Zoop" alone (`sidebar-brand-name:186`).
- Messaging differentiation: "Direct" vs VPN is claimed but no visual comparator (e.g., 12ms vs 80ms claimed in bent-arrow `desc` but not rendered as number cards). Memorability low without mascot/wordmark story.

**Why it matters**
Memorable brand drives referrals ("Zoop it" vs "send my home IP").

**Evidence**
- `LandingPage.tsx:716` `BentArrowMeshIllustration` desc mentions "direct path about 12ms versus VPN-relayed about 80ms" but UI shows only nodes + faint rings, no latency cards.
- `index.css:35` `--primary:#0284c7` but `index.css:2` comment says "icon avg rgb 15,94,88" — acknowledged drift, not fixed.
- Brand text `Zoop` + badge `Internet` in landing topbar vs just `Zoop` in portal.

**Impact:** Medium. Affects recall, DMs.

**Priority:** P2 — tenth (after trust, before IA polish).

**Exact solution**

1. **Brand lock (1-day audit + fix):**
   - Define wordmark: `Zoop` (logotype, Inter 800, tracking -0.02) + optional `Internet` sub-badge `0.6875rem 700 uppercase` spaced `0.07em` — apply identically to `lp-brand` and `sidebar-brand`. Make `sidebar-brand-name:186` add `Internet` badge same as landing (small, muted) for consistency; admin keeps amber sub `Platform Admin` under brand.
   - Resolve color: keep `--primary:#0284c7` (bright cyan) as action, keep icon `#0f5e58` as deep teal for illustration/ambient glow only — document "Icon teal = illustration, Primary cyan = actions" in `index.css` comment, not drift.
   - Memorability: keep bent-arrow mesh but add 2 latency pills overlay: `DIRECT 12ms` (green) vs `VIA VPN 80ms+` (amber, strikethrough) positioned near arrows; add tiny `* measured lab` footnote. Already desc exists — make visual.
2. **Tone & differentiation:**
   - Messaging house: tagline `Direct. Private. Yours.` — use once in hero, once in footer, not scattered. Value trio: `Direct = no middle server` / `Private = you own the keys` / `Yours = open source MIT` — cards under How It Works.
   - Professionalism: audit `::selection` color, `scrollbar` radius, `inset` highlight on active nav already; add `prefers-contrast: more` increase `--border-strong` to `rgba(255,255,255,0.16)`.
3. **Visual identity checklist:** icon 32/192/512 `srcset` already optimal; add `apple-touch-icon` preload not needed — keep.

**Improved version**
Wordmark identical everywhere, color roles documented, latency comparator visible, tagline repeated, contrast more support.

**Implementation guidance**

- **Files:** `web/src/index.css` (brand comment, contrast `more`, selection), `web/src/landing/LandingPage.tsx` (latency pills on mesh, tagline), `web/src/components/WorkspaceSwitcher.tsx` (brand sub-badge), `web/src/content/hero.json` (tagline there too).
- **Acceptance:**
  - [ ] Sidebar and landing brand look identical (photo diff).
  - [ ] Mesh shows 2 latency pills, numbers legible on mobile.
  - [ ] `prefers-contrast: more` increases borders (inspect).
- **QA:** Brand diff + 5-second recall test "Tagline?".

---

## Iteration 11 — Information Architecture

**Scope:** Page structure, nav hierarchy, content org, flows, missing pages, confusion.

**What is wrong**
- Flat IA: 7 landing pills all top-level, docs 14 items under `Start Here/Use Zoop/Account & Team/Help` but no hierarchy exposed outside landing; portals 3 silos with workspace switcher that treats `Platform Admin` as workspace (confusing).
- Flows fragmented: auth `redirect_url` param honored (`AuthPage:132` `redirectUrl`), but dashboard tabs not in URL, admin tabs not in URL, docs tab not reflected in `/docs/:id` (hash only via `history.replaceState`).

**Why it matters**
Findability = retention. Deep links should survive share.

**Evidence**
- `App.tsx:16` `ROUTE_META` keys flat, no nesting; `LandingPage.tsx:522` `activeId` state + `history.replaceState({},'', activeId==='quickstart'?'/docs':'/docs/'+activeId)` — not synced with router.
- `UserDashboard.tsx:28` tabs local; `AdminConsole.tsx:45` `AdminTab` union but no query sync; admin `NAV_SECTIONS:57` grouped Platform/Entities/Network/Safety/Infrastructure but user portal `NAV:30` flat.
- `WorkspaceSwitcher.tsx:90` admin switcher shows "Back to Website" inside workspace listbox — mixed levels.

**Impact:** Medium-High. Users share "check my Sharing tab" link — broken.

**Priority:** P1 — eleventh (needs router library or minimal URL upgrade first).

**Exact solution**

1. **Adopt URL as source of truth (no new dep required):**
   - Keep manual router but add `useQueryTab` helper: `?tab=devices|connections|sharing|wallet|settings|overview` defaults to overview. On `navigateTo`, preserve `?tab=` if target is `/app`/`/org`/`/admin`. Update `UserDashboard` + `OrgDashboard` + `AdminConsole` to read `searchParams.get('tab')` on mount and `history.replaceState` on tab change (push only on user click, not on load). Ensure back button cycles tabs.
   - Docs: change `DocsView:536` `replaceState` to include query `?doc={activeId}` alias plus hash for heading; `App.tsx` normalize parses `doc` param to set active, so direct `https://…/docs/installation` works on reload and SSR prerender.
   - Landing sections: add anchors `#product`, `#how-it-works`, `#security`, `#downloads`, `#pricing`, update nav `href="#downloads"` progressive enhancement (already some button-only).
2. **Hierarchy & missing pages:**
   - Promote `About` (new) and `Support` (GitHub Issues + `founders@…`) to nav second level under Resources; keep top nav 4 as in Iteration 1, expose `Support` in footer only.
   - Workspace switcher: split listbox into `<section aria-label="Personal">` + `<section aria-label="Organizations">` + footer action "New organization" — remove admin from list (Iteration 1 already), ensure `aria-selected` + `check` visible.
   - Breadcrumbs: docs breadcrumb already `Home › Docs › {title}:605` correct; add breadcrumb to admin entity pages: `Admin › Devices › {deviceId}` when drilling (future but data model supports).
3. **Sitemap IA:** Generate `sitemap.xml` hierarchy reflects IA: `/`, `/how-it-works`, `/products`, `/pricing`, `/downloads`, `/security`, `/about`, `/docs` + 14, `/privacy`, `/terms`, `/auth` (noindex), portals (`/app`, `/org`, `/admin`) excluded via `robots disallow`.

**Improved version**
Every tab deep-linkable, docs shareable, back button expected, workspace hierarchy semantic, footer sitemap navigable, portals distinct from marketing.

**Implementation guidance**

- **Files:** `web/src/App.tsx` (query tab parse, `onNavigate` preserve search), `web/src/app/user/UserDashboard.tsx` + `web/src/app/org/OrgDashboard.tsx` + `web/src/admin/AdminConsole.tsx` (read/write `?tab=`), `web/src/landing/LandingPage.tsx` (anchors, docs query param), `web/src/components/WorkspaceSwitcher.tsx` (section labels, remove admin mixing), `web/scripts/prerender.mjs` (anchors in sitemap).
- **Acceptance:**
  - [ ] Open `/app?tab=connections` → Connections tab active on first paint; back from Sharing→Connections restores via URL.
  - [ ] Direct `https://…/docs/installation` loads installation doc (no flash to quickstart).
  - [ ] `WorkspaceSwitcher` Axe: sections labeled, `aria-selected` correct, Tab cycles without trap.
  - [ ] Sitemap contains `/about` and 14 docs, no portals.
- **QA:** Manual back-button cycle + direct link tests + link checker.

---

## Iteration 12 — Performance Experience

**Scope:** Heavy images, slow-feel interactions, animation, layout shift, excessive content, loading experience.

**What is wrong**
- Perceived weight: fonts 2 families via `fonts.googleapis.com` (Inter + JetBrains Mono 400/500/600 4+3 weights = ~180kB), icon images 32+192+512 + og-image.webp preload low but decoded; landing `BentArrowMeshIllustration` SVG 600×440 with gradients always mounted, even off-screen.
- Interaction jank: `LandingPage.tsx:930` `handleNav` uses `setTimeout 80+180` chained + `requestAnimationFrame` to animate progress bar — could be `ViewTransition` or single rAF, but jank on low-end.
- Layout shift: `AnimatedCounter:664` mounts at 0 then animates to end on `IntersectionObserver` — during SSR/prerender shows 0, hydration shifts slightly but clamped? Still CLS if not reserved.

**Why it matters**
Perceived perf is trust; actual 743kB eager was already removed, but remains moderate.

**Evidence**
- `web/index.html:9` `preconnect` to fonts + `link href="…Inter…"` blocks render; `52` `preload zoopicon-32.png fetchpriority=low` OK but still hint; `vite.config.ts:23` `manualChunks` 5 but landing still likely >150kB (verify build output).
- `LandingPage.tsx:939` `navTimersRef` + timeouts `35→75→100%` hardcoded; `BentArrowMeshIllustration` always rendered even on `/docs` route? Check conditional `activeRoute` — illustration only on marketing sections but still in bundle.
- `index.css:1360` skeleton shimmer uses `background-position` 400% — GPU ok but not `will-change`.

**Impact:** Medium. Not P0 because current is usable, but cumulative.

**Priority:** P1 — twelfth (after IA so route-based code splitting effective).

**Exact solution**

1. **Fonts & images:**
   - Keep Google Fonts but subset to `latin` only (already) and reduce Mono weights: keep `400,500` only, drop `600` (used rarely). Add `font-display:swap` via URL `&display=swap` already? Verify — add if missing. Add `link rel="preload" as="style"` on demand? Keep simple.
   - Og-image: already `preload low` — keep. Ensure `og-image.webp` is served with `Cache-Control: immutable` via `public/_headers` (Cloudflare Pages). Verify `zoopicon-32.webp` srcSet correct — keep but remove duplicate PNG preload if WebP covers 95%.
   - Lazy illustration: `BentArrowMeshIllustration` wrapped in `React.lazy` / `loading=lazy` equivalent — render only when `section in viewport` via `IntersectionObserver` (already pattern for counter) — keep mounted but with `content-visibility:auto` CSS to defer paint.
2. **Code splitting:**
   - Extend `vite.config.ts:23` `manualChunks` to split `landing/docs` heavy `mdToHtml` + `CURATED_MD` into `landing-docs` chunk (already `landing` chunk aggregates landing page — split further: `landing-hero`, `landing-docs`, `landing-downloads`). Keep `admin` separate.
   - Add `import('./landing/BentArrowMeshIllustration.tsx')` lazy for illustration component extracted to its own file.
3. **Perceived perf:**
   - Replace `handleNav:930` timeout chain with `startViewTransition` if available, fallback to single `requestAnimationFrame` + `setTimeout 180` only once; remove `navTimersRef` complexity.
   - Skeleton: add `aria-busy="true"` + `aria-live="polite"` on loading sections (already some `aria-live` on docs); ensure `min-height` reserved for hero/count so counter `0→end` does not shift layout — set `min-width` via `ch` on counter span.
   - `will-change: background-position` on `.skeleton` only when animating; add `transform: translateZ(0)` for layer promotion only on shimmer.
   - Verify no CLS: set `width/height` on `img` brand icons (already `width={28} height={28}`), add `aspect-ratio` on illustration SVG container.
4. **Build hints:**
   - `vite.config.ts:18` `target:esnext` ok, `chunkSizeWarningLimit:700` ok; add `reportCompressedSize:false` for faster CI, keep.

**Improved version**
First paint text in `Inter swap` no block, image decoding deferred, navigation progress single tick, skeleton reserved height, no CLS, chunks balanced.

**Implementation guidance**

- **Files:** `web/index.html` (font weights reduced to 400/500 + `display=swap` if missing, preload audit), `web/vite.config.ts` (split docs/illustration chunk), `web/src/landing/BentArrowMeshIllustration.tsx` (extract + lazy), `web/src/landing/LandingPage.tsx` (simplify `handleNav`, intersection for docs), `web/src/index.css` (counter min-width, skeleton `will-change`, `content-visibility: auto` on off-screen sections), `web/public/_headers` (cache for og-image).
- **Acceptance:**
  - [ ] Lighthouse Perf ≥ 95 mobile, CLS <0.05, LCP <1.8s on 3G via Pages preview.
  - [ ] Bundle analysis: `landing` ≤120kB gz, `admin` ≤80kB gz, `docs` lazy ≤40kB gz.
  - [ ] `npm run build` still runs `prerender.mjs` and outputs same routes, no regression.
- **QA:** WebPageTest 3 runs + axe perf (no layout shift) + manual low-end device.

---

## Iteration 13 — Forms & Interactions

**Scope:** Form length, clarity, validation, error handling, feedback, friction.

**What is wrong**
- Auth form length: signup asks 5 fields at once (username, displayName optional, PIN, PIN confirm, deviceName + provider toggle) — imposes cognitive load earlier than needed (CRO Iteration 6 will split, but this is the interaction detail).
- Validation late: errors shown after submit via `fieldErrors` map, but `auth-input input-error` only after submit; inline live not debounced for PIN match, phone not formatted live.
- Wallet forms: `WalletTab:999` deposit amount has `depositAmount` preset + `customDeposit` string not synchronized; amount <0 not clamped; phone `+256 ` default with trailing space causes `detectUgandaNetwork:950` to mis-detect `unknown` until typing.

**Why it matters**
Form abandonment is highest at first error; inline help cuts 20%.

**Evidence**
- `AuthPage.tsx:185` `handleSignIn` builds `errs: {}` only on submit; `signup:211` same; `usernameFeedback:176` computed live but not wired to server; `WalletTab:1028` `effectiveAmount = customDeposit ? Number(customDeposit) : depositAmount` — two sources truth.
- `WalletTab:1050` `depositPhone = '+256 '` — trailing space; `handleDepositPhoneChange:1052` detects network but only if user edits after.
- Phone helpers `formatUgandaPhone:965` trims but not used on blur in WalletTab.

**Impact:** Medium-High for signup + wallet deposit (revenue).

**Priority:** P1 — thirteenth (after perf, before standards finalize).

**Exact solution**

1. **Auth forms (friction cut):**
   - Two-step as CRO: Step 1 (username + device name), Step 2 (PIN + confirm). Wire `fieldErrors` to live `aria-describedby` per field, show `field-feedback success|error` immediately on blur, not only after submit. Add `shakeKey:160` trigger only on submit error, not live.
   - Async username availability (debounced 400ms `GET /v1/users/by-username/{username}`) — reuse `client.ts:221` pattern; optimistic local regex still shows "Only letters…" before debounce, server result overrides. Show spinner inline `• checking…` then check.
   - PIN: as user types `signUpPin:440`, show strength hint "6 digits — revocable via device key" stays; confirm mismatch message updates live on `signUpPinConfirm:449` change, not only submit.
   - Device name: default from UA detection `MacBook Pro` etc. (`useEffect:164` already) — add `autoSelect` on focus for quick edit, `maxLength=32`.
   - Provider toggle: label clarifies "Enable Internet Sharing — this device can be a provider" + `aria-describedby="provider-hint"` linking to doc.
2. **Wallet forms (clarity + validation):**
   - Deposit: unify amount source: `amount = customDeposit ? Number(customDeposit) : depositAmount`; add presets `5000/10000/25000/50000/100000` as pill buttons (already concept but pick one source), plus `Custom` input with `inputmode="numeric" pattern="[0-9]*"` + `min=1000` clamp. Show fee preview `Amount → Fee (2%) → Total` from `PaymentTransaction.fee` logic if known (mock fee 1.5%).
   - Phone: single source `depositPhone` controlled, `onBlur` calls `formatUgandaPhone` to normalize `+256` + 9 digits `70…` → auto-select `mtn/airtel`; show detection badge `MTN · +256 77…` below input. Reject `unknown` with hint "Enter MTN or Airtel number".
   - Validation: `required` + `min` enforced via `setCustomValidity` on input so browser native tooltip + `aria-invalid` consistent. Disable `Confirm Deposit` until phone valid + amount ≥1000. Show `error-banner` above form with `role="alert"` on server reject.
   - Withdraw mirrors deposit; `withdrawAmount` default not 0 — set to `wallet.unwithdrawn_earnings` after load (`WalletTab:1027` already does if >0, but keep).
3. **Feedback standardization:**
   - Toast: keep `ToastContainer:42` but ensure `role="status"` vs `role="alert"` distinguished: success= status polite, error= alert assertive. Add `aria-live="polite"` wrapper already; fix duplicate inline `style` vs class.
   - Inline: every `field` gets `<span id="{field}-hint">` + `<span id="{field}-error" role="alert">` toggle via `fieldErrors`.

**Improved version**
Signup feels 2 short steps, username check async, PIN confirm live, phone auto-detects MTN/Airtel, amount presets + custom unified, errors early, success toast polite.

**Implementation guidance**

- **Files:** `web/src/auth/AuthPage.tsx` (split steps, debounced username, live pin confirm, aria), `web/src/app/user/UserDashboard.tsx` WalletTab (amount unify, phone blur format, fee preview, disabled states, alert role), `web/src/api/client.ts` (export `checkUsernameAvailability` thin wrapper over `GetUserByUsername` with 404 = available), `web/src/index.css` (pill amount styles, field-feedback transitions).
- **Acceptance:**
  - [ ] Signup: typing taken username shows "Taken — try alex_02" within 500ms after 400ms debounce; free shows green check.
  - [ ] PIN mismatch warning live as soon as second box complete, before submit.
  - [ ] Deposit: custom amount syncs with pill selection, phone `077…` auto becomes MTN & `+256 77…` on blur, submit disabled until valid.
  - [ ] Axe: no duplicate `id`, `aria-describedby` references exist.
- **QA:** Form matrix (desktop/mobile, success/error, network offline), Axe forms, manual UGX fee rounding.

---

## Iteration 14 — Modern Web Standards

**Scope:** Responsive, component consistency, design system, layouts, microinteractions, progressive enhancement, frontend practices.

**What is wrong**
- No component library: buttons `btn-*` vs `lp-btn-*` vs `auth-submit-btn` triple. Layout uses flex/grid ad-hoc, not system.
- Microinteractions: hover `translateX(1px)` on nav but no active press, no view transitions, no reduced-motion scoping beyond global reset.
- Progressive enhancement: landing nav pills use `button onClick handleNav` without `href` — no JS = dead. Docs fetch markdown requires JS; noscript only shows generic `Enable JavaScript` div.
- Practices: no `pnpm` lock verify, no `oxlint` design-system rule, no Vitest, no Playwright, `tsconfig.json` `strict` unknown.

**Why it matters**
Standards = velocity + resilience. Without them, iterations 1–13 regress.

**Evidence**
- `web/package.json:3` `dependencies: react, react-dom` only — no router, no testing, `devDependencies: oxlint, typescript, vite`. `web/src/landing/LandingPage.css` not using modules, global leakage possible.
- `LandingPage.tsx:984` nav buttons have `onClick handleNav` but not `<a href>`, history API only. `DocsView:541` fetches `fetch(/docs/*.md)` client-only.
- `index.html:90` noscript fallback is single div, not styled via CSS.

**Impact:** Medium (high long-term). Locks maintenance cost.

**Priority:** P2 — fourteenth (capstone; wiring, not pioneering).

**Exact solution**

1. **Design system finalization:**
   - Document in `web/docs/ARCHITECTURE.md` (or README): folder contract `src/components/` (Headless), `src/content/` (data), `src/styles/tokens.css` (later extract from `index.css`). Enforce via `oxlint` custom rule: forbid `style={{ background:` literals with hex outside tokens — or at least PR checklist.
   - Consolidate buttons: alias `lp-btn-primary → btn-primary`, `lp-btn-secondary → btn-secondary`, `auth-submit-btn → btn-primary` (keep variant `btn-primary--auth` if size differs but token same). Deprecate duplicates via comment `// deprecated alias`.
   - Layout: define `container` `max-width:1200px`, `grid-12` utility, use for landing sections (currently sections have no max-width containment beyond `landing-shell`).
2. **Microinteractions (minimal, meaningful):**
   - Add press `active: scale(0.98)` on `btn-primary`, `focus-visible` already; add `prefers-reduced-motion: no-preference` only then allow `nav-item:hover svg translateX`.
   - Adopt `document.startViewTransition` for route changes (already for `handleNav` in Iteration 12) — progressive, no polyfill.
   - Add `content-visibility:auto` + `contain-intrinsic-size: 600px` on below-fold landing sections (`#downloads`, `#security`, `#pricing`) to improve paint.
3. **Progressive enhancement:**
   - Convert nav pills to `<a href="#how-it-works" onClick={prevent→handleNav}>` so without JS anchors still scroll. Docs fallback: prerendered HTML per doc means JS-less user gets static article (Iteration 7) — no fetch needed. Keep `mdToHtml` for in-app but static prerender is canonical.
   - Form: add `method="post"` + `action="/api/v1/…"` fallback with `noscript` hides enhanced UI and shows "Enable JS for best experience" but submits still (not needed for auth due Ed25519 signing, so document JS required for auth with clear noscript message already `index.html:91`).
   - Add `manifest.webmanifest` already, but register no-op SW `navigator.serviceWorker.register('/sw.js')` only for offline docs caching stale-while-revalidate — optional, 30 lines.
4. **Tooling & practices:**
   - Add `npm run typecheck` (`tsc -b --noEmit`), `npm run lint` (`oxlint .` already) + `npm run test` (`vitest run` with 5 happy-path tests: route normalize, PIN boxes, phone format, query tab, sitemap presence). No need for full TDD; smoke coverage.
   - Enforce `strict:true` in `tsconfig.json` (verify).
   - Add `.nvmrc` or `engines: { node: ">=20" }` to `package.json`.

**Improved version**
One button set, anchor-reachable nav, docs readable without JS via prerender, microinteractions subtle & respects reduced-motion, toolchain minimal but covered, contributor knows where to put things.

**Implementation guidance**

- **Files:** `web/src/index.css` (alias deprecations, content-visibility, container), `web/src/landing/LandingPage.tsx` (anchor href conversion, viewTransition, SW registration stub), `web/package.json` (add `typecheck`, `test`, engines), `web/tsconfig.json` (strict), `web/public/sw.js` (optional 10-line docs cache), `web/README.md` (update with architecture section pointing to `IMPROVEMENT_ROADMAP.md`), `.github/workflows/deploy-pages.yml` (ensure `npm run build` runs `prerender` + `sitemap` generation).
- **Acceptance:**
  - [ ] No-JS test: disable JS, open `/`, `/docs/quickstart`, `/pricing` — content visible (prerender), anchors scroll, forms show noscript message.
  - [ ] With JS: nav pills are `<a>` with correct `href`, click still SPA.
  - [ ] `npm run typecheck && npm run lint && npm run test` pass.
  - [ ] `grep -r "lp-btn-primary" web/src` only alias definition remains.
- **QA:** No-JS crawl + Vitest + axe + Pages preview smoke.

---

## Cross-Cutting Execution Plan

### Order & Dependencies

```
1 UX (journey + hero + nav cut)
 ↓
2 UI (tokens lock, type scale, icon unify, card fix)
 ↓
3 Mobile (targets, sticky heads, shell mobile-first)
 ↓
4 A11y (landmarks, trap, forms ARIA) ──┐
 ↓                                      │
5 Content (voice, content files)         ├── can parallel after 4
6 CRO (CTA, waitlist honesty, async check) ──┘
 ↓
7 SEO (prerender per route + sitemap/robots/schema)
8 AI Search (entities, llms.txt, semantic article) — piggybacks 7
 ↓
9 Trust (About, proof lane, legal dates, security.txt)
 ↓
10 Brand (wordmark lock, latency pills, tone house)
 ↓
11 IA (URL tabs, docs query, sitemap hierarchy)
 ↓
12 Perf (fonts, lazy illustration, viewTransition, chunks)
 ↓ (CRO split form kept but refined)
13 Forms (2-step auth, phone live, amount unify)
 ↓
14 Standards (system doc, sw, typecheck, progressive fallback)
```

Effort estimate per iteration: S (≤3 files, 1 day) — Iterations 9,10,14; M (3–6 files, 2 days) — 5,7,8,11,12,13; L (6+ files) — 1,2,3,4,6. Total 6–8 weeks solo, 3–4 weeks with 2 devs parallelizing 5/6 and 7/8.

### Branching & Preview

Each iteration: `feat/web-iter-N-shortname` branched from `main`, PR preview on Pages (`zoop-9jc` or `zoopinternet.online` preview) with _before_/_after_ screenshots in PR body (3 breakpoints + axe/lighthouse scores). Merge only after acceptance checkboxes green.

### File Ownership Summary

| Iteration | Primary files |
|---|---|
| 1 | `landing/LandingPage.tsx`, `app/user/UserDashboard.tsx`, `App.tsx`, `content/hero.json` |
| 2 | `index.css`, `components/iconDefs.tsx`, `landing/*.css`, `admin/*.css`, `auth/*.css` |
| 3 | `index.css`, `components/MobileBottomNav.tsx`, `app/user/UserDashboard.tsx`, `auth/AuthPage.css` |
| 4 | `landing/LandingPage.tsx`, `components/WorkspaceSwitcher.tsx`, `auth/AuthPage.tsx`, `index.css`, `components/SkipLink.tsx` |
| 5 | `content/*.json`, `public/docs/*.md`, `App.tsx` content wiring, scripts/content-lint.mjs |
| 6 | `landing/LandingPage.tsx`, `auth/AuthPage.tsx`, `api/client.ts`, `content/*.json` |
| 7 | `scripts/prerender.mjs`, `public/robots.txt`, `public/sitemap.xml`, `public/_redirects`, `App.tsx`, `index.html` meta |
| 8 | `content/entities.json`, `landing/LandingPage.tsx` semantics, `scripts/prerender.mjs` llms |
| 9 | `content/about.json`, `landing/LandingPage.tsx` proof/audit, `public/.well-known/security.txt` |
| 10 | `index.css`, `landing/*.tsx` brand, `components/WorkspaceSwitcher.tsx` |
| 11 | `App.tsx`, `app/**/Dashboard.tsx`, `admin/AdminConsole.tsx`, `landing/LandingPage.tsx`, `components/WorkspaceSwitcher.tsx` |
| 12 | `index.html`, `vite.config.ts`, `landing/BentArrowMeshIllustration.tsx`, `landing/LandingPage.tsx`, `public/_headers` |
| 13 | `auth/AuthPage.tsx`, `app/user/UserDashboard.tsx`, `api/client.ts` |
| 14 | `index.css`, `landing/LandingPage.tsx`, `package.json`, `tsconfig.json`, `public/sw.js` |

---

## Definition of Done (Global)

- [ ] No new raw hex outside `index.css` `:root`; `grep` passes.
- [ ] Axe WCAG 2.2 AA 0 violations on `/`, `/auth`, `/app?tab=devices`, `/admin?tab=overview`.
- [ ] Lighthouse: Perf ≥95, Accessibility 100, Best Practices ≥95, SEO 100 on Pages preview.
- [ ] Keyboard-only register→connect flow completes; SR announces all errors.
- [ ] Prerender + sitemap + _redirects + llms.txt generated on `npm run build`.
- [ ] `npm run typecheck && npm run lint` passes; no new `eslint-disable`.
- [ ] Before/after screenshots in PR, 5-user hallway test notes for UX/CRO.
- [ ] No fake data (no fabricated testimonials/logos/waitlist counts); all proof honest.

---

## Metrics & KPIs

Track per iteration on Pages analytics (or console placeholder):

| Iteration | KPIs |
|---|---|
| 1 UX | hall-way comprehension 3/3, nav clicks to auth |
| 2 UI | design-review consistency score (ad-hoc 7→2 drift items) |
| 3 Mobile | tap-target 100%, mobile register <45s |
| 4 A11y | axe 0 vuln, SR path complete |
| 5 Content | reading-ease ≥60, FAQ find-rate |
| 6 CRO | hero CTA CTR, signup start→complete, waitlist captures (no local fake) |
| 7 SEO | indexed pages (GSC), sitemap entries ≥22, FAQ rich result |
| 8 AI Search | `/llms.txt` 200, entity quoted by AI prompt |
| 9 Trust | trust survey "would install?" ↑, security.txt hit |
| 10 Brand | recall tagline, wordmark consistency |
| 11 IA | deep-link share success, bounce on docs |
| 12 Perf | CLS <0.05, LCP <1.8s, bundle budgets |
| 13 Forms | form error rate, phone auto-detect rate |
| 14 Standards | build + typecheck green, no-JS render ok |

---

## Risk & Out-of-Scope

- **Risks:** Over-splitting chunks can increase waterfalls — verify with `vite-bundle-visualizer`. Google Fonts subset change can shift layout — snapshot before. Prerender per doc can grow build time — cache `public/docs/*.md` reads.
- **Out-of-scope (not in 14):** Backend auth reuse-check (nice but cloud-owned), iOS 16 fallback for `:has()`, full E2E Playwright (defer until 14), translation/i18n (defer), blog CMS, billing UI beyond WalletTab.

---

## Immediate Next Step

**Start Iteration 1 — User Experience (UX).**

1. Create branch `feat/web-iter1-ux`.
2. Implement hero contract, nav cut to 4, trust strip, empty-state actionable cards, Share↔Connect cross-link, context bar — per Iteration 1 checklist.
3. Open PR with before/after screenshots (1280/768/375) + hallway test notes.
4. Await review, then merge → proceed to Iteration 2.

> This roadmap is the execution contract. When later making changes, follow existing architecture, tokens, naming, and structure per Iteration contents. Re-read the evidence `file:line` references before editing.

