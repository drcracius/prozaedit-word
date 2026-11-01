# ProzaEdit task pane — UI color & typography (PE-37)

**Beta lock (PE-53):** System UI fonts + semantic colors through Phase 1 — see [DESIGN-SYSTEM-BETA.md](./DESIGN-SYSTEM-BETA.md). Typography detail: [TYPOGRAPHY-AND-FONTS.md](./TYPOGRAPHY-AND-FONTS.md).

## Theme model (PE-50)

- **Light** (default), **Dark**, and **Match system** via Settings → **Appearance**. Preference persists in `PROZAEDIT_CONFIG.themePreference` (`light` | `dark` | `system`); effective palette is `data-pe-theme="light"|"dark"` on `<html>`.
- Colors come from CSS custom properties in `taskpane.css` (`:root` / `[data-pe-theme="light"]` / `[data-pe-theme="dark"]`). Light values match the pre–PE-50 shipped look.
- **Scope:** task pane only — Word document canvas and Office host chrome are unchanged.
- **System mode:** listens to `matchMedia('(prefers-color-scheme: dark)')` without overwriting the saved `system` choice in CONFIG.

## Semantic palette (current)

One vocabulary for all **seven tabs**, audit hubs, and Settings — **no per-tab accent colors**.

| Token | Role | Do not use for |
| --- | --- | --- |
| `--pe-primary-indigo` / `--primary` / `--pe-focus-ring` | Primary actions, links, focus rings, key Settings emphasis | Severity, workflow “success” copy alone |
| `--pe-success` / `--pe-success-bg` | **Workflow:** active step, current-tab underline, OK / completion states | Audit severity; decorative tab theming |
| `--pe-warning` / `--pe-warning-bg` | Caution copy (scope warnings, audit overview) | Finding severity (use traffic tokens) |
| `--pe-info` / `--pe-info-bg` | Secondary hovers, low-priority informational tints | Primary CTAs |
| `--pe-banner-tint-*`, `--pe-help-box-bg` | Full-width banners (simple mode, long-op, onboarding/help) | Card bodies or tab chrome |
| `--red` / `--red-bg`, `--orange` (+ style variants) | **Audit severity only** (critical / style traffic semantics) | Navigation, tabs, Settings group headers |

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

## Dark palette (PE-54 revision)

Direction: warm **editorial charcoal** (VS Code Dark+–style warmth), not blue-gray slate. Light tokens are frozen; only `[data-pe-theme="dark"]` values and dark-scoped rules change.

| Token | Hex (approx.) | Role |
| --- | --- | --- |
| `--bg` | `#1a1a1c` | Base wash (scope lists, inset wells) |
| `--surface` | `#212124` | Pane body, settings groups |
| `--pe-card-surface` | `#2a2a2e` | Cards, audit hubs, elevated panels |
| `--surface-subtle` | `#1f1f22` | Tabs bar, toolbar, chips row |
| `--surface-inset` | `#18181a` | Inputs, inactive chips, workflow steps |
| `--border` / `--border-muted` | `#3a3a3f` / `#2e2e32` | Dividers (subtle, non-glowing) |
| `--text` / `--text-muted` | `#ececec` / `#a3a3a8` | Primary and secondary copy |
| `--pe-primary-indigo` | `#8490ff` | Actions, links, focus (`--pe-focus-ring` ~`#9490ff`) |
| `--pe-success` / `--pe-success-bg` | `#5cb88a` / `#1e2e26` | Workflow OK, tab underline, completion |
| `--pe-warning` / `--pe-warning-bg` | `#d4a054` / `#2e2618` | Caution banners (desaturated gold) |
| `--red` / `--red-bg` | `#e89292` / `#3a2222` | Critical severity on cards |
| `--orange` / `--orange-bg` | `#e89656` / `#3a2818` | Style severity on cards |
| `--pe-help-box-bg`, `--pe-banner-tint-*` | `#252528`, `#404048` border | Subtle tinted banners (not saturated boxes) |
| `--pe-brand-bg` | `#141416` | Brand bar; wordmark filter in dark-only CSS |

PE-51 component polish (tabs, toolbar, settings modal, audit cards, focus rings) remains scoped under `[data-pe-theme="dark"]`.
