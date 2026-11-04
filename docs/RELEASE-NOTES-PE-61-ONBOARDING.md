# Release notes — PE-61 onboarding (forum-research mitigations)

**Build:** UI **2.0.0.15** (no manifest bump)  
**Theme:** Reduce first-open overwhelm — Simple defaults, guided first report, clear manual-run expectation.

## User-facing changes

1. **First document session** — New documents with no saved settings start in **Simple mode** with **Critical**-first audit filter. A one-time banner explains Simple mode; **Don't show again** or turning Simple off marks onboarding complete so Simple is **not** re-enabled on later sessions.
2. **First audit checklist** — Collapsible checklist on **Checks** and a matching summary in **Help**, linking to [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md).
3. **Manual report copy** — Help states ProzaEdit runs **manual reports** on **Run report**, not live realtime underlines.
4. **Full manuscript scope** — Inline tip on Target when scope is **Full manuscript**; long-operation confirm copy for full-manuscript audits mentions **Selected chapters** / **Page range**.
5. **Workflow next step** — Subtle hint under the workflow strip until the first audit completes this session (hidden when cached or live audit cards exist).
6. **Mute → Dictionary nudge** — First **Mute** in a session shows a status line with a link to **Settings → Dictionary** (no modal).

## Technical

- `PROZAEDIT_CONFIG.firstRunComplete` persists onboarding completion per document.
- Pure helpers in `onboarding-helpers.js` (`resolveFirstRunOnLoad`, banner/workflow visibility) covered by `tests/first-run-onboarding.test.mjs`.

## QA

```bash
npm test
```

Spot-check: blank document → Simple on + banner; run audit → workflow hint hides; full scope → Target tip; first Mute → dictionary link in status.
