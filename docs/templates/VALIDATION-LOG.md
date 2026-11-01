# Word web validation log

Copy this file (or duplicate in Project notes / a dated issue). Fill while running [FULL-TEST-CHECKLIST-WORD-WEB.md](../FULL-TEST-CHECKLIST-WORD-WEB.md).

| Field | Value |
|-------|--------|
| **Date** | YYYY-MM-DD |
| **Tester** | |
| **Build** | 2.0.0.15 |
| **Host** | Word on the web |
| **Browser** | |
| **Manifest upload** | Pass / Fail — notes: |

**Manifest (raw):** https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml  
**Pane URL:** https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html

---

## §1–8 — Checklist sections

| § | Section | Pass | Fail | Notes |
|---|---------|:----:|:----:|-------|
| 1 | Install and open | ☐ | ☐ | |
| 2 | Target and scope | ☐ | ☐ | |
| 3 | Settings groups | ☐ | ☐ | |
| 4 | Tabs and navigation | ☐ | ☐ | |
| 5 | Checks and audit | ☐ | ☐ | |
| 6 | Help, About, and diagnostics | ☐ | ☐ | |
| 7 | Narrow pane | ☐ | ☐ | |
| 8 | Interactive controls & banners | ☐ | ☐ | |

---

## §9 — PE-43 / PE-45 focused matrix

| Theme | Pass | Fail | Notes |
|-------|:----:|:----:|-------|
| Long-op warning banner (Settings → Onboarding) | ☐ | ☐ | |
| Cancel audit → **Cancelled.**; UI recovers | ☐ | ☐ | |
| Cancel citation / timeline / batch | ☐ | ☐ | |
| Shaper slider persistence + Reset → 3/4/2 | ☐ | ☐ | |
| Simple mode → Critical chip + banner (PE-45) | ☐ | ☐ | |
| Scope chips: Checks + Audit match Target | ☐ | ☐ | |
| Checks eligibility callout (PE-45) | ☐ | ☐ | |

---

## Sign-off

| Item | Value |
|------|--------|
| **P0 blockers** | None / list: |
| **Decision** | ☐ GO beta · ☐ HOLD — re-test after: |
| **Logged by** | |
| **Next** | Phase 2 → [BETA-FEEDBACK.md](./BETA-FEEDBACK.md) |

*Automated pre-check:* `npm test` (29 pass) · `bash scripts/verify-version-sync.sh`
