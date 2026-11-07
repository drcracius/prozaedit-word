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

## 2.0.0.65 — Restore point before master engine (planning docs only)

- Ships 2.0.0.64 pane work: replace list, desktop page layout where Word allows it, page-count cancel, plainer labels, Essentials theme link.
- Adds `docs/ProzaEdit-Major Style and Lexical Update.md` (integration plan) and `docs/ProzaEdit - Comprehensive Master Engine & Lexical Suite.js` (reference engine v4 — **not wired**; live checks still use `audit-engine.js`).
- Annotated tag `v2.0.0.65` / `pe-97-restore-pre-master-engine` and branch `pre-master-engine-v4` for the next phase.
- Not tried in Word from here.

## 2.0.0.64 — Replace list, and real pages where Word allows them

- Rewrite has a replace list. One line is `find => replace`. It changes the scope chosen on Start, asks first, and leaves Track Changes as Word has it. Use Word's Undo to step back. The list stays on this computer.
- On a recent desktop Word, Pages uses Word's layout. Word on the web still uses about 250 words per page. The count can be cancelled. If it fails, the boxes stay usable. Opening another saved file forgets the previous file's page count.
- A passage under about 200 words no longer gets a reading-grade note.
- The dark-mode tip opens Settings → Essentials, where Light, Dark, and Match system live.
- An out-of-date book outline sends you to Start. Section and chapter buttons say Run. Local checks no longer say “0 tokens.”
- Not tried in Word from here.

## 2.0.0.63 — Clearer steps and one place to start

- The four steps show the words Start, Set checks, Run, and Fix. Set checks opens the Run tab. Run starts the check.
- A new document starts on Selection. A scope you already saved stays as it is.
- Page boxes say they are estimates. The page count runs when you choose Pages, not when the pane opens.
- Book outline is built on Start. Run and Settings link there.
- Fix keeps type, scope, and critic persona under Change setup, closed until you open it.
- Not tried in Word from here.

## 2.0.0.62 — Page limits, plain heading names, word-sized messages

- Page numbers are counted soon after the pane opens, then kept inside the document. Pages are still an estimate (about 250 words each).
- Help, the chapter chart, and the heatmap name Heading 1, Heading 2, and Heading 3. They no longer say “Heading 1–3.”
- Messages that writers see use words. The safety limits in the code stay in characters.
- The extra book-outline sentence on Run is gone. The Build book outline button remains.
- Not tried in Word from here.

## 2.0.0.61 — Words, honest full checks, chapter range

- Scope counts show **words**. The safety limit is still characters in the background (about 6 characters per word).
- A full check that hits the limit says it **stopped**. It no longer looks like the whole book was read.
- Chapters use **From** and **To**, like pages. If no Heading 1, 2, or 3 titles are found, the message is short and offers **Use pages**.
- Page and chapter numbers cannot go past the document (pages are still an estimate).
- User guide: [USER-GUIDE.md](./USER-GUIDE.md).
- Not tried in Word from here.

## 2.0.0.60 — Word's check accepts the add-in file

- Word's own check rejected one line: the allowed website included a folder name (`/prozaedit-word`). That line is now the site only (`https://drcracius.github.io`).
- The pictures stay the same as the file that already uploaded. The pane address is unchanged.
- Download the raw file again: https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml
- If Word still has the old ProzaEdit add-in, remove it, then upload this file.
- Install helpers: **`Download-Manifest-From-GitHub.bat`** (authoritative download for Word web upload), **`Uninstall-ProzaEdit.bat`** (desktop registry). Word on the web: **My Add-ins → Remove**. Install scripts download from GitHub by default; desktop and install scripts reject an AppDomain path before registration. CI runs `npm run validate:manifest` (Microsoft production rules).
- Not tried in Word from here.

## 2.0.0.59 — Add-in file matches the one Word already accepts

- The add-in file is the same as the copy that uploaded two days ago. Only the version number is newer.
- Download the raw file again: https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml
- Not tried in Word from here.

## 2.0.0.58 — Word can accept the add-in file

- A picture-size and website-address change was tried. Word still rejected the file. That change was undone in 2.0.0.59.

## 2.0.0.57 — The messages match the Run button

- If a check has not been run yet, the pane says **Run first.**
- If Run cannot start or cannot finish, the message says **Run**, the same word as the button.
- Not tried in Word.

## 2.0.0.56 — A quote stops at a line break

- A spoken line is skipped only until the next line break, including a break inside a paragraph. An unmatched quote cannot hide the following lines.
- Not tried in Word.

## 2.0.0.55 — Quotes stay in their paragraph

- A spoken line is skipped only when its closing quote is in the same paragraph. One unmatched quote no longer hides later paragraphs, and it no longer makes the check slow.
- A curly apostrophe in a word such as “don’t” does not end a quote.
- Clear report says “Report cleared.”
- Not tried in Word.

## 2.0.0.54 — A stray quote no longer blanks the rest

- Narration checks skip a finished pair of quotes. One unmatched quote no longer hides every note after it.
- The chapter chart pauses between batches, so Cancel can stop it. A chart already saved stays put.
- Not tried in Word.

## 2.0.0.53 — Quieter checks

- One passive-voice note per run. Fiction and non-fiction no longer raise two.
- Business wording is one original list. A phrase is flagged only as a whole word.
- Narration checks skip quoted speech. The card still quotes the original letters.
- Dismiss hides that phrase. Mute still hides the rule.
- A dialect card quotes the word as it appears, including an ending such as “organised”.
- Not tried in Word. Apply with Track Changes is still mock-tested only.

## 2.0.0.52 — Quieter report path

- **Run** finishes on **Fix**, with the summary and the first card. Start, Run, and Fix use the same names in Simple and Advanced.
- A card shows **Go to** and **Apply**. Rewrite, tip, dictionary, house rule, mute, and AI are under **More**.
- Simple view lists likely fixes and keeps quieter notes behind **Show them** on the report.
- Fiction or plot checks on a partial scope show one warning at the top of the report. A house rule wins on the same phrase, and a spelling card on that word stays.
- **Run** and **Run again** start the check. The summary stays at the top of Fix.

## 2.0.0.51 — Should of, and a noncommercial jargon pack

- “should of”, “could of”, “would of”, and “might of” suggest “have”. “should of course” is left alone.
- Business reports flag a short list adapted from the Mailchimp Content Style Guide (CC BY-NC 4.0). Remove that pack before any sale.

## 2.0.0.50 — Hedge words

- Nonfiction reports add one card when several hedge words from the MIT weasel-words list pile up. A single “very” is left alone. Fiction is skipped.
- More public-domain padding phrases: “in spite of the fact that”, “a large number of”, “the majority of”.

## 2.0.0.49 — Public plain-language list

- More multi-word lines from the public-domain plainlanguage.gov list (for example “in the near future” → soon, “a number of” → some). One-word swaps such as “however” stay out.
- GPO Style Manual form: “e-mail” → “email”.
- Source inventory: [STYLE-GUIDE-SOURCES.md](./STYLE-GUIDE-SOURCES.md).

## 2.0.0.48 — Mixed forms

- When a passage uses both a number word and its digit (two and 2), or both a hyphen form and an open form (long-term and long term), the report says to pick one. Times (2:30) and decimals (10.5) are left alone. These cards stay lower confidence, so Simple view hides them.

## 2.0.0.47 — Report grouped by check

- The summary adds a **By check** line (busiest check first, up to eight names).
- About states that checks and spelling lists update with the add-in. The existing Check for updates button is unchanged.

## 2.0.0.46 — Hidden verbs

- Plain-language checks now flag a short list of hidden verbs, such as “make a decision” → “decide”. Wording is original. Fiction treats them as lower confidence.

## 2.0.0.45 — Deep report checks locally before AI

- Local checks run before the AI call. Cancel during those checks does not send anything.
- Cancel while waiting for the AI reply keeps the local cards.

## 2.0.0.44 — Same words, and named checks on a deep report

- Text you can see says **Run report** where it used to say “run audit” for the same button.
- The optional deep report names each local check. If you cancel during those checks, finished cards stay and AI is not called.

## 2.0.0.43 — Named checks while a report runs

- The progress line names the check that is running (Repetition, Proofreading, Plot, and so on). The matching row on Checks is marked.
- If you cancel after at least one check finished, those cards stay and the pane says which checks did not run. Cancelling while Word is still being read still leaves no new cards.

## 2.0.0.42 — Long-scan notice matches large highlights

- Citation, timeline, batch, and deep scans use the optional Continue notice for any **large scope** (about **80k+ characters**), including a big **selection**, not only chapter or full-document modes.

## 2.0.0.41 — Long-scan notice no longer cleared by Run

- If the optional Continue notice is open, **Run report** and other actions tell you to use Continue or Not now instead of dismissing it by accident.
- Progress strip scrolls into view on narrow panes; Help notes the progress ring.

## 2.0.0.40 — Progress ring; long-scan ask is optional

- **Run report** starts immediately with a **spinner + status line + Cancel** (no Continue banner).
- Large-scope reassurance (“1–2 minutes, keep writing in Word”) shows on the progress strip, not as a blocking top banner.
- Settings → Onboarding: “Ask before citation/timeline/batch/deep scans” is **off by default**; turn on only if you want the old Continue step.

## 2.0.0.39 — Welcome copy in Help (quiet home)

- What's new, session tips, last-session recap, Simple-view first-run note, and dark-appearance tip no longer stack at the top of the home screen by default.
- The same material lives under **Help → What's new, tips & last session**. Settings → Onboarding can turn optional top banners back on.
- Long-operation warnings (large scope before Run report) are unchanged.

## 2.0.0.38 — Thesaurus no longer holds Word

- Looking up the selected word reads Word first, then asks the word service. Other actions are not stuck behind that lookup.

## 2.0.0.37 — One Word read at a time

- Every document read now waits in a single line. A report, chapter reload, character count, Apply, or scan cannot open a second Word read while one is still open.
- A newer character count still replaces an older one. The older result is not shown.

## 2.0.0.36 — No second Word read during a report

- Reloading the chapter list or refreshing the character count waits while a report, scan, or rewrite is already reading the document.
- The character count starts only after the chapter list has finished, so those two reads do not overlap.
- The lightning step is marked unavailable while **Run** is turned off.

## 2.0.0.35 — Scope count mistakes

- A failed character count no longer pretends the scope is over the limit, so Run is not blocked for the wrong reason.
- Reloading chapters cannot start a second chapter read while the first is still going.
- After chapters load, Run does not count the same text twice.
- Toolbar **Run** turns off as soon as a report starts, and comes back if the start is cancelled or fails.

## 2.0.0.34 — Safer Run

- A second **Run** is ignored until the first one has started, so two reads cannot overlap.
- Reloading the chapter list waits for the character count before it finishes.
- The toolbar **Run** button is disabled while a long job is on screen.

## 2.0.0.33 — Shorter first screen

- Type line shows the genre sentence only. The “rules of thumb” note stays for screen readers.
- The Scope badge stays the scope name. The character count stays under Scope.
- A bad scope limit cannot throw while refreshing the count.

## 2.0.0.32 — Declutter follow-up (pane safety)

- Lightning **Run** step starts a report (keyboard and click). Fix step still opens the issue list.
- Simple view closes the optional profile once, then leaves it open if you expand it.
- A missing character count no longer throws while refreshing scope.
- Hidden audit hints no longer sit on a live region.

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
