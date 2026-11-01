# PE-58 — Full application review (UI/UX, wiring, algorithms, security)

**Date:** 2026-11-01  
**Baseline:** GitHub `main` through **PE-57** ([PR #13](https://github.com/drcracius/prozaedit-word/pull/13))  
**Hosted build:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`)  
**Automated gates:** `npm test` **34** pass · `scripts/verify-version-sync.sh` aligned  

---

## Executive summary

| Metric | Estimate |
|--------|----------|
| **Shipped product score** | **~8.6 / 10** (up from **8.5** in [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) after PE-50–57 theme, appearance onboarding, review-mode audit UX, card trust row) |
| **vNext alignment** | **~4.2 / 10** (unchanged — master spec IA ≠ seven-tab shipped UI) |
| **P0 defects found** | **0** |
| **P1 fixed in PE-58** | **2** (CONFIG autosave wiring) |
| **Unit tests** | **34** (was 32 on PE-57 `main`) |

### Top 5 risks

1. **Word API / WebView variance** — `Word.run` search miss, selection drift, long sync on full manuscript; no Office.js in CI ([FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) remains P0 owner validation).
2. **Orchestrator size** — `taskpane.js` ~4.2k lines; regressions need manual Word passes or targeted wiring tests.
3. **Truncation / caps** — Scope limits (`ScopeReader.LIMITS`) and `sys_trunc` cards easy to miss on long docs.
4. **Fiction vs non-fiction gating** — Timeline/citation/plot modules depend on manuscript type + toggles; academic users can enable fiction modules without reading inline copy.
5. **Gemini optional path** — User-supplied keys in document CONFIG when “Remember” is on; relies on confirm dialogs and local-only default.

### Top 5 strengths

1. **Local-first core** — Audit, coach, local paraphrase, shaper at **0 tokens** by default.
2. **Safety stack** — Confirm-before-apply, continuity guard, sanitized search (`WordSafeNavigator`), scope reader caps.
3. **Modular engines** — 32 `lib/*.js` modules; chronology/citation scans, report export, diagnostics redaction pipeline.
4. **UX pack + PE-57** — Dark/light/system theme, dark-appearance banner, workflow strip (guide + scope), review-mode filter hint, card trust row.
5. **CI version discipline** — Manifest ↔ UI build sync on every push/PR.

---

## UI/UX — seven tabs

| Tab | ID | Role | Notes |
|-----|-----|------|--------|
| **Target** | `tab1` | Profile, scope, style guide, custom rules entry | Scope modes: selection, pages, selected chapters (H1–3 checklist), full. `refreshScopeCharPreview`, chapter reload. Settings deep links for safety/style. |
| **Thesaurus** | `tab2` | Local synonym lookup | Hidden in **Simple mode** (`data-simple-hide`). Delegated clicks in `setupThesaurusDelegation`. |
| **Checks** | `tab3` | Module toggles, citation/chrono scans, section/batch controls | Fiction modules gated by `adaptModules()`. Long-op progress `peLongOpProgressChecks`. |
| **Audit** | `tab4` | Cards, filters (All / Critical / Style / Style guide), export | PE-57: `peReviewModeAuditHint`, trust row (Undo + Apply). Badge `peAuditTabBadge`. |
| **Coach** | `tab5` | Local coach + optional Gemini | `chatSelectionOnly` controls context (see wiring fix PE-58). |
| **Rewrite** | `tab6` | Local paraphrase + shaper sliders + optional Gemini | `btnRewriteBackAudit` when opened from audit card. Shaper panel `#pe-shaper-panel` (active check in `lexical-shaper.js`). |
| **Help** | `tab7` | About, quick start, platform/update guidance | Build/manifest IDs; **Look & navigation** documents Light/Dark/system (PE-55–57). Severity color legend. |

**Workflow strip** — Four steps (Target → Checks → Run audit → Fix cards); clickable via `bindWorkflowStepper`.  
**Sticky toolbar** — Undo / Redo / Last edit / Status / Settings / **Run audit** (accent).  
**Narrow pane** — `body.pe-narrow-pane` when `innerWidth < 360` (`setupNarrowPaneClass`).

### Settings modal — eight groups

| Group | DOM id | Reset | Persisted via |
|-------|--------|-------|----------------|
| Safety | `pe-settings-group-safety` | Yes | `collectUiConfig` / autosave |
| Onboarding | `pe-settings-group-onboarding` | Yes | Banners + `showLongOperationWarnings` |
| **Appearance** | `pe-settings-group-appearance` | Yes | `themePreference` radio → `data-pe-theme` on `<html>` |
| Audit & reports | `pe-settings-group-audit` | Yes | `reportDensity`, `settingsDefaultAuditFilter`, extended toggles |
| Privacy & diagnostics | `pe-settings-group-privacy` | Yes | Opt-in + note; ingest URL empty by default |
| Reference & citations | `pe-settings-group-reference` | No (by design) | Capture / citation scan actions |
| Dictionary | `pe-settings-group-dictionary` | Clears doc dictionary | Document store |
| Custom style | `pe-settings-group-custom-style` | Clears rules | Custom style store |

**Keyboard:** `Ctrl+Shift+,` / `Alt+Shift+S` opens Settings. **Filter:** `#peSettingsFilter` keyword search. **Deep links:** `#pe-settings-{section}`, `openSettingsModal('appearance'|'onboarding'|…)`.

### Themes (PE-50 / PE-55 / PE-57)

- **Preferences:** Light (default), Dark, Match system — `UiPrefs.validateThemePreference` / `resolveEffectiveTheme`.
- **Application:** `applyPeTheme` sets `document.documentElement[data-pe-theme]`; system changes via `matchMedia('prefers-color-scheme: dark')`.
- **CSS:** `taskpane.css` — `color-scheme: light|dark`; dark palette black/charcoal with **green reserved for primary actions**, not severity (PE-57 link discipline).
- **Onboarding:** `#peDarkAppearanceBanner` when effective theme is dark and `showDarkAppearanceTip` is on.

### Banners

| Banner | Dismiss | CONFIG / storage |
|--------|---------|------------------|
| What's new | Got it / Don't show again | `showWhatsNew` + per-version localStorage |
| Long operation | Continue / Not now / Don't show again | `showLongOperationWarnings` + session keys per action |
| Prior session | Got it / Settings link | `showPriorSessionSummary` |
| Session tips | Got it | `showSessionTips` |
| Dark appearance | Got it / Settings → Appearance | `showDarkAppearanceTip` |

### Accessibility (focus, ARIA)

- Tab bar: `role="tablist"`, tabs `role="tab"` with **`aria-selected`** updated in `showTab`.
- Tab panels: `role="tabpanel"` on `#tab1`–`#tab7`.
- Settings: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="pe-settings-title"`; close restores focus (`settingsModalReturnFocus`).
- Status: `aria-live="polite"` on `#peStatus`, scope preview, update status.
- **Gap (P3):** Opening Settings focuses `#btn-settings-back` first — acceptable but not ideal first focus (Close or title region would be more conventional).

---

## Wiring — HTML ↔ JS ↔ CONFIG

**Inventory:** 172+ static `id=` attributes in `taskpane.html`; **0** orphan `getEl("…")` targets; **0** broken inline `onclick` handlers (79 inline + injected).

| Path | Behavior |
|------|----------|
| Init | `Office.onReady` → `loadSavedSettings` → `applyUiConfig` → handlers → `setupThemePreference` → banners → diagnostics |
| CONFIG | Document-scoped `PROZAEDIT_CONFIG` via `settings-store.js`; `collectUiConfig` / `applyUiConfig` round-trip |
| Autosave | `setupAutoSaveHandlers` + module checkboxes + theme radio `change` |
| Audit cards | `data-a` actions bound in `renderAuditCards` after `innerHTML` |

### Fixed in PE-58 (P1)

| ID | Issue | Fix |
|----|-------|-----|
| **F-58-1** | `#chatSelectionOnly` (Coach) collected in CONFIG but **not** in autosave bind list — toggling did not persist until another control saved | Added `"chatSelectionOnly"` to `setupAutoSaveHandlers` |
| **F-58-2** | `#apiKey` not persisted on input when **Remember in this document** checked; only cleared on uncheck | `input` listener + `schedulePersistSettings` on remember **check** |

### Recommendation-only wiring (P2–P3)

| ID | Sev | Finding | Action |
|----|-----|---------|--------|
| F-58-3 | P2 | `#batchSectionCount` read at audit time but not in `collectUiConfig` | Persist or remove control |
| F-58-4 | P2 | Legacy hidden chapter `<select>`s still fed for migrated configs | Remove after migration window |
| F-58-5 | P3 | `#rewriteMode` not persisted | Optional CONFIG key |
| F-58-6 | P3 | 11 structural ids not string-referenced in `taskpane.js` (wrappers, ARIA, shaper/diagnostics delegation) | Intentional |

---

## Algorithms & modules

| Module | Role | Correctness / edge cases |
|--------|------|---------------------------|
| **scope-reader.js** | Text by selection, pages (~2800 char/page), chapters, full | Limits per mode; `migrateLegacyChapterScope`; empty chapter checklist blocked in `prepareScopeForAudit`. **Tests:** expand range, normalize indices, label format. |
| **audit-engine.js** + **editor-heuristics.js** | Local rule pipeline | Large surface; fiction/academic branches; extended local flag. **No unit tests** — manual audit validation. |
| **chronology-engine.js** | Fiction timeline scan | Merge/dedupe findings. **Tests:** analyze + merge. |
| **citation-engine.js** | APA-style heuristics, opt-in | Not footnote API (TODO v1.1 in source). **Tests:** eligibility + analyze. |
| **lexical-shaper.js** / **local-rewrite.js** | Rewrite tab | Shaper sliders clamped 1–5 (`UiPrefs.normalizeShaperFields`). Panel visibility via `#pe-shaper-panel`. |
| **local-coach.js** | Pattern-based coach | 0-token; Gemini optional separate path. |
| **long-operation-controller.js** + **long-operation-helpers.js** | Cancel + warning banner | `CancelledError`; session dismiss per action id. **Tests:** controller + warning prefs. |
| **continuity-guard.js** | Pre-apply warnings | Uses manuscript index; dismissals in local storage. |
| **onboarding-helpers.js** | Banner flags, what's new, dark tip | `shouldShowDarkAppearanceTip` respects session + CONFIG. **Tests:** flags, dark tip, session keys. |
| **diagnostics-reporter.js** | Opt-in redacted reports | No raw document fields in payload; clipboard fallback. **Tests:** redaction + payload shape. |
| **manuscript-overview.js** | Summary HTML, style guide label | Drives workflow strip **Guide:** segment (PE-57). |
| **gemini-client.js** | Optional API | Key only from UI field; never bundled server-side. |
| **report-density.js** / **report-docx-export.js** | Audit export | Density tied to Settings `reportDensity`. |

**Long-op / cancel:** `beginLongOperation` + Cancel buttons on Checks/Audit hubs; audit path checks `throwIfCancelled` during read.

---

## Security & trust

| Control | Status |
|---------|--------|
| **Confirm before Apply** | `#confirmBeforeApply` → `confirmBeforeApply()`; default **on** |
| **API keys** | User paste only; persisted in document JSON **only** if `rememberApiKey`; alert on enable |
| **No server secrets** | Diagnostics ingest URL empty in client; worker template separate repo path |
| **Redaction** | Emails, `AIza…`, `sk-…` stripped; sensitive keys blocked in diagnostic context |
| **Gemini** | HTTPS to Google; key in query string (Google API pattern) — user responsibility |

---

## Tests & CI

| Layer | Coverage |
|-------|----------|
| **Unit (`npm test`)** | **34** tests — scope, onboarding, UI prefs/theme/review-mode, long-op, diagnostics, chronology, citation, lexical banks, shaper CONFIG, word-safe navigator, **PE-58 autosave wiring** |
| **CI** | `version-sync.yml` on push/PR; diagnostics ingest deploy workflow (owner infra) |
| **Gaps** | No `audit-engine` / `Word.run` integration tests; no visual regression; no automated a11y audit |

---

## Findings table (prioritized)

| ID | Sev | Area | Finding | PE-58 |
|----|-----|------|---------|-------|
| — | — | — | **No P0** | — |
| F-58-1 | P1 | Wiring | `chatSelectionOnly` not autosaved | **Fixed** |
| F-58-2 | P1 | Wiring | API key not saved on input when remember on | **Fixed** |
| F-58-3 | P2 | Wiring | `batchSectionCount` not in CONFIG | Recommend |
| F-58-4 | P2 | Scope UI | Hidden legacy chapter selects | Recommend |
| F-58-5 | P3 | Rewrite | `rewriteMode` session-only | Recommend |
| F-58-6 | P3 | A11y | Settings initial focus on Back | Recommend |
| F-58-7 | P2 | Docs | [source-of-truth.md](./source-of-truth.md) cited 29 tests / PRs #2–#5 only | **Fixed** (pointer + counts) |
| F-58-8 | P2 | Rating doc | [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md) pre–PE-50–57 UX | Recommend refresh after Phase 1 |
| F-58-9 | P2 | CI | No Office.js tests | Recommend Phase 2 |
| F-58-10 | P2 | Algorithms | Citation footnote scan TODO | v1.1 |
| F-58-11 | P3 | Help | What's new banner still **2.0.0.15** copy | Bump with next manifest release |

---

## Recommendations (owner backlog)

### Phase 1 — Validation (P0)

- Complete [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) / [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) including **PE-57** dark banner, theme persistence, review-mode filter.
- Log in [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md).

### Phase 2 — Product polish (P1–P2)

- **Inter font** — [prozaedit-typography-and-fonts.md](./prozaedit-typography-and-fonts.md) / [prozaedit-design-system-beta.md](./prozaedit-design-system-beta.md): optional hosted Inter when egress/policy allows.
- **Diagnostics ingest** — [DIAGNOSTICS.md](./DIAGNOSTICS.md) + [DIAGNOSTICS-DEPLOY-RUNBOOK.md](./DIAGNOSTICS-DEPLOY-RUNBOOK.md); manifest AppDomain when deployed.
- Persist **batch section count** or simplify UI.
- Refresh **shipped rating** doc after validation data.

### Phase 3 — Algorithm & IA (P2+)

- Citation engine v1.1 (footnotes/endnotes).
- Zipf / shaper v2 per [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md).
- vNext tab merge — **explicitly out of scope** until owner approves ([prozaedit-approved-scope-vs-vnext.md](./prozaedit-approved-scope-vs-vnext.md)).

### Reference docs

| Doc | Use |
|-----|-----|
| [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) | Web 1.0 execution |
| [prozaedit-competitive-addin-ui-research.md](https://github.com/drcracius/prozaedit-word/blob/main/docs/prozaedit-competitive-addin-ui-research.md) | PE-56/57 rationale (store mirror) |
| [prozaedit-design-system-beta.md](./prozaedit-design-system-beta.md) | Semantic colors / dark |
| [pe-ui-enhancement-backlog.md](./pe-ui-enhancement-backlog.md) | UX backlog |
| [FINAL-AUDIT-PE-49.md](./FINAL-AUDIT-PE-49.md) | Prior RC audit |

---

## PE-58 code changes summary

- **P0 fixed:** 0  
- **P1 fixed:** 2 (`taskpane.js` CONFIG autosave)  
- **Tests added:** 2 (`tests/taskpane-config-autosave-wiring.test.mjs`)  
- **Docs:** this file, [source-of-truth.md](./source-of-truth.md) PE-58 pointer  

---

## Related internal evidence

Detailed HTML↔JS wiring audit (172 ids): Project store `internal/taskpane-html-js-wiring-audit.md` (subagent PE-58).
