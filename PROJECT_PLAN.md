# Zoop Website Transformation — Project Plan

**Owner:** Implementation Lead  
**Repo:** `zoop` (local git)  
**Timeline:** 5 sprints, executed sequentially in single session  
**Quality Gate:** ≥90/100 in all 10 categories, all P0 issues closed  
**Tracking:** Issues → `tasks/` + GitHub Issues (mirrored); Milestones = Sprints 1-5

---

## 1. Goals & Non-Goals

**Goals**
- Reach 90+ in UX, UI, Mobile, A11y, SEO, Content, Conversion, Brand, Performance, AI Readiness.
- No visual regression — premium dark system stays.
- Incremental, reversible commits per sprint.

**Non-Goals**
- Backend/API changes (control plane not in scope).
- Native mobile apps.
- Pricing backend wiring (UI-only comparison table).

---

## 2. Repository Structure (planned)

```
/README.md
/PROJECT_PLAN.md
/WEBSITE_AUDIT.md
/IMPROVEMENT_ROADMAP.md
/SPRINTS.md
/CHANGELOG.md
/tasks/               # one .md per task/issue
  S1-01-seo-meta.md ...
/web/...
  public/
    robots.txt
    sitemap.xml
    llms.txt
    ai.txt
    humans.txt
    manifest.webmanifest
```

---

## 3. Sprint Schedule

| Sprint | Theme | Focus Categories | Exit Criteria |
|---|---|---|---|
| **1** | Critical Foundations | SEO, A11y, Perf, Mobile | Meta+robots+sitemap+contrast+landmarks+vite baseline+mobile touch targets pass |
| **2** | High-Impact UX/CRO | UX, Conversion | Onboarding, skeletons, error boundaries, trust, CTAs measurable |
| **3** | UI Refinement | UI, Brand, A11y | Elevation, focus, reduced-motion, illustration consistency |
| **4** | SEO/Content/AI | SEO, Content, AI, Brand | JSON-LD, FAQ, llms.txt, per-route meta |
| **5** | Final QA | All | Lazy splits, a11y full pass, 320-1024 E2E, re-score |

---

## 4. Roles & Workflow

- **Lead:** codes, reviews self via checklists, commits per task.
- **Process per task:**
  1. Branch implicit (single workspace, commit per issue)
  2. Implement → `git diff` self-review → manual keyboard/contrast check
  3. Update issue status → `SPRINTS.md` check
  4. `CHANGELOG.md` entry → commit

---

## 5. Definition of Done (per issue)

- Title clear action
- Problem/Goal/Implementation/Acceptance/Testing sections filled (mirrors Roadmap task schema)
- Code change committed
- Acceptance criteria verbatim met
- `CHANGELOG.md` updated
- Category re-scored (section in `SPRINTS.md`)

---

## 6. Labels & Milestones

**Labels:** `critical` `high-impact` `ux` `ui` `seo` `content` `accessibility` `mobile` `performance` `conversion` `bug` `enhancement`

**Milestones:**
- Sprint 1 (Milestone 1), Sprint 2 ... Sprint 5

---

## 7. Quality Gates (after each sprint)

Ask:
- Has score improved? (re-estimate via checklist)
- Would a professional agency approve?
- Would a customer trust this?
- Would it compete with Linear/Cloudflare/Vercel marketing quality?

If no → continue within same sprint before advancing.

---

## 8. риски & Mitigation

- **Scope creep:** Stick to Roadmap tasks; any new idea → backlog `tasks/BACKLOG.md` not sprint.
- **Performance regression from bottom nav:** CSS-only where possible, `React.lazy` to offset.
- **Contrast brightening ruins premium feel:** Test only muted raise to `#8b9bb0`, keep subtlety via opacity on borders not text.

---

## 9. Commit Convention

`feat(web): [S1-01] add SEO meta package — title/OG/manifest/preconnect`

---

## 10. Final Report Deliverables

- Before vs After score table (10 categories)
- Per-sprint summary (issues closed, commits)
- Remaining opportunities (backlog)
- Maintenance plan (monthly Lighthouse + content + dependency cadence)
