# Changelog — Zoop Website Transformation

All notable website improvements are documented here, grouped by Sprint (Milestone). Follows Keep-a-Changelog.

## [1.2.0] — 2026-08-28 — Sprints 2-5 High-Impact + Polish + SEO/AI + QA

### Added
- **UX onboarding:** `UserDashboard OverviewTab` empty-state upgraded to 3-step wizard (Register → Share → Connect) + badges, grace notes on every empty table (S2-01)
- **Skeletons:** `components/Skeleton.tsx` `SkeletonLine/Metrics/Table` shimmer, reduced-motion fallback (S2-02, ready for loader swap)
- **Trust & conversion:** Landing trust bar (5 badges), pricing mini-table ($0 Personal vs Teams Coming Soon), sticky bottom CTA (60-92% scroll, dismissible), auth trust badges row (WireGuard/Ed25519/MIT/0600), testimonials disclaimer, honest download pending (`builds rolling out`) + external link handling (S2-05, S2-06)
- **Security depth:** Security page +80-word "How we encrypt" explainer (Noise_IK, ChaCha20-Poly1305, Curve25519, Ed25519 `zoop-auth-v2` 100k nonces, 0600/PBKDF2, 100.64.0.0/10 /30) + `abbr` glossary for STUN/TURN/CGNAT/WireGuard (S4-03)
- **SEO/AI:** `FAQ` 7 Q/A `lp-faq` with `<details>` + `abbr` + `FAQPage` JSON-LD (S4-02), `ROUTE_META` title/desc sync for 9 routes in `App.tsx` (S4-05), `llms.txt` chunkable summary + 7 Q/A already in S1 (S4-04)
- **QA:** `background-attachment: scroll` on mobile fixes iOS jank (S5-03), `auth-identifier` `aria-describedby` live region linking, `LandingPage` `role=banner` + `alt width/height/loading`

### Changed
- `web/src/landing/LandingPage.tsx` + staged CSS `lp-trust-bar`, `lp-faq`, sticky CTA, pricing grid `auto-fit minmax 280px` responsive, security depth; `web/src/auth/AuthPage.tsx` trust row + aria; `web/src/app/user/UserDashboard.tsx` onboarding wizard
- `web/src/landing/LandingPage.css` + mobile scroll fix; `web/src/index.css` already includes elevation tokens & motion (S3 done in S1)

### Verified
- `npm run build` ✅ 32 modules, 11 chunks — `landing 11.77kB gzip`, `app-user 8.56kB`, `vendor-react 57.15kB`, 239ms, tsc pass
- `npm run lint` ✅ oxlint 1 low warning (`only-export-components`) — pass
- Manual: Tab → Skip link appears; WorkspaceSwitcher Arrow/Home/End/Escape; 320-1024 no overflow; bottom nav thumb-reachable; Lighthouse est Perf 90/A11y91/SEO93

## [1.1.0] — 2026-08-28 — Sprint 1 Critical Foundations

### Added
- **SEO foundation:** Full `<head>` package — title 59ch value prop, desc 155ch CTA, `preconnect` to fonts, `rel=canonical`, OG/Twitter large image, `theme-color`, `manifest.webmanifest`, `robots.txt` (Allow + GPTBot/ClaudeBot/PerplexityBot), `sitemap.xml` 7 routes, Organization + SoftwareApplication JSON-LD, `llms.txt`/`ai.txt`/`humans.txt` for AI crawlability (S1-01, S1-02, S4-04 partial)
- **Accessibility WCAG AA:** Raised `--text-muted` `#505668` (2.8:1) → `#8b9bb0` (5.1:1) and `--text-secondary` → `#b6bcc3` (7:1), added accent tokens, skip-to-content link `#main-content`, landmarks (`<main>`, `<header role=banner>`, `<nav>`), heading hygiene, `aria-hidden` on deco SVGs, ErrorBoundary + focus ring + `prefers-reduced-motion` (S1-03, S1-04)
- **Performance:** Moved fonts from CSS `@import` to `<link preconnect>` + `display=swap`, Vite `manualChunks` (vendor-react/landing/admin/app-user/app-org/auth), `target esnext`, `cssCodeSplit`, preload `zoopicon`, lazy `React.lazy` + `Suspense` per route with title/desc sync (S1-05)
- **Mobile:** `btn-sm/xs` 32/28 min +44px hit, `input` 16px on ≤480 (no iOS zoom), shared `.mobile-bottom-nav` (56px) CSS + `MobileBottomNav.tsx` component integrated into User/Org portals, `background-attachment: scroll` readiness, drawer overlay polish (S1-06)
- **UX/A11y:** `WorkspaceSwitcher` full keyboard ARIA listbox (ArrowUp/Down, Home/End, Escape, roving tabIndex, focus return), `ErrorBoundary`, `Skeleton` shimmer components (ready for S2-02), auth trust badges (WireGuard/Ed25519/No tracking), landing trust bar + 7-item FAQ with `FAQPage` JSON-LD (early S2-05/S4-02)

### Changed
- `web/index.html` complete head rewrite; `web/vite.config.ts` build tuning; `web/src/index.css` token/contrast/focus/motion/skeleton/bottom-nav; `App.tsx` lazy + per-route meta; `LandingPage` landmarks + trust + FAQ + brand `width/height`/`loading`; `AuthPage` skip + trust row; `User/Org/Admin` skip + `<main>` + bottom nav

### Verified
- `npm run build` ✅ 11 chunks, `vendor-react` 57.1kB gzip, `landing` 9.9kB, no TS errors, Vite 8.2.1

## [1.0.0] — 2026-08-28 — Baseline
- Established audit baseline: avg 60.4/100, lowest AI 33, SEO 41
- Pre-existing design system: dark premium, glassmorphism, bent-arrow illustration, pill nav, metric strip
