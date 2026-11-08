# When you return — ~5 minutes to finish beta in Word

Steps **1–5** are done (GitHub Pages + hosted manifest). You only need **Step 6** (web upload — use **office.com** if desktop Word has no Upload).

**Build 2.0.0.67** is the working copy. It is not the copy Word opens until it is published. **546** tests. Owner Phase 1 (**PE-47**) open. Word Desktop install: [DESKTOP-INSTALL.md](./DESKTOP-INSTALL.md).

**Next:** re-upload `manifest.hosted.xml` if Help -> About is older, then run [OWNER-CHECKLIST-2.0.0.26.md](./OWNER-CHECKLIST-2.0.0.26.md) (Track Changes first).

**After install:** [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) → [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) · [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) · [FINAL-AUDIT-PE-49.md](./FINAL-AUDIT-PE-49.md).

Product roadmap (engine + UI to “best PE”): [PE-ROADMAP-MASTER.md](./PE-ROADMAP-MASTER.md). Older implementation notes: `docs/prozaedit-implementation-plan-audited.md`.

## Step 6 — Install ProzaEdit from GitHub (one time)

1. **Get the manifest file (GitHub only — do not use an old PC copy)**
   - **Browser:** download the **raw** file (not the GitHub HTML page):  
     [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml)
   - **Or on this PC:** double-click **`Download-Manifest-From-GitHub.bat`** in the repo (saves to Downloads and `%USERPROFILE%\ProzaEditCatalog\`).

2. **Remove any old ProzaEdit first**
   - **Word on the web:** **Insert** → **Add-ins** → **My Add-ins** → **⋯** on ProzaEdit → **Remove**.
   - **Word Desktop** (if **Home → ProzaEdit** is still there after that): close Word, double-click **`Uninstall-ProzaEdit.bat`** in the repo folder, then reopen Word.

3. **Upload hosted manifest**
   - **Insert** → **Add-ins** → **My Add-ins** → **Upload My Add-in**
   - Choose **`manifest.hosted.xml`** (not `manifest.xml`).

4. **Open ProzaEdit**
   - **Home** tab → **ProzaEdit** group → **ProzaEdit** button  
   - Or **Insert** → **My Add-ins** → ProzaEdit.

5. **Quick test**
   - Task pane should load from the internet (you do **not** need `Start ProzaEdit.bat`).
   - Browser check (optional):  
     https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html

## If something fails

| Symptom | Try |
|--------|-----|
| Add-in blank or error | Wait 2 minutes (GitHub Pages cache), close Word, reopen. |
| **Manifest is not valid** | Remove old ProzaEdit (step 2); use the **raw** download link; need build **2.0.0.64+** (not an old OneDrive copy with `/prozaedit-word` in AppDomain). |
| Still localhost | Remove old add-in; upload `manifest.hosted.xml` again. |
| No **Home → ProzaEdit** | Upload manifest again; restart Word. |

## Testers (Step 7)

Send them:

- `manifest.hosted.xml` (or the GitHub raw link above)
- `docs/BETA-TESTERS-INSTALL.txt`

## Version alignment (authoritative)

- **Hosted beta:** `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` must match (currently **2.0.0.67**).
- **Local dev:** `manifest.xml` (local sideload) now tracks the same version as `manifest.hosted.xml` (tests enforce it).

## Install helpers on GitHub

| Helper | Purpose |
|--------|---------|
| **`Download-Manifest-From-GitHub.bat`** | Download and validate [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) → Downloads + `%USERPROFILE%\ProzaEditCatalog\` (use for Word web upload) |
| **`Install-ProzaEdit-Desktop-GitHub.bat`** | Same download + validate only (no registry changes) |
| **`Uninstall-ProzaEdit.bat`** | Remove desktop catalog / developer sideload (Word on the web: remove via My Add-ins) |
| **`Fix-ProzaEdit-SharedFolder.bat`** | Word Desktop, Shared Folder route (creates `\\PC\ProzaEditCatalog`, one admin prompt). See [DESKTOP-INSTALL.md](./DESKTOP-INSTALL.md) |
| **`Sideload-ProzaEdit-Desktop.bat`** | Word Desktop, no admin: developer registry sideload |
| **`Verify-ProzaEdit-Install.bat`** | Read-only PASS/FAIL check of either desktop route |
| **`scripts/install/README.md`** | PowerShell parameters, cache paths, LAN share **examples only** (e.g. OTHP15) |

Localhost dev bats remain in `_archive/local-dev/` only.

---

*Generated while you were away; see `docs/CHAT-HISTORY-SUMMARY.md` for full context.*
