# Declutter + expandable reports — implementation plan

**Status:** Passes **1, 2a, 3, 4, 5** are **implemented** on branch `cursor/pe-declutter-first-screen` (build **2.0.0.30**, pushed). **Pass 2b** not scheduled. **Pending owner:** merge to `main` / Pages, real-Word smoke, optional **2.0.0.31** bump.

**Restore:** tag `pe-pre-declutter-2.0.0.30` (`b4ea7d3` on `main`) — pre-declutter pane on `main` until merge.

**Copy rule:** Fold or drop **duplicates** from the open canvas. Do not delete unique facts. Prefer Tips / Help `<details>` over slashing Help to a stub.

**Icons:** 16px stroke SVGs in `pe-icons.js` only. No emoji, icon fonts, or Google Fonts.

---

## Frozen decisions (no “or” left)

| Topic | Decision |
| --- | --- |
| First-screen success | Simple first-run, Tips closed, no banner. Count **visible chrome words**, not stored HTML. Aim **~20 chrome words** plus live select/badge values. |
| Pills | Number + icon. Visible word in `.visually-hidden`. `aria-label` matches (Target, Checks, Run report, Fix cards). One strategy — not “hide or aria-only.” |
| Toolbar | Hide `.btn-tool-icon-label` at **all** widths. Keep **Run** on the accent button. Existing `aria-label` + `data-pe-tip` stay. |
| Tabs in Pass 1 | **Keep one-word tab labels.** Hide `.pe-tab-hint` with CSS (Simple currently *adds* hint words). Do not icon the tablist in Pass 1. |
| Badges | Drop Dictionary badge. Guide/Scope: `book` / `file` icon + live `#peBadgeGuide` / `#peBadgeScope` values. Captions “Guide”/“Scope” become `.visually-hidden`. |
| Tips | One closed `<details id="peChromeHelp">` after badges, before the sticky toolbar. Summary = `help` icon + **Tips**. |
| Trust / Quick start / Start here / scope hints | Move **static** nodes into Tips. Keep ids/classes. Flatten the old Quick start `<details>` — **do not nest** `<details>` inside Tips. |
| Live regions | Never inside Tips: `#peWorkflowNextStep`, `#peWorkflowStatusLine`, `#peFullManuscriptScopeTip`, `#peGenreBlurb`, `#scopeCharPreview`. |
| Next-step line | Keep `#peWorkflowNextStep`. **Do not unhide** in Pass 1 (`updateWorkflowNextStepHint` must leave it `hidden`). Copy is in Tips. Today it would otherwise appear on every session before the first audit. |
| Recommended | Keep `#peTargetRecommendedHint`. `applySimpleMode` **always** leaves it hidden. |
| Full-manuscript tip | Keep the id. Show only after Refresh when mode is `full` **and** `lastScopePreviewChars >= LongOp.WARN_MIN_CHARS` (80 000). Do **not** use 0.85 × 450 000 (that almost never fires). Hidden on first paint. Sentence also in Tips. |
| Type on first screen | **Pass 1** lifts `#manuscriptType` + `#peGenreBlurb` **above** the profile `<details>` (today they sit inside it). Pass 2a only folds the extras. |
| Status line | Unchanged clip-when-static / show-when-building. |
| Scope `<select>` | **Values unchanged.** HTML labels: Selection, Pages, Chapters, Full. Longer explanations live in **Tips only** — **do not** add `title` on `#scope` (it would fight `data-pe-tip`). |
| Simple option labels | `updatePlainLanguageScopeSelect` overwrites options in Simple (default first-run). Pass 1 must set `PlainLanguage.scopeSelectOptionLabel` to the **same short words** and update `tests/plain-language-helpers.test.mjs`. Otherwise Simple puts long labels back. `cloneSelectOptions` copying to `#pinScope` is intended. Badge JS may still say “Full manuscript” / “Whole document”. |
| Labels | `Scope` (`for="scope"`), `Type` (`for="manuscriptType"`). |
| Type control | Always visible (Simple and Advanced). Not inside a closed profile. |
| Genre | Keep live `#peGenreBlurb`. Move the static fiction/academic paragraph into Tips (Pass 1). |
| Refresh | Icon-only (`refresh`). `aria-label="Refresh count"`. Add `data-pe-tip` + one tooltip-registry key. `#scopeCharPreview` default `—`. |
| Toolbar Run word | Visible label **Run** (not “Run report”). `aria-label` stays “Run report”. |
| Genre blurb | Live one-liner allowed **outside** the ~20 chrome budget. |
| Save now | Keep the button (function). Hide the auto-save helper sentence (duplicate of behaviour). |
| New icon paths | `refresh`, `book`, `help`, `file` — same stroke as existing paths. |
| Pass 2b | **Out of the default sequence.** Spike only if the owner asks. |
| Pass 3 | Spacing/tokens only. Quieter Simple tab type **only if** the owner still finds dual nav loud after Pass 1. |
| Banners | Pass 1 does **not** change What’s new / Simple / session / long-op banners. They sit above the quiet canvas until dismissed. |
| Target order after Pass 1 | Scope primary (label, select, full tip, preview, Refresh) → `#scopePagesPanel` / `#scopeChapterPanel` (when mode on) → `#peMciTargetBlock` (`data-simple-hide`) → Type + `#peGenreBlurb` → profile `<details>` (jargon, audience, setting, critic only). Language + Style stay **below** profile (scroll; not first-screen chrome). **Reorder** panels in HTML if they still sit below MCI today. |
| Simple profile `<details>` | **Pass 1:** when Simple is on, `applySimpleMode` removes `open` from `.pe-target-section` every time (summary line off first paint). Advanced: do not force open/closed. |
| Full tip after Refresh | Call `updateFullManuscriptScopeTip()` at end of `updateScopeCharPreviewDisplay` (today only scope **mode** changes re-run it — Refresh would miss the 80k gate). |
| Status line first paint | Add `pe-workflow-status-static` on `#peWorkflowStatusLine` in HTML so the long default sentence does not flash before `updateWorkflowStatusLine()` (badges carry Guide/Scope). |
| Pills icons (locked) | Step 1 `pin`, 2 `check`, 3 `flash`, 4 `edit` (paths already in `pe-icons.js`). |
| Workflow pills list | `aria-label="Workflow steps"` (was “Quick start”). |
| Scope option labels | **Advanced** `dataset.peOriginalLabel` from HTML short labels below. **Simple** `scopeSelectOptionLabel` must match exactly. |
| Fiction/academic static line | Move `<p class="help-inline">` after `#peGenreBlurb` into Tips; optional id `peGenreStaticHint` for tests. |
| Auto-save line | Hide the paragraph after **Save now** (`class="hidden"`). Keep `#btnSaveTarget`. |
| Simple mode line on Target | Hide `.pe-target-simple-mode-line` in Simple only (CSS); Essentials toggle remains in Settings. |
| Checks cross-link | Tab 3 partner-tools sentence: “Quick start & editing stack above” → **Tips**. |
| What’s new | Pass 1–3 **do not** edit `WHATS_NEW` / banner copy. Owner dismisses or refresh in Pass 4 if needed. |
| Tour anchor | Onboarding tour still targets `#btnRunAudit` on Checks — unchanged in Pass 1 (toolbar Run is not the tour anchor). |
| Inline icons | Pills, badges, Tips, Refresh SVGs are **inline in HTML** so they paint before JS. Still add the same paths to `pe-icons.js` for reuse. |
| Version | Stay **2.0.0.30** per pass. |
| PDF | Word still makes the PDF. No `window.print()`. |

### Phase readiness

| Phase | Code on branch | Owner / release |
| --- | --- | --- |
| **Pass 1** | **Shipped** | Pane check; merge when accepted |
| **Pass 2a** | **Shipped** | Same |
| **Pass 3** | **Shipped** | Same |
| **Pass 4** | **Shipped** | Same |
| **Pass 5** | **Shipped** (light) | Same |
| **Pass 2b** | **Not started** | Ask for spike only |

---

## Phase map

```
Pass 1  Quiet first screen (fold + icons)     ✓ on branch
Pass 2a Audit chrome + Type stays visible     ✓
Pass 3  Spacing / contrast (small)            ✓
Pass 4  Help + Settings: delete repeats only  ✓
Pass 5  Duplicate JS strings (light)         ✓
Pass 2b Lane groups (optional spike)          — not scheduled
```

Stop after each pass: tests + owner look at the pane. Do not start the next pass until they say so.

---

## Pass 1 — Quiet first screen

**Goal:** Open canvas is wordmark, icon pills, icon toolbar + **Run**, two value badges, **Tips**, tabs, **Scope**, **Type**, **Run**.

### Files

| File | What |
| --- | --- |
| `src/taskpane/taskpane.html` | Tips wrap (flat, not nested details); move static blocks; lift Type + blurb above profile; icon pills; badge captions; labels; option labels; Refresh icon button; drop Dictionary badge; toolbar visible word **Run**. |
| `src/taskpane/taskpane.css` | Hide `.btn-tool-icon-label` except `.btn-tool-icon-label-keep` on Run; pill words via `.visually-hidden`; badge captions `.visually-hidden`; hide `.pe-simple-mode .pe-tab-hint`; Tips density. |
| `src/taskpane/lib/pe-icons.js` | Add `refresh`, `book`, `help`, `file`. |
| `src/taskpane/lib/tooltip-registry.js` | One key for Refresh count. |
| `src/taskpane/lib/plain-language-helpers.js` | Short `scopeSelectOptionLabel` strings (or Simple undoes Pass 1). |
| `src/taskpane/taskpane.js` | Recommended always hidden (`applySimpleMode`: stop toggling Recommended on in Simple). Next-step always hidden (`updateWorkflowNextStepHint`: always `hidden`). Full tip = Full + count ≥ 80 000; hook after Refresh. Simple: close `.pe-target-section`. Hide/show with **`class="hidden"`** (not the HTML `hidden` attribute). |
| `tests/plain-language-helpers.test.mjs` | Expect the short option labels. |
| `tests/taskpane-behavior.test.mjs` | Tips closed; moved ids inside; pills `aria-label`; Recommended hidden in Simple; Type not inside `.pe-target-section`; next-step has `hidden`. |

### HTML moves (keep ids)

Into `#peChromeHelp` (closed):

- Current “Quick start & editing stack” `<details>` body (attribution included)
- `#peDocScopeTrustLine`
- `.pe-target-callout`
- `.pe-target-scope-hint`
- `.scope-mode-hint`
- Static fiction/academic paragraph (`#peGenreStaticHint` or un-id’d `p.help-inline` after blurb — not `#peGenreBlurb`)

Stay as siblings (not in Tips): next-step, status line, Full tip, genre blurb, char preview, Recommended (hidden).

**Scope block:** rename label **Analysis scope** → **Scope**; set four `<option>` visible text to **Selection**, **Pages**, **Chapters**, **Full** (values unchanged). Refresh button: `id="btnRefreshScopeCount"`, `data-pe-tip="btn-refresh-scope-count"`, icon-only.

**PlainLanguage** short map (must match HTML + tests):

| `value` | HTML / Simple label |
| --- | --- |
| `selection` | Selection |
| `pages` | Pages |
| `selected-chapters` | Chapters |
| `full` | Full |

Checks partner-tools sentence: change “Quick start & editing stack above” → **Tips**.

### Pills markup (pattern)

Keep `data-workflow-step`, `role="button"`, tabindex, existing click. Inline SVG in HTML is OK.

Each pill: `aria-label="…"`, number, icon, and the old word in `.visually-hidden` (so name and label agree).

### JS (minimal)

- `applySimpleMode`: `#peTargetRecommendedHint` **always** `classList.add("hidden")` (today Simple *shows* it — invert that). When Simple: `document.querySelector(".pe-target-section")?.removeAttribute("open")`.
- `updateWorkflowNextStepHint`: leave `#peWorkflowNextStep` `hidden` (keep helper calls; no-op unhide).
- `updateFullManuscriptScopeTip`: show only if `getScopeMode() === "full"` and `lastScopePreviewChars >= ProzaEdit.LongOp.WARN_MIN_CHARS`. Else hidden. Call from `updateScopeCharPreviewDisplay` after `lastScopePreviewChars` updates.
- No other behaviour changes.

### Tests / gates

`npm test`, `verify:wiring`, `check:contrast`. Existing pill click tests (`data-workflow-step`) and badge text tests stay green. Wiring still finds `#peDocScopeTrustLine`, `#peWorkflowNextStep`, `#peTargetRecommendedHint`, `#scope`.

### Exit / owner

Narrow (~350px) and wide pane: no Start here, trust line, Recommended paragraph, or Quick start summary on the canvas. **Scope**, **Type**, **Run**, **Tips** obvious. Icon tools still have hover tips. About still **2.0.0.30**.

---

## Pass 2a — Audit chrome (after Pass 1 accepted)

**Goal:** Shorter empty Audit. Cards stay a flat list.

### Files

`taskpane.html`, `taskpane.css`, `taskpane.js` (profile fold only — Simple profile close is **Pass 1**).

### DOM

1. Wrap existing `#summaryReport` **div** in `<details class="pe-report-block" open><summary>Summary</summary> … </details>`. **Do not move the id** to the `<details>`.
2. Keep all three hint **ids** (JS writes `innerHTML`). **Only `#auditReportDepthHint` stays visible.** `#auditDefaultFilterHint` and `#peAuditFilterLanesHint` get **`class="hidden"`** (JS may still update text). Chips stay visible.
3. Share: keep class `audit-share`; rename summary **Share report** → **More**; same six buttons + handlers inside. **Copy for Copilot** and **Clear report** stay on the Audit toolbar (already there). Do not add toolbar export buttons. Shortcut rail unchanged.
4. Type is already above profile after Pass 1. Profile `<details>` contains only jargon, audience, setting, critic. Simple closed state is Pass 1; Pass 2a does not change that rule.
5. Do not nest `#cardContainer` children.

### Tests

Export/copy still callable. `#summaryReport` textContent still matches chapter-walk / filter tests. `#manuscriptType` not inside closed Simple details.

### Exit

Audit empty state shorter. Apply/Dismiss unchanged.

---

## Pass 2b — Lane groups (optional, not scheduled)

**Do not implement unless the owner asks.** It does not cut words.

Spike must prove: Apply/Dismiss/Go to/Mute/Dict; cancel mid-render; 300-card hitch not worse; unique ids; `.pe-card-cap-note`; tour `#cardContainer`; `pe-94-walk` / `pe-84` count `.card` not `children.length`. Group wrappers must not use class `card`. Honor current chip (`confirmed` / `preference` / `styleguide` / `all`).

---

## Pass 3 — Polish (after 2a)

| Do | Do not |
| --- | --- |
| Slightly richer `--pe-card-shadow` / pill tint if contrast passes | New colour system, CDN fonts, `100vh` lock |
| If first screen still feels dual-nav: smaller tab type in Simple only | Hide tablist from AT; footer tabs; new icon set |
| Leave rail width-gated | Rebuild Checks `toggle-row` |

Exit: same flows, tighter spacing. Contrast 0 failures.

---

## Pass 4 — Help and Settings (judicious)

**Goal:** One Start-here list; unique facts in closed details; **delete only repeats**. Not a 50% stored-word gate.

### Help keep (open or one click)

| Block | Action |
| --- | --- |
| About + version ids + Check for updates | **Keep open** |
| Start here (3–5 bullets) | **Keep open**. **Drop** the separate “Quick start (2 min)” heading; keep the GitHub link under Start here. |
| `#peHelpNewToEditing` + list | Keep (JS fills) |
| `#peHelpPrivacySummary` | Keep; add the trust-line facts here if not already |
| Dictionary `<details>` + Mute/Dismiss paragraph | Keep (unique) |
| Track Changes paragraph | Keep |
| `#peHelpGotoTroubleshoot` | Keep |
| `#peHelpSupportSummary` | Keep |
| Install: merge “Another computer”, “Update after code changes”, “Updates & install” into one **Install & update** details | Fold, do not lose upload-on-blank-doc |
| Diagnostics + Platforms | One closed **Diagnostics & platforms** details |
| Paraphrase Help box | **Closed details on Help** (Rewrite already has its own one-line intro). Keep the “no third-party API” fact. |

### Help delete (repeats Tips / Start here / Settings)

- “Analysis scope (Target):” essay (repeats Tips + select)
- “Run audit: Target → Checks → …” (repeats Start here)
- “Settings (toolbar gear):” inventory (repeats Settings)
- “Full manuscript:” one-liner (**delete** — Tips already has it)
- Duplicate Rewrite paragraphs (keep **one**)
- “Look & navigation”: **drop** the stale sticky-line sentence. Keep at most one clause that Light/Dark is in Settings → Appearance.

### Settings

Remove `.pe-settings-intro` (repeats Essentials). Hide `#peSimpleModeEssentialsIntro` (the toggle label already says it). **Do not** shorten `aria-labelledby` toggle labels. Keep every control and `pe-settings-group-*`. Keep `#peAiTextSummary` and cloud disclosure.

### IDs that must remain

`#peHelpNewToEditing`, `#peHelpNewToEditingList`, `#peFirstAuditChecklistHelp`, `#peHelpPrivacySummary`, `#peHelpGotoTroubleshoot`, `#peHelpSupportSummary`, `#peAboutBuildVersion`, `#peAboutManifestVersion`, `#peAboutAddInId`, `#pe-settings-privacy` hash.

### Exit

Privacy, About, install, Track Changes, dictionary rules still in the pane offline.

---

## Pass 5 — JS strings (optional)

Trim only strings that still duplicate Tips after Pass 4: tour bodies in `onboarding-helpers.js` if they still say “Run audit” vs “Run report”; workflow next-step if it repeats pills. **Do not** shorten confirm-Apply, failures, or legal/privacy.

---

## Tests (every shipped pass)

```
npm ci && npm test
npm run verify:wiring
npm run check:contrast
```

Stay on **2.0.0.30**. One pane for Desktop and web.

Pass 1 extra: Recommended hidden (Simple **and** Advanced); `#peChromeHelp` closed; `#peDocScopeTrustLine` still in DOM; pills `aria-label`; `#manuscriptType` not a descendant of `.pe-target-section`; `#peWorkflowNextStep` has `hidden`; `#scope option[value=full][selected]` still in HTML (`tests/pe-85-audit.test.mjs`). Optional: assert Full tip hidden until mock Refresh sets `lastScopePreviewChars` ≥ 80 000.

**Note:** `tests/first-run-onboarding.test.mjs` only asserts `shouldShowWorkflowNextStep` — not DOM visibility. Pane behaviour is covered in `taskpane-behavior.test.mjs`.

Apply / Track Changes remain **mock-tested only**.

---

## Must not regress

- Wiring ids listed above; `#cardContainer`; `#summaryReport` inner node; `#peWorkflowStatusLine` progress during outline build.
- Overlay inert on Settings / confirm / tour (pills still blocked).
- `updateTabStripVisibleLabels` / Simple tab hints: labels stay; `.pe-tab-hint` not shown.
- Simple hides Thesaurus, not Type.
- `cloneSelectOptions` / audit pins still match `#scope` values.
- Light and dark contrast.

---

## Owner checklist (after each shipped pass)

- [ ] Ctrl+F5 on the hosted pane (branch merge / Pages only after they accept).
- [ ] First screen matches that pass’s exit.
- [ ] Tips or Help Privacy still has dictionary / mute / dismiss.
- [ ] Type still visible in Simple.
- [ ] One Run report still produces cards (Word Apply not claimed verified).
- [ ] About **2.0.0.30** unless a bump was agreed.

---

## Docs after UI settles

[QUICK-START.md](../../QUICK-START.md), [pe-ui-design-notes.md](../../pe-ui-design-notes.md). Version docs only if the number changes. Do not rewrite [HANDOFF-DESKTOP.md](../../HANDOFF-DESKTOP.md) for copy-only UI.

**Rollback:** tag `pe-pre-declutter-2.0.0.30`, Pages, Ctrl+F5. No force-push.

---

## Risks

- Do not remove wiring ids.
- Do not put live regions in Tips.
- Do not `display:none` the tablist.
- Do not close `#manuscriptType` in Simple.
- Do not start Pass 2b as part of declutter.
- Do not bump the manifest for Pass 1–4 unless testers cannot see Pages.

---

## Final gap seal (code audit 2026-11-04)

These were the last open questions; all are now decided above.

| Issue | Resolution |
| --- | --- |
| Simple showed **Recommended** (bug vs plan) | Always hidden in `applySimpleMode`. |
| **Manuscript profile** summary visible in Simple on Pass 1 | Close profile in Pass 1, not Pass 2a. |
| Full-manuscript tip never after Refresh only | Re-run tip logic when char preview updates. |
| Scope subpanels below book outline | Reorder DOM: panels immediately after scope primary. |
| `scopeSelectOptionLabel` vs short HTML | Four-word table; update `plain-language-helpers.test.mjs`. |
| Toolbar Run vs Checks **Run report** | Pass 1 shortens **toolbar** label to **Run** only; hub buttons keep “Run report” + `decorateRunAuditHubButton`. |
| Drop Dictionary badge | Overhead badge only; Settings `#dictCountBadge` and card **Dict** unchanged. |
| `updateWorkflowNextStepHint` still runs from status line | OK — function must not unhide `#peWorkflowNextStep`. |
| Pass 2a hid “three hints into one line” (old plan) | **Two** hints hidden (`#auditDefaultFilterHint`, `#peAuditFilterLanesHint`); `#auditReportDepthHint` stays visible. `#peReviewModeAuditHint` unchanged (shows when review mode). |
| Nested `<details>` in Tips | Forbidden — flatten Quick start body into `#peChromeHelp`. |
| Plan doc on branch | Kept in sync with README on `cursor/pe-declutter-first-screen`. |

### Known residual (cannot “plan away”)

- **Banners** (What’s new, Simple first-run, session tips, long-op, prior session) still stack above the canvas until dismissed — not queued in Pass 1.
- **~20 chrome words** excludes genre blurb, Style section below the fold, tab labels, and any visible banner.
- **`#peGenreBlurb`** and select option **values** (long manuscript type strings) stay verbose by design.
- **Real Word** Apply / Track Changes — mock tests only.
- **Session tips** (`#peSessionTips`) can still appear once per session when onboarding enables them.
- **First paint before JS:** badges may show `—` until `updateWorkflowStatusLine()`; acceptable.

### Confidence

Default declutter **implementation is complete** on the feature branch. Remaining work is **2b (optional)**, **merge/release**, and **real-Word** validation — not spec gaps.
