# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-11-01 (PE-74 trust pass on PE-72 `00b2ecd`; PE-69 via PR #19; PE-72 via PR #20)  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`)  
**Scope:** PE-50–67 UX bundle + PE-72 hardening + **PE-74** in-pane confirm, privacy/support Help, dictionary scope clarity. Automated tests (**123**: unit + jsdom task-pane harness with mocked Office host; see CI) + wiring gate + mocked-host smoke. **Validation path:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) · **Category scorecard:** [USER-CATEGORY-RATINGS-PE-74.md](./USER-CATEGORY-RATINGS-PE-74.md).

---

## Shipped product score: **~8.6 / 10** (conservative)

Author-facing beta score for hosted **2.0.0.15**, **estimated by judgment, not measured on a real Word host**.

| Phase | Headline | Notes |
|-------|----------|--------|
| PE-71 | 8.80 | Three-pass audit |
| PE-72 merged (PR #20) | ~8.85–8.90 judgment | Cancel, retry, 120 tests, wiring gate — mocked host only |
| **PE-74 (this pass)** | **~8.5–8.7 conservative** | In-pane confirm, published privacy/support, mute/dictionary clarity |
| **After PE-47** | **~8.9 judgment ceiling** | Do not claim 8.9+ until real Word web checklist is green |

**Table floor (weighted dimensions below):** **~8.55**. Use the table as the arithmetic floor; the **~8.6** headline is a conservative beta estimate until PE-47.

**Separate metric:** **vNext roadmap alignment: ~4.2 / 10 (42%)** — unchanged.

---

## Shipped-product weighted index

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| **UX** | 28% | **9.00** | PE-67 tab flow; PE-74 Help privacy/support collapsibles. |
| **Shipped feature set completeness** | 28% | **8.5** | Local-first audit/coach/rewrite — vs [features doc](./prozaedit-features.md). |
| **Reliability / stability** | 18% | **8.60** | PE-72 cancel/retry/guards; PE-74 confirm no longer blocked by sandbox. Capped: no real-host validation. |
| **Security / privacy** | 13% | **8.2** | [PRIVACY-AND-DATA-PE.md](./PRIVACY-AND-DATA-PE.md); opt-in diagnostics; Remember key off by default. |
| **Maintainability** | 13% | **8.2** | `pe-confirm-dialog.js` + **120+** tests; wiring gate in CI. |

**Weighted shipped index (table arithmetic):** **~8.55**.

---

## Path to **8.9–9.0** (shipped product)

| Lever | Priority |
|-------|----------|
| **PE-47 Word web checklist** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) | **P0 (owner)** |
| **Beta UX-4** — [USER-CATEGORY-RATINGS-PE-74.md](./USER-CATEGORY-RATINGS-PE-74.md) | P0 |
| **Merge PR #19 (PE-69)** | **Done** |
| **Merge PR #20 (PE-72)** | **Done** |
| **PE-74 trust/docs/confirm** | **Done (agent)** |
| Deploy diagnostics ingest (optional) | P1 |
| Real-host Office.js smoke in CI | P2 — infeasible in CI |

---

## Strengths

- **Local-first workflow** — explicit Run audit.
- **Simple-default UX** — Start/Run/Fix/Help; tour; Essentials.
- **Safety** — in-pane confirm-before-apply (PE-74), continuity guard, uncertain-apply never retried.
- **CI:** version sync, wiring gate, **123** unit/harness tests (mocked Office).

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Audit failure → success toast | Closed | PR #19. |
| Card list scroll/focus | Closed | PR #19. |
| `confirm()` blocked in sandboxed iframe | **Closed (PE-74)** | In-pane modal; safe default still **Cancel**. |
| Word API / WebView variance | High | PE-47 manual validation. |
| Mute/dismiss cross-device sync | Medium | Document + browser storage only — documented in Help. |
| No real Word host in CI | Medium | Mocked harness only. |
| Support matrix | Medium | [SUPPORT-AND-COMPATIBILITY-PE.md](./SUPPORT-AND-COMPATIBILITY-PE.md) — owner can edit. |

---

## Cross-links

- **PE-74 scorecard:** [USER-CATEGORY-RATINGS-PE-74.md](./USER-CATEGORY-RATINGS-PE-74.md)
- **Privacy:** [PRIVACY-AND-DATA-PE.md](./PRIVACY-AND-DATA-PE.md)
- **Support:** [SUPPORT-AND-COMPATIBILITY-PE.md](./SUPPORT-AND-COMPATIBILITY-PE.md)
- **PE-72:** [RELEASE-NOTES-PE-72-HARDENING.md](./RELEASE-NOTES-PE-72-HARDENING.md)
- **PE-69 (PR #19)** · **PE-72 (PR #20)**

---

### Footnote: legacy blended index

**Overall weighted score: 6.7 / 10** *(retired headline)* — do not compare to shipped **~8.6**; vNext alignment **~4.2/10**.
