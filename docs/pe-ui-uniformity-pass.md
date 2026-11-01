# PE-43 — UI uniformity pass (task pane)

**Scope:** Word online, light theme, build **2.0.0.15** (no manifest bump).

## Applied in PE-43

- **`pe-btn` alias** on primary audit hubs and long-operation banner actions (still uses existing `btn-main` / `btn-secondary` tokens).
- **Audit tab badge** (`pe-tab-badge`) for open issue count; filter chips unchanged.
- **Checks scope chip** mirrors Target scope line (read-only).
- **Long-operation progress** row shared pattern on Checks and Audit hubs (label + Cancel link).
- **Status line** wrap with manual dismiss (`×`) plus 6s auto-clear.
- **Settings** search filter for groups; onboarding toggle grouped with other banner prefs.
- **`:focus-visible`** on toolbar tools (tabs already had rings).

## Remaining nits (defer)

- Card action buttons still mix `btn-go` / `btn-apply` without `pe-btn` — intentional (dense card layout).
- Partner tool row uses `btn-partner` only on Checks — not worth renaming.
- Some inline `style=` on Target callouts from PE-36 — migrate when that tab is next touched.
- Gemini optional blocks still use ad-hoc margins; Simple mode hide is CSS-driven.
