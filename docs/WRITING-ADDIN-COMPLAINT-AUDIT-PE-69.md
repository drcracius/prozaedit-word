# PE-69 — Writing-editor complaint research and ProzaEdit gap audit

**Research date:** 2026-11-01  
**Baseline:** `main` at `275ba05` (PE-68 / PR #18), build **2.0.0.15**  
**Method:** Current public Reddit/forum posts, review aggregators, and vendor support/policy pages. User posts are anecdotes unless corroborated across independent threads or an aggregate; vendor pages establish product behavior, not complaint prevalence.

## Outcome

The strongest cross-product pattern is not “missing more checks.” It is loss of control: automatic scanning slows Word, long-document passes stall, suggestions false-flag specialist language, review panes lose the current item, one-click changes are hard to undo, cloud behavior is unclear, and integrations differ by host.

ProzaEdit already avoids several causes by architecture: audit is explicit rather than realtime, local checks do not upload the manuscript, scopes are capped, cloud actions are optional, and core audit has no subscription. PE-69 closes four low-risk gaps without adding reports, realtime checking, a subscription, or default uploads:

1. audit cards now show **Finding X of Y**;
2. Mute, Dismiss, and successful Apply preserve the review lane and move keyboard focus to the next available card/action while stabilizing scroll;
3. failed Word operations give retry, reopen-pane, and smaller-scope recovery guidance, and a failed audit no longer announces “finished”;
4. Gemini controls now say what is sent, when it is sent, and that remembering the key stores it in the Word document.

## Fresh complaint evidence

| Product | Complaint evidence | Strength |
|---|---|---|
| **ProWritingAid** | Realtime starts automatically and causes a performance hit on long files; another user reports Word repeatedly disabling the add-in ([Reddit, Nov 2024 with Jan 2026 workaround](https://www.reddit.com/r/ProWritingAid/comments/1grg3yj/question_about_prowritingaid_and_ms_word/)). A paid user isolated repeated Word crashes to PWA and described unresolved support ([Reddit, Nov 2025](https://www.reddit.com/r/ProWritingAid/comments/1p32omm/desktop_version_doesnt_work_for_me_at_all_anymore/)). A 2026 interface change prompted complaints about an intrusive icon/sidebar, extra clicks, slow highlighting, and failure to jump to errors ([Reddit, Jul 2026](https://www.reddit.com/r/ProWritingAid/comments/1uxlcx8/sidebar_icon_issue/)); Word integration disappearing after updates is also reported ([Reddit, Jul 2026](https://www.reddit.com/r/ProWritingAid/comments/1v4dn8a/with_the_recent_trash_word_addin_update_is/)). Earlier users described the Word review list jumping after Ignore and ignores not sticking ([Reddit](https://www.reddit.com/r/selfpublish/comments/14w3j6n/prowritingaid_issues_especially_in_word/)). | **Broad qualitative pattern** across independent threads and dates; each individual report remains anecdotal. |
| **Grammarly** | Grammarly says its legacy Office add-in is being retired and will no longer receive security, feature, or technical support, recommending its cross-app desktop product instead ([vendor support](https://support.grammarly.com/hc/en-us/articles/39983075497485-Grammarly-for-Microsoft-Office-will-be-discontinued-soon)). Users object to floating widgets/popouts covering text and to losing the docked Office pane ([Reddit](https://www.reddit.com/r/Grammarly/comments/1bz67np/im_falling_out_of_love_with_grammarly/), [Reddit](https://www.reddit.com/r/Grammarly/comments/16air0i/bring_back_grammarly_for_office_as_an_addin_the/)). Grammarly confirms that active products need text access and that generative-AI prompts/context go to service providers; it documents opt-out and data controls ([vendor access explanation](https://support.grammarly.com/hc/en-us/articles/360003835311-Does-Grammarly-s-product-read-everything-I-write), [privacy FAQ](https://support.grammarly.com/hc/en-us/articles/20916119474829-Privacy-and-security-FAQs)). | **Vendor-confirmed** migration/data behavior; overlay and workflow complaints are **recurring anecdotes**, not a statistical sample. |
| **PerfectIt** | Capterra’s 2026 summary is based on 125 reviews and describes advanced style sheets and setup as requiring practice; its complaint summary includes crashes, slowdowns, and glitches ([Capterra](https://www.capterra.com/p/208453/PerfectIt/)). Individual reviews describe hours-long processing, false-positive style contradictions, Word freezes, hard-to-interpret reports, and a steep style-guide learning curve ([reviews](https://www.capterra.com/p/208453/PerfectIt/reviews/)). PerfectIt itself warns that tracked-changes checking is slower, the screen can flash, and faster movement reduces the opportunity to review changes ([vendor options](https://support.perfectit.com/kb/guide/en/options-perfectit-for-word-windows-TzQFu0euzm/Steps/2438101)). | **Broad review pattern** for learning/performance, plus **vendor-confirmed** tradeoffs; crash specifics are anecdotal. |
| **LanguageTool** | Multiple paid users report that Word finds issues but Accept and jump-to-text fail after an update; vendor staff attributes part of the issue to Microsoft and offered a legacy-interface workaround/refund ([forum, Oct–Nov 2024](https://forum.languagetool.org/t/languagetool-in-word-does-not-work-at-all/10513), [Office 2024 thread](https://forum.languagetool.org/t/the-add-in-for-office-2024-is-not-working/10651)). Long files become unacceptably slow and users work section-by-section ([forum, Dec 2024–Jan 2025](https://forum.languagetool.org/t/lt-langsam/10762)); another report says desktop markings stop after page 38 of 350+ ([forum, Oct 2025](https://forum.languagetool.org/t/desktop-app-only-corrects-first-38-pages-in-word/11668)). | **Broad forum pattern** with several reporters and vendor responses; exact limits remain anecdotal/host-specific. |
| **Writefull** | Academic users report technical terms continually highlighted without exceptions, missed errors, incorrect suggestions, altered meaning, and confusing movement among separate tools ([r/academia](https://www.reddit.com/r/academia/comments/14vjb6v/is_writefull_for_overleaf_worth_it/), [r/PhD](https://www.reddit.com/r/PhD/comments/163x3aj/experience_with_writefull/)). Writefull’s terms state that accounts may be terminated but refunds are not issued ([vendor terms](https://www.writefull.com/terms)). | Suggestion/UI claims are **anecdotal**; no-refund positioning is **vendor-confirmed**. |
| **Hemingway** | A review calls out no undo for accepted corrections, limited grammar depth, strong anti-adverb bias, and free-version save limits ([Authors Tech review, 2026](https://authorstech.com/hemingway-app-review/)). Trustpilot contains subscription-cancellation/support complaints, but only three reviews were shown ([Trustpilot](https://uk.trustpilot.com/review/hemingwayapp.com)). Hemingway’s vendor pages clarify the split between a one-time offline desktop editor without AI and Plus subscription features ([desktop](https://4.hemingwayapp.com/desktop), [quick start](https://hemingwayapp.com/help/docs/quick-start-guide)). | **Weak anecdotal signal** because the review volume is tiny; product split is vendor-confirmed. |

### Complaint clusters

Across those products, the recurring clusters are:

- report/menu overload and no obvious first action;
- realtime scanning, long-document lag, hangs, and host crashes;
- false positives, specialist terms, and ignores/dictionaries that do not persist;
- issue panes that jump, fail to locate text, or lose the reviewer’s place;
- bulk/destructive apply with weak preview or undo;
- unclear cloud access, API-key storage, quotas, subscriptions, and upsell;
- Windows/Mac/Web/Word-version differences;
- cramped or intrusive panes, color-only signals, weak keyboard/focus behavior;
- tutorial fatigue, unexplained jargon, dead ends, and no visible progress/cancel;
- slow support, refunds, or discontinued integrations.

## ProzaEdit gap audit

Status meanings:

- **Avoided by architecture** — the main cause is absent from the design.
- **Mitigated in UI** — explicit controls/copy reduce the risk, but cannot remove it.
- **Partially mitigated** — useful safeguards exist; an important gap or validation need remains.
- **Open / owner-validation / Microsoft-host dependent** — cannot honestly be closed in source alone.

| Complaint cluster | Status | Current evidence and PE-69 change | Remaining gap |
|---|---|---|---|
| Too many reports / unclear start | **Mitigated in UI** | One audit pipeline; Simple mode defaults to Start → Run → Fix → Help; Important-first filter; report depth/caps; first-audit checklist and 3-stop tour (`taskpane.html`, `plain-language-helpers.js`, `onboarding-helpers.js`). | Full mode still has seven tabs and advanced settings. Do not merge IA in this patch. |
| Realtime fatigue | **Avoided by architecture** | No always-on document underlining or keystroke scan. Users explicitly choose Run audit; Help/tour says it is manual (`taskpane.html`, `onboarding-helpers.js`). | Product messaging must continue to avoid implying Grammarly-style realtime behavior. |
| Lag, freezes, long documents | **Partially mitigated** | Local engines, explicit scope, chapter/page options, full-scope confirmation, character caps, truncation card/status, long-operation warnings, cooperative cancel, and chapter-first guidance (`scope-reader.js`, `long-operation-controller.js`, `taskpane.js`). PE-69 exposes cancel as an atomic live status and announces “Cancelling…” after activation. | Office.js work can only cancel at cooperative boundaries; owner must measure representative 50k/100k-word docs in Word Web/desktop. |
| False positives / ignores / dictionary | **Partially mitigated** | Per-document dictionary, globally persisted muted rule/target lists in local browser storage, card Mute/Dismiss, custom style rules, plain heuristic labels (`settings-store.js`, `audit-engine.js`). | Browser storage can be cleared or isolated by host/profile; `saveAsync` failure is not surfaced for every dictionary/mute operation. Owner validation across Web/Desktop is required. |
| List jumping / lost place / failed navigation | **Mitigated in UI** | Filters and sort remain live session state. PE-69 adds Finding X of Y and, after Mute/Dismiss/successful Apply, selects the next/previous visible card, preserves the clicked action where available, and offsets scroll to hold the review position (`audit-review-helpers.js`, `taskpane.js`). Word navigation uses safe search (`word-safe-navigator.js`). | Word may still invalidate a text match after the document changes; recovery copy now explains retry/reopen/smaller scope. |
| Destructive apply / undo / trust | **Mitigated in UI** | Confirm-before-apply is default; continuity warning; one-card Apply; 40-entry ProzaEdit undo/redo; Go to last edit; Word Version History reminder (`edit-history.js`, `taskpane.js`). PE-69 hardens apply/undo/redo failure copy. | ProzaEdit history is session-only and text-search based, not a transactional Word change log. Word’s own Undo/Version History remains the final safety net. |
| Privacy / cloud / API key / upsell | **Avoided by architecture** for core audit; **partially mitigated** for optional Gemini | Audit/coach/rewrite core is local; diagnostics are opt-in and redact text/key; Gemini is optional/BYO key; no manuscript upload by default. PE-69 places disclosure beside Gemini chat/rewrite and key storage (`taskpane.html`). | “Remember key” stores it in document settings, which is unsuitable for shared files. A secure credential store is vNext/owner architecture work. Datamuse/Gemini network behavior still needs privacy-policy review. |
| Subscription / refund / upsell | **Avoided by architecture** | Core ProzaEdit audit has no ProzaEdit subscription/paywall; Gemini is bring-your-own-key and hidden in Simple mode. | Hosting/support/licensing promises are owner product decisions and should be explicit before public release. |
| Word Web / Mac / desktop parity | **Open / Microsoft-host dependent** | Hosted task-pane model avoids system-wide overlays and targets Word Web/desktop. Version checks and diagnostics help isolate build/host issues. | PE-47 manual host checklist remains required. No source-only claim can establish parity across Word builds, WebViews, permissions, and pane widths. |
| Accessibility, narrow panes, dark mode, keyboard/focus | **Partially mitigated** | Light/dark/system themes, semantic tokens, narrow-pane CSS, focus-visible styles, labeled buttons, settings/tour focus trap/restore, live regions. PE-69 keeps keyboard review focus after card removal and labels progress/cancel. | Needs owner testing with keyboard-only, zoom, screen reader, high contrast, and minimum Word Web pane width. Dynamic card density remains high in full mode. |
| Onboarding fatigue / jargon | **Mitigated in UI** | Tour is skippable, three stops, deferred behind banners, and persisted; Simple mode uses Important/plain-language copy; Settings opens Essentials first and supports filtering. | Multiple optional banners can still feel busy; beta telemetry/feedback, not another banner, should decide further reduction. |
| Navigation, dead ends, progress, cancel | **Mitigated in UI** | Workflow strip, cross-navigation, Back/return-focus behavior, audit live progress, two visible cancel controls, batch X/Y, and post-run links (`workflow-nav-helpers.js`, `taskpane.js`). PE-69 prevents a failed audit from reporting success. | Cancellation cannot interrupt a single in-flight Microsoft sync. A determinate percent is not reliable for host reads; phase labels are safer. |
| Support, refunds, discontinued integration | **Open / owner-validation** | Diagnostics/problem-report path and update check exist; no subscription lowers refund exposure. | Support SLA, escalation, compatibility matrix, retention, and refund policy are owner decisions. Microsoft can still alter add-in behavior. |

## Shipped implementation

Files changed:

- `src/taskpane/lib/audit-review-helpers.js` — testable progress, next-card, and recovery-copy rules.
- `src/taskpane/taskpane.js` — stable post-action focus/scroll, card progress, Word recovery copy, accurate failed-audit status, and cancel feedback.
- `src/taskpane/taskpane.html` — accessible cancel live regions and contextual Gemini/API-key disclosure.
- `src/taskpane/taskpane.css` — compact card-progress and cloud-disclosure styling.
- `tests/audit-review-hardening.test.mjs` — focused behavior/wiring tests.

No manifest or build-version bump; no new dependency.

## Verification

- `npm test` — **60/60 pass** (57 baseline + 3 PE-69).
- `bash scripts/verify-version-sync.sh` — manifest and UI remain **2.0.0.15**.
- `git diff --check` — clean.
- Static task-pane wiring audit — **208 HTML ids**, **140 literal DOM refs**, **0 missing ids**; **66 inline handler names**, **0 undefined**.

Manual owner checks remain necessary:

1. Run 50k- and 100k-word samples in Word Web and supported desktop hosts; cancel during read and analyze phases.
2. Keyboard through Mute, Dismiss, and Apply with a filtered/sorted list; verify focus advances and the visible lane does not jump.
3. Exercise failed Go to/Apply after editing the target text; confirm recovery copy is understandable.
4. Verify screen-reader announcement of audit progress/cancellation and test 200% zoom/high contrast.
5. Confirm the API-key warning is acceptable, then decide whether document persistence should remain available.

## Remaining risks by owner

| Owner | Top risks |
|---|---|
| **ProzaEdit owner / release** | Cross-host manual validation; representative long-document performance; accessibility pass; API-key-in-document product decision; support/privacy/refund language. |
| **Microsoft / host** | Word API timing and invalid object paths; pane width/WebView differences; add-in availability and update behavior; inability to preempt an in-flight `context.sync()`. |
| **vNext** | Secure secret storage; more durable ignore/dictionary sync with explicit scope; transactional edit identity/history; measured performance budgets or resumable chunking; any IA consolidation supported by beta evidence. |

## Rating decision

`docs/prozaedit-audit-rating-current.md` is intentionally unchanged. PE-69 closes concrete trust and review-flow gaps, but raising the shipped score before the owner completes cross-host, long-document, and accessibility validation would overstate evidence.
