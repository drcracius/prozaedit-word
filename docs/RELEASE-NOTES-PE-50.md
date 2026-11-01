# PE-50 — Safe dark mode + Settings control

**Build:** 2.0.0.15 (no manifest bump)

## What's new

- **Settings → Appearance:** choose **Light** (default), **Dark**, or **Match system** for the task pane.
- Theme preference is saved in `PROZAEDIT_CONFIG.themePreference` per document and applies immediately when changed.
- CSS uses shared tokens on `data-pe-theme` for WCAG-minded contrast on text, borders, cards, modals, banners, and inputs.

## Scope & caveats

- **Task pane only** — the Word document canvas and Office host chrome stay as Word sets them.
- No reliance on undocumented Office theme APIs; system mode uses standard `prefers-color-scheme`.

## Docs & tests

- `docs/prozaedit-features.md`, `docs/pe-ui-design-notes.md`, `docs/FULL-TEST-CHECKLIST-WORD-WEB.md` updated.
- `tests/ui-prefs-helpers.test.mjs` covers default theme and preference validation.
