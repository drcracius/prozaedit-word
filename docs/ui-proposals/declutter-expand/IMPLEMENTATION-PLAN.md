# Declutter + expandable reports — implementation plan

**Status:** Plan only. Incremental changes on real `src/taskpane/*`. No production JS swap.

**Approved to start:** Pass 1, then Pass 2a. Pass 2b is optional (scan UX, not word count). Pass 3–4 after that. Pass 5 last and light.

**Baseline:** hosted **2.0.0.30** (Desktop and web, same pane).

**Copy rule:** Remove or fold **duplicates** only. Do not delete a unique fact to hit a percentage. Prefer one closed **Tips** (or Help details) over rewriting Help down to a stub.

**First screen (this revision):** Cut as much **visible chrome text** as possible. Use the existing 16px stroke SVGs in `pe-icons.js` (add a few matching paths if needed). No emoji, no icon fonts, no Google Fonts. Unique facts stay in Tips / Help / `aria-label` / tooltips — they leave the open canvas, they are not deleted.

---

## Five audits (2026-11-04, this round)

Earlier audits already fixed: do not hide the status line when it is building an outline; do not put live regions in closed Tips; keep `#summaryReport` on the inner node; Pass 2b breaks `cardContainer.children` tests; folding ≠ deleting stored words.

### 1. Duplicate vs unique

The pane is verbose because the **same workflow is told many times**, not because each sentence is useless.

**Safe to fold or drop from the open canvas:** Quick start stack, Start-here callout, scope-mode hint (repeats `<select>`), extra “scope first” line, static Dictionary badge, three Audit hint paragraphs that repeat chips/Settings, Checks partner-tools sentence that points at Quick start.

**Not duplicates — keep (fold if long, do not erase):** dictionary / mute / dismiss persistence; Track Changes caveat; Confirm-before-Apply; cloud/AI “what happens to my text”; Datamuse and voice-dictation disclosures; experimental AI-phrasing disclaimer; style-guide attribution; ~2,800 characters-per-page near the page fields; genre blurb (`#peGenreBlurb`, live); long-op warning; About version ids.

**50% is a screen target, not a quota.** First paint can drop ~half by hiding repeats. Do not halve Help, Settings labels, or error strings to match that number.

### 2. Must-keep (legal, safety, a11y, offline)

Keep in the **pane**, not only on GitHub: Privacy facts, dictionary vs mute vs dismiss, Track Changes, AI/key storage, diagnostics off-by-default.

Keep as **accessible names** (visible label or `aria-label`): toolbar buttons, Settings/Checks `aria-labelledby` spans. Do **not** move meaning into `title` / tooltip only.

Keep `aria-live` nodes as siblings, not inside closed Tips: `#peWorkflowNextStep`, `#peWorkflowStatusLine`, `#peFullManuscriptScopeTip`, `#peGenreBlurb`, `#scopeCharPreview`.

Closed `<details>` is fine for extra reading. It is not a substitute for a fact the writer must see before they click (Apply, AI send, mic).

### 3. Hide chrome, not functions

Closing **Manuscript profile** in Simple would hide **What are you writing?** (`#manuscriptType` + `adaptModules()`). That is a function, not a hint.

**Pass 2a:** keep `#manuscriptType` (and the short `#peGenreBlurb`) visible. Fold jargon, audience, setting, critic inside the profile `<details>`, closed in Simple.

Do not remove scope `<option>` wording, Run report hubs, Audit pins, or Checks toggles in Pass 1. Do not replace toggle rows with a new list widget.

**Recommended** (`#peTargetRecommendedHint`): keep the id. Do not leave a paragraph on first paint. Chapter-first advice stays in Help (and optionally one short line). Do not delete the idea.

### 4. Blast radius

| Work | Does it cut visible words? | Ship? |
| --- | --- | --- |
| Pass 1 fold duplicates into Tips | Yes — first paint | **Yes** |
| Pass 2a Summary `<details>` + share row | Some Audit chrome | **Yes** |
| Pass 2b lane groups | No (structure only) | **Spike only if owner wants scan UX** |
| Pass 3 quieter secondary nav | Little | After 1–2a |
| Pass 4 Help: delete **repeated** paragraphs; fold the rest | Stored count falls only for true dupes | After chrome is quiet |
| Pass 5 JS strings | Only leftover dupes | Optional, light |

Do not add Export/Copilot controls. Do not build a banner queue in Pass 1. Do not add a declutter What’s new banner.

### 5. Plan and metrics

Prior plan still talked like Help should be halved to reach ~2,150 stored words. That fights audits 1–2.

**Count visible first paint**, not stored HTML, as the success metric for Pass 1. Stored count is a **side log**, not a gate, until Pass 4 deletes real duplicates.

**First paint:** see **First screen** below. Aim for **~20 visible chrome words** (data values in badges/selects extra). Do not hide `#manuscriptType`. If pills + tabs still shout, Simple hides the tab **words** (not the tablist from assistive tech) in Pass 1 — do not wait for Pass 3.

---

## What to steal (patterns only)

Icon + title + one subtitle; fold extra reading; reports stay in the pane; PDF via Word (no `window.print()`); rail width-gated at ≥420px.

**Skip:** login, streaks, premium banners, Google Fonts, `100vh` lock, competitor class names.

**Hard constraints:** `--pe-*` + dark theme; Segoe / system / optional Georgia headings; offline-first; wiring + contrast + tests; never claim real-Word Apply/Track Changes.

---

## Onboarding (one open lesson)

Pass 1 does not queue banners. Do not add another teaching surface.

If several already want to show: long-op (blocking) → What’s new → Simple first-run → prior session → session tips. **Tips** stays closed until the writer opens it.

Session tips: keep, but do not repeat the Tips body. Two bullets is enough later (Pass 4); Pass 1 can leave them if still hidden by default.

Tour still anchors `#scope`, `#btnRunAudit`, `#cardContainer`.

Privacy after the trust line is folded: Help → Privacy and Settings → Privacy (`#pe-settings-group-privacy`, hash `#pe-settings-privacy`) stay obvious. **Keep the trust facts** in Tips and in Help privacy — do not keep them on every screen.

---

## First screen — as few words as possible

**What “first screen” is:** Simple first-run, Tips closed, no banner. Wordmark + chrome + Target through **scope**, **Refresh**, and **What are you writing?** (`#manuscriptType`). Exclude Help/Settings, profile extras, clipped status line.

**Today (why it feels loud):** pills name every step; toolbar repeats those names; tabs repeat them again; badges say Guide / Scope / Dictionary; Quick start summary is visible even when closed; Start here + scope hint + scope-mode essay + Recommended (Simple) + the default Full-manuscript tip (shown because Full is the default). Roughly **110+** chrome words before the writer picks anything.

**Note:** `pe-narrow-pane` (<360px) only shrinks toolbar label size. It does **not** hide those words. Icon-only is new work.

### After (open canvas)

```
[wordmark]
[ 1 ◎ ] [ 2 ✓ ] [ 3 ⚡ ] [ 4 ✎ ]          ← numbers + icons; no “Target/Checks/…”
[ guide-icon Auto ] [ scope-icon Full ]   ← live values only; no “Guide/Scope” words
[ ↩ ] [ ↪ ] [ ⌖ ] [ ⚙ ] [ ⚡ Run ]       ← icon-only tools; keep one verb on Run
[ Tips ▾ ]                                ← icon + one short word (or icon + sr-only)
[ tabs: visually quiet / icon or one letter in Simple; full words in Advanced ]

Scope          [ Full            ▾ ]
[ ↻ ]  —                                        ← Refresh icon; preview empty until counted
Type           [ Fiction — General ▾ ]
```

No Start here, no Recommended paragraph, no scope-mode essay, no trust line, no Dictionary badge, no “Quick start & editing stack” summary text, no Full-manuscript tip on every load.

### Word budget (visible chrome)

| Bit | Today | After | How |
| --- | ---: | ---: | --- |
| Pills | ~8 | **0** | Number + `pe-icons` (pin / check / flash / edit). `aria-label` keeps “Target”, “Checks”, “Run report”, “Fix cards”. |
| Toolbar | ~6 | **1** | Hide `.btn-tool-icon-label` at **all** widths. Keep existing `aria-label` + `data-pe-tip`. Leave the word **Run** on the accent button. |
| Badge captions | ~5 | **0** | Drop Dictionary badge. Guide/Scope: icon + live value (`#peBadgeGuide` / `#peBadgeScope` stay). |
| Tips / Quick start summary | ~5 | **1** | `#peChromeHelp` summary = help icon + “Tips”. |
| Tabs (Simple) | ~6 | **0–6** | Visually deemphasize or icon-only; do not `display:none` the tablist. Advanced keeps words. |
| Start here + hints + Recommended + default Full tip | ~80 | **0** | Move static copy into Tips. Do not show `#peFullManuscriptScopeTip` just because scope is Full — only after Refresh if the count is large. Keep `#peTargetRecommendedHint` id; do not show the paragraph. |
| “Analysis scope” / “What are you writing?” | ~6 | **2** | Labels **Scope** and **Type**. |
| Scope options | ~15 | **~4** | Visible selected option stays; shorten option **labels** (not values): Selection, Pages, Chapters, Full. Title/tooltip can hold “Heading 1–3” / “~2,800 characters”. |
| Refresh count + empty preview | ~10 | **0** | New `refresh` icon; `#scopeCharPreview` default `—` or empty. Live count text is data, not chrome. |

**Aim: ~20 chrome words.** Live badge/select values (e.g. “Fiction — General…”, “Auto”) sit on top of that. Do not rename manuscript types.

### Icons (`pe-icons.js` only)

Reuse: `undo`, `redo`, `flash`, `pin`, `check`, `edit`, `settings`, `chevron-down`.

Add matching 16px stroke paths (no new style): `refresh`, `book` (guide badge), `help` (Tips). Scope badge can reuse `pin` or a small `file` path if `pin` is already Last edit.

Do not use emoji (the Coach mic is a leftover; do not copy that pattern). Rail icons stay as they are.

### A11y for icon chrome

Every icon control keeps a **visible-or-sr name**: `aria-label` or a `.visually-hidden` word. Existing tooltip keys stay. Contrast: icons use `currentColor` on `--pe-*` tokens; dark theme must still pass `check:contrast`. Hit target stays ≥32px (toolbar already does).

Pills stay `role="button"`. Tabs stay a tablist. Do not replace `#scope` or `#manuscriptType` with icon wells.

### What still appears as words (on purpose)

- **Run** on the accent tool
- **Tips** (one word) so Help is findable without guessing the icon
- **Scope** / **Type** labels
- The **selected** scope and type (data)
- Live badge values
- Character count **after** Refresh
- Any open banner (What’s new, long-op) — not part of this budget

### What never becomes icon-only

Apply / Mute / Dict on cards; Settings toggle names; Privacy; Track Changes; cloud/mic disclosures; error and confirm text.

---

## Navigation

| Mode | Hero | Secondary |
| --- | --- | --- |
| Simple | Icon+number pills | Tab **words** visually quiet (icon or sr-only). Tablist stays in the accessibility tree. |
| Advanced | Tab words | Pills compact (icon+number) |

Do this in **Pass 1** for Simple first paint. Pass 3 only polishes size/spacing. No footer tab bar.

---

## Pass 1 — Quiet first screen (fold + icons)

**Goal:** First paint is icon chrome + Scope + Type + **Run**. Same ids and handlers.

**1a — Fold duplicate prose**

1. Closed `<details id="peChromeHelp">`: trust line, Quick start & editing stack (attribution stays inside), Start-here callout, extra scope hint, scope-mode hint.
2. Do **not** move live ids into Tips (`#peWorkflowNextStep`, `#peWorkflowStatusLine`, `#peFullManuscriptScopeTip`, `#peGenreBlurb`, `#scopeCharPreview`).
3. Drop the static Dictionary badge. Keep Guide/Scope **values**.
4. Leave `#peWorkflowStatusLine` clip-when-static / show-when-building.
5. Stop showing `#peFullManuscriptScopeTip` on every Full default. Show only after Refresh when the count is large (or leave hidden; the sentence lives in Tips).
6. Keep `#peTargetRecommendedHint` hidden on the canvas (id + JS stay).
7. Update Checks “Quick start & editing stack above” to **Tips**.

**1b — Icons (same pass; this is the word cut)**

1. Pills: number + icon; hide the four step **words**. Keep `aria-label`.
2. Toolbar: hide `.btn-tool-icon-label` at all widths; keep **Run** on the accent control.
3. Badges: icon + value; no “Guide” / “Scope” captions.
4. Tips summary: help icon + “Tips”.
5. Simple: visually quiet the tab words (CSS). Do not remove tab buttons.
6. Labels: **Scope**, **Type**. Shorten `#scope` option labels (values unchanged).
7. Refresh: icon-only (`refresh` path). `#scopeCharPreview` default empty/`—`.
8. Add only the SVG paths listed above. Reuse `PeIcons.svg`.

**Exit:** ~20 visible chrome words on Simple first paint. `#scope`, `#manuscriptType`, Run report, and Tips still obvious. No unique safety/privacy fact gone. Contrast + wiring + existing toolbar/pill click tests.

---

## Pass 2a — Report chrome

1. Wrap `#summaryReport` in `<details class="pe-report-block" open>`. **Id stays on the inner node.**
2. Share/Export: reuse existing handlers. Extra actions in closed **More**. No new Copilot/export button.
3. Profile extras closed in Simple; **`#manuscriptType` stays visible.**
4. Fold the three Audit hint paragraphs into one short line (keep ids if JS writes to them). Keep chip labels.

**Exit:** Cards still a flat list in `#cardContainer`. Apply/undo/dismiss unchanged.

---

## Pass 2b — Lane groups (optional spike)

Does not remove words. Only if long reports are hard to scan.

Chips still filter (`confirmed` / `preference` / `styleguide` / `all`). Group wrappers must **not** use class `card`. Update walk tests to count `.card`. Empty state, cap note, and tour on `#cardContainer` must survive `innerHTML` redraws.

---

## Pass 3 — Visual polish

Spacing and token tweaks after the icon chrome is in. Contrast must pass. Do not rebuild Checks checkboxes. Rail unchanged. Do not add a second icon language.

---

## Pass 4 — Help and Settings (judicious)

**Goal:** One Start-here list on Help; everything else that is still unique sits in closed details. Delete only paragraphs that repeat Tips, Checks, or Settings.

Keep ids: `#peHelpNewToEditing`, `#peHelpNewToEditingList`, `#peFirstAuditChecklistHelp`, `#peHelpPrivacySummary`, `#peHelpGotoTroubleshoot`, `#peHelpSupportSummary`, About version/manifest/add-in id, Check for updates.

Merge the three install/update Help blocks into one **Install & update** details.

Settings: shorten **group lead-ins** that repeat Essentials. Do not shorten toggle labels by moving clauses into `title`. Keep every control and `pe-settings-group-*`.

Cloud disclosures on Coach/Rewrite: keep; they can stay inside existing AI `<details>`.

Refresh What’s new only if testers will see this pass.

**Exit:** Writer still finds Privacy, About, install, Track Changes, and dictionary rules offline. Stored HTML count may drop; it is not a 50% gate.

---

## Optional Pass 5 — JS strings

Only strings that still duplicate Tips/Help after Pass 4 (next-step, tour bodies). Do not shorten failures, confirm-Apply, or legal/privacy messages.

---

## Order, tests, version

Each shipped pass: `npm test`, `verify:wiring`, `check:contrast`. Stay on **2.0.0.30** until testers need About/manifest to prove a refresh (**2.0.0.31**).

Log first-paint visible words after Pass 1. Log stored `taskpane.html` words after Pass 4. Folded details still count as stored.

One `src/taskpane/*` on GitHub Pages for Desktop and web.

---

## Must still work

Wiring ids: `#scope`, `#summaryReport`, `#cardContainer`, `#peWorkflowNextStep`, `#peWorkflowStatusLine`, `#peOverheadBadges`, `#manuscriptType`, `#peHelpNewToEditing`, About and Settings group ids.

Target scope + Refresh count; outline progress on the status line; overlay inert on Settings/confirm/tour; Audit apply/dismiss/mute/dict/export; Simple hides Thesaurus, not manuscript type; light and dark contrast.

Apply / Track Changes remain **mock-tested only**.

---

## Owner checklist

- [ ] Narrow and typical Desktop (~350px): Tips closed; icon pills + icon toolbar; **Scope**, **Type**, and **Run** obvious; no Start here / Recommended / trust line on the canvas.
- [ ] Icon-only tools still announce (hover tip + screen reader).
- [ ] Wide pane: rail unchanged; no extra export/Copilot.
- [ ] Trust / mute / dismiss facts still in Tips or Help Privacy (not gone).
- [ ] Book outline progress still appears.
- [ ] One audit run: cards still Apply/Dismiss (Word Apply not claimed verified).
- [ ] About **2.0.0.30** (or **2.0.0.31** if bumped). Ctrl+F5 after Pages. Re-upload manifest only if About lags.

---

## Docs and rollback

Update [QUICK-START.md](../../QUICK-START.md) and [pe-ui-design-notes.md](../../pe-ui-design-notes.md) after chrome settles. Version docs only if the build number changes. Do not rewrite [HANDOFF-DESKTOP.md](../../HANDOFF-DESKTOP.md) for copy-only UI.

Rollback: revert on `main`, Pages, Ctrl+F5. No force-push.

---

## Risks

- Do not remove wiring ids (hide is fine).
- Do not put live regions in closed Tips.
- Do not `100vh` / `overflow: hidden` on `body`.
- Do not claim in-pane PDF.
- Do not close `#manuscriptType` inside Simple-only details.
- Do not delete attribution, cloud, or Track Changes copy.
- Do not start Pass 2b without a spike, and do not treat it as declutter.
