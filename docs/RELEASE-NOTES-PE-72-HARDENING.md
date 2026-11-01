# PE-72 — Phased hardening (Phase 0, 2b, 3)

**Build:** 2.0.0.15 (no manifest or version bump). **Tests:** 60 → **120**. **Plan:** [prozaedit-complaint-audit-multi-phase-plan](./WRITING-ADDIN-COMPLAINT-AUDIT-PE-69.md) (Phases 1, 2 beta, 4 and 5 are owner or vNext and were not implemented).

## What shipped

| Phase | PR | Content |
|-------|----|---------|
| 0 | [#19](https://github.com/drcracius/prozaedit-word/pull/19), [#20](https://github.com/drcracius/prozaedit-word/pull/20) | PE-69 complaint hardening and PE-71 three-pass audit docs merged; `npm test` 60/60 on `main` after each. |
| 2b + sweep | [#21](https://github.com/drcracius/prozaedit-word/pull/21) | Cancel/abort, retry, recovery copy, accessibility, timing flag, edge-case sweep. |
| 3 | Phase 3 CI PR | Wiring gate, startup/read-only smoke tests, docs. |

## Phase 2b — behavior

1. **Cancel always reachable.** A global bar under the toolbar (`#peOpBar`) shows **Cancel** (`aria-label="Cancel current operation"`) whenever any long operation runs, on every tab. `aria-busy` is set while busy, focus moves to Cancel and returns afterward, `Esc` cancels when no modal is open and focus is not in an input. Covers audit, scans (chronology, citations, heatmap), batch/section loop, deep read, chat, rewrite, deep audit.
2. **Gemini in-flight abort.** `LongOperationController.abortSignal` feeds `Gemini.generate(key, text, cfg, {signal, timeoutMs})` for Coach, Rewrite and Deep audit. User cancel aborts the request (including the body read); timeout still reports "Gemini request timed out."; pre-aborted signals never call `fetch`; listeners are removed in `finally`; no unhandled rejections.
3. **Try again.** One pending action (Audit, Apply, Gemini chat, Gemini rewrite, Deep audit) with the last inputs. It is consumed on click, so a double-click runs it once, and is re-registered if it fails again.
4. **Apply / Go to errors.** `AuditReview.classifyError` / `recoveryMessage` give structured copy (cancelled, timeout, network, auth, quota, item missing, API unsupported, blocked/read-only, scope, unknown); keys are redacted; Word failures never mention Gemini. All `alert()` calls except the one API-key privacy notice became status lines.
5. **No double apply.** Apply failures are tagged `before-edit` (retryable) or `uncertain` (never offered as retry; copy says the change "may or may not have been made"). Edit, undo and redo share one lock; card Mute/Dismiss use a keyed lock.
6. **Accessibility.** Distinct accessible names per card action, tablist roles with arrow/Home/End keys, assertive live region for warnings (warnings stay 20 s), `Esc` for Settings and tour, `prefers-reduced-motion` and `forced-colors` CSS, long words/URLs wrap.
7. **Timing.** Phase timings (read / analyze / render / gemini) appear in the status line only with `?pe-dev=1`, `#pe-dev=1` or `localStorage pe-dev=1`.

## Edge-case / freeze / crash sweep

Fixed, with regression tests where logic is testable (`tests/taskpane-behavior.test.mjs`, `tests/recovery-hardening.test.mjs`, `tests/abort-wiring.test.mjs`):

- **Busy state:** every `Word.run` path resets flags in `finally`; run-while-running, rapid repeated clicks, cancel-then-immediate-rerun, tab switch during an operation, "Not now" on the long-operation warning. Every long-op flag is covered by one `isOperationBusy` guard.
- **Documents:** empty selection, whitespace-only selection, empty document (guidance instead of a crash); declined confirm; missing Go to target.
- **Office.js failures:** `context.sync` rejection, `InvalidObjectPath`, `ItemNotFound`, unsupported API, timeouts map to recovery copy; swallowed catches now report.
- **Global handling:** `error` / `unhandledrejection` guard shows a recovery banner (rate-limited; cancellations and ResizeObserver noise ignored; redaction intact); `Office` undefined and a 20 s boot timeout show a message instead of a white screen.
- **CONFIG:** corrupt, oversized (> 400 000 chars), non-object and partially invalid `PROZAEDIT_CONFIG` fall back to defaults (`ConfigGuard`); save failures never reject (`SettingsStore.setAsync` resolves false) and warn once.
- **Environment:** throwing `localStorage` / `sessionStorage`, missing `matchMedia`, missing `AbortController` (shim).
- **Memory / size:** card list capped at 300 with a visible note; chat log trimmed; manuscript index build debounced and skipped while busy; global muted/dismissed lists keep the newest 800 entries; null or malformed card items no longer crash rendering and hostile text is escaped.
- **Pathological input:** audit engines on 450 000-character single lines, repeated punctuation, unbalanced quotes and RTL text finished in roughly 40–180 ms in testing (linear, no catastrophic backtracking found); a test enforces a generous bound.
- **UI:** narrow pane and very long words/URLs wrap (`overflow-wrap:anywhere`).

## Phase 3 — CI

- `scripts/verify-wiring.mjs` (workflow step and `npm run verify:wiring`): fails on duplicate HTML ids, `getEl`/`getElementById` literals with no matching id, undefined inline `on*=""` handlers, and missing local script/CSS files. Covered by `tests/wiring-gate.test.mjs` (including negative cases).
- `tests/startup-smoke.test.mjs` and `tests/taskpane-behavior.test.mjs` boot the real `taskpane.html` and scripts in jsdom with a mocked Office/Word host and assert: init completes with no uncaught errors, every tab and Settings open, local audit and Local Coach are read-only (no `insertText`, no selection change), a rejecting `Word.run` leaves the pane usable.
- CI runs `npm ci` (jsdom dev dependency, lockfile added) before the gate and tests.

**Honest limit:** a real Word host cannot run in CI. The harness proves wiring and state machines, not Word API behavior, Word-on-the-web quirks, permissions, pane width, or performance on real documents.

## Not fixed (and why)

| Item | Why |
|------|-----|
| `confirm()` / `alert()` may be blocked in sandboxed Office iframes; confirm-before-apply relies on `confirm` | Replacing it needs an in-pane confirmation dialog (new UI + tests); the safe default today is to refuse, not apply. Owner should check on target tenants. |
| A single in-flight Word `context.sync` cannot be interrupted | Office.js has no abort; cancel takes effect at the next step boundary. Documented in UI copy. |
| Full-document `body.text` load for the manuscript index | Needed by continuity checks; now debounced and skipped during other operations, but a very large document still pays the read once. Chunked reading is a vNext change. |
| Real Word web / desktop behavior, tables, footnotes, content controls, track changes, protected documents | Not reproducible without a real host. Failures map to recovery copy (`office-blocked`, `office-missing`, `office-unsupported`); needs owner validation. |
| API key stored in the document ("Remember key") | Product/architecture decision (secure store), tracked as owner/vNext. |

## Residual risks

- **Microsoft host:** Word API variance across builds and Word on the web; add-in disabled by host updates.
- **Owner validation:** the PE-72 rows in [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) plus PE-47.
- **vNext:** secure credential store, in-pane confirmations, chunked manuscript index, real-host CI.

## What remains for the owner

1. **Phase 1:** manual validation in Word on the web (and desktop if available) using the checklist, including the new cancel / retry / long-document rows; log results.
2. **Phase 2 beta:** short beta with real authors on 50k+ word manuscripts, collecting the UX-4 prompts.
3. **Phase 4 policy:** privacy policy (Gemini and Datamuse), support/refund language, licensing, whether to keep "Remember key".
