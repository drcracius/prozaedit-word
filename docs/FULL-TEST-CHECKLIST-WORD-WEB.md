# ProzaEdit Word — full manual test checklist (Word on the web)

**Audience:** D Cracius beta validation on **Word online** (narrow task pane).  
**Build:** UI **2.0.0.15** (no manifest re-upload for UX bundle PE-63–67).  
**Pane URL:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html  
**Final mile (web-first):** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) · **57** unit tests on `main` · UX bundle [#18](https://github.com/drcracius/prozaedit-word/pull/18) · desktop **PE-2** not required.

---

## 1. Install and open

- [ ] New blank document → **Insert** → **Add-ins** → **Upload My Add-in** → `manifest.hosted.xml` from GitHub raw.
- [ ] Open a test manuscript → **Home** → **ProzaEdit** task pane loads (brand header, workflow strip, toolbar).
- [ ] **Help → About ProzaEdit → Check for updates** reports manifest/UI **2.0.0.15**.

## 2. Target and scope

- [ ] Set manuscript type, scope modes: selection, page range, selected chapters (reload list), full manuscript.
- [ ] **Refresh count** updates Target preview and the **sticky scope line** under the toolbar (PE-57: line includes **Guide:** + **Scope:**).
- [ ] Change scope without refresh — line updates label; count refreshes when applicable.
- [ ] Change **Preferred style guide** on Target — sticky line **Guide:** label updates (custom house name when applicable).

## 3. Settings groups

- [ ] Toolbar **Settings** opens modal; **Back**, **Close**, **Escape** dismiss.
- [ ] **Ctrl+Shift+,** and **Alt+Shift+S** open Settings (not while focused in a text field).
- [ ] Help **Open Settings → Privacy** and Target **Custom rules → manage** land in the right group.
- [ ] Bookmark `#pe-settings-privacy` on reload opens Privacy group.
- [ ] Each group **Reset … to defaults** (confirm) — Safety, Onboarding, Appearance, Audit, Privacy, Dictionary, Custom style; Reference shows info only.
- [ ] **Onboarding** group: **Show new-session tips**, **Show What's new**, **Show prior-session recap**, **Warn before long operations**, **Show dark-appearance tip** (all default on); **Reset Onboarding** restores defaults.
- [ ] **Appearance** group: **Light** / **Dark** / **Match system** — pane updates immediately; **Save & close** persists `themePreference` in `PROZAEDIT_CONFIG` (default **Light** on fresh docs). **Reset Appearance** returns to Light. Reopen pane — theme restores from document settings. With **Match system**, change OS light/dark and confirm pane follows (CONFIG stays `system`). Spot-check dark: top banners, audit cards, Settings modal, long-op banner, workflow strip, focus rings on tabs/buttons. **PE-57:** first dark session shows **Dark appearance** banner; **Got it** hides for session; links in help copy are white/muted (not green); primary buttons/tab still green.
- [ ] Settings **Filter settings** box hides non-matching groups (e.g. type `audit`).
- [ ] Toolbar status line: message auto-clears ~6s; **×** dismisses immediately.
- [ ] **Got it** on session tips banner hides `#peSessionTips` until next browser session (global `.hidden` utility).
- [ ] **What's new** top banner (`#peWhatsNewBanner`) shows once per release when enabled; **Got it** dismisses for version; **Don't show again** turns off the toggle.
- [ ] **Prior session** banner (`#pePriorSessionBanner`) after a prior visit: recap lines from `pe-last-session-summary`; **Got it** hides for session; **Turn off in Settings** opens Onboarding.

## 4. Tabs and navigation

- [ ] **Simple mode on:** tab strip order left→right **Start · Run · Fix · Help** (Coach/Rewrite deemphasized or last); **Simple off:** Target · Checks · Audit · Thesaurus · Coach · Rewrite · Help (PE-67).
- [ ] **Related workflow steps** strip under toolbar: change scope, run again, view issues (when results exist), dictionary link works (PE-67).
- [ ] After **Run audit**, Checks shows **View issues on Fix** (or equivalent) when audit completes (PE-67).
- [ ] Switch tabs (e.g. Fix/Audit, Coach); close pane; reopen — **last tab** restores (not Thesaurus when Simple mode on).
- [ ] Simple mode on while on Thesaurus → returns to Target/Start.
- [ ] Audit card **Rewrite** → Rewrite tab → **Back to Audit**.
- [ ] **PE-63 tour:** fresh CONFIG → after banners, optional 3-stop tour; **Skip tour** persists; does not return on reopen.

## 5. Checks and audit

- [ ] Checks: top **eligibility** callout (`pe-checks-eligibility`) explains fiction vs academic / citation gating for your manuscript type (PE-45).
- [ ] Checks: enable modules → **Run audit** (toolbar or Audit hub).
- [ ] Checks **Scope (read-only)** chip matches Target scope / refresh count.
- [ ] Audit tab **Scope (read-only)** chip matches Checks after refresh (PE-45).
- [ ] **Run audit** shows **Reading document…** then **Analyzing…**; **Cancel** stops cleanly with status **Cancelled.** (no stuck disabled buttons).
- [ ] Full manuscript or large scope: **Long operation** banner when **Warn before long operations** is on (Settings → Onboarding); **Continue** / **Not now** / **Don't show again**.
- [ ] Audit tab **badge** shows open issue count after audit; clears when audit cleared.
- [ ] **Simple mode on:** Audit shows **Critical**-first banner copy; default-filter hint mentions Simple (PE-45).
- [ ] Audit: filter chips, sort; read-only **Report depth** and **Default filter** hints match Settings → Audit.
- [ ] Change report depth / default filter in Settings — hints update on Audit tab.
- [ ] Empty Audit state: **Run audit from Checks** CTA.
- [ ] **Apply fix** on a card → card **Undo** / toolbar **Undo** → **Last edit** (PE-57: Undo + Apply same row on card).
- [ ] **Academic** or **Business** type (or built-in style guide on Target): Audit tab **Review profile** hint; default filter chip **Style guide** when no saved filter (unless Simple mode).
- [ ] Optional: **Verify citations** / **Scan timeline** on large scope — warning banner; Cancel during scan.
- [ ] Optional: **Batch section audits** — warning; **Cancel batch** or hub Cancel stops between sections.
- [ ] **Rewrite → Advanced lexical shaper:** change Complexity / Intensity / Density → save document → reopen pane → sliders restored; **Reset** in panel → defaults **3 / 4 / 2** (PE-45 CONFIG persistence).

## 6. Help, About, and diagnostics

- [ ] **Help → About ProzaEdit**: build version, manifest version, add-in ID, GitHub repo, **Check for updates** (matches manifest **2.0.0.15** when current).
- [ ] Help copy mentions scope line, last tab, Settings shortcuts; **PE-57** severity legend row (Critical / Style / OK).
- [ ] Settings → Privacy: opt-in off by default; **Report a problem** copies redacted JSON (no document text in clipboard JSON).

## 7. Narrow pane & typography (PE-52)

- [ ] Drag pane divider narrow (&lt;360px): tabs wrap; controls remain usable (`pe-narrow-pane`); tab labels stay readable (not micro-sized).
- [ ] Body and Settings/Audit copy readable at default width; **Light** and **Dark** (Settings → Appearance) both look balanced.

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

*Automated coverage:* `npm test` (**57** tests — includes `workflow-nav-helpers.test.mjs`, `plain-language-helpers.test.mjs`, `onboarding-tour.test.mjs`, onboarding/CONFIG wiring). Five-pass audit: [prozaedit-five-pass-audit-beta-ready.md](prozaedit-five-pass-audit-beta-ready.md). Office.js smoke: **PE-69** (manual Word web still P0).

---

## Owner mile after this checklist (web 1.0 — PE-2 not required)

Track progress in [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md). Log results: [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md) · UX-4: [templates/BETA-FEEDBACK.md](./templates/BETA-FEEDBACK.md).

| Item | Owner action | Required for web beta? |
|------|----------------|------------------------|
| **Pass/fail log** | Copy template from final-mile plan Phase 1 | **Yes** |
| **UX-4 beta prompts** | Five questions in [UX rating](./prozaedit-ux-rating-and-recommendations.md) | **Yes** (or owner diary) |
| **Diagnostics ingest live** | Deploy worker ([DIAGNOSTICS.md](./DIAGNOSTICS.md)); URL + AppDomain + **2.0.0.16** | **Optional** |
| **PE-2 Shared Folder (desktop)** | [pe-2-shared-folder-checklist.md](./pe-2-shared-folder-checklist.md) — **deferred**; use web upload if skipped | **No** |
