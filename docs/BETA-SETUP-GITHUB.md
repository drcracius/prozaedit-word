# ProzaEdit beta — GitHub hosting + Word (consumer M365)

This guide matches **Microsoft 365 Personal / Family / home Premium** (Outlook.com, Hotmail, Live, etc.).

**You do not use** [admin.microsoft.com](https://admin.microsoft.com). If you see:

- *Switch to an account that has permission*
- *Login is not supported for consumer users without business presence*

that confirms this guide is the **correct** path — not an error on your subscription.

**Cost:** GitHub + GitHub Pages = **free**.  
**Result:** Word loads ProzaEdit from the internet — **no** `Start ProzaEdit.bat` for daily writing.  
**Testers:** Each person uploads **`manifest.hosted.xml`** once (see Part 6).  
**Owner final mile (web-first):** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) · [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md). Desktop Shared Folder (PE-2) is **optional/deferred**.

---

## Checklist (do in order)

| Step | What |
|------|------|
| 1 | Create free GitHub account |
| 2 | Create empty repo `prozaedit-word` (Private is OK) |
| 3 | Upload `assets`, `src`, `manifest.xml` (not `node_modules`) |
| 4 | Settings → Pages → deploy from `main` → test task pane URL in browser |
| 5 | Run `Create-Hosted-Manifest.bat` → `manifest.hosted.xml` |
| 6 | Upload `manifest.hosted.xml` in Word (web or desktop) |
| 7 | Daily: Word → Home → ProzaEdit |
| 8 | Share manifest + `BETA-TESTERS-INSTALL.txt` with testers |

---

## Part 1 — Create a GitHub account (free)

1. Go to [https://github.com/signup](https://github.com/signup).
2. Enter email, password, and a **username** (you will use it in your website URL).
3. Complete email verification if GitHub asks.

No Git commands required for this guide.

---

## Part 2 — Create a repository

1. Sign in at [https://github.com](https://github.com).
2. Top right **+** → **New repository**.
3. **Repository name:** `prozaedit-word`
4. **Private** — recommended.
5. **Do not** check “Add a README” (start empty).
6. **Create repository**.

---

## Part 3 — Upload files from your PC

On the empty repo page: **uploading an existing file** or **Add file → Upload files**.

Open on your PC:

`C:\Users\obadr\Desktop\ProzaEdit - Word\prozaedit-word\`

**Upload:**

| Item | Required |
|------|----------|
| `assets` folder | Yes |
| `src` folder | Yes |
| `manifest.xml` | Yes |
| `catalog` folder | No |

**Never upload:** `node_modules`

**Commit changes** (green button at bottom).

---

## Part 4 — GitHub Pages (HTTPS site)

1. Repo **Settings** → **Pages** (left sidebar).
2. **Source:** Deploy from a branch → **main** (or **master**) → **`/ (root)`** → **Save**.
3. Wait 2–10 minutes. Pages shows:

   `https://YOUR-USERNAME.github.io/prozaedit-word/`

### Browser test (required before Word)

Open:

`https://YOUR-USERNAME.github.io/prozaedit-word/src/taskpane/taskpane.html`

You should see the ProzaEdit task pane. If **404**, wait longer or confirm `src/.../taskpane.html` is in the repo.

---

## Part 5 — `manifest.hosted.xml` on your PC

1. Double-click **`Create-Hosted-Manifest.bat`** in `prozaedit-word`.
2. Paste base URL **with no trailing slash**, e.g.  
   `https://YOUR-USERNAME.github.io/prozaedit-word`
3. File **`manifest.hosted.xml`** appears next to `manifest.xml`.

---

## Part 6 — Install in Word (consumer account — your plan)

**Do not** use admin.microsoft.com.

Try **Word on the web** first (upload is often easier):

1. [https://www.office.com](https://www.office.com) → sign in with your M365 email.
2. **Word** → blank document.
3. **Home → Add-ins** (or **Get Add-ins**).
4. **More settings** / gear → **Upload My Add-in** → select **`manifest.hosted.xml`** on your PC.
5. **Home → ProzaEdit** to open the pane.

**Desktop Word:** **Insert → Add-ins → My Add-ins** → **Upload My Add-in** if shown.

After this **once**, daily use is **Word → Home → ProzaEdit** (internet required). No bat file.

If an old **localhost** ProzaEdit exists, remove it from **My Add-ins** first, then upload **`manifest.hosted.xml`**.

---

## Part 7 — Share with a few testers

Each tester (consumer or business Word):

1. Send **`manifest.hosted.xml`**
2. Send text from **`docs/BETA-TESTERS-INSTALL.txt`**

They upload once in their own Word. They do **not** need GitHub or your bat files.

---

## Part 8 — Update ProzaEdit after code changes

1. Upload changed files under `src` / `assets` to GitHub (same repo).
2. Wait 1–3 minutes.
3. Close and reopen the task pane in Word (or restart Word).

Use **localhost + bats** only while you are actively developing on your PC.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| admin.microsoft.com blocked | Expected for home M365 — use Part 6 only. |
| Blank pane in Word | Fix Part 4 browser test first. |
| Still needs localhost / bat | Wrong manifest — upload **`manifest.hosted.xml`**. |
| No Upload in desktop Word | Use **office.com** Word for upload (Part 6). |
| GitHub feels overwhelming | Only use: New repo → Upload → Settings → Pages. |

---

## Appendix — Business / school accounts only (not you)

If [admin.microsoft.com](https://admin.microsoft.com) **works** and you see **Integrated apps**:

1. Host on GitHub (Parts 1–5) as above.
2. **Settings → Integrated apps → Deploy add-in** → upload **`manifest.hosted.xml`**.
3. Assign **Just me**, then specific users for testers.

Consumer **home Premium** accounts cannot use this appendix.

---

## Optional later — Microsoft Marketplace (“Store”)

Public listing + Partner Center review. Not needed for you and a small test group.
