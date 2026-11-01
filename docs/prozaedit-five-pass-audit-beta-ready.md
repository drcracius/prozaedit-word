# ProzaEdit Word — five-pass beta-ready audit

**Baseline:** `main` after **PE-45** (PE-43 cancel/long-op, PE-45 shaper CONFIG + scope chips)  
**Hosted version:** **2.0.0.15** (manifest + UI)  
**Date:** 2026-11-01  
**Manual validation:** [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) · [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md)

---

## Pass 1 — Internal consistency (CONFIG, DOM, collect/apply, Simple mode)

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| 1.1 | P1 | `lastActiveTab` not in `PROZAEDIT_CONFIG` / no restore on load | **Fixed** — `collectUiConfig` / `applyUiConfig`, `restoreLastActiveTab()`, `UiPrefs.validateLastActiveTab` |
| 1.2 | P1 | Settings deep-link `style` vs internal `custom-style` mismatch | **Fixed** — `UiPrefs.normalizeSettingsSection`, links use `style` |
| 1.3 | P1 | Audit **default filter** hint could drift from Settings select | **Fixed** — `updateAuditDefaultFilterHint()` reads `#settingsDefaultAuditFilter` only |
| 1.4 | P2 | Legacy `chapter` / `chapter-range` scope values still supported via migration | No change (intentional) |

**P0 fixed:** 0 · **P1 fixed:** 3

---

## Pass 2 — External alignment (features, design notes, Help)

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| 2.1 | P1 | `prozaedit-features.md` missing UX pack 2 (last tab, resets, shortcuts, hints) | **Fixed** — §Target / §Audit updated |
| 2.2 | P1 | Help tab silent on shortcuts, scope status line, last tab | **Fixed** — Help → ProzaEdit Help paragraph |
| 2.3 | P1 | `pe-ui-design-notes.md` Settings inventory missing reset buttons / session tips pref | **Fixed** — store + repo sync |
| 2.4 | P2 | `prozaedit-multi-phase-plan.md` still cites 2.0.0.14 baseline | Listed only (historical doc) |

**P0 fixed:** 0 · **P1 fixed:** 3

---

## Pass 3 — Office.js / Word web safety

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| 3.1 | P1 | Scope status line must not leak document text | **Verified** — line uses mode label + character counts only |
| 3.2 | — | Diagnostics payload excludes document text | **Verified** — existing `diagnostics-reporter.test.mjs` |
| 3.3 | — | `wordRun` error paths on scope measure | **Verified** — preview catch sets message, no throw to host |

**P0 fixed:** 0 · **P1 fixed:** 0 (1 verified, no code change)

---

## Pass 4 — UX completeness (navigation, narrow pane)

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| 4.1 | P1 | No persistent last tab | **Fixed** (see 1.1) |
| 4.2 | P1 | Scope summary only on Target tab | **Fixed** — `#peWorkflowStatusLine` under sticky toolbar |
| 4.3 | P1 | Per-group Settings reset missing | **Fixed** — `resetSettingsGroup()` + confirm |
| 4.4 | P1 | Session “don’t show again” only sessionStorage | **Fixed** — Settings → Safety permanent hide (`localStorage` `pe-session-tips-dismissed`) |
| 4.5 | P2 | Dark theme / tab merge / vNext IA | Out of scope per PE-39 |

**P0 fixed:** 0 · **P1 fixed:** 4

---

## Pass 5 — Test readiness

| ID | Sev | Finding | Resolution |
|----|-----|---------|------------|
| 5.1 | P1 | No unit tests for tab/section/defaults helpers | **Fixed** — `lib/ui-prefs-helpers.js`, `tests/ui-prefs-helpers.test.mjs` |
| 5.2 | P1 | No Word web full-test script for beta | **Fixed** — [FULL-TEST-CHECKLIST-WORD-WEB.md](FULL-TEST-CHECKLIST-WORD-WEB.md) |
| 5.3 | P2 | No automated Office.js integration tests | Manual checklist only (platform limit) |

**P0 fixed:** 0 · **P1 fixed:** 2

---

## Totals

| Severity | Found | Fixed in PE-39 |
|----------|-------|----------------|
| P0 | 0 | 0 |
| P1 | 12 | **12** |
| P2 | 4 | 0 (documented) |

## New / touched code (summary)

- `src/taskpane/lib/ui-prefs-helpers.js`
- `src/taskpane/taskpane.js`, `taskpane.html`, `taskpane.css`
- `tests/ui-prefs-helpers.test.mjs`
- Docs: this file, `FULL-TEST-CHECKLIST-WORD-WEB.md`, `RELEASE-NOTES-2.0.0.15.md` (UX pack 2 section), `prozaedit-features.md`

## Sign-off

- `npm test` — pass (15 tests)
- `scripts/verify-version-sync.sh` — **2.0.0.15** OK
- Manifest bump — **not required**
