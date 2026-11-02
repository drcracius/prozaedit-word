# ProzaEdit in Word Desktop (Windows)

Status: **fixed in source, not yet confirmed in real Word Desktop.** The owner must run it once and report back (see "Report back" below).

## Why the earlier Shared Folder attempts failed

Two independent causes, both fixed:

1. **Local path instead of a network path.** Word's Trusted Add-in Catalog must be a network share (`\\PC\Share`). The old script registered a local `file:///C:/...` address, which Word ignores. ([Microsoft: network share catalog](https://learn.microsoft.com/en-us/office/dev/add-ins/testing/create-a-network-shared-folder-catalog-for-task-pane-and-content-add-ins))
2. **Manifest id one character too long.** `ProzaEdit.GetStarted.LearnMoreUrl` was 33 characters; Office allows 32. This breaks Microsoft's manifest schema. Word on the web has accepted the upload, but Word Desktop validates strictly and most likely skipped the whole add-in, which would explain why ProzaEdit never appeared in the list (inferred from the schema, not yet observed in Word). Both manifests now use `ProzaEdit.LearnMoreUrl`, and `tests/manifest-desktop.test.mjs` fails the build if any id goes over 32.

On the owner's PC the check found no catalog registered at all, no policy block, WebView2 present, and file sharing running, so nothing else was in the way.

## Requirements

- Microsoft 365 or Word 2021+ (needs the WebView2 engine). Older Word uses Internet Explorer and cannot run the pane.
- Internet (the pane loads from GitHub Pages).
- A copy of this repo on the PC. Run the steps below from the repo folder.

## Route A: Shared Folder (Microsoft-documented)

1. Close Word completely (Task Manager: no `WINWORD.EXE`).
2. Double-click **`Fix-ProzaEdit-SharedFolder.bat`**. Accept the one Windows admin prompt (it creates the share `\\<your PC>\ProzaEditCatalog`).
3. Open Word with a blank document: **Home -> Add-ins -> Advanced**, click the **SHARED FOLDER** tab, select **ProzaEdit**, click **Add**.
4. **Home -> ProzaEdit** opens the pane.

## Route B: no admin, no share

1. Close Word completely.
2. Double-click **`Sideload-ProzaEdit-Desktop.bat`**.
3. Open Word with a blank document. Look for **Home -> ProzaEdit**. If missing: **Home -> Add-ins -> Advanced -> Developer Add-ins**.

This uses the same registry entry (`HKCU\Software\Microsoft\Office\16.0\Wef\Developer`) that Microsoft's own add-in tools use. It is not listed under SHARED FOLDER.

Pick one route; do not run both (the add-in would appear twice).

## Route C: Word on the web

office.com -> Word -> Insert -> Add-ins -> Upload My Add-in -> `manifest.hosted.xml` (see [BETA-TESTERS-INSTALL.txt](./BETA-TESTERS-INSTALL.txt)). Not available inside desktop Word.

## Check or undo

- **Check (read-only):** `Verify-ProzaEdit-Install.bat` lists PASS/FAIL for the manifest, the share, the catalog entry and any blocking policy.
- **Undo:** `powershell -File scripts\install\Install-ProzaEdit-GitHub.ps1 -Uninstall`
- **Empty list after a manifest change:** re-run the `.bat` (it clears `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`).

## Not covered

- **Microsoft Store (AppSource) listing.** That is the only way to a normal "Get Add-ins" install for other people. It needs a Partner Center account, a publisher identity, a public privacy policy and support contact, and Microsoft validation (decision D14 in the handoff: deferred). Shared Folder is for testing only; Microsoft does not support it for production.
- **Managed/work PCs** where Group Policy sets Trusted Catalogs or blocks web add-ins. `Verify-ProzaEdit-Install.bat` flags this; IT must allow it.
- Mac (see Microsoft's Mac sideload guide) and Word for iPad.

## Report back

After one attempt, send: which route, whether ProzaEdit appeared, the output of `Verify-ProzaEdit-Install.bat`, and Word's version (File -> Account). Until then, treat desktop support as **unverified**.
