# ProzaEdit Word — full manual test checklist (Word on the web)

**Audience:** D Cracius beta validation on **Word online** (narrow task pane).  
**Build:** UI **2.0.0.15** (no manifest re-upload for this UX pack).  
**Pane URL:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html

---

## 1. Install and open

- [ ] New blank document → **Insert** → **Add-ins** → **Upload My Add-in** → `manifest.hosted.xml` from GitHub raw.
- [ ] Open a test manuscript → **Home** → **ProzaEdit** task pane loads (brand header, workflow strip, toolbar).
- [ ] **Help → About ProzaEdit → Check for updates** reports manifest/UI **2.0.0.15**.

## 2. Target and scope

- [ ] Set manuscript type, scope modes: selection, page range, selected chapters (reload list), full manuscript.
- [ ] **Refresh count** updates Target preview and the **sticky scope line** under the toolbar.
- [ ] Change scope without refresh — line updates label; count refreshes when applicable.

## 3. Settings groups

- [ ] Toolbar **Settings** opens modal; **Back**, **Close**, **Escape** dismiss.
- [ ] **Ctrl+Shift+,** and **Alt+Shift+S** open Settings (not while focused in a text field).
- [ ] Help **Open Settings → Privacy** and Target **Custom rules → manage** land in the right group.
- [ ] Bookmark `#pe-settings-privacy` on reload opens Privacy group.
- [ ] Each group **Reset … to defaults** (confirm) — Safety, Onboarding, Audit, Privacy, Dictionary, Custom style; Reference shows info only.
- [ ] **Onboarding** group: **Show new-session tips**, **Show What's new**, **Show prior-session recap**, **Warn before long operations** (all default on); **Reset Onboarding** restores defaults.
- [ ] Settings **Filter settings** box hides non-matching groups (e.g. type `audit`).
- [ ] Toolbar status line: message auto-clears ~6s; **×** dismisses immediately.
- [ ] **Got it** on session tips banner hides `#peSessionTips` until next browser session (global `.hidden` utility).
- [ ] **What's new** top banner (`#peWhatsNewBanner`) shows once per release when enabled; **Got it** dismisses for version; **Don't show again** turns off the toggle.
- [ ] **Prior session** banner (`#pePriorSessionBanner`) after a prior visit: recap lines from `pe-last-session-summary`; **Got it** hides for session; **Turn off in Settings** opens Onboarding.

## 4. Tabs and navigation

- [ ] Switch tabs (e.g. Audit, Coach); close pane; reopen — **last tab** restores (not Thesaurus when Simple mode on).
- [ ] Simple mode on while on Thesaurus → returns to Target.
- [ ] Audit card **Rewrite** → Rewrite tab → **Back to Audit**.

## 5. Checks and audit

- [ ] Checks: enable modules → **Run audit** (toolbar or Audit hub).
- [ ] Checks **Scope (read-only)** chip matches Target scope / refresh count.
- [ ] **Run audit** shows **Reading document…** then **Analyzing…**; **Cancel** stops cleanly with status **Cancelled.** (no stuck disabled buttons).
- [ ] Full manuscript or large scope: **Long operation** banner when **Warn before long operations** is on (Settings → Onboarding); **Continue** / **Not now** / **Don't show again**.
- [ ] Audit tab **badge** shows open issue count after audit; clears when audit cleared.
- [ ] Audit: filter chips, sort; read-only **Report depth** and **Default filter** hints match Settings → Audit.
- [ ] Change report depth / default filter in Settings — hints update on Audit tab.
- [ ] Empty Audit state: **Run audit from Checks** CTA.
- [ ] **Apply fix** on a card → **Undo** → **Last edit**.
- [ ] Optional: **Verify citations** / **Scan timeline** on large scope — warning banner; Cancel during scan.
- [ ] Optional: **Batch section audits** — warning; **Cancel batch** or hub Cancel stops between sections.

## 6. Help, About, and diagnostics

- [ ] **Help → About ProzaEdit**: build version, manifest version, add-in ID, GitHub repo, **Check for updates** (matches manifest **2.0.0.15** when current).
- [ ] Help copy mentions scope line, last tab, Settings shortcuts.
- [ ] Settings → Privacy: opt-in off by default; **Report a problem** copies redacted JSON (no document text in clipboard JSON).

## 7. Narrow pane

- [ ] Drag pane divider narrow (&lt;360px): tabs wrap; controls remain usable (`pe-narrow-pane`).

## 8. Interactive controls & banners (UI ↔ Settings sync)

- [ ] Every `onclick` / `onchange` / `oninput` in `taskpane.html` resolves to a handler in `taskpane.js` (no console “is not defined”).
- [ ] Toolbar **Settings** opens with Onboarding toggles matching saved `PROZAEDIT_CONFIG` (reopen modal after permanent dismiss — checkbox off).
- [ ] **Simple mode** (Settings → Safety): Target **Simple mode: On/Off** line updates live; Thesaurus tab hides/shows without reload.
- [ ] **Show hover tips** toggle: ProzaEdit bubbles on/off without reload.
- [ ] **Report depth** / **Default audit filter** (Settings → Audit): Audit tab hint lines update live while modal open or after close.
- [ ] `#peSessionTips`: **Got it** → hidden for browser session (`sessionStorage`); **Don't show again** → `#showSessionTips` off in CONFIG, banner hidden, persists with document.
- [ ] `#peWhatsNewBanner`: **Got it** → hidden + release marked seen; **Don't show again** → `#showWhatsNew` off in CONFIG.
- [ ] `#pePriorSessionBanner`: **Got it** → hidden for session; **Don't show again** → `#showPriorSessionSummary` off in CONFIG; **Turn off in Settings** opens Onboarding group.
- [ ] Re-enable each Onboarding toggle in Settings → **Reset Onboarding** clears session dismiss keys → banner can show again (What's new still respects per-release seen key).
- [ ] After Settings **Close** / **Escape** / backdrop click: no invisible overlay; toolbar and tabs remain clickable (`pe-settings-modal.hidden`).

---

*Automated coverage:* `npm test` (includes `ui-prefs-helpers.test.mjs`, `onboarding-helpers.test.mjs`, `onboarding-banners.test.mjs`, `long-operation-helpers.test.mjs`). Five-pass audit: [prozaedit-five-pass-audit-beta-ready.md](prozaedit-five-pass-audit-beta-ready.md).
