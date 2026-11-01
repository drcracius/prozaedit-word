# Release notes — UX bundle (PE-63–67) · build 2.0.0.15

**Audience:** D Cracius and beta testers  
**Build:** hosted **2.0.0.15** — **no manifest re-upload** for this UX pack (same `manifest.hosted.xml` version)  
**Refresh:** Close and reopen the task pane after GitHub Pages updates (1–3 min cache).

---

## One-line summary

**Simple mode is the default path:** scope on **Start**, **Run** one audit, **Fix** cards on **Important** first — with a skippable tour, Essentials-first Settings, and links so you never hit a dead end.

---

## First session

1. **Simple mode on** — hides Thesaurus; de-emphasizes Coach/Rewrite; Audit opens on **Important** (Simple) or **Critical** (full mode).
2. **Banner → optional 3-step tour** — Target scope → Run audit → Fix cards (PE-63). Skip anytime.
3. **Tab strip (Simple)** — **Start · Run · Fix · Help** (PE-67). Full names return when Simple is off.
4. **Related workflow steps** — Under the toolbar: change scope, run again, view issues, dictionary (PE-67).
5. **Settings → Essentials** — API key (optional), theme, Simple mode; advanced groups collapsed (PE-64).

**Not realtime:** checks run when you click **Run audit**, not while you type.

---

## By ticket (detail)

| PE | Highlights |
|----|------------|
| **63** | [RELEASE-NOTES-PE-63-UX-TOUR.md](./RELEASE-NOTES-PE-63-UX-TOUR.md) — tour, scope footnote |
| **64** | [RELEASE-NOTES-PE-64-SIMPLIFY.md](./RELEASE-NOTES-PE-64-SIMPLIFY.md) — Essentials, Checks collapse |
| **65** | [RELEASE-NOTES-PE-65-AVERAGE-USER.md](./RELEASE-NOTES-PE-65-AVERAGE-USER.md) — plain language |
| **66** | [RELEASE-NOTES-PE-66-AVERAGE-POLISH.md](./RELEASE-NOTES-PE-66-AVERAGE-POLISH.md) — Important labels, dictionary nudge |
| **67** | [RELEASE-NOTES-PE-67-TAB-FLOW.md](./RELEASE-NOTES-PE-67-TAB-FLOW.md) — tab order, cross-nav |

---

## Tests & CI

- **`npm test`:** **57** unit tests (pure JS; no Office.js).
- **Version sync:** `scripts/verify-version-sync.sh` on every PR to `main`.

---

## What we did not change

- Manifest version / ribbon (still **2.0.0.15**)
- Seven tabs when Simple mode is off
- ScopeReader caps or realtime underline engine

---

## Try it (~10 min)

[PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) — **Average-user 10-minute path**

Full validation: [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md)

---

## Post-merge review

[FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md)
