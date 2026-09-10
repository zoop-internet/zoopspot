# Zoop Web — Master Website Review TODO

> **14-Iteration Review Roadmap — What Will Be Reviewed (Not Yet Fixed)**
> Scope: `web/` only — React 19 + TypeScript + Vite + Cloudflare Pages
> Source: `MASTER WEBSITE REVIEW, REDESIGN & OPTIMIZATION AGENT PROMPT`
> Status: **TODO — Review Phase** · No fixes yet
> Use: Work iteration by iteration 1→14. For each iteration, review the listed items, capture every weakness, then produce the 8-field solution for each finding (see template).

---

## 0) Objective & Review Lenses

**Objective:** Analyze `web/` against 2026 modern web best practices. Increase trust, clarity, engagement, conversions, usability, accessibility, search visibility, brand perception.

**Evaluate every page from the perspective of:**
- A first-time visitor
- A potential customer
- A mobile user
- A user with accessibility needs
- A search engine
- An AI assistant
- A business owner focused on conversions

**Pages to evaluate each iteration:** `/` (landing), `/how-it-works`, `/products`, `/downloads`, `/security`, `/pricing`, `/docs` + docs sub-pages, `/auth`, `/app` (Personal), `/org` (Organization), `/admin` (Platform Admin), `/privacy`, `/terms` + 404.

**For every weakness found you must capture:**

- What is wrong
- Why it matters
- Evidence from the website (`file:line` or screenshot/URL)
- The impact (Severity + who is affected)
- The priority (P0 blocker → P2 polish)
- The exact solution
- The improved version
- Implementation guidance (files, components, acceptance criteria)

> Vague feedback is forbidden. Never write "Improve the design" — write the 8 fields above.

---

## Iteration 1 — USER EXPERIENCE (UX) — TODO

**Review** — Answer for each page/flow, with evidence:

- [ ] Is the purpose of the website immediately clear?
- [ ] Is the value proposition obvious within 5 seconds?
- [ ] Is the customer journey logical?
- [ ] Is navigation intuitive?
- [ ] Are users guided toward the correct action?
- [ ] Is information easy to find?
- [ ] Are there unnecessary steps?
- [ ] Are decisions easy for users?
- [ ] Is cognitive load minimized?
- [ ] Are important actions obvious?

**Where to look in `web/`:** `src/App.tsx` routing + `src/landing/LandingPage.tsx` hero/journey + `src/app/user/UserDashboard.tsx` + `src/app/org/OrgDashboard.tsx` + `src/admin/AdminConsole.tsx` + `src/auth/AuthPage.tsx`.

**Deliverable for this iteration:** Table of UX findings (one row per weakness) using the 8-field template. Minimum coverage: landing hero 5-sec test, landing→auth→/app funnel, dashboard tab findability, Share vs Connect comprehension.

---

## Iteration 2 — USER INTERFACE DESIGN (UI) — TODO

**Review** — Visual audit across all portals:

- [ ] Visual hierarchy
- [ ] Layout quality
- [ ] Typography
- [ ] Color usage
- [ ] Spacing
- [ ] Alignment
- [ ] Components
- [ ] Buttons
- [ ] Cards
- [ ] Forms
- [ ] Icons
- [ ] Images
- [ ] Consistency
- [ ] Modern design patterns

> Identify anything that looks outdated, inconsistent, or reduces trust.

**Where to look:** `src/index.css` tokens + `src/landing/LandingPage.css` + `src/admin/AdminConsole.css` + `src/auth/AuthPage.css` + `src/components/` + icon usage in `LandingPage.tsx` / `UserDashboard.tsx` / `AdminConsole.tsx`.

**Deliverable:** UI inconsistency inventory + visual hierarchy pass/fail per breakpoint (1280/768/375 screenshots).

---

## Iteration 3 — MOBILE EXPERIENCE — TODO

**Review:**

- [ ] Mobile-first design
- [ ] Responsive behavior
- [ ] Touch targets (≥44px)
- [ ] Mobile navigation
- [ ] Text sizing
- [ ] Image scaling
- [ ] Forms
- [ ] Tables
- [ ] Buttons
- [ ] Scrolling experience
- [ ] Mobile conversion flow (landing→auth→register on phone)

**Where to look:** `src/index.css` media queries + `src/components/MobileBottomNav.tsx` + `src/landing/LandingPage.tsx` drawer + `src/app/user/UserDashboard.tsx` tables + `src/auth/AuthPage.tsx` PIN.

**Deliverable:** Device matrix pass/fail (iPhone SE, Pixel, iPad, 768, 375) + touch-target audit + scrolling/table findings.

---

## Iteration 4 — ACCESSIBILITY (WCAG 2.2 AA) — TODO

**Review:**

- [ ] Semantic structure
- [ ] Heading hierarchy
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Alt text
- [ ] Color contrast (≥4.5:1 text, 3:1 focus)
- [ ] Focus states
- [ ] Forms
- [ ] Error messages
- [ ] ARIA usage
- [ ] Motion sensitivity (`prefers-reduced-motion`)
- [ ] Accessible interactions

**Where to look:** `index.html` landmarks/skips + `src/App.tsx` route titles + `src/landing/LandingPage.tsx` docs headings + `src/components/WorkspaceSwitcher.tsx` listbox + `src/auth/AuthPage.tsx` `PinBoxes` + `src/app/user/UserDashboard.tsx` forms/toasts + `src/index.css` focus/reduced-motion.

**Deliverable:** Axe 0-violation check per route + keyboard-only register→connect flow + SR heading order + contrast table.

---

## Iteration 5 — CONTENT QUALITY — TODO

**Review:**

- [ ] Headlines
- [ ] Messaging
- [ ] Clarity
- [ ] Grammar
- [ ] Tone
- [ ] Readability
- [ ] Brand voice
- [ ] Content structure
- [ ] Customer-focused language
- [ ] Missing information

> Rewrite weak content when necessary (as proposal in findings).

**Where to look:** `src/landing/LandingPage.tsx` hero + `QUICKSTART_MD` / `CURATED_MD` + `src/app/user/UserDashboard.tsx` empty/error copies + `src/auth/AuthPage.tsx` hints + `src/content/` (if any) + `docs/`.

**Deliverable:** Copy inventory + reading-ease per hero/pricing + jargon audit + missing-info list + rewritten headlines (tracked as proposals).

---

## Iteration 6 — CONVERSION RATE OPTIMIZATION (CRO) — TODO

**Review:**

- [ ] CTA placement
- [ ] CTA wording
- [ ] Conversion paths
- [ ] Trust signals
- [ ] Lead generation
- [ ] Forms
- [ ] Friction points
- [ ] Objections
- [ ] Customer confidence
- [ ] Landing page effectiveness

> For weak conversion elements, redesign them (as proposal).

**Where to look:** `src/landing/LandingPage.tsx` CTAs + sticky CTA + `handleDownloadClick` + `handleWaitlist` + `src/auth/AuthPage.tsx` `handleDemoAccess` + signup + `src/api/client.ts`.

**Deliverable:** Funnel map landing→auth→register + CTA hierarchy audit + friction list + objection coverage + lead-gen honesty check + proposed CTA rewrites.

---

## Iteration 7 — SEO — TODO

**Review:**

*Technical SEO:*

- [ ] Page titles
- [ ] Meta descriptions
- [ ] Heading structure
- [ ] URLs
- [ ] Internal linking
- [ ] Sitemap readiness
- [ ] Structured data
- [ ] Schema opportunities

*Content SEO:*

- [ ] Search intent
- [ ] Keyword alignment
- [ ] Topic coverage
- [ ] Helpful content
- [ ] FAQs
- [ ] Authority signals

**Where to look:** `index.html` meta/OG/JSON-LD + `src/App.tsx` `ROUTE_META` + `VALID_ROUTES` + `scripts/prerender.mjs` + `public/sitemap.xml` or `public/robots.txt` presence + `src/landing/LandingPage.tsx` footer links + `src/content/`.

**Deliverable:** Title/meta per route table + canonical check + heading order + internal linking map + sitemap/robots gaps + schema inventory + intent→page mapping.

---

## Iteration 8 — AI SEARCH READINESS — TODO

**Review:**

- [ ] Is content understandable by AI systems?
- [ ] Is information structured clearly?
- [ ] Are entities explained?
- [ ] Are FAQs available?
- [ ] Is semantic HTML used?
- [ ] Can AI assistants understand the business?
- [ ] Is content suitable for answer engines?

**Where to look:** `src/landing/LandingPage.tsx` `mdToHtml` + `dangerouslySetInnerHTML` + `DocsView` article/Toc + `/llms.txt` + `public/llms.txt` or `public/llms-full.txt` + FAQ rendering + entity definitions.

**Deliverable:** Entity glossary audit + semantic HTML check + FAQ availability + `llms.txt` validity + chunking suitability for answer engines.

---

## Iteration 9 — TRUST AND CREDIBILITY — TODO

**Review:**

- [ ] About section
- [ ] Company information
- [ ] Team credibility
- [ ] Testimonials
- [ ] Reviews
- [ ] Case studies
- [ ] Client logos
- [ ] Certifications
- [ ] Contact information
- [ ] Professional appearance

> Identify anything reducing trust.

**Where to look:** `src/landing/LandingPage.tsx` About/footer + `index.html` Organization JSON-LD + `PRIVACY.md`/`TERMS.md` routes + contact/security.txt presence + GitHub link.

**Deliverable:** Trust-gap list + proof inventory (real vs fake) + contact/legal completeness check.

---

## Iteration 10 — BRAND EXPERIENCE — TODO

**Review:**

- [ ] Brand consistency
- [ ] Messaging
- [ ] Visual identity
- [ ] Tone
- [ ] Professionalism
- [ ] Differentiation (vs VPN)
- [ ] Memorability

**Where to look:** `src/index.css` tokens + `src/landing/LandingPage.tsx` brand + mesh illustration + `src/components/WorkspaceSwitcher.tsx` + copy across portals + icon/gradient usage.

**Deliverable:** Brand consistency pass/fail per portal + messaging differentiation check + memorability assessment.

---

## Iteration 11 — INFORMATION ARCHITECTURE — TODO

**Review:**

- [ ] Page structure
- [ ] Navigation hierarchy
- [ ] Content organization
- [ ] User flows
- [ ] Missing pages
- [ ] Confusing sections

**Where to look:** `src/App.tsx` `ROUTE_META` + `VALID_ROUTES` + `src/landing/LandingPage.tsx` `DOCS_SECTIONS` + `src/app/user/UserDashboard.tsx` tabs + `src/admin/AdminConsole.tsx` `NAV_SECTIONS` + `src/components/WorkspaceSwitcher.tsx`.

**Deliverable:** IA sitemap + hierarchy depth + missing-pages list + flow diagrams + confusing-section inventory + deep-link (URL tab) audit.

---

## Iteration 12 — PERFORMANCE EXPERIENCE — TODO

**Review visible/perceived performance:**

- [ ] Heavy images
- [ ] Slow-feeling interactions
- [ ] Animation problems
- [ ] Layout shifts (CLS)
- [ ] Excessive content
- [ ] Poor loading experience

> Recommend improvements (as proposals, not yet implemented).

**Where to look:** `index.html` fonts/preloads + `src/landing/LandingPage.tsx` `AnimatedCounter` + `BentArrowMeshIllustration` + `vite.config.ts` chunks + `src/index.css` skeleton/shimmer + `public/` images.

**Deliverable:** Lighthouse per route + bundle/budget notes + image/font audit + interaction jank list + CLS sources + loading skeleton assessment.

---

## Iteration 13 — FORMS AND INTERACTIONS — TODO

**Review:**

- [ ] Form length
- [ ] Clarity
- [ ] Validation (inline vs submit)
- [ ] Error handling
- [ ] User feedback
- [ ] Conversion friction

**Where to look:** `src/auth/AuthPage.tsx` signup/signin/PIN + `src/app/user/UserDashboard.tsx` `WalletTab` + `src/admin/AdminConsole.tsx` forms + `src/context/NetworkContext.tsx` flows + `src/api/client.ts`.

**Deliverable:** Form-length audit + validation timing map + error-message inventory + feedback/toast roles + friction points per form.

---

## Iteration 14 — MODERN WEB STANDARDS — TODO

**Review:**

- [ ] Responsive design
- [ ] Component consistency
- [ ] Design systems
- [ ] Modern layouts (grid, container queries)
- [ ] Microinteractions
- [ ] Progressive enhancement (no-JS)
- [ ] Modern frontend practices (types, lint, tests, build)

**Where to look:** `src/index.css` system + `src/components/` + `src/landing/LandingPage.tsx` progressive links + `vite.config.ts` + `tsconfig.json` + `package.json` scripts + `public/manifest.webmanifest` + `.github/workflows/`.

**Deliverable:** Design-system presence check + layout modernity + microinteraction inventory + no-JS fallback check + tooling/practices gap list.

---

## How Findings Must Be Documented

For each weakness found in any iteration, file a finding row with:

- What is wrong
- Why it matters
- Evidence from the website (`file:line`, URL, or screenshot)
- The impact (Critical/High/Medium + affected persona)
- The priority (P0→P2)
- The exact solution (design + code path, not vague)
- The improved version (what user will see)
- Implementation guidance (files/components/acceptance)

Never file a finding as "Improve SEO" — file it as the 8 fields above.

---

## Execution Order

Do iterations **in order 1→14**. Each iteration is a review pass only; do not implement fixes until the full review backlog is captured. After all 14 are reviewed, consolidate the 8-field findings into the improvement blueprint and then start implementation iteration 1.

---

## Tracking

- [ ] Iteration 1 — UX — reviewed
- [ ] Iteration 2 — UI — reviewed
- [ ] Iteration 3 — Mobile — reviewed
- [ ] Iteration 4 — A11y — reviewed
- [ ] Iteration 5 — Content — reviewed
- [ ] Iteration 6 — CRO — reviewed
- [ ] Iteration 7 — SEO — reviewed
- [ ] Iteration 8 — AI Search Readiness — reviewed
- [ ] Iteration 9 — Trust & Credibility — reviewed
- [ ] Iteration 10 — Brand Experience — reviewed
- [ ] Iteration 11 — Information Architecture — reviewed
- [ ] Iteration 12 — Performance Experience — reviewed
- [ ] Iteration 13 — Forms & Interactions — reviewed
- [ ] Iteration 14 — Modern Web Standards — reviewed
- [ ] Consolidation → 8-field blueprint → start Iteration 1 implementation

Next step: **Begin Iteration 1 — UX review** and log findings in this file or a companion `FINDINGS.md` per iteration.
