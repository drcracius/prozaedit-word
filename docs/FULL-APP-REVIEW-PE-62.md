# PE-62 — Full application review (post–PE-61 onboarding)

**Date:** 2026-11-01  
**Baseline:** GitHub `main` through **PE-61** merge ([PR #16](https://github.com/drcracius/prozaedit-word/pull/16), merge `689ad54`)  
**Prior reviews:** [FULL-APP-REVIEW-PE-59.md](./FULL-APP-REVIEW-PE-59.md) · [FULL-APP-REVIEW-PE-58.md](./FULL-APP-REVIEW-PE-58.md)  
**Forum / usability research:** [prozaedit-addin-usability-forum-research.md](./prozaedit-addin-usability-forum-research.md) (PE-60) · shipped mitigations [RELEASE-NOTES-PE-61-ONBOARDING.md](./RELEASE-NOTES-PE-61-ONBOARDING.md)  
**Hosted build:** **2.0.0.15** (no manifest bump this pass)  
**Automated gates:** `npm test` **40** pass · `scripts/verify-version-sync.sh` aligned  

---

## Executive summary

| Metric | PE-62 | PE-59 (reference) |
|--------|------:|------------------:|
| **Shipped product score** | **~8.7 / 10** | ~8.6 |
| **vNext alignment** | **~4.2 / 10** | ~4.2 |
| **P0 defects found (this pass)** | **0** | 0 |
| **P1 fixed (this pass)** | **0** (none new) | 0 |
| **P2 polish (PE-62)** | **2** (filter-lanes hint, truncation status copy) | 3 (PE-59) |
| **Unit tests** | **40** (+4 vs PE-59, from PE-61 onboarding suite) | 36 |

### Delta vs PE-59 (what changed with PE-61 + PE-62)

| Category | Change |
|----------|--------|
| **Merged (PE-61)** | First-run **Simple mode** + **Critical** filter bootstrap; `firstRunComplete` CONFIG; Simple banner; first-audit checklist (Checks + Help); manual-audit Help copy; full-MS scope tip + long-op wording; workflow **Next step** hint; Mute → Dictionary status nudge; Checks partner-tools `<details>` |
| **PE-62 polish** | Audit tab **filter lanes** one-liner; clearer truncation **status bar** message when `sys_trunc` present |
| **Re-validated** | **187** HTML `id`s, **0** orphan `getEl`, inline handlers intact; PE-58 CONFIG autosave + PE-59 batch/rewrite/truncation wiring **not regressed** |
| **Unchanged risks** | Word API variance, `taskpane.js` orchestrator (~4.3k lines), fiction gating, no Office.js CI, citation footnotes v1.1 |

### Usability focus — do PE-61 mitigations close forum gaps?

| PE-60 / forum gap | PE-61 + PE-62 response | Closes gap? |
|-------------------|------------------------|-------------|
| “Too many reports — don’t know where to start” | Simple defaults, checklist, workflow hint, **filter lanes** copy on Audit | **Mostly** — still seven tabs; power path visible |
| Realtime / lag expectation | Help + manual-audit copy; no underline engine | **Yes** for expectation; perf on full MS still user-scoped |
| Ignore / dictionary trust | Mute → Dictionary nudge | **Partial** — needs UX-4 on re-flag behavior |
| Full MS performance | Target tip + long-op confirm + truncation status (PE-59 + PE-62 copy) | **Partial** — caps unchanged by design |
| UI density | Simple mode, Checks “More…”, dark tips (prior) | **Partial** — Settings depth unchanged |

**Verdict:** PE-61 addresses the **P1 forum recommendations** from PE-60 without tab merge or manifest bump. Remaining gap is **validated first session in real Word** (owner checklist), not missing copy.

### Top 5 risks (re-confirmed)

1. **Word API / WebView variance** — no Office.js in CI; [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) remains P0 owner work.
2. **Orchestrator size** — `taskpane.js` ~4,303 lines; onboarding logic adds surface area; mitigated by `onboarding-helpers.js` + **40** unit tests.
3. **Truncation / long docs** — `ScopeReader.LIMITS` + `sys_trunc` card + status hint (PE-62 clearer wording).
4. **Fiction vs academic gating** — timeline/citation/plot toggles still need profile literacy.
5. **vNext / competitor expectation drift** — users may still expect Grammarly realtime or PWA report count; Help + PE-61 copy reduce but do not eliminate.

### Top 5 strengths (re-confirmed + PE-61)

1. **Local-first core** — explicit Run audit; aligns with forum “chapter + one lane” workflow.
2. **Onboarding stack** — first-run Simple, checklist, workflow hint, manual-audit positioning (PE-61).
3. **Safety** — confirm-before-apply, continuity guard, scope caps, dictionary/mute.
4. **Modular engines** — 32 `lib/*.js` modules; chronology/citation, export, diagnostics.
5. **CI + wiring tests** — version sync; CONFIG round-trip; first-run helpers tested.

---

## PE-61 first-run logic (regression check)

| Step | Expected | PE-62 static + test check |
|------|----------|---------------------------|
| Empty CONFIG | Bootstrap Simple + Critical + `firstRunComplete: false` | `resolveFirstRunOnLoad` tests **OK** |
| Legacy CONFIG without key | Migrate `firstRunComplete: true` only | **OK** |
| Bootstrap persist | `applyUiConfig` + `persistSettings(false)` on load | **OK** in `loadSavedSettings` |
| Banner | Shown when Simple + incomplete first run | `shouldShowSimpleModeFirstRunBanner` tests **OK** |
| Complete | Dismiss / Simple off → `markFirstRunCompleteAndPersist` | **OK**; in `collectUiConfig` |
| Workflow hint | Hidden after audit or when cards exist | `shouldShowWorkflowNextStep` tests **OK** |

**No P0/P1 regressions** found in first-run path.

---

## Wiring — HTML ↔ JS ↔ CONFIG

| Check | PE-62 result |
|-------|----------------|
| Static `id=` in `taskpane.html` | **187** (+6 vs PE-59 from PE-61 onboarding UI) |
| Orphan `getEl("…")` targets | **0** |
| `collectUiConfig` / `applyUiConfig` | Includes `firstRunComplete`, PE-58–59 fields verified |
| New PE-62 id | `peAuditFilterLanesHint` — static copy only (no JS required) |

### Open items (carry-forward from PE-59)

| ID | Sev | Finding | PE-62 |
|----|-----|---------|-------|
| F-58-4 | P2 | Legacy chapter `<select>`s | Open — recommend remove after migration window |
| F-58-6 | P3 | Settings dialog initial focus | Open |
| F-58-9 | P2 | No Office.js CI | Open — Phase 2 |
| F-58-10 | P2 | Citation footnotes API | v1.1 |
| F-58-11 | P3 | What's new until next manifest bump | Open |
| F-62-1 | P2 | Optional 3-stop onboarding tour | **Recommend** — PE-60 P2 backlog |
| F-62-2 | P3 | Post-long-scan chapter hint in audit summary | **Recommend** — threshold footnote |

---

## Findings table (prioritized)

| ID | Sev | Area | Finding | Action |
|----|-----|------|---------|--------|
| — | — | — | **No P0** | — |
| — | — | — | **No new P1** | PE-58/59 wiring verified |
| F-62-3 | P2 | UX | Audit filter “lanes” not explained for PWA refugees | **Fixed PE-62** — `#peAuditFilterLanesHint` |
| F-62-4 | P2 | UX | Truncation status terse | **Fixed PE-62** — status bar copy |
| F-58-4 | P2 | Scope UI | Legacy chapter selects | Recommend |
| F-62-1 | P2 | UX | Skippable 3-stop tour (Target → Run → Fix) | Recommend (agent) |
| F-58-9 | P2 | CI | Office.js smoke | Recommend (agent, Phase 2) |
| F-58-10 | P2 | Algorithms | Citation footnotes | v1.1 |
| F-58-6 | P3 | A11y | Settings focus | Recommend |
| F-58-11 | P3 | Help | What's new 2.0.0.15 | Until manifest bump |

---

## Tests & CI

| Layer | PE-62 |
|-------|-------|
| **Unit** | **40** tests (`first-run-onboarding.test.mjs` + prior suite) |
| **CI** | `version-sync.yml` unchanged |
| **Gaps** | Office.js manual; no visual regression |

---

## PE-62 code changes summary

- **P0 fixed:** 0  
- **P1 fixed:** 0  
- **P2 polish:** filter-lanes Audit hint; truncation status message  
- **Tests updated:** truncation wiring assertion string  
- **Docs:** this file; rating refresh; source-of-truth PE-62 pointer  

---

## Recommendations — next 30 days (prioritized)

| Priority | Item | Owner | Agent | Notes |
|----------|------|:-----:|:-----:|-------|
| **P0** | Run [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) including **PE-61** first-run + checklist paths | ✓ | assist | Blocks confidence in forum mitigations |
| **P0** | **Beta UX-4** — measure Simple banner dismiss, time-to-first-audit | ✓ | — | [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md) |
| **P1** | **Phase 1 validation** — [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) / [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) with testers | ✓ | doc sync | Link checklist in beta comms |
| **P2** | **PE-62 tour** — optional 3-stop skippable tour (PE-60 P2) | — | ✓ | `onboarding-helpers.js`; respect hide-tips |
| **P2** | **Performance messaging** — post-audit footnote when chars > threshold | — | ✓ | Copy-only; no cap change |
| **P2** | **Office.js smoke** in CI (read-only fixture) | — | ✓ | F-58-9 → **PE-69** |
| **P1** | Deploy diagnostics ingest (optional) | ✓ | template | [DIAGNOSTICS.md](./DIAGNOSTICS.md) |
| **P2** | **Beta comms** — one paragraph: manual audit, Simple first run, filter lanes | ✓ | draft | Point to PE-61 release notes |
| **P2** | Remove F-58-4 legacy chapter UI | — | ✓ | After migration window |

---

## Cross-links

- **PE-60 forum research:** [prozaedit-addin-usability-forum-research.md](./prozaedit-addin-usability-forum-research.md)  
- **PE-61 release:** [RELEASE-NOTES-PE-61-ONBOARDING.md](./RELEASE-NOTES-PE-61-ONBOARDING.md)  
- **Rating:** [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md)  
- **PE-59 review:** [FULL-APP-REVIEW-PE-59.md](./FULL-APP-REVIEW-PE-59.md)  

---

## Superseded by UX bundle (PE-68)

The **PE-63–67** UX bundle on [PR #18](https://github.com/drcracius/prozaedit-word/pull/18) extends PE-61/62 with tour, Essentials, plain language, Important labels, and tab flow. After merge, use:

- **[FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md)** — score **~8.85**, **57** tests, PWA checklist  
- **[RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md)** — single owner-facing release note  
