# Approved Project roadmap vs vNext north star

**Audience:** D Cracius and Project coordinators  
**Updated:** 2026-11-01 (PE-44 repo closure)  
**Production baseline:** hosted build **2.0.0.15** ([source-of-truth](./source-of-truth.md))

---

## Two percentages (do not mix them)

| Metric | Value | Meaning |
|--------|------:|---------|
| **vNext master spec alignment** | **~42%** | Progress against the [Next-Gen Master Specification](./prozaedit-nextgen-master-specification.md) north star — different IA (Narrative/Citations tabs, Checks merged into Audit), Zipf shaper v2, dark mode, DAG chronology UI, full quota modal, §11 HTML cutover, Office.js-in-CI, etc. See [spec review](./prozaedit-nextgen-spec-review.md). |
| **Chat-approved Project roadmap (repo)** | **100%** | All chat-approved work that can land in **repo/docs/CI** without owner PC or Cloudflare credentials — including PE-2 **verify script**, diagnostics **deploy workflow**, and GitHub issue template. |
| **Chat-approved Project roadmap (live product)** | **~97%** | Same roadmap until owner completes the two **Owner closes last mile** steps below (Windows PE-2 proof + live ingest URL + manifest 2.0.0.16). |

**One-line:** vNext **42%** is the long-range spec; **repo-side approved roadmap is 100%**; live beta still waits on owner validation/deploy.

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
| **Phase 6** | PE-2 verify script + checklist | **Done (repo)** | `Verify-ProzaEdit-Install.ps1` + [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) |
| **Phase 6** | PE-2 Shared Folder proof on Windows | **Owner-only** | Run verify + manual Word steps on D’s PC |
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
| **PE-28** | Diagnostics ingest automation (repo) | **Done** | `deploy.sh`, workflow, issue template; URL empty in client |
| **PE-28** | Hosted diagnostics **ingest live** | **Owner-only** | Run deploy workflow; set URL + AppDomain + **2.0.0.16** |
| **PE-30** | Shipped rating + version-sync CI on `main` | **Done** | [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) |
| **PE-32** | Features §8 sync, spec review baseline, README roadmap, fiction gating `<details>` | **Done** | PE-32 |
| **PE-33** | Diagnostics deploy automation and issue template | **Done** | This pass |
| **PE-43** | Cancel long ops, P1/P2 UI backlog, uniformity pass | **Done** | PR #2 → `main`; [pe-ui-enhancement-backlog.md](./pe-ui-enhancement-backlog.md) |

### Repo completion math

- **Closable in repo without owner secrets/PC:** all rows above except the two **Owner-only** lines.
- **Done in repo:** **100%** of that set (PE-33 + PE-2 verify script included).

---

## Owner closes last mile

| Step | Action |
|------|--------|
| **PE-2** | On Windows: `Verify-ProzaEdit-Install.bat` → clear WEF cache → SHARED FOLDER smoke test per [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md); log pass/fail in Project notes. |
| **Diagnostics ingest** | Add Cloudflare + GitHub secrets → run **Deploy diagnostics ingest** workflow → set `DIAGNOSTICS_INGEST_URL`, manifest `<AppDomains>`, bump **2.0.0.16** per [DIAGNOSTICS.md](./DIAGNOSTICS.md). |

Until both complete, **live product** approved roadmap remains **~97%** (same two gaps as before, now with automation ready).

---

## What vNext 42% still implies (not approved for this pass)

Do **not** implement without a new chat-approved plan:

- Tab merge, Narrative/Citations top-level tabs, §11 HTML cutover  
- Dark mode system, Zipf shaper v2, full quota modal UX  
- Manifest bump unless AppDomain or registration requires it (diagnostics post-deploy is the documented exception → **2.0.0.16**)

---

## Related documents

| Doc | Role |
|-----|------|
| [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md) | Primary roadmap + phase tracker |
| [prozaedit-nextgen-master-specification.md](./prozaedit-nextgen-master-specification.md) | vNext north star (~42%) |
| [prozaedit-features.md](./prozaedit-features.md) | As-built behavior (2.0.0.15) |
| [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) | Shipped score 8.5 vs vNext 42% |
