# ProzaEdit engine cleanup — implementation plan

**Status:** done in build **2.0.0.53**. Later builds keep a stray quote inside its own paragraph (**2.0.0.61**) and let Cancel reach the chapter chart.

**This file on GitHub is the plan.** https://github.com/drcracius/prozaedit-word/blob/main/docs/ENGINE-CLEANUP-PLAN.md

A copy in Downloads, or any edit that exists only on a PC, is not the plan. Change this file on `main` when the plan changes. Do the code on this checkout, then publish each finished slice. Do not start the next slice on a failing test run.

This replaces the PC-only specification. Where [CHECKS-REPORT-PLAN.md](./CHECKS-REPORT-PLAN.md) still says to keep a Mailchimp credit on a merged business list, this file wins: delete that pack, and do not copy its six headwords.

## How to build it

Four slices. Each one is a separate change, its own tests, and its own publish. Do not mix them into one edit. A later slice may depend on an earlier one. Do not reorder them.

After each slice:

1. `npm test`
2. Fix failures in that slice before starting the next.
3. Publish only when asked. A publish bumps `manifest.hosted.xml`, `manifest.xml`, `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js`, and the docs named in `docs/HANDOFF-DESKTOP.md` section 6. Do not bump the build for an unpublished slice.

Leave HTML, CSS, and element ids alone. Leave Simple view alone: likely fixes stay listed, and quieter notes stay behind **Show them**. Do not add *The Indigo Book*. Do not use regex lookbehind. Do not claim a real Word run. Track Changes Apply stays mock-tested.

`body.load("text")` at `taskpane.js` around line 4265 is the Coach context read. Leave it. The duplicate load to remove is only the full-audit word count around line 5642.

## Slice 1 — Mailchimp out, one business list

**Why first.** It is the licence change, and it does not depend on dialogue or style limits.

**Edit**

- `src/taskpane/lib/style-guide-rules.js` — delete `mailchimpNoncommercial`, its call inside the plain-language branch of `apply()`, and the Mailchimp `sourceNote`.
- `src/taskpane/lib/lexical-banks.js` — add `BUSINESS_JARGON` from the phrases already listed in `Audit._manuscriptRules` (`synergy`, `leverage`, `circle back`, and the rest of that array). Each row is `[find, replacement]`. Use a short plain replacement where one is honest (`leverage` → `use`, `touch base` → `contact`, `mission critical` → `essential`). Where it is not, use `(plain term)`.
- `src/taskpane/lib/audit-engine.js` — `_manuscriptRules` reads that table. Match with `Audit._find`, not `lower.includes`. `targetText` is the hit `_find` returns. A `(plain term)` replacement is `confidence: "low"`. A concrete replacement stays a normal preference card.
- Same file, `_aiVoice` — when the manuscript type includes `Business`, skip a phrase that is also in `BUSINESS_JARGON`.
- `docs/THIRD-PARTY-ATTRIBUTION.md` and `docs/STYLE-GUIDE-SOURCES.md` — remove the Mailchimp credit and the “remove before sale” line for that pack. Leave the MIT, Microsoft, Google, Red Hat, and GOV.UK credits.

**Do not** add `incentivize`, `learnings`, `thought leader`, `best-in-breed`, `crushing it`, or `killing it` anywhere.

**Tests**

- Rewrite the Mailchimp assertions in `tests/pe-90-slice-c.test.mjs`. `incentivize` and `learnings` must produce no `sg:mc:` card on a business manuscript or on fiction.
- Add TC-04: a business manuscript with `leverage` produces one `biz:` card quoting the document’s own spelling, and no `ai:voice` card for that word. Fiction does not get the business card.
- Add a whole-word check: `winner` does not fire `win-win`.

**Done when** `npm test` is green and a search of `src/` and `docs/` finds no Mailchimp pack and none of those six headwords.

## Slice 2 — Card limits, one email rule, one passive card

**Why second.** These three share `style-guide-rules.js` and the audit push path. Doing them together avoids a temporary state with two passive cards and a starved Strunk pack.

**Edit `src/taskpane/lib/style-guide-rules.js`**

- Replace the single `budget.remaining = 10` with four counters: plain language 4 (the GPO email card spends this counter), Strunk 2, domain (Microsoft, Google, or Red Hat) 3, weasel 1.
- House rules keep their own cap: 20 for `custom`, 24 for `custom-plus-auto`. They do not spend the four counters.
- A small `take(bucket)` returns false when the counter is already 0, and decrements only when it returns true. Every push goes through it.
- `gpo2016` runs only for `en-US`. The GOV.UK `e-mail` card runs only for `en-GB`. Other GOV.UK spelling checks still run only when that pack was selected.
- Delete the passive regex and the `sg:plain:passive_cluster` card from `plainLanguage`.

**Edit `src/taskpane/lib/audit-engine.js`**

- Delete the short passive regex in `_motivation`.
- Keep one helper used by fiction and non-fiction, based on the pattern already in `_nonfictionClarity`: auxiliary, optional adverb, past participle, and the existing adjective exclusion (`tired`, `pleased`, and the rest of that list).
- At most one card. Fiction id `mot:passive_cluster`. Non-fiction id `nf:passive_cluster`.
- Fiction searches the dialogue-blanked copy once Slice 3 exists. Until then, search the original text. The card target is always a slice of the original document.
- Keep the current thresholds (`passiveCluster` for fiction, `passiveCluster + 2` for non-fiction).

**Tests**

- TC-02: a passage with more than four plain-language hits still emits a later Strunk card and a Google card. Plain language stops at 4.
- TC-03: a house rule on a phrase the plain pack also hits keeps the house card and does not spend the plain-language counter.
- TC-05: many real passives plus `was tired` produce one passive card. `was tired` is not the quoted evidence. No `sg:plain:passive_cluster`.
- TC-06: `e-mail` on en-US gets the GPO card only. The same word on en-GB gets the GOV.UK card only.

**Checkpoint before calling the slice done.** Run the PE-90 and PE-93 corpus gates. A short planted passage has one or two plain hits and will still pass. A long passage that expected five plain-language cards will now keep four. If a planted phrase is the one that fell off, record it and decide whether that passage should use a rarer phrase. Do not raise the cap of 4 to make the old test pass.

## Slice 3 — Search the right words

**Why third.** Slice 2’s passive helper needs a blanked copy and an original slice. Slice 1’s business matcher already uses `_find`. This slice is the one most likely to move precision numbers, so it gets a corpus run of its own.

### 3a. Blank quoted speech without losing the original words

Add `Audit.blankQuotedSpeech(text)`. Same length as the input. Characters inside `"` `“` `”` and inside `‘` `’` become spaces. Do not treat a straight apostrophe as a quote mark.

In fiction only, these six use that copy:

1. `_repetition`
2. `_motivation` (weak cues and the passive helper)
3. `_plausibility`
4. `_genreCraft`
5. `_spoiler`
6. `StyleGuideRules.apply`

For `_find`, pass the **original** string as `text` and a `lower` built from the **blanked** string. `_find` searches `lower` and returns `text.substr(...)`, so the card quotes the original. Do not pass the blanked string as `text`.

Any regex that currently runs on `text` inside those six must run on the blanked copy, and the reported slice must be taken from the original at the same index.

Do not blank `_dialogue`, `GenreChecks.tense`, or `GenreChecks.pov`. `_narration` already drops quotes. Non-fiction is unchanged. `_proofing` already blanks quotes for dialect. Do not blank it twice.

### 3b. Dialect cards quote the inflected word

In `_proofing`, `targetText` becomes the matched token (`organised`, `Organised`), not the list root (`organise`). Keep `ruleId` as `spell:dialect:` plus the root, so the corpus ids stay valid.

Add a mapper beside the UK/US lists. Copy a known ending onto the other dialect’s root: `organised` → `organized`, `organising` → `organizing`, and the same for `-our`/`-or` where the lists are pairs. Sentence-start capital is preserved. `analyses` stays excluded, as the current `analyse` suffix already does. If the ending is not one of those, `replacementText` is `(align spelling)` and the card does not pretend to be a one-click fix.

### 3c. Names

In `ProperNoun.extract`, extend the token so it allows:

- an internal capital (`MacDonald`, `McDonald`)
- one apostrophe or hyphen (`O'Connor`, `Jean-Luc`)
- up to two further words of that same shape

Do not use `[A-Za-z]+` for the whole token.

Keep the skip list, the dictionary skip, and the length floor. Drop a token that appears only at a sentence start and never mid-sentence.

### 3d. Tense and viewpoint

In `_tenseCounts`, inspect the original narration before lowercasing.

- A capitalized word counts as a subject the same way `he`, `she`, and `they` do, so `Vega stepped` counts.
- One `-ly` word may sit between the subject and the verb, so `he quietly closed` counts.
- Do not count an `-ed` word as past tense when the previous word is `was`, `were`, `been`, `being`, `is`, or `are` and the `-ed` word is in the passive helper’s adjective list.

In `pov`, a first-person pronoun within three words after `thought`, `wondered`, `realized`, `knew`, or `asked himself` / `asked herself` does not count. First person outside that window still counts. The card stays low confidence.

### 3e. Continuity whole words

In `ContinuityGuard.countOccurrences`, escape the needle and count it only when the character before and after is not a letter or digit. No lookbehind. Words shorter than 2 stay at 0. The Kowalski name test stays. Add the `art` / `part department party` case (TC-10).

**Tests for the slice:** TC-01, TC-07, TC-10, TC-11, TC-12, TC-13, plus the existing PE-96 checks that `analyses` is not a dialect hit and that `analysed` is. Then the full corpus gates. New false cards on clean passages stop the slice. A dialogue line that used to raise a pleonasm card is an expected miss, not a failure, when the same phrase in narration still cards.

## Slice 4 — Pane safety

These are independent of one another. Land them as one slice so the pane behavior tests run once.

### Dismiss and Mute

`dismissCard` calls only `Settings.dismissTarget(item.targetText)`, then `removeAuditCard` for that card. It does not call `muteRule` and does not call `dropSameRuleFindings`.

`muteRule` stays: mute the rule, dismiss that phrase, drop the other cards of that rule.

TC-08.

### Enter in Coach

In `setupEnterKeyHandler`:

- No API key: `sendLocalCoachMessage`. No confirm, no network.
- A key is set: `sendChatMessage`, including the confirm.
- Shift+Enter still inserts a newline.

TC-09. Do not change `readChatContext`.

### One full-manuscript read

In `runAuditInternalCore` only, remove `body.load("text")` and the sync that exists to count words.

After `readScopeText`:

- If the text was not cut by the scope cap, `lastDocStats.words` comes from `Metrics.countWords` on that text.
- If it was cut, keep the current “not counted for a very long document” wording.

Paragraph count still comes from the paragraph collection. TC-15.

### Chapter chart

`scanChapterHeatmap` does not start a long operation today, so Cancel cannot reach the chart.

- Start the same long operation the other scans use.
- Pass it into `ChapterHeatmap.scanDocument`.
- Keep the existing batches of 500.
- After each batch sync, call `ScopeReader.microYield()`, then `throwIfCancelled` when a long operation was passed.
- On cancel, leave any previously saved chart as it was and show the usual cancelled status.

`microYield` schedules a microtask. If a long chart still locks the pane, yield with `setTimeout(0)` at that one call site.

### AI JSON

In `AISafety.parseFindings`, from the first `[` that starts an array of objects, walk the string, honor strings and escapes, and `JSON.parse` only that balanced slice. Keep the current errors: “not valid JSON” and “not a list”. Keep the checks that the quote is in the excerpt and that injection and markup are dropped.

TC-14. The existing garbage-reply and fenced-json tests in `tests/pe-81.test.mjs` and `tests/pe-84-audit.test.mjs` must still pass. A reply of `[{bad` still throws the friendly error.

### Quote balance

In `scanQuoteBalance`, set `confidence: "low"` on both cards. Change nothing else. `edit:quote` is not in `LOW_CONFIDENCE_PREFIXES`, so the field must be set on the card. Simple view will hide these until **Show them**. Update any test that required the quote card to be visible in Simple view.

## What “finished” means

- Slices 1–4 are each green on `npm test`.
- `npm run verify:wiring` and `npm run check:contrast` still pass. This work should not move colors or ids. Run them on the last slice anyway.
- Mailchimp is gone from code and from the two attribution docs.
- Simple view behavior tests (`PE-87`) still pass.
- The precision gates (`PE-90`, `PE-93`, `PE-96`) still pass, with the Mailchimp assertions rewritten and any plain-language overflow recorded in Slice 2.
- No version bump until a publish is requested.

## Risks to watch

| Risk | Where it shows | What to do |
| :--- | :--- | :--- |
| Plain-language cap hides a planted hit | PE-90 / PE-93 recall on a long passage | Change the passage, not the cap, unless the hit is the only copy of a rule the gate requires |
| Dialogue blanking hides a real narration hit | A card disappears and the phrase is not inside quotes | The blanker matched too wide. Fix the quote scan. Do not turn blanking off |
| Name pattern marks ordinary words | New proper-noun cards on clean prose | The sentence-start filter or the skip list is too loose. Do not widen the pattern further |
| Dialect replacement invents a form | `analyses`, a name, or an unknown ending gets a one-click replace | Fall back to `(align spelling)` |
| Word count becomes the excerpt length | A document over the character cap | Keep the “not counted” wording |
| Dismiss still clears a whole rule | TC-08 | `dropSameRuleFindings` is still on the dismiss path |
