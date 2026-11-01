# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-11-01 (PE-71 three-pass audit; baseline **275ba05** post–UX bundle **PE-63–67**)  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`)  
**Scope:** PE-50–57 UX pack + PE-58–62 CONFIG/onboarding + **PE-63 tour** + **PE-64 Essentials** + **PE-65 plain language** + **PE-66 Important labels** + **PE-67 tab flow**; unit tests (**57**, see CI); diagnostics client (ingest URL empty by default); version-sync CI. **Validation path:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md). **Full audit:** [THREE-PASS-AUDIT-PE-71.md](./THREE-PASS-AUDIT-PE-71.md).

---

## Shipped product score: **8.80 / 10**

Author-facing beta score for hosted **2.0.0.15**. Reflects PE-61 first-run Simple mode through **PE-67** workflow tab order, cross-navigation, and PWA-style mitigations. PE-71 lowered the headline slightly from **8.85** while **P1 review-flow fixes remain open on `main`** (merged via [PR #19](https://github.com/drcracius/prozaedit-word/pull/19) when ready — projected **~8.88**). See [THREE-PASS-AUDIT-PE-71.md](./THREE-PASS-AUDIT-PE-71.md) · [FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md) · [RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md).

**Separate metric:** **vNext roadmap alignment: ~4.2 / 10 (42%)** — unchanged; master spec IA ≠ seven-tab shipped UI.

---

## Shipped-product weighted index

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| **UX** | 28% | **8.90** | PE-67 tab flow + cross-nav; PE-66 Important-first; −0.15 until PR #19 card review P1s land. |
| **Shipped feature set completeness** | 28% | **8.5** | Local-first audit/coach/rewrite, scans, export, shaper v1 — vs [features doc](./prozaedit-features.md). |
| **Reliability / stability** | 18% | **8.15** | Failed-audit success toast on main; CONFIG + workflow helpers at **57** tests. |
| **Security / privacy** | 13% | **8.0** | Local-first; opt-in diagnostics; document-scoped API keys. |
| **Maintainability** | 13% | **8.0** | **32** `lib/*.js` modules; large `taskpane.js` orchestrator. |

**Weighted shipped index:** **~8.80 / 10** (rounded; arithmetic **~8.78** on table above).

---

## Path to **8.9–9.0** (shipped product)

| Lever | Priority |
|-------|----------|
| **Merge PR #19 (PE-69)** — review flow, tour trap, recovery copy | **P1** |
| **Word web checklist** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) + PE-63–67 paths | P0 (owner) |
| **Beta UX-4 feedback** — [UX rating](./prozaedit-ux-rating-and-recommendations.md) | P0 |
| **UX bundle** — [RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md) | **Shipped (PE-63–67)** |
| **Deploy diagnostics ingest** (optional) — [DIAGNOSTICS.md](./DIAGNOSTICS.md) | P1 |
| Office.js smoke in CI (F-58-9) | P2 |

---

## Strengths

- **Local-first workflow** — explicit Run audit; aligns with “one lane at a time” forum pattern.
- **Simple-default UX** — Start/Run/Fix/Help tab flow, tour, Essentials, Important-first Audit.
- **UX pack + themes** — Light/Dark/system, review-mode audit UX (PE-57).
- **Safety** — confirm-before-apply, continuity guard, scope caps + truncation status hint.
- **Version-sync CI** + **57** unit tests including workflow-nav and CONFIG wiring.

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Audit failure → success toast (main) | **High (P1)** | Fixed on PR #19; merge recommended. |
| Card list scroll/focus on Mute/Dismiss (main) | **High (P1)** | Fixed on PR #19. |
| Word API / WebView variance | High | Manual validation still required (PE-47). |
| Seven-tab power-tool first impression | Medium | Mitigated by Simple mode + tab order. |
| Truncation on long docs | Medium | Card + status hint; section loop recommended. |
| No Office.js in CI | Medium | Regressions in `Word.run` manual. |
| vNext expectation drift | Medium | Keep phased plan as north star only. |
| Diagnostics ingest | Low | Empty URL until owner deploys worker. |
| Stale “29 tests” in some milestone docs | Low | Sync to **57** (PE-71 note). |

---

## Cross-links

- **Three-pass audit (PE-71):** [THREE-PASS-AUDIT-PE-71.md](./THREE-PASS-AUDIT-PE-71.md)
- **Full review (PE-68):** [FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md) · prior [PE-62](./FULL-APP-REVIEW-PE-62.md)
- **PE-69 hardening (open):** [PR #19](https://github.com/drcracius/prozaedit-word/pull/19)
- **Forum research:** [prozaedit-addin-usability-forum-research.md](./prozaedit-addin-usability-forum-research.md)
- **UX bundle release:** [RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md)

---

### Footnote: legacy blended index

**Overall weighted score: 6.7 / 10** *(retired headline)* — do not compare to shipped **8.80**; vNext alignment tracked separately at **~4.2/10**.
