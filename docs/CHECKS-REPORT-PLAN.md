# Checks and reports — improvement plan

**Live when this started:** 2.0.0.45.  
**Goal:** Make local checks and the report as useful as the best editors, without live underlining, subscriptions, or copied rule text.

## How top editors differ (public product behavior, not their rules)

Grammarly, ProWritingAid, Hemingway, and LanguageTool mainly sell: clarity (padding, passive, hidden verbs), consistency, a grouped report, and live underlines. ProzaEdit already runs on purpose, stays on the device, and has plain-language, Strunk 1920, GOV.UK, and vendor style packs that are licensed for reuse. It should not copy those products’ phrase lists or turn on live scanning.

## Safe sources already in use

Plain Language (public guidance), Strunk 1920 (public domain), GOV.UK (Open Government Licence), Microsoft / Google / Red Hat style guides (Creative Commons). New checks must use short original wording and cite the source. Do not paste guide chapters.

## Work, one at a time

| Order | Improvement | Status |
| --- | --- | --- |
| 1 | Hidden verbs (“make a decision” → “decide”), plain-language idea, original wording | **This build** |
| 2 | Report summary grouped by check name, not only a score | Not started |
| 3 | One consistency pass for numbers and hyphen pairs that already disagree in the same scope | Not started |
| 4 | Stronger Simple-view filter so noisy Advanced hits stay hidden | Not started |

Not planned: a full grammar parser, LanguageTool as a bundled engine, or realtime underlines.
