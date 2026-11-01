# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-11-01 (PE-59 full review re-run)  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`) after PE-58 merge  
**Scope:** UX pack PE-50–57 + PE-58 CONFIG autosave + PE-59 CONFIG polish; **36** unit tests; diagnostics client (ingest URL empty by default); version-sync CI. **Validation path:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md).

---

## Shipped product score: **8.6 / 10**

Author-facing beta score for hosted **2.0.0.15**. Reflects theme/appearance onboarding (PE-50–57), review-mode audit UX, PE-58 wiring fixes, and PE-59 persistence for batch sections / rewrite mode plus truncation status feedback. See [FULL-APP-REVIEW-PE-59.md](./FULL-APP-REVIEW-PE-59.md).

**Separate metric:** **vNext roadmap alignment: ~4.2 / 10 (42%)** — unchanged; master spec IA ≠ seven-tab shipped UI.

---

## Shipped-product weighted index

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| **UX** | 28% | **8.6** | Seven-tab IA, themes, workflow strip, review-mode hints, truncation status (PE-59). |
| **Shipped feature set completeness** | 28% | **8.5** | Local-first audit/coach/rewrite, scans, export, shaper v1 — vs [features doc](./prozaedit-features.md). |
| **Reliability / stability** | 18% | **8.2** | CONFIG round-trip improved (PE-58–59); Word API variance unchanged. |
| **Security / privacy** | 13% | **8.0** | Local-first; opt-in diagnostics; document-scoped API keys. |
| **Maintainability** | 13% | **8.0** | **32** `lib/*.js` modules; large `taskpane.js` orchestrator; wiring tests at 36. |

**Weighted shipped index:** **~8.6 / 10** (rounded; arithmetic **~8.58** on table above).

---

## Path to **8.8–9.0** (shipped product)

| Lever | Priority |
|-------|----------|
| **Word web checklist** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) | P0 |
| **Beta UX-4 feedback** — [UX rating](./prozaedit-ux-rating-and-recommendations.md) | P0 |
| **Deploy diagnostics ingest** (optional) — [DIAGNOSTICS.md](./DIAGNOSTICS.md) | P1 |
| Remove legacy chapter UI (F-58-4) after migration window | P2 |
| Office.js smoke in CI (Phase 2) | P2 |

---

## Strengths

- **Local-first workflow** — audit, coach, paraphrase at 0 tokens; sticky Run audit / Undo / Last edit.
- **UX pack + themes** — Light/Dark/system, dark-appearance onboarding, competitive polish (PE-57).
- **Safety** — confirm-before-apply, continuity guard, search sanitization, scope caps + truncation hint.
- **Modular engines** — chronology/citation scans, shaper, report export, diagnostics client.
- **Version-sync CI** + **36** unit tests including CONFIG autosave wiring.

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Word API / WebView variance | High | Manual validation still required. |
| Fiction gating confusion | Medium | Partial-scope fiction warnings present; user education. |
| Truncation on long docs | Medium | Card + status hint; section loop still recommended. |
| No Office.js in CI | Medium | Regressions in `Word.run` manual. |
| vNext expectation drift | Medium | Keep phased plan as north star only. |
| Diagnostics ingest | Low | Empty URL until owner deploys worker. |

---

## Cross-links

- **Full review (current):** [FULL-APP-REVIEW-PE-59.md](./FULL-APP-REVIEW-PE-59.md) · prior [PE-58](./FULL-APP-REVIEW-PE-58.md)
- **UX depth:** [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md)
- **Implementation tracker:** [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md)

---

### Footnote: legacy blended index

**Overall weighted score: 6.7 / 10** *(retired headline)* — do not compare to shipped **8.6**; vNext alignment tracked separately at **~4.2/10**.
