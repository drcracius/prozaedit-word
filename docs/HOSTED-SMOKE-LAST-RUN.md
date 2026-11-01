# Hosted smoke — last automated run

**Run (UTC):** 2026-11-01  
**Runner:** PE-48 cloud agent (HTTP GET only; no Office.js) · Superseding audit: [FINAL-AUDIT-PE-49.md](./FINAL-AUDIT-PE-49.md)  
**Expected build:** **2.0.0.15**

---

## Summary

| Result | Detail |
|--------|--------|
| **Overall** | **PASS** |

---

## Checks

| # | URL / asset | HTTP | Notes |
|---|-------------|:----:|-------|
| 1 | [Task pane HTML (GitHub Pages)](https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html) | 200 | Loads hosted UI shell |
| 2 | [manifest.hosted.xml (raw)](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) | 200 | `<Version>2.0.0.15</Version>` |
| 3 | [icon-32.png (raw)](https://raw.githubusercontent.com/drcracius/prozaedit-word/main/assets/icon-32.png) | 200 | Linked from manifest `IconUrl` |
| 4 | [taskpane.js (GitHub Pages)](https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.js) | 200 | `PROZAEDIT_BUILD_VERSION = "2.0.0.15"` |
| 5 | Version chain (Pages JS) | pass | Same const as manifest **2.0.0.15** |
| 6 | Version chain (raw main JS) | pass | [raw taskpane.js](https://raw.githubusercontent.com/drcracius/prozaedit-word/main/src/taskpane/taskpane.js) contains **2.0.0.15** |

---

## Pre-manual gate (local / CI)

| Check | Expected |
|-------|----------|
| `npm test` | 29 pass |
| `bash scripts/verify-version-sync.sh` | manifest ↔ `PROZAEDIT_BUILD_VERSION` aligned |

*Re-run this smoke after manifest or Pages-breaking changes.*
