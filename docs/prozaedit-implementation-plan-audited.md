# ProzaEdit Word — Audited Implementation Plan (Primary Roadmap)

**Audience:** D Cracius (author, primary tester, PC + iPad workflows)  
**Authored:** 2026-10-31 (audit + Phase 2 delivery)  
**Supersedes as primary roadmap:** [prozaedit-multi-phase-plan.md](/cursor/stores/self/docs/prozaedit-multi-phase-plan.md) (v1 retained as historical)  
**Production baseline:** hosted build **2.0.0.15** ([source-of-truth](/cursor/stores/self/docs/source-of-truth.md))  
**North star:** [Next-Gen Master Specification](prozaedit-nextgen-master-specification.md) (vNext architecture, post-2.0.0.15)  
**As-built acceptance:** [Feature Reference](/cursor/stores/self/docs/prozaedit-features.md)  
**Gap analysis:** [Spec Review](/cursor/stores/self/docs/prozaedit-nextgen-spec-review.md)  
**Code map:** [Codebase Overview](/cursor/stores/self/docs/prozaedit-codebase-overview.md)

---

## 1. Executive summary

**Where we are:** ProzaEdit Word is a **hosted beta** Office add-in (GitHub Pages + one-time `manifest.hosted.xml` upload). Core product is **local-first** audit, coach, and rewrite with optional Gemini. **Release 2.0.0.15** aligns `manifest.hosted.xml` and `PROZAEDIT_BUILD_VERSION` after Phases **2–7** (tooltips, shaper, timeline, citations, install/docs, report export, optional AI quota). **Phase 1** (`word-safe-navigator.js`, commit `91ecf56`) remains the foundation extract.

**North star:** The vNext spec describes **Editorial Studio** UX, modular engines (chronology, citations, lexical shaper, tooltips, quota-aware Gemini), and additive surfaces (**Narrative**, **Citations**) without replacing the v2 workflow strip or dropping **Checks**, **Thesaurus**, or batch/heatmap tooling.

**Principles (non-negotiable):**

1. **Audit surgically** — reproduce or understand failure modes; smallest fix; re-check manifest URLs, version strings, and Office load paths ([source-of-truth](/cursor/stores/self/docs/source-of-truth.md)).
2. **No regressions** — every phase ends with the [features doc](/cursor/stores/self/docs/prozaedit-features.md) smoke checklist on **Word on the web** (primary) and desktop WebView2 where available.
3. **Incremental delivery** — no §11 HTML cutover; evolve `taskpane.html` / `taskpane.css` / `lib/*` in place.
4. **Version discipline** — bump `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` **together** only when users must re-upload; UI-only pushes need Pages refresh only (**no manifest bump for Phase 2**).

---

## 2. Audit record (Pass 1–3)

### Pass 1 — Internal consistency

| Finding | Resolution in this plan |
|---------|-------------------------|
| Spec review §5 Phase 2 listed **3-axis shaper on Rewrite** while v1 plan placed shaper in Phase 3 only | **Kept shaper in Phase 3**; spec review item treated as aspirational overlap — Phase 2 scope is tooltips + tokens only |
| Duplicate optional **`report-docx-export.js`** mentions in Phase 1 tail and Phase 2 | Single **defer** to Phase 7c unless trivial; Phase 2 does not block on export extract |
| Phase 2 acceptance did not mention **dynamic audit cards** | Added acceptance: `refreshTooltips` after card render; delegation avoids duplicate listeners |
| Version policy: Phase 2 “optional build label bump” vs §8 “prefer sync only on manifest bumps” | **Clarified:** Phase 2 = **no** manifest bump and **no** `PROZAEDIT_BUILD_VERSION` change |
| Phase 6 “parallel from P2” vs diagram only showing P2→P6 edge | Diagram unchanged; parallel workstreams table already allows Phase 6 docs early |

### Pass 2 — External alignment

| Finding | Resolution |
|---------|------------|
| Spec review appendix listed `word-safe-navigator.js` as absent (pre-`91ecf56`) | Tracker + inventory updated; appendix in review doc is stale — **navigator exists on `main`** |
| [prozaedit-features.md](/cursor/stores/self/docs/prozaedit-features.md) §8 lib table omits `word-safe-navigator.js` and new tooltip module | **Tracked Phase 6 (D8)** repo/Project sync; acceptance still uses features **behavior** checklist |
| Plan lib count “18 modules” after Phase 1 | **19 modules** after Phase 2 (`tooltip-registry.js`) |
| Master spec §3 tooltip keys vs v2 controls | v2 keys (`btn-run-audit`, `sel-manuscript-scope`, `chk-repetition`, card goto/apply) aligned to shipped IA |
| PE-2 Shared Folder deferred to Phase 5/6 | Unchanged; Phase 0 only **logs** blockers |

### Pass 3 — Execution realism

| Finding | Resolution |
|---------|------------|
| Naïve `initTooltips` per-element binding breaks on re-init and dynamic DOM | Implementation uses **event delegation** + `data-pe-native-title` restore when disabled |
| Office WebView2 tooltip positioning / narrow pane | CSS max-width + viewport clamp; **PC desktop** row in Phase 2 test plan |
| iPad web read-only paths unchanged | No new write paths; tooltips are read-only UI |
| `report-docx-export.js` not trivial inline extract | **Deferred** Phase 7c |
| Decision D4 (tips default) open in v1 | **Closed: default on**; Target toggle persists in `PROZAEDIT_CONFIG` |

---

## 3. Phase execution tracker

| Phase | Status | Commit | Notes |
|-------|--------|--------|-------|
| 0 — Beta stability | Ongoing | — | Smoke after each `src/` merge; PE-2 validation deferred |
| 1 — Navigator extract | **Complete** | `91ecf56` | `word-safe-navigator.js`; no manifest bump |
| 2 — UX polish (tooltips + tokens) | **Complete** | `adba593` | `tooltip-registry.js`, Show hover tips, indigo/card tokens |
| 3 — Banks + shaper v1 | **Complete** | `83e88f0` | `lexical-banks.js`, `lexical-shaper.js`, Rewrite Advanced panel; no manifest bump |
| 4 — Chronology v1 | **Complete** | `76adf92` | `chronology-engine.js`, Checks Timeline scan sub-panel; no manifest bump |
| 5 — Citations v1 | **Complete** | `8f12b94` | `citation-engine.js`, Checks sub-panel + Target verify; no manifest bump |
| 6 — Install + docs hygiene | **Complete** | `3065334` | WORKFLOWS.md, THIRD-PARTY-ATTRIBUTION.md, GitHub install scripts; web upload primary; PE-2 deferred |
| 7+ — Optional (CI, quota, Zipf, IA merge) | **Partial** | PE-32 | **7a-lite**, **7c**, **7b** (version-sync + `npm test` on `main`); **7d–7g** deferred |

---

## 4. Current state snapshot

### 4.1 Shipped capabilities (2.0.0.15)

Seven tabs + workflow strip unchanged. **2.0.0.15** registers Phases 2–7: hover tips, lexical shaper, timeline/citation scans, install scripts + help docs on GitHub, report export module, optional Gemini session quota (default off).

### 4.2 `src/taskpane/lib/` inventory (post–Phase 7c)

**28 modules:** Phase 7c set plus **`pe-icons.js`**, **`diagnostics-config.js`**, **`diagnostics-reporter.js`** (UX + PE-28).

**Still deferred vs vNext spec:** Zipf shaper v2, full quota modal, IA merge, dark mode, header metrics (7d–7g).

### 4.3 Known gaps (unchanged)

Optional desktop `.bat` / **PE-2** catalog (deferred appendix), optional hosted diagnostics **ingest** deploy (client ships opt-in off), vNext engines — see [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md).

---

## 5. Phase overview

```mermaid
flowchart TB
  P0[Phase 0 Beta stability]
  P1[Phase 1 Navigator DONE]
  P2[Phase 2 UX polish DONE]
  P3[Phase 3 Shaper and banks]
  P4[Phase 4 Narrative chronology]
  P5[Phase 5 Citations]
  P6[Phase 6 Install and docs]
  P7[Phase 7+ CI and IA optional]
  P0 --> P1
  P1 --> P2
  P2 --> P3
  P3 --> P4
  P4 --> P5
  P2 --> P6
  P5 --> P7
  P6 --> P7
```

Phases **2–5** follow [spec review §5](/cursor/stores/self/docs/prozaedit-nextgen-spec-review.md#5-recommended-phasing-roadmap-surgical-no-regression), with Phase 2 narrowed to tooltips/tokens per audit above.

---

## Phase 0 — Beta stability track (ongoing)

*(Same as v1 plan — smoke checklist, manifest discipline, PE-2 logging only.)*

**PE-2 (optional desktop, deferred):** [pe-2-shared-folder-checklist.md](pe-2-shared-folder-checklist.md) — not required for web 1.0; see [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md).

**Acceptance:** Audit → Apply fix → Undo → Go to (web); Check for updates; manifest/UI version match on `main`.

---

## Phase 1 — Foundation extract & documentation truth ✅ COMPLETE

**Status:** Complete (`91ecf56`). See v1 plan for criteria.

---

## Phase 2 — vNext UX polish (v2 IA retained) ✅ COMPLETE

**Goals:** Editorial Studio **incremental** visual and guidance upgrades without tab renames or Checks/Audit merge.

**Delivered:**

1. **`lib/tooltip-registry.js`** — `TOOLTIP_REGISTRY`, `initTooltips(enabled)`, delegation + native `title` restore when disabled.
2. **Target → Show hover tips** — persisted via `PROZAEDIT_CONFIG` (`showHoverTips`, default true).
3. **Migrated controls:** Run audit (toolbar, Checks, Audit), `#scope`, Repetition toggle row, audit card **Go to** / **Apply fix**.
4. **`.pe-tooltip-bubble`** in `taskpane.css` (viewport-safe).
5. **CSS tokens:** `--pe-primary-indigo`, `--pe-card-surface`; wordmark + workflow strip retained.

**Acceptance criteria (Phase 2):**

- Features doc §2–§3 behaviors unchanged (Simple mode, `adaptModules()` fiction gating).
- Tips off → native `title` restored; no custom bubbles.
- Tips on → no duplicate native `title` on migrated `[data-pe-tip]` nodes.
- Re-audit re-renders cards → tips still work (`refreshTooltips`).
- **No** manifest or `PROZAEDIT_BUILD_VERSION` bump.

**Manifest / version:** UI-only → refresh task pane only.

**Test plan:** Web toggle + Run audit + card buttons; desktop WebView2 positioning; narrow pane clamp.

---

## Phase 3 — Lexical shaper evolution & shared banks ✅ COMPLETE

**Status:** Complete (`83e88f0`). See [multi-phase plan Phase 3](/cursor/stores/self/docs/prozaedit-multi-phase-plan.md) for scope.

**Delivered:**

1. **`lib/lexical-banks.js`** — `ProzaEdit.LexicalBanks` (pleonasms, AI/spoiler phrases, wordiness, contractions, extended fillers, vNext seed maps).
2. **`lib/lexical-shaper.js`** — slider values → stacked `local-rewrite.js` passes (no Zipf v2).
3. **Rewrite tab** — collapsible **Advanced lexical shaper** (Complexity / Intensity / Density), `data-simple-hide`; applies only when panel is **open**.
4. **Tooltips** — `slider-complexity`, `slider-intensity`, `slider-density` in `tooltip-registry.js`.

**Acceptance:** Legacy four modes unchanged when shaper collapsed; audit lists unchanged (same array refs); no manifest bump.

**Depends on:** Phase 2 (slider tooltips). **Effort:** L + M.

---

## Phase 4 — Narrative & chronology engine (additive) ✅ COMPLETE

**Delivered:** `lib/chronology-engine.js` (paragraph-index walk, temporal regex + phrases, spoiler guard v1 opt-in); Checks **Timeline scan** sub-panel with Go to via `WordSafeNavigator`; findings merge additively into Audit cards (mute + report-density caps). `mContinuity` / `mSpoiler` in `audit-engine.js` unchanged.

---

## Phase 5 — Citations engine (opt-in) ✅ COMPLETE

**Delivered:**

1. **`lib/citation-engine.js` v1** — APA-ish, CMOS-ish, and Bluebook-lite regex/heuristic packs; findings as standard audit cards (`ruleId`, mute, report-density caps). Lightweight References/Bibliography section match for in-text vs end refs; `BIBLIOGRAPHY_TODO` for footnote/DOI v1.1.
2. **UI (D6)** — No top-level Citations tab. **Checks → Citation verify (beta)** sub-panel (opt-in toggle; Academic / Business / Technical-Journalism gating via `adaptModules()`). **Target → Verify citations** when eligible. Simple mode unchanged.
3. **`acad:citation_hint`** in `audit-engine.js` unchanged (Run audit path).

**Acceptance:** Fiction → citation panel hidden; explicit scan only; no network; no manifest bump.

---

## Phase 6 — Install/catalog restoration & docs hygiene ✅ COMPLETE

**Delivered:**

1. **`docs/WORKFLOWS.md`**, **`docs/THIRD-PARTY-ATTRIBUTION.md`** — concise, accurate; Help tab links to GitHub blob URLs.
2. **`docs/prozaedit-features.md`** — 23-module lib table; Phase 3–5 (shaper, timeline, citations, hover tips).
3. **`scripts/install/Install-ProzaEdit-GitHub.ps1`**, root **`Install-ProzaEdit-Desktop-GitHub.bat`**, **`Fix-ProzaEdit-SharedFolder.bat`** — raw manifest default; local catalog folder; optional TrustedCatalog; SMB/OTHP15 documented as example only in `scripts/install/README.md`.
4. **`docs/WHEN-YOU-RETURN.md`** — install helper table updated.

**Acceptance:** No 404 for shipped help docs on GitHub; features §8 matches `taskpane.html` load order; no manifest bump.

**Install validation (web-first):** Word on the web upload + [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md). Optional: PE-2 Shared Folder on Windows per checklist appendix.

---

## Phase 7+ — Optional hardening & vNext completion

**Goals:** Long-horizon vNext items without blocking beta ([multi-phase plan §Phase 7+](/cursor/stores/self/docs/prozaedit-multi-phase-plan.md)).

| Workstream | Status | Notes |
|------------|--------|-------|
| **7a — AI quota** | **Lite delivered** | `ai-quota-manager.js`; Target optional session ceiling; **enforce default off** |
| **7b — CI** | **Complete** | PE-30: `version-sync.yml` + `verify-version-sync.sh` on `main`; PE-32: root `package.json` + `node --test` for pure JS (navigator, banks, chronology, citation, diagnostics redaction) — no Office.js in CI |
| **7c — Report module** | **Complete** | `report-docx-export.js`; plain-text + `createDocument` + `.txt` fallback unchanged |
| **7d — Zipf shaper v2** | Deferred | Phase 3 local shaper retained |
| **7e — IA consolidation** | Deferred | D1: keep Checks separate |
| **7f — Dark mode** | Deferred | Token pass only (Phase 2) |
| **7g — Header metrics** | Deferred | — |

**Acceptance (this slice):** Phase 0 smoke; report export paths behave as before; quota off → no Gemini gate change; quota on → blocks over-budget Gemini with reset on Target.

**Manifest / version:** No bump (UI-only module load + settings).

---

## 6. Parallel workstreams (D vs agent/dev PC)

| Work | **D (iPad / Project / browser)** | **PC-only** |
|------|-----------------------------------|-------------|
| Phase 2 UX | Tooltip toggle on Word web | WebView2 tooltip smoke |
| Phase 6 install | Help links on iPad Safari | **PE-2 Shared Folder**, scripts |

**Rule:** Changes touching `Word.run` batching or desktop catalog **must** be validated on PC before manifest bump.

---

## 7. Decision log & open questions

| ID | Question | Status | Recommendation |
|----|----------|--------|----------------|
| D1 | Merge Checks into Audit? | Open | **A until 7e** |
| D2 | Manifest semver bump policy | Closed | Per source-of-truth |
| D3 | Chronology UI | Open | Checks sub-panel first |
| D4 | Tooltips default on? | **Closed** | **On**; Target toggle |
| D5 | Rewrite vs Shaper label | Open | Keep **Rewrite** until Phase 3 subtitle |
| D6 | Citations tab timing | Open | After real brief validation |
| D7 | npm dev server on `main` | Open | Slim `dev/` optional |
| D8 | Features doc single source | Open | Sync on release (Phase 6) |
| D9 | README pointer to plan | **Closed** | `README.md` → audited plan + approved-scope doc |

---

## 8. Milestone table

| Milestone | Phase | Outcome | Manifest bump? |
|-----------|-------|---------|------------------|
| M0 | 0 | Author + tester path verified | No |
| M1 | 1 ✅ | `word-safe-navigator.js` | No |
| M2 | 2 ✅ | Tooltips + CSS tokens | No |
| M3 | 3 | Banks + shaper v1 | Optional |
| M4 | 4 | Chronology scan | Optional |
| M5 | 5 | Citation heuristics | Optional |
| M6 | 6 | PE-2 + docs + install | If script changes manifest |
| M7a–b | 7 | Quota / CI | Maybe / No |

---

## 9. Cross-phase test matrix (Word)

| Capability | Web (required) | Desktop PC | iPad web |
|------------|----------------|------------|----------|
| Run audit / extended | ✓ | ✓ | ✓ |
| Apply fix / undo | ✓ | ✓ | ✓ |
| Hover tips on/off | ✓ | ✓ (WebView2) | ✓ |
| Shared Folder install (optional) | — | PE-2 deferred | Web upload primary |

**Minimum smoke after `src/` merge:** Target save → Checks Run audit → Audit Apply one safe fix → Undo → toggle hover tips → Help Check for updates.

---

## 10. Version & release policy (summary)

| Change type | `manifest.hosted.xml` | `PROZAEDIT_BUILD_VERSION` | User action |
|-------------|----------------------|----------------------------|-------------|
| Copy/CSS/tooltips/new JS module load | No bump | No change (Phase 2) | Refresh pane |
| Ribbon/description/version visibility | Bump patch | **Must match** | Re-upload manifest |

---

## 11. Related documents

| Document | Path |
|----------|------|
| Source of truth | [/cursor/stores/self/docs/source-of-truth.md](/cursor/stores/self/docs/source-of-truth.md) |
| Historical v1 plan | [/cursor/stores/self/docs/prozaedit-multi-phase-plan.md](/cursor/stores/self/docs/prozaedit-multi-phase-plan.md) |
| Features (2.0.0.15) | [prozaedit-features.md](prozaedit-features.md) |
| Release notes | [RELEASE-NOTES-2.0.0.15.md](RELEASE-NOTES-2.0.0.15.md) |
| Codebase overview | [/cursor/stores/self/docs/prozaedit-codebase-overview.md](/cursor/stores/self/docs/prozaedit-codebase-overview.md) |
| vNext master spec | [/cursor/stores/self/docs/prozaedit-nextgen-master-specification.md](/cursor/stores/self/docs/prozaedit-nextgen-master-specification.md) |
| Spec review & §5 phasing | [/cursor/stores/self/docs/prozaedit-nextgen-spec-review.md](/cursor/stores/self/docs/prozaedit-nextgen-spec-review.md) |
| Project tasks | [notes.md](/cursor/stores/self/notes.md) |

---

*Primary roadmap aligned to GitHub `main` through Phase **7b** + 7a/7c (manifest baseline **2.0.0.15**). Approved scope vs vNext: [prozaedit-approved-scope-vs-vnext.md](./prozaedit-approved-scope-vs-vnext.md).*
