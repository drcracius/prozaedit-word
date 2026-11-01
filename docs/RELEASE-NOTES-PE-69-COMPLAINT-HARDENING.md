# Release notes — PE-69 complaint hardening

**Build:** 2.0.0.15 (hosted) · **No manifest bump**

## Summary

PE-69 hardens the card-by-card review flow against recurring writing-add-in complaints: losing place after an action, unclear progress, unhelpful Word-host failures, cancellation ambiguity, and unclear optional-cloud behavior.

## Shipped

- Audit cards show **Finding X of Y**.
- After **Mute**, **Dismiss**, or successful **Apply**, the current filter/sort remains active, scroll is stabilized, and keyboard focus advances to the next available card/action (or the prior card at the end).
- Word-host failures now suggest retrying, reopening the task pane, and using a smaller scope where appropriate.
- A failed audit no longer announces **Audit finished**.
- Long-operation cancel controls use an atomic live status, expose an accessible label, and show **Cancelling…** while waiting for a safe cooperative stop.
- The onboarding tour traps Tab/Shift+Tab focus inside its modal until Done, Skip, or Escape.
- Gemini chat/rewrite controls say that prompt/context is sent to Google only when the user clicks the cloud action.
- Settings warns that **Remember in this document** stores the Gemini key in the Word document and should remain off for shared files.
- Thesaurus copy explains that an online lookup sends only the search word to Datamuse.

## Guardrails retained

- No realtime checking.
- No new report or subscription.
- No default manuscript upload.
- Local audit and Local Coach remain local-first.
- Confirm-before-apply and ProzaEdit undo/redo remain enabled.
- No dependency, manifest, or build-version change.

## Verification

- `npm test` — **60/60 pass** (3 focused PE-69 tests added).
- `bash scripts/verify-version-sync.sh` — **2.0.0.15** remains aligned.
- `git diff --check` — clean.
- Static HTML/JS wiring scan — **0 missing ids**, **0 undefined inline handlers**.

## Research and ownership

See [WRITING-ADDIN-COMPLAINT-AUDIT-PE-69.md](./WRITING-ADDIN-COMPLAINT-AUDIT-PE-69.md) for cited ProWritingAid, Grammarly, PerfectIt, LanguageTool, Writefull, and Hemingway evidence; the complete gap matrix; and owner vs Microsoft vs vNext risks.

The current audit rating is unchanged pending manual Word Web/desktop, long-document, keyboard/screen-reader, and API-key-storage validation.
