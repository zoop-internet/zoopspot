# Sprints — Execution Log

**Execution model:** 5 sprints, sequential. Each issue = one task from `IMPROVEMENT_ROADMAP.md`. Status checked here.

---

## Sprint 1 — Critical Foundations
**Goal:** SEO crawlable, AA contrast, keyboard/nav foundations, perf baseline, mobile usable.
**Milestone:** Sprint 1 — ✅ DONE 2026-08-28

| ID | Title | Labels | Status | Commit |
|---|---|---|---|---|
| S1-01 | SEO meta package (title/OG/Twitter/canonical/theme/manifest) | `critical, seo` | ✅ DONE | feat(web): S1-01 SEO meta package |
| S1-02 | robots.txt + sitemap.xml | `critical, seo` | ✅ DONE | feat(web): S1-02 robots + sitemap |
| S1-03 | Fix contrast tokens (muted → 7:1 AA) | `critical, accessibility, ui` | ✅ DONE | feat(web): S1-03 contrast AA |
| S1-04 | Landmarks + skip link + heading hygiene | `critical, accessibility` | ✅ DONE | feat(web): S1-04 landmarks + skip |
| S1-05 | Vite perf baseline (preconnect, split, font link) | `critical, performance` | ✅ DONE | feat(web): S1-05 vite chunks |
| S1-06 | Mobile nav & touch targets (44px, bottom nav, scroll fix) | `critical, mobile` | ✅ DONE | feat(web): S1-06 mobile nav |

**Re-score after S1 (estimated):** SEO 41→78 (+37), A11y 54→82 (+28), Perf 63→78 (+15), Mobile 62→80 (+18)

---

## Sprint 2 — High-Impact UX & Conversion
**Goal:** First-time user not stuck, perceived perf, trust at money moments.
**Milestone:** Sprint 2

| ID | Title | Labels | Status | Commit |
|---|---|---|---|---|
| S2-01 | Onboarding empty states | `high-impact, ux, content` | ☐ TODO |  |
| S2-02 | Skeleton loaders | `high-impact, ux, performance` | ☐ TODO |  |
| S2-03 | ErrorBoundary + live regions | `high-impact, ux, accessibility` | ☐ TODO |  |
| S2-04 | WorkspaceSwitcher keyboard (ARIA listbox) | `high-impact, accessibility, ux` | ☐ TODO |  |
| S2-05 | Trust & conversion block upgrade | `high-impact, conversion, content` | ☐ TODO |  |
| S2-06 | Download realism & CTA hierarchy | `high-impact, conversion` | ☐ TODO |  |

**Re-score target after S2:** UX 68→84, Conversion 58→80, Content 71→80

---

## Sprint 3 — UI Refinement
**Goal:** Premium polish without churn.
**Milestone:** Sprint 3

| ID | Title | Labels | Status | Commit |
|---|---|---|---|---|
| S3-01 | Elevation system tokens | `ux, ui` | ☐ TODO |  |
| S3-02 | Focus & reduced-motion system | `accessibility, ui` | ☐ TODO |  |
| S3-03 | Icon grid & typography polish | `ui` | ☐ TODO |  |
| S3-04 | Empty state illustration consistency | `ui, ux` | ☐ TODO |  |

**Re-score target after S3:** UI 76→88, Brand 78→88, A11y 82→88

---

## Sprint 4 — SEO / Content / AI Readiness
**Goal:** Discoverable by humans + LLMs.
**Milestone:** Sprint 4

| ID | Title | Labels | Status | Commit |
|---|---|---|---|---|
| S4-01 | JSON-LD (Organization, SoftwareApplication) | `seo, ai` | ☐ TODO |  |
| S4-02 | FAQ section + FAQPage JSON-LD | `seo, content, ai` | ☐ TODO |  |
| S4-03 | Content depth & jargon glossing | `content, seo` | ☐ TODO |  |
| S4-04 | llms.txt + ai.txt + humans.txt | `seo, ai` | ☐ TODO |  |
| S4-05 | Per-route SPA meta (title/desc sync) | `seo` | ☐ TODO |  |

**Re-score target after S4:** SEO 78→92, Content 80→90, AI 33→88

---

## Sprint 5 — Final Optimization & QA
**Goal:** 90+ every category, no regressions.
**Milestone:** Sprint 5

| ID | Title | Labels | Status | Commit |
|---|---|---|---|---|
| S5-01 | Lazy route splits + Suspense | `performance` | ☐ TODO |  |
| S5-02 | Full a11y pass (keyboard, traps, contrast) | `accessibility` | ☐ TODO |  |
| S5-03 | Mobile E2E 320-1024 | `mobile` | ☐ TODO |  |
| S5-04 | Microcopy proof | `content` | ☐ TODO |  |
| S5-05 | Re-score & changelog & maintenance plan | `seo, performance, conversion` | ☐ TODO |  |

**Exit Gate:** All categories ≥90, all P0 closed, no horizontal overflow, Lighthouse Perf≥90/A11y≥90/SEO≥92 (lab est).

---

## Progress Log

- 2026-08-28 — Sprint planning initialized, audit/roadmap committed.
- …
