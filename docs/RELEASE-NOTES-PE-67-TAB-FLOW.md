# Release notes — PE-67 tab flow and cross-navigation

**Build:** 2.0.0.15 (hosted) · **No manifest bump**

## Summary

PE-67 makes the **Target → Checks → Audit → Help** path obvious in Simple mode and adds **related-step links** so users can move back and forth without dead ends. Anti–ProWritingAid-style copy reinforces **one audit pipeline** and **manual Run** (not realtime).

## Shipped

### Tab strip

- **Simple mode:** tabs ordered and labeled **Start · Run · Fix · Help** (internal tab ids unchanged); Coach/Rewrite stay available but last.
- **Full mode:** tabs reordered to **Target · Checks · Audit · Thesaurus · Coach · Rewrite · Help**.

### Cross-navigation

- **Related workflow steps** strip under the toolbar (scope, run again, view issues, dictionary).
- After **Run audit**, Checks shows a link to **View issues on Fix** (Audit tab).

### Target

- **Analysis scope** moved above optional manuscript profile; chapter-first tips link to Help.

### Audit

- Filter chips show **Critical/Important first**, then Style, Style guide, then All.
- Name-like cards include **Manage dictionary** footer (Settings deep link).

### Settings → Essentials

- **All features** line when Simple mode is on (what appears after turn-off).

### Copy (Simple mode)

- Shared **one pipeline** hint on Checks and Audit headers.
- Canonical **non-realtime** line at Run audit (unchanged text, deduped behavior).

## Tests

- `workflow-nav-helpers.test.mjs` — tab order, cross-nav rules, dictionary footer visibility.
- Taskpane wiring asserts for new DOM ids and helpers.

## Docs

- Store review: `prozaedit-pe-67-tab-flow-and-pwa-mitigations.md` (Project Context).
- [BETA-ONBOARDING-COMMS.md](./BETA-ONBOARDING-COMMS.md) — one bullet on tab flow.

## Deferred (vNext)

- Five-tab IA merge, manifest bump, Office.js CI (**PE-69**), new report types.
