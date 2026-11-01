# ProzaEdit Word (hosted beta)

Microsoft Word task-pane add-in for local-first editorial audit, coach, and rewrite — optional Google Gemini with your own API key.

**Install (primary — Word on the web):** upload [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) once — [docs/BETA-TESTERS-INSTALL.txt](./docs/BETA-TESTERS-INSTALL.txt), [README.txt](./README.txt).  
**Final mile (validation + beta):** [docs/FINAL-MILE-PLAN-WEB.md](./docs/FINAL-MILE-PLAN-WEB.md) · manual checklist [docs/FULL-TEST-CHECKLIST-WORD-WEB.md](./docs/FULL-TEST-CHECKLIST-WORD-WEB.md).  
**Optional desktop appendix (deferred PE-2):** [scripts/install/README.md](./scripts/install/README.md), [Verify-ProzaEdit-Install.bat](./Verify-ProzaEdit-Install.bat) → [docs/pe-2-shared-folder-checklist.md](./docs/pe-2-shared-folder-checklist.md) — not required for web 1.0.  
**Production baseline:** **2.0.0.15** — `manifest.hosted.xml` + hosted UI on GitHub Pages · **57** `npm test` on `main` · **Simple mode default** UX bundle PE-63–67 ([#18](https://github.com/drcracius/prozaedit-word/pull/18)) · Web **1.0 RC** (owner Phase 1 **PE-47** open; desktop **PE-2** deferred).

**New users:** Simple mode stays on for a guided **Start → Run → Fix → Help** path (scope, run audit, fix cards). Turn off Simple in **Settings → Essentials** for Coach, Rewrite, and Thesaurus. See [docs/RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md](./docs/RELEASE-NOTES-UX-BUNDLE-2.0.0.15.md).

## Primary roadmap (chat-approved)

Execution tracker and phase acceptance: **[docs/prozaedit-implementation-plan-audited.md](./docs/prozaedit-implementation-plan-audited.md)**

Approved beta scope vs vNext north star (~42%): **[docs/prozaedit-approved-scope-vs-vnext.md](./docs/prozaedit-approved-scope-vs-vnext.md)**

## Developer quick links

| Doc | Purpose |
|-----|---------|
| [prozaedit-features.md](./docs/prozaedit-features.md) | As-built feature reference |
| [FINAL-MILE-PLAN-WEB.md](./docs/FINAL-MILE-PLAN-WEB.md) | Web beta final mile (owner) |
| [PHASE-1-QUICKSTART.md](./docs/PHASE-1-QUICKSTART.md) | Owner Phase 1 entry |
| [HOSTED-SMOKE-LAST-RUN.md](./docs/HOSTED-SMOKE-LAST-RUN.md) | Last agent HTTP smoke (PE-48) |
| [FINAL-AUDIT-PE-49.md](./docs/FINAL-AUDIT-PE-49.md) | PE-49 final audit |
| [source-of-truth.md](./docs/source-of-truth.md) | Version + status pointers |
| [WHEN-YOU-RETURN.md](./docs/WHEN-YOU-RETURN.md) | Version bump + smoke checklist |
| [WORKFLOWS.md](./docs/WORKFLOWS.md) | Partner tools (Editor, Copilot, WMT) |

**CI:** `npm test` — pure JS tests (no Office.js). Version strings: `bash scripts/verify-version-sync.sh`.
