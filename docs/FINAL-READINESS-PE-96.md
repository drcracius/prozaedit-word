# Final readiness report: build 2.0.0.26 (PE-96)

**Verdict: ready for a wider beta, not for a public launch.** The code is green (441 tests, wiring, contrast, version sync, `npm audit` clean) and the security holes found are fixed, but the single biggest risk, Apply with Track Changes in real Word, has still never been run outside a mock. Three more real-Word and real-key checks (below) are required before a public release.

## Risk register
| Risk | Severity | Status |
|---|---|---|
| Track Changes Apply untested in real Word (desktop, web, Mac) | High | Open, owner-only |
| DOM injection from manuscript text, forged settings, AI output | High | Fixed, tested, mutation-checked |
| No Content-Security-Policy | Medium | Open (cannot verify in Word's webview) |
| Real AI providers (4 keys, model ids, CORS) never exercised live | Medium | Open, owner-only |
| Rule precision measured only on written passages, not a real manuscript | Medium | Open; 489 labelled passages across 3 corpora at precision >= 0.95 |
| Non-fiction long-sentence/passive checks described but not applied | Low | Open |
| Diagnostics worker has open CORS and no rate limit | Low | Not deployed; body sanitised |
| GitHub Actions not SHA-pinned | Low | Permissions reduced to read-only |
| CSS read only by scan; 320 px and dark look unconfirmed | Low | Open, owner-only |
| Screen-reader behaviour only checked by DOM tests | Low | Open, owner-only |

## What only the owner can validate
1. Track Changes ON, Apply, accept/reject in the Review tab (desktop, web, Mac).
2. One real key per provider (Gemini, OpenAI, Claude, OpenRouter).
3. A real 80,000-word manuscript: audit, chapter-by-chapter walk, noise level in Simple view.
4. 320 px pane, light and dark; keyboard-only and screen reader pass.
5. Three non-technical testers on the first-run and Simple path.
6. Whether to ship a CSP and to deploy the diagnostics worker.

## Ranked next recommendations
1. Run the owner checklist items 1-2 for 2.0.0.26 (Track Changes, real keys). Everything else is secondary.
2. Run the audit on one real manuscript and send the false positives: the next rule tuning should come from real prose.
3. Add a CSP meta tag once it has been tried in desktop Word, web and Mac.
4. Wire the non-fiction long-sentence and passive checks or remove them from the genre descriptions.
5. Add a single combined test for AI provider x cache x cancel at pane level.
6. SHA-pin Actions and add an allow-list plus rate limit before deploying the worker.
7. Read `taskpane.css` line by line and test it at 320 px in a real browser.
8. Decide whether Advanced rules with measured noise (`rep:pair`, `ext:*`) should stay.


Handoff and context: [HANDOFF-DESKTOP.md](./HANDOFF-DESKTOP.md). Owner checks: [OWNER-CHECKLIST-2.0.0.26.md](./OWNER-CHECKLIST-2.0.0.26.md).
