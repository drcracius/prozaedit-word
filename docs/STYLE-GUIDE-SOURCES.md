# Style sources for checks and reports

Reviewed 2026-11-05. ProzaEdit keeps short original checks in `src/taskpane/lib/style-guide-rules.js`. It does not paste style manuals or competitor rule databases.

## In the add-in

| Source | Rights | What we use |
| --- | --- | --- |
| [plainlanguage.gov](https://www.plainlanguage.gov/) word list | U.S. government work, [CC0](https://github.com/GSA/plainlanguage.gov/blob/main/LICENSE.md) | Multi-word padding (“in order to”, “in the near future”, “a number of”, hidden verbs). Not the one-word rows such as “however” or “currently”, which would flag ordinary sentences. |
| [18F Content Guide](https://guides.18f.org/content-guide/license/) | U.S. government work, CC0 | Same plain-language idea. No separate pack; it points at the same wording advice. |
| [GPO Style Manual](https://www.govinfo.gov/collection/gpo-style-manual) (2016) | U.S. public domain (17 U.S.C. § 105) | “e-mail” → “email”, the form the manual lists. The rest of the manual is not copied. |
| Strunk, *Elements of Style* (1920) | Public domain | A few “omit needless words” phrases. |
| [GOV.UK style](https://www.gov.uk/guidance/style-guide) | [Open Government Licence v2.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/2/) | en-GB spelling and a few word forms. |
| [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Short UI-doc phrases for technical manuscripts. |
| [Google developer documentation style](https://developers.google.com/style) | CC BY 4.0 | Short developer-doc phrases. |
| [Red Hat supplementary style guide](https://github.com/redhat-documentation/supplementary-style-guide) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Short docs phrases. Share-alike applies to adaptations of their guide text; our lines are original. |
| [weasel-words](https://github.com/btford/weasel-words) (Brian Ford) | MIT | A nonfiction tally when several hedge words pile up. Copyright (c) 2014-2019 Brian Ford. |

House rules the user types are their own content.

## Skipped sources: ban, or only caution

Private testing does not cancel copyright. This add-in is also public, so a noncommercial licence still has to be named.

| Source | What the terms say | How we treated it |
| --- | --- | --- |
| Chicago, APA, MLA, AP, Guardian, BBC, Economist | No open licence. Copying the manuals is copyright infringement. There is no extra “do not use” sticker beyond copyright. | Not copied. |
| Grammarly, ProWritingAid, Hemingway | No licence to copy their rule lists. The ideas (clarity, consistency) are not owned. | Not copied. |
| Australian Government Style Manual | The site says government copyright, not an open licence. That is a missing permission, which means the default ban. | Not copied. |
| Mailchimp Content Style Guide | CC BY-NC 4.0 allows noncommercial sharing if credited. Commercial use is outside that licence. | Not included. The business list in the add-in is original. |
| Harper | **Not a ban.** Apache 2.0 allows use, including commercial use, with the licence and notices kept. | The engine is a Rust program and does not fit this pane. Reddit (r/emacs, r/neovim, 2025) recommends it as a local Grammarly alternative. |
| LanguageTool | **Not a ban.** LGPL-2.1 allows use if the licence duties are met. | Skipped because the English rules are about 8 MB and need Java, not because the licence forbids it. |
| proselint | **Not a ban on the program** (BSD-3). The caution is that many checks restate copyrighted usage books. | Not copied. |
| Canada.ca style guide, EU style guide | No clear open licence on the pages reviewed. Uncertainty, not a sentence that says “you may not.” | Not copied. |
| SCOWL / Hunspell | The dictionary notice is permissive. Some underlying word data is not free to redistribute. | Not bundled. Word already spells. |
| Vale | The linter is open. Writers on r/technicalwriting use it for house style. | The app already stores house rules. Vale itself is a separate program. |

## Updates

Rules ship with the add-in build. Help → About → **Check for updates** compares this pane with the live manifest. There is no separate download for style packs.

*Aligned with hosted build **2.0.0.56**.*
