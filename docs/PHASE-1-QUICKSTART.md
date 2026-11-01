# Phase 1 quickstart (~15 min critical path)

**Web 1.0 RC:** build **2.0.0.16**, **168** tests (PE-79 Word fixes merged), UX bundle PE-63–67 merged; desktop **PE-2** deferred.  
**Owner:** Word on the web only.  
**Full checklist:** [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) (~90 min)  
**Log results:** [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md) or [Word web validation issue](https://github.com/drcracius/prozaedit-word/issues/new?template=word-web-validation.yml)  
**Plan:** [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md)

**Pane:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html  
**Manifest (raw):** https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml

---

## Before you start (2 min)

```bash
npm test
bash scripts/verify-version-sync.sh
```

Skim [HOSTED-SMOKE-LAST-RUN.md](./HOSTED-SMOKE-LAST-RUN.md) — last automated pass should be green.

---

## Critical path (≈15 min)

| Step | What to do | Pass if |
|------|------------|---------|
| **A. Install** | New blank doc → Upload `manifest.hosted.xml` → open test doc → **Home → ProzaEdit** | Pane loads; Help → About shows **2.0.0.16** |
| **B. Target** | Set manuscript type + one scope mode; **Refresh count** | Sticky scope line updates |
| **C. Settings** | Open Settings (toolbar); toggle one Onboarding flag; close with Escape | Modal opens/closes; no console errors |
| **D. One audit** | Checks → enable a module → **Run audit** → **Apply fix** → **Undo** | Completes or **Cancelled.** cleanly |
| **E. PE-45 spot** | Simple mode **on** → Audit tab | **Critical** chip/banner visible |
| **F. Sign-off draft** | Any P0? | ☐ None → schedule full §1–8 + §9 matrix in [VALIDATION-LOG](./templates/VALIDATION-LOG.md) |

---

## Average-user 10-minute path (non-technical)

Use this if you are new to editing add-ins and want the smallest path to a useful audit — no command line required.

| Step | What you do | You are done when |
|------|-------------|-------------------|
| **1. Open ProzaEdit** | In Word on the web, open a chapter or highlight a passage → **Home → ProzaEdit** | The task pane loads; **Simple mode** is usually already on; tabs read **Start · Run · Fix · Help** |
| **2. Start — what to check** | On **Start** (Target), pick **One or more chapters** or **Text you selected** → **Refresh count** | The line under the toolbar shows your scope; use **Related workflow steps** to jump back later |
| **3. Run — run check** | Open **Run** (Checks) → leave the four main toggles on → click **Run audit** (big button) | Progress line, then link **View issues on Fix** or the **Fix** tab fills with cards |
| **4. Fix — fix issues** | On **Fix** (Audit), use the **Important** filter (Simple mode) → **Go to** each card → **Apply fix** if you agree | Red **Important** count goes down |
| **5. Names that are correct** | If a character name is flagged wrongly → **Mute** → follow the hint to **Dictionary** in Settings | That name stops nagging on this document |
| **6. More power (optional)** | **Settings → Essentials** → turn off **Simple mode** | **Coach**, **Rewrite**, and **Thesaurus** tabs return; filters say **Critical** again |

**Remember:** ProzaEdit runs when you click **Run audit** — it does not underline while you type (unlike Grammarly).

---

## After quickstart

- Complete remaining sections in [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) (Settings groups, narrow pane, banners, cancel paths, shaper persistence).
- Record **GO beta** or **HOLD** on the validation log.
- Phase 2: [templates/BETA-FEEDBACK.md](./templates/BETA-FEEDBACK.md).
