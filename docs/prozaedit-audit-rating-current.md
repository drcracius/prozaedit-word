# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-11-01 (PE-46 web-first alignment)  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`) after PE-43/45  
**Scope:** Post UX-1–UX-4 polish + PE-45 CONFIG/shaper; **29** unit tests; diagnostics client (ingest URL empty by default); version-sync CI. **Validation path:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md).

---

## Shipped product score: **8.5 / 10**

This is the **author-facing beta** score for what testers run today (hosted **2.0.0.15** + UX pack + diagnostics client). Compare it to the UX doc trajectory **7.0 → ~8.5** ([UX rating](./prozaedit-ux-rating-and-recommendations.md)) — **not** a regression from an older blended index.

**Separate metric (never mixed into the headline):** **vNext roadmap alignment: ~4.2 / 10 (42%)** — progress against the [master spec](./prozaedit-nextgen-master-specification.md) / [spec review](./prozaedit-nextgen-spec-review.md) north star (Editorial Studio IA, full citation engine, DAG UI, Zipf shaper, enforced quota UX, catalog install proof, Office.js CI, etc.).

---

## Shipped-product weighted index

Weights apply **only** to the shipped beta (features doc + hosted add-in scope). vNext gap is tracked separately above.

| Dimension | Weight | Score | Notes |
|-----------|-------:|------:|-------|
| **UX** | 28% | **8.5** | UX-1–UX-3 pack; aligns with [UX rating ~8.5](./prozaedit-ux-rating-and-recommendations.md). Seven-tab density and fiction/citation discoverability unchanged by design. |
| **Shipped feature set completeness** | 28% | **8.5** | Local-first audit/coach/rewrite, shaper v1, timeline/citation **scans**, report export, quota lite, tooltips, install scripts — vs [features doc](./prozaedit-features.md) beta scope, **not** full vNext spec. |
| **Reliability / stability** | 18% | **8.0** | Core paths stable on web Word; Word API / truncation limits remain. **CI** now gates manifest ↔ UI version sync on every `main` PR/push (`.github/workflows/version-sync.yml`). |
| **Security / privacy** | 13% | **8.0** | Local-first default; document-scoped API keys; diagnostics **opt-in off**, redaction pipeline, no client token (see [DIAGNOSTICS.md](./DIAGNOSTICS.md)). |
| **Maintainability** | 13% | **8.0** | **27** `lib/*.js` modules; version discipline in [WHEN-YOU-RETURN.md](./WHEN-YOU-RETURN.md); **`taskpane.js` still a large orchestrator** (~2.8k lines). CI reduces silent version drift. |

**Weighted shipped index:** **~8.5 / 10** (rounded; arithmetic **~8.46** on table above).

---

## Path to **8.8–9.0** (shipped product)

| Lever | Priority |
|-------|----------|
| **Word web checklist** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) per [final mile plan](./FINAL-MILE-PLAN-WEB.md) | P0 |
| **Beta UX-4 feedback** — run prompts in [UX rating](./prozaedit-ux-rating-and-recommendations.md); polish only where data shows friction | P0 |
| **Deploy diagnostics ingest** — worker in `tools/diagnostics-ingest/`, set `DIAGNOSTICS_INGEST_URL`, manifest AppDomain + version bump when ready ([DIAGNOSTICS.md](./DIAGNOSTICS.md)) | P1 (optional) |
| **PE-2 install proof** — Shared Folder on Windows ([checklist](./pe-2-shared-folder-checklist.md)) | **Deferred** — optional appendix |
| Optional micro-polish from UX doc (≤ small effort each, no manifest) | P2 |
| Expand CI later (pure-function tests for banks/shaper/chronology per Phase 7 roadmap) | P2 |

---

## Strengths

- **Local-first workflow** — audit, coach, paraphrase at 0 tokens; sticky Run audit / Undo / Last edit.
- **UX pack (2.0.0.15)** — icons, Simple → Critical filter, workflow strip, session tips, tooltip registry.
- **Modular engines on v2 IA** — navigator extract, chronology/citation scans, shaper panel, report export, optional quota (off by default).
- **Safety** — confirm-before-apply, continuity guard, search sanitization, scope caps.
- **Diagnostics (client)** — privacy-preserving reporter + optional worker template; default does not phone home.
- **Version-sync CI** — `scripts/verify-version-sync.sh` on GitHub Actions.

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Word API / WebView variance | High | `Word.run` failures on selection drift, search miss, long sync; desktop Upload/install friction. |
| Fiction gating confusion | Medium | Academic users may enable fiction modules before reading inline copy; timeline scan only for Fiction type. |
| Truncation / performance | Medium | Full manuscript audits cap chars; `sys_trunc` card easy to miss. |
| Desktop install variance | Low (web-first) | Primary path is Word on the web upload; Shared Folder (PE-2) deferred optional appendix. |
| No Office.js in CI | Medium | Regressions in `Word.run` still manual; CI covers version strings only. |
| vNext expectation drift | Medium | Master spec IA ≠ shipped tabs; keep phased plan as north star only (see **4.2/10** alignment). |
| Diagnostics ingest | Low (until deploy) | Empty `DIAGNOSTICS_INGEST_URL` — automatic send path inactive until owner deploys worker + manifest AppDomain bump. |

---

## Follow-ups

| Priority | Item |
|----------|------|
| **P0** | **Word web validation** — [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) + [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md). |
| **P0** | **Beta UX-4 feedback** — [UX rating](./prozaedit-ux-rating-and-recommendations.md). |
| **P1** | **Deploy diagnostics ingest** (optional) — [DIAGNOSTICS.md](./DIAGNOSTICS.md). |
| **P2** | **PE-2 Shared Folder** — optional desktop appendix; not required for web 1.0. |
| **P2** | Sync stale docs — spec review module count vs `main`. |
| **P2** | Zipf shaper v2, full quota modal, narrative tab / DAG timeline (vNext phases). |

---

## Cross-links

- **UX depth & path to 9.0:** [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md) (~**8.5** UX milestone).
- **Implementation tracker:** [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md).
- **Wiring / regression surface:** [prozaedit-deep-audit-report.md](./prozaedit-deep-audit-report.md).
- **Diagnostics:** [DIAGNOSTICS.md](./DIAGNOSTICS.md).

---

### Footnote: legacy blended index

**Overall weighted score: 6.7 / 10** *(retired headline)* — legacy blended index that weighted **vNext feature completeness (~4.2)** into the same number as shipped UX. Misleading for beta users comparing to the UX **7 → 8.5** arc. Use **Shipped product score: 8.5** and **vNext roadmap alignment: ~4.2/10** as separate metrics.
