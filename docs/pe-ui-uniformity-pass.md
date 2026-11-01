# PE-43 / PE-45 — UI uniformity pass (task pane)

**Scope:** Word online, light theme, build **2.0.0.15** (no manifest bump).

## Applied in PE-43

- **`pe-btn` alias** on primary audit hubs and long-operation banner actions (still uses existing `btn-main` / `btn-secondary` tokens).
- **Audit tab badge** (`pe-tab-badge`) for open issue count; filter chips unchanged.
- **Checks scope chip** mirrors Target scope line (read-only).
- **Long-operation progress** row shared pattern on Checks and Audit hubs (label + Cancel link).
- **Status line** wrap with manual dismiss (`×`) plus 6s auto-clear.
- **Settings** search filter for groups; onboarding toggle grouped with other banner prefs.
- **`:focus-visible`** on toolbar tools (tabs already had rings).

## Fixed in PE-45 (P0/P1 nits)

- **Run audit hubs** (Checks + Audit): same flash SVG + label pattern as toolbar Run audit (`aria-label` unchanged).
- **Simple mode + Audit:** one-line banner on Audit tab + filter hint copy when Simple is on.
- **Scope chips:** Audit tab read-only scope chip matches Checks wording.
- **Card actions:** +2px vertical separation between primary and secondary button rows.
- **Batch controls:** `pe-btn` on Run batch; Cancel batch uses `btn-linkish pe-btn` (aligned with long-op Cancel).
- **Checks eligibility:** single open `<details>` at top of Checks for fiction vs academic gating.
- **Shaper sliders:** persisted in `PROZAEDIT_CONFIG`; in-panel reset to defaults.

## Remaining nits (defer)

- Card action buttons still mix `btn-go` / `btn-apply` without `pe-btn` — intentional (dense card layout).
- Partner tool row uses `btn-partner` only on Checks — not worth renaming.
- Some inline `style=` on Target callouts from PE-36 — migrate when that tab is next touched.
- Gemini optional blocks still use ad-hoc margins; Simple mode hide is CSS-driven.
- Empty Audit emoji icon (📝) — low priority vs SVG empty state.
