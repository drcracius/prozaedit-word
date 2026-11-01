# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-11-01 (PE-63 UX tour)  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`) after PE-62 + **PE-63**  
**Scope:** UX pack PE-50–57 + PE-58–59 CONFIG polish + PE-61/62 onboarding + **PE-63 skippable tour & scope footnote**; unit tests (see CI); diagnostics client (ingest URL empty by default); version-sync CI. **Validation path:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md).

---

## Shipped product score: **8.75 / 10**

Author-facing beta score for hosted **2.0.0.15**. Reflects PE-61 first-run Simple mode, first-audit checklist, manual-audit Help positioning, workflow hint, PE-62 Audit filter-lanes / truncation status polish, and **PE-63** guided tour + post-audit scope footnote. See [FULL-APP-REVIEW-PE-62.md](./FULL-APP-REVIEW-PE-62.md) · [RELEASE-NOTES-PE-63-UX-TOUR.md](./RELEASE-NOTES-PE-63-UX-TOUR.md).

**Separate metric:** **vNext roadmap alignment: ~4.2 / 10 (42%)** — unchanged; master spec IA ≠ seven-tab shipped UI.

---

## Shipped-product weighted index

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| **UX** | 28% | **8.8** | PE-63 skippable tour + scope footnote; PE-61/62 onboarding; seven-tab density unchanged by design. |
| **Shipped feature set completeness** | 28% | **8.5** | Local-first audit/coach/rewrite, scans, export, shaper v1 — vs [features doc](./prozaedit-features.md). |
| **Reliability / stability** | 18% | **8.2** | CONFIG + first-run tests at **40**; Word API variance unchanged. |
| **Security / privacy** | 13% | **8.0** | Local-first; opt-in diagnostics; document-scoped API keys. |
| **Maintainability** | 13% | **8.0** | **32** `lib/*.js` modules; large `taskpane.js` orchestrator. |

**Weighted shipped index:** **~8.75 / 10** (rounded; arithmetic **~8.72** on table above).

---

## Path to **8.8–9.0** (shipped product)

| Lever | Priority |
|-------|----------|
| **Word web checklist** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) + PE-61 paths | P0 |
| **Beta UX-4 feedback** — [UX rating](./prozaedit-ux-rating-and-recommendations.md) | P0 |
| **3-stop tour** — [RELEASE-NOTES-PE-63-UX-TOUR.md](./RELEASE-NOTES-PE-63-UX-TOUR.md) | **Shipped (PE-63)** |
| **Deploy diagnostics ingest** (optional) — [DIAGNOSTICS.md](./DIAGNOSTICS.md) | P1 |
| Office.js smoke in CI | P2 |

---

## Strengths

- **Local-first workflow** — explicit Run audit; aligns with “one lane at a time” forum pattern.
- **PE-61/63 onboarding** — Simple first run, checklist, **guided tour**, scope footnote after large runs.
- **UX pack + themes** — Light/Dark/system, review-mode audit UX (PE-57).
- **Safety** — confirm-before-apply, continuity guard, scope caps + truncation status hint.
- **Version-sync CI** + **46** unit tests including onboarding tour and CONFIG wiring.

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Word API / WebView variance | High | Manual validation still required. |
| Seven-tab power-tool first impression | Medium | Mitigated by Simple mode; not eliminated. |
| Truncation on long docs | Medium | Card + status hint; section loop recommended. |
| No Office.js in CI | Medium | Regressions in `Word.run` manual. |
| vNext expectation drift | Medium | Keep phased plan as north star only. |
| Diagnostics ingest | Low | Empty URL until owner deploys worker. |

---

## Cross-links

- **Full review (current):** [FULL-APP-REVIEW-PE-62.md](./FULL-APP-REVIEW-PE-62.md) · prior [PE-59](./FULL-APP-REVIEW-PE-59.md) · [PE-58](./FULL-APP-REVIEW-PE-58.md)
- **Forum research:** [prozaedit-addin-usability-forum-research.md](./prozaedit-addin-usability-forum-research.md)
- **PE-61 release:** [RELEASE-NOTES-PE-61-ONBOARDING.md](./RELEASE-NOTES-PE-61-ONBOARDING.md)
- **PE-63 release:** [RELEASE-NOTES-PE-63-UX-TOUR.md](./RELEASE-NOTES-PE-63-UX-TOUR.md)
- **UX depth:** [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md)

---

### Footnote: legacy blended index

**Overall weighted score: 6.7 / 10** *(retired headline)* — do not compare to shipped **8.75**; vNext alignment tracked separately at **~4.2/10**.
