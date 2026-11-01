# Release notes — PE-76 (long documents + dictionary)

**Build:** 2.0.0.15 (no manifest bump)  
**Base:** `main` post–PE-75 (`8eb60c1`)

---

## Long documents

- **Scoped manuscript index** — Background index build follows Target scope (chapters/pages/selection), not full body, unless scope is Full manuscript.
- **Read progress** — Audit scope read reports phase + `~N/M paragraphs` and soft-cap hints before hard truncate (`ScopeReader.formatReadStatus`).
- **Cooperative cancel** — Card render checks cancel between batches; audit cancel clears partial audit state so **Run audit** works without pane reload.
- **Resume hint** — Last paragraph progress stored in `sessionStorage` (`pe-scope-read-resume`) after cancel; cleared on successful audit (documented in Help).

Safety caps unchanged (450k full, per-mode limits in `ScopeReader.LIMITS`).

---

## Dictionary

- Settings: **filter**, **count badge**, explicit **Remove** control, **Add from last Mute**, **Copy/Import JSON** backup.
- Persistence unchanged: `PROZAEDIT_DICTIONARY` + `PROZAEDIT_MUTED` in document settings; regression tests extended.
- Help: step-by-step “Add character names” + long-document cancel/resume copy.

---

## Tests

132 total (+5 PE-76): `pe-76-scope-dictionary.test.mjs`, existing `settings-store-persistence.test.mjs`, `scope-reader-batching.test.mjs`.

---

## Still owner / vNext

PE-47 real Word validation, cross-device mute/dismiss sync, secure key vault, 5-tab IA, beta UX-4 sign-off.
