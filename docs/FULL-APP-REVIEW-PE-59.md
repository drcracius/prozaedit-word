# PE-59 — Full application review (re-run on PE-58 `main`)

**Date:** 2026-11-01  
**Baseline:** GitHub `main` through **PE-58** merge ([PR #14](https://github.com/drcracius/prozaedit-word/pull/14), merge `b8a7127`)  
**Prior review:** [FULL-APP-REVIEW-PE-58.md](./FULL-APP-REVIEW-PE-58.md)  
**Hosted build:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`)  
**Automated gates:** `npm test` **36** pass · `scripts/verify-version-sync.sh` aligned  

---

## Executive summary

| Metric | PE-59 | PE-58 (reference) |
|--------|------:|------------------:|
| **Shipped product score** | **~8.6 / 10** | ~8.6 |
| **vNext alignment** | **~4.2 / 10** | ~4.2 |
| **P0 defects found (this pass)** | **0** | 0 |
| **P1 fixed (this pass)** | **0** (none new) | 2 |
| **P2 polish fixed (PE-59)** | **3** (F-58-3, F-58-5, truncation status) | — |
| **Unit tests** | **36** | 34 |

### Delta vs PE-58 (what changed on `main` before this PR)

| Category | Change |
|----------|--------|
| **Merged** | PE-58 CONFIG autosave (`chatSelectionOnly`, `apiKey` input), review doc, source-of-truth sync |
| **Re-validated** | 181 HTML `id`s, 0 orphan `getEl`, 86 inline `onclick` handlers — all resolve |
| **Fixed in PE-59** | `batchSectionCount` + `rewriteMode` CONFIG round-trip; truncation one-line status hint |
| **Unchanged risks** | Word API variance, orchestrator size (~4.18k lines), scope caps, fiction gating, optional Gemini keys |
| **Still open** | F-58-4 legacy chapter selects, F-58-6 settings focus, F-58-9 Office.js CI, F-58-10 citation footnotes, F-58-11 what's-new copy until manifest bump |

### Top 5 risks (unchanged from PE-58; re-confirmed)

1. **Word API / WebView variance** — no Office.js in CI; owner checklist remains P0 validation.
2. **Orchestrator size** — `taskpane.js` ~4,183 lines; targeted wiring tests supplement manual Word passes.
3. **Truncation / caps** — `ScopeReader.LIMITS` + `sys_trunc` card; **PE-59 adds status-bar hint** when cap hit.
4. **Fiction vs non-fiction gating** — timeline/citation/plot toggles still require profile literacy.
5. **Gemini optional path** — document-scoped key when “Remember” is on; confirm dialogs + user responsibility.

### Top 5 strengths (unchanged; re-confirmed)

1. **Local-first core** — audit, coach, paraphrase, shaper at 0 tokens by default.
2. **Safety stack** — confirm-before-apply, continuity guard, `WordSafeNavigator`, scope caps.
3. **Modular engines** — 32 `lib/*.js` modules; chronology/citation, export, diagnostics redaction.
4. **UX pack + PE-57** — themes, dark-appearance banner, workflow strip, review-mode audit UX, card trust row.
5. **CI version discipline** — manifest ↔ UI build on every push/PR; expanded CONFIG wiring tests (PE-58 → PE-59).

---

## UI/UX — seven tabs

Same structure as PE-58 (Target, Thesaurus, Checks, Audit, Coach, Rewrite, Help). Settings eight groups, keyboard shortcuts, theme tri-state, five onboarding banners, narrow pane at `<360px`, workflow strip, sticky toolbar.

**PE-59 note:** No tab IA or manifest changes (per scope). Appearance and audit hints behave as documented in PE-58 and [RELEASE-NOTES-PE-57.md](./RELEASE-NOTES-PE-57.md).

---

## Wiring — HTML ↔ JS ↔ CONFIG

| Check | PE-59 result |
|-------|----------------|
| Static `id=` in `taskpane.html` | **181** |
| Orphan `getEl("…")` targets | **0** |
| Broken inline `onclick` | **0** / 86 handlers |
| `collectUiConfig` / `applyUiConfig` | Round-trip for all user-facing toggles + modules + shaper + theme |

### Fixed in PE-58 (regression check: **still fixed**)

| ID | Issue | PE-59 status |
|----|-------|--------------|
| F-58-1 | `chatSelectionOnly` autosave | **OK** — in autosave bind list |
| F-58-2 | `apiKey` input persist when remember on | **OK** — `input` + remember `change` |

### Fixed in PE-59 (PE-58 backlog)

| ID | Sev | Issue | Fix |
|----|-----|-------|-----|
| **F-58-3** | P2 | `#batchSectionCount` not in CONFIG | Added to `collectUiConfig`, `applyUiConfig`, autosave |
| **F-58-5** | P3 | `#rewriteMode` session-only | Same CONFIG + autosave path; values clamped to shipped modes |
| **F-59-1** | P2 | Truncation only visible as audit card | `finalizeAudit` → `showPeStatus` one-line warn when `sys_trunc` present |

### Open wiring / UX (unchanged)

| ID | Sev | Finding |
|----|-----|---------|
| F-58-4 | P2 | Hidden legacy chapter `<select>`s for migrated configs |
| F-58-6 | P3 | Settings dialog initial focus on Back button |
| F-58-6b | P3 | 20 structural ids referenced only via CSS/delegation (intentional) |

---

## Algorithms & modules

Re-reviewed: `scope-reader`, `audit-engine` + `editor-heuristics`, `chronology-engine`, `citation-engine`, `lexical-shaper`, `local-rewrite`, `local-coach`, long-op controller, `continuity-guard`, onboarding, diagnostics, manuscript overview, Gemini client, report export.

**No algorithm regressions** identified in static review. Citation footnote API remains v1.1 TODO (F-58-10).

---

## Security & trust

Re-confirmed: confirm-before-apply default on; API keys user-supplied only; diagnostics opt-in with redaction; empty ingest URL by default; Gemini over HTTPS with user key.

**New P0/P1 security issues:** none.

---

## Tests & CI

| Layer | PE-59 |
|-------|-------|
| **Unit** | **36** tests (+2 PE-59 CONFIG/truncation wiring assertions) |
| **CI** | `version-sync.yml`; diagnostics deploy workflow (owner) |
| **Gaps** | Same as PE-58 — no Office.js, no visual/a11y automation |

---

## Findings table (prioritized)

| ID | Sev | Area | Finding | Status |
|----|-----|------|---------|--------|
| — | — | — | **No P0** | — |
| F-58-1 | P1 | Wiring | `chatSelectionOnly` autosave | Fixed PE-58 · **verified PE-59** |
| F-58-2 | P1 | Wiring | API key input persist | Fixed PE-58 · **verified PE-59** |
| F-58-3 | P2 | Wiring | `batchSectionCount` CONFIG | **Fixed PE-59** |
| F-58-4 | P2 | Scope UI | Legacy chapter selects | Open |
| F-58-5 | P3 | Rewrite | `rewriteMode` persist | **Fixed PE-59** |
| F-59-1 | P2 | UX | Truncation status hint | **Fixed PE-59** |
| F-58-6 | P3 | A11y | Settings initial focus | Open |
| F-58-8 | P2 | Docs | Stale rating doc | **Fixed PE-59** ([prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md)) |
| F-58-9 | P2 | CI | No Office.js tests | Open |
| F-58-10 | P2 | Algorithms | Citation footnotes | v1.1 |
| F-58-11 | P3 | Help | What's new **2.0.0.15** until next release | Open |

---

## PE-59 code changes summary

- **P0 fixed:** 0  
- **P1 fixed:** 0 (no new P1; PE-58 fixes not regressed)  
- **P2/P3 polish:** 3 items (batch sections, rewrite mode, truncation status)  
- **Tests added:** 2 subtests in `tests/taskpane-config-autosave-wiring.test.mjs`  
- **Docs:** this file; rating refresh; source-of-truth PE-59 pointer  

---

## Recommendations (owner backlog)

Same phased plan as PE-58 — prioritize [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) / [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) including theme + review-mode paths validated in PE-57/58.
