# ProzaEdit install scripts (GitHub-hosted beta)

**Production UI** loads from GitHub Pages after Office registers **`manifest.hosted.xml`**. **Primary beta path:** Word on the web upload ([FINAL-MILE-PLAN-WEB.md](../../docs/FINAL-MILE-PLAN-WEB.md), [BETA-TESTERS-INSTALL.txt](../../docs/BETA-TESTERS-INSTALL.txt)). Web **1.0 RC** on `main` (**2.0.0.16**, **168** tests; merged PRs #2–#5). These scripts are an **optional desktop appendix** (**PE-2 deferred**); they download the manifest from GitHub and do **not** replace the one-time web upload for most consumer accounts.

---

## Quick start (Windows)

From repo root (double-click or cmd):

```text
Install-ProzaEdit-Desktop-GitHub.bat
```

PowerShell directly:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\install\Install-ProzaEdit-GitHub.ps1"
```

Optional Shared Folder catalog (desktop, **PE-2 deferred — skip unless you need desktop catalog**):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\install\Install-ProzaEdit-GitHub.ps1" -RegisterLocalCatalog
```

Or:

```text
Fix-ProzaEdit-SharedFolder.bat
```

Read-only PE-2 verification (manifest + TrustedCatalog registry, no changes):

```text
Verify-ProzaEdit-Install.bat
```

See `docs/pe-2-shared-folder-checklist.md` → **Automated verify**.

---

## Defaults

| Setting | Value |
|---------|--------|
| Manifest URL | `https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml` |
| Local catalog folder | `%USERPROFILE%\Documents\ProzaEdit\catalog\` |
| Add-in ID | `d1829e3a-4931-4122-b911-37f22941aa99` |

---

## Shared Folder / SMB (example only)

Some authors use a **network share** for the Office **SHARED FOLDER** tab (e.g. `\\OTHP15\ProzaEditCatalog\` on a home LAN). **Do not assume that path exists** — it is an example hostname only. Prefer:

1. **Web upload** (see `docs/WHEN-YOU-RETURN.md`), or  
2. **Local catalog folder** + `-RegisterLocalCatalog` on the PC where Word runs.

If you use a LAN share, copy `manifest.hosted.xml` to the share root and register **that UNC URL** in `HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs` (see Microsoft docs for Trusted Catalogs). Clear Office cache if the add-in list is stale:

```text
%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\
```

(Back up before deleting; restart Word.)

---

## Execution policy

Scripts use `-ExecutionPolicy Bypass` from the `.bat` wrappers. Corporate PCs may block downloads; unblock the `.ps1` file properties or run from an elevated PowerShell if your policy requires it.

---

## Related

- `docs/WORKFLOWS.md` — editing stack  
- `docs/BETA-TESTERS-INSTALL.txt` — tester one-pager  
- `_archive/local-dev/` — archived localhost Node dev (not required for hosted beta)
