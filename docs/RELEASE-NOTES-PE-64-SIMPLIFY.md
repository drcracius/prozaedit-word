# Release notes — PE-64 UX simplify (UI-only)

**Build:** 2.0.0.15 (no manifest bump)  
**Branch:** ships with PE-63 tour on PR #18 when merged  
**Analysis:** [prozaedit-pe-64-complexity-reduction.md](https://github.com/drcracius/prozaedit-word/blob/main/docs/prozaedit-pe-64-complexity-reduction.md) (Project store mirror)

---

## User-visible changes

1. **Simple mode polish** — Thesaurus still hidden; **Coach** and **Rewrite** tabs de-emphasized; Target shows **Recommended: Selected chapters + Light/Balanced** when Simple mode is on.
2. **Checks density** — **Run audit** and four core toggles stay primary; extended checks, partner tools, long-manuscript tools, fiction modules, citation, and timeline scans collapse under **More checks (optional)** (closed by default).
3. **Settings Essentials** — Opening Settings expands only **Essentials** (Simple mode, optional API key, theme); other groups are **Advanced — …** and collapsed by default.
4. **Onboarding sequencing** — Simple-mode banner, session tips, checklist, and tour no longer stack; tour waits for banner dismissal; checklist hidden while banner or tour is active.
5. **Legacy chapter selects removed (F-58-4)** — Chapter scope uses Heading 1–3 checklist only; saved configs still migrate from old single/range fields on load.

---

## Docs

- [BETA-ONBOARDING-COMMS.md](./BETA-ONBOARDING-COMMS.md) — owner copy-paste for beta email/release notes
- PE-63: [RELEASE-NOTES-PE-63-UX-TOUR.md](./RELEASE-NOTES-PE-63-UX-TOUR.md)

---

## Tests

Unit tests updated for onboarding gating and scope migration; run `npm test`.
