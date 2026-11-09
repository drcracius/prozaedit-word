/* Four editing passes. Diagnose only. Local checks, no model call. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.EditPasses = {
  /** Engine step ids, structure through copyedit. */
  ORDER: [
    "mPlot",
    "mMotivation",
    "mPlausibility",
    "mContinuity",
    "mSpoiler",
    "passStructure",
    "mDialogue",
    "tensePov",
    "passDialogue",
    "chkRep",
    "chkAI",
    "chkAIDetection",
    "mPacing",
    "genreCraft",
    "rhythm",
    "sensory",
    "passLine",
    "chkProp",
    "chkSpell",
    "chkSpellStyle",
    "editorHeuristics",
    "masterCore",
    "nonfiction",
    "fkLock",
    "contentNotes",
    "extendedLocal",
  ],

  PRESETS: {
    structure: {
      chkRep: false,
      chkProp: false,
      chkSpell: false,
      chkAI: false,
      mPlot: true,
      mMotivation: true,
      mPacing: false,
      mPlausibility: true,
      mContinuity: true,
      mDialogue: false,
      mSpoiler: false,
    },
    dialogue: {
      chkRep: false,
      chkProp: false,
      chkSpell: false,
      chkAI: false,
      mPlot: false,
      mMotivation: true,
      mPacing: false,
      mPlausibility: false,
      mContinuity: false,
      mDialogue: true,
      mSpoiler: false,
    },
    line: {
      chkRep: true,
      chkProp: false,
      chkSpell: false,
      chkAI: true,
      mPlot: false,
      mMotivation: false,
      mPacing: true,
      mPlausibility: false,
      mContinuity: false,
      mDialogue: false,
      mSpoiler: false,
    },
    copyedit: {
      chkRep: false,
      chkProp: true,
      chkSpell: true,
      chkAI: false,
      mPlot: false,
      mMotivation: false,
      mPacing: false,
      mPlausibility: false,
      mContinuity: false,
      mDialogue: false,
      mSpoiler: false,
    },
  },

  hint(pass) {
    const hints = {
      all: "Local Run uses every pass in order. Deep check sends all four diagnostic prompts in that order and must list problems, not rewrite the chapter.",
      structure: "Pass 1. Local Run flags coincidence and a passive hero. Deep check asks whether each event is caused by a choice, where the hook is, and where the scene stalls.",
      dialogue: "Pass 2. Local Run flags long speeches and named feelings. Deep check reads the dialogue without tags and checks it against the character's goal.",
      line: "Pass 3. Local Run flags named emotions and stock cadence. Deep check lists show-versus-tell, filter words, and flat rhythm, and does not rewrite them.",
      copyedit: "Pass 4. Local Run does spelling and names. Deep check is a strict copyedit: original line to a small fix, with your vocabulary left alone.",
    };
    return hints[pass] || hints.all;
  },

  /**
   * The diagnostic script for one optional AI call. Local Run does not send this.
   * The model must quote the excerpt and must not return a rewritten chapter.
   */
  diagnosisInstruction(pass) {
    const key = this.PRESETS[pass] ? pass : "all";
    const shared =
      "You are a diagnostic editor, not a ghostwriter. Do not rewrite the chapter, do not invent plot, and do not flatten the writer's voice. " +
      "Return ONLY a JSON array of at most 6 objects. Each targetText must be copied exactly from the excerpt. " +
      'Shape: [{"module":"","type":"preference","explanation":"","targetText":"","replacementText":""}]';
    const jobs = {
      structure:
        "PASS 1 — STRUCTURE. Analyze this scene for causality. Does every major event happen because of a prior character choice, or by coincidence? " +
        "Flag plot holes, unearned emotional shifts, and moments where the protagonist is purely passive. " +
        "From a literary agent's view, identify where the opening hooks, which story questions the first pages plant, and where backstory or explanation delays momentum. " +
        "Flag stretches where conflict stalls, scenes that advance neither the external plot nor the internal arc, and aimless information dumps. " +
        "replacementText must be a note of 12 words or fewer, or \"(do not rewrite)\". Do not supply replacement prose.",
      dialogue:
        "PASS 2 — DIALOGUE AND CHARACTER. Extract the dialogue without tags. Say whether each speaker is distinct in word choice, rhythm, and attitude. " +
        "Flag lines that are on-the-nose (a character stating the exact feeling) and lines where speakers sound the same. " +
        "Compare decisions in the scene with any goal or flaw that is actually stated in the excerpt. Flag choices that exist only to serve the plot. " +
        "If the excerpt does not state a goal or flaw, say so in the explanation. Do not invent a psychology. " +
        "replacementText must be \"(do not rewrite)\".",
      line:
        "PASS 3 — LINE. List telling instead of showing, especially named emotions, and filter words (saw, heard, felt, noticed, realized) that distance the reader. " +
        "Flag crutch words, redundant phrases, weak verb plus adverb, and consecutive sentences with the same rhythm. " +
        "Explain why. Do not rewrite the lines. replacementText must be \"(do not rewrite)\".",
      copyedit:
        "PASS 4 — COPYEDIT. Proofread only for spelling, punctuation, dialogue tags versus action beats, tense shifts, and grammar. " +
        "Do not change vocabulary, tone, or sentence structure. replacementText is the smallest fix, not a paraphrase. " +
        "explanation must be short, in the form Original issue, then the fix.",
      all:
        "Work in this order and stop early if Pass 1 is full of problems. " +
        "PASS 1 structure: causality versus coincidence, passive protagonist, hook, stalled conflict, information dumps. " +
        "PASS 2 dialogue: speakers distinct or not, on-the-nose lines, choices versus a goal that is actually written on the page. " +
        "PASS 3 line: named emotions, filter words, crutch words, weak verb plus adverb, monotonous rhythm. Do not rewrite. " +
        "PASS 4 copyedit: spelling, punctuation, tags versus beats, tense. Smallest fix only. " +
        "Prefer earlier passes. replacementText is \"(do not rewrite)\" for passes 1–3, and a minimal fix only for pass 4.",
    };
    return `${shared}\n\n${jobs[key]}`;
  },

  presetFlags(pass, fiction) {
    const base = this.PRESETS[pass];
    if (!base) return null;
    const out = { ...base };
    if (!fiction) {
      ["mPlot", "mMotivation", "mPacing", "mPlausibility", "mContinuity", "mDialogue", "mSpoiler"].forEach((id) => {
        out[id] = false;
      });
    }
    return out;
  },

  sortSteps(steps) {
    const rank = {};
    this.ORDER.forEach((id, i) => {
      rank[id] = i;
    });
    return (steps || []).slice().sort((a, b) => (rank[a.id] ?? 80) - (rank[b.id] ?? 80));
  },

  _push(push, row) {
    push({
      module: row.module,
      type: "preference",
      confidence: row.confidence || "low",
      replacementText: "(your revision — not an automatic rewrite)",
      ...row,
    });
  },

  structureNotes(text, push, ctx) {
    const raw = String(text || "");
    const narration = ProzaEdit.Audit?.blankQuotedSpeech ? ProzaEdit.Audit.blankQuotedSpeech(raw) : raw;
    const lower = narration.toLowerCase();
    let n = 0;
    ["by chance", "as luck would have it", "happened to", "out of nowhere"].forEach((phrase) => {
      if (n >= 2) return;
      const at = lower.indexOf(phrase);
      if (at < 0) return;
      n++;
      this._push(push, {
        ruleId: "pass1:coincidence",
        confidence: ctx?.auditPass === "structure" ? "medium" : "low",
        module: "Plot & Chapter Structure",
        targetText: narration.slice(at, at + phrase.length),
        explanation: `"${phrase}" may be a coincidence doing the plot's work. Prefer a cause that came from a choice earlier in the scene.`,
      });
    });
    const watch = narration.match(/\b(had no choice|could only watch|nothing (?:he|she|they) could do)\b/i);
    if (watch) {
      this._push(push, {
        ruleId: "pass1:passive-hero",
        confidence: ctx?.auditPass === "structure" ? "medium" : "low",
        module: "Characterization & Motivation",
        targetText: watch[0],
        explanation: "The viewpoint character is only watching. Give them a choice, even a bad one, or the scene has no cause and effect.",
      });
    }
    const sentences = narration.split(/[.!?]+\s+/);
    const dump = sentences.find((s) => s.split(/\s+/).filter(Boolean).length >= 70 && /\b(years ago|had always|back when)\b/i.test(s));
    if (dump) {
      this._push(push, {
        ruleId: "pass1:info-dump",
        confidence: ctx?.auditPass === "structure" ? "medium" : "low",
        module: "Plot & Chapter Structure",
        targetText: dump.trim().slice(0, 140),
        explanation: "A long look backward (years ago / had always) stalls the scene. Move the fact into an action, or cut it until a later pass.",
      });
    }
  },

  dialogueNotes(text, push, ctx) {
    const raw = String(text || "");
    let spans = ProzaEdit.Audit?.quotedSpeechSpans ? ProzaEdit.Audit.quotedSpeechSpans(raw) : [];
    if (!spans.length) {
      spans = [];
      const re = /["\u201C][^"\u201D]{0,240}["\u201D]/g;
      let m;
      while ((m = re.exec(raw)) !== null && spans.length < 40) spans.push({ text: m[0] });
    }
    let n = 0;
    spans.forEach((span) => {
      if (n >= 2) return;
      const spoken = String(span.text || "");
      const hit = spoken.match(/\b(I feel (?:so )?(?:angry|sad|scared|afraid|happy)|I am (?:so )?(?:angry|sad|scared|afraid)|I'm (?:so )?(?:angry|sad|scared|afraid))\b/i);
      if (!hit) return;
      n++;
      this._push(push, {
        ruleId: "pass2:on-the-nose",
        confidence: ctx?.auditPass === "dialogue" ? "medium" : "low",
        module: "Dialogue & Viewpoint (POV)",
        targetText: hit[0],
        explanation: "The line names the feeling. In thriller dialogue, let the word choice or the next action show it. This is a note, not a rewrite.",
      });
    });
  },

  PROJECT_RULE_MAX: 500,

  projectRuleSection(rule) {
    const text = String(rule || "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, this.PROJECT_RULE_MAX);
    if (!text) return "";
    return (
      "PROJECT RULE (from the writer). Check the excerpt against this rule. " +
      "List only slips that are visible in the excerpt. Do not rewrite the scene. Do not invent facts beyond this rule:\n" +
      text
    );
  },

  lineNotes(text, push, ctx) {
    const raw = String(text || "");
    const narration = ProzaEdit.Audit?.blankQuotedSpeech ? ProzaEdit.Audit.blankQuotedSpeech(raw) : raw;
    const named = narration.match(/\b(?:he|she|they) (?:felt|was|were) (?:angry|sad|afraid|scared|nervous|happy|furious)\b/i);
    if (named) {
      this._push(push, {
        ruleId: "pass3:named-emotion",
        confidence: ctx?.auditPass === "line" ? "medium" : "low",
        module: "Pacing, Readability & Transitions",
        targetText: named[0],
        explanation: "The narration names the emotion. Show it with a body cue or a choice. Do not let a tool invent the replacement.",
      });
    }
    const weak = narration.match(/\b(?:walked|ran|looked|turned|said) [a-z]{4,}ly\b/i);
    if (weak) {
      this._push(push, {
        ruleId: "pass3:weak-adverb",
        confidence: ctx?.auditPass === "line" ? "medium" : "low",
        module: "Pacing, Readability & Transitions",
        targetText: weak[0],
        explanation: `Weak verb plus adverb ("${weak[0]}"). A stronger verb usually carries the beat. Listed for you to change.`,
      });
    }
  },
};
