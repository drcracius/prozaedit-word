# Release notes — PE-66 average-user polish

**Build:** hosted **2.0.0.15** (UI-only; **no manifest bump**)  
**Branch / PR:** `cursor/pe-63-ux-tour-3531` · [PR #18](https://github.com/drcracius/prozaedit-word/pull/18) (stack with PE-63–65)

## Summary

Simple mode shows **Important** instead of **Critical** on user-facing Audit filters and summary counts (internal id `confirmed` unchanged). Power users with **Simple mode off** still see **Critical** everywhere that label appears today.

## Shipped

1. **Important vs Critical** — Filter chips, default-filter hint, audit summary line, and one-line **color legend** on the Audit tab when Simple is on. Settings → Audit default filter option reads **Important** while Simple is on.
2. **Dictionary nudge after Mute (PE-60 P2)** — First **name-like** mute per session shows a status hint: *Add to Dictionary so this name isn’t flagged again* with **Open Dictionary in Settings** (existing modal API). Non-name mutes keep the generic muted message.
3. **Simple mode tab hints** — Subtle subtitles and `title` tooltips on Target, Checks, Audit, and Help (*What to check*, *Run check*, *Fix issues*, *How it works*). Tab DOM ids unchanged.
4. **Report depth plain helpers** — Short Light / Balanced / Dense lines under Settings → Audit when Simple is on; matching hint on Checks when Simple is on.
5. **Docs** — This file; **Average-user 10-minute path** in [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md).
6. **Tests** — Extended `plain-language-helpers.test.mjs` (Important label, mute nudge rules, depth helpers).

## Not in this release

- Manifest / ribbon bump  
- Tab merge (vNext)  
- Office.js CI smoke (**PE-67**)

## Verify in Word web

- Simple **on** → Audit chip **Important** · legend mentions Important · mute a proper-noun card → dictionary nudge once.  
- Simple **off** → chips and legend say **Critical** (unchanged convention for power users).  
- Tab subtitles visible only with Simple on.
