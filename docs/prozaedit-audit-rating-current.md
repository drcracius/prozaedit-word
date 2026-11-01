# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-11-01 (PE-72 hardening on top of PE-71 three-pass audit; PE-69 hardening merged via PR #19)  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`)  
**Scope:** PE-50–57 UX pack + PE-58–62 CONFIG/onboarding + **PE-63 tour** + **PE-64 Essentials** + **PE-65 plain language** + **PE-66 Important labels** + **PE-67 tab flow**; automated tests (**120**: unit + jsdom task-pane harness with a mocked Office host; see CI) and a static wiring gate; diagnostics client (ingest URL empty by default); version-sync CI. **Validation path:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md). **Full audit:** [THREE-PASS-AUDIT-PE-71.md](./THREE-PASS-AUDIT-PE-71.md).

---

## Shipped product score: **8.90 / 10**

Author-facing beta score for hosted **2.0.0.15**, **estimated by judgment, not measured on a real Word host**. Moves from **8.80** (PE-71) as follows: **+0.08** for PR #19 landing (failed audit no longer reports success, card review focus, tour trap, recovery copy; projected **~8.88** in PE-71) and **+0.02** for PE-72 (global Cancel, real Gemini abort, Try again with no-double-apply, global error banner, CONFIG/storage guards, 120 tests, wiring gate). The PE-72 increment is deliberately small: it is verified only against a mocked host, so reliability on real Word is still unproven. See [RELEASE-NOTES-PE-72-HARDENING.md](./RELEASE-NOTES-PE-72-HARDENING.md) · [THREE-PASS-AUDIT-PE-71.md](./THREE-PASS-AUDIT-PE-71.md) · [FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md).

**Separate metric:** **vNext roadmap alignment: ~4.2 / 10 (42%)** — unchanged; master spec IA ≠ seven-tab shipped UI.

---

## Shipped-product weighted index

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| **UX** | 28% | **9.00** | PE-67 tab flow + cross-nav; PE-66 Important-first; PE-69 card review; PE-72 always-visible Cancel and Try again. |
| **Shipped feature set completeness** | 28% | **8.5** | Local-first audit/coach/rewrite, scans, export, shaper v1 — vs [features doc](./prozaedit-features.md). |
| **Reliability / stability** | 18% | **8.50** | Busy-state locks, abort, retry, global error guard, CONFIG/storage guards, **120** tests incl. mocked-host harness. Capped: no real-host validation. |
| **Security / privacy** | 13% | **8.0** | Local-first; opt-in diagnostics; document-scoped API keys. |
| **Maintainability** | 13% | **8.1** | **40** `lib/*.js` modules, wiring gate and harness in CI; `taskpane.js` orchestrator grew. |

**Weighted shipped index (table arithmetic):** **~8.52**. The headline **8.90** is a judgment-adjusted author-facing score (the same convention as the earlier 8.80, whose table arithmetic was also lower, ~8.42); treat the table as the conservative floor and the headline as the beta estimate. Neither is validated on a real Word host.

---

## Path to **8.9–9.0** (shipped product)

| Lever | Priority |
|-------|----------|
| **Merge PR #19 (PE-69)** — review flow, tour trap, recovery copy | **Done** |
| **PE-72 manual rows** — cancel / retry / long doc in [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) | P0 (owner) |
| **Word web checklist** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) + PE-63–67 paths | P0 (owner) |
| **Beta UX-4 feedback** — [UX rating](./prozaedit-ux-rating-and-recommendations.md) | P0 |
| **UX bundle** — [RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md) | **Shipped (PE-63–67)** |
| **Deploy diagnostics ingest** (optional) — [DIAGNOSTICS.md](./DIAGNOSTICS.md) | P1 |
| Real-host Office.js smoke in CI (F-58-9) | P2 — jsdom mocked-host smoke exists (PE-72), real host infeasible in CI |

---

## Strengths

- **Local-first workflow** — explicit Run audit; aligns with “one lane at a time” forum pattern.
- **Simple-default UX** — Start/Run/Fix/Help tab flow, tour, Essentials, Important-first Audit.
- **UX pack + themes** — Light/Dark/system, review-mode audit UX (PE-57).
- **Safety** — confirm-before-apply, continuity guard, scope caps + truncation status hint, single-flight edit lock, uncertain-apply never retried.
- **CI:** version sync, wiring gate (ids/handlers/assets), **120** tests including a jsdom task-pane harness (mocked Office).

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Audit failure → success toast | Closed | Fixed in PR #19 (merged). |
| Card list scroll/focus on Mute/Dismiss | Closed | Fixed in PR #19 (merged). |
| `confirm()` / `alert()` blocked in sandboxed iframe | Medium | Confirm-before-apply refuses rather than applies; owner to check tenants. |
| Word API / WebView variance | High | Manual validation still required (PE-47). |
| Seven-tab power-tool first impression | Medium | Mitigated by Simple mode + tab order. |
| Truncation on long docs | Medium | Card + status hint; section loop recommended. |
| No real Word host in CI | Medium | Mocked-host harness covers wiring/state machines only; `Word.run` behavior is manual. |
| vNext expectation drift | Medium | Keep phased plan as north star only. |
| Diagnostics ingest | Low | Empty URL until owner deploys worker. |
| Stale test counts in milestone docs | Low | Living docs synced to **120** (PE-72); dated review docs keep their historical counts. |

---

## Cross-links

- **Three-pass audit (PE-71):** [THREE-PASS-AUDIT-PE-71.md](./THREE-PASS-AUDIT-PE-71.md)
- **Full review (PE-68):** [FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md) · prior [PE-62](./FULL-APP-REVIEW-PE-62.md)
- **PE-69 hardening (merged):** [PR #19](https://github.com/drcracius/prozaedit-word/pull/19) · **PE-72:** [RELEASE-NOTES-PE-72-HARDENING.md](./RELEASE-NOTES-PE-72-HARDENING.md)
- **Forum research:** [prozaedit-addin-usability-forum-research.md](./prozaedit-addin-usability-forum-research.md)
- **UX bundle release:** [RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md)

---

### Footnote: legacy blended index

**Overall weighted score: 6.7 / 10** *(retired headline)* — do not compare to shipped **8.90**; vNext alignment tracked separately at **~4.2/10**.
