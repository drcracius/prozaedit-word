# Checks and reports — improvement plan

**Live:** 2.0.0.49.  
**Goal:** Make local checks and the report as useful as the best editors, without live underlining, subscriptions, or copied rule text.

## What the report does today

A run shows a score, word count, reading level, critical and style counts, then a flat list of cards. Each card is named by its check (Style guide, Proofreading, Editorial consistency, and so on). From 2.0.0.47 the summary also lists those names with counts (**By check**).

## How top editors differ

Grammarly, ProWritingAid, Hemingway, and LanguageTool group a report into clarity, correctness, and consistency, and they underline as you type. ProzaEdit runs when you ask, stays on the device, and already has those three ideas in local checks. It should not copy their phrase lists or turn on live scanning.

| Area | Already in ProzaEdit | Still weaker than the leaders |
| --- | --- | --- |
| Clarity | Plain language, Strunk 1920, hidden verbs, a passive-voice tally on long nonfiction, reading level, sentence rhythm | No full grammar parse. Fiction keeps wording advice quieter on purpose. |
| Consistency | Repeated words, a/an, quote pairing, cannot/all right, among/amongst, mid-word capitals, dash mix, names, UK/US spelling pairs, number words vs digits, and hyphen pairs when both forms appear | Still not a full house-style dictionary. Times and decimals are ignored on purpose. |
| Report | Score, Simple/Advanced filter, chips, and a **By check** count line | Cards are still one list. The summary does not open a check on its own. |

## Public sources — what is safe

Full inventory: [STYLE-GUIDE-SOURCES.md](./STYLE-GUIDE-SOURCES.md).

In use: plainlanguage.gov word list (CC0; multi-word lines only), 18F Content Guide (CC0, same idea), GPO Style Manual 2016 (U.S. public domain; “email” as one word), Strunk 1920, GOV.UK (OGL), Microsoft / Google / Red Hat (Creative Commons).

Not bundled: LanguageTool (LGPL, Java, ~8 MB of rules), SCOWL/Hunspell, the Australian Style Manual (not an open licence), and copyrighted manuals (Chicago, APA, MLA, AP, Guardian, BBC). Competitor phrase lists stay out.

## Updates

Help → About → **Check for updates** already compares this pane with the live manifest. Style checks and spelling lists ship inside that build. A second “update the rules” download is not needed and would break offline-by-default. The button stays manual; opening the pane may also compare versions once per session, as it does now.

## Work, one at a time

| Order | Improvement | Status |
| --- | --- | --- |
| 1 | Hidden verbs (“make a decision” → “decide”) | Done in 2.0.0.46 |
| 2 | Report summary grouped by check name | Done in 2.0.0.47 |
| 3 | Consistency only when both forms appear (numbers, hyphen pairs) | Done in 2.0.0.48 |
| 4 | Broader public plain-language list (multi-word only) and GPO “email” | **This build** |
| 5 | Stronger Simple-view filter so noisy Advanced hits stay hidden | Not started |

Not planned: a full grammar parser, a Hunspell bundle, LanguageTool, or realtime underlines.
