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

House rules the user types are their own content.

## Reviewed and not bundled

| Source | Why it stays out |
| --- | --- |
| LanguageTool `grammar.xml` (LGPL-2.1) | The English file is about 8 MB and needs a Java engine. A subset would still be their rule text. The add-in stays a no-build Office pane and does not send the manuscript to their server. |
| SCOWL / Hunspell | Permissive, but large, and some underlying data is not freely redistributable. Word already spells. |
| Australian Government Style Manual | Government copyright, not an open licence. |
| Chicago, APA, MLA, AP, Guardian, BBC, Economist | Copyrighted manuals. Citation checks name the styles only; they do not certify compliance. |
| Grammarly, ProWritingAid, Hemingway | Private products. Their underlines and phrase lists are not reused. |

## Updates

Rules ship with the add-in build. Help → About → **Check for updates** compares this pane with the live manifest. There is no separate download for style packs.

*Aligned with hosted build **2.0.0.49**.*
