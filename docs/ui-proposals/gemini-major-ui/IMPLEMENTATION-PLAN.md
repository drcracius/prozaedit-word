# Gemini major UI — assessment & implementation plan

**Status:** Pass 1–3 merged incrementally into production `src/taskpane/*` in build **2.0.0.30**. Gemini artifacts stay reference-only.

**Baseline to branch from:** build **2.0.0.29** notes (pre-UI) then **2.0.0.30** layout.

**Working branch (recommended):** `cursor/pe-major-ui` off that tag.

---

## 1. What the proposal files are

| File | Lines (approx.) | Role |
| --- | --- | --- |
| `gemini-code-1793763465620.txt` | 6 | Three-pass intent summary (aesthetic → expandable → rail) |
| `gemini-code-1793763473228.html` | ~255 | Static shell: branding header, stepper pills, partial tabs, utility rail |
| `gemini-code-1793763483538.css` | ~500+ | New blue/teal palette, cards, pills, shadows; **Google Fonts** (Lora + Plus Jakarta Sans) |
| `gemini-code-1793763494612.js` | ~355 | **Mock** logic: fake audit HTML, `alert()`, `window.print()` export, wrong tab ids |

Production today: `taskpane.html` + `taskpane.js` (thousands of lines) + **28+** `lib/*` modules (audit engine, apply/undo, onboarding, settings modal, seven tabs, etc.). The mock covers a fraction of that surface.

---

## 2. Assessment (keep / adapt / skip)

### Keep as design direction

- **Compact header** with wordmark + high-value actions (Run report, undo/redo where already supported).
- **Pill stepper** for workflow (Target → Checks → Run → Fix) aligned with existing `WorkflowNav` — visual refresh, not new routes.
- **Card clusters** with caret expand/collapse for audit sections and findings (matches user goal: Grammarly/PWA-style density without copying competitors).
- **Micro-badges** for scope/style guide/word count (reuse existing scope status line + audit overview).
- **Toggle-style controls** where we already use checkboxes in Settings (CSS only; keep native inputs for a11y).

### Adapt before merge

- **Colors:** Mock uses a new blue/teal stack. Merge into existing **`--pe-*` tokens** in `taskpane.css` and `[data-pe-theme="dark"]` per [pe-ui-design-notes.md](../../pe-ui-design-notes.md) and [DESIGN-SYSTEM-BETA.md](../../DESIGN-SYSTEM-BETA.md) — do not fork a second palette.
- **Class names:** Rename mock `pwa-*` → `pe-*` (or reuse existing audit card classes). Never ship `pwa-` in production.
- **Typography:** Mock loads **Google Fonts**. PE policy is **Segoe-first, offline-safe** ([TYPOGRAPHY-AND-FONTS.md](../../TYPOGRAPHY-AND-FONTS.md)). Optional serif for headings = system stack (Georgia / Cambria) unless manifest AppDomains are explicitly expanded.
- **Icons:** Prefer existing `pe-icons.js` + inline SVG patterns already in the pane; do not depend on mock-only SVG snippets without wiring check.
- **“Run Audit” copy:** Production already uses **Run report** / **Report finished** (2.0.0.29). Mock strings are stale.

### Skip or defer

- **`exportToPDF()` / `window.print()`** as primary “export” — not wired to real report HTML or user expectations; defer until a defined export spec exists (or keep Help/diagnostics export if any).
- **Replacing `taskpane.js` handlers** (`runProzaEditAudit`, `showTab('tab1')`, etc.) — names and DOM ids do not match production wiring gate.
- **Right utility rail** on very narrow Word web panes — prototype only; gate on minimum width (measure in Word Desktop + Word on the web; see typography doc pane width notes).
- **Mock audit content** (scores, fake cards) — discard; keep `renderAuditCards` / real severity tokens.

---

## 3. Three-pass implementation plan (production)

Each pass: small PR-sized slices, `npm test`, `verify:wiring`, `check:contrast`, version bump only when shipping to `main`.

### Pass 1 — Aesthetic (tokens, header, density)

**Goal:** Look and feel upgrade without behavior changes.

1. Extend `taskpane.css`: shadows, radius, card surfaces from mock **mapped to `--pe-*`**; preserve semantic colors (severity vs workflow vs primary).
2. Optional **branding header** row above existing sticky toolbar (or fold into toolbar) — no duplicate Run report buttons.
3. Settings: style existing `<details class="pe-settings-group">` toggles to match mock switches (visually).
4. Run contrast script; fix any regressions on dark theme.
5. **Tests:** wiring gate only unless new DOM ids added (register in HTML + handlers).

**Exit criteria:** Same flows as 2.0.0.29; screenshots acceptable on Desktop + web pane.

### Pass 2 — Expandable sections (audit & hubs)

**Goal:** Collapsible report sections and finding cards.

1. Audit overview / category blocks: `<details>` or button+chevron pattern consistent with Settings groups.
2. Wire chevrons via `pe-icons.js` (partial work may exist in working tree — complete consistently).
3. Ensure keyboard and screen-reader labels (`aria-expanded`, focus order) on new toggles.
4. **Tests:** extend `taskpane-behavior.test.mjs` or audit render tests for collapsed default + expand.

**Exit criteria:** Large audits scannable; Apply/undo/dismiss unchanged.

### Pass 3 — Layout & rail (optional)

**Goal:** High-density badges + contextual shortcuts.

1. Overhead badge row (guide, scope, counts) — single line under header/stepper.
2. **Utility rail:** only if `@media (min-width: …)` or JS width probe says pane ≥ ~360px usable; otherwise hide rail and keep footer tabs.
3. Reconcile with **seven-tab** model (Chat, Dictionary, etc.) — rail is shortcuts, not a second nav tree.

**Exit criteria:** No horizontal scroll; no clipped CTAs on minimum supported width.

---

## 4. Changes needed to the proposal folder itself

| Item | Action |
| --- | --- |
| Gemini HTML/CSS/JS | **Leave as-is** (historical reference). Optional: add header comment “mock — do not deploy”. |
| `README.md` | Point to this plan. |
| Production `src/taskpane/*` | **No change until Pass 1 branch.** |

No edits to the four Gemini artifacts are required for the repo to be valid; clarity lives in this plan + README.

---

## 5. Pre-flight before Pass 1

- [ ] Owner: commit **2.0.0.29** baseline + tag `pe-pre-major-ui-2.0.0.29`.
- [ ] Create branch `cursor/pe-major-ui`.
- [ ] Skim [pe-ui-design-notes.md](../../pe-ui-design-notes.md) and [DESIGN-SYSTEM-BETA.md](../../DESIGN-SYSTEM-BETA.md) with mock open side-by-side.
- [ ] One manual smoke: Run report, expand Settings, dark mode toggle.

---

## 6. Out of scope for this overhaul

- New AI providers, audit rules, or manifest version for fonts/CDN.
- Competitor naming or external style guide imports from the mock copy.
- Replacing GitHub Pages layout or install scripts.
