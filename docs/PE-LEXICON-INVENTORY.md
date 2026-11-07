# Lexicon inventory (Phase 1)

Canonical tables live in `src/taskpane/lib/lexical-banks.js`. The compiled master engine hydrates from those tables. OneDrive Gemini dumps were **not** pasted in as scripts.

| Source | Action |
|--------|--------|
| Master `PLEONASMS` / `WORDINESS` / jargon | Merged; existing banks kept as source of truth |
| Extra tautologies (`more unique`) | Hard list (Simple-visible) |
| Narrative / contested (`nodded his head`, `first and foremost`, `actual experience`, uncomparables extras) | `PLEONASMS_SOFT` (Advanced only) |
| Plain language / Strunk / GOV.UK / MS / Google / Red Hat | Unchanged in `style-guide-rules.js` (licensed) |
| Wikipedia MoS puffery, EU eurojargon, wholesale `proselint:` labels | **Blocked** — not in STYLE-GUIDE-SOURCES |
| Commonwealth one-word swaps (`ascertain` → find out) | **Skipped** — too noisy in fiction |

New bank keys: `NOMINALIZATIONS`, `UNCOMPARABLES`, `TAG_ADVERBS`.
