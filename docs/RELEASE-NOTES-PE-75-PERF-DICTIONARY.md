# Release notes — PE-75 (performance, dictionary, list UX)

**Build:** 2.0.0.15 (no manifest bump)  
**Branch:** agent PE-75 — ScopeReader batching, audit list “Show next 100”, Go to recovery, persistence regression tests.

---

## Shipped

### Long documents & manuscript index

- Manuscript index build uses **chunked paragraph reads** with **micro-yields** between Office.js batches (same 600k character cap as before).
- **Workflow status line** shows paragraph progress during background index build when no other long operation is active.
- Stale index builds are **superseded** when a newer build starts (cooperative cancel between batches).

### False positives & dictionary (honest persistence)

- Confirmed **dictionary** and **document mute rules** persist via `Office.context.document.settings` (`PROZAEDIT_DICTIONARY`, `PROZAEDIT_MUTED`); regression test added.
- Help clarifies dictionary is stored in **document settings**, not only the browser tab.

### Audit list (UI only)

- When findings exceed the render cap (300 by default), **Show next 100** loads more cards without re-running the audit; **filter is preserved**.

### Go to recovery

- Failed **Go to** registers **Try again** in the recovery bar and links to **Help → Go to troubleshooting**.

---

## Owner-only / unchanged

- Real Word 50k–100k validation (**PE-47**), cross-device mute/dismiss sync, manifest bump, vNext 5-tab IA.

---

## Tests

- New unit tests: ScopeReader batch planning + cancel-between-batches; Settings document persistence for dictionary/mute.
