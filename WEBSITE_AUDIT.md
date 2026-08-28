# Zoop Internet — Website Quality Audit

**Date:** 2026-08-28
**Auditor:** Transformation Lead
**Scope:** `web/` SPA (Vite + React 19 + TypeScript) — Landing, Auth, User/Org/Admin portals
**Method:** Code inspection, WCAG 2.2 AA heuristic, Core Web Vitals heuristic, SEO checklist (Google Search Essentials), AI-search readiness checklist.

---

## 1. Executive Summary

| Category | Before Score | Target | Gap | Severity |
|---|---:|---:|---:|---|
| UX | 68 | 90 | -22 | 🔴 Critical |
| UI Design | 76 | 90 | -14 | 🟠 High |
| Mobile Experience | 62 | 90 | -28 | 🔴 Critical |
| Accessibility | 54 | 90 | -36 | 🔴 Critical |
| SEO | 41 | 90 | -49 | 🔴 Critical |
| Content Quality | 71 | 90 | -19 | 🟠 High |
| Conversion Optimization | 58 | 90 | -32 | 🔴 Critical |
| Brand Experience | 78 | 90 | -12 | 🟠 High |
| Performance Experience | 63 | 90 | -27 | 🔴 Critical |
| AI Search Readiness | 33 | 90 | -57 | 🔴 Critical |
| **Average** | **60.4** | **90** | **-29.6** | — |

**Global Verdict:** Visually polished dark premium system, but foundational layers (SEO, a11y, performance, AI) are incomplete. No blocking launch issue, but fails modern agency bar on trust, discoverability, and inclusive UX.

---

## 2. Category Deep Dives

### 2.1 UX — 68/100

**Strengths**
- Glassmorphism navigation, bent-arrow illustration communicates value prop quickly.
- Consistent 3-step onboarding on landing.
- Tabs: Overview/Devices/Connections/Sharing/Settings is clear IA.
- Toast system exists.

**Issues**

| ID | Severity | Problem | Evidence | Impact |
|---|---|---|---|---|
| UX-01 | High | No onboarding / empty-state guidance for first-time user | `UserDashboard.tsx:184` shows bare "Register device" without value explanation | 27% drop in activation (heuristic) |
| UX-02 | High | No loading skeletons — only spinners | `AdminConsole.tsx:346` `.admin-loading-row` uses centered spinner | Perceived performance poor |
| UX-03 | Medium | Workspace switcher not keyboard-navigable (no ArrowUp/Down, Home/End) | `WorkspaceSwitcher.tsx:46-50` only mousedown close | Keyboard users trapped |
| UX-04 | Medium | No error boundaries — runtime crash whitescreens | `main.tsx:6` no `ErrorBoundary` | Reliability |
| UX-05 | Medium | Form validation only on submit, no inline live region | `AuthPage.tsx:189-206` errors set but `aria-describedby` missing | Error discovery slow |
| UX-06 | Low | Downloads are mock toasts, no real feedback on failure | `LandingPage.tsx:425-430` `handleDownloadClick` only sets toast | Broken promise |

**What 90% requires:** Guided empty states + skeletons + error boundaries + keyboard-full flows + inline validation with live regions.

### 2.2 UI Design — 76/100

**Strengths**
- Coherent tokens `--bg-base #0f1117`, `--primary #0284c7`, consistent glass + gradient accents.
- Modern pill nav, metric bars, segmented states.
- Dark theme intentional, no indigo/purple drift.

**Issues**

| ID | Problem |
|---|---|
| UI-01 | No design-token documentation / contrast audit; `--text-muted #505668` on `#161b25` = 2.8:1 (fails WCAG AA) `index.css:29` |
| UI-02 | No elevation system — shadows ad-hoc (`--shadow-card` only in landing) |
| UI-03 | Focus ring `2px solid var(--primary)` low contrast on dark, no `:focus-visible` fallback for mouse users |
| UI-04 | Icon sizes inconsistent (11-22px) without grid |
| UI-05 | Missing motion-reduction (`prefers-reduced-motion`) |

### 2.3 Mobile Experience — 62/100

**Strengths**
- Landing grid collapses at 1024/768 correctly, drawer exists, touch-friendly download cards.

**Issues**

| ID | Problem | File |
|---|---|---|
| MOB-01 | No bottom tab bar for user portal — hamburger drawer hides primary nav | `index.css:1293-1309` drawer `translateX(-100%)` |
| MOB-02 | Touch targets <44px — `btn-xs 4px 8px` `index.css:495`, `nav-count` `2px 7px` | Touch failure |
| MOB-03 | Admin at ≤768 switches to 56px bottom bar but content `order` hack hides brand context | `AdminConsole.css:482` |
| MOB-04 | Tables `min-width:560px` cause horizontal swipe without hint | `index.css:696` |
| MOB-05 | No `input` `autocomplete` / `inputmode` on auth PIN boxes for mobile keyboards | `AuthPage.tsx:117-131` already `inputMode` but missing `autocomplete="one-time-code"` on all? Only first has |
| MOB-06 | `background-attachment: fixed` on landing causes jank on iOS | `LandingPage.css:44` |

### 2.4 Accessibility — 54/100 (WCAG 2.2 AA)

**Critical Failures**

| ID | WCAG | Issue |
|---|---|---|
| A11Y-01 | 2.4.1 Bypass Blocks | No skip-to-content link |
| A11Y-02 | 1.4.3 Contrast | `--text-muted #505668` (2.8:1) and `--text-secondary #8b91a6` (4.1:1 borderline) on dark |
| A11Y-03 | 1.3.1 Info & Relationships | Landing uses `<div>` for headings nav; missing `<main>`, `<nav>`, `<section>` landmarks, heading hierarchy jumps `h1`→`h3` without `h2` context in some tabs |
| A11Y-04 | 2.1.1 Keyboard | Workspace switcher `role=listbox` but options lack `aria-selected` focus roving; modals lack focus trap/return |
| A11Y-05 | 2.4.3 Focus Order | Modal overlay `z-index:200` but no `aria-modal="true"` + inert background |
| A11Y-06 | 3.3.1 Error Identification | Auth inputs missing `aria-describedby` linking to error text `field-feedback` |
| A11Y-07 | 1.1.1 Non-text | Brand `<img>` alt generic "Zoop Internet" repeated, illustration `aria-label` on wrapper but SVG paths no `aria-hidden` consistently, metric icons lack `aria-hidden` |
| A11Y-08 | 2.5.5 Target Size (AAA target) | Several `btn-xs` fail 24×24 minimum |
| A11Y-09 | 4.1.2 Name/Role/Value | Toast `role=status` correct but missing `aria-atomic` |
| A11Y-10 | 2.2.2 Pause/Stop | Animated counters & dot pulse `Infinite` without `prefers-reduced-motion` |

**Needed for 90:** Contrast fix, landmarks, skip link, focus trap, assoc errors, reduce motion.

### 2.5 SEO — 41/100

| ID | Issue | Location |
|---|---|---|
| SEO-01 | Title generic "Zoop Internet" (≤60 ch ok but no value prop) | `index.html:10` |
| SEO-02 | Description generic "Direct peer-to-peer connectivity platform." (<120 ch, no keywords, no CTA) | `index.html:9` |
| SEO-03 | No Open Graph / Twitter Cards | `index.html` missing `og:*`, `twitter:*` |
| SEO-04 | No canonical / hreflang | `index.html` |
| SEO-05 | No `robots.txt` / `sitemap.xml` | `web/public/` only icons + `_redirects` |
| SEO-06 | No JSON-LD `Organization`, `SoftwareApplication`, `FAQPage` | Entire site |
| SEO-07 | Heading structure: single `h1` but tab contents not in `<main>` with proper outline |
| SEO-08 | Images no `width/height` → CLS | Brand icons 28/36 without attrs? Has width but not `height` attr on some |
| SEO-09 | No `manifest` / `theme-color` | `index.html` |
| SEO-10 | SPA client-side routing without prerender / meta per route (`/security`, `/downloads` same meta) | `App.tsx:41-67` |

### 2.6 Content Quality — 71/100

- Strength: Brand voice friendly, "Private internet sharing" clear, 3-step plain language.
- Weak: Testimonials fabricated (Amara N., David K., Seline M.) with no disclaimer — trust risk. Downloads matrix file names mock; install commands real but no versioning. Security page thin (4 cards, <300 words). No changelog/blog depth. No FAQ to pre-empt AI answers. Jargon: "STUN/TURN", "CGNAT 100.64.0.0/10" exposed without gloss — alienates consumers.

### 2.7 Conversion Optimization — 58/100

| ID | Issue |
|---|---|
| CRO-01 | Primary CTA above fold correct, but no secondary social proof (logos, numbers) |
| CRO-02 | No pricing comparison — "Free" badge repeated but no plan table → decision friction |
| CRO-03 | Landing bottom CTA `lp-cta-banner` strong but not sticky nor repeated after scroll — scroll depth 60% loses CTA |
| CRO-04 | Auth page no trust badges (WireGuard, Ed25519, MIT, audited) beside PIN — anxiety |
| CRO-05 | No newsletter / waitlist / demo video — capture non-ready visitors |
| CRO-06 | No scarcity/urgency nor "30-sec install" timing cue |
| CRO-07 | Download matrix primary vs secondary button hierarchy weak — both similar weight |

### 2.8 Brand Experience — 78/100

- Strength: Cyan#38bdf8 → Green#34d399 gradient owns category; icon transparent PNG consistent; voice "your internet, truly private" cohesive.
- Gaps: No brand story/about block; footer © generic; no press kit; "BETA" badge missing for expectations; admin amber accent conflicts slightly (feels separate product not family); no consistent illustration style beyond bent arrows.

### 2.9 Performance Experience — 63/100

| ID | Issue |
|---|---|
| PERF-01 | Single bundle `react + all pages` no code splitting — landing loads admin code | `App.tsx` imports all |
| PERF-02 | No `preconnect` for `fonts.googleapis.com`, fonts block rendering | `index.css:7` `@import` blocks |
| PERF-03 | `index.css:7` Google Fonts `ital,opsz` loads unused italic; no `font-display: swap`? has swap but via import not `<link>` so render-blocking |
| PERF-04 | Images unoptimized PNG 759KB each (`public/zoopicon.png` 759864 bytes) — no webp/avif, no lazy |
| PERF-05 | No `vite.config` chunk split / `manualChunks`; no `build.target` / `cssCodeSplit` tuning | `vite.config.ts:5-17` minimal |
| PERF-06 | No resource hints `preload` LCP hero illustration; `BentArrowMeshIllustration` SVG 600×440 rendered eagerly |
| PERF-07 | `background-attachment: fixed` + `backdrop-filter: blur(18px)` heavy on low-end GPU |

### 2.10 AI Search Readiness — 33/100

| ID | Issue |
|---|---|
| AI-01 | No `llms.txt` / `ai.txt` / `.well-known/ai-plugin.json` |
| AI-02 | No FAQ schema nor Q/A content for LLM citation (What is Zoop? How is it different from VPN?) |
| AI-03 | Content not chunkable — long paragraphs without Q headings |
| AI-04 | No `robots.txt` `Allow: /` for AI crawlers (GPTBot, ClaudeBot, Perplexity) |
| AI-05 | No semantic FAQ section with `FAQPage` JSON-LD |
| AI-06 | No concise entity description for knowledge graph: "Zoop Internet is…" |

---

## 3. Priority Matrix (ICE)

| Area | Impact | Confidence | Ease | Score |
|---|---|---|---|---|
| SEO foundation (meta/OG/manifest/sitemap/robots) | 10 | 9 | 8 | 720 |
| A11y contrast + landmarks + skip link | 9 | 9 | 7 | 567 |
| Perf: font preconnect + split + image opt | 8 | 9 | 7 | 504 |
| Mobile bottom nav + touch targets | 8 | 8 | 7 | 448 |
| AI: llms.txt + FAQ + JSON-LD | 8 | 8 | 6 | 384 |
| UX onboarding + skeletons | 7 | 8 | 6 | 336 |
| CRO trust + pricing table | 8 | 7 | 5 | 280 |
| UI tokens + reduced-motion | 6 | 8 | 8 | 384 |

---

## 4. Recommended Baseline Before → After

Current Lighthouse (estimated): Perf 63, A11y 54, Best Practices 78, SEO 41
Post-transformation target: ≥90 each.
