# ProzaEdit task pane — UI color & typography (PE-37)

## Theme model

- **Single light theme** only in shipped builds. Colors come from CSS custom properties in `taskpane.css` (`:root` tokens).
- **No user theme toggle** in the task pane. Dark mode and a full theme switcher are **deferred to vNext** (would need host-safe contrast testing and manifest/product sign-off).

## Semantic palette (current)

| Token | Role |
| --- | --- |
| `--pe-primary-indigo` / `--primary` | Primary actions (Run audit, links, focus rings) |
| `--pe-success` / `--pe-success-bg` | OK states, active workflow step, tab underline accent |
| `--pe-warning` / `--pe-warning-bg` | Caution copy (audit overview, scope warnings) |
| `--pe-info` / `--pe-info-bg` | Subtle tints (Settings header, secondary hover) |
| `--red` / `--red-bg`, `--orange` | Audit severity (critical / style) — unchanged traffic semantics |

Typography: **12px** body (`line-height` ~1.45), **13px semibold** section titles, **10–11px** muted help.

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
| **Audit & reports** | Report depth, default audit filter, extended checks default; **Reset Audit & reports**; Audit tab hints read Settings selects | no |
| **Privacy & diagnostics** | Crash opt-in, problem report note + button, GitHub fallback; **Reset Privacy** | no |
| **Reference & citations** | Capture reference style, verify citations shortcut | no |
| **Dictionary** | Per-document word list; **Clear dictionary** | no |
| **Custom style** | Custom panel (name, rules, bulk import, presets); **Reset custom style rules** | when rules exist or custom guide selected |

**Target** keeps profile, scope, style guide `<select>`, Simple mode summary line, custom rules count line. **Help → Diagnostics** points to Settings → Privacy.

## Contrast

Accent greens and indigo are chosen for readable text on white/slate surfaces in narrow Word web panes; severity chips keep existing high-contrast traffic colors.
