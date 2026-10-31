# ProzaEdit Word — As-shipped audit & rating (current)

**Date:** 2026-10-31  
**Build on `main`:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`)  
**Scope:** Post UX-1–UX-4 polish, plus anonymous diagnostics (client shipped; ingest URL empty by default).

---

## Executive scores (1–10)

| Dimension | Score | Notes |
|-----------|------:|-------|
| **UX** | **8.3** | Aligns with [UX rating ~8.5](./prozaedit-ux-rating-and-recommendations.md) after UX-1–UX-3; small deduction for seven-tab density and fiction/citation discoverability unchanged by design. Diagnostics Help block adds clarity without IA churn. |
| **Reliability / stability** | **6.8** | Core local audit/coach/rewrite paths are exercised on web Word; full-manuscript and section loops hit truncation and Word API timing/search limits. No automated CI smoke; crash telemetry depends on owner deploy + user opt-in. |
| **Feature completeness vs vNext spec** | **42%** (~**4.2** / 10 if scored) | Phases 1–7 delivered tooltips, shaper v1, timeline/citation **scans**, report export extract, quota lite. vNext still lacks Editorial Studio IA, full citation engine, DAG chronology UI, Zipf shaper, enforced quota UX, CI, catalog install. See [spec review](./prozaedit-nextgen-spec-review.md) (updated on main for 2.0.0.15 modules). |
| **Maintainability** | **6.5** | **27** `lib/*.js` modules with clear boundaries; **`taskpane.js` remains a large orchestrator** (~2.8k lines). Version/manifest discipline in Project store `source-of-truth.md`. |
| **Security / privacy** | **7.8** | Local-first default; API keys document-scoped with explicit remember warning; new diagnostics **opt-in off**, redaction pipeline, no client token. Gemini still user-supplied key — trust model is author-owned. |

### Overall weighted score: **6.7 / 10**

Weights used: UX 15%, reliability 25%, vNext feature score 20%, maintainability 20%, security/privacy 20%.  
This is **product readiness against the vNext north star**, not a score of the local-first editing loop alone. For day-to-day editing UX alone, treat UX **~8.5** as the headline (see linked UX doc).

---

## Strengths

- **Local-first workflow** — audit, coach, paraphrase at 0 tokens; sticky Run audit / Undo / Last edit.
- **UX pack (2.0.0.15)** — icons, Simple → Critical filter, workflow strip, session tips, tooltip registry ([UX rating](./prozaedit-ux-rating-and-recommendations.md)).
- **Modular engines on v2 IA** — navigator extract, chronology/citation scans, shaper panel, report export, optional quota (off by default).
- **Safety** — confirm-before-apply, continuity guard, search sanitization, scope caps.
- **Diagnostics (new)** — privacy-preserving reporter + optional worker template; default does not phone home.

---

## Gaps & risks

| Risk | Severity | Detail |
|------|----------|--------|
| Word API / WebView variance | High | `Word.run` failures on selection drift, search miss, long sync; desktop Upload/install friction. |
| Fiction gating confusion | Medium | Academic users may enable fiction modules before reading inline copy; timeline scan only for Fiction type. |
| Truncation / performance | Medium | Full manuscript audits cap chars; `sys_trunc` card easy to miss. |
| Install / PE-2 Shared Folder | Medium | Catalog sideload unproven on owner PC; web Upload path documented but brittle on desktop. |
| No CI | Medium | Regressions caught only by manual smoke (Project deep audit report / features checklist). |
| vNext expectation drift | Medium | Master spec IA ≠ shipped tabs; phased plan mitigates if kept as north star only. |
| Diagnostics ingest | Low (until deploy) | Empty `DIAGNOSTICS_INGEST_URL` — automatic send path inactive until owner deploys worker + manifest AppDomain bump. |

---

## Follow-ups

| Priority | Item |
|----------|------|
| **P0** | **PE-2** — Confirm Shared Folder install on Windows after cache clear ([checklist](./pe-2-shared-folder-checklist.md)). |
| **P0** | **Beta UX-4 feedback** — Run prompts in [UX rating](./prozaedit-ux-rating-and-recommendations.md); adjust only where data shows friction. |
| **P1** | **Deploy diagnostics ingest** — Worker in `tools/diagnostics-ingest/`, set `DIAGNOSTICS_INGEST_URL`, manifest AppDomain + version bump ([DIAGNOSTICS.md](./DIAGNOSTICS.md)). |
| **P1** | **Minimal CI smoke** — Static manifest/version sync check + optional Office add-in validation (roadmap Phase 7). |
| **P1** | **Sync stale docs** — Spec review appendix inventory vs 27 modules; features §8 lib table. |
| **P2** | Shaper slider persistence across sessions (if beta asks). |
| **P2** | Zipf shaper v2, full quota modal, narrative tab / DAG timeline (vNext phases). |

---

## Cross-links (do not duplicate)

- **UX depth & path to 9.0:** [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md) (~**8.5** shipped UX milestone).
- **Implementation tracker:** [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md).
- **Wiring / regression surface:** Project store deep audit report (`prozaedit-deep-audit-report.md`).
- **Diagnostics:** [DIAGNOSTICS.md](./DIAGNOSTICS.md).
