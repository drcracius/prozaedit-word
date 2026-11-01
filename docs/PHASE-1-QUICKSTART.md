# Phase 1 quickstart (~15 min critical path)

**Web 1.0 RC:** build **2.0.0.15**, **29** tests, PE-48 prep merged; desktop **PE-2** deferred.  
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
| **A. Install** | New blank doc → Upload `manifest.hosted.xml` → open test doc → **Home → ProzaEdit** | Pane loads; Help → About shows **2.0.0.15** |
| **B. Target** | Set manuscript type + one scope mode; **Refresh count** | Sticky scope line updates |
| **C. Settings** | Open Settings (toolbar); toggle one Onboarding flag; close with Escape | Modal opens/closes; no console errors |
| **D. One audit** | Checks → enable a module → **Run audit** → **Apply fix** → **Undo** | Completes or **Cancelled.** cleanly |
| **E. PE-45 spot** | Simple mode **on** → Audit tab | **Critical** chip/banner visible |
| **F. Sign-off draft** | Any P0? | ☐ None → schedule full §1–8 + §9 matrix in [VALIDATION-LOG](./templates/VALIDATION-LOG.md) |

---

## After quickstart

- Complete remaining sections in [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) (Settings groups, narrow pane, banners, cancel paths, shaper persistence).
- Record **GO beta** or **HOLD** on the validation log.
- Phase 2: [templates/BETA-FEEDBACK.md](./templates/BETA-FEEDBACK.md).
