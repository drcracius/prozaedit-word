# Approved Project roadmap vs vNext north star

**Audience:** D Cracius and Project coordinators  
**Updated:** 2026-10-31 (PE-32 approved-scope closure)  
**Production baseline:** hosted build **2.0.0.15** ([source-of-truth](./source-of-truth.md))

---

## Two percentages (do not mix them)

| Metric | Value | Meaning |
|--------|------:|---------|
| **vNext master spec alignment** | **~42%** | Progress against the [Next-Gen Master Specification](./prozaedit-nextgen-master-specification.md) north star — different IA (Narrative/Citations tabs, Checks merged into Audit), Zipf shaper v2, dark mode, DAG chronology UI, full quota modal, §11 HTML cutover, Office.js-in-CI, etc. See [spec review](./prozaedit-nextgen-spec-review.md). |
| **Chat-approved Project roadmap** | **~97%** | Phases 1–7 (approved slice), UX-1–UX-4, diagnostics **client**, PE-30 rating + CI/doc hygiene — **excluding** explicitly deferred vNext items and **excluding** owner-only validation/deploy steps from the denominator. |

**One-line:** vNext **42%** is “how much of the long-range Editorial Studio spec is shipped”; **~97%** is “how much of the chat-approved beta roadmap is done in repo/docs.”

---

## Approved roadmap tracker

Primary execution doc: [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md).

| Track | Item | Status | Notes |
|-------|------|--------|-------|
| **Phase 1** | `word-safe-navigator.js` extract | **Done** | `91ecf56` |
| **Phase 2** | Tooltips + CSS tokens | **Done** | `adba593` |
| **Phase 3** | Lexical banks + shaper v1 | **Done** | `83e88f0` |
| **Phase 4** | Chronology scan v1 | **Done** | `76adf92` |
| **Phase 5** | Citation scan v1 | **Done** | `8f12b94` |
| **Phase 6** | Install scripts + docs hygiene | **Done** | `3065334` |
| **Phase 6** | PE-2 Shared Folder proof on Windows | **Owner-only** | [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) — D on PC |
| **Phase 7a** | AI quota lite (default off) | **Done** | `ai-quota-manager.js` |
| **Phase 7b** | Version-sync CI + pure JS unit tests | **Done** | PE-30 + PE-32: `.github/workflows/version-sync.yml`, `npm test` |
| **Phase 7c** | Report export module | **Done** | `report-docx-export.js` |
| **Phase 7d** | Zipf shaper v2 | **Explicitly deferred** | UX-9 / audited plan |
| **Phase 7e** | IA merge (Checks → Audit) | **Explicitly deferred** | D1 open |
| **Phase 7f** | Dark mode | **Explicitly deferred** | Token pass only today |
| **Phase 7g** | Header scope/token pills | **Explicitly deferred** | — |
| **UX-1** | Icons, workflow strip, Rewrite card | **Done** | UX-9 plan |
| **UX-2** | Doc/link hygiene, active-checks hint | **Done** | UX-9 plan |
| **UX-3** | Tip dedupe, secondary icons | **Done** | UX-9 plan |
| **UX-4** | Measure + score update | **Done** | UX-9 plan |
| **PE-28** | Diagnostics client (opt-in, redaction) | **Done** | [DIAGNOSTICS.md](./DIAGNOSTICS.md) |
| **PE-28** | Hosted diagnostics **ingest** deploy | **Owner-only** | `tools/diagnostics-ingest/` scaffold; URL empty by default |
| **PE-30** | Shipped rating + version-sync CI on `main` | **Done** | [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) |
| **PE-32** | Features §8 sync, spec review baseline, README roadmap, fiction gating `<details>` | **Done** | This task |

### Approved completion math

- **In scope & closable in repo:** 22 line items above (Phases 1–6 except PE-2, 7a–7c, UX-1–4, diagnostics client, PE-30, PE-32 doc/code slice).
- **Done:** 20 (all except the two **Owner-only** rows).
- **Explicitly deferred (excluded from denominator):** 7d–7g (4 items) — not counted as “missing approved work.”
- **Approved roadmap completion:** **20 ÷ 22 ≈ 97%** (remaining 3% = PE-2 Windows validation + diagnostics ingest deploy).

---

## What vNext 42% still implies (not approved for this pass)

Do **not** implement without a new chat-approved plan:

- Tab merge, Narrative/Citations top-level tabs, §11 HTML cutover  
- Dark mode system, Zipf shaper v2, full quota modal UX  
- Manifest bump unless AppDomain or registration requires it  

---

## Related documents

| Doc | Role |
|-----|------|
| [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md) | Primary roadmap + phase tracker |
| [prozaedit-nextgen-master-specification.md](./prozaedit-nextgen-master-specification.md) | vNext north star (~42%) |
| [prozaedit-features.md](./prozaedit-features.md) | As-built behavior (2.0.0.15) |
| [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) | Shipped score 8.5 vs vNext 42% |
