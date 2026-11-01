# ProzaEdit Word — Feature Reference

**Audience:** D Cracius, beta testers, and developers working on the add-in.  
**Code baseline:** GitHub `main` as of hosted build **2.0.0.15** (`manifest.hosted.xml` and `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js`).  
**Live UI:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html  

This document describes what the add-in **actually does today** in the repository. Help links point to `docs/WORKFLOWS.md` and `docs/THIRD-PARTY-ATTRIBUTION.md` on GitHub `main`.

---

## 1. Executive summary

**ProzaEdit** is a Microsoft Word **task pane Office add-in** for long-form editing: fiction manuscripts, academic papers, business reports, journalism, and memoir-style non-fiction. It reads text from the active document through the Office JavaScript API, runs **local JavaScript editorial engines** in the browser, and optionally calls **Google Gemini** when you supply your own API key.

**Who it is for:** Authors and editors who want structured audit cards, manuscript profiling, and rule-based coaching without sending the full manuscript to a cloud LLM for every pass. Beta testers install once with **`manifest.hosted.xml`**, then open **Home → ProzaEdit** daily.

**Simple mode (default for new documents):** First run keeps **Simple mode** on so the tab strip emphasizes **Start → Run → Fix → Help** (Target, Checks, Audit, Help), hides Thesaurus, de-emphasizes Coach/Rewrite, and shows **Important** instead of **Critical** on Audit filters. Optional 3-step tour and **Settings → Essentials** expose only API key, theme, and Simple toggle until you turn Simple off for the full seven-tab experience. See [RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md).

**Hosted vs local development:**

| Mode | How Word loads the add-in | Typical user |
|------|---------------------------|--------------|
| **Hosted beta (default)** | One-time upload of `manifest.hosted.xml`; UI and scripts load from **GitHub Pages** over HTTPS | You and beta testers |
| **Local dev (archived)** | `manifest.xml` pointed at `localhost:3000`; tooling under `_archive/local-dev/` only | Active development on a PC, not daily writing |

**Daily hosted workflow:** Internet required while the pane is open (Office.js, GitHub Pages, optional Datamuse/Gemini). No author bat files or local Node server for normal use.

**Recommended editing stack (as surfaced in the UI):** ProzaEdit local audit → Word **F7 / Editor** for spelling and grammar → **Copy for Copilot** for generative prose in Word → external tools (Word Macro Tools, PerfectIt) if you own them.

---

## 2. Feature catalog by tab

The task pane uses seven tabs plus a sticky toolbar and a four-step workflow strip (Target → Checks → Run audit → Fix cards).

### Target (tab 1)

**Purpose:** Daily manuscript profile, analysis scope, and preferred style guide. Toolbar **Settings** (gear) holds persistent prefs: Simple mode, safety toggles, audit defaults, privacy/diagnostics, dictionary, citation/reference tools, custom style rules, and Gemini session ceiling.

**Manuscript profile (inputs → affects audit/coach context):**

- **Manuscript type:** Fiction (Thriller/Mystery/Crime), Academic, Business, Non-Fiction/Memoir, Technical/Journalism. Fiction-only **modules** on the Checks tab are disabled when type is not fiction (`adaptModules()`).
- **Target reader / education level:** Drives Flesch–Kincaid band checks and genre benchmark text in the overview.
- **Setting anchor:** Free text (default “Austin, Texas (Contemporary)”). Long excerpts can flag missing anchor city; sensory-sparse scenes can flag under-used senses.
- **Critic persona:** Weights the numeric **score** (critical vs preference penalties): Average Reader through Very Harsh Senior Editor (9.0+ Target).

**Analysis scope (what text is read for audit):**

| Scope | Behavior |
|-------|----------|
| Highlighted / selected text | Word selection; if empty at audit time, user may confirm auto **Select next section** |
| Page range (approximate) | ~2,800 characters per “page” (Word JS has no real page API) |
| Selected chapters | Multi-select checklist from **Heading 1–3** list; non-contiguous OK (e.g. Ch 2 + Ch 7); persisted as `selectedChapterIndices` |
| Full manuscript | Entire `body.text`; confirm on first full scan; hard caps apply |

Legacy saved configs with single-chapter or from/to range migrate once to **Selected chapters** on load.

**Refresh count** measures character length against per-mode limits (see §3). **Reload chapter list** scans headings for the chapter checklist.

**Style & language:**

- **Language:** `en-US` or `en-GB` (dialect flags, `-ise`/`-ize` checks for GB).
- **Preferred style guide:** Auto, Plain US, Strunk 1920, GOV.UK, Microsoft, Google Dev, Red Hat, Custom only, or Custom + Auto. Built-in packs are **local heuristics** keyed to public sources—not pasted guide text.
- **Custom house style:** On Target, pick **Custom** or **Custom + Auto** and see a one-line rule count with a link to **Settings → Custom style** (add/edit rules, presets, bulk import).
- **Simple mode (read-only on Target):** One line shows On/Off with a link to **Settings → Safety**; hides the Thesaurus tab and extra tuning (`pe-simple-mode` CSS); AI help (optional) stays available but off until a Gemini key is set.

**Settings modal (toolbar gear):** Collapsible groups — **Safety** (open), **Onboarding**, **Appearance**, **Audit & reports**, **Privacy & diagnostics**, **Reference & citations**, **Dictionary**, **Custom style** (opens automatically when you already have rules). Footer **Save & close** persists and dismisses (same as auto-save on change). Each group (except Reference) has **Reset … to defaults** with confirm. **Keyboard:** `Ctrl+Shift+,` or `Alt+Shift+S` opens Settings when the pane is focused (does not override Word while typing in inputs). **Deep links:** `openSettingsModal('safety'|'onboarding'|'appearance'|'audit'|'privacy'|'reference'|'dictionary'|'style')` and URL hash `#pe-settings-{section}` (e.g. `#pe-settings-privacy`).

- **Appearance:** Task pane theme — **Light** (default), **Dark**, or **Match system** (`prefers-color-scheme`). Stored as `themePreference` in `PROZAEDIT_CONFIG`; applies immediately on change. Affects the add-in pane only (not the Word document canvas or host chrome).
- **Safety:** Simple mode; edits apply to selection only (thesaurus/rewrite; audit Apply fix always searches document); confirm before Apply; hover tips; FK lock; Version History reminder; continuity warnings (1–5); fiction scope reminder; **hide new-session tips permanently**; optional Gemini session token ceiling (its control is hidden in Simple mode; if it was enabled earlier it still applies, and the error message says where to change it).
- **Audit & reports:** Report depth (Light / Balanced / Dense); default audit filter (All / Critical / Style / Style guide — Simple mode may override to Critical on load when no saved filter); default **Extended checks** (synced with Checks/Audit run toggles). Audit tab shows read-only hints tied to these Settings values.
- **Privacy & diagnostics:** Opt-in anonymous crash reports; manual **Report a problem** (redacted JSON); GitHub fallback link when ingest is not configured.
- **Reference & citations:** Capture reference style from selection; **Verify citations** shortcut when manuscript type and Checks opt-in allow it.
- **Dictionary:** Per-document names/jargon; proper-noun checker skips dictionary terms.
- **Custom style:** Named guide, add-rule fields, rules list, presets, copy rules, bulk import.

**Save now** on Target persists; most fields **auto-save** on change.

**Outputs:** Settings stored in the `.docx` via `Office.context.document.settings`. No direct document mutation from Target alone except dictionary persistence.

---

### Thesaurus (tab 2) — hidden in Simple mode

**Inputs:** Word or short phrase in the field, or empty field + **Search** uses current Word selection (one token, max ~120 chars).

**Behavior:** Calls **Datamuse** (`api.datamuse.com`) for synonyms and antonyms. On network failure, shows placeholder suggestions.

**Output:** Clickable tags. **Document effect:** Replaces the lookup token with the chosen word via the same edit pipeline as audit fixes; respects **selection-only** when that toggle is on.

**Network:** Requires internet; no API key; not Gemini.

---

### Checks (tab 3)

**Primary action:** **Run audit** (same as toolbar and Audit tab). **Extended checks** toggle runs a deeper local pass (fillers, high-frequency words, dash mixing, extra editor heuristics) instead of the standard pass when enabled on **Run audit**.

**Partner tools (guidance only):**

- **F7 / Editor:** Status tip to use Word proofing.
- **Copy for Copilot:** Clipboard export of last audit (works from Checks without opening Audit).
- **Open Audit:** Switches to tab 4.

**PE-43 UX (2.0.0.15, no manifest bump):**

- **Scope (read-only)** chip mirrors Target scope / refresh count.
- **Long-operation warning** (Settings → Onboarding → **Warn before long operations**): Continue / Not now / Don't show again before heavy reads (audit, citation/timeline scan, batch sections).
- **Cancel** during cooperative Word read phases (audit **Reading…** / **Analyzing…**, citation/timeline scan, batch sections between sections).

**Long manuscript tools (optional):**

- **Section loop:** Select next N paragraphs (5–150, default 40); persists section index in document settings.
- **Select next chapter (Heading):** PMAT-style chapter select using Heading 1–3; wraps at end.
- **Section + audit / Chapter + audit:** Select then run audit with current check toggles.
- **Batch section audits:** Up to 8 consecutive section audits; **Cancel batch** sets a flag.
- **Optional: Deep Audit (+1 Gemini):** One Gemini call returning JSON findings merged with local audit (see §4).
- **Build chapter heatmap (local):** Scans up to 40 heading blocks; stores word counts per chapter for display on next audit summary.

**What to check (core toggles):**

- Repetition & redundancy (pleonasms, repeated word pairs)
- Proper noun consistency (Levenshtein-style variants; false positives possible)
- Proofreading & language (spaces, US/UK, style packs)
- AI Detection (heuristic) + Anti-AI Voice (phrase list)—**not proof of AI or plagiarism**

**Fiction modules (only when manuscript type is fiction):**

1. Plot & Chapter Structure  
2. Characterization & Motivation  
3. Dialogue & Viewpoint (POV)  
4. Continuity & Chronology  
5. Plausibility & Evidence  
6. Pacing & Readability  
7. Spoiler Control  

**Timeline scan (beta)** — fiction only; opt-in sub-panel:

- **Spoiler guard (beta):** Cross-check temporal reveals vs chapter scope (heuristic; may false-positive).
- **Scan timeline:** Paragraph-index walk; ordered anchors with **Go to** via `WordSafeNavigator`.
- Findings merge additively into audit cards when you open Audit; does not replace **Continuity & Chronology** module cards from the main audit pass.

**Citation verify (beta)** — Academic, Business, Technical/Journalism only (hidden for fiction):

- Opt-in **Enable citation pattern scan**; style pack Auto / APA-ish / CMOS-ish / Bluebook-lite.
- Optional lightweight **References** section match; explicit **Verify citations** button only (no network).
- **Target → Verify citations** mirrors Checks when eligible.

**Outputs:** Config only until **Run audit** or an explicit timeline/citation scan; then see Audit tab.

---

### Audit (tab 4)

**Purpose:** Run audit, read summary, filter/sort **finding cards**, apply fixes, export reports.

**PE-43:** Tab **badge** shows open issue count after an audit; empty state **Run audit from Checks** CTA; hub progress (**Reading document…** / **Analyzing…**) with **Cancel** (status **Cancelled.**); `:focus-visible` rings on toolbar actions.

**Quick pins:** Manuscript type, scope, critic persona (mirrors Target; changes sync back).

**After audit:**

- **Traffic bar:** Green / yellow / red label from score (5–10 scale, persona-weighted).
- **Mini scores (Balanced/Dense):** Correctness, Clarity, Engagement heuristics.
- **Summary report:** Word count, Flesch metrics, critical vs style counts, profile text, optional “vs last run”, reference-style delta, fiction partial-scope warning, **Manuscript overview** panel (PMAT-style local stats), optional **chapter heatmap** if built on Checks.

**Card filters:** All, Critical (`confirmed`), Style (`preference`), Style guide (session chips; default saved in **Settings → Audit & reports**). **Sort:** Priority or Module. **Report depth** and **default filter:** read-only hints on Audit (single source: Settings selects); change in **Settings → Audit & reports**.

**Per-card actions:**

| Action | Effect |
|--------|--------|
| Go to | `body.search` first match, select in Word |
| Apply fix | Replace first document match (`forceDocument`); continuity + confirm dialogs; ProzaEdit undo stack |
| Local tip | Opens Coach tab with curated tips for that module |
| Dict | Adds first word of target to custom dictionary |
| House rule | Adds style-guide finding to custom rules (Target) |
| Mute | Rule ID to document + browser storage; dismisses target globally |
| Dismiss | Same as mute for card removal |
| Gemini | Prefills Coach with issue prompt if API key present; else local tip |

**Share report:** Copy feedback letter; insert plain text at end of document; export new Word doc (or download `.txt` fallback); PDF via Word Save As guide; reset muted rules.

**Clear report:** Clears UI and cached last audit in document settings.

**Document effects:** Read-only for audit run; **Apply fix**, **Insert report**, and exports write to the document or new document.

---

### Coach (tab 5)

**Local Coach (default, 0 tokens):**

- Text input + optional **mic** (Web Speech API where supported; language from Target).
- Starter buttons: Pacing, POV, Plot, Export tips.
- Answers from `ProzaEdit.LocalCoach`: regex-matched intent tips + general workflow tips; optional selection snippet when “Context: selection only” is checked (Coach always tries to read selection for local messages when that box is checked).

**Optional Gemini:**

- API key field (password); **Remember in this document** stores key inside document settings (user warned).
- **Send via Gemini:** Sends guardrails + profile + optional full body or selection context + question; displays reply in chat log.
- Token estimate shown when key present.

**Document effects:** None from chat alone; card **Gemini** button only fills Coach input.

---

### Rewrite (tab 6)

**Local paraphrase (0 tokens):**

- Requires **highlighted selection** (max ~3,500 chars).
- Modes: Fluency, Formal, Creative, Academic — rule-based transforms (wordiness lists, pleonasms, contractions, register shifts). Shared lists live in `lexical-banks.js`.
- **Advanced lexical shaper** (collapsible, hidden in Simple mode): Complexity / Intensity / Density sliders (1–5), persisted in `PROZAEDIT_CONFIG` (`shaperComplexity`, `shaperIntensity`, `shaperDensity`; defaults 3 / 4 / 2). Calibration stacks **only when the panel is open**; collapsed shaper leaves legacy four modes unchanged. **Reset shaper sliders to defaults** in the panel restores shipped values.
- **Preview** then **Apply preview to selection** replaces selection text (respects selection-only toggle for search scope).

**Optional Gemini rewrite:** Same selection limits; uses `buildRewritePrompt` and guardrails.

**Document effects:** Apply replaces selection (or first match in selection when selection-only mode applies to search).

---

### Help (tab 7)

In-pane quick reference: daily use, Apply fix behavior, mute/dismiss storage, full-manuscript tips, **manifest.hosted.xml** link, Word on the web upload steps, update behavior (push to GitHub vs re-upload manifest), **Check for updates** (compares UI version to raw GitHub manifest), platform notes (web vs desktop Upload), paraphrase attribution, links to **WORKFLOWS.md** and **THIRD-PARTY-ATTRIBUTION.md** on GitHub, **keyboard shortcut cheat sheet** (Settings / Help).

---

### Sticky toolbar (all tabs)

- **Undo / Redo:** ProzaEdit-applied replacements only (session stack, max 40); Ctrl+Shift+Z / Ctrl+Shift+Y.
- **Status line:** Transient messages (~6s auto-clear; **×** dismisses immediately).
- **Run audit:** Same as Checks primary button.
- **Settings modal:** **Filter settings** search hides non-matching groups; Onboarding includes **Warn before long operations** (default on).

---

## 3. Cross-cutting behavior

### Settings persistence

| Storage | What |
|---------|------|
| `Office.context.document.settings` | Full UI config (`PROZAEDIT_CONFIG`, includes `lastActiveTab`, shaper slider values), dictionary, muted rules (document), last audit cache, section/chapter loop indices, chapter heatmap JSON, reference style, custom style guide, continuity index snapshot, optional API key when “remember” is on |
| `localStorage` (browser on this PC) | Global muted rule IDs, globally dismissed target strings, continuity warning dismissals |

Target fields debounce-save (~350 ms). **Save now** forces config write.

### Scope limits and performance

From `scope-reader.js` and `taskpane.js`:

| Scope mode | Character limit (audit) |
|------------|-------------------------|
| selection, pages, chapter (legacy) | 150,000 |
| selected-chapters, chapter-range (legacy) | 200,000 |
| full | 450,000 |

Additional caps: body read up to 1,000,000 chars for index; chat context 3,500; deep audit excerpt 6,000; rewrite selection 3,500; max 15,000 paragraphs for full-doc stats and chapter scan.

Truncation adds a system card suggesting narrower scope. Full manuscript audit warns once per session (sessionStorage).

### Simple vs Advanced

**Simple mode** hides Thesaurus, the lexical shaper and extra tuning (`data-simple-hide`); the shaper is inactive while hidden. The Gemini blocks (`pe-gemini-block`, `pe-ai-help`) stay visible as **AI help (optional)** — off until a key is set, with a route to Settings → Essentials. Core audit, Coach local, Rewrite local remain available. Toggling Simple/Advanced mid-session does not reset anything.

### Analytics, heatmap, overview

- **Manuscript overview** (audit summary): dialogue vs narrative %, motifs, cast names, sensory counts, genre benchmarks, optional rhythm bar chart (Dense/Balanced), stored heatmap embed.
- **Chapter heatmap:** Built explicitly on Checks; stored per document; shown on next audit.
- **Doc stats on full scope:** Paragraph count and rough word estimate when scope is Full.

### Gemini integration (optional)

- Model: `gemini-2.5-flash` via `generativelanguage.googleapis.com`.
- Uses: Coach send, Rewrite via Gemini, Deep Audit, card “Gemini” prefill.
- Guardrails string bans common AI tropes and demands original cadence.
- All Gemini paths require user confirmation and a user-supplied key; key never required for core product.

### Update check

On pane load (once per build version in sessionStorage), fetches raw `manifest.hosted.xml` from GitHub and compares `<Version>` to `PROZAEDIT_BUILD_VERSION`. Help tab **Check for updates** runs manually.

---

## 4. Editorial engines (behavioral depth)

All core audit logic lives in `lib/audit-engine.js` with supporting modules. Audit is **deterministic pattern and metrics logic**, not an LLM.

### Scoring and card types

- **confirmed:** Treated as “Critical” in filters (pleonasms, some POV slips, duplicate words, proper-noun variants, etc.).
- **preference:** Style suggestions, heuristics, most fiction flags.
- Cards capped by **report density** (18 / 60 / 100). Deduped by target text + type.
- **Score:** Starts at 10; subtracts weighted critical and preference counts by critic persona; floor 5.

### Core check modules (`chk*`)

- **Repetition:** Built-in pleonasm list; adjacent repeated word pairs within 50 words.
- **Proper nouns:** Capitalized token extraction; Levenshtein pairs with frequency thresholds; dictionary and stopword filtering.
- **Proofreading:** Double spaces, space-before-punctuation, US/UK word list mismatches vs selected language.
- **Anti-AI voice:** Phrase list (delve, tapestry, moreover, etc.).
- **AI detection (heuristic):** Uniform sentence length variance; phrase + comma-density bundle—explicitly not proof.

### Fiction modules (`m*`)

Examples of real rules (non-exhaustive):

- **Plot:** Specific transition cliché replacement suggestion; weak section endings; harsh-critic “flat middle” phrases.
- **Motivation:** “suddenly”, “somehow”, passive clusters.
- **Dialogue/POV:** Long dialogue lines; first+third person in same paragraph.
- **Continuity:** Multiple time-skip phrases; travel distance vs “instantly”.
- **Plausibility:** Absolutes and unearned claims.
- **Pacing:** Long sentences (threshold depends on persona).
- **Spoiler:** “Little did he know”, “unbeknownst”, etc.

Cross-cutting: **rhythm monotony** (five similar-length sentences in a row), **FK lock**, **sensory weak spot**, audience FK band cards when pacing/spell enabled.

### Extended local pass

When **Extended checks** is on: filler words (actually, very, …), high-frequency word repetition, hyphen/dash consistency, em-dash density, plus `EditorHeuristics.runExtendedChecks`.

### Style guide packs (`style-guide-rules.js`)

Resolves guide list from Target selection; applies phrase flags (Plain, Strunk, GOV.UK, Microsoft, Google, Red Hat) and **custom rules** from `custom-style-guide.js`. Academic/Business/Technical/Journalism **manuscript rules** add type-specific flags (contractions, citations hint, jargon, lede length, setting anchor drift).

### Editor heuristics (`editor-heuristics.js`)

Standard pass: a/an, consecutive duplicate words/phrases, duplicate sentences, quote balance, split compound variants (cannot/can not), and more. Extended pass adds additional consistency scans. Formal tallies (i.e., e.g., etc.) feed overview for academic/business/technical types.

### Continuity guard (`continuity-guard.js`)

Background build of manuscript index (first ~600k chars of body): top proper names and lowercased sample. Before **Apply**, warns if replacement target appears often, looks like a tracked name, or is a spelling-variant edit—sensitivity from Target slider. Dismissals stored in `localStorage`.

### Local coach (`local-coach.js`)

Curated tips by audit module name and by user question regex (POV, pacing, dialogue, Copilot vs Gemini, export, etc.). **forIssue** ties a card to module tips. No document writes.

### Local rewrite (`local-rewrite.js`)

Mode-specific pipelines sharing wordiness and pleonasm lists with audit. No LLM.

### Deep Audit (Gemini)

Reads scoped text (up to 6k chars), asks for JSON array of findings (max ~6–8 merged), merges with local `Audit.run` results, then normal finalize path. One API call per run.

---

## 5. Word integration

### APIs and patterns

- Entry: `Office.onReady`; host must be **Word**.
- All document IO: **`Word.run`** async batches with `context.sync()`.
- **Read:** `document.getSelection().text`, `document.body.text`, paragraph collections with `text` and `styleBuiltIn` (Heading 1–3 for chapters).
- **Search:** `body.search` or `selection.search` with `matchCase: false`; search strings sanitized (max 255 chars; strips regex-special chars).
- **Navigate:** First search hit `.select()`.
- **Write:** `range.insertText(text, Word.InsertLocation.replace)` for fixes; `body.getRange("End").insertText(..., before)` for audit report append.
- **New document export:** `context.application.createDocument()` when supported, else `.txt` download fallback.
- **Section/chapter select:** `paragraph.getRange("Start").expandTo(...).select()`.

### Read-only vs write

| Feature | Read | Write |
|---------|------|-------|
| Audit run | Yes | No |
| Overview / heatmap build | Yes | No (heatmap stored in settings only) |
| Go to | Yes | Selection only |
| Apply fix / Thesaurus / Rewrite apply | Yes | Yes (first match or selection per rules) |
| Undo/Redo | Yes | Yes (swap prior replacement) |
| Insert audit report | Yes | Yes (end of body) |
| Coach / Local tips | Yes | No |
| Gemini | Yes (context) | No |

Word’s own **Undo** still applies to inserts; ProzaEdit undo is a separate stack for its replacements.

---

## 6. Limitations, beta constraints, install notes

**Beta / product honesty**

- Editorial rules are **heuristics**. They will false-flag dialect, dialogue, and genre choices. Use **Mute**, **Dismiss**, and **Dict** liberally.
- AI detection and anti-AI voice flags are **not** forensic AI or plagiarism detection.
- Style guide cards cite public sources but implement **short phrase lists**, not Chicago/AP/MLA compliance.
- No built-in spellchecker—use Word F7/Editor.
- No FRedit-scale batch replace in-box; help points to external macro tools.

**Install (consumer M365)**

- Recommended: **Word on the web** → new blank document → **Upload My Add-in** → `manifest.hosted.xml` ([raw link](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml)).
- Desktop Word often **lacks Upload**; use browser once, same Microsoft account.
- Remove legacy **localhost** sideload entries before switching to hosted manifest.
- **Internet** required for hosted UI; GitHub Pages may cache 1–3 minutes after pushes.
- Re-upload manifest when `<Version>` bumps on GitHub.

**Platforms**

- Works: Word on the web in supported browsers (Windows, macOS, iPad, Android) when signed in.
- Limited: Desktop upload UI; mobile Word without web upload path.

**Install helpers on `main`**

- **`Install-ProzaEdit-Desktop-GitHub.bat`** — downloads [hosted manifest](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) to `Documents\ProzaEdit\catalog\` and prints upload steps.
- **`Fix-ProzaEdit-SharedFolder.bat`** — optional desktop appendix: refresh manifest + local TrustedCatalog (PE-2 **deferred**; web upload is primary — [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md)).
- **`Create-Hosted-Manifest.bat`** and localhost dev server remain under `_archive/local-dev/` only.

**PC-only nuance:** Continuity dismissals and global mutes are **per browser profile on that machine**, not synced across devices. Document dictionary and config travel with the `.docx`.

---

## 7. Local-first vs network

| Capability | Local (0 Gemini tokens) | Network |
|------------|-------------------------|---------|
| Primary audit, extended audit | Yes | — |
| Manuscript overview, metrics, heatmap scan | Yes | — |
| Local Coach, local rewrite | Yes | — |
| ProzaEdit undo/redo | Yes | — |
| Copy for Copilot / feedback letter | Yes | — |
| Thesaurus | Datamuse fetch | `api.datamuse.com` |
| Hosted task pane, Office.js | — | GitHub Pages, Microsoft CDN |
| Check for updates | — | raw.githubusercontent.com |
| Gemini Coach / Rewrite / Deep Audit | — | Google Generative Language API + **your API key** |

**API key storage:** Optional; only saved in document settings when “Remember in this document” is checked. Otherwise key is session-only in the password field until you send.

**Optional token ceiling (Target):** Off by default. When enabled, estimated input+output tokens per browser session are capped before Gemini Coach, Deep Audit, or Gemini rewrite runs.

---

## 8. Developer map (`src/taskpane/lib/*.js`)

Load order is fixed in `taskpane.html`; `taskpane.js` orchestrates UI and Word calls.

| Module | Role |
|--------|------|
| `settings-store.js` | Document settings keys, dictionary, mute/dismiss merge with localStorage, custom style persistence |
| `text-metrics.js` | Syllables, Flesch Reading Ease / FK grade, audience bands, traffic light helper |
| `proper-noun-analyse.js` | Capitalized token extraction and variant pairing |
| `lexical-banks.js` | Shared pleonasm, anti-AI, wordiness, and filler lists for audit + rewrite + shaper |
| `editor-heuristics.js` | a/an, duplicates, quotes, compounds, extended checks, formal tallies |
| `custom-style-guide.js` | Rule normalize, bulk parse, presets |
| `style-guide-rules.js` | Auto guide resolution and phrase packs + custom rule application |
| `audit-engine.js` | Main `Audit.run` pipeline and module-specific passes |
| `doc-analytics.js` | Sentence rhythm, mini scores, reference comparison |
| `chapter-heatmap.js` | Heading-based chapter word counts and HTML bar chart |
| `manuscript-overview.js` | PMAT-style HTML summary and feedback letter builder |
| `report-density.js` | Light / balanced / dense card and overview limits |
| `scope-reader.js` | Scope measurement, chapter listing, paragraph snapshots for engines |
| `continuity-guard.js` | Manuscript index and pre-apply warnings |
| `word-safe-navigator.js` | Search string sanitize (255 cap), scoped search, Go to selection |
| `chronology-engine.js` | Timeline scan v1 — temporal anchors, spoiler guard opt-in, audit card merge |
| `citation-engine.js` | Citation pattern assist v1 — APA/CMOS-ish/Bluebook-lite heuristics, bibliography match |
| `tooltip-registry.js` | Central `data-pe-tip` hover bubbles + Target toggle integration |
| `local-rewrite.js` | Rule-based paraphrase modes (consumes `lexical-banks.js`) |
| `lexical-shaper.js` | Three-axis shaper v1 — stacks local-rewrite passes when panel open |
| `local-coach.js` | Curated coaching responses |
| `gemini-client.js` | Gemini HTTP client and rewrite prompt builder |
| `ai-quota-manager.js` | Optional session token estimate ceiling for Gemini (default off) |
| `report-docx-export.js` | Audit report plain-text build, `.txt` download, `createDocument` export + fallback |
| `edit-history.js` | Session undo/redo stack for ProzaEdit replacements |
| `pe-icons.js` | Shared inline SVG icons for toolbar and audit card actions (UX-1/UX-3) |
| `diagnostics-config.js` | Anonymous diagnostics ingest URL + feature flags (empty URL = client no-op) |
| `diagnostics-reporter.js` | Opt-in crash/error reports with redaction (no document text or API keys) |

**Module count:** **28** files under `src/taskpane/lib/` (load order fixed in `taskpane.html`; `taskpane.js` orchestrates after all libs).

**Version discipline:** Bump `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` together when users must re-register the add-in; UI-only pushes need only GitHub Pages refresh.

**Testing:** GitHub Actions runs `scripts/verify-version-sync.sh` and **`npm test`** (pure JS unit tests — no Office.js) on push/PR to `main`. Still validate behavior manually in Word on the web after changes to `src/` or `assets/`.

---

## Related project docs

- Install: `docs/BETA-TESTERS-INSTALL.txt`, `docs/BETA-SETUP-GITHUB.md`, `docs/WHEN-YOU-RETURN.md`, `scripts/install/README.md`
- Workflows & attribution: `docs/WORKFLOWS.md`, `docs/THIRD-PARTY-ATTRIBUTION.md`
- Release notes: [RELEASE-NOTES-2.0.0.15.md](RELEASE-NOTES-2.0.0.15.md)
- Roadmap: [prozaedit-implementation-plan-audited.md](prozaedit-implementation-plan-audited.md) · [Approved scope vs vNext](prozaedit-approved-scope-vs-vnext.md)
- Engineering map: [prozaedit-codebase-overview.md](/cursor/stores/self/docs/prozaedit-codebase-overview.md)
- Source of truth: [source-of-truth.md](/cursor/stores/self/docs/source-of-truth.md)

---

*Feature reference aligned to repository `main` and task pane build 2.0.0.15.*
