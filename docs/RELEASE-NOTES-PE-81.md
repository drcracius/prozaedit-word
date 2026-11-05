# Release notes: PE-81 through PE-96 (latest build 2.0.0.26; sections below are not in chronological order, newest are 2.0.0.26, .25, .24)

Based on PE-79 (PR #27). Merged to `main` as PR #28 (after #27); see [HANDOFF-DESKTOP.md](./HANDOFF-DESKTOP.md).

- **Genre profiles** — see [GENRE-PROFILES.md](./GENRE-PROFILES.md).
- **Multi-provider AI help** (optional, own API key): Gemini, OpenAI, Claude, OpenRouter. Model picker (cheapest default), estimate-before-run in every confirm, hard session and daily token limits, usage meter, cancel, retry-once on rate limit. Keys stay on the device, never in the document; old document-stored Gemini keys migrate out.
- **Safer AI output**: manuscript text is wrapped as untrusted data; AI findings are schema-validated and dropped unless they quote your text; nothing is auto-applied.
- **Safer Apply** (anchored, PE-82): each audit fix is tied to its paragraph (text hash) and ~30 characters of context either side. Before editing, ProzaEdit re-checks that exactly one place matches; if the paragraph changed, or the same text appears in identical surroundings, it refuses with a clear message and changes nothing. After editing, the paragraph is re-read and verified. Only exact (case-sensitive) text is edited; placeholder suggestions cannot be applied; works the same in Simple and Advanced; one undoable edit.
- **Resume for the manuscript read** (PE-82): cancelling "Build full manuscript context" keeps the finished batches in memory; running it again resumes if the document is unchanged (version, 30-minute age, paragraph count and per-batch hashes all verified), otherwise starts over. Nothing is written to the document or settings.
- **Saved AI replies** (PE-82): the same AI request is answered from a local cache (7 days, size-capped, never in the document, never with keys) at 0 tokens; clear it in Settings → AI.
- **Accuracy gate** (PE-83): labeled corpus across all 12 profiles, precision/recall computed in `npm test` (gate: precision >= 0.85, recall >= 0.90) and a GitHub Actions `tests` workflow. It exposed and fixed: Non-Fiction types being treated as Fiction, noisy repeated-word-pair/POV-slip/sensory/hook/long-dialogue cards (now low confidence), contractions inside quotes in academic text.
- **Tense and POV drift hints** and optional **Content notes** (profanity/violence, off by default, informational) — see GENRE-PROFILES.md.
- **Simple view** hides low-confidence suggestions behind "Show them".
- Removed regex lookbehind (older Office WebViews). 
- Tests: see `npm test` (224 at PE-82; more added by the PE-83 corpus and the PE-84 independent audit).
- Manifest `AppDomains` unchanged: Gemini already worked without listing its domain, so no re-upload is needed; add the domains only if a provider is blocked in real Word.

## 2.0.0.23 (PE-93 audit 5)

- Apply now searches Word for the exact passage (only `^` codes are removed; `?`, `*`, `$` etc. are literal) and refuses passages Word cannot search exactly (over 255 characters or containing `^`) instead of editing a shortened match.
- Confirmed long-operation notice now says "nothing has started yet - choose Continue"; Not now says nothing was read or sent.
- "Fresh reply" clears after every attempt, including failures.
- Legacy document key with blocked device storage now says to paste the key again; a key left on the device by another document is flagged when Remember is off.
- Daily AI cap now resets at local midnight (was UTC).
- Quote-balance check counts a closing quote after a digit ("L-14"); citation scan no longer flags "Results showed" or "(New York)"; timeline year-jump no longer fires for far-apart paragraphs; more pleonasm and business-jargon entries; plain-language copy fixes; no What's-new banner on a brand-new install.

## PE-84 independent audit fixes (still 2.0.0.19)

- AI budget caps now also hold when the browser blocks or fails storage (counters are kept in memory for the life of the pane as well).
- Spacing-only cards (double space) now say how to fix them (Word Find & Replace) instead of "no text to replace".
- All settings checkboxes and several text fields now have accessible names for screen readers.
- "Release notes" link in What's new points to these notes; privacy doc now discloses the automatic once-per-session update check.

## Audit 2 (PE-85) + best-version fixes (PE-86) — 2.0.0.20 (manifest bump: testers re-upload `manifest.hosted.xml` once)
- Anchored Undo/Redo: edit history stores the anchor, so undo/redo verify the paragraph and never touch a different identical spot.
- Timed-out / cancelled-in-flight / dropped / empty AI calls now count toward session and day caps (conservatively, at the estimate).
- AI catalogue refreshed (reviewed 2026-11-01, not live-key tested): Gemini 3.x default, Claude Haiku/Sonnet 5.5, retired Claude ids removed; model lists live in one block in `ai-providers.js`; Custom model id still works; 404 says "model unavailable, pick another".
- Gemini key sent in `x-goog-api-key` header (not URL); Anthropic no longer sends `temperature`; `gpt-5+`/`gpt-6` use `max_completion_tokens`.
- "Failed to fetch" guidance (OpenAI key/Anthropic org CORS); Gemini free-tier data-use disclosure.
- `ext:dash_mix` / `ext:emdash` no longer offer an Apply replacement; em-dash flag needs density ≥12 per 1k words. AI-phrasing check is off by default, Advanced-only, reworded.
- Default scope is Full manuscript; session tip about re-uploading manifest removed; all 9–11px text raised to 12px; MCI "not built" neutral style.
- Manifest declares WordApi 1.3 and the pane checks `isSetSupported` at start.
- Not done: tracked-changes Apply mode, per-chapter incremental index rebuild, live model-list refresh, AppDomains additions (needs real-Word evidence).

### Audit 2 follow-up (still 2.0.0.20)
- Model ids re-checked against official pages on 2026-11-01 (Gemini models page, Claude models overview, OpenAI models page, OpenRouter `/api/v1/models`). Unconfirmed `claude-haiku-4-5-20251001` removed; OpenAI `gpt-6*` kept as non-default options labelled "Chat Completions support unconfirmed"; OpenAI/OpenRouter defaults stay on `gpt-4o-mini`.
- Manifest element order confirmed against Microsoft's sample manifests (Hosts, Requirements, DefaultSettings, Permissions). `manifest.xml` version and SupportUrl now match `manifest.hosted.xml` (tests enforce).
- New: "Replace all double spaces" on the double-space card (only runs of 2+ plain spaces; indented paragraphs skipped; counts first; confirm; use Ctrl+Z in Word to undo).
- `read:too_simple` no longer fires on fiction (plain prose is normal in fiction; it fired on every sample).
- Mutation check: 10 deliberate breakages of apply/anchor/quota/provider/cache/controller code; all caught by the suite.

## 2.0.0.21 (PE-87 Audit 3)
Score, Style/Critical counts, filter-chip counts, feedback letter, Copilot text and report/export now cover exactly what the current view shows; the summary says whether Simple (lower-confidence hidden) or Advanced (all) is counted and refreshes on toggle. Content notes are no longer counted as Style. Stale chapter lists are refused instead of reading wrong paragraphs; timeline selection scope no longer mismatches duplicate paragraphs; dictionary/style-guide/mute saves roll back on failure. Manifest version bumped: testers re-upload once.

## 2.0.0.22 (PE-91 resolve open findings)
Genre switch to non-fiction now remembers your fiction modules and restores them when you switch back; the manuscript index is flagged out of date when fiction/non-fiction changes; an audit uses the options it started with; a double click opens one AI confirm; dictation stops when you leave Coach; muting reports a failed document save; scope counts can no longer show an older result. Thesaurus no longer invents fallback synonyms offline, keeps your capitalisation, supports accented words and chips work from the keyboard. Dark/light colour pairs meet WCAG AA (`node scripts/check-contrast.mjs`, gated in tests), focus rings are visible on every control, tabs/panels are linked for screen readers. New: "Fresh reply" checkbox (Settings → AI help) skips the saved AI reply once. Genre numbers are labelled as editorial rules of thumb.

## 2.0.0.26 (PE-96)
- **Security:** text from your manuscript, from a shared document's saved settings, or from AI output can no longer inject markup into the task pane; status messages are plain text unless built by ProzaEdit itself; saved summaries are cleaned before display.
- **Fewer wrong suggestions:** the a/an check no longer flags everyday correct usage (a university, an hour, an MRI); two different similar names (Jaden/Jayden) are no longer called a typo; "analyses" is not a spelling-dialect mismatch; contested double-word phrases are no longer shown as Critical.
- **Apply works more often:** cards quote your text exactly as written (capital letters included), and a replacement keeps the capital at the start of a sentence.
- **Rewrite modes:** fixed lowercase sentence starts and awkward swaps ("many money").
- **Reliability:** update check and diagnostics sending now time out instead of waiting forever.
- Plainer wording: setting field is optional and no longer pre-filled with an example city that was sent to AI prompts.

## 2.0.0.25 (PE-95)
- **Apply with Track Changes:** ProzaEdit now detects Word's Track Changes (WordApi 1.4). When it is on, Apply leaves a tracked replacement you accept or reject in the Review tab, and ProzaEdit Undo is off for that edit. When Word cannot tell, Apply behaves as before.
- **Faster outline rebuilds:** unchanged chapters reuse their names and time cues from the last build in this session (the whole-document result is identical to a full rebuild).
- Accessibility and narrow-pane fixes (320 px) for the chapter-by-chapter panel, status line and dialogs; plainer error messages; more UK/US spellings, repeated-meaning phrases and business jargon recognised; long-dialogue check counts only spoken words.

## 2.0.0.24 (PE-94)
- **Audit next chapter** (Checks, "Long book? Audit one chapter at a time"): for books over the whole-book limit (about 450,000 characters). One click audits the next chapter, shows "Chapter N of M", keeps your place in the document, can be cancelled (position unchanged) and skipped, and merges every chapter's findings into one summary. If the chapter list changes, progress starts over with a notice. Earlier chapters' cards are not stored across sessions (only counts).
- Plain-word names: "Full MS context" / "manuscript index" is now **Book outline**, "Extended checks" is **Deeper checks**, "Selected chapters" is **Chosen chapters** (UI, help, docs). Simple view hides the Target-tab outline block.
- Rules: custom-style whole-word match is Unicode-aware and works for phrases with symbols; `plot:restroom` (a canned sentence with an invented replacement) removed; a/an no longer flags acronyms ("an FBI agent") or honourable/historic; name nudge accepts McDonald, O'Neil, Zoe, Anne-Marie.
- Fixes found by line-reading earlier-skipped files: prior-session banner shows a local date and plain scope name; tooltips clear stale aria-describedby and close with Escape; overview no longer prints "~(use section loop) words"; "What happens to my text?" line above AI settings.

## 2.0.0.27 (PE-99)

- Non-fiction genres (Memoir, Academic, Business, Technical/Journalism) now get long-sentence and passive-voice cards (`nf:long`, `nf:passive_cluster`). They are preference severity with the genre's own limits; only clear outliers (1.5x the limit) are visible in Simple view, borderline ones appear in Advanced. Adjectival forms ("was tired") are not counted. Corpus gate: Simple precision 1.00, recall 1.00 on 28 fixtures (gate is >= 0.85 / 0.9; CI gates unchanged).
- New pane-level test for AI provider x cache x cancel with a mocked fetch: cancel mid-request never caches, a cached repeat costs 0 tokens, cancel then retry works, the key is never stored or shown.
- 448 tests. Testers re-upload `manifest.hosted.xml` once (version bump).

## After 2.0.0.27: Word Desktop fix and small trust fix (no version bump)

- **Word Desktop could not see ProzaEdit.** Two causes, both fixed. (1) Manifest resource id `ProzaEdit.GetStarted.LearnMoreUrl` was 33 characters (Office's limit is 32), so Word Desktop most likely skipped the add-in; it is now `ProzaEdit.LearnMoreUrl` in `manifest.hosted.xml` and `manifest.xml`. (2) The Shared Folder script registered a local `file:///` address; Word needs a network `\\PC\Share` path. The installer now shares the catalog folder and registers the UNC path, validates the manifest first, and offers a no-admin Developer sideload (`Sideload-ProzaEdit-Desktop.bat`). Guide: [DESKTOP-INSTALL.md](./DESKTOP-INSTALL.md). Real-Word loading is still unverified until the owner reports.
- `Verify-ProzaEdit-Install.bat` rewritten (it expected 2.0.0.17 and a file address); it now reads the expected version from the repo.
- **Dismiss no longer fails silently:** when the browser cannot store a dismissed phrase (storage full or blocked), the pane now says so.
- `tests/manifest-desktop.test.mjs` guards resource-id length, resid references, https, and both manifests staying in step. 456 tests.
- Manifest structure changed (one resource id), so desktop users who already added the add-in should re-add it; Word on the web users should re-upload `manifest.hosted.xml`.

## 2.0.0.31 — Declutter first screen + Help trim (copy/UI only)

- **First screen:** Closed **Tips** (`#peChromeHelp`), icon workflow pills, Guide/Scope badges (Dictionary badge removed), icon toolbar with visible **Run**, short **Scope** / **Type** on Target, Refresh icon.
- **Audit:** Collapsible **Summary** block; duplicate filter hint lines hidden; export actions under **More**.
- **Help / Settings:** Removed repeat essays; merged Install and Diagnostics sections; Essentials intro de-duplicated.
- **Still offline-first;** no new fonts. Genre checks, optional AI, Apply/undo unchanged. **477** tests; wiring and contrast gates pass.
- **Real Word:** Apply / Track Changes not re-verified in this release (mock tests only).

## 2.0.0.30 — Major pane layout (Gemini-inspired, incremental)

- **Layout:** Compact header, pill workflow steps, guide/scope badge row, switch-style toggles on Checks and Settings.
- **Findings:** Audit cards are collapsible (`<details>`); the first card opens, the rest stay closed until expanded. Apply / undo / dismiss unchanged.
- **Rail:** Coach, Export, and Settings shortcuts appear only when the pane is **≥ 420px**; hidden on narrow Word hosts so nothing clips.
- **Safety:** No Google Fonts or mock JS swap. Existing handlers and IDs kept. Export uses the real “new Word doc” report path (warns if you have not run a report).
- **Skipped:** Footer tab bar, `window.print()` PDF, `100vh` scroll lock (would freeze the Word iframe).

## 2.0.0.29 — Run report flow, doc scrub, pre–major UI baseline

- **Run report:** Primary actions say **Run report** / **Report finished**. Local reports start immediately with the progress bar (no pre-ack banner); long scans still warn only at **80k+** scoped characters when the onboarding pref is on.
- **Long-operation fix:** Continue / stuck-state handling repaired; repeating Run while a notice is open continues instead of blocking.
- **Public docs:** Removed references to other writing products; vendor-cited research kept offline (see maintainer archive on Desktop). **Paul Beverley / Word Macro Tools** attribution unchanged in THIRD-PARTY and WORKFLOWS.
- **Reference UI:** Gemini mock saved under `docs/ui-proposals/gemini-major-ui/` (not shipped).
- **462** tests (`npm test`), wiring and contrast gates unchanged.

## 2.0.0.28 — word count and readable type (Word Desktop and Word on the web, same build)

- **Word count** no longer uses “paragraphs × 42”. Full-document and audit totals now count the same way Word does (whitespace tokens that contain a letter or digit). Blank paragraphs and curly apostrophes no longer inflate the number. Outline section counts use the same rule.
- **Type:** body **14px** Segoe UI (not thin Segoe UI Variable Display); tabs **13px**; headings **16px**. Removed antialiased smoothing that thinned text on Windows. Darker body and muted colors. No new web font (we stay offline-safe on system fonts). Close and reopen the pane (Ctrl+F5) to see it.
