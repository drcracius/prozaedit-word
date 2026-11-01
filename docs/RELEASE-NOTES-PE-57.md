# Release notes — PE-57 competitive UI recommendations

**Build:** 2.0.0.15 (task pane only; no manifest bump)

## Summary

Implements five actionable items from competitive add-in UI research (PerfectIt / Writefull-style trust and visibility), without vNext tab merge.

## Changes

1. **Dark appearance onboarding** — Top banner when the effective pane theme is **Dark** (including **Match system** on a dark OS). Copy explains long-audit intent and points to Settings → Appearance. Session dismiss via **Got it**; permanent off via **Don't show again** or Settings → Onboarding (**Show dark-appearance tip**). Persisted in `PROZAEDIT_CONFIG.showDarkAppearanceTip`.

2. **Style guide + scope sticky strip** — The workflow status line under the toolbar now shows **Guide:** (active style guide label from Target / custom house name) alongside **Scope:** and the character estimate.

3. **Severity vs green discipline (dark)** — In dark mode, inline links and link-style buttons use white/muted text instead of light green; green remains for primary buttons, active tab, active workflow step, and Run audit. Help tab adds a one-row **Critical / Style / OK** legend.

4. **Card trust row** — Audit cards show **Undo** and **Apply** on the same row with equal flex weight (wraps on narrow panes). Undo uses the ProzaEdit isolated stack; Apply keeps the confirm path.

5. **Review-mode filter hint** — Academic / Business manuscript types or selected built-in / custom style guides preselect the **Style guide** audit filter when no stricter saved filter exists (Simple mode still wins with Critical). Audit tab shows a one-line review-profile hint.

## Tests

Extended unit tests for onboarding dark-tip helper, review-mode profile detection, and `showDarkAppearanceTip` defaults.

## Docs

- [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) — PE-57 spot checks added.
