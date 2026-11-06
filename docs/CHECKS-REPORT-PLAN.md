# Checks and reports — how they should work together

**Live build:** 2.0.0.53.  
**This plan is for the public add-in only.** No private branch and no copyrighted style manuals.

The engine slices are in [ENGINE-CLEANUP-PLAN.md](./ENGINE-CLEANUP-PLAN.md). Where the two files disagree, that file wins.

## Aim

One pass over the text should feel like one editor, not a pile of style packs. Prefer a correct, quiet report over a longer one. A new check is allowed only when it catches something the current checks miss, and only from a source whose licence already allows this public add-in.

## Three lanes

Every card belongs to one lane. The report summary already counts cards **By check**. That stays the grouping. Do not add a second summary.

| Lane | What it is for | What the reader sees |
| --- | --- | --- |
| Correctness | A likely mistake | Simple view. Example: “should of” → “should have”, a doubled word, a broken quotation. |
| Clarity | Wording that is longer or vaguer than it needs to be | Simple view only when the fix is specific (“in order to” → “to”). A pile of hedges or passive verbs is one card, not one card per word. Fiction stays quieter. |
| Consistency | The same passage uses two forms | One card that says pick one. No card when only one form appears. Times (`2:30`) and decimals (`10.5`) stay untouched. |

Advanced view keeps the quieter cards for people who want them. Simple view does not.

## What runs, by manuscript

The manuscript type already chooses the pack. Keep it that way.

- **Fiction.** Story checks (plot, dialogue, pacing, and the rest) plus correctness. Plain-language lines stay low confidence so they do not drown the story.
- **Business.** Correctness, plain language, and one original business-word list.
- **Technical or journalism.** The Microsoft, Google, or Red Hat lines for that type, plus plain language. Not all three vendor packs at once.
- **British English.** GOV.UK spelling. American English does not also run those spelling cards.
- **House rules the user typed.** Those win when they name the same phrase as a built-in card.

Style cards stay capped (about ten). Correctness cards are not dropped to make room for style.

## Overlap to remove before adding anything

These already speak twice. The next work merges them. It does not add phrases.

1. **Passive voice** can be raised by the plain-language pack, the nonfiction clarity pass, and a fiction motivation pass. One passive card per run.
2. **Business wording** is one original list. A phrase is flagged only as a whole word.
3. **“email”** is a GPO preference in American English and a GOV.UK preference in British English. Keep both, but never both on the same run.

After that, the only planned report change is the Simple-view filter: hide low-confidence cards there, and say how many were hidden (this already happens in part; make the rule one sentence the code follows everywhere).

## Sources

Use only what is already listed in [STYLE-GUIDE-SOURCES.md](./STYLE-GUIDE-SOURCES.md). Stop adding packs until the overlap pass above is done.

Help → About → **Check for updates** remains the way to see if a newer build is on the site. Rules travel with the build. There is no separate download.

## Order of work

| Order | Work | Status |
| --- | --- | --- |
| 1–6 | Hidden verbs, By check summary, mixed forms, plain-language lines, hedge tally, “should of”, Mailchimp business lines | Done through 2.0.0.51 |
| 7 | One passive-voice card per run | Done in 2.0.0.53 |
| 8 | One business-word list | Done in 2.0.0.53 |
| 9 | Simple view follows one rule: show correctness and specific clarity fixes; hide the rest and say how many | Already how Simple view works |

Not in this plan: a grammar engine, a spelling dictionary, live underlines, or any source that is not already licensed for this public add-in.
