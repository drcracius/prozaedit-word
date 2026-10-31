# PE-2 — Windows Shared Folder validation (D Cracius)

**Purpose:** Confirm desktop Word can sideload ProzaEdit via **SHARED FOLDER** (local TrustedCatalog) using scripts on GitHub `main`. UI still loads from GitHub Pages; the catalog only registers `manifest.hosted.xml`.

**Baseline:** hosted build **2.0.0.15** — `<Version>`, ribbon icons, and `SupportUrl` in the downloaded manifest must match the table below.

| Check | Expected |
|-------|----------|
| `<Version>` | `2.0.0.15` |
| `IconUrl` / `HighResolutionIconUrl` | `…/assets/icon-32.png`, `…/assets/icon-64.png` on `raw.githubusercontent.com/drcracius/prozaedit-word/main/…` |
| `SupportUrl` | `https://github.com/drcracius/prozaedit-word` |
| `SourceLocation` | `https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html` |

**Related:** [WHEN-YOU-RETURN.md](https://github.com/drcracius/prozaedit-word/blob/main/docs/WHEN-YOU-RETURN.md) · [BETA-TESTERS-INSTALL.txt](https://github.com/drcracius/prozaedit-word/blob/main/docs/BETA-TESTERS-INSTALL.txt) · `scripts/install/README.md`

---

## Prerequisites

- [ ] **Close Word completely** (no WINWORD.EXE in Task Manager).
- [ ] **Internet** available (manifest download + task pane from GitHub Pages).
- [ ] Repo on disk **or** clone/pull latest from `https://github.com/drcracius/prozaedit-word` (`main`).
- [ ] **Admin:** usually **not** required (HKCU registry + `%USERPROFILE%\Documents\…`). Use elevated PowerShell only if corporate policy blocks `-ExecutionPolicy Bypass` or registry writes.
- [ ] Remove any old **localhost** ProzaEdit sideload (Insert → Add-ins → My Add-ins → ⋯ remove dev entry).

---

## Step-by-step (scripts from GitHub `main`)

### A — Download manifest (recommended first run)

1. [ ] Open repo root on the PC (e.g. after `git pull origin main`).
2. [ ] Double-click **`Install-ProzaEdit-Desktop-GitHub.bat`**  
   *(runs `scripts\install\Install-ProzaEdit-GitHub.ps1` with defaults)*.
3. [ ] Confirm console shows **Saved:** `%USERPROFILE%\Documents\ProzaEdit\catalog\manifest.hosted.xml` and **Version 2.0.0.15**.
4. [ ] Open that file in Notepad and spot-check **Version**, **SupportUrl**, and **IconUrl** lines against the table above.

### B — PE-2: register local Shared Folder catalog

5. [ ] With Word still closed, run **`Fix-ProzaEdit-SharedFolder.bat`**  
   *(same PS1 with `-RegisterLocalCatalog`)*.
6. [ ] Confirm console: **Registered TrustedCatalog:** `file:///…/Documents/ProzaEdit/catalog/` (trailing slash in URI is OK).

### C — Clear Office WEF cache (Trust Center stale list)

7. [ ] Close Word again if it was opened.
8. [ ] Optional backup, then delete contents of:  
   `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`  
   *(Use `15.0` only if Word 2013 — script detects 16.0 vs 15.0 for registry.)*
9. [ ] Restart Word.

### D — Refresh Shared Folder in Word

10. [ ] **Insert** → **Add-ins** → open the **SHARED FOLDER** tab (not only **My Add-ins**).
11. [ ] Select **ProzaEdit** if listed → add/open.
12. [ ] **Home** → **ProzaEdit** group → open task pane; confirm UI loads (not blank, not localhost).
13. [ ] Quick smoke: Run audit on a test paragraph; task pane footer/build should reflect **2.0.0.15** (or match manifest).

---

## Verification checklist (manifest 2.0.0.15)

- [ ] Downloaded `Documents\ProzaEdit\catalog\manifest.hosted.xml` reports **Version 2.0.0.15**.
- [ ] **SupportUrl** = `https://github.com/drcracius/prozaedit-word`.
- [ ] Icons resolve (32/64 PNG URLs on raw GitHub, not broken ribbon).
- [ ] **SHARED FOLDER** shows ProzaEdit **or** documented fallback (web upload) succeeded.
- [ ] Task pane **SourceLocation** is GitHub Pages URL, not `localhost`.
- [ ] Log outcome in Project notes (pass / fail + symptom).

---

## Automated verify

Read-only PowerShell checks (manifest path, **Version 2.0.0.15**, `SupportUrl` / icon URLs / `SourceLocation`, TrustedCatalog registry). Does not change files or registry.

From repo root on Windows:

```text
Verify-ProzaEdit-Install.bat
```

Or:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\install\Verify-ProzaEdit-Install.ps1"
```

Expect `[PASS]` lines for each automated item; fix failures before manual Word steps above.

---

## Troubleshooting

| Symptom | What to try |
|--------|-------------|
| **SHARED FOLDER tab empty** | Re-run **`Fix-ProzaEdit-SharedFolder.bat`**; clear `%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\`; full Word restart. Confirm `HKCU\Software\Microsoft\Office\16.0\WEF\TrustedCatalogs\{d1829e3a-4931-4122-b911-37f22941aa99}` **Url** = your `file:///…/Documents/ProzaEdit/catalog/` URI. |
| **Wrong or old version in catalog file** | Re-run install bat (re-downloads from raw GitHub); delete stale copy in catalog folder first if needed. |
| **SMB vs local catalog** | Scripts default to **local** `%USERPROFILE%\Documents\ProzaEdit\catalog\`. A LAN path (e.g. `\\MACHINE\Share\`) is **optional** — register **that UNC** in TrustedCatalogs manually; see `scripts/install/README.md` (examples only, no hardcoded OTHP15 in scripts). Prefer local catalog on the PC where Word runs. |
| **Corporate PC blocks PS1** | Unblock file in Properties, or run: `powershell -NoProfile -ExecutionPolicy Bypass -File "…\Install-ProzaEdit-GitHub.ps1" -RegisterLocalCatalog` |
| **Add-in blank / cache** | Wait 2–3 min for GitHub Pages; clear WEF folder; reopen Word. |
| **Still localhost ribbon** | Remove old add-in from My Add-ins; use fresh `manifest.hosted.xml` only. |

---

## When to use web upload instead

Use **Word on the web → Upload My Add-in** (see `docs/BETA-TESTERS-INSTALL.txt`) when:

- [ ] **SHARED FOLDER** stays empty after PE-2 steps above.
- [ ] Consumer M365 desktop has **no Upload** and Shared Folder is unreliable.
- [ ] You are validating **tester workflow** only (no desktop catalog needed).
- [ ] LAN SMB catalog is unavailable; **web upload + GitHub Pages UI** is the supported path for most beta testers.

Raw manifest for upload:  
`https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml`

---

## Mental checkbox summary (D)

1. Word closed → run **`Fix-ProzaEdit-SharedFolder.bat`** from current `main`.  
2. Clear **Wef** cache → reopen Word → **SHARED FOLDER**.  
3. Confirm manifest **2.0.0.15**, icons, **SupportUrl** → open task pane → smoke audit.  
4. If fail → note symptom → fall back to **web upload**; PE-2 result logged in Project notes.
