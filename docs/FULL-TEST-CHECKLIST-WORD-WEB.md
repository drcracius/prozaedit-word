# ProzaEdit Word — full manual test checklist (Word on the web)

**Audience:** D Cracius beta validation on **Word online** (narrow task pane).  
**Build:** UI **2.0.0.15** (no manifest re-upload for this UX pack).  
**Pane URL:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html

---

## 1. Install and open

- [ ] New blank document → **Insert** → **Add-ins** → **Upload My Add-in** → `manifest.hosted.xml` from GitHub raw.
- [ ] Open a test manuscript → **Home** → **ProzaEdit** task pane loads (brand header, workflow strip, toolbar).
- [ ] **Help → Check for updates** reports manifest/UI **2.0.0.15**.

## 2. Target and scope

- [ ] Set manuscript type, scope modes: selection, page range, selected chapters (reload list), full manuscript.
- [ ] **Refresh count** updates Target preview and the **sticky scope line** under the toolbar.
- [ ] Change scope without refresh — line updates label; count refreshes when applicable.

## 3. Settings groups

- [ ] Toolbar **Settings** opens modal; **Back**, **Close**, **Escape** dismiss.
- [ ] **Ctrl+Shift+,** and **Alt+Shift+S** open Settings (not while focused in a text field).
- [ ] Help **Open Settings → Privacy** and Target **Custom rules → manage** land in the right group.
- [ ] Bookmark `#pe-settings-privacy` on reload opens Privacy group.
- [ ] Each group **Reset … to defaults** (confirm) — Safety, Audit, Privacy, Dictionary, Custom style; Reference shows info only.
- [ ] **Onboarding** group: **Show new-session tips**, **Show What's new**, **Show prior-session recap** (all default on); **Reset Onboarding** restores defaults.
- [ ] **Got it** on session tips banner hides `#peSessionTips` until next browser session (global `.hidden` utility).
- [ ] **What's new** top banner (`#peWhatsNewBanner`) shows once per release when enabled; **Got it** dismisses for version; **Don't show again** turns off the toggle.
- [ ] **Prior session** banner (`#pePriorSessionBanner`) after a prior visit: recap lines from `pe-last-session-summary`; **Got it** hides for session; **Turn off in Settings** opens Onboarding.

## 4. Tabs and navigation

- [ ] Switch tabs (e.g. Audit, Coach); close pane; reopen — **last tab** restores (not Thesaurus when Simple mode on).
- [ ] Simple mode on while on Thesaurus → returns to Target.
- [ ] Audit card **Rewrite** → Rewrite tab → **Back to Audit**.

## 5. Checks and audit

- [ ] Checks: enable modules → **Run audit** (toolbar or Audit hub).
- [ ] Audit: filter chips, sort; read-only **Report depth** and **Default filter** hints match Settings → Audit.
- [ ] Change report depth / default filter in Settings — hints update on Audit tab.
- [ ] **Apply fix** on a card → **Undo** → **Last edit**.

## 6. Help, About, and diagnostics

- [ ] **Help → About ProzaEdit**: build version, manifest version, add-in ID, GitHub repo, **Check for updates** (matches manifest **2.0.0.15** when current).
- [ ] Help copy mentions scope line, last tab, Settings shortcuts.
- [ ] Settings → Privacy: opt-in off by default; **Report a problem** copies redacted JSON (no document text in clipboard JSON).

## 7. Narrow pane

- [ ] Drag pane divider narrow (&lt;360px): tabs wrap; controls remain usable (`pe-narrow-pane`).

---

*Automated coverage:* `npm test` (includes `ui-prefs-helpers.test.mjs`, `onboarding-helpers.test.mjs`). Five-pass audit: [prozaedit-five-pass-audit-beta-ready.md](prozaedit-five-pass-audit-beta-ready.md).
