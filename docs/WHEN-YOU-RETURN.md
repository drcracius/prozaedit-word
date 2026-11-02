# When you return — ~5 minutes to finish beta in Word

Steps **1–5** are done (GitHub Pages + hosted manifest). You only need **Step 6** (web upload — use **office.com** if desktop Word has no Upload).

**Build 2.0.0.26** lives on PR #28 (`cursor/pe-81-genres-multi-ai-f10e`, stacked on PR #27); `main` still has the older build until you merge #27 then #28 (see [HANDOFF-DESKTOP.md](./HANDOFF-DESKTOP.md) section 7). 441 tests. Until merged, the hosted pane and `manifest.hosted.xml` on `main` are the old version. Owner Phase 1 (**PE-47**) open; desktop **PE-2** deferred.

**Next:** merge #27, retarget and merge #28, re-upload `manifest.hosted.xml` if Help -> About is older, then run [OWNER-CHECKLIST-2.0.0.26.md](./OWNER-CHECKLIST-2.0.0.26.md) (Track Changes first).

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

- **Hosted beta:** `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` must match (currently **2.0.0.26**).
- **Local dev:** `manifest.xml` (local sideload) now tracks the same version as `manifest.hosted.xml` (tests enforce it).

## Install helpers on GitHub

| Helper | Purpose |
|--------|---------|
| **`Install-ProzaEdit-Desktop-GitHub.bat`** | Download [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) to `Documents\ProzaEdit\catalog\` + upload instructions |
| **`Fix-ProzaEdit-SharedFolder.bat`** | Optional desktop appendix — Shared Folder catalog (**PE-2 deferred**); web upload is the primary beta path |
| **`scripts/install/README.md`** | PowerShell parameters, cache paths, LAN share **examples only** (e.g. OTHP15) |

Localhost dev bats remain in `_archive/local-dev/` only.

---

*Generated while you were away; see `docs/CHAT-HISTORY-SUMMARY.md` for full context.*
