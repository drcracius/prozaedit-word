# Release notes — PE-65 average-user plain language

**Build:** hosted **2.0.0.15** (UI-only; **no manifest bump**)  
**Branch:** `cursor/pe-63-ux-tour-3531` (with PE-63/64)

## Summary

Plain-language layer when **Simple mode** is on, clearer Checks **Run audit** path, Help for first-time editing-tool users, tour copy pass, and a one-click **Turn off Simple mode** in Settings → Essentials.

## Shipped

1. **`plain-language-helpers.js`** — testable strings for report depth, scope labels, Audit banner, filter hints, and Help bullets.
2. **Simple mode ON**
   - Friendly scope labels on Target select and scope chips (“This chapter”, “Whole document”, …).
   - Audit header when Critical filter: *Showing important issues only…*
   - Plain report-depth line on Audit; softer filter hint (no “lanes” jargon).
   - Essentials intro + **Turn off Simple mode** (persists via existing checkbox).
3. **Checks** — tagline under Run audit; Simple mode CSS emphasizes primary button.
4. **Help** — collapsible **New to editing tools?** (4 bullets).
5. **Tour** — shorter, non-technical step copy (no scope/lanes without explanation).
6. **Tests** — `plain-language-helpers.test.mjs` + wiring; **51** unit tests green.

## Not in this release

- Tab merge (vNext)
- Manifest / ribbon bump
- Office.js CI smoke (**PE-66**)

## Verify in Word web

- First run: Simple on → Audit shows important-only banner → Settings → Turn off Simple mode restores tabs.
- Checks: Run audit tagline visible; hub button prominent in Simple mode.
- Help: expand **New to editing tools?**
