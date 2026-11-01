# Release notes — PE-79 Word add-in fixes (from the PE-78 review)

**Version:** 2.0.0.16 (manifest bump — testers re-upload `manifest.hosted.xml` once)

## Summary

Fixes the correctness, honesty and reliability problems found in the PE-78 code review of the PE-77 Manuscript Context Index (MCI) and the Simple/Advanced modes. Word only.

## What changed

1. **Whole-book names, motifs and time cues.** Names and time cues are read from every paragraph; frequent words use an evenly spaced sample across the whole book instead of the first ~120k characters. Long-fixture tests (100k+ words) prove a name that first appears in the last chapter is captured.
2. **The audit now uses the index.** The recurring-name roster adds conservative "possible spelling variant of *Name*" suggestions (preference-type only, fresh index only, never for dictionary words or words that also appear in lowercase).
3. **Edit-aware staleness.** Per-chapter hashes, a document hash and a probe-paragraph fingerprint detect edits inside a paragraph, not just paragraph-count changes. A visible **"index may be out of date — Refresh index"** notice appears on Checks, Coach and Rewrite and in Settings. A stale index is **included in Gemini prompts, flagged**, never silently dropped.
4. **Gemini prompt budget.** Head-truncation is replaced by a budgeted builder: instruction, question and the end of the excerpt are kept; the index and context are trimmed first, with a visible note.
5. **Honest copy.** The index is described as a local heuristic outline, not an AI summary, and every privacy/help/doc string now says the index **is sent to Google with Gemini calls**.
6. **Simple mode.** "AI help (optional)" is visible in Simple mode — off until a key is set, with a one-click route to Settings → Essentials. The lexical shaper no longer applies while hidden in Simple. Simple/Advanced toggling mid-session is covered by tests.
7. **Storage.** The index moved out of `PROZAEDIT_CONFIG` into its own versioned key `PROZAEDIT_MCI_V2` (cap ~64k) with a graceful degradation ladder and a visible note when chapters are not stored. Failed saves are rolled back and never touch the main config. PE-77 documents migrate automatically.
8. **Other fixes found while verifying:** freshness was never actually evaluated after a reload; front matter was credited to the last chapter; the rolling outline cut off the end of the book; the audit summary and local Coach dumped the whole index text; the Continuity Guard matched names by substring ("the" inside "Theodore"); `listChapters` made one huge Word sync and loaded text for every paragraph (now batched, text only for headings); a Gemini token-ceiling block in Simple mode gave no hint where to change it (the message now says); Rewrite without a key routed to the Coach tab.

## Technical

- `src/taskpane/lib/manuscript-context-index.js` rewritten (index format version 2, storage envelope version 2; reads version 1).
- `src/taskpane/lib/gemini-client.js`: `buildBudgetedPrompt`, `fitPrompt`.
- `src/taskpane/lib/settings-store.js`: `KEYS.MCI`, `setAsyncGuarded`.
- `src/taskpane/lib/audit-engine.js`, `proper-noun-analyse.js`, `continuity-guard.js`, `scope-reader.js`, `lexical-shaper.js`.
- Tests: `tests/pe-79-word-fixes.test.mjs`, `tests/pe-79-taskpane-wiring.test.mjs`.

## Not changed / deferred

See "Fixed in PE-79" in the PE-78 report. Highlights: continuity's older name index still samples the head of long books, no resumable build, no per-chapter incremental rebuild, no AI story-bible layer, no Google Docs adapter, and real-Word timing on very large documents is unmeasured.

## Docs

- [MANUSCRIPT-CONTEXT-INDEX.md](./MANUSCRIPT-CONTEXT-INDEX.md)
- [PRIVACY-AND-DATA-PE.md](./PRIVACY-AND-DATA-PE.md)
