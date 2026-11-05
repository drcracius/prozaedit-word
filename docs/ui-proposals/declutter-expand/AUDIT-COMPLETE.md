# Declutter program — comprehensive audit (2026-11-04)

**Branch:** `cursor/pe-declutter-first-screen` · **Build:** **2.0.0.31** · **Restore tag:** `pe-pre-declutter-2.0.0.30` (`b4ea7d3` on `main`)

Automated gates last run with this audit: `npm test`, `verify:wiring`, `check:contrast` (see commit message on branch tip).

---

## Phase implementation vs plan

| Phase | Planned | Implemented | Evidence |
| --- | --- | --- | --- |
| **Pass 1** | Tips, icons, scope/type lift, hidden hints | **Yes** | `#peChromeHelp`, icon pills/badges/toolbar Run, `#manuscriptType` outside `.pe-target-section`, JS tip/hint rules |
| **Pass 2a** | Summary block, hidden audit hints, More exports | **Yes** | `.pe-report-block`, hidden `#auditDefaultFilterHint` / `#peAuditFilterLanesHint`, Share → **More** |
| **Pass 3** | Shadow + Simple tab/pill spacing | **Yes** | `--pe-card-shadow` tokens; `.pe-simple-mode` tab label size |
| **Pass 4** | Help/Settings dedupe | **Yes** | Start here + QUICK-START link; removed scope/settings essays; Install & update + Diagnostics & platforms `<details>`; Settings intro removed |
| **Pass 5** | Duplicate JS strings (light) | **Yes** | Tour/checklist/What's new; pipeline hint; not every legacy “Run audit” in technical copy |
| **Pass 2b** | Lane groups | **No** | Not scheduled |

---

## Wiring & regression (must not break)

| Check | Result |
| --- | --- |
| `#scope`, `#summaryReport` (inner id), `#cardContainer`, `#peWorkflowStatusLine` | Present |
| `#peDocScopeTrustLine` (in Tips) | Present |
| `#peHelpNewToEditing`, `#peHelpPrivacySummary`, `#peHelpGotoTroubleshoot`, `#peHelpSupportSummary`, About ids | Present |
| `#pe-settings-privacy` deep link | Unchanged |
| Apply / Track Changes | Mock-tested only — **not real-Word verified** |
| Light/dark contrast | 0 failures in `check:contrast` |

---

## Automated tests added for declutter

- Pass 1 quiet chrome (Tips, type lift, hidden hints)
- Pass 2a audit chrome (summary wrapper, More, hidden hints)
- Pass 4 Help ids + duplicate scope essay removed
- Full-manuscript tip visible only at ≥ 80k chars after Refresh

---

## Known residual (by design or environment)

| Item | Notes |
| --- | --- |
| **Banners** | What's new / Simple / session / long-op still stack until dismissed |
| **~20-word chrome budget** | Excludes genre blurb, long Type options, Style below fold |
| **“Run audit” wording** | Still appears in some technical/disclosure strings (Datamuse, citation scan, Help dictionary steps) — not first-screen duplicates |
| **`main` / Pages** | Still **2.0.0.30** until branch merge; **2.0.0.31** proves refresh on branch only |
| **Real Word** | Owner smoke: scope, Run report, Apply, Track Changes |
| **Pass 2b** | Optional; breaks card `children` tests unless redesigned |

---

## Version sync (source-of-truth)

Aligned for **2.0.0.31** on this branch:

- `manifest.hosted.xml`, `manifest.xml`
- `PROZAEDIT_BUILD_VERSION` in `taskpane.js`
- About / What's new HTML defaults
- `Onboarding.WHATS_NEW_RELEASE.version`
- `docs/WHEN-YOU-RETURN.md` (**currently **2.0.0.31** on branch**)
- `docs/RELEASE-NOTES-PE-81.md` section added
- Handoff-listed docs updated where required

---

## Owner acceptance (still required)

1. Merge `cursor/pe-declutter-first-screen` → `main` when pane looks right (Ctrl+F5 after Pages deploy).
2. Re-upload `manifest.hosted.xml` if About manifest version lags.
3. Narrow + wide Word web pane: Tips closed, Scope + Type + Run obvious.
4. One Run report → cards → Go to / Apply (Word behaviour not claimed verified here).

---

## Rollback

`git checkout pe-pre-declutter-2.0.0.30` (or reset branch to `b4ea7d3` pre-declutter UI). No force-push `main`.
