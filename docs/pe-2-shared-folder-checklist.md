# PE-2 — Word Desktop Shared Folder validation

> **Rewritten for the desktop fix.** Full guide: [DESKTOP-INSTALL.md](./DESKTOP-INSTALL.md). This page is the owner's tick-list.

**Cause of the earlier failures (now fixed):** the old script registered a local `file:///` path (Word needs a network `\\PC\Share` path), and the manifest had a 33-character resource id (Word Desktop most likely skips it; the limit is 32).

**Baseline:** build **2.0.0.60** on `main`. UI loads from GitHub Pages; the catalog only holds `manifest.hosted.xml`.

## Prerequisites

- [ ] Microsoft 365 or Word 2021+ (WebView2). Internet available.
- [ ] Repo copy on this PC with the manifest fix (resource id `ProzaEdit.LearnMoreUrl`, not `ProzaEdit.GetStarted.LearnMoreUrl`).
- [ ] **Word fully closed** (no `WINWORD.EXE`).
- [ ] Not a managed PC with Group Policy blocking add-ins (the verifier flags this).

## Route A: Shared Folder

1. [ ] Double-click **`Fix-ProzaEdit-SharedFolder.bat`**; accept the admin prompt.
2. [ ] Console says **Manifest passes the desktop checks**, **Network share OK: `\\<PC>\ProzaEditCatalog`**, **Registered Trusted Add-in Catalog**.
3. [ ] **`Verify-ProzaEdit-Install.bat`**: every line PASS.
4. [ ] Open Word (blank doc): **Home -> Add-ins -> Advanced -> SHARED FOLDER** tab -> **ProzaEdit** -> **Add**.
5. [ ] **Home -> ProzaEdit** opens the pane (not blank, not localhost). Run an audit on one test paragraph. Help -> About shows **2.0.0.60**.

## Route B: no admin

1. [ ] **`Sideload-ProzaEdit-Desktop.bat`**.
2. [ ] Open Word (blank doc): **Home -> ProzaEdit**, or **Home -> Add-ins -> Advanced -> Developer Add-ins**.
3. [ ] Same pane and audit check as A5.

## If it still does not appear

| Symptom | Try |
|--------|-----|
| SHARED FOLDER tab empty | Re-run the `.bat` (clears the Office cache). Run `Verify-ProzaEdit-Install.bat`; fix any FAIL. Use Route B. |
| Verify says resource id too long | Your repo copy is old; pull the latest `main`, re-run. |
| Share creation fails or `\\PC\ProzaEditCatalog` unreachable | Windows Firewall must allow "File and Printer Sharing" on this network; the **Server** service must be running. Use Route B. |
| Verify flags a Group Policy catalog or block | IT policy overrides per-user settings; ask IT, or use Word on the web. |
| Pane blank or "Office.js failed to load" | Check internet; wait 2-3 min after a deploy; Word must be Microsoft 365/2021+. |

## Undo

Double-click **`Uninstall-ProzaEdit.bat`** at the repo root (with Word closed).

## Log the result

Route used, appeared yes/no, Verify output, Word version (File -> Account). Record in [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md). Desktop stays **unverified** until this is done.

Fallback for everyone else: Word on the web upload ([BETA-TESTERS-INSTALL.txt](./BETA-TESTERS-INSTALL.txt)).
