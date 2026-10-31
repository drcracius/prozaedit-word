---
cursor:
  subagentId: "bc-2a4fdccb-44fe-5aa1-a111-e3b300de3f5d"
---

# ProzaEdit Next-Gen Master Specification — Review vs Shipped Add-In

**Review date:** 2026-10-31  
**Spec reviewed:** [prozaedit-nextgen-master-specification.md](/cursor/stores/bc-c637dae0-2bc1-49bd-901e-59f914e56545/docs/prozaedit-nextgen-master-specification.md)  
**As-built reference:** [prozaedit-features.md](/cursor/stores/bc-c637dae0-2bc1-49bd-901e-59f914e56545/docs/prozaedit-features.md)  
**Code baseline validated:** GitHub `main` — `PROZAEDIT_BUILD_VERSION` **2.0.0.15** (`/workspace/src/taskpane/taskpane.js`), `manifest.hosted.xml` `<Version>` **2.0.0.15**  
**Validation method:** Read spec sections; grep and file inventory under `/workspace/src/taskpane/` (**28** `lib/*.js` modules including `tooltip-registry.js`, `chronology-engine.js`, `citation-engine.js`, `lexical-shaper.js`, `ai-quota-manager.js`, diagnostics client).

---

## 1. Executive verdict

The next-gen master spec is **useful as a long-range product vision** (Editorial Studio aesthetic, modular engines, centralized tooltips, richer narrative/citation tooling) but **must not be read as a description of what ships today** or as a drop-in replacement blueprint for `taskpane.html`.

**North-star value:** It crystallizes desirable capabilities (timeline mapping, stylebook-grade citation audits, 3-axis lexical shaping, structured Word report export, quota-aware Gemini) that align with ProzaEdit’s local-first positioning when phased correctly.

**Major misalignments:**

| Area | Spec assumption | Shipped reality (2.0.0.15) |
|------|-----------------|----------------------------|
| **Version / baseline** | “ProzaEdit v3.0.0 Architecture” in header and mock UI | Production **2.0.0.15**; no v3 line in repo |
| **Information architecture** | 7 tabs: Scope/Target, Narrative, Audit, Shaper, Citations, Coach, Help; Checks folded into Audit | 7 tabs: **Target, Thesaurus, Checks, Audit, Coach, Rewrite, Help** + 4-step workflow strip |
| **Deliverable shape** | Full replacement HTML/CSS in §11 + new `*.js` modules | Monolithic `taskpane.html` + `taskpane.css` + `taskpane.js` orchestrating **16 existing `lib/*.js` modules** |
| **Continuity / chronology** | Standalone `ChronologyEngine` (DAG, entity store, spoiler guard UI) | Fiction module **Continuity & Chronology** in `audit-engine.js` (phrase heuristics) + **ContinuityGuard** (pre-apply replace warnings); no timeline UI |
| **Rewrite / shape prose** | Dedicated **Shaper** tab with Complexity / Intensity / Density sliders | **Rewrite** tab: Fluency / Formal / Creative / Academic via `local-rewrite.js` |
| **Citations** | Bluebook / APA / CMOS engine + bibliography reconciliation tab | Academic **citation hint** card only; no dedicated citation engine |
| **Thesaurus & Checks depth** | Not present in spec UI | Core product: Datamuse thesaurus, extended checks, section/chapter loop, batch audits, heatmap, custom house style, report depth, partner-tool guidance |
| **Settings** | Central settings modal (persona, AI, tooltips) | Persona, scope, style, safety, dictionary on **Target**; Gemini blocks on Coach/Rewrite/Checks |
| **AI governance** | `AIQuotaManager` session/monthly ceilings | `gemini-client.js` token **estimate** + confirm dialogs; no enforced session budget class |

**Recommendation:** Retain the spec as **“ProzaEdit Architecture Target (vNext)”** with explicit **production baseline 2.0.0.15** and a **gap table** (§2). Do **not** implement §11 as a single cutover without a phased plan (§5).

---

## 2. Accurate vs aspirational — spec vs current code

Legend: **Exists** = behavior or equivalent in `main`; **Partial** = subset or different UX/module boundary; **Missing** = not in repo as specified.

| Spec section / module | Spec artifact | Current code | Status | Notes |
|----------------------|---------------|--------------|--------|-------|
| §1 Design language | Editorial Studio palette, Fluent 2, dark mode tokens | `taskpane.css` + wordmark header; no dark theme system | **Partial** | Spec CSS differs from shipped brand (wordmark, workflow strip, help details) |
| §2 IA — header scope pill + token pill | `[Scope: Ch. 12 ▼] [Tokens: 0]` | Scope on Target/Audit; token estimate on Coach/Rewrite only | **Partial** | No global header metrics |
| §2 IA — footer | Undo, Redo, Status, Run Audit | Same pattern in sticky toolbar | **Exists** | 40-step undo in `edit-history.js` matches spec copy |
| §2 Tab: Scope & Target | Tab 1 only (genre + tone sliders) | **Target** tab: profile, scope modes (5), style guide, custom rules, dictionary, safety | **Partial** | Spec omits most Target capabilities |
| §2 Tab: Narrative / Timeline | Dedicated tab + scan button + timeline list | No tab; fiction checks include continuity/spoiler | **Missing** (UI) / **Partial** (rules) |
| §2 Tab: Checks & Engine | Merged into Audit in spec mock | **Checks** tab: toggles, extended pass, section loop, deep audit, heatmap | **Exists** | Spec would **remove** this surface |
| §2 Tab: Audit & cards | Audit tab + export | **Audit** tab: filters, apply, mute, exports, overview | **Exists** | Richer than spec mock (Copilot copy, density, heatmap embed) |
| §2 Tab: Shaper | 3-axis sliders | **Rewrite** tab (4 modes) | **Partial** | Different mental model and API |
| §2 Tab: Citations | Full authority engine tab | Hint in audit for academic excerpts | **Missing** |
| §2 Tab: Coach | Chat stream | **Coach**: LocalCoach + optional Gemini | **Exists** | Spec modal settings duplicate persona already on Target |
| §2 Tab: Help | Minimal quick ref | **Help**: install, updates, platform notes | **Exists** | Shipped help is more operational |
| §2 Tab: Thesaurus | — | **Thesaurus** (Datamuse) | **Exists** | **Not in spec** — regression if literal IA adopted |
| §3 Tooltip registry | `tooltip-registry.js` + `data-pe-tip` | **`tooltip-registry.js`** + Target toggle; native titles when off | **Partial** | Shipped v1; not every control migrated |
| §4 Chronology engine | `chronology-engine.js` (DAG, entity store) | **`chronology-engine.js` v1** + Checks timeline scan + audit continuity modules | **Partial** | Heuristic scan — not full DAG / entity catalog UI |
| §5 Lexical shaper | `lexical-shaper.js` + Zipf axis | `local-rewrite.js` wordiness/pleonasm/register | **Partial** | No Zipf / vivid-verb map module |
| §6 Lexical banks | `lexical-banks.js` | Lists embedded in audit/rewrite/heuristics | **Partial** | Not extracted as spec file |
| §7 Citation engine | `citation-engine.js` | **`citation-engine.js` v1** + Checks citation verify sub-panel | **Partial** | Pattern assist — not compliance certification or dedicated tab |
| §8 Word report export | `report-docx-export.js` | `createDocument()` path in `taskpane.js` + `.txt` fallback | **Partial** | Export exists; not modular; timeline section N/A |
| §9 Safe navigator | `word-safe-navigator.js` class | `sanitizeSearch()` in `taskpane.js` | **Partial** | Same 255-char / wildcard strip idea |
| §10 AI quota manager | `AIQuotaManager` | `Gemini.estimateTokens` + confirms | **Partial** | No session/monthly enforcement storage |
| §11 Master UI HTML | Replace entire task pane | Current `taskpane.html` (422 lines) | **Missing** as spec file | Literal swap drops Checks/Thesaurus/workflows |
| Scope 450k cap | Spec select option | `scope-reader.js` + `MAX_LOCAL_AUDIT_FULL` | **Exists** | Accurate ceiling for full manuscript audit |
| Local-first / optional Gemini | Stated in spec Help copy | Core product architecture | **Exists** | Aligns with [source-of-truth.md](/cursor/stores/bc-c637dae0-2bc1-49bd-901e-59f914e56545/docs/source-of-truth.md) |
| Settings persistence | Implied modal save | `settings-store.js` + document settings | **Exists** | Spec does not document dictionary/mute/localStorage split |
| Fiction modules (7) | Implied via narrative/audit | Checks tab toggles + `audit-engine.js` | **Exists** | Names match features doc, not spec tab names |

---

## 3. Suggested revisions to the master spec (prioritized)

### P0 — Clarify baseline (do first)

1. **Retitle metadata:** Change “Target Baseline: v3.0.0” to **“Target architecture: vNext (post-2.0.0.15)”** and add a **“Production baseline”** block: manifest + `PROZAEDIT_BUILD_VERSION` = **2.0.0.15**, live UI URL per source-of-truth.
2. **Add “As-built IA” diagram** mirroring real tabs (Target → Thesaurus → Checks → Audit → Coach → Rewrite → Help) and the workflow strip; label spec IA as **proposed vNext**, not current.
3. **§11 disclaimer:** Mark embedded HTML as **reference mockup**, not the authoritative task pane source; point implementers at `/workspace/src/taskpane/taskpane.html`.
4. **Cross-link** [prozaedit-features.md](/cursor/stores/bc-c637dae0-2bc1-49bd-901e-59f914e56545/docs/prozaedit-features.md) as the acceptance checklist for anything labeled “Exists” in §2 of this review.

### P1 — Rename tabs and map v1 → vNext (avoid coordinator confusion)

| Shipped tab (v2) | Spec tab (vNext) | Spec action |
|------------------|------------------|-------------|
| Target | Scope & Target | Rename in spec to **“Target (Scope & Profile)”** or keep **Target** as primary label |
| Thesaurus | *(absent)* | Add **“Retained: Thesaurus (v2)”** or explicit “Advanced / Simple mode” note |
| Checks | *(merged into Audit)* | Keep **Checks** as first-class tab in spec until vNext truly merges UX |
| Audit | Audit | Align naming; document finding-card parity |
| Coach | Coach | OK |
| Rewrite | Shaper | Map **Rewrite → Lexical Shaper (evolution)**; document mode migration (4 modes → 3 axes optional) |
| Help | Help | OK |
| *(fiction continuity)* | Narrative | Label **new tab** as additive; map to existing `mContinuity` / `mSpoiler` modules |

### P2 — Defer or narrow scope (implement after baseline doc fix)

- **Citation engine (§7) + Citations tab:** Defer until academic/legal manuscript types demand it; keep today’s citation hint.
- **ChronologyEngine DAG + entity store (§4):** Defer; extend existing `_continuity` / overview cast list first.
- **AIQuotaManager (§10):** Defer enforced ceilings; document current estimate + confirm pattern.
- **Full Fluent redesign (§1 + §11):** Defer big-bang CSS; evolve `taskpane.css` incrementally (wordmark + workflow strip are established beta UX).
- **Header token pill:** Defer global header; keep Coach/Rewrite estimates.

### P3 — Keep as future north star

- Zipf-based complexity axis and `lexical-banks.js` extraction.
- Bibliography reconciliation and Bluebook/APA/CMOS validators.
- Timeline UI with `paraIndex` navigation wired to `WordSafeNavigator`.
- Structured audit report sections including chronology export block.
- Dark mode Editorial Studio palette.
- Centralized tooltip registry with settings toggle.

### Version labeling (factual correction for spec metadata only)

| Label | Meaning | Where truth lives |
|-------|---------|-------------------|
| **2.0.0.14** | Shipped hosted build | `manifest.hosted.xml`, `PROZAEDIT_BUILD_VERSION` |
| **vNext / 3.x (draft)** | This master spec | Rename in spec header; do not imply users are on v3 |

*No change made to the master spec file in this review pass; corrections listed here for a follow-up edit.*

---

## 4. Risks if the spec is implemented literally (without phasing)

1. **Product regression / beta tester confusion:** Replacing IA per §11 removes **Checks**, **Thesaurus**, section/chapter loop, batch audit, heatmap builder, custom house style UI, and Copilot export paths documented in the features reference — all heavily used in the v2 workflow.
2. **Office.js performance and stability:** Full-manuscript reads at **450k** characters plus new paragraph walks for chronology DAG multiply `Word.run` batches; spec does not mention existing caps (1M body read for index, 15k paragraph stats cap, truncation cards) already handled in `taskpane.js` / `scope-reader.js`.
3. **Search / navigation fragility:** Entity-level findings with long excerpts still depend on **255-char sanitized search**; a standalone navigator module helps only if all cards respect the same rules as today’s `sanitizeSearch`.
4. **False-positive amplification:** Chronology entity checks (handedness, gender spoiler guards) and citation regexes will flag dialogue, unreliable narrators, and legal strings; v2 already relies on Mute/Dismiss — new engines need the same rule-id and density limits (`report-density.js`).
5. **Gemini scope creep:** Spec settings modal centralizes API key and model choice but omits v2 guardrails (Deep Audit confirm, large-prompt confirm). Literal `AIQuotaManager` without UX parity could either block power users or give a false sense of privacy if quotas are client-only.
6. **Manifest / hosting discipline:** A monolithic HTML swap does not bump version by itself, but any breaking UX for beta testers should follow source-of-truth: manifest semver only when re-upload required; avoid implying v3 registration.
7. **Platform parity:** `createDocument()` export already has fallback; spec assumes Word report export always opens new doc — must preserve `.txt` fallback behavior.

---

## 5. Recommended phasing roadmap (surgical, no-regression)

Aligned with [source-of-truth.md](/cursor/stores/bc-c637dae0-2bc1-49bd-901e-59f914e56545/docs/source-of-truth.md): smallest surface, verify in Word on the web after each phase.

### Phase 1 — Truth in documentation + extract existing patterns (low risk)

- Update master spec per **P0/P1** (baseline version, tab map, disclaimers on §11).
- Extract **`sanitizeSearch` / navigate / replace** into `word-safe-navigator.js` (or shared util) **without** UI changes; wire `taskpane.js` to use it.
- Optional: extract **`exportComprehensiveWordReport`** from inline `taskpane.js` to match §8 shape while keeping current report content (overview, cards, no timeline until Phase 3).
- **Verification:** Run audit, Apply fix, Go to, export report, undo stack — identical behavior.

### Phase 2 — UX polish on v2 IA (medium risk)

- Introduce **`tooltip-registry.js`** behind Target toggle (“Show hover tips”); migrate high-traffic controls (Run audit, scope, Checks toggles) from `title` to `data-pe-tip`.
- Incremental **CSS tokens** from Editorial Studio (primary indigo, card surfaces) applied in `taskpane.css`; keep wordmark and workflow strip.
- **Rewrite tab:** Add optional **3-axis preview** as an advanced panel *alongside* existing four modes (feature flag or “Advanced shaper” disclosure), backed initially by `local-rewrite.js` pipelines — not full Zipf engine yet.
- **Verification:** Simple mode still hides advanced blocks; fiction module gating unchanged (`adaptModules()`).

### Phase 3 — New engines as optional modules (higher risk, feature-flagged)

- **Narrative tab (additive):** New tab or Checks sub-panel; `ChronologyEngine` v1 = timeline list + audit findings merge into existing card pipeline (reuse filters/mute).
- **Citation engine:** Opt-in when manuscript type is Academic/Legal; findings as standard cards; no tab until accuracy validated on real briefs.
- **`AIQuotaManager`:** Session token ceiling optional in settings; default **off** to match v2 behavior.
- **IA consolidation (optional):** Only after parity checklist passes, consider merging Checks into Audit *if* user testing shows clarity — never remove Thesaurus without Simple-mode equivalent path.

---

## Appendix — Repo file inventory (`src/taskpane/`)

**Present on `main` (2.0.0.15):** `taskpane.html`, `taskpane.css`, `taskpane.js`, and **28** modules under `lib/` — including `word-safe-navigator.js`, `tooltip-registry.js`, `lexical-banks.js`, `lexical-shaper.js`, `chronology-engine.js`, `citation-engine.js`, `report-docx-export.js`, `ai-quota-manager.js`, `pe-icons.js`, `diagnostics-config.js`, `diagnostics-reporter.js`, plus the core audit/coach/rewrite stack (see [prozaedit-features.md §8](./prozaedit-features.md)).

**Still aspirational vs spec:** full DAG chronology UI, dedicated Citations/Narrative tabs, Zipf shaper v2, §11 HTML cutover, dark mode — tracked as vNext (~42%), not missing “Phase 1–7” modules.

---

*Review authored against repository checkout at `/workspace` and Project store docs; master spec file unchanged.*
