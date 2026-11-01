# PE-71 — Three-pass comprehensive audit

**Date:** 2026-11-01  
**Baseline merge on `main`:** `275ba05` — Merge PR #18 (PE-63–67 UX bundle)  
**Build:** **2.0.0.15** (`manifest.hosted.xml` + `PROZAEDIT_BUILD_VERSION`; version-sync OK)  
**Unit tests:** **57** pass (`npm test` on this baseline)  
**Pass 3 delta branch:** [PR #19](https://github.com/drcracius/prozaedit-word/pull/19) `cursor/pe-69-complaint-hardening-32b9` @ `16e976e` (open; not merged)

---

## Executive summary

| Metric | Value |
|--------|------:|
| **Overall shipped product score (main today)** | **8.80 / 10** |
| **Projected after PR #19 merge** | **~8.88 / 10** |
| **vNext IA alignment** | **~4.2 / 10** (unchanged) |
| **P0 on main** | **0** |
| **P1 on main (open until #19)** | **3** |
| **Beta gate PE-47** | **Open** — owner Word web validation not logged |

ProzaEdit on `main` is a strong **local-first, Simple-default** beta: tab order **Start → Run → Fix → Help**, cross-nav, CONFIG autosave, cooperative cancel for Word reads, and redaction-aware diagnostics. Remaining gaps cluster around **card-by-card review ergonomics** (scroll/focus, “Finding X of Y”), **misleading success status after audit failure**, **tour focus trap**, and **doc drift** (legacy “29 tests” in several milestone docs). **PR #19** addresses the product P1s without a manifest bump; this audit does not duplicate that branch.

---

## Pass 1 — UI / UX / wiring

**Scope:** Tab order Simple vs full; cross-navigation; onboarding sequencing; HTML id inventory; CONFIG autosave; accessibility spot-check; theme tokens; average-user vs power-user paths.

### Verified strengths

| Area | Evidence |
|------|----------|
| **Simple tab order** | `WorkflowNav.TAB_ORDER_SIMPLE` → Start / Run / Fix / Help; full mode keeps Target-first power order (`workflow-nav-helpers.js`). |
| **Cross-nav** | `updateWorkflowCrossNav` + strip `#peWorkflowCrossNav`; covered by `workflow-nav-helpers.test.mjs`. |
| **Onboarding sequence** | Session tips → Simple first-run banner → deferred 3-stop tour when gates clear (`onboarding-helpers.js`, `maybeInitOnboardingTour`). |
| **DOM wiring** | **208** HTML ids; **131** unique `getEl("…")` refs on main; **0 missing** ids; **97** inline `onclick` handlers; **0 undefined** handler names (static scan). |
| **CONFIG round-trip** | `collectUiConfig` / `applyUiConfig` include `simpleMode`, `onboardingTourComplete`, tour/onboarding prefs, shaper sliders, `batchSectionCount`, `rewriteMode`, `lastActiveTab`; autosave lists verified in `taskpane-config-autosave-wiring.test.mjs`. |
| **Average-user path** | Documented in `PHASE-1-QUICKSTART.md` §Average-user; matches Simple labels + Important-first filter (`PlainLanguage`). |
| **Power path** | Simple off → seven tabs, Coach/Rewrite/Thesaurus, Critical chip labels, extended local audit. |
| **Themes** | Light / dark / system via CSS variables; dark palette uses paired `--pe-*` tokens (`taskpane.css`). |
| **Live regions** | `#peStatus`, workflow lines, long-op progress, audit hints use `aria-live="polite"`. |
| **Settings modal** | Focus trap on Tab (`trapFocusInSettingsModal`); Escape/backdrop close. |

### Findings (P0–P3)

| ID | Sev | Finding | Location / notes |
|----|-----|---------|------------------|
| P1-UX-1 | **P1** | **Failed audit still shows success status** — `.finally()` always sets “Audit finished (0 tokens).” unless cancelled; error path only updates summary HTML. | `runAuditInternalCore` ~3804–3812 |
| P1-UX-2 | **P1** | **Mute/Dismiss/Apply re-render wipes scroll and focus** — `removeAuditCard` → `applyAuditCardFilter` → `renderAuditCards` clears `#cardContainer`; no next-card focus or scroll stabilization. | `removeAuditCard` ~3916–3921 |
| P2-UX-3 | **P2** | **No per-card “Finding X of Y”** while fixing; tour has step progress; filter chips show counts only. | `renderAuditCards` |
| P2-UX-4 | **P2** | **Onboarding tour lacks focus trap** — Escape works; Tab can escape dialog; settings modal already traps. | `onboardingTourKeydownHandler` |
| P2-UX-5 | **P2** | **Seven-tab density when Simple off** — mitigated by default Simple on, not removed. | Product choice / vNext |
| P3-UX-6 | **P3** | **102 inline handlers** — maintainability; all resolve today. | `taskpane.html` |
| P3-UX-7 | **P3** | **Power UI still says “Critical”** in chips when Simple off — PE-65 note; intentional split. | `plain-language-helpers.js` |

### Pass 1 score: **8.65 / 10**

Strong Simple-default IA and wiring; P1 review-flow and status-line issues hold the score below PE-68 headline until **PR #19**.

---

## Pass 2 — Algorithms / runtime / security

**Scope:** ScopeReader limits and cancellation; audit engine gating; apply/undo/continuity; PE-69 helpers (on branch); egress; diagnostics; long-operation cancel gaps.

### Verified strengths

| Area | Evidence |
|------|----------|
| **Scope caps** | `LIMITS` up to 450k chars (full); truncation card + status hint on `sys_trunc` (`scope-reader.js`, `finalizeAudit`). |
| **Cooperative cancel** | `LongOperationController` + `cancelCheck` in `ScopeReader` paragraph walks; cancel buttons on Checks/Audit long-op rows. |
| **Audit gating** | `_stripIneligibleFictionFlags`; fiction modules tied to manuscript type; citation engine eligibility check in UI. |
| **Apply safety** | `confirmBeforeApply` default on; `ContinuityGuard.assessReplace`; session undo/redo via `EditHistory`. |
| **Mute/dictionary** | `Settings.muteRule` / `dismissTarget`; document-scoped persistence patterns in `settings-store.js`. |
| **Diagnostics** | Opt-in; sensitive key redaction; AIza/sk patterns stripped (`diagnostics-reporter.js`). |
| **Datamuse** | Single-token query only; 8s client abort (`renderThesaurus`). |
| **Gemini** | BYO key; 32k char prompt cap; 90s timeout; key in query string (Google API pattern). |

### Findings (P0–P3)

| ID | Sev | Finding | Location / notes |
|----|-----|---------|------------------|
| P0-RT-0 | — | **No P0** | — |
| P1-RT-1 | **P1** | Same as **P1-UX-1** — false-success status after audit exception. | `runAuditInternalCore` |
| P2-RT-2 | **P2** | **Gemini HTTP not tied to long-op Cancel** — documented in `long-operation-helpers.js`; in-flight fetch continues until timeout/complete. | `gemini-client.js`, Coach/Rewrite/Deep audit |
| P2-RT-3 | **P2** | **Apply/Go-to errors** — raw `e.message` + alert; no structured recovery copy on main. | `applyDocumentEdit`, `goToIssue` |
| P2-RT-4 | **P2** | **False-positive surfaces** — heuristics + dictionary/mute; academic contraction rule may nag non-academic types; owner tuning remains. | `audit-engine.js` |
| P3-RT-5 | **P3** | **API key in document** when Remember enabled — disclosed in Help; secure storage vNext. | CONFIG + settings copy |

### PE-69 branch verification (PR #19)

| Item | On `main` | On PR #19 branch |
|------|-----------|------------------|
| `audit-review-helpers.js` (X of Y, next card, recovery copy) | Missing | **Added** |
| Failed audit status line | Bug | **Fixed** (`failed` flag) |
| Scroll/focus after Mute/Dismiss | Bug | **Fixed** in `removeAuditCard` |
| Tour focus trap | Partial | **Fixed** (`trapFocusWithin`) |
| Cancel UX copy + `aria-busy` on Run/Fix tabs | Basic | **Improved** |
| Tests | 57 | **60** (`audit-review-hardening.test.mjs`) |
| Repo complaint doc | Store only | **`docs/WRITING-ADDIN-COMPLAINT-AUDIT-PE-69.md`** added on branch |

### Pass 2 score: **8.55 / 10** (main) · **~8.85 / 10** (with PR #19)

---

## Pass 3 — Docs / product / complaint alignment

**Scope:** README, quickstart, checklists, PE-69 complaint audit, multi-phase plan; PE-60/PE-69 matrix; tests/CI; beta vs PE-47.

### Docs vs code

| Doc | Aligned? | Gap |
|-----|----------|-----|
| `README.md` | Yes | 57 tests, 2.0.0.15, PE-63–67, PE-47 open |
| `PHASE-1-QUICKSTART.md` | Yes | 57 tests; average-user path matches Simple UI |
| `FULL-TEST-CHECKLIST-WORD-WEB.md` | Yes | PE-63–67 sections; manual host validation |
| `prozaedit-audit-rating-current.md` | Updated PE-71 | Was **8.85** pre-audit; **8.80** honest with open P1s |
| `FINAL-MILE-PLAN-WEB.md` | **Partial** | Still says **29** unit tests (stale) |
| `WHEN-YOU-RETURN.md` | **Partial** | **29** tests |
| `FINAL-AUDIT-PE-49.md` | **Partial** | **29** tests (historical snapshot OK if labeled) |
| `prozaedit-multi-phase-plan.md` | **Partial** | **29** tests |
| `docs/WRITING-ADDIN-COMPLAINT-AUDIT-PE-69.md` | **Missing on main** | On PR #19; mirror in Project store |
| Store `prozaedit-writing-addin-complaint-audit-pe-69.md` | Yes | Canonical narrative for PE-69 |

### PE-60 / PE-69 complaint matrix (main)

| Cluster | Status on main | After PR #19 |
|---------|----------------|--------------|
| Overwhelm / unclear start | **Closed (UI)** | Same |
| Realtime fatigue | **Closed (architecture)** | Same |
| Lag / long docs | **Partial** | Same + clearer cancel copy |
| False positives / ignores | **Partial** | Same |
| List jumping / lost place | **Partial → P1 open** | **Mitigated in UI** |
| Destructive apply / undo | **Mitigated** | **Stronger recovery copy** |
| Privacy / cloud / keys | **Partial** | **Stronger disclosure** (branch) |
| Web/Mac/Desktop parity | **Open (PE-47)** | Same |
| Accessibility / keyboard | **Partial** | Tour trap improved |
| Onboarding / jargon | **Closed (UI)** | Same |
| Navigation / cancel | **Partial** | Failed-run status fixed |

### Tests and CI

| Gate | Status |
|------|--------|
| `npm test` | **57** tests, 0 fail |
| `scripts/verify-version-sync.sh` | Pass |
| GitHub Actions | `version-sync.yml` only — **no Office.js** |
| F-58-9 / Office smoke | **Open** — tracked PE-69+ / manual checklist |

### Beta readiness vs PE-47

| Criterion | Status |
|-----------|--------|
| Agent prep (PE-48) | Done |
| UX bundle (PE-63–67) | Merged `275ba05` |
| P0 defects | None on main |
| Owner Phase 1 checklist | **Not complete** — PE-47 gate open |
| Recommended before wide beta invite | Merge **PR #19**; owner runs `FULL-TEST-CHECKLIST-WORD-WEB.md`; sync stale test-count docs |

### Pass 3 findings & recommendations

| ID | Sev | Finding | Recommendation |
|----|-----|---------|------------------|
| P2-DOC-1 | P2 | Stale **29 tests** in milestone docs | Owner or agent doc sweep → **57** |
| P2-DOC-2 | P2 | PE-69 complaint audit not on `main` | Merge PR #19 or copy doc from branch |
| P2-DOC-3 | P2 | No Office.js CI | Backlog smoke fixture (PE-69/F-58-9) |
| P3-DOC-4 | P3 | Store rating file lags repo (8.7 vs 8.85/8.80) | Sync Project store from repo after PE-71 |

### Pass 3 score: **7.95 / 10**

---

## Consolidated prioritized fix list

### Owner (manual / product)

1. **PE-47** — Run [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) on Word web; log in [templates/VALIDATION-LOG.md](./templates/VALIDATION-LOG.md).
2. **Merge [PR #19](https://github.com/drcracius/prozaedit-word/pull/19)** after review — closes P1-UX-1/2 and complaint-alignment gaps without manifest bump.
3. **Cross-host spot-check** — mute/dictionary persistence across pane reload; long-document section loop.
4. **Accessibility** — screen reader + keyboard-only pass on Fix tab after #19.
5. **Beta comms** — hold wide invite until PE-47 log shows no P0.

### Agent (code/docs)

1. **Do not fork PE-69** — depend on PR #19 for review-flow P1s.
2. **Doc sweep** — update **29 → 57** tests in `FINAL-MILE-PLAN-WEB.md`, `WHEN-YOU-RETURN.md`, `prozaedit-multi-phase-plan.md` (separate small PR if owner wants).
3. **Office.js read-only smoke** — design for CI when prioritized.
4. **Gemini cancel wiring** — shared `AbortSignal` from long-op controller (P2, larger change).
5. **Re-rate to ~8.88** after PR #19 merge + green CI.

---

## Top 5 actions (summary)

| # | Owner | Agent |
|---|-------|-------|
| 1 | Complete PE-47 Word web validation | Maintain PE-71 rating + this report |
| 2 | Merge PR #19 when satisfied | Avoid conflicting hardening branch |
| 3 | Validate Fix-tab flow on real manuscript | Doc test-count sync PR (optional) |
| 4 | Decide API-key persistence policy for beta FAQ | Office.js CI spike when scheduled |
| 5 | UX-4 beta feedback after GO | Re-run audit snippet post-merge |

---

## Cross-links

- [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md)
- [FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md](./FULL-APP-REVIEW-PE-68-POST-UX-BUNDLE.md)
- [PR #19 — PE-69 complaint hardening](https://github.com/drcracius/prozaedit-word/pull/19)
- Project store: `docs/prozaedit-writing-addin-complaint-audit-pe-69.md`, `internal/pe-69-complaint-cluster-audit.md`

---

*Audit performed on Cloud Agent VM; merge SHA **275ba05**; `npm test` **57/57**; no manifest bump in this deliverable.*
