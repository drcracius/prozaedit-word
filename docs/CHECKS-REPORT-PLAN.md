# Checks and reports — improvement plan

**Live:** 2.0.0.48.  
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

| Source | Use here? |
| --- | --- |
| Plain Language (public guidance), Strunk 1920 (public domain), GOV.UK (Open Government Licence), Microsoft / Google / Red Hat (Creative Commons) | Yes. Short original wording only. Already in the style packs. |
| SCOWL / Hunspell English word lists | Permissive, with a copyright notice, and large. Parts trace to sources that are not freely redistributable. Do not bundle a full dictionary into this no-build pane. |
| LanguageTool (LGPL) | A Java engine plus a server. Using it would send text off the device or add a heavy runtime. Do not vendor it. |
| Grammarly, ProWritingAid, Hemingway, Chicago, APA | Private or copyrighted. Do not copy. |

New checks stay as short original lists with the source named.

## Updates

Help → About → **Check for updates** already compares this pane with the live manifest. Style checks and spelling lists ship inside that build. A second “update the rules” download is not needed and would break offline-by-default. The button stays manual; opening the pane may also compare versions once per session, as it does now.

## Work, one at a time

| Order | Improvement | Status |
| --- | --- | --- |
| 1 | Hidden verbs (“make a decision” → “decide”) | Done in 2.0.0.46 |
| 2 | Report summary grouped by check name | Done in 2.0.0.47 |
| 3 | Consistency only when both forms appear (numbers, hyphen pairs) | **This build** |
| 4 | Stronger Simple-view filter so noisy Advanced hits stay hidden | Not started |

Not planned: a full grammar parser, a Hunspell bundle, LanguageTool, or realtime underlines.
