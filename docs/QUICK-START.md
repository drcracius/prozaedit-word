# ProzaEdit Word — Quick start (~2 min)

**Hosted build:** 2.0.0.40 · **Live pane:** [taskpane.html](https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html)  
**Web 1.0 RC:** owner validation — [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md) · [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) · desktop **PE-2** deferred.

## Install once

1. Open **Word on the web** with a **new blank document**.
2. **Insert → Add-ins → My Add-ins → Manage My Add-ins → Upload My Add-in**.
3. Upload [manifest.hosted.xml](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml).
4. Open your real manuscript; use **Home → ProzaEdit** daily.

Desktop Word often lacks Upload — use the browser with the same Microsoft account.

## Daily workflow

1. **Target** — **Scope** and **Type** on the first screen; profile and style below or in Settings. Open **Tips** (home chrome) for scope modes. **Refresh count** before a big run on long docs.
2. **Checks** — Turn on core toggles and (for fiction) module checkboxes. Optional: timeline or citation scans (explicit buttons; fiction vs academic gating).
3. **Run report** — Toolbar **Run** or Checks/Audit hub. Read summary and cards on **Audit**.
4. **Fix cards** — **Go to**, **Apply fix** (first document match), **Mute**/**Dismiss**, or **Local tip** → Coach.

Partner stack after cards: Word **F7/Editor**, **Copy for Copilot**, external tools you own — see [WORKFLOWS.md](WORKFLOWS.md).

## Simple mode

**Settings → Essentials → Simple / Advanced** hides the Thesaurus tab, the lexical shaper and extra tuning (toggle label explains it). Local audit, Coach, and Rewrite remain available. **AI help (optional)** stays visible on Coach and Rewrite in Simple mode: it is off until you add a Gemini API key, and its button takes you to Settings → Essentials. Nothing is sent to Gemini until you click a Gemini button; the optional manuscript index is included in that request (see [MANUSCRIPT-CONTEXT-INDEX.md](./MANUSCRIPT-CONTEXT-INDEX.md)).

## Hover tips

**Target → Show hover tips** toggles ProzaEdit bubbles on key controls. Turn off to restore normal browser `title` tooltips.

## After updates

- UI-only changes on GitHub: **close and reopen** the task pane (Pages may cache 1–2 minutes).
- When `manifest.hosted.xml` **version** bumps: re-upload the manifest once, then reopen the pane.
- **Help → Check for updates** compares your pane to GitHub.

## More

- [WORKFLOWS.md](WORKFLOWS.md) — editing stack and long-manuscript patterns  
- [THIRD-PARTY-ATTRIBUTION.md](THIRD-PARTY-ATTRIBUTION.md) — Datamuse, Gemini, local engines  
- [prozaedit-features.md](prozaedit-features.md) — full feature reference  
