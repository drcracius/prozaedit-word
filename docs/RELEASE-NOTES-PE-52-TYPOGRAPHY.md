# Release notes — PE-52 typography

**Scope:** Task pane CSS only. **No manifest version bump** (system font stack).

## Changes

- Introduced typography CSS variables (`--pe-font-sans`, size scale, line heights, weight scale) applied across light and dark themes.
- Body text **13px** with Segoe UI Variable / system-ui stack; controls inherit the same family.
- Tab labels **11px** (minimum **10px** on narrow pane — removed 8px tabs).
- Section titles **14px**; Settings modal and audit cards aligned to the shared scale.
- Subtle `-webkit-font-smoothing: antialiased` on body.

## Docs

- [TYPOGRAPHY-AND-FONTS.md](./TYPOGRAPHY-AND-FONTS.md) — audit, options A/B/C, optional Inter phase.

## Validation

- `npm test` (unit)
- Manual: narrow pane + Settings + Audit cards in light and dark (see checklist §7 / §9).
