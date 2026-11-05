# ProzaEdit Word: handoff to Desktop Cursor (build 2.0.0.27)

Read this first. It is written for a fresh agent with no chat history. Handoff tag: `pe-81-m22-handoff`.

## 1. Conventions (owner preferences)

- Owner cannot code and wants to save tokens: **keep chat replies brief**; depth of research and code is unchanged.
- **Word only.** No Google Docs, no other hosts.
- **Source-of-truth rule:** "best result from the right AI at lowest cost, offline by default." Local rules first; AI only when the user clicks and confirms, cheapest adequate model by default.
- Audit before you ship: reproduce, minimal diffs, keep manifest and UI version in sync (`docs/source-of-truth.md`).
- Never claim a Word behaviour is verified unless the owner ran it in real Word. Apply/Track Changes is mock-verified only.
- Open or update PRs only via the normal workflow; do not force-push `main`.

## 2. Purpose

Task-pane add-in for Microsoft Word (Office.js) that gives writers a local-first editorial audit, Coach, and Rewrite, genre-aware (12 profiles), with optional AI help using the user's own API key (Gemini, OpenAI, Claude, OpenRouter). Hosted on GitHub Pages (`https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html`); registered in Word by uploading `manifest.hosted.xml`. No build step, no backend.

## 3. Current state (2.0.0.47)

- Verdict (PE-96): ready for a wider beta, not a public launch. Automated tests are green (`npm test`, wiring, contrast).
- Welcome tips live under **Help**. **Run report** uses a progress ring and names each check. The old “Continue” banner is off unless Settings → Onboarding asks before long scans.
- Plain-language checks include a short hidden-verb list (make a decision → decide). The report summary lists findings **By check**. See [CHECKS-REPORT-PLAN.md](./CHECKS-REPORT-PLAN.md).
- Biggest unknown: **Apply with Track Changes in real Word** (desktop, web, Mac) has only run against a mock.
- Also never exercised live: the 4 AI providers (keys, model ids, CORS). Model catalogue last reviewed 2026-11-01.
- Rule precision measured on 489 labelled passages across 3 corpora (author-written, not a real manuscript), precision >= 0.95.
- Work since PE-79: genre registry, multi-provider AI, anchored safe Apply/Undo, resume + cache, chapter-by-chapter audit (2.0.0.24), tracked-change Apply and incremental index (2.0.0.25), XSS/leak/security fixes and rule precision (2.0.0.26). Per-build detail: [RELEASE-NOTES-PE-81.md](./RELEASE-NOTES-PE-81.md).

## 4. Architecture map

Everything runs in the browser. Plain script tags, no bundler; modules attach to `window.ProzaEdit` (UMD-style IIFEs) and tests load them through `tests/load-lib.mjs`.

- `src/taskpane/taskpane.html` / `taskpane.css` / `taskpane.js`: UI shell, tabs (Target, Audit, Checks, Coach, Rewrite, Settings, Help), orchestration, `PROZAEDIT_BUILD_VERSION`.
- `src/taskpane/lib/`
  - Engine: `audit-engine.js` (rules), `editor-heuristics.js`, `text-metrics.js`, `lexical-banks.js`, `style-guide-rules.js`, `custom-style-guide.js`, `genre-profiles.js` (registry), `genre-checks.js` (tense/POV, content notes), `citation-engine.js`, `chronology-engine.js`, `proper-noun-analyse.js`, `continuity-guard.js`.
  - Manuscript: `manuscript-context-index.js` (local heuristic outline, not AI), `manuscript-overview.js`, `chapter-walk.js` (one chapter at a time), `chapter-heatmap.js`, `scope-reader.js` (batched Word reads), `long-operation-*.js`.
  - Apply: `edit-apply.js` (anchored, exact-match, verify-after, tracked-change aware), `edit-history.js` (anchored undo/redo), `word-safe-navigator.js` (Go to).
  - Local writing: `local-coach.js`, `local-rewrite.js`, `lexical-shaper.js`.
  - AI: `ai-providers.js`, `gemini-client.js`, `ai-safety.js`, `ai-quota-manager.js`, `ai-cache.js`, `ai-key-store.js`.
  - Safety/infra: `html-safe.js`, `error-guard.js`, `config-guard.js`, `settings-store.js`, `recovery-helpers.js`, `diagnostics-*.js`.
  - UI helpers: `pe-confirm-dialog.js`, `tooltip-registry.js`, `onboarding-helpers.js`, `plain-language-helpers.js`, `ui-prefs-helpers.js`, `audit-review-helpers.js`, `pe-icons.js`.
- `tests/`: `node --test`, jsdom for pane tests; corpora in `tests/corpus/`. Names: `pe-NN-*.test.mjs` per audit round.
- `scripts/`: `verify-wiring.mjs` (every HTML id/script/function referenced exists), `check-contrast.mjs` (WCAG), `verify-version-sync.sh`, `install/` (Word Desktop installers: Shared Folder via UNC share, or no-admin Developer sideload; see DESKTOP-INSTALL.md).
- `tools/diagnostics-ingest/`: optional Cloudflare worker, **not deployed** (open CORS, no rate limit).
- `manifest.hosted.xml` (production) and `manifest.xml` (local sideload; must carry the same version).
- `.github/workflows/`: `tests.yml` (npm ci, test, wiring, version sync), `version-sync.yml`, `deploy-diagnostics-ingest.yml`.

## 5. Setup, tests, verifiers

Node >= 20 (CI uses 22). From repo root:

```bash
npm ci
npm test                          # 456 tests expected, 0 fail
npm run verify:wiring             # expect "OK: wiring check passed"
npm run check:contrast            # expect "failures 0"
bash scripts/verify-version-sync.sh
```

Version-sync also requires `docs/WHEN-YOU-RETURN.md` to contain the exact phrase `currently **<version>**`.

## 6. Release and versioning

1. Bump `<Version>` in `manifest.hosted.xml` **and** `manifest.xml`, and `PROZAEDIT_BUILD_VERSION` in `taskpane.js`; update the hard-coded 2.0.0.x mentions (README, `docs/WHEN-YOU-RETURN.md`, `docs/source-of-truth.md`, `docs/QUICK-START.md`, `docs/PRIVACY-AND-DATA-PE.md`, `onboarding-helpers.js`, `tests/pe-84-pane.test.mjs`) and add a section to `RELEASE-NOTES-PE-81.md`.
2. Run the verifiers above.
3. Merge to `main`; GitHub Pages serves the pane (allow ~2 minutes; hard refresh Ctrl+F5 in Word web).
4. **Manifest re-upload** (Word -> Insert -> Add-ins -> My Add-ins -> Upload My Add-in -> `manifest.hosted.xml`, use office.com if desktop has no Upload): needed only if Help -> About "Manifest version" is older than the build. Version-only bumps do not change structure, so usually just reopen the pane. The 2.0.0.20 bump (WordApi 1.3) required one re-upload. `AppDomains` have not changed; add provider domains only if one is blocked in real Word.
5. Annotated tag per milestone.

## 7. Branches, PRs, tags

- `main` (tag `v2.0.0.26`): contains PE-79 ([#27](https://github.com/drcracius/prozaedit-word/pull/27), merge commit `c27332c`) and PE-81 through build 2.0.0.26 ([#28](https://github.com/drcracius/prozaedit-word/pull/28), merge commit `d5ff7fa`). Both PRs merged with merge commits, so commit ids and `pe-81-*` tags are unchanged (no re-tagging needed).
- Feature branches `cursor/pe-79-word-fixes-36ae` and `cursor/pe-81-genres-multi-ai-f10e` are merged; they are kept for reference (tags preserved).
- Pages serves build 2.0.0.27 from `main` (verify after the PE-99 merge).
- PE-79 base commit `d72692c`.
- Restore tags (annotated, each had a green suite; `git checkout <tag>`; roll back = `git reset --hard <tag>` + force-push, or revert the PR; because the pane loads from Pages, rollback means deploying the older code):

| Tag | Meaning |
|---|---|
| `pe-81-m1-core-impl` | Genre registry, provider abstraction, budgets, safe apply, confidence |
| `pe-81-m2-tests` | New test suites |
| `pe-81-m3-docs-privacy` | Docs and privacy copy aligned |
| `pe-81-m5-final` | Self-audit, 198 tests |
| `pe-81-m6-resume` | Manuscript read resume |
| `pe-81-m7-anchors` | Anchored Apply |
| `pe-81-m8-cache` | Saved AI replies |
| `pe-81-m9-corpus` | Precision/recall corpus gate, perf budgets, CI |
| `pe-81-m10-genre-checks` | Tense/POV drift, content notes, 241 tests |
| `pe-81-m11-final` | PE-83 final, 242 tests |
| `pe-81-m12-audit` | PE-84 independent audit, 270 tests |
| `pe-81-m13-audit2` (`-a`, `-b`) | PE-85/86 audit 2: anchored undo, quota, 286 tests |
| `pe-81-m14-audit3` | PE-87 audit 3 |
| `pe-81-m15-slice-a/b/c` | PE-88/89/90 audit slices (deadlocks, consent, chunked reads, 165-passage corpus, ReDoS cap) |
| `pe-81-m16-resolve` | PE-91 resolve findings (2.0.0.22) |
| `pe-81-m17-reaudit` | PE-92 re-audit |
| `pe-81-m18-audit5` | PE-93 audit 5 (2.0.0.23), 368 tests |
| `pe-81-m19-audit6` | PE-94 chapter-by-chapter flow, plain-word renames (2.0.0.24), 380 tests |
| `pe-81-m20-audit7` | PE-95 (2.0.0.25) tracked-change Apply, a11y, error copy |
| `pe-81-m21-audit8` | PE-96 (2.0.0.26) security, precision, 441 tests |
| `pe-81-m22-handoff` | This handoff (docs only) |

(There is no m4.)

## 8. Privacy model

Full text: [PRIVACY-AND-DATA-PE.md](./PRIVACY-AND-DATA-PE.md). Essentials:
- Offline by default. Audit, Coach, Rewrite, timeline, citation and the manuscript index never leave the device.
- Network only on click: the chosen AI provider (after a confirm dialog with token estimate), Datamuse (one word, Thesaurus), a once-per-session update check to `raw.githubusercontent.com` (10 s timeout), browser speech service for the Coach microphone.
- API keys live on the device (localStorage) only if "Remember" is on, never in the document; old document-stored keys migrate out. Session and daily token caps hold even if storage fails. Saved AI replies: local cache, 7 days, no keys.
- Manuscript text is sent to AI wrapped as untrusted data; AI findings are schema-validated and dropped unless they quote the text; nothing auto-applies. All dynamic HTML goes through `html-safe.js`.
- Diagnostics reporting is opt-in off; no ProzaEdit backend exists.

## 9. AI provider layer

`ai-providers.js` holds a model catalogue block at the top (edit only there when vendors change ids) and one generic `complete()` handling timeout, cancel, retry-once on rate limit, error mapping and key redaction. Defaults are the cheapest adequate models (Gemini 3.8 Flash default; Claude Haiku 5.5; OpenAI and OpenRouter entries). Custom model id field is the escape hatch for drifted ids. Anthropic needs the direct-browser-access header. Consumer subscriptions (ChatGPT Plus, Claude Pro, Gemini Advanced, Copilot) have no API access. `ai-quota-manager.js` enforces limits, `ai-cache.js` the cache, `ai-key-store.js` key storage. Microsoft Copilot/Azure OpenAI are deferred ("Copy for Copilot" is the manual path).

## 10. Genre registry

`genre-profiles.js` is the single source of genre thresholds. 12 profiles: general-fiction, romance, mystery-crime, thriller-suspense, fantasy, scifi, literary-drama, historical, nonfiction-memoir, academic, business, technical-journalism; plus jargon sets (none, legal, medical, science, military). Selected via `#manuscriptType`; legacy saved values map to a profile. Thriller and general fiction reproduce pre-PE-81 numbers. The numbers are editorial judgment, not published standards (see provenance note in the file); treat them as tunable defaults. Details: [GENRE-PROFILES.md](./GENRE-PROFILES.md). Non-fiction long-sentence (`nf:long`) and passive-voice (`nf:passive_cluster`) cards are wired (PE-99): preference severity, thresholds from the profile, Simple view shows only clear outliers (1.5x the limit); corpus gate in `tests/pe-99-nonfiction-clarity.test.mjs`.

## 11. Known gaps and open items (ranked)

1. Track Changes Apply untested in real Word (desktop, web, Mac). High, owner-only.
1b. **Word Desktop install (fixed in source after 2.0.0.27, unverified).** Shared Folder needs a UNC share, not `file:///`, and a manifest resource id was 33 chars (limit 32). See [DESKTOP-INSTALL.md](./DESKTOP-INSTALL.md); owner runs `Fix-ProzaEdit-SharedFolder.bat` or `Sideload-ProzaEdit-Desktop.bat` and reports. Microsoft Store/AppSource listing remains deferred (D14).
2. Real AI providers never run live (keys, model ids, CORS). Medium, owner-only.
3. Rule precision only on author-written passages; tune from a real manuscript's false positives.
4. No Content-Security-Policy (needs a trial in desktop Word, web, Mac first).
5. Done in PE-99: non-fiction long-sentence/passive checks wired; pane-level AI provider x cache x cancel test (`tests/pe-99-ai-cancel-cache.test.mjs`).
7. Diagnostics worker: not deployed; needs allow-list and rate limit first. GitHub Actions not SHA-pinned (read-only permissions).
8. `taskpane.css` reviewed by scan only; 320 px and dark look unconfirmed.
9. Screen-reader behaviour checked only by DOM tests.
10. Decide whether noisy Advanced rules (`rep:pair`, `ext:*`) stay.
11. Later/optional: live model-list refresh, localised pleonasm/jargon lists, per-chapter incremental index storage format. Not recommended yet: more genres or providers, auto-apply, storing text outside the document.
Known by-design refusals: Apply refuses duplicate text, changed paragraphs, passages over 255 characters or containing `^`, and spacing-only cards (use Find & Replace).

## 12. Owner-only validation (cannot be done by an agent)

1. Track Changes ON: Apply, accept/reject in Review (Word desktop, web, Mac); also "Only me" and OFF.
2. One real key per provider (Gemini, OpenAI, Claude, OpenRouter); report working model ids and any CORS failure.
3. A real 80,000-word manuscript: audit, chapter-by-chapter walk, noise in Simple view; send false positives.
4. 320 px pane, light and dark; keyboard-only and screen reader pass.
5. Three non-technical testers on first run and Simple path.
6. Decide on CSP and diagnostics worker.
Step-by-step lists per build: [OWNER-CHECKLIST-2.0.0.26.md](./OWNER-CHECKLIST-2.0.0.26.md).

## 13. Decisions pending (D1-D15, from the PE-80 roadmap)

None has been answered; defaults apply.

| ID | Decision | Default |
|---|---|---|
| D1 | Hosting target for versioned releases/flags | GitHub Pages, versioned folders |
| D2 | Who runs real-host passes (web, Windows, Mac) | Owner on Word web only; desktop "unverified" |
| D3 | AI summarisation/canon opt-in only, Gemini only | Opt-in, BYO key (now 4 providers) |
| D4 | Cost/size caps for AI runs | Show estimate, confirm above 50 chapters |
| D5 | Mac a v1 target? | Web + Windows required, Mac best-effort |
| D6 | Corpus labelling policy and Simple precision target (0.85) | Agent drafts, owner reviews ~100 labels |
| D7 | Apply refusal vs "nearest match" | Refuse only |
| D8 | Suggestion vocabulary and Simple suppression | As proposed (low confidence hidden in Simple) |
| D9 | Simple preset values/wording; user test | Agent proposes, owner approves |
| D10 | Diagnostics hosting, consent, monitoring | Opt-in off; "Copy diagnostics" only |
| D11 | Build step (esbuild) or stay no-build | Stay no-build |
| D12 | Key storage (localStorage vs session vs per-document) | Keep local, "forget key", clear disclosure |
| D13 | May PE modify the document beyond text replacement (content controls, comments) | No; text edits only |
| D14 | Publisher identity / AppSource | Defer; docs + centralized deployment only |
| D15 | `next` release channel with second manifest | Yes |

Full rationale per decision: roadmap section "Decisions needed from the owner" (PE-80 roadmap; project store copy `prozaedit-word-improvement-roadmap-pe-80.md`). Older planning decisions (D1-D9 in [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md)) use the same numbers for a different list; the PE-80 list above is the current one.

## 14. Next steps (ranked, from PE-93/PE-96)

1. Owner runs checklist items for Track Changes and real keys. If tracked Apply misbehaves, fix before anything else.
2. Run an audit on one real manuscript, collect false positives, tune rules.
3. CSP after a real-Word trial. 4. Non-fiction checks. 5. Combined AI test. 6. Worker hardening and Actions pinning. 7. CSS at 320 px. 8. Advanced-rule noise decision.

## 15. Doc index

[README](../README.md) · [WHEN-YOU-RETURN](./WHEN-YOU-RETURN.md) · [source-of-truth](./source-of-truth.md) · [RELEASE-NOTES-PE-81](./RELEASE-NOTES-PE-81.md) · [PRIVACY-AND-DATA-PE](./PRIVACY-AND-DATA-PE.md) · [GENRE-PROFILES](./GENRE-PROFILES.md) · [OWNER-CHECKLIST-2.0.0.26](./OWNER-CHECKLIST-2.0.0.26.md) · [DESKTOP-INSTALL](./DESKTOP-INSTALL.md) · [FINAL-READINESS-PE-96](./FINAL-READINESS-PE-96.md) · [prozaedit-features](./prozaedit-features.md) (older feature reference, predates PE-81).
