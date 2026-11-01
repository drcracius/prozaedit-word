# ProzaEdit Word — final mile plan (web-first beta)

**Audience:** D Cracius (owner) and Project coordinators  
**Baseline:** `main` after **PE-49** · build **2.0.0.15** · **29** unit tests · merged PRs [#2](https://github.com/drcracius/prozaedit-word/pull/2)–[#5](https://github.com/drcracius/prozaedit-word/pull/5) (PE-48 prep in [#5](https://github.com/drcracius/prozaedit-word/pull/5))  
**Primary ship path:** **Word on the web** — upload `manifest.hosted.xml` once; UI from GitHub Pages.  
**Companion (Project store):** store copy `prozaedit-final-mile-plan.md` mirrors this file for Project Context.

---

## Execution status

| Phase | Status | Gate / artifact |
|-------|--------|-----------------|
| **Agent prep (PE-48)** | **Done** | [HOSTED-SMOKE-LAST-RUN.md](./HOSTED-SMOKE-LAST-RUN.md) · [BETA-INVITE.md](./BETA-INVITE.md) · [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) · [DIAGNOSTICS-2.0.0.16-MERGE-CHECKLIST.md](./DIAGNOSTICS-2.0.0.16-MERGE-CHECKLIST.md) |
| **Final audit (PE-49)** | **Done** | [FINAL-AUDIT-PE-49.md](./FINAL-AUDIT-PE-49.md) · [source-of-truth.md](./source-of-truth.md) |
| **1 — Word web validation** | **START** (owner) | [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) · [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) · log in [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md) or [GitHub issue form](../.github/ISSUE_TEMPLATE/word-web-validation.yml) |
| **2 — UX-4 beta feedback** | Pending | After Phase 1 **GO beta** · [templates/BETA-FEEDBACK.md](./templates/BETA-FEEDBACK.md) (scoring rubric) · optional [beta-feedback issue](../.github/ISSUE_TEMPLATE/beta-feedback.yml) |
| **3 — Diagnostics ingest** | Optional | [DIAGNOSTICS-DEPLOY-RUNBOOK.md](./DIAGNOSTICS-DEPLOY-RUNBOOK.md) · [DIAGNOSTICS-2.0.0.16-MERGE-CHECKLIST.md](./DIAGNOSTICS-2.0.0.16-MERGE-CHECKLIST.md) when Worker URL exists |
| **4 — Release comms** | **Draft ready** | [BETA-INVITE.md](./BETA-INVITE.md) · [BETA-TESTERS-INSTALL.txt](./BETA-TESTERS-INSTALL.txt) — send after Phase 1 **GO beta** |

*Update this table when phases complete (owner or agent doc pass).*

---

## 1. Goals and definition of done

| Goal | Definition of done |
|------|-------------------|
| **Web 1.0 RC validated** | Owner completes [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) on Word online; pass/fail log recorded; no P0 regressions |
| **Beta-ready comms** | Testers have [BETA-TESTERS-INSTALL.txt](./BETA-TESTERS-INSTALL.txt); owner can explain web upload in one paragraph |
| **UX-4 measured** | Five beta prompts answered (or owner solo walkthrough documented); PE-47 fix list only if data warrants |
| **Optional ingest** | Either deployed with **2.0.0.16** + AppDomain, **or** explicitly deferred with clipboard/GitHub issue path documented |
| **Docs aligned** | No doc still treats **PE-2 desktop Shared Folder** as a blocker for web 1.0 |

**Not required for web 1.0 done:** Windows Shared Folder (PE-2), desktop `.bat` sideload proof, vNext IA.

---

## 2. Phase 1 — Word web validation

**Checklist:** [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md)  
**Pane URL:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html  
**Manifest (raw):** https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml  

### Time estimate

| Block | Sections | Est. time |
|-------|----------|-----------|
| Install + Target | §1–2 | 15 min |
| Settings + tabs | §3–4 | 20 min |
| Checks + audit (PE-43/45) | §5 | 35 min |
| Help + narrow pane + controls | §6–8 | 20 min |
| **Total** | | **~90 min** (first pass; less on re-run) |

### PE-43 / PE-45 test matrix (must exercise)

| Theme | What to verify | Fail if |
|-------|----------------|---------|
| **Long-op warnings** | Settings → Onboarding → **Warn before long operations** on; full manuscript / large scope shows banner; Continue / Not now / Don't show again | Banner missing on large scope or blocks without recovery |
| **Cancel audit** | Run audit → **Cancel** during Reading/Analyzing → status **Cancelled.**; buttons re-enabled | Stuck disabled UI or partial audit state |
| **Cancel scans / batch** | Citation verify, timeline scan, batch sections — Cancel stops cleanly | Hang or silent failure |
| **Shaper persistence (PE-45)** | Rewrite → Advanced lexical shaper → change sliders → save doc → reopen pane → values restored; **Reset** in panel → 3/4/2 | Sliders reset every session |
| **Simple → Critical (PE-45)** | Simple mode on → Audit **Critical** chip + banner copy; hint line matches Settings | Wrong default filter or missing banner |
| **Scope chips (PE-43/45)** | Checks read-only scope chip; Audit scope chip matches after refresh | Mismatch vs Target scope |
| **Eligibility (PE-45)** | Checks top **eligibility** details (fiction vs academic / citation gating) visible without duplicate blocks | Confusing or missing gating copy |

### Pass/fail log

Use **[templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md)** (§1–8 checklist, §9 PE-43/45 matrix, sign-off). Optional: open a **Word web validation log** issue from GitHub **New issue**.

### Automated gate (before manual pass)

```bash
npm test   # expect 29 pass
bash scripts/verify-version-sync.sh   # 2.0.0.15 aligned
```

---

## 3. Phase 2 — Beta feedback (UX-4)

**Source:** [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md)

### Five prompts (collect from 1–3 testers or owner diary)

1. After enabling **Simple mode**, did Audit defaulting to **Critical** help or confuse you?
2. How long from opening the pane to your first **Apply fix** or **Undo**?
3. Any mis-taps on audit cards (primary vs Mute/Dismiss)?
4. Was the **Checks eligibility** callout clear for your manuscript type (fiction vs academic)?
5. Would you recommend ProzaEdit for daily drafting? What one thing would you change first?

### Collection

| Method | When |
|--------|------|
| **[templates/BETA-FEEDBACK.md](./templates/BETA-FEEDBACK.md)** | Primary worksheet (five prompts + PE-47 decision column) |
| Email / chat free text | After tester runs checklist §1–5 |
| GitHub issue (label `beta-feedback`) | Optional structured thread |
| Owner solo: answer five prompts in writing | Acceptable if no external testers yet |

### Decision rules → PE-47

| Signal | Action |
|--------|--------|
| ≥2 testers report same friction on one control | PE-47: single focused fix + checklist re-run for that section |
| Simple/Critical confusion | Copy or banner tweak only; no IA change |
| Shaper persistence bug | Code fix (CONFIG); add test |
| No pattern after 3 responses | **No PE-47**; ship beta as-is; revisit after more sessions |

---

## 4. Phase 3 — Optional diagnostics ingest

**Default today:** `DIAGNOSTICS_INGEST_URL` empty — **Report a problem** copies redacted JSON; **Report on GitHub** issue template.

**When to do this:** After Phase 1 pass; only if owner wants automatic crash reports.

**Runbook (2.0.0.16):** [DIAGNOSTICS-DEPLOY-RUNBOOK.md](./DIAGNOSTICS-DEPLOY-RUNBOOK.md) — step checklist once Worker URL exists (no placeholder URL in repo).

| Step | Owner | Agent |
|------|-------|-------|
| Cloudflare + GitHub secrets | Add `CLOUDFLARE_*`, `DIAGNOSTICS_GITHUB_TOKEN` | Document in [DIAGNOSTICS.md](./DIAGNOSTICS.md) |
| Run **Deploy diagnostics ingest** workflow | Trigger once | — |
| Follow deploy runbook | Edit config + manifest bump | Can prepare PR |
| Test opt-in send | Manual | — |

### Rollback

- Revert `DIAGNOSTICS_INGEST_URL` to empty; remove AppDomain if needed; bump **2.0.0.17** only if manifest was already published to testers (otherwise stay on **2.0.0.15**).

---

## 5. Phase 4 — Release comms

| Artifact | Action |
|----------|--------|
| [BETA-TESTERS-INSTALL.txt](./BETA-TESTERS-INSTALL.txt) | Send with raw manifest link; stress **office.com** upload |
| [BETA-SETUP-GITHUB.md](./BETA-SETUP-GITHUB.md) | Owner reference for Pages + manifest |
| GitHub Pages | UI updates on push to `main` (~1–3 min cache); **no** tester re-upload unless manifest version changes |
| Release notes | Point to [RELEASE-NOTES-2.0.0.15.md](./RELEASE-NOTES-2.0.0.15.md) + [RELEASE-NOTES-PE-45.md](./RELEASE-NOTES-PE-45.md) |

**What to tell testers:** One-time upload of `manifest.hosted.xml` in Word on the web; daily use is **Home → ProzaEdit**; no `.bat` files required.

---

## 6. Explicitly out of scope

| Item | Status |
|------|--------|
| **PE-2** Windows Shared Folder catalog | **Deferred** — optional appendix: [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) |
| Desktop sideload scripts as **required** steps | Optional; [scripts/install/README.md](../scripts/install/README.md) |
| vNext (tab merge, Zipf shaper v2, dark mode, DAG UI) | Roadmap only — [prozaedit-approved-scope-vs-vnext.md](./prozaedit-approved-scope-vs-vnext.md) |
| Manifest bump for UX-only changes | Stay on **2.0.0.15** until ingest or ribbon change |

---

## 7. Suggested timeline (days, not calendar dates)

| Day | Focus |
|-----|--------|
| **D0** | `npm test` + version sync; skim this plan |
| **D1** | Phase 1 checklist (full pass); log template |
| **D2** | Fix any P0 from D1; partial re-run |
| **D3–D5** | Phase 2 prompts; decide PE-47 |
| **D6+ (optional)** | Phase 3 ingest deploy |
| **Anytime after D1 pass** | Phase 4 — invite testers |

---

## 8. RACI — owner vs agent

| Task | Owner (D) | Cloud agent |
|------|-----------|-------------|
| Word web manual checklist | **R/A** | Prepare/update checklist docs |
| Upload manifest in browser | **R** | — |
| Beta feedback collection | **R** | Summarize into PE-47 scope if asked |
| `npm test` / CI / doc PRs | Review merge | **R** |
| Diagnostics secrets + workflow run | **R** | Docs + optional config PR |
| PE-2 desktop validation | Optional **R** | Mark deferred in docs |
| vNext features | Decide priority | Implement only when tasked |

*R = responsible, A = accountable*

---

## Quick links

| Doc | Purpose |
|-----|---------|
| [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) | Manual validation |
| [WHEN-YOU-RETURN.md](./WHEN-YOU-RETURN.md) | Version bump discipline |
| [prozaedit-five-pass-audit-beta-ready.md](./prozaedit-five-pass-audit-beta-ready.md) | Internal consistency reference |
| [pe-ui-enhancement-backlog.md](./pe-ui-enhancement-backlog.md) | Shipped vs deferred UX |
