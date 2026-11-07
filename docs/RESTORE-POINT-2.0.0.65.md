# Restore point 2.0.0.65 (pre–master engine)

**When to use:** Before wiring `ProzaEdit.MasterEngine` into the taskpane, or if integration needs a clean rollback.

| Item | Value |
|------|--------|
| Build | `2.0.0.65` |
| Git tag | `v2.0.0.65` |
| Milestone tag | `pe-97-restore-pre-master-engine` |
| Branch | `pre-master-engine-v4` (same commit as tagged `main`) |

**Included in this snapshot**

- All **2.0.0.64** pane work (replace list, desktop page layout, labels, Essentials link, grade-note threshold, etc.).
- Planning docs only (not loaded by the add-in):
  - `docs/ProzaEdit-Major Style and Lexical Update.md` — integration plan, lane mapping, phased deprecation.
  - `docs/ProzaEdit - Comprehensive Master Engine & Lexical Suite.js` — reference engine v4 (`AuditPipeline.audit()`).

**Still live in the pane**

- `src/taskpane/lib/audit-engine.js` and the existing script stack (`style-guide-rules.js`, `editor-heuristics.js`, etc.).

**Return here**

```bash
git checkout v2.0.0.65
# or
git checkout pre-master-engine-v4
```

Release notes: `docs/RELEASE-NOTES-PE-81.md` (section 2.0.0.65).
