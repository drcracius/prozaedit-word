# ProzaEdit Word — Deep audit report

**Baseline:** GitHub `main` hosted build **2.0.0.15** (`manifest.hosted.xml` `<Version>` = `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js`).  
**Audit date:** 2026-10-31  
**Method:** Grep + read of `taskpane.html`, `taskpane.js`, `taskpane.css`, and all 25 `src/taskpane/lib/*.js` modules.

---

## 1. Wiring inventory

### 1.1 Script load order (`taskpane.html` vs `lib/`)

| # | Script in HTML | File on disk |
|---|----------------|--------------|
| 1–25 | Matches features doc §8 order | All 25 files present under `src/taskpane/lib/` |
| 26 | `taskpane.js` | Present |

**Order notes (dependencies):** `lexical-banks.js` loads before `audit-engine.js`, `local-rewrite.js`, and `chronology-engine.js` (banks consumed). `local-rewrite.js` before `lexical-shaper.js`. `word-safe-navigator.js` before chronology/citation UI paths that call `goToIssue`. `tooltip-registry.js` before `taskpane.js` orchestration. **No orphan lib files** and **no HTML scripts missing from disk**.

### 1.2 `onclick` handlers vs `taskpane.js`

All static `onclick="…"` handlers in `taskpane.html` resolve to functions defined in `taskpane.js` (verified by name match). Dynamic audit card actions use `element.onclick` assignments in `renderAuditCards()` (`goToIssue`, `applyFix`, `showLocalTipForIssue`, `sendIssueToChat`, `addDictionaryWordFromCard`, `addCustomStyleFromCard`, `muteRule`, `dismissCard`).

Inline handlers in audit empty state: `runPrimaryAudit()`, `showTab('tab3')` — present.

Shaper sliders use `oninput="syncShaperSliderLabels()"` — present.

### 1.3 Settings store keys vs UI

| `ProzaEdit.Settings.KEYS` | UI / runtime use |
|---------------------------|------------------|
| `PROZAEDIT_CONFIG` | `collectUiConfig()` / `applyUiConfig()` — manuscript, scope, toggles, modules, chrono/citation opts, AI quota, pins filter/sort, optional `apiKey` when remember |
| `PROZAEDIT_MUTED_RULES` | Card Mute/Dismiss via `muteRule()` |
| `PROZAEDIT_GLOBAL_MUTED` / `PROZAEDIT_GLOBAL_DISMISSED` | `localStorage`; merged in `getMutedRules()` / dismiss checks |
| `PROZAEDIT_DICTIONARY` | Target dictionary list |
| `PROZAEDIT_LAST_AUDIT` | Cache + `clearAuditReport()` |
| `PROZAEDIT_SECTION_IDX` / `PROZAEDIT_CHAPTER_IDX` | Section/chapter loop |
| `PROZAEDIT_LAST_AUDIT_STATS` | Reference-style delta |
| `PROZAEDIT_CHAPTER_HEATMAP` | Heatmap build on Checks |
| `PROZAEDIT_REFERENCE_STYLE` | Capture reference style |
| `PROZAEDIT_CUSTOM_STYLE` | Custom house rules |

**Shaper sliders (PE-45):** `shaperComplexity` / `shaperIntensity` / `shaperDensity` persist in `PROZAEDIT_CONFIG` with document; panel **Reset** restores defaults.

**Session-only (not document settings):** `pe-session-tips-dismissed` (onboarding), `PROZAEDIT_UPDATE_CHECK`, `PROZAEDIT_FULL_OK`, `pe_ai_session_tokens` (quota).

### 1.4 Simple mode (`pe-simple-mode`, `data-simple-hide`, `adaptModules`)

| Mechanism | Effect |
|-----------|--------|
| `body.pe-simple-mode` | Toggled by `applySimpleMode()` from Target `#simpleMode` |
| `[data-simple-hide]` | Hidden in simple mode: Thesaurus tab, Gemini session ceiling block, Advanced lexical shaper |
| `.pe-gemini-block` | Hidden: Coach/Rewrite optional Gemini `<details>` |
| `.pe-shaper-block` | Hidden: Rewrite shaper panel |

**Not hidden in simple mode:** Core audit, Checks (incl. timeline/citation panels when eligible), Coach local, Rewrite local four modes, Help.

**Fiction gating (`adaptModules()` on `#manuscriptType` change + load):**

- Fiction module checkboxes `mPlot`…`mSpoiler`: `disabled` when type string does not include `"Fiction"`.
- `#peChronoPanel`: `hidden` + `disabled-section` when not fiction; `#chkChronoSpoilerGuard` disabled when not fiction.
- `#peCitationPanel`: `hidden` + `disabled-section` when `CitationEngine.isEligibleManuscript()` false (Academic / Business / Technical-Journalism only).
- `#btnVerifyCitationsTarget` + hint: hidden when not citation-eligible; disabled when opt-in `#chkCitationScan` off.
- `#btnScanCitations`: disabled when not eligible or opt-in off.

**CSS gap:** `.pe-chrono-block[disabled-section]` dims and blocks pointer events; `.pe-citation-block[disabled-section]` has **no matching rule** (panel is usually `hidden` when ineligible, so low user impact).

---

## 2. Feature connectivity (read → process → write)

### Target

- **Read:** User inputs; debounced `schedulePersistSettings()` (~350 ms) → `PROZAEDIT_CONFIG`.
- **Write:** Dictionary/custom style via explicit saves; no audit text mutation.

### Thesaurus

- **Read:** `#thesaurusInput` or Word selection (token, ~120 chars cap in lookup path).
- **Process:** `fetch` Datamuse `rel_syn` / `rel_ant`; fallback placeholders on failure.
- **Write:** `replaceWithWord` → `applyDocumentEdit` (respects `#replaceInSelectionOnly` unless audit-style `forceDocument`).

### Checks → Run audit

- **Read:** `prepareScopeForAudit()` → `ScopeReader` / selection; caps from `getScopeCharLimit()` / `ScopeReader.LIMITS`.
- **Process:** `ProzaEdit.Audit.run()` (+ extended pass if `#auditExtendedChecks`); context from `buildAuditContext()`.
- **Write:** None until user applies cards; summary/cards on Audit tab via `finalizeAudit()`.

### Timeline scan (fiction)

- **Read:** `ScopeReader.readParagraphsInScope()` + `buildChronologyContext()`.
- **Process:** `ChronologyEngine.analyze()`; optional spoiler guard.
- **Write:** Findings merged into `currentAuditSuggestions` (`ChronologyEngine.mergeFindings`); Go to → `WordSafeNavigator.selectFirstInBody`.

### Citation verify

- **Read:** Same scope paragraph walk; `buildCitationContext()`.
- **Process:** `CitationEngine.analyze()`; optional bibliography reconcile.
- **Write:** Merge to audit cards; Target shortcut calls `runCitationScan()` when opt-in on.

### Audit cards

- **Go to / Apply:** `WordSafeNavigator` (`sanitizeSearch` 255 chars, strip wildcards); Apply uses `forceDocument: true`.
- **Export:** `report-docx-export.js` — plain text, insert end, `createDocument` or `.txt` fallback, PDF guide alert.

### Coach

- **Local:** `LocalCoach` regex tips; optional selection when `#chatSelectionOnly`.
- **Gemini:** `geminiGenerateWithQuota()` → `Gemini.generate`; quota from `AIQuotaManager` when `#aiEnforceSessionCeiling`.

### Rewrite / shaper

- **Read:** Selection max ~3500 (`MAX_CHAT` in rewrite path).
- **Process:** `LocalRewrite.run()` or, if `#pe-shaper-panel` open, `LexicalShaper.shape()`.
- **Write:** `applyRewritePreview()` → `applyDocumentEdit`.

### Tooltips

- **Registry:** `tooltip-registry.js` delegation on `[data-pe-tip]`; `refreshTooltips()` after `renderAuditCards()`.
- **Toggle:** Target `#showHoverTips` → `applyHoverTips()` / `initTooltips`.

### Quota

- **Default off;** when on, blocks Gemini Coach, Deep Audit, Gemini rewrite with sessionStorage counter.

### Help links (broken / partial)

| Reference | Status |
|-----------|--------|
| Collapsible “Quick start & editing stack” | Links to `docs/WORKFLOWS.md`, `docs/THIRD-PARTY-ATTRIBUTION.md` on GitHub — **OK** |
| Checks partner hint | WORKFLOWS link — **OK** |
| Help tab (tab7) body | **Does not** include WORKFLOWS / THIRD-PARTY links (contradicts `prozaedit-features.md` §2 Help) — **P1** |
| Target style guide footnote | Plain text `docs\STYLE-GUIDE-SOURCES.md` — **file not in repo** — **P1** |

---

## 3. Edge cases and risks

| Area | Behavior / risk |
|------|-----------------|
| Office.js | `Word.run` + `context.sync()` throughout; host gate on `Office.onReady` (Word only). |
| Empty selection | Audit: confirm → `selectNextSection()` if user agrees; else warn. Rewrite: error if no highlight. |
| Scope caps | 150k / 200k / 450k by mode; truncation system card; full-doc confirm once per session (`PROZAEDIT_FULL_OK`). |
| `sanitizeSearch` | 255 char cap; strips `^?$*[]{}<>@#`; newlines → space. Long card targets may not find full phrase. |
| Dynamic cards + tooltips | `refreshTooltips()` called after render — OK. |
| Gemini gates | API key required; quota optional; `AppDomains` in manifest do **not** list Datamuse/Gemini (normal for task pane fetch). |
| Chronology FP | Regex on “Monday morning”, “years later”, spoiler telegraph phrases — dialogue and genre time skips may flag. |
| Citation FP | Pattern assist only; `BIBLIOGRAPHY_TODO` for v1.1 footnotes/DOI. |
| Version check | `PROZAEDIT_BUILD_VERSION` **2.0.0.15** matches `manifest.hosted.xml`; auto-check once per build via `PROZAEDIT_UPDATE_CHECK` session key. |

---

## 4. Problematic code and hygiene

| Item | Severity |
|------|----------|
| Help tab missing WORKFLOWS / THIRD-PARTY links | P1 |
| `STYLE-GUIDE-SOURCES.md` referenced but absent | P1 |
| `docs/WORKFLOWS.md`, `docs/THIRD-PARTY-ATTRIBUTION.md` still say **2.0.0.14** in header | P2 |
| `docs/prozaedit-nextgen-master-specification.md` baseline **2.0.0.14** | P2 (vNext doc) |
| Shaper slider values not in CONFIG | P2 (document or persist) |
| `.pe-citation-block[disabled-section]` CSS missing | P2 |
| `citation-engine.js` TODO v1.1 footnotes | P2 backlog |
| DOM tab order: `tab7` before `tab6` in HTML | P2 cosmetic (nav order correct) |
| No automated CI/tests | P2 |

**Dead code / duplicates:** No unused lib modules. Extended audit toggles synced via `data-audit-extended` on two checkboxes. `runProzaEditAudit` / `runExtendedLocalAudit` used from extended toggle path.

**P0 wiring:** No missing scripts, handlers, or manifest/UI version mismatch on **2.0.0.15**.

---

## 5. Prioritized fix list

### P0

- None identified for script/handler/version wiring on 2.0.0.15.

### P1

1. Add Help tab links to `WORKFLOWS.md` and `THIRD-PARTY-ATTRIBUTION.md` (GitHub blob URLs).
2. Add `docs/QUICK-START.md` + Help “Quick start (2 min)” link.
3. Replace or link Target `STYLE-GUIDE-SOURCES.md` reference to an existing doc.
4. First-session dismissible tips (`pe-session-tips-dismissed`).
5. Bump stale **2.0.0.14** strings in shipped `docs/WORKFLOWS.md` and `docs/THIRD-PARTY-ATTRIBUTION.md`.

### P2

1. Add `.pe-citation-block[disabled-section]` parity CSS.
2. Persist shaper sliders in CONFIG (optional).
3. Create `STYLE-GUIDE-SOURCES.md` or remove all references.
4. Sync vNext spec baseline to 2.0.0.15 when editing that doc.
5. CI / pure-function tests for `sanitizeSearch`, scope limits, mute merge.

---

*End of deep audit report.*
