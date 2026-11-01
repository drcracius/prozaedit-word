/* Editorial coaching from curated heuristics — no API tokens. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.LocalCoach = {
  MODULE_TIPS: {
    "Plot & Chapter Structure": [
      "End scenes on a question, reversal, or unfinished action—not on logistics alone.",
      "Each chapter beat should change what the protagonist can or cannot do.",
    ],
    "Characterization & Motivation": [
      "Replace vague cues (suddenly, somehow) with a visible trigger or choice.",
      "Prefer active verbs over clusters of passive ‘was …-ed’ constructions.",
    ],
    "Dialogue & Viewpoint (POV)": [
      "Break long speeches with action beats; one idea per dialogue chunk.",
      "Keep one POV lens per paragraph—filter perception through that character.",
    ],
    "Continuity & Chronology": [
      "Anchor time jumps with a concrete marker (date, season, elapsed hours).",
      "Check travel math: stated distance/duration vs. ‘instantly’ language.",
    ],
    "Plausibility, Logic & Evidence": [
      "Replace absolutes (always, never, 100%) with on-page evidence.",
      "If a claim is extraordinary, show the observation that supports it.",
    ],
    "Pacing, Readability & Transitions": [
      "Split sentences over ~40 words; vary length for rhythm.",
      "Match Flesch band to your Target Reader setting on the Target tab.",
    ],
    "Spoiler Control & Reveal Timing": [
      "Cut narrator lines that tell the reader a surprise is coming.",
      "Let reveals land through action/dialogue, not foreshadowing winks.",
    ],
    "Repetition & Redundancy": [
      "Fix pleonasms first—they are one-click Apply fixes in the audit.",
      "Vary repeated word pairs within the same page/scene.",
    ],
    "Proper noun consistency": [
      "Pick one canonical spelling per character/place; add exceptions to Custom Dictionary.",
    ],
    "Anti-AI Voice Directive": [
      "Swap template phrases for specific, scene-bound wording.",
      "Vary sentence openings; avoid evenly sized ‘essay’ paragraphs.",
    ],
    "Proofreading & Language": [
      "Run Word F7/Editor for spelling; ProzaEdit handles dialect (US/UK) flags.",
    ],
    "Editorial consistency": [
      "a/an and duplicate-word flags are heuristics — read in context before Apply.",
      "For batch find/replace at scale, use Word with your own macros or external editor tools.",
    ],
    "Genre craft": [
      "Genre flags compare your excerpt with the usual range for the genre you picked (Target tab); change the genre if it does not fit.",
      "Clichés are suggestions: keep one if it is deliberate (a parody, a character's voice).",
    ],
    "Style guide": [
      "Cards cite Plain Language, Strunk (1920), GOV.UK, or Microsoft/Google — see Target → Style basis.",
      "These are suggestions, not legal or Chicago/AP rules; mute noisy rules per document.",
    ],
  },

  INTENT_TIPS: [
    {
      re: /\b(pov|viewpoint|first person|third person|head hop)\b/i,
      tips: [
        "One POV per paragraph. If you need another head, start a new section/scene break.",
        "Remove filter words that belong to another character’s knowledge.",
      ],
    },
    {
      re: /\b(pacing|slow|drag|boring|flat)\b/i,
      tips: [
        "Shorten the middle: add a complication every 500–800 words in thriller pacing.",
        "Use section loop + local audit to scan one chunk at a time (no API cost).",
      ],
    },
    {
      re: /\b(dialogue|dialog|speech|talk)\b/i,
      tips: [
        "Read dialogue aloud; cut anything that sounds like exposition disguised as speech.",
        "Tag lines: prefer ‘said’ or action beats over adverb-heavy tags.",
      ],
    },
    {
      re: /\b(show|tell|showing|telling)\b/i,
      tips: [
        "Convert abstract emotion labels to gesture, setting, or subtext in dialogue.",
        "If a sentence explains motivation, try removing it and showing the choice instead.",
      ],
    },
    {
      re: /\b(copilot|gemini|ai|rewrite)\b/i,
      tips: [
        "Suggested order: ProzaEdit local audit, then Word Copilot for prose, then your own AI key only if you want it.",
        "Use ‘Copy for Copilot’ on the Audit tab to paste findings without using AI tokens.",
      ],
    },
    {
      re: /\b(plot|chapter|structure|arc|midpoint|climax)\b/i,
      tips: [
        "End chapters on unresolved tension; logistics-only endings often flag in local audit.",
        "Audit one chapter at a time (Target → Chosen chapters) to keep long manuscripts manageable (0 tokens).",
      ],
    },
    {
      re: /\b(theme|motif|message|symbol)\b/i,
      tips: [
        "Manuscript overview lists top repeated motif words locally—use them to tighten thematic unity.",
        "If a motif spikes only once, decide whether to echo it or cut it.",
      ],
    },
    {
      re: /\b(character|name|arc|motivation)\b/i,
      tips: [
        "Overview lists frequent proper nouns; fix variants with proper-noun checks + dictionary.",
        "Watch same-initial name pairs in the same scene (overview warns locally).",
      ],
    },
    {
      re: /\b(setting|world|dialect|idiom|geography)\b/i,
      tips: [
        "Set Setting Anchor on Target tab; long excerpts without anchor terms flag drift.",
        "Sensory counts in overview are heuristic—boost weak senses in action scenes.",
      ],
    },
    {
      re: /\b(export|pdf|letter|beta|agent|report)\b/i,
      tips: [
        "Copy feedback letter or Insert report in Word on Audit tab—no PDF engine needed; use Word Save As PDF.",
        "Per-document settings (dictionary, mutes) travel with the .docx automatically.",
      ],
    },
  ],

  GENERAL: [
    "Highlight the passage in Word, run **Run Full Audit (local)**—zero tokens.",
    "Use **Deeper local audit** for an extra rule pass before any paid/API step.",
    "Apply fixes with undo available (toolbar ↶ Undo).",
  ],

  genreTips(ctx) {
    const G = ProzaEdit.Genres;
    if (!G) return [];
    const p = G.resolve(ctx && ctx.manuscriptType);
    return p.coachTips || [];
  },

  forIssue(item, ctx) {
    const mod = item?.module || "";
    let tips = this.MODULE_TIPS[mod];
    if (!tips && mod.startsWith("Style guide")) tips = this.MODULE_TIPS["Style guide"];
    if (!tips) tips = this.MODULE_TIPS["Proofreading & Language"];
    const lines = [`**${mod}** — local coaching (no API):`, ""];
    tips.forEach((t) => lines.push(`• ${t}`));
    if (item?.explanation) lines.push("", `Your flag: ${item.explanation}`);
    if (item?.targetText && !String(item.targetText).startsWith("(")) {
      lines.push(`Passage: “${String(item.targetText).substring(0, 120)}”`);
    }
    const gt = this.genreTips(ctx);
    if (gt.length) lines.push("", `For ${ProzaEdit.Genres.resolve(ctx.manuscriptType).label}:`, ...gt.map((t) => `• ${t}`));
    lines.push("", "Try: local paraphrase (Rewrite tab) or Word Copilot for a full rewrite.");
    return lines.join("\n");
  },

  answer(question, profileText, ctx) {
    const q = String(question || "").trim();
    const lines = ["**ProzaEdit Local Coach** (0 tokens)", ""];
    if (profileText) lines.push(profileText, "");
    for (const block of this.INTENT_TIPS) {
      if (block.re.test(q)) {
        block.tips.forEach((t) => lines.push(`• ${t}`));
        this.genreTips(ctx).slice(0, 2).forEach((t) => lines.push(`• (${ProzaEdit.Genres.resolve(ctx.manuscriptType).label}) ${t}`));
        lines.push("");
        lines.push("Need generative prose? Use Word Copilot on the selection.");
        return lines.join("\n");
      }
    }
    this.GENERAL.forEach((t) => lines.push(`• ${t}`));
    lines.push("", "Ask about: POV, pacing, dialogue, or show vs tell.");
    return lines.join("\n");
  },
};
