# ProzaEdit Word (hosted beta)

Microsoft Word task-pane add-in for local-first editorial audit, coach, and rewrite — optional Google Gemini with your own API key.

**Install (daily use):** see [README.txt](./README.txt) and [docs/BETA-TESTERS-INSTALL.txt](./docs/BETA-TESTERS-INSTALL.txt).  
**Windows catalog / Shared Folder (PE-2, repo scripts only):** [scripts/install/README.md](./scripts/install/README.md), [Verify-ProzaEdit-Install.bat](./Verify-ProzaEdit-Install.bat) → [docs/pe-2-shared-folder-checklist.md](./docs/pe-2-shared-folder-checklist.md) (owner must run proof on a Windows PC).  
**Production baseline:** **2.0.0.15** — `manifest.hosted.xml` + hosted UI on GitHub Pages.

## Primary roadmap (chat-approved)

Execution tracker and phase acceptance: **[docs/prozaedit-implementation-plan-audited.md](./docs/prozaedit-implementation-plan-audited.md)**

Approved beta scope vs vNext north star (~42%): **[docs/prozaedit-approved-scope-vs-vnext.md](./docs/prozaedit-approved-scope-vs-vnext.md)**

## Developer quick links

| Doc | Purpose |
|-----|---------|
| [prozaedit-features.md](./docs/prozaedit-features.md) | As-built feature reference |
| [WHEN-YOU-RETURN.md](./docs/WHEN-YOU-RETURN.md) | Version bump + smoke checklist |
| [WORKFLOWS.md](./docs/WORKFLOWS.md) | Partner tools (Editor, Copilot, WMT) |

**CI:** `npm test` — pure JS tests (no Office.js). Version strings: `bash scripts/verify-version-sync.sh`.
