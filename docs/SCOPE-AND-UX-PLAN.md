# Scope, counts, and wording — audit and implementation plan

**Status:** implemented in **2.0.0.61**, leftover wording and page limits finished in **2.0.0.62**. Not tried in real Word.

**Build this plan was read against:** hosted **2.0.0.60** (`manifest.hosted.xml`, `PROZAEDIT_BUILD_VERSION`). Sources: `src/taskpane/taskpane.js`, `src/taskpane/taskpane.html`, `src/taskpane/lib/scope-reader.js`, `src/taskpane/lib/text-metrics.js`, `src/taskpane/lib/audit-review-helpers.js`, `docs/source-of-truth.md`, `docs/prozaedit-features.md` (that features file is stale at 2.0.0.15 — do not treat it as current behavior).

**Confidence:** about **93%** on the code paths below. The remaining gap is real Word (desktop and web): tables, text boxes, and Track Changes were not opened in Word for this plan. Apply with Track Changes stays mock-tested only.

---

## Three-pass audit

### Pass 1 — What the last two replies got right

- Chapters are paragraphs whose Word style is **Heading 1, Heading 2, or Heading 3**. The phrase “Heading 1–3” means those three **styles**, not “only chapters 1, 2, and 3.”
- The Start menu already has Selection, Pages, Chapters (a checklist), and Full. Old single-chapter and from–to settings are turned into that checklist on load (`migrateLegacyChapterScope`).
- Page From/To have no maximum. A short document can still be given a huge page number.
- The number people see for scope is **characters** (`scopeCharPreview`). Word count already exists (`Metrics.countWords`) and is used in the audit summary, not as the scope limit.
- “No chapters — apply Heading 1–3…” is thrown as an error. The recovery wrapper does **not** treat that sentence as a normal scope message, because the pass-through pattern looks for “no heading,” not “no chapters.” That is why the status line says Word could not read the chapter list.
- Icon and section names disagree in places (workflow step “Review” vs tab “Fix”; “Style & language” vs the name the owner wants).
- Target Reader, setting, critic, language, and style guide are wired into the audit. Teenager and High School share the same grade band `[7, 10]`.

### Pass 2 — Corrections (these override the earlier replies)

1. **Full manuscript can stop early with no warning.**  
   On Run, the read is capped at **450,000 characters** (`ScopeReader.LIMITS.full`). `readBodyTextChunked` **cuts the text and returns** when it hits that cap. It does not throw. Run only marks the report “truncated” when the text is **longer** than the cap. After the cut, the length **equals** the cap, so the warning card is skipped. A long book can be audited as a **silent prefix**.  
   Refresh count on Full is different: without a cancel hook it loads `body.text` for the **whole** document (until 1,000,000 characters, `MAX_BODY`). The count can describe the whole book while Run only checks the first part.

2. **Chapters are not limited to three.** The checklist lists every Heading 1–3 block. The bug is the **wording** and the missing **From / To** controls, not a hard limit of three chapters.

3. **Do not auto-switch scope.** Switching to Pages without a click can surprise someone who only needed to fix a heading. Show a short message and a button: **Use pages**.

4. **“10 pages” cannot be Word’s page count.** Word’s add-in API has no page count. Any maximum must be an **estimate** (today: 2,800 characters per page). Say “about” in the UI.

5. **Word count must not replace every character limit inside the engine.** AI prompt size, Office reads, and memory caps stay in characters. People should see **words**. A fixed buffer turns a word budget into a character cap (below).

6. **Nested headings.** Heading 2 and Heading 3 under a Heading 1 each become their own “chapter.” A book with many subheads gets a long list. Keep that behavior in the first implementation. A later option can be “Heading 1 only.” Do not change it in the same step as From/To.

7. **Content the body paragraph list can miss.** Text boxes, some tables, headers, and footers may not be in `body.paragraphs`. Out of scope for these phases. Say so in the user guide when it is written.

### Pass 3 — Edge cases the plan must cover

| Case | Required behavior |
|------|-------------------|
| No Heading 1–3 | Calm message. No “Word failed.” Button **Use pages**. |
| Headings exist | From/To from 1 to the count. Checklist stays for non-contiguous picks, behind “Choose individual chapters.” |
| Saved From/To larger than the new document | Clamp on load and on Reload. |
| Empty document | “This document has no text yet.” Do not invent pages or chapters. |
| Selection with no highlight | “Highlight text, or choose Pages, Chapters, or Full.” Show 0 words, not a crash. |
| Full under the cap | Run covers the text that was read. Summary word count matches that text. |
| Full over the cap | Status and report say the check **stopped** and give the word count **checked** vs **about how much is left** if known. Never imply the whole book was checked. |
| Refresh count while another read is running | Keep “Wait for the current operation.” Do not start a second Word read. |
| Page To less than From | Keep today’s rule: To is raised to From. |
| Chapter To less than From | Same. |
| Very long Full refresh | Do not load the entire `body.text` into the pane. Count with the same chunked read as Run, and stop at the cap with an honest “more than N words” line. |
| Cancel mid-count | Leave the last good number or show “Count cancelled.” |
| Simple vs Advanced | Same scope rules. Simple may hide extra chapter checklist; From/To stays visible. |
| Desktop vs web | Same script. Web may be slower. Do not claim either host was tried until the owner runs the checks at the end. |

---

## Decisions (locked for this plan)

1. **Chapter marker** stays Heading 1, 2, and 3.
2. **Chapters UI** matches Pages: **From chapter** and **To chapter**. Individual checkboxes move under a closed “Choose individual chapters” section so a range and a custom set are not both shouting.
3. **No headings:** one sentence plus **Use pages**. Do not throw.
4. **Scope maximums** come from the document: estimated pages, and chapter count after a heading scan.
5. **People see words.** Engine caps stay in characters.  
   `characterCap = wordBudget × 6`  
   6 characters per word is the buffer (spaces and punctuation). It matches the current full cap: 75,000 words × 6 = 450,000 characters. Selection, pages, and one chapter stay at 25,000 words (150,000 characters). A chapter range stays at about 33,000 words (200,000 characters).
6. **Pages** stay an estimate. Show **about 250 words per page** (2,800 ÷ 6 ≈ 467 is too nerdy; 250 words is a readable page and we still convert the range to a character window with the ×6 buffer so the read size does not jump). Implementation detail: page window in characters = `(pageCount) × 250 × 6`. Update `CHARS_PER_PAGE` to **1500** only if tests are updated in the same change. Do not leave 2,800 in the help text.
7. **One Run button** stays in the toolbar. The extra Run buttons on Run and Fix can remain for one phase, then the Fix-tab Run is removed in the redundancy phase so we do not break tests twice.
8. **AI and rewrite limits** stay character caps in code. User-facing lines say “about N words” using the same ÷6 display, with the real character cap unchanged (`MAX_CHAT` 3500, `MAX_DEEP` 6000).

---

## Phase 0 — Honest stop on Full (do this first)

**Wrong today:** a book over 450,000 characters is cut inside `readBodyTextChunked` and Run does not set `truncated`.

**Change:**

- If the chunked read stops because of the cap, return a flag `stoppedEarly: true` (do not only return a string).
- `readScopeText` and the audit finish path treat that flag like today’s `truncated` card.
- Card text in words: “This check stopped after about N words. The rest of the document was not checked. Use Chapters or Pages for the rest, or Audit next chapter.”
- Refresh count on Full uses the chunked reader with the same cap. If it stops early, the line is “More than N words (this check’s limit). Not the whole document.”
- Do not load unbounded `body.text` for the preview.

**Verify:** a fixture string longer than the cap (unit test, no Word). Owner: a short doc has no stop card; a long doc’s status says it stopped. Not claimed done until the owner runs it.

**Tests:** extend scope-reader tests for the flag; audit path test that `sys:truncated` is added when the flag is set.

---

## Phase 1 — Chapters: wording, empty state, From / To

**Change:**

- Help and empty copy: “No chapters found. Chapter titles need Word’s Heading 1, Heading 2, or Heading 3 style.”
- Remove the throw in `refreshChapterScopeLists` when the list is empty. Fill the checklist area with that sentence and a **Use pages** button that sets scope to `pages` and refreshes the count.
- Add **From chapter** / **To chapter** number fields, same layout as pages. Changing them checks the matching range on the existing checklist (so the engine can keep `selected-chapters`).
- “Choose individual chapters” stays a closed details block for non-contiguous sets. If the user edits checkboxes, From/To shows “Custom” or the min–max, and the checked set wins.
- Status when the list loads: “Found N chapters.” Not an error.

**Verify:** document with no headings → no “Word could not read” line; **Use pages** switches scope. Three Heading 1 titles → From 2 To 3 checks only those. A Heading 2 between them still counts as its own chapter (document this in the phase note so the owner is not surprised).

---

## Phase 2 — Limits cannot exceed the document

**Change:**

- After a heading scan, `max` on From/To chapter = chapter count (at least 1 only when count > 0; otherwise disable the fields).
- After a word measure of the **whole** document is too heavy, estimate pages from the same capped read used in Phase 0: if the read stopped early, page max is “at least K” and the field max is that K, with helper text “Document is longer than this check’s limit.” If the read finished, page max = `ceil(words / 250)` and inputs cannot go above it.
- On settings load, clamp saved page and chapter numbers.
- Empty document: page fields disabled, max 0, message as in Pass 3.

**Verify:** 12 chapters → To cannot be 13. Estimated 10 pages → To cannot be 11. Reload after deleting a heading lowers the max and unchecks a removed chapter.

---

## Phase 3 — Show words, keep a character buffer

**Change:**

- `updateScopeCharPreviewDisplay` shows **words** via `Metrics.countWords` on the measured text. Keep the internal `lastScopePreviewChars` for long-operation thresholds (80,000 characters ≈ 13,000 words at ×6 — update the hint to words).
- Limits in the UI: selection / pages / one chapter **25,000 words**; chapter range **33,000 words**; full **75,000 words**. Compare using `countWords`, but the read still stops at `wordBudget × 6` characters so a document full of long tokens cannot blow memory. If words are under budget but characters hit the buffer, stop and say so (“Stopped at the safety limit, about N words”).
- Replace user-visible “characters” in scope, chapter-walk intro, tooltips, and truncation strings. Leave API key and token math alone.
- Progress lines that say “chars” for the manuscript say “words.”

**Verify:** unit test: 75,000 short words stay under the char buffer; a single 500,000-character token-like string still stops. Selection word count matches `countWords` (same rule as Word’s status bar for normal prose — curly apostrophes already handled). Owner compares Word’s word count on a normal paragraph to Refresh count.

---

## Phase 4 — Remove repeated controls

Do this after Phases 0–3 so strings are edited once.

**Remove or collapse:**

- Fix tab’s second **Run** (toolbar Run remains; Fix explains “Run is at the top”).
- Duplicate “Deeper checks” on Fix if the Run tab already has it (one checkbox, shared state — already `data-audit-extended`; hide the Fix copy).
- Repeated scope essays: one line under Scope on Start. Checks and Fix chips stay one short line (“Same as Start: …”).
- Book outline: keep the button on Start. Run tab and Settings keep a status line and “Open Start” instead of a second full explanation.
- Hide **Save now** when auto-save is on (it already is). Leave it only if a test proves a field does not auto-save.
- Workflow step 4 label **Review** → **Fix** so it matches the tab.

**Do not remove:** Audit next chapter, Cancel, Local Coach vs Send via AI, or the style-guide dropdown.

**Verify:** one path Start → Run → Fix. No contradictory scope sentences. Wiring test still passes.

---

## Phase 5 — Labels from the first review (copy only)

After Phase 4, in one pass:

| Place | New wording |
|-------|-------------|
| Toolbar refresh | **Refresh count** (already). Status line uses the same words, not “refresh count on Start” as a different name. |
| Target reader label | **Target Reader (Age & Education Level)** |
| Section title | **Style & Guide Rules** |
| Guide blurbs | One line each from the table in the prior review (Auto, Plain, Strunk, GOV.UK, Microsoft, Google, Red Hat, Custom, Custom + Auto). Must match `STYLE-GUIDE-SOURCES.md`. |
| AI help summary | The short paragraph already proposed: own key, only on **Send via AI**, selection plus outline if built, nothing applied automatically, subscriptions are not API keys. |
| Icon glossary | Undo, Redo, Last edit, Go to (cards only), Run, Settings, Fix, Cancel, Try again. |

Teenager vs High School: same grade band today. Do not merge the options in this plan; the guide should say they use the same reading-level range.

**Verify:** search the task pane for the old section title and for “characters” in user-visible scope strings. Help → About still shows the new build number.

---

## Phase 6 — User guide (separate file, after the UI strings exist)

Create `docs/USER-GUIDE.md` only in this phase, not before, so it does not document the old UI.

Headings, short sentences, about a 7th–8th grade reading level:

1. Install (raw manifest link only)
2. Start: scope, words, pages (about), chapters (heading styles), full (limit)
3. Run and what each check looks at (the Start scope)
4. Fix
5. Coach and optional AI
6. Settings that change a check
7. When something looks wrong (no chapters, count, stopped early)
8. What this add-in does not read (headers, many text boxes)

Upkeep: add `docs/USER-GUIDE.md` to handoff section 6. Each release note says whether the guide changed. A wiring or link check is optional; a human skim of one workflow per release is enough.

---

## What we will not do in these phases

- Unlimited full-book audit in one Run (the cap stays; the app must **say** it stopped).
- Real Word page numbers.
- Heading-1-only chapters (possible later).
- Phase F items from the older agent plan (icon rail redesign, PDF, CSP).
- Claiming desktop or web Word was verified without the owner’s run.

---

## Owner check after implementation (not done now)

1. Short story, no headings, scope Chapters → plain “no chapters” + **Use pages**.
2. Three Heading 1 titles → From 2 To 3 → Run only covers that span.
3. Full on a one-page note → no stop message; word count close to Word’s.
4. Full on a book past the limit → stop message; it does not pretend to have read everything.
5. Page To cannot exceed the estimate.
6. Help → About matches the new version.

Until that list is run in Word, the plan’s code confidence stays **93%**, not “verified in Word.”
