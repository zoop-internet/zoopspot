# Changelog — Zoop Website Transformation

All notable website improvements are documented here, grouped by Sprint (Milestone). Follows Keep-a-Changelog.

## [1.1.0] — 2026-08-28 — Sprint 1 Critical Foundations

### Added
- **SEO foundation:** Full `<head>` package — title 59ch value prop, desc 155ch CTA, `preconnect` to fonts, `rel=canonical`, OG/Twitter large image, `theme-color`, `manifest.webmanifest`, `robots.txt` (Allow + GPTBot/ClaudeBot/PerplexityBot), `sitemap.xml` 7 routes, Organization + SoftwareApplication JSON-LD, `llms.txt`/`ai.txt`/`humans.txt` for AI crawlability (S1-01, S1-02, S4-04 partial)
- **Accessibility WCAG AA:** Raised `--text-muted` `#505668` (2.8:1) → `#8b9bb0` (5.1:1) and `--text-secondary` → `#b6bcc3` (7:1), added accent tokens, skip-to-content link `#main-content`, landmarks (`<main>`, `<header role=banner>`, `<nav>`), heading hygiene, `aria-hidden` on deco SVGs, ErrorBoundary + focus ring + `prefers-reduced-motion` (S1-03, S1-04)
- **Performance:** Moved fonts from CSS `@import` to `<link preconnect>` + `display=swap`, Vite `manualChunks` (vendor-react/landing/admin/app-user/app-org/auth), `target esnext`, `cssCodeSplit`, preload `zoopicon`, lazy `React.lazy` + `Suspense` per route with title/desc sync (S1-05)
- **Mobile:** `btn-sm/xs` min-height 32/28 with 44px hit, `input` 16px on ≤480 to prevent iOS zoom, shared `.mobile-bottom-nav` (56px) CSS + `MobileBottomNav.tsx` component integrated into User/Org portals, `background-attachment: scroll` readiness, drawer overlay polish (S1-06)
- **UX/A11y:** `WorkspaceSwitcher` full keyboard ARIA listbox (ArrowUp/Down, Home/End, Escape, roving tabIndex, focus return), `ErrorBoundary`, `Skeleton` shimmer components (ready for S2-02), auth trust badges (WireGuard/Ed25519/No tracking), landing trust bar + 7-item FAQ with `FAQPage` JSON-LD (early S2-05/S4-02)

### Changed
- `web/index.html` complete head rewrite; `web/vite.config.ts` build tuning; `web/src/index.css` token/contrast/focus/motion/skeleton/bottom-nav; `App.tsx` lazy + per-route meta; `LandingPage` landmarks + trust + FAQ + brand `width/height`/`loading`; `AuthPage` skip + trust row; `User/Org/Admin` skip + `<main>` + bottom nav

### Verified
- `npm run build` ✅ 11 chunks, `vendor-react` 57.1kB gzip, `landing` 9.9kB, no TS errors, Vite 8.2.1

## [1.0.0] — 2026-08-28 — Baseline
- Established audit baseline: avg 60.4/100, lowest AI 33, SEO 41
- Pre-existing design system: dark premium, glassmorphism, bent-arrow illustration, pill nav, metric strip
