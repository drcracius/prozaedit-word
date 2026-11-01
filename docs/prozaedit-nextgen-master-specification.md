# ProzaEdit Next-Gen Architecture, UI/UX & Engine Specification
**Target architecture**: vNext (post-2.0.0.15 shipped baseline)  
**Target Environment**: Microsoft Word (Web, Windows Desktop, macOS M365) via Office.js  
**Execution Paradigm**: Local-First, 0-Token Deterministic Heuristics + Optional Secure Tier-1 LLM

### Production baseline (shipped on `main`)

| Item | Source of truth |
|------|-----------------|
| Hosted manifest `<Version>` | **2.0.0.15** — `manifest.hosted.xml` |
| Task pane build label | **2.0.0.15** — `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` (must match manifest) |
| Live UI (GitHub Pages) | https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html |
| Acceptance checklist | [prozaedit-features.md](prozaedit-features.md) — verify anything labeled **Exists** below against this reference |

### Module status (major areas vs production 2.0.0.14)

| Spec module / area | Status | Notes |
|--------------------|--------|-------|
| §1 Editorial Studio design language | **Partial** | Shipped `taskpane.css` + wordmark; no full dark-mode token system |
| §2 Footer (Undo, Redo, Run Audit) | **Exists** | Sticky toolbar; 40-step undo in `edit-history.js` |
| §2 **Target** (scope, profile, style, dictionary) | **Partial** | Richer on production **Target** tab than this spec’s slim Scope mock |
| §2 **Thesaurus** (Datamuse) | **Exists** | Production tab; retain in vNext IA (see mapping below) |
| §2 **Checks** (modules, extended pass, heatmap) | **Exists** | Production tab; keep first-class in spec until vNext merges UX into Audit |
| §2 **Audit** (cards, export, filters) | **Exists** | Parity target for finding-card pipeline |
| §2 **Coach** (LocalCoach + optional Gemini) | **Exists** | |
| §2 **Rewrite** (four local modes) | **Exists** | vNext **Shaper** (§5) is an evolution, not a drop-in replacement |
| §2 **Help** | **Exists** | Shipped help is more operational (install, updates) |
| §2 **Narrative / timeline tab** | **Missing** (UI) / **Partial** (rules) | Fiction continuity/spoiler heuristics live in `audit-engine.js` today |
| §2 **Citations tab** | **Missing** | Academic citation **hint** in audit only |
| §3 Tooltip registry | **Missing** | Some native `title` attributes on controls |
| §4 Chronology engine (DAG) | **Partial** | `_continuity()` / spoiler phrases; no timeline UI |
| §5 Lexical shaper (3-axis / Zipf) | **Partial** | `local-rewrite.js` pipelines today |
| §6 Lexical banks (extracted module) | **Partial** | Lists embedded in audit/rewrite/heuristics |
| §7 Citation engine | **Missing** | |
| §8 Word report export | **Partial** | `createDocument()` + `.txt` fallback in `taskpane.js` |
| §9 Word-safe navigator | **Partial** | `sanitizeSearch()` in `taskpane.js` |
| §10 AI quota manager | **Partial** | `gemini-client.js` estimate + confirm dialogs |
| §11 Master UI HTML block | **vNext** | Reference mockup only — not production source (see disclaimer before §11) |

Legend: **Exists** = shipped behavior or equivalent; **Partial** = subset or different UX; **Missing** = not in repo as specified; **vNext** = aspirational target in this document.

---

## 1. Executive Summary & Aesthetic Design Language

ProzaEdit is an enterprise-grade editorial coprocessor built for long-form authors, legal scholars, academics, and professional editors. To elevate ProzaEdit to a **best-in-class** Office add-in, the UI/UX shifts away from standard utilitarian web-forms to a modern, typography-driven Microsoft Fluent 2 interface designed to feel natively integrated with Word.

### Design System: "Editorial Studio"
* **Palette**:
  * Surface: Canvas Neutral (`#FBFBFD` light, `#1C1C1E` dark)
  * Elevated Containers: `#FFFFFF` / `#2C2C2E`
  * Primary Accent: Editorial Oxford Indigo (`#1E3A8A` light, `#60A5FA` dark)
  * Secondary / Signals: Sage Green (`#047857` Pass/Clean), Amber (`#B45309` Style/Pref), Crimson (`#B91C1C` Critical/Error), Plum (`#6B21A8` Fiction/Narrative)
* **Typography**: Word-native Fluent stack (`Segoe UI`, `-apple-system`, `BlinkMacSystemFont`, `Roboto`, sans-serif) with monospace numerical alignments (`Segoe UI Variable Text`, `tabular-nums`) for word counts, FK metrics, and token tallies.
* **Layout Geometry**: Fixed header with micro-metric pills, scrollable dynamic workspace viewport, persistent 4-action utility footer (Undo, Redo, Quick Audit, Settings Gear).
* **Motion & Feel**: Zero layout shifts (CLS < 0.01), silky 150ms transitions on state toggles, and zero blocking of the Word main rendering thread via debounced asynchronous Office.js batches.

---

## 2. Structural IA: Workspace & Modal Topology

### As-built IA (production v2.0.0.14)

Authoritative layout: **`src/taskpane/taskpane.html`** on `main`. Quick-start workflow strip plus seven primary tabs.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Wordmark header — build label from PROZAEDIT_BUILD_VERSION]          │
├────────────────────────────────────────────────────────────────────────┤
│  Workflow:  (1) Target → (2) Checks → (3) Run audit → (4) Fix cards   │
├────────────────────────────────────────────────────────────────────────┤
│  [Target] [Thesaurus] [Checks] [Audit] [Coach] [Rewrite] [Help]        │
├────────────────────────────────────────────────────────────────────────┤
│                      DYNAMIC WORKSPACE VIEWPORT                        │
│  Target — profile, scope modes, style guide, dictionary, safety        │
│  Thesaurus — Datamuse lookup (hidden in Simple mode)                   │
│  Checks — fiction modules, extended pass, section/chapter loop, heatmap│
│  Audit — finding cards, apply/mute, exports, overview                   │
│  Coach — LocalCoach + optional Gemini                                  │
│  Rewrite — Fluency / Formal / Creative / Academic (`local-rewrite.js`)│
│  Help — install, updates, platform notes                               │
├────────────────────────────────────────────────────────────────────────┤
│  [↶ Undo] [↷ Redo]           Status: Ready            [⚡ Run Audit]   │
└────────────────────────────────────────────────────────────────────────┘
```

Persona, scope, style, and safety settings live on **Target** (no separate settings modal in production).

### v2.0.0.14 → vNext tab mapping

| Shipped tab (v2.0.0.14) | vNext label in this spec | Spec action |
|-------------------------|--------------------------|-------------|
| **Target** | Target (Scope & Profile) | Keep **Target** as primary label; spec mock may say “Scope & Profile” for genre/tone subset |
| **Thesaurus** | *(retained from v2)* | **Retained: Thesaurus (v2)** — do not drop without Simple-mode equivalent |
| **Checks** | Checks & Engine | Keep **Checks** first-class until vNext truly merges module toggles into Audit UX |
| **Audit** | Audit & Finding Cards | Align finding-card parity with production |
| **Coach** | Coach | OK |
| **Rewrite** | Lexical Shaper | **Rewrite → Shaper (evolution)** — optional 3-axis panel alongside four rewrite modes |
| **Help** | Help | OK |
| *(fiction continuity rules)* | **Narrative** (new tab) | **Additive** — maps to existing `mContinuity` / `mSpoiler` modules in `audit-engine.js` |
| *(citation hint in audit)* | **Citations** (new tab) | **vNext** — full Bluebook/APA engine deferred; hint remains until then |

### Proposed vNext (this spec — not shipped)

The interface below is a **target topology** for phased delivery. It divides primary workflow tabs from configuration settings. Runtime controls remain on the task pane; persistent project preferences may move to a flyout modal in vNext.

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Logo] ProzaEdit (vNext mock — not production version)                │
│         [Scope: Ch. 12 ▼]   [Tokens: 0]   [⚙ Settings]                 │
├────────────────────────────────────────────────────────────────────────┤
│ [Target][Thesaurus*][Checks][Narrative][Audit][Shaper][Citation][Coach][Help] │
│  *Thesaurus retained from v2                                           │
├────────────────────────────────────────────────────────────────────────┤
│                      DYNAMIC WORKSPACE VIEWPORT                        │
│  - Target (Scope & Profile): manuscript type, tone, active targets     │
│  - Thesaurus: Datamuse (retained v2 capability)                        │
│  - Checks & Engine: module selection, deep pass toggles (until merged) │
│  - Narrative & Chronology: DAG timeline, cast, spoilers (additive)   │
│  - Audit & Finding Cards: filters, go-to, apply, Word export           │
│  - Lexical Shaper: 3-axis modifier (evolution of Rewrite tab)          │
│  - Citations & Authorities: Bluebook, CMOS, APA (vNext)                │
│  - Coach & Dynamic Guides: local contextual assistant                  │
│  - Help: quick reference (operational copy may match v2 Help)          │
├────────────────────────────────────────────────────────────────────────┤
│  [↶ Undo] [↷ Redo]           Status: Ready            [⚡ Run Audit]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Tooltip & Contextual Guidance Engine (`tooltip-registry.js`)

To guarantee immediate clarity for novice writers while keeping the screen uncluttered for power users, every interactive UI control binds to a centralized tooltip dictionary.

```javascript
/**
 * tooltip-registry.js
 * Centralized registry of hover micro-copy with instant keyboard/mouse listeners.
 */
export const TOOLTIP_REGISTRY = {
  // Global Actions
  "btn-run-audit": "Executes local deterministic heuristics across scoped text. Will not alter manuscript.",
  "btn-undo": "Reverses the last replacement made by ProzaEdit (maintains an isolated 40-step stack).",
  "btn-redo": "Restores the previously undone ProzaEdit edit.",
  "btn-open-settings": "Configure critic persona, AI endpoints, dictionary, and persistent preferences.",

  // Scope & Tone
  "sel-manuscript-scope": "Define boundary for reading text. Full manuscript reads up to 450k characters.",
  "sel-scene-tone": "Enforces tonal vocabulary and rhythm matching (e.g., Tense sentences stay staccato).",
  "input-tone-custom": "Specify a custom mood descriptor (e.g., 'Gothic', 'Whimsical', 'Claustrophobic').",

  // Narrative & Chronology
  "btn-scan-chronology": "Parses temporal anchors ('later that night', 'in 1994') to plot sequence and detect anachronisms.",
  "sel-chronology-depth": "Macro: Chapter-level. Meso: Scene dividers (***). Micro: Individual character events.",
  "btn-spoiler-guard": "Checks character aliases and reveals against target chapters to prevent premature disclosure.",

  // Lexical Shaper
  "slider-complexity": "Adjusts vocabulary register from elementary (Zipf >= 4.5) to sophisticated literary (Zipf <= 3.2).",
  "slider-intensity": "Replaces weak modifier-verb pairs with vivid action verbs and punchy descriptors.",
  "slider-density": "Calibrates the frequency of adjectives and adverbs per 100 verbs/nouns.",

  // Citations
  "sel-citation-style": "Validates citation patterns against formal legal or academic stylebook specifications.",
  "btn-audit-biblio": "Performs bidirectional check between in-text citations and end-of-document bibliography."
};

/**
 * Initializes tooltip listeners across the DOM.
 * @param {boolean} enabled - True if tooltips should display.
 */
export function initTooltips(enabled) {
  const elements = document.querySelectorAll("[data-pe-tip]");
  elements.forEach((el) => {
    // Clean old listeners
    el.removeAttribute("title"); // Remove native browser tooltip
    if (!enabled) return;

    el.addEventListener("mouseenter", showTooltip);
    el.addEventListener("mouseleave", hideTooltip);
    el.addEventListener("focus", showTooltip);
    el.addEventListener("blur", hideTooltip);
  });
}

let activeTooltipEl = null;

function showTooltip(e) {
  const key = e.currentTarget.getAttribute("data-pe-tip");
  const text = TOOLTIP_REGISTRY[key];
  if (!text) return;

  hideTooltip();

  const bubble = document.createElement("div");
  bubble.className = "pe-tooltip-bubble";
  bubble.setAttribute("role", "tooltip");
  bubble.textContent = text;
  document.body.appendChild(bubble);

  const rect = e.currentTarget.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();

  // Position: Preferred top, fallback bottom
  let top = rect.top - bubbleRect.height - 8;
  let left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);

  // Viewport containment
  if (top < 4) top = rect.bottom + 8;
  if (left < 6) left = 6;
  if (left + bubbleRect.width > window.innerWidth - 6) {
    left = window.innerWidth - bubbleRect.width - 6;
  }

  bubble.style.top = `${top}px`;
  bubble.style.left = `${left}px`;
  bubble.classList.add("pe-tooltip-visible");
  activeTooltipEl = bubble;
}

function hideTooltip() {
  if (activeTooltipEl && activeTooltipEl.parentNode) {
    activeTooltipEl.parentNode.removeChild(activeTooltipEl);
  }
  activeTooltipEl = null;
}
```

---

## 4. Narrative, Consistency & Chronology Engine (`chronology-engine.js`)

This module addresses character attributes, backstory, and temporal paradoxes by modeling events as a Directed Acyclic Graph (DAG) and linking each node directly to Word paragraph coordinates.

```javascript
/**
 * chronology-engine.js
 * Scans temporal markers, builds narrative chronology, and flags narrative contradictions.
 */

export class ChronologyEngine {
  constructor(entityStore) {
    this.entityStore = entityStore || { characters: {}, reveals: [] };
    this.temporalMarkers = [
      { pattern: /\b(?:the\s+next|the\s+following)\s+(?:day|morning|afternoon|night|week|month|year)\b/gi, type: "RELATIVE_FORWARD" },
      { pattern: /\b(?:two|three|four|five|six|seven|several|few)\s+(?:hours|days|weeks|months|years)\s+(?:earlier|prior|before)\b/gi, type: "FLASHBACK" },
      { pattern: /\b(?:at\s+dawn|at\s+dusk|at\s+midnight|high\s+noon|by\s+sunrise)\b/gi, type: "CLOCK_ANCHOR" },
      { pattern: /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:morning|afternoon|evening|night)\b/gi, type: "DAY_ANCHOR" }
    ];
  }

  /**
   * Evaluates text for chronological sequencing and entity consistency.
   * @param {Array<{index: number, text: string, headingLevel: number}>} paragraphs
   * @param {string} granularity - "macro" | "meso" | "micro"
   * @returns {Object} Chronology timeline and audit finding cards.
   */
  analyze(paragraphs, granularity = "meso") {
    const timeline = [];
    const findings = [];
    let currentChapter = "Prologue / Front Matter";
    let currentScene = 1;
    let sequenceCounter = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const trimmed = p.text.trim();
      if (!trimmed) continue;

      // Track Chapter Headings
      if (p.headingLevel > 0) {
        currentChapter = trimmed;
        currentScene = 1;
        timeline.push({
          id: `node_${sequenceCounter++}`,
          label: currentChapter,
          type: "CHAPTER",
          paraIndex: p.index,
          excerpt: trimmed.substring(0, 100)
        });
        continue;
      }

      // Track Scene Dividers (***, ---, ###)
      if (/^(\*\s*\*\s*\*|---|#{3,})$/.test(trimmed)) {
        currentScene++;
        if (granularity !== "macro") {
          timeline.push({
            id: `node_${sequenceCounter++}`,
            label: `${currentChapter} — Scene ${currentScene}`,
            type: "SCENE",
            paraIndex: p.index,
            excerpt: "--- Scene Break ---"
          });
        }
        continue;
      }

      // Temporal Marker Extraction (Meso & Micro)
      if (granularity === "micro" || granularity === "meso") {
        for (const marker of this.temporalMarkers) {
          marker.pattern.lastIndex = 0;
          let match;
          while ((match = marker.pattern.exec(trimmed)) !== null) {
            timeline.push({
              id: `node_${sequenceCounter++}`,
              label: match[0],
              type: marker.type,
              paraIndex: p.index,
              excerpt: trimmed.substring(Math.max(0, match.index - 30), Math.min(trimmed.length, match.index + 70))
            });
          }
        }
      }

      // Character & Backstory Cross-Examination
      this.auditEntityConsistency(trimmed, p.index, findings);
    }

    return { timeline, findings };
  }

  /**
   * Cross-examines character attributes and gender disclosure rules.
   */
  auditEntityConsistency(paraText, paraIndex, findings) {
    const characters = this.entityStore.characters || {};
    const reveals = this.entityStore.reveals || [];

    for (const [id, char] of Object.entries(characters)) {
      const nameRegex = new RegExp(`\\b(${[char.canonicalName, ...(char.aliases || [])].join("|")})\\b`, "i");
      if (!nameRegex.test(paraText)) continue;

      // Attribute Check: Handedness
      if (char.dominantHand) {
        const opposingHand = char.dominantHand.toLowerCase() === "left" ? "right" : "left";
        const handCheck = new RegExp(`\\b${char.canonicalName}\\b[^.?!]{0,60}\\b(with\\s+his|with\\s+her|with\\s+their)\\s+${opposingHand}\\s+hand\\b`, "i");
        if (handCheck.test(paraText)) {
          findings.push({
            id: `entity_err_${paraIndex}`,
            type: "confirmed",
            severity: "critical",
            module: "Continuity",
            target: char.canonicalName,
            paraIndex: paraIndex,
            message: `Physical Inconsistency: ${char.canonicalName} is cataloged as ${char.dominantHand}-handed, but is described using their ${opposingHand} hand.`
          });
        }
      }

      // Spoiler & Premature Reveal Guard
      const activeReveal = reveals.find(r => r.entityId === id);
      if (activeReveal && !activeReveal.isRevealed) {
        // Gender Leak Guard
        if (activeReveal.concealGender) {
          const genderLeak = /\b(he|him|his|she|her|hers)\b/i.exec(paraText);
          if (genderLeak) {
            findings.push({
              id: `spoiler_leak_${paraIndex}`,
              type: "confirmed",
              severity: "critical",
              module: "Spoiler Guard",
              target: genderLeak[0],
              paraIndex: paraIndex,
              message: `Spoiler Leak: Gender pronoun '${genderLeak[0]}' used for masked character '${char.canonicalName}' before designated reveal in ${activeReveal.targetLocation}.`
            });
          }
        }
      }
    }
  }
}
```

---

## 5. Adjective & Adverb Shaper (`lexical-shaper.js`)

The 3-Axis Lexical Shaper calibrates text along Complexity, Intensity, and Density vectors without disturbing core story actions.

```javascript
/**
 * lexical-shaper.js
 * 3-Axis Modifier Calibrator: Complexity, Intensity, and Density.
 */
import { VIVID_VERB_MAP, MODIFIER_TIERS, TRANSITIONS_MAP } from "./lexical-banks.js";

export class LexicalShaper {
  /**
   * Transforms passage according to three calibration vectors.
   * @param {string} text - User selection
   * @param {{complexity: number, intensity: number, density: number}} settings - Scaled 1 to 5
   * @returns {{transformedText: string, changesCount: number, suggestions: Array<Object>}}
   */
  shapeText(text, settings) {
    let result = text;
    const suggestions = [];
    let changesCount = 0;

    // AXIS 1: INTENSITY (Weak Modifier + Verb -> Vivid Action Verb)
    if (settings.intensity >= 3) {
      for (const [weakPhrase, strongVerb] of Object.entries(VIVID_VERB_MAP)) {
        const regex = new RegExp(`\\b${weakPhrase}\\b`, "gi");
        if (regex.test(result)) {
          result = result.replace(regex, (match) => {
            changesCount++;
            suggestions.push({
              original: match,
              replacement: strongVerb,
              axis: "Intensity",
              reason: "Upgrades weak adverb-verb pairing into a high-impact action verb."
            });
            // Match casing
            return match[0] === match[0].toUpperCase()
              ? strongVerb.charAt(0).toUpperCase() + strongVerb.slice(1)
              : strongVerb;
          });
        }
      }
    }

    // AXIS 2: COMPLEXITY (Zipf Frequency Substitution)
    // Complexity 1-2: Replace sophisticated words with simple equivalents
    // Complexity 4-5: Offer elevated literary alternatives
    if (settings.complexity <= 2) {
      for (const item of MODIFIER_TIERS.literaryToSimple) {
        const regex = new RegExp(`\\b${item.literary}\\b`, "gi");
        if (regex.test(result)) {
          result = result.replace(regex, item.simple);
          changesCount++;
          suggestions.push({
            original: item.literary,
            replacement: item.simple,
            axis: "Complexity",
            reason: "Accessible register: Replaces rare literary term with clear alternative."
          });
        }
      }
    } else if (settings.complexity >= 4) {
      for (const item of MODIFIER_TIERS.simpleToLiterary) {
        const regex = new RegExp(`\\b${item.simple}\\b`, "gi");
        if (regex.test(result)) {
          result = result.replace(regex, item.literary);
          changesCount++;
          suggestions.push({
            original: item.simple,
            replacement: item.literary,
            axis: "Complexity",
            reason: "Literary register: Elevates common descriptor."
          });
        }
      }
    }

    // AXIS 3: DENSITY (Prune Decorative Fillers if Density is Low)
    if (settings.density <= 2) {
      const fillers = ["very", "really", "quite", "somewhat", "rather", "extremely", "totally", "utterly"];
      for (const filler of fillers) {
        const regex = new RegExp(`\\b${filler}\\s+`, "gi");
        if (regex.test(result)) {
          result = result.replace(regex, "");
          changesCount++;
          suggestions.push({
            original: filler,
            replacement: "[Deleted]",
            axis: "Density",
            reason: "Pruned decorative modifier to streamline narrative cadence."
          });
        }
      }
    }

    return { transformedText: result, changesCount, suggestions };
  }
}
```

---

## 6. Curated Lexical Reference Banks (`lexical-banks.js`)

```javascript
/**
 * lexical-banks.js
 * High-performance offline lookup tables for vivid verbs, modifiers, and transitions.
 */

export const VIVID_VERB_MAP = {
  "walked slowly": "ambled",
  "walked quietly": "crept",
  "ran quickly": "sprinted",
  "shouted loudly": "bellowed",
  "looked closely": "scrutinized",
  "shone brightly": "blazed",
  "ate hungrily": "devoured",
  "spoke softly": "murmured",
  "breathed heavily": "gasped",
  "closed forcefully": "slammed",
  "held tightly": "clasped",
  "moved hesitantly": "faltered"
};

export const MODIFIER_TIERS = {
  literaryToSimple: [
    { literary: "effulgent", simple: "radiant" },
    { literary: "perspicacious", simple: "insightful" },
    { literary: "ebullient", simple: "cheerful" },
    { literary: "tenebrific", simple: "gloomy" },
    { literary: "inimical", simple: "hostile" },
    { literary: "pulchritudinous", simple: "beautiful" }
  ],
  simpleToLiterary: [
    { simple: "clear", literary: "lucid" },
    { simple: "dark", literary: "somber" },
    { simple: "tired", literary: "enervated" },
    { simple: "noisy", literary: "cacophonous" },
    { simple: "stubborn", literary: "intransigent" },
    { simple: "brief", literary: "ephemeral" }
  ]
};

export const TRANSITIONS_MAP = {
  adversative: ["nevertheless", "conversely", "notwithstanding", "on the contrary"],
  causal: ["consequently", "accordingly", "inevitably", "for this reason"],
  sequential: ["subsequently", "thereupon", "prior to this", "simultaneously"]
};
```

---

## 7. Citation & Academic Authority Engine (`citation-engine.js`)

Validates in-text parentheticals, legal citations, and performs reconciliation against document bibliography collections.

```javascript
/**
 * citation-engine.js
 * Multi-standard citation validation: Bluebook, Chicago (CMOS), and APA 7th.
 */

export class CitationEngine {
  constructor(style = "APA") {
    this.style = style; // "BLUEBOOK" | "APA" | "CHICAGO"
  }

  /**
   * Scans text for citations and validates against style guidelines.
   * @param {string} fullText
   * @returns {{inTextCitations: Array<Object>, findings: Array<Object>}}
   */
  auditCitations(fullText) {
    const findings = [];
    const inTextCitations = [];

    if (this.style === "BLUEBOOK") {
      this.auditBluebook(fullText, inTextCitations, findings);
    } else if (this.style === "APA") {
      this.auditAPA(fullText, inTextCitations, findings);
    } else if (this.style === "CHICAGO") {
      this.auditChicago(fullText, inTextCitations, findings);
    }

    return { inTextCitations, findings };
  }

  auditBluebook(text, citations, findings) {
    // Matches federal/state reporters: e.g., 410 U.S. 113, 504 F.3d 320
    const reporterRegex = /\b(\d+)\s+([A-Z][A-Za-z\.\d\s]+?)\s+(\d+)(?:,\s*(\d+))?\s*\((?:([A-Za-z0-9\.\s]+?)\s+)?(\d{4})\)/g;
    let match;
    while ((match = reporterRegex.exec(text)) !== null) {
      citations.push({
        raw: match[0],
        volume: match[1],
        reporter: match[2].trim(),
        page: match[3],
        pinpoint: match[4] || null,
        court: match[5] || null,
        year: match[6],
        index: match.index
      });
    }

    // Check: Capitalization of 'id.' vs 'Id.'
    const lowerIdRegex = /(?<=[.?!]\s+)id\.\b/g;
    while ((match = lowerIdRegex.exec(text)) !== null) {
      findings.push({
        id: `bb_id_${match.index}`,
        type: "confirmed",
        severity: "critical",
        module: "Citation (Bluebook)",
        target: "id.",
        message: "Bluebook Rule 4.1: 'Id.' must be capitalized when beginning a citation sentence."
      });
    }
  }

  auditAPA(text, citations, findings) {
    // Parenthetical citation: (Author, 2021) or (Author & Author, 2021, p. 45)
    const apaRegex = /\(([A-Z][A-Za-z\s\-]+(?:,\s*(?:[A-Z][A-Za-z\s\-]+|&\s*[A-Z][A-Za-z\s\-]+|et\s*al\.))*),\s*(\d{4})(?:,\s*p{1,2}\.\s*(\d+(?:-\d+)?))?\)/g;
    let match;
    while ((match = apaRegex.exec(text)) !== null) {
      const authors = match[1];
      citations.push({
        raw: match[0],
        authors: authors,
        year: match[2],
        page: match[3] || null,
        index: match.index
      });

      // APA Check: Disallow "and" inside parentheses (must use "&")
      if (/\band\b/i.test(authors)) {
        findings.push({
          id: `apa_amp_${match.index}`,
          type: "confirmed",
          severity: "critical",
          module: "Citation (APA 7th)",
          target: match[0],
          message: "APA 7th Rule 8.11: Use an ampersand (&) rather than 'and' inside parenthetical author lists."
        });
      }
    }
  }

  auditChicago(text, citations, findings) {
    // Validates CMOS note references or author-date citations
    const cmosParenthetical = /\(([A-Z][A-Za-z\-]+)\s+(\d{4})(?:,\s*(\d+))?\)/g;
    let match;
    while ((match = cmosParenthetical.exec(text)) !== null) {
      citations.push({
        raw: match[0],
        author: match[1],
        year: match[2],
        page: match[3] || null,
        index: match.index
      });
    }
  }

  /**
   * Reconciles in-text citations against an extracted bibliography array.
   */
  reconcileBibliography(inTextCitations, bibliographyEntries) {
    const findings = [];
    const citedAuthors = new Set();

    inTextCitations.forEach(c => {
      const primaryAuthor = (c.authors || c.author || "").split(/[,&]/)[0].trim();
      if (primaryAuthor) citedAuthors.add(primaryAuthor.toLowerCase());
    });

    const bibAuthors = new Set();
    bibliographyEntries.forEach(b => {
      const match = /^([A-Z][A-Za-z\-]+)/.exec(b.text.trim());
      if (match) bibAuthors.add(match[1].toLowerCase());
    });

    // Check for missing citations in bibliography
    citedAuthors.forEach(author => {
      if (!bibAuthors.has(author)) {
        findings.push({
          id: `bib_missing_${author}`,
          type: "confirmed",
          severity: "critical",
          module: "Bibliography Audit",
          target: author,
          message: `In-text citation for '${author}' has no matching entry in the bibliography/references section.`
        });
      }
    });

    return findings;
  }
}
```

---

## 8. Native Word Document Report Exporter (`report-docx-export.js`)

Replaces raw text file downloads with native `.docx` document generation via `context.application.createDocument()`.

```javascript
/**
 * report-docx-export.js
 * Generates structured, publication-grade Word audit reports.
 */

export async function exportComprehensiveWordReport(reportData) {
  return Word.run(async (context) => {
    const newDoc = context.application.createDocument();
    const body = newDoc.body;

    // Title
    const titlePara = body.insertParagraph("ProzaEdit — Manuscript Audit Report", Word.InsertLocation.end);
    titlePara.styleBuiltIn = Word.Style.title;

    // Metadata Subtitle
    const metaPara = body.insertParagraph(
      `Generated: ${new Date().toLocaleDateString()} | Scope: ${reportData.scope} | Score: ${reportData.score}/10 (${reportData.persona})`,
      Word.InsertLocation.end
    );
    metaPara.styleBuiltIn = Word.Style.subtitle;

    // Executive Summary Section
    const h1Summary = body.insertParagraph("Executive Summary", Word.InsertLocation.end);
    h1Summary.styleBuiltIn = Word.Style.heading1;

    body.insertParagraph(
      `Word Count: ${reportData.wordCount.toLocaleString()} | Reading Ease: ${reportData.fleschEase} | FK Grade: ${reportData.fkGrade}`,
      Word.InsertLocation.end
    );
    body.insertParagraph(
      `Critical Flags: ${reportData.criticalCount} | Preference Flags: ${reportData.preferenceCount}`,
      Word.InsertLocation.end
    );

    // Finding Cards Section
    const h1Findings = body.insertParagraph("Audit Findings & Action Items", Word.InsertLocation.end);
    h1Findings.styleBuiltIn = Word.Style.heading1;

    for (const card of reportData.cards) {
      const cardPara = body.insertParagraph(`[${card.severity.toUpperCase()}] ${card.module}: ${card.target}`, Word.InsertLocation.end);
      cardPara.styleBuiltIn = card.severity === "critical" ? Word.Style.heading2 : Word.Style.heading3;

      const descPara = body.insertParagraph(card.message, Word.InsertLocation.end);
      descPara.styleBuiltIn = Word.Style.normal;
    }

    // Chronology / Timeline Section (if provided)
    if (reportData.timeline && reportData.timeline.length > 0) {
      const h1Time = body.insertParagraph("Chronological Sequence & Event DAG", Word.InsertLocation.end);
      h1Time.styleBuiltIn = Word.Style.heading1;

      for (const event of reportData.timeline) {
        body.insertParagraph(`• [${event.type}] ${event.label} (Paragraph ${event.paraIndex})`, Word.InsertLocation.end);
      }
    }

    newDoc.open();
    await context.sync();
  });
}
```

---

## 9. Office.js Safe Range Navigation & Execution (`word-safe-navigator.js`)

Word text search can throw runtime errors if search strings contain unescaped wildcards or exceed 255 characters. This module handles target sanitization, batching, and error resilience.

```javascript
/**
 * word-safe-navigator.js
 * Fail-safe text location, selection, and replacement for Office.js.
 */

export class WordSafeNavigator {
  /**
   * Sanitizes strings to prevent Office.js search crashes.
   */
  static sanitizeSearchString(str) {
    if (!str) return "";
    return str
      .replace(/[\*\?\[\]\(\)\{\}\\\^\$\|\+]/g, "") // Strip regex and Word wildcards
      .substring(0, 250)                            // Enforce safe 255-char ceiling
      .trim();
  }

  /**
   * Navigates the Word viewport to select a specific target occurrence.
   */
  static async selectTarget(targetText, occurrenceIndex = 0) {
    const cleanSearch = this.sanitizeSearchString(targetText);
    if (!cleanSearch) return false;

    return Word.run(async (context) => {
      const searchResults = context.document.body.search(cleanSearch, {
        matchCase: false,
        matchWholeWord: true
      });
      searchResults.load("items");
      await context.sync();

      if (searchResults.items.length > 0) {
        const itemToSelect = searchResults.items[Math.min(occurrenceIndex, searchResults.items.length - 1)];
        itemToSelect.select();
        await context.sync();
        return true;
      }
      return false;
    }).catch((err) => {
      console.warn("Navigation failed safely:", err);
      return false;
    });
  }

  /**
   * Safe replacement with atomic undo-stack tracking.
   */
  static async safeReplace(targetText, replacementText) {
    const cleanSearch = this.sanitizeSearchString(targetText);
    if (!cleanSearch) return false;

    return Word.run(async (context) => {
      const searchResults = context.document.body.search(cleanSearch, {
        matchCase: false,
        matchWholeWord: true
      });
      searchResults.load("items");
      await context.sync();

      if (searchResults.items.length > 0) {
        const targetRange = searchResults.items[0];
        targetRange.insertText(replacementText, Word.InsertLocation.replace);
        await context.sync();
        return true;
      }
      return false;
    });
  }
}
```

---

## 10. AI Privacy, Quota Management & Secure Identity (`ai-quota-manager.js`)

Enforces secure direct-to-Gemini execution without intermediary data collection, pairing model selection with configurable token spend ceilings.

```javascript
/**
 * ai-quota-manager.js
 * Governs API credentials, token ceilings, and client-side data hygiene.
 */

export class AIQuotaManager {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
    this.SESSION_TOKEN_KEY = "pe_ai_session_tokens";
    this.MONTHLY_TOKEN_KEY = "pe_ai_monthly_tokens";
    this.LIMIT_CONFIG_KEY = "pe_ai_limit_config";
  }

  getLimits() {
    return this.storage.get(this.LIMIT_CONFIG_KEY) || {
      model: "gemini-2.5-flash", // "gemini-2.5-flash" | "gemini-2.5-pro"
      maxSessionTokens: 50000,
      enforceCeiling: true
    };
  }

  saveLimits(config) {
    this.storage.set(this.LIMIT_CONFIG_KEY, config);
  }

  /**
   * Pre-flight estimation: Approximates token count (4 chars ~ 1 token).
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Verifies if an outbound call complies with budget limits.
   */
  canExecute(estimatedCost) {
    const limits = this.getLimits();
    if (!limits.enforceCeiling) return true;

    const currentSessionTokens = parseInt(sessionStorage.getItem(this.SESSION_TOKEN_KEY) || "0", 10);
    return (currentSessionTokens + estimatedCost) <= limits.maxSessionTokens;
  }

  /**
   * Records usage following successful API response.
   */
  recordUsage(tokensUsed) {
    const current = parseInt(sessionStorage.getItem(this.SESSION_TOKEN_KEY) || "0", 10);
    sessionStorage.setItem(this.SESSION_TOKEN_KEY, (current + tokensUsed).toString());
  }

  resetSessionTokens() {
    sessionStorage.setItem(this.SESSION_TOKEN_KEY, "0");
  }
}
```

---

## 11. Complete Single-File Master UI Implementation

> **Reference mockup only — not production source.** The HTML/CSS below illustrates a **proposed vNext** task pane sketch. It is **not** authoritative for beta testers or implementers. Shipped UI and behavior live in **`src/taskpane/taskpane.html`** on `main` (build **2.0.0.14**). Do **not** replace the production task pane with this file in one step; use a phased plan and parity checks against [prozaedit-features.md](prozaedit-features.md).

The layout below establishes Fluent 2 styling, a full tab array, a responsive status bar, hover tooltips, and a centralized settings modal (**vNext** — several tabs and settings patterns differ from v2.0.0.14).

**Version label in mock:** header shows **vNext mock — not production version**, not the hosted build number.

```html:ProzaEdit Complete Taskpane:src/taskpane/taskpane.html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProzaEdit Word</title>
  <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
  <style>
    :root {
      --pe-bg-base: #f8fafc;
      --pe-bg-surface: #ffffff;
      --pe-border: #e2e8f0;
      --pe-border-focus: #3b82f6;
      --pe-text-main: #0f172a;
      --pe-text-muted: #64748b;
      --pe-primary: #1e3a8a;
      --pe-primary-hover: #1e40af;
      --pe-success: #059669;
      --pe-warning: #d97706;
      --pe-danger: #dc2626;
      --pe-purple: #7c3aed;
      --pe-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --pe-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --pe-radius: 6px;
      --pe-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --pe-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--pe-font-sans);
      background: var(--pe-bg-base);
      color: var(--pe-text-main);
      font-size: 13px;
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    /* Sticky Header */
    .pe-header {
      background: var(--pe-bg-surface);
      border-bottom: 1px solid var(--pe-border);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .pe-brand {
      font-weight: 700;
      font-size: 14px;
      color: var(--pe-primary);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pe-header-tools { display: flex; align-items: center; gap: 8px; }

    /* Navigation Bar */
    .pe-nav {
      background: var(--pe-bg-surface);
      border-bottom: 1px solid var(--pe-border);
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
      flex-shrink: 0;
    }
    .pe-nav::-webkit-scrollbar { display: none; }
    .pe-nav-btn {
      padding: 8px 12px;
      border: none;
      background: transparent;
      color: var(--pe-text-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.15s ease;
    }
    .pe-nav-btn:hover { color: var(--pe-text-main); }
    .pe-nav-btn.active {
      color: var(--pe-primary);
      border-bottom-color: var(--pe-primary);
      font-weight: 600;
    }

    /* Main Workspace */
    .pe-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .pe-tab-pane { display: none; flex-direction: column; gap: 12px; }
    .pe-tab-pane.active { display: flex; }

    /* Cards & Containers */
    .pe-card {
      background: var(--pe-bg-surface);
      border: 1px solid var(--pe-border);
      border-radius: var(--pe-radius);
      padding: 12px;
      box-shadow: var(--pe-shadow-sm);
    }
    .pe-card-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pe-text-muted);
      margin-bottom: 8px;
    }

    /* Form Controls */
    .pe-form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .pe-label { font-size: 11px; font-weight: 500; color: var(--pe-text-muted); }
    .pe-select, .pe-input {
      padding: 6px 8px;
      border: 1px solid var(--pe-border);
      border-radius: var(--pe-radius);
      font-size: 12px;
      background: #fff;
      color: var(--pe-text-main);
      outline: none;
    }
    .pe-select:focus, .pe-input:focus { border-color: var(--pe-border-focus); }

    /* Sliders */
    .pe-slider-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .pe-slider { flex: 1; accent-color: var(--pe-primary); }

    /* Buttons */
    .pe-btn {
      padding: 6px 12px;
      border: 1px solid var(--pe-border);
      border-radius: var(--pe-radius);
      background: #fff;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .pe-btn:hover { background: #f1f5f9; }
    .pe-btn-primary {
      background: var(--pe-primary);
      border-color: var(--pe-primary);
      color: #fff;
    }
    .pe-btn-primary:hover { background: var(--pe-primary-hover); }

    /* Persistent Footer */
    .pe-footer {
      background: var(--pe-bg-surface);
      border-top: 1px solid var(--pe-border);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .pe-status-text { font-size: 11px; color: var(--pe-text-muted); }

    /* Tooltip Bubble */
    .pe-tooltip-bubble {
      position: fixed;
      z-index: 1000;
      background: #1e293b;
      color: #f8fafc;
      padding: 4px 8px;
      font-size: 11px;
      border-radius: 4px;
      max-width: 200px;
      pointer-events: none;
      box-shadow: var(--pe-shadow-md);
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    .pe-tooltip-visible { opacity: 1; }

    /* Modal */
    .pe-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.4);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 900;
      padding: 16px;
    }
    .pe-modal-overlay.open { display: flex; }
    .pe-modal {
      background: #fff;
      border-radius: 8px;
      max-width: 380px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--pe-shadow-md);
      overflow: hidden;
    }
    .pe-modal-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--pe-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pe-modal-body { padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
  </style>
</head>
<body>

  <!-- Sticky Top Header -->
  <header class="pe-header">
    <div class="pe-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
      <span>ProzaEdit</span>
      <span style="font-size:10px;font-weight:400;color:#64748b;margin-left:6px;">(vNext mock — not production version)</span>
    </div>
    <div class="pe-header-tools">
      <button class="pe-btn" id="btn-settings-open" data-pe-tip="btn-open-settings">⚙ Settings</button>
    </div>
  </header>

  <!-- Workflow Navigation Strip (vNext mock — production uses Target/Checks/Audit/Rewrite tabs + 4-step strip) -->
  <nav class="pe-nav" role="tablist">
    <button class="pe-nav-btn active" data-tab="tab-scope">Target</button>
    <button class="pe-nav-btn" data-tab="tab-thesaurus">Thesaurus</button>
    <button class="pe-nav-btn" data-tab="tab-checks">Checks</button>
    <button class="pe-nav-btn" data-tab="tab-timeline">Narrative</button>
    <button class="pe-nav-btn" data-tab="tab-audit">Audit</button>
    <button class="pe-nav-btn" data-tab="tab-shaper">Shaper</button>
    <button class="pe-nav-btn" data-tab="tab-citation">Citations</button>
    <button class="pe-nav-btn" data-tab="tab-coach">Coach</button>
    <button class="pe-nav-btn" data-tab="tab-help">Help</button>
  </nav>

  <!-- Dynamic Tab Viewport -->
  <main class="pe-viewport">

    <!-- TAB 1: Scope & Target -->
    <section class="pe-tab-pane active" id="tab-scope">
      <div class="pe-card">
        <div class="pe-card-title">Execution Context</div>
        <div class="pe-form-group">
          <label class="pe-label" for="sel-scope">Analysis Scope</label>
          <select class="pe-select" id="sel-scope" data-pe-tip="sel-manuscript-scope">
            <option value="selection">Highlighted Selection</option>
            <option value="chapter" selected>Current Chapter</option>
            <option value="full">Full Manuscript (~450k cap)</option>
          </select>
        </div>
        <div class="pe-form-group">
          <label class="pe-label" for="sel-genre">Manuscript Type</label>
          <select class="pe-select" id="sel-genre">
            <option value="fiction">Fiction (Narrative/Thriller)</option>
            <option value="academic">Academic / Peer-Review</option>
            <option value="legal">Legal Brief / Regulatory</option>
            <option value="business">Executive Business Report</option>
          </select>
        </div>
      </div>

      <div class="pe-card">
        <div class="pe-card-title">Tone & Atmospheric Goal</div>
        <div class="pe-form-group">
          <label class="pe-label" for="sel-scene-tone">Target Scene Tone</label>
          <select class="pe-select" id="sel-scene-tone" data-pe-tip="sel-scene-tone">
            <option value="balanced">Balanced / Neutral</option>
            <option value="tense">Tense / Suspenseful</option>
            <option value="dark">Dark / Ominous</option>
            <option value="humorous">Humorous / Satirical</option>
            <option value="other">Other (Custom descriptor)...</option>
          </select>
        </div>
        <div class="pe-form-group" id="group-custom-tone" style="display:none;">
          <label class="pe-label" for="input-custom-tone">Custom Descriptor</label>
          <input type="text" class="pe-input" id="input-custom-tone" placeholder="e.g., Claustrophobic" data-pe-tip="input-tone-custom">
        </div>
      </div>
    </section>

    <!-- TAB: Thesaurus (retained v2 — mock placeholder) -->
    <section class="pe-tab-pane" id="tab-thesaurus">
      <div class="pe-card">
        <div class="pe-card-title">Thesaurus (retained from v2.0.0.14)</div>
        <p style="font-size:11px;color:var(--pe-text-muted);margin:0;">Datamuse lookup; hidden in Simple mode in production. Mock pane only.</p>
      </div>
    </section>

    <!-- TAB: Checks & Engine (first-class until merged into Audit UX) -->
    <section class="pe-tab-pane" id="tab-checks">
      <div class="pe-card">
        <div class="pe-card-title">Checks &amp; Engine</div>
        <p style="font-size:11px;color:var(--pe-text-muted);margin:0;">Fiction modules, extended pass, section/chapter loop, heatmap — parity with production Checks tab.</p>
      </div>
    </section>

    <!-- TAB: Narrative & Chronology (additive vNext) -->
    <section class="pe-tab-pane" id="tab-timeline">
      <div class="pe-card">
        <div class="pe-card-title">Chronology Engine</div>
        <div class="pe-form-group">
          <label class="pe-label" for="sel-chrono-depth">Granularity</label>
          <select class="pe-select" id="sel-chrono-depth" data-pe-tip="sel-chronology-depth">
            <option value="macro">Macro (Chapters)</option>
            <option value="meso" selected>Meso (Scenes & Breaks)</option>
            <option value="micro">Micro (Entity Actions)</option>
          </select>
        </div>
        <button class="pe-btn pe-btn-primary" id="btn-run-chronology" style="width:100%;" data-pe-tip="btn-scan-chronology">
          Map Timeline & Audit Paradoxes
        </button>
      </div>

      <div class="pe-card">
        <div class="pe-card-title">Timeline Sequence</div>
        <div id="chrono-timeline-list" style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
          <div style="color:var(--pe-text-muted); font-size:11px;">No timeline mapped. Click above to scan.</div>
        </div>
      </div>
    </section>

    <!-- TAB 3: Audit & Reports -->
    <section class="pe-tab-pane" id="tab-audit">
      <div class="pe-card">
        <div class="pe-card-title">Audit Overview</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <span style="font-size:24px; font-weight:700;" id="metric-score">9.2</span>
            <span style="color:var(--pe-text-muted); font-size:11px;">/10 Target</span>
          </div>
          <button class="pe-btn" id="btn-export-docx">Export Word Report</button>
        </div>
        <div style="font-size:11px; color:var(--pe-text-muted);" id="metric-summary">
          0 critical issues • 4 style recommendations
        </div>
      </div>

      <div class="pe-card">
        <div class="pe-card-title">Finding Cards</div>
        <div id="audit-cards-container" style="display:flex; flex-direction:column; gap:8px;">
          <!-- Sample Card -->
          <div style="border-left:3px solid var(--pe-warning); padding-left:8px;">
            <div style="font-weight:600; font-size:11px;">Pacing Monotony</div>
            <div style="font-size:11px; color:var(--pe-text-muted);">Five consecutive sentences share nearly identical length (~14 words).</div>
            <div style="margin-top:4px; display:flex; gap:4px;">
              <button class="pe-btn" style="padding:2px 6px; font-size:10px;">Go to</button>
              <button class="pe-btn" style="padding:2px 6px; font-size:10px;">Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: Lexical Shaper -->
    <section class="pe-tab-pane" id="tab-shaper">
      <div class="pe-card">
        <div class="pe-card-title">3-Axis Modifier Shaper</div>
        <div class="pe-form-group">
          <div class="pe-slider-row">
            <label class="pe-label">Complexity</label>
            <span style="font-size:10px; color:var(--pe-text-muted);">Simple ↔ Literary</span>
          </div>
          <input type="range" min="1" max="5" value="3" class="pe-slider" id="slider-shaper-complexity" data-pe-tip="slider-complexity">
        </div>
        <div class="pe-form-group">
          <div class="pe-slider-row">
            <label class="pe-label">Intensity</label>
            <span style="font-size:10px; color:var(--pe-text-muted);">Restrained ↔ Evocative</span>
          </div>
          <input type="range" min="1" max="5" value="4" class="pe-slider" id="slider-shaper-intensity" data-pe-tip="slider-intensity">
        </div>
        <div class="pe-form-group">
          <div class="pe-slider-row">
            <label class="pe-label">Density</label>
            <span style="font-size:10px; color:var(--pe-text-muted);">Lean ↔ Dense</span>
          </div>
          <input type="range" min="1" max="5" value="2" class="pe-slider" id="slider-shaper-density" data-pe-tip="slider-density">
        </div>
        <button class="pe-btn pe-btn-primary" id="btn-apply-shaper" style="width:100%; margin-top:8px;">
          Calibrate Selection
        </button>
      </div>
    </section>

    <!-- TAB 5: Citations -->
    <section class="pe-tab-pane" id="tab-citation">
      <div class="pe-card">
        <div class="pe-card-title">Authority Stylebook</div>
        <div class="pe-form-group">
          <label class="pe-label" for="sel-citation-style">Standard</label>
          <select class="pe-select" id="sel-citation-style" data-pe-tip="sel-citation-style">
            <option value="BLUEBOOK">The Bluebook (Legal)</option>
            <option value="APA" selected>APA 7th Edition</option>
            <option value="CHICAGO">Chicago Manual of Style (CMOS)</option>
          </select>
        </div>
        <button class="pe-btn pe-btn-primary" id="btn-audit-citations" style="width:100%; margin-bottom:6px;">
          Verify Citation Syntax
        </button>
        <button class="pe-btn" id="btn-audit-biblio" style="width:100%;" data-pe-tip="btn-audit-biblio">
          Reconcile with Bibliography
        </button>
      </div>
    </section>

    <!-- TAB 6: Coach -->
    <section class="pe-tab-pane" id="tab-coach">
      <div class="pe-card" style="flex:1; display:flex; flex-direction:column;">
        <div class="pe-card-title">Contextual Editor Coach</div>
        <div id="coach-chat-stream" style="flex:1; max-height:260px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
          <div style="font-size:11px; background:#f1f5f9; padding:8px; border-radius:6px;">
            Ready to review. Select any finding card or ask for scene-level advice.
          </div>
        </div>
        <div style="display:flex; gap:6px; margin-top:8px;">
          <input type="text" class="pe-input" id="input-coach" placeholder="Ask coaching question..." style="flex:1;">
          <button class="pe-btn pe-btn-primary" id="btn-coach-send">Send</button>
        </div>
      </div>
    </section>

    <!-- TAB 7: Help -->
    <section class="pe-tab-pane" id="tab-help">
      <div class="pe-card">
        <div class="pe-card-title">Quick Reference</div>
        <p style="font-size:11px; color:var(--pe-text-muted); margin-bottom:8px;">
          ProzaEdit runs deterministic local heuristics inside Word. No manuscript content is sent to third-party cloud servers unless you configure a custom Gemini key.
        </p>
        <ul style="font-size:11px; margin-left:16px; color:var(--pe-text-muted); display:flex; flex-direction:column; gap:4px;">
          <li>Highlight text to run focused paragraph passes.</li>
          <li>Set character reveal anchors in Narrative to catch spoilers.</li>
          <li>Use Export Word Report to generate shareable audit sheets.</li>
        </ul>
      </div>
    </section>

  </main>

  <!-- Persistent Bottom Action Toolbar -->
  <footer class="pe-footer">
    <div style="display:flex; gap:6px;">
      <button class="pe-btn" id="btn-undo" data-pe-tip="btn-undo">↶</button>
      <button class="pe-btn" id="btn-redo" data-pe-tip="btn-redo">↷</button>
    </div>
    <span class="pe-status-text" id="lbl-status">Ready</span>
    <button class="pe-btn pe-btn-primary" id="btn-run-audit" data-pe-tip="btn-run-audit">⚡ Run Audit</button>
  </footer>

  <!-- Centralized Settings Modal -->
  <div class="pe-modal-overlay" id="modal-settings">
    <div class="pe-modal">
      <div class="pe-modal-header">
        <h3 style="font-size:14px; font-weight:600;">Preferences & Security</h3>
        <button class="pe-btn" id="btn-settings-close" style="padding:2px 6px;">✕</button>
      </div>
      <div class="pe-modal-body">
        
        <div class="pe-form-group">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="chk-setting-tooltips" checked>
            <span style="font-size:12px;">Show hover tips across features</span>
          </label>
        </div>

        <div class="pe-form-group">
          <label class="pe-label" for="sel-setting-persona">Critic Persona</label>
          <select class="pe-select" id="sel-setting-persona">
            <option value="balanced">Balanced Senior Editor</option>
            <option value="harsh">Very Harsh (9.0+ Target)</option>
            <option value="supportive">Supportive Peer Reader</option>
          </select>
        </div>

        <div class="pe-card-title" style="margin-top:8px;">AI Model & Privacy</div>
        <div class="pe-form-group">
          <label class="pe-label" for="sel-setting-aimodel">Model Endpoint</label>
          <select class="pe-select" id="sel-setting-aimodel">
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast / Low-Cost)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Narrative Reasoning)</option>
          </select>
        </div>
        <div class="pe-form-group">
          <label class="pe-label" for="input-setting-apikey">Google Gemini API Key</label>
          <input type="password" class="pe-input" id="input-setting-apikey" placeholder="Enter key (optional)">
        </div>

        <button class="pe-btn pe-btn-primary" id="btn-save-settings" style="width:100%; margin-top:8px;">
          Save Preferences
        </button>
      </div>
    </div>
  </div>

  <script type="module" src="taskpane.js"></script>
</body>
</html>