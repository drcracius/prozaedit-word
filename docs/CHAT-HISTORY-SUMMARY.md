# ProzaEdit Word — Chat history summary (exported)

**Exported:** October 30, 2026  
**Purpose:** Resume beta hosting setup on another PC or in a new Cursor chat.  
**GitHub repo:** [drcracius/prozaedit-word](https://github.com/drcracius/prozaedit-word)

---

## What you wanted

- Run **ProzaEdit in Microsoft Word** on Windows without daily **bat / localhost / sideload** workarounds.
- **Beta-style use:** mainly you, plus a few close testers.
- **Microsoft 365 Premium (consumer)** — **not** a business tenant (`admin.microsoft.com` shows no business presence; that is expected).
- **Free GitHub** + **step-by-step** guidance; confirm after each step.
- **No git commits** unless you explicitly ask.

---

## Big picture (dev vs hosted)

| Mode | When to use | How |
|------|-------------|-----|
| **Hosted beta (goal)** | Daily writing + testers | Files on **GitHub Pages** (HTTPS) + **`manifest.hosted.xml`** uploaded once in Word |
| **Local dev (optional)** | You are changing code | `Start ProzaEdit.bat` / `npm run dev-server` + `manifest.xml` (localhost) |

Desktop Word errors like **“add-in no longer available”** or **Visual Studio debugging** usually came from **old dev sideload** (`localhost`, catalog hacks). Fix: install from **hosted manifest**, remove old localhost add-in if needed.

---

## Project locations

| Item | Path |
|------|------|
| Main folder (this PC) | `C:\Users\obadr\Desktop\ProzaEdit - Word\prozaedit-word\` |
| Quick beta map | `GO-BETA-NO-BAT.txt` |
| GitHub walkthrough | `docs/BETA-SETUP-GITHUB.md` |
| Tester instructions | `docs/BETA-TESTERS-INSTALL.txt` |
| Create hosted manifest | `Create-Hosted-Manifest.bat` → outputs `manifest.hosted.xml` |

---

## GitHub beta checklist (8 steps)

| Step | Status | Notes |
|------|--------|--------|
| **1** — GitHub account | **Done** | User: **drcracius** |
| **2** — Create repo | **Done** | [github.com/drcracius/prozaedit-word](https://github.com/drcracius/prozaedit-word) |
| **3** — Upload files | **Done** | `assets/`, `src/taskpane/` (incl. `lib/`), root `manifest.xml`; **no** `node_modules` |
| **4** — GitHub Pages | **Done** | Branch **`main`**, folder **`/ (root)`**; repo is **public** (needed for free Pages) |
| **5** — Hosted manifest | **Done** | `manifest.hosted.xml` on PC + GitHub (v2.0.0.1) |
| **6** — Install in Word | **Next (you)** | Upload **`manifest.hosted.xml`** — see `docs/WHEN-YOU-RETURN.md` |
| **7** — Share with testers | **Pending** | Send `manifest.hosted.xml` + `docs/BETA-TESTERS-INSTALL.txt` |
| **8** — Updates | **Pending** | Re-upload changed files on GitHub; Word picks up after manifest/version refresh as needed |

---

## Verified live URLs (Step 4)

| URL | Purpose | Verified |
|-----|---------|----------|
| https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html | Task pane (browser test) | **Yes** — ProzaEdit UI loads (HTTP 200) |
| https://drcracius.github.io/prozaedit-word/ | Pages site root | Live after Pages enabled |

**Hosted base URL for Step 5 (no trailing slash):**

```text
https://drcracius.github.io/prozaedit-word
```

---

## What is on GitHub (confirmed)

```
prozaedit-word/
├── manifest.xml          ← still localhost URLs; Word beta uses manifest.hosted.xml (Step 5)
├── assets/
│   ├── icon-32.png
│   ├── icon-64.png
│   └── prozaedit-wordmark.jpg
└── src/taskpane/
    ├── taskpane.html
    ├── taskpane.css
    ├── taskpane.js
    └── lib/              ← 14 .js modules (audit, coach, gemini-client, etc.)
```

**Intentionally not required on GitHub for hosting:** `node_modules`, bat/scripts, most `docs/` (optional to add later).

---

## Key IDs and settings

| Setting | Value |
|---------|--------|
| Add-in manifest ID | `d1829e3a-4931-4122-b911-37f22941aa99` |
| Default branch | `main` |
| GitHub username | `drcracius` |

---

## Troubleshooting notes from this chat

### “There isn’t a GitHub Pages site here”

- GitHub’s **404 page** when **Pages is not enabled yet** or the **first deploy has not finished**.
- **Not** a sign that files were uploaded wrong.
- Fix: **Settings → Pages** → **Deploy from a branch** → `main` + `/ (root)` → Save → wait 1–5 minutes until green **“Your site is live at …”**.

### Private vs public repo

- Repo was **private** at first; **free GitHub Pages** needs a **public** repo (or a paid plan with Pages on private repos).
- Repo was **public** when Pages went live.

### Consumer M365

- **Do not** use `admin.microsoft.com` for centralized deploy on this account.
- Each person: **Insert → Add-ins → Upload My Add-in** → **`manifest.hosted.xml`** once.

### Cursor + GitHub on another laptop

1. Same **Cursor account** on the other machine.
2. **Clone** [drcracius/prozaedit-word](https://github.com/drcracius/prozaedit-word) and **Open Folder** in Cursor.
3. Open **Chat history** for this thread; if it is missing, start a new chat and paste:

   > Continuing ProzaEdit Word beta — Pages live at https://drcracius.github.io/prozaedit-word — next Step 5 hosted manifest + Step 6 Word install. See `docs/CHAT-HISTORY-SUMMARY.md`.

4. **Cursor ↔ GitHub sign-in** helps **git clone/push**; it does **not** host Pages (GitHub does).

---

## Asset paths (fixed)

`taskpane.html` now uses **`../../assets/...`** so icons and wordmark load correctly on GitHub Pages.

---

## Local bat files (reference only for dev)

User-facing shortcuts include `Start-Here.bat`, `First-Time-Setup.bat`, `Install-In-Word.bat`, `Start ProzaEdit.bat`, `ProzaEdit.bat`, and `Create-Hosted-Manifest.bat`. For **hosted beta**, daily use is **Word → Home → ProzaEdit**, not running bats.

---

## Earlier work in the same chat (condensed)

Before the GitHub walkthrough, the conversation covered:

- Building the **Word task pane add-in** under `prozaedit-word/` (Target, Thesaurus, Checks, Audit, Coach, Rewrite, local-first audits, optional Gemini).
- **Robustness** fixes (`Word.run` error handling, audit size limits, UI safety).
- **Local HTTPS dev** (`dev-server`, certs, `Start ProzaEdit.bat`).
- **Ribbon** entry and manifest updates.
- **Beta documentation** (`BETA-SETUP-GITHUB.md`, `GO-BETA-NO-BAT.txt`, tester install doc).
- Pivot from **localhost sideload** to **GitHub Pages + manifest.hosted.xml** for consumer M365 beta.

Restore point (if still on disk):  
`C:\Users\obadr\Desktop\ProzaEdit - Word\_restore_points\prozaedit-word_20261030-005434.zip`

---

## Next actions when you return

1. **Step 5** — Double-click **`Create-Hosted-Manifest.bat`**, enter:
   `https://drcracius.github.io/prozaedit-word`
2. **Step 6** — Word (prefer **office.com** Word): remove old **localhost** ProzaEdit if present → **Upload My Add-in** → **`manifest.hosted.xml`**.
3. Confirm **Home → ProzaEdit** opens the pane from GitHub.
4. Optional: upload this file and other `docs/` to GitHub for backup; push from Cursor after clone.

---

## Cursor chat reference

This export summarizes the assisted walkthrough. To reopen the original thread in Cursor, use chat history on the same account (workspace: ProzaEdit Word / `prozaedit-word`).

---

*Generated from the ProzaEdit Word beta setup conversation.*
