# When you return — ~5 minutes to finish beta in Word

Steps **1–5** are done (GitHub Pages + hosted manifest). You only need **Step 6** (web upload — use **office.com** if desktop Word has no Upload).

**Web 1.0 RC on `main`:** build **2.0.0.20** (PE-81/82/83 branch; see README for the current test count), PE-48 agent prep merged ([#5](https://github.com/drcracius/prozaedit-word/pull/5)); owner Phase 1 (**PE-47**) open; desktop **PE-2** deferred.

**After install:** [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) → [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) · [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) · [FINAL-AUDIT-PE-49.md](./FINAL-AUDIT-PE-49.md).

Implementation roadmap: `docs/prozaedit-implementation-plan-audited.md`

## Step 6 — Install ProzaEdit from GitHub (one time)

1. **Get the manifest file**
   - On this PC:  
     `C:\Users\obadr\Desktop\ProzaEdit - Word\prozaedit-word\manifest.hosted.xml`
   - Or download from GitHub:  
     [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml)

2. **Remove old localhost add-in (if Word still shows it)**
   - Word → **Insert** → **Add-ins** → **My Add-ins**
   - Open the **⋯** menu → remove any **ProzaEdit** tied to localhost / dev.

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
| Still localhost | Remove old add-in; upload `manifest.hosted.xml` again. |
| No **Home → ProzaEdit** | Upload manifest again; restart Word. |

## Testers (Step 7)

Send them:

- `manifest.hosted.xml` (or the GitHub raw link above)
- `docs/BETA-TESTERS-INSTALL.txt`

## Version alignment (authoritative)

- **Hosted beta:** `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` must match (currently **2.0.0.20**).
- **Local dev:** `manifest.xml` remains **2.0.0.0** for localhost sideload only; bump it only when you change dev manifest metadata, not for GitHub Pages UI pushes.

## Install helpers on GitHub

| Helper | Purpose |
|--------|---------|
| **`Install-ProzaEdit-Desktop-GitHub.bat`** | Download [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) to `Documents\ProzaEdit\catalog\` + upload instructions |
| **`Fix-ProzaEdit-SharedFolder.bat`** | Optional desktop appendix — Shared Folder catalog (**PE-2 deferred**); web upload is the primary beta path |
| **`scripts/install/README.md`** | PowerShell parameters, cache paths, LAN share **examples only** (e.g. OTHP15) |

Localhost dev bats remain in `_archive/local-dev/` only.

---

*Generated while you were away; see `docs/CHAT-HISTORY-SUMMARY.md` for full context.*
