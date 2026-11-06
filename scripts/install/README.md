# ProzaEdit install scripts (Word Desktop, Windows)

The task pane loads from GitHub Pages; Word only needs the manifest (`manifest.hosted.xml`). Step-by-step guide and reasons: [docs/DESKTOP-INSTALL.md](../../docs/DESKTOP-INSTALL.md). Owner tick-list: [docs/pe-2-shared-folder-checklist.md](../../docs/pe-2-shared-folder-checklist.md).

Word Desktop cannot "Upload My Add-in". Two supported routes (pick one, with Word closed):

| Route | Double-click | Admin | Appears in |
|---|---|---|---|
| Shared Folder (Microsoft-documented) | `Fix-ProzaEdit-SharedFolder.bat` | one prompt (creates the share) | Home -> Add-ins -> Advanced -> SHARED FOLDER |
| Developer sideload | `Sideload-ProzaEdit-Desktop.bat` | none | Home tab -> ProzaEdit |

Other entry points (repo root):

- `Install-ProzaEdit-Desktop-GitHub.bat`: copy + validate the manifest only (no registry changes).
- `Uninstall-ProzaEdit.bat`: remove Shared Folder catalog, developer sideload, and share (Word must be closed).
- `Verify-ProzaEdit-Install.bat`: read-only PASS/FAIL report. Send its output when asking for help.

## What the PowerShell script does

`Install-ProzaEdit-GitHub.ps1`:

1. Copies `manifest.hosted.xml` from this repo (or downloads it with `-Download`) into `%USERPROFILE%\ProzaEditCatalog\`.
2. Checks it the way Word Desktop and Word web upload do: resource ids max 32 characters, `https`, no `localhost`, **AppDomain site roots only** (no `/prozaedit-word` path). Stops with a clear message if it fails.
3. `-RegisterLocalCatalog`: shares the folder as `\\<this PC>\ProzaEditCatalog` (elevated step only for the share) and writes `HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{GUID}` with `Url` = the **UNC path**, `Flags` = 1. Removes the old broken `file:///` entry if present.
4. `-DeveloperSideload`: writes the manifest path to `HKCU\Software\Microsoft\Office\16.0\Wef\Developer` (value name = add-in id), the same key Microsoft's `office-addin-dev-settings` uses.
5. `-ClearOfficeCache`: empties `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\` (Word must be closed).
6. `-Uninstall`: removes the catalog entry, developer entry and share; leaves the folder.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install\Install-ProzaEdit-GitHub.ps1 -RegisterLocalCatalog -ClearOfficeCache
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install\Install-ProzaEdit-GitHub.ps1 -DeveloperSideload -ClearOfficeCache
```

## Defaults

| Setting | Value |
|---------|--------|
| Manifest source | the repo copy next to the scripts; `-Download` uses `https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml` |
| Catalog folder | `%USERPROFILE%\ProzaEditCatalog\` |
| Share | `\\%COMPUTERNAME%\ProzaEditCatalog` |
| Add-in ID | `d1829e3a-4931-4122-b911-37f22941aa99` |
| Catalog registry id | `{f4a7d3c1-8b2e-4c59-9a1d-6e0b3c5d7f21}` |

## Notes

- Group Policy under `HKCU\Software\Policies\Microsoft\Office\16.0\WEF` overrides the per-user keys; the script and verifier warn when it is present.
- A LAN share on another PC also works: copy the manifest there and add its UNC path under TrustedCatalogs (or via Word -> File -> Options -> Trust Center -> Trusted Add-in Catalogs -> tick "Show in Menu").
- Execution policy: the `.bat` files pass `-ExecutionPolicy Bypass`. If Windows blocks a downloaded `.ps1`, right-click -> Properties -> Unblock.
- Status: **desktop loading is unverified in real Word** until the owner logs a result.

## Related

- `docs/WORKFLOWS.md`, `docs/BETA-TESTERS-INSTALL.txt` (Word on the web)
- `_archive/local-dev/` (archived localhost dev, not needed)
