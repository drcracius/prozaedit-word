# PE-49 — Final audit (web 1.0 RC)

**Date:** 2026-11-01  
**Scope:** GitHub `main` after **PE-48** ([PR #5](https://github.com/drcracius/prozaedit-word/pull/5)); hosted build **2.0.0.15**; no Office.js manual pass; no diagnostics deploy.

**Narrative (single source):** **Web 1.0 RC** on `main`; agent prep **PE-48** done; owner **Phase 1** (**PE-47**) open; **Desktop PE-2** optional/deferred; **29** unit tests; merged PRs [#2](https://github.com/drcracius/prozaedit-word/pull/2)–[#5](https://github.com/drcracius/prozaedit-word/pull/5).

---

## Automated gates

| Check | Result |
|-------|--------|
| `npm test` | **29** pass / 0 fail |
| `scripts/verify-version-sync.sh` | **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`) |
| Relative links in `docs/*.md` (script scan) | No missing targets |

---

## Findings

| ID | Sev | Area | Finding | Action |
|----|-----|------|---------|--------|
| F-1 | — | — | **No P0** — task pane script chain, handlers, manifest/UI version aligned on **2.0.0.15** | — |
| F-2 | P1 | README | Missing pointers to **PHASE-1-QUICKSTART**, **HOSTED-SMOKE-LAST-RUN**, **FINAL-AUDIT-PE-49** | Fixed in PE-49 |
| F-3 | P1 | Final mile / store mirror | Baseline cited PRs **#2–#3** only; **#4–#5** merged | Fixed in PE-49 |
| F-4 | P1 | `docs/source-of-truth.md` | Referenced from plans but absent in repo | Added with PE-49 audit pointer |
| F-5 | P1 | `prozaedit-multi-phase-plan.md` | Still advertised **2.0.0.14** as production baseline | Historical banner + baseline corrected |
| F-6 | P2 | vNext spec body | Many **2.0.0.14** labels in vNext sketch (intentional delta vs shipped UI) | Production baseline table updated; full spec body unchanged |
| F-7 | P2 | `prozaedit-deep-audit-report.md` | Pre-PE-48 audit; WORKFLOWS/THIRD-PARTY **2.0.0.14** note stale | Superseded by this audit; headers already **2.0.0.15** |
| F-8 | P2 | Owner-only | Phase 1 Word web validation log (**PE-47**) | [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) |
| F-9 | P2 | Owner-only | Optional diagnostics ingest **2.0.0.17** | [DIAGNOSTICS-DEPLOY-RUNBOOK.md](./DIAGNOSTICS-DEPLOY-RUNBOOK.md) — not in PE-49 scope |

---

## Task pane entry points (verified)

| Entry | Path |
|-------|------|
| Hosted HTML | `src/taskpane/taskpane.html` → Office.js → `lib/*` → `taskpane.js` |
| Manifest | `manifest.hosted.xml` → GitHub Pages `SourceLocation` |
| Dev sideload | `manifest.xml` (separate track; not production baseline) |

Script load order in `taskpane.html` includes `ui-prefs-helpers.js`, `onboarding-helpers.js`, `long-operation-helpers.js`, engines, `diagnostics-*`, and `taskpane.js` last.

---

## CONFIG / onboarding keys (code vs docs)

Documented in [prozaedit-features.md](./prozaedit-features.md) (`PROZAEDIT_CONFIG`, shaper sliders, settings groups). Code defaults in `ui-prefs-helpers.js` (`UI_CONFIG_DEFAULTS`) include **`showSessionTips`**, **`showLongOperationWarnings`**, shaper fields — aligned with Settings → Onboarding and PE-43/45 checklist language. Onboarding banner keys: `showSessionTips`, `showWhatsNew`, `showPriorSessionSummary` (`onboarding-helpers.js`).

---

## Fixed in-repo (PE-49)

- **P1 count:** 4 (F-2 through F-5)
- **P0 count:** 0
- README link table; **FINAL-MILE-PLAN-WEB** baseline; new **`docs/source-of-truth.md`**; **multi-phase plan** historical banner; markdown/instruction narrative sync across `docs/`, README, install README, templates, issue forms, key `.txt` files.

---

## Owner-only (Phase 1 Word)

1. Complete [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) → [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) → [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md) or GitHub **Word web validation** issue.
2. **GO beta** → send [BETA-INVITE.md](./BETA-INVITE.md) / [BETA-TESTERS-INSTALL.txt](./BETA-TESTERS-INSTALL.txt).
3. Optional: **PE-2** desktop Shared Folder — [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) (deferred; not a web 1.0 gate).

---

## Related

| Doc | Role |
|-----|------|
| [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) | Owner execution tracker |
| [HOSTED-SMOKE-LAST-RUN.md](./HOSTED-SMOKE-LAST-RUN.md) | Last agent HTTP smoke (PE-48) |
| [source-of-truth.md](./source-of-truth.md) | Version + repo pointers |
