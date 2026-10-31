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

- **Settings:** Back (same as Close) + Escape.
- **Rewrite from audit card:** session “Back to Audit” until dismissed.

## Contrast

Accent greens and indigo are chosen for readable text on white/slate surfaces in narrow Word web panes; severity chips keep existing high-contrast traffic colors.
