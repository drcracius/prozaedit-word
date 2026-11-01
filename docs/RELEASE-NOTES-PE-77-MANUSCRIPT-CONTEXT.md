# Release notes — PE-77 Manuscript Context Index

**Version:** 2.0.0.15 (no manifest bump)

> **Superseded in part by [PE-79](./RELEASE-NOTES-PE-79-WORD-FIXES.md) (2.0.0.16):** the index is a local *heuristic* outline (not AI), is sent to Google with Gemini calls, lives under its own settings key `PROZAEDIT_MCI_V2`, and is edit-aware. The text below describes the PE-77 original.

## Summary

Adds **Manuscript Context Index (MCI)**: a local, heuristic (non-AI), chunked full-document profile separate from audit scope so chapter-scoped runs still see story arc, continuity, and name seeds.

## User-visible changes

1. **Build full manuscript context** — Checks (primary when Simple mode off), Target details, Simple mode **More**, and Settings → **Manuscript context index**.
2. **Confirm dialog** — explains background read, cancel, local storage size hint.
3. **Progress** — long-operation banner: `Reading manuscript for context… section N/M`.
4. **Status badge** — **Full MS context ready** + timestamp; **stale** when paragraph count changed.
5. **Auto-refresh before audit** — optional setting (default off) with one-time warning.
6. **Help** — chapter audits + MCI paragraph.

## Technical

- New module: `src/taskpane/lib/manuscript-context-index.js`
- Config field: `PROZAEDIT_CONFIG.manuscriptContext` (+ `autoRefreshManuscriptContext`)
- Consumption: `buildManuscriptProfile`, `buildAuditContext`, `ContinuityGuard` augment on Apply
- Tests: `tests/manuscript-context-index.test.mjs`

## Docs

- [MANUSCRIPT-CONTEXT-INDEX.md](./MANUSCRIPT-CONTEXT-INDEX.md)
