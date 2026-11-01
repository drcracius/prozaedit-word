# ProzaEdit task pane — UI color & typography (PE-37)

## Theme model (PE-50)

- **Light** (default), **Dark**, and **Match system** via Settings → **Appearance**. Preference persists in `PROZAEDIT_CONFIG.themePreference` (`light` | `dark` | `system`); effective palette is `data-pe-theme="light"|"dark"` on `<html>`.
- Colors come from CSS custom properties in `taskpane.css` (`:root` / `[data-pe-theme="light"]` / `[data-pe-theme="dark"]`). Light values match the pre–PE-50 shipped look.
- **Scope:** task pane only — Word document canvas and Office host chrome are unchanged.
- **System mode:** listens to `matchMedia('(prefers-color-scheme: dark)')` without overwriting the saved `system` choice in CONFIG.

## Semantic palette (current)

| Token | Role |
| --- | --- |
| `--pe-primary-indigo` / `--primary` | Primary actions (Run audit, links, focus rings) |
| `--pe-success` / `--pe-success-bg` | OK states, active workflow step, tab underline accent |
| `--pe-warning` / `--pe-warning-bg` | Caution copy (audit overview, scope warnings) |
| `--pe-info` / `--pe-info-bg` | Subtle tints (Settings header, secondary hover) |
| `--red` / `--red-bg`, `--orange` | Audit severity (critical / style) — unchanged traffic semantics |

## Typography (PE-52)

- **Stack:** `--pe-font-sans` — Segoe UI Variable, Segoe UI, `system-ui`, platform fallbacks (no web fonts; no manifest change).
- **Scale:** `--pe-font-size-base` **13px** body; `--pe-font-size-section` **14px** headings; `--pe-font-size-tab` **11px** tabs; `--pe-font-size-xs` / `--pe-font-size-2xs` for help and captions.
- **Rhythm:** `--pe-line-height` **1.5** (body), `--pe-line-height-tight` **1.35** (compact UI).
- **Weights:** `--pe-font-weight-label` (600) labels/tabs; `--pe-font-weight-heading` (600) section titles; `--pe-font-weight-strong` (700) emphasis.
- Narrow pane keeps **13px** body; tabs do not drop below **10px**.
- Optional Inter / Source Sans 3: see [TYPOGRAPHY-AND-FONTS.md](./TYPOGRAPHY-AND-FONTS.md).

## Navigation

- **Settings:** Back (same as Close) + Escape; **Save & close** persists then dismisses; **Ctrl+Shift+,** / **Alt+Shift+S**; deep links + `#pe-settings-{section}` hash.
- **Last tab:** persisted in `PROZAEDIT_CONFIG.lastActiveTab` per document.
- **Scope status line:** one row under sticky toolbar (scope label + char preview summary).
- **Rewrite from audit card:** session “Back to Audit” until dismissed.

## Settings modal inventory (PE-38)

Collapsible `<details class="pe-settings-group">`:

| Group | Contents | Default open |
| --- | --- | --- |
| **Safety** | Simple mode, selection-only edits, confirm Apply, hover tips, FK lock, Version History reminder, continuity slider, fiction scope reminder, hide session tips permanently, Gemini session ceiling; **Reset Safety to defaults** | yes |
| **Onboarding** | Session tips, What's new, prior-session recap, long-operation warnings; **Reset Onboarding** | no |
| **Appearance** | Light / Dark / Match system; **Reset Appearance** | no |
| **Audit & reports** | Report depth, default audit filter, extended checks default; **Reset Audit & reports**; Audit tab hints read Settings selects | no |
| **Privacy & diagnostics** | Crash opt-in, problem report note + button, GitHub fallback; **Reset Privacy** | no |
| **Reference & citations** | Capture reference style, verify citations shortcut | no |
| **Dictionary** | Per-document word list; **Clear dictionary** | no |
| **Custom style** | Custom panel (name, rules, bulk import, presets); **Reset custom style rules** | when rules exist or custom guide selected |

**Target** keeps profile, scope, style guide `<select>`, Simple mode summary line, custom rules count line. **Help → Diagnostics** points to Settings → Privacy.

## Contrast

Accent greens and indigo are chosen for readable text on white/slate surfaces in narrow Word web panes; severity chips keep existing high-contrast traffic colors.

## Dark palette (PE-51 polish)

Dark mode avoids pure black/white. Surfaces stack as **base** (`--bg`, ~`#0b1120`), **pane** (`--surface`, ~`#151c2c`), **elevated** (cards `--pe-card-surface`, settings groups), and **inset** (`--surface-inset` for inputs, inactive chips, workflow steps). Borders use `--border` / `--border-muted` (~`#2e3d52` / `#243044`); body text `--text` (~`#e2e8f0`), secondary `--text-muted` (~`#8899ae`).

Accents stay on-brand: **indigo** primary (`--pe-primary-indigo` ~`#93a4ff`) for actions, links, and focus (`--pe-focus-ring`); **green** (`--pe-success` ~`#3ee4a3`, `--pe-success-bg` ~`#0f3329`) for OK states, active workflow, and tab underline. Help/banner tints use `--pe-help-box-bg` and `--pe-banner-tint-*` instead of light-blue literals. Brand header stays deep slate (`--pe-brand-bg`); wordmark gets a minimal brightness filter only in dark.

Component polish is scoped with `[data-pe-theme="dark"]` so **light CSS variables and layout are unchanged** from PE-50.
