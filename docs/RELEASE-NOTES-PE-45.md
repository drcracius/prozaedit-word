# Release notes — PE-45 final product polish

**Build:** 2.0.0.15 (no manifest change)

## User-facing

- **Simple mode:** Audit tab shows a short banner explaining the **Critical**-first filter; default-filter hint updates when Simple is on.
- **Checks:** One eligibility callout at the top (fiction vs academic / citation) so non-fiction users see gating without hunting copy.
- **Audit / Checks:** Read-only **scope** chip on Audit matches Checks; Run audit buttons use the same icon style as the toolbar.
- **Audit cards:** Slightly more space between primary and secondary actions to reduce mis-taps.
- **Rewrite shaper:** Complexity / Intensity / Density values save with the document; reset link in the shaper panel restores defaults (3 / 4 / 2).
- **Batch audit:** Cancel control styling aligned with other long-operation Cancel links.

## Notes

- Cancelling a long Word read (audit, scans, batch) still works via the progress row. **Gemini** Coach / Rewrite / Deep audit HTTP calls are not aborted by that Cancel (client timeout only).

## Docs / tests

- UI uniformity backlog updated; shaper CONFIG helpers covered by unit tests.
