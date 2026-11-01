# Approved Project roadmap vs vNext north star

**Audience:** D Cracius and Project coordinators  
**Updated:** 2026-11-01 (PE-46 web-first final mile)  
**Production baseline:** hosted build **2.0.0.15** ([WHEN-YOU-RETURN.md](./WHEN-YOU-RETURN.md))

---

## Two percentages (do not mix them)

| Metric | Value | Meaning |
|--------|------:|---------|
| **vNext master spec alignment** | **~42%** | Progress against the [Next-Gen Master Specification](./prozaedit-nextgen-master-specification.md) north star — different IA (Narrative/Citations tabs, Checks merged into Audit), Zipf shaper v2, dark mode, DAG chronology UI, full quota modal, §11 HTML cutover, Office.js-in-CI, etc. See [spec review](./prozaedit-nextgen-spec-review.md). |
| **Chat-approved Project roadmap (repo)** | **100%** | All chat-approved work that can land in **repo/docs/CI** without owner PC or Cloudflare credentials — including PE-2 **verify script**, diagnostics **deploy workflow**, GitHub issue template, PE-43/45 UX. |
| **Chat-approved Project roadmap (live product — web RC)** | **~99%** | Repo-complete **web beta**; owner closes validation via checklist + UX-4 ([FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md)). Optional: live diagnostics ingest (**2.0.0.16**). **PE-2 desktop deferred — not counted as a gap.** |

**One-line:** vNext **42%** is the long-range spec; **repo-side approved roadmap is 100%**; live web beta waits on owner checklist + feedback, not Windows Shared Folder.

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
| **Phase 6** | PE-2 verify script + checklist | **Done (repo)** | Optional desktop appendix — [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) **deferred** |
| **Phase 7a** | AI quota lite (default off) | **Done** | `ai-quota-manager.js` |
| **Phase 7b** | Version-sync CI + pure JS unit tests | **Done** | **29** tests; `.github/workflows/version-sync.yml` |
| **Phase 7c** | Report export module | **Done** | `report-docx-export.js` |
| **Phase 7d** | Zipf shaper v2 | **Explicitly deferred** | UX-9 / audited plan |
| **Phase 7e** | IA merge (Checks → Audit) | **Explicitly deferred** | D1 open |
| **Phase 7f** | Dark mode | **Explicitly deferred** | Token pass only today |
| **Phase 7g** | Header scope/token pills | **Explicitly deferred** | — |
| **UX-1–UX-4** | UX pack + measurement docs | **Done** | UX-9 plan |
| **PE-28** | Diagnostics client (opt-in, redaction) | **Done** | [DIAGNOSTICS.md](./DIAGNOSTICS.md) |
| **PE-28** | Diagnostics ingest automation (repo) | **Done** | `deploy.sh`, workflow, issue template; URL empty in client |
| **PE-28** | Hosted diagnostics **ingest live** | **Owner optional** | Deploy workflow; URL + AppDomain + **2.0.0.16** |
| **PE-30** | Shipped rating + version-sync CI on `main` | **Done** | [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) |
| **PE-43** | Cancel long ops, P1/P2 UI backlog, uniformity pass | **Done** | PR #2 |
| **PE-45** | Final polish (shaper CONFIG, scope chips, Simple banner) | **Done** | PR #3 |

### Repo completion math

- **Closable in repo without owner secrets/PC:** all rows above except optional **ingest live**.
- **Done in repo:** **100%** of that set.

---

## Owner closes last mile (web-first)

See [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md).

| Step | Action | Required? |
|------|--------|-----------|
| **Word web checklist** | [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) + pass/fail log | **Yes** |
| **UX-4 feedback** | Five prompts in [UX rating](./prozaedit-ux-rating-and-recommendations.md) | **Yes** (or owner diary) |
| **Diagnostics ingest** | Secrets → deploy workflow → URL + AppDomain + **2.0.0.16** per [DIAGNOSTICS.md](./DIAGNOSTICS.md) | **Optional** |
| **PE-2 Shared Folder** | [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) | **No — deferred** |

Until checklist + UX-4 complete, treat **live product** as **web RC complete, owner validation pending** (~99% roadmap — not blocked on PE-2).

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
| [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) | Web beta final mile |
| [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md) | Primary roadmap + phase tracker |
| [prozaedit-nextgen-master-specification.md](./prozaedit-nextgen-master-specification.md) | vNext north star (~42%) |
| [prozaedit-features.md](./prozaedit-features.md) | As-built behavior (2.0.0.15) |
| [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) | Shipped score 8.5 vs vNext 42% |
