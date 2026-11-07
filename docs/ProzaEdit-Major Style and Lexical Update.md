# Context & Goal
We have just finalized `prozaedit-master-engine.js`, a highly optimized, vanilla ECMAScript 2020 master engine for the ProzaEdit (PE) Word Add-in. It features an O(1) Micro-POS tagger, length-preserving dialogue immunity, dynamic persona scaling, and a consolidated 4-lane heuristic pipeline (Correctness, Clarity, Consistency, Craft).

**Your Goal:** Make `prozaedit-master-engine.js` the pivotal centerpiece of the PE architecture for both Web and Desktop. You must carefully deprecate the old fragmented heuristic files, wire the new master engine into `taskpane.js`, and drastically streamline the UI to eliminate "checklist fatigue."

# Architectural Mandates & Guardrails
1. **Zero UI Breakage:** You must preserve all `id`, `data-pe-tip`, and `onclick` bindings in `taskpane.html` that relate to the onboarding tour, telemetry, or tooltip registry. 
2. **Data Structure Mapping:** The old `Audit.run()` returned `{ suggestions, metrics, score, traffic }`. The new `MasterEngine.AuditPipeline.audit()` returns `{ score, traffic, metrics, findings, summary }`. You must map `findings` to the existing `renderAuditCards()` function in `taskpane.js`. Note that findings now include a `.lane` property (Correctness, Clarity, Consistency, Craft).
3. **Performance Preservation:** The new master engine processes text in milliseconds. Ensure that the Word API (`Word.run`) text extraction in `taskpane.js` (`readScopeText`) remains chunked with `microYield()` to prevent freezing before passing the string to the master engine.

# Step-by-Step Execution Plan

Carefully execute the following phases in order. Do not proceed to the next phase until the current one is verified.

### Phase 1: File Deprecation & Cleanup
The master engine makes several legacy files obsolete. 
1. Remove references to the following files in `taskpane.html`'s `<script>` tags, and safely delete them from the project directory:
   - `style-guide-rules.js`
   - `editor-heuristics.js`
   - `proper-noun-analyse.js`
   - `genre-checks.js`
   - `lexical-banks.js`
   - `audit-engine.js` (The legacy version)
2. Ensure `prozaedit-master-engine.js` is correctly linked in `taskpane.html` before `taskpane.js`.

### Phase 2: UI Streamlining (Eliminating Checklist Fatigue)
The Master Engine autonomously handles rule gating based on the manuscript profile, rendering the granular toggles obsolete.
1. In `taskpane.html` (Tab 3: "Run"), **remove** the 15+ individual checkboxes for rules (e.g., `#chkRep`, `#chkProp`, `#chkSpell`, `#chkAI`, `#mPlot`, `#mMotivation`, etc.).
2. Replace them with a clean, centralized **"Run Master Audit"** CTA section. 
3. Retain the toggles *only* for external/secondary scans that require separate Word API passes: `Timeline Scan (Beta)` and `Citation Verify (Beta)`.

### Phase 3: Wiring `taskpane.js` to the Master Engine
1. Locate `runAuditInternalCore()` in `taskpane.js`. 
2. Replace the call to the old `ProzaEdit.Audit.runWithProgress()` with a synchronous call to `ProzaEdit.MasterEngine.AuditPipeline.audit(excerpt, options)`.
3. Build the `options` object passed to the engine by mapping the UI state:
   - `manuscriptType`: from UI dropdown.
   - `language`: from UI dropdown.
   - `criticPersona`: from UI dropdown.
   - `dictionary`: `ProzaEdit.Settings.getDictionary()` combined with any extracted proper nouns from the `ManuscriptContextIndex` (MCI).
   - `mutedRules`: `ProzaEdit.Settings.getMutedRules()`.
   - `reportDensity`: from UI dropdown.
4. Pass the resulting `findings` array into `finalizeAudit()` and update the UI traffic/score components using the new `summary` object.

### Phase 4: Coach & Filter Chip Integration
1. **Filter Chips:** Update the filter chips in `taskpane.html` and `taskpane.js` to align with the new 4-lane architecture. Change the filter states from `all`, `confirmed`, `preference`, `styleguide` to `All`, `Correctness`, `Clarity`, `Consistency`, and `Craft`. Map these to the `.lane` property of the findings.
2. **Local Coach:** In `sendLocalCoachMessage()`, update the logic so that if the user asks a diagnostic question, the coach reads `lastAuditResultForMode.summary.byLane` to provide a contextual summary (e.g., "ProzaEdit found 12 Clarity issues and 3 Consistency issues in this passage.").

### Phase 5: Verification & Edge Case Audit
Review your integration for the following edge cases:
- Confirm that `MutationUtils.alignCase` and `MutationUtils.extractAnchorContext` from the Master Engine are correctly integrated into `applyFix()` in `taskpane.js`.
- Ensure that the `isFiction` boolean logic correctly toggles narrative-only heuristics inside the master engine based on the `manuscriptType` passed from `taskpane.js`.

Please think step-by-step. Review the `prozaedit-master-engine.js` file thoroughly to understand its inputs and outputs before modifying `taskpane.js`. Output a summary of the exact variable mappings and HTML modifications you intend to make before writing the final code.