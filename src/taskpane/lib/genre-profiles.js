/**
 * Genre / sub-genre registry — the single source for every genre-dependent threshold, list and prompt note.
 * Local, deterministic, no network. The profile is chosen via the existing #manuscriptType select (its value is
 * the registry `value`), so saved documents keep working: legacy values map to a profile with identical numbers.
 *
 * Calibration rule: "thriller-suspense" and "general-fiction" reproduce the pre-PE-81 fiction behaviour exactly
 * (dialogue band 22–48 %, long sentence 38/45 words, passive cluster 5). Other profiles only move numbers where
 * the genre's conventions clearly differ; every profile documents why in `rationale`.
 */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const BASE_FICTION = {
    family: "fiction",
    bands: { dialogue: [22, 48], aslHigh: 22, aslLow: 8 },
    longSentence: { harsh: 38, normal: 45 },
    longDialogueChars: 80,
    passiveCluster: 5,
    fkSlack: 0,
    adverbPer1k: 28,
    filterPer1k: 14,
    tagAdverbMax: 3,
    weakCues: ["suddenly", "for some reason", "somehow", "started to", "began to"],
    muteRulePrefixes: [],
    cliches: [],
    coachTips: [],
    aiNote: "",
  };

  const REGISTRY = [
    {
      ...BASE_FICTION,
      id: "general-fiction",
      value: "Fiction (General)",
      label: "Fiction — General",
      blurb: "Any fiction, or not sure yet. Balanced, conservative checks.",
      rationale: "Catch-all. Uses the long-standing commercial-fiction numbers so nothing is stricter than before.",
      cliches: ["heart pounded in his chest", "heart pounded in her chest", "let out a breath she didn't know she was holding", "let out a breath he didn't know he was holding"],
      aiNote: "General fiction: respect the author's voice; do not push genre conventions.",
    },
    {
      ...BASE_FICTION,
      id: "romance",
      value: "Fiction (Romance)",
      label: "Romance",
      blurb: "Emotion-forward, dialogue-rich, relationship arc.",
      rationale:
        "Romance is dialogue-heavy and interior (filter words like 'felt' carry the genre), so dialogue band is wider and filter/adverb tolerance higher; the usual cliché list is romance-specific.",
      bands: { dialogue: [30, 60], aslHigh: 21, aslLow: 7 },
      adverbPer1k: 34,
      filterPer1k: 24,
      tagAdverbMax: 5,
      fkSlack: -1,
      cliches: ["electricity shot through", "butterflies in her stomach", "butterflies in his stomach", "smoldering eyes", "orbs", "released a breath she didn't know", "heart skipped a beat", "sparks flew", "drowning in his eyes", "drowning in her eyes"],
      coachTips: ["Keep the emotional beat on the page: show the body reaction, then the thought, then the choice.", "Let tension between the leads come from conflicting wants, not misunderstandings that one sentence would solve."],
      aiNote: "Romance: warm, emotionally specific; keep interior emotion and banter; avoid purple clichés.",
    },
    {
      ...BASE_FICTION,
      id: "mystery-crime",
      value: "Fiction (Mystery/Crime)",
      label: "Mystery / Crime",
      blurb: "Clues, suspects and procedure; fair-play reveals.",
      rationale:
        "Top-three fiction category. Clue-laden prose and procedural detail run slightly longer; dialogue is interrogation-heavy. Spoiler/reveal-timing and continuity checks matter most, so they stay on; 'telegraphing' phrases stay flagged.",
      bands: { dialogue: [25, 50], aslHigh: 22, aslLow: 8 },
      longSentence: { harsh: 38, normal: 45 },
      cliches: ["it was a dark and stormy night", "the plot thickens", "little did he know", "little did she know", "a chill ran down his spine", "a chill ran down her spine", "the killer was always one step ahead"],
      coachTips: ["Plant every clue in plain sight and make sure the reveal could have been deduced.", "Re-check timelines: alibis, travel time and who knows what, when."],
      aiNote: "Mystery/crime: protect clue placement and timeline logic; never reveal or invent solutions.",
    },
    {
      ...BASE_FICTION,
      id: "thriller-suspense",
      value: "Fiction (Thriller/Mystery/Crime)",
      label: "Thriller / Suspense",
      blurb: "Fast, tense, short beats. (Matches the previous default.)",
      rationale:
        "Top-three fiction category and the previous app default, so its numbers are the unchanged baseline. Short sentences and quick scene exits are the convention; 'suddenly' stays flagged as a weak tension cue.",
      cliches: ["heart pounded in his chest", "heart pounded in her chest", "time seemed to slow", "the silence was deafening", "a shiver ran down his spine", "a shiver ran down her spine", "little did he know", "little did she know"],
      coachTips: ["End scenes on a question, reversal or unfinished action.", "Cut the beat before the answer: leave readers one step behind the danger."],
      aiNote: "Thriller/suspense: preserve pace and tension; prefer shorter beats; do not soften stakes.",
    },
    {
      ...BASE_FICTION,
      id: "fantasy",
      value: "Fiction (Fantasy)",
      label: "Fantasy",
      blurb: "Invented worlds, names and magic; longer descriptive sentences.",
      rationale:
        "Top-five category. Invented names are normal (proper-noun checks lean on your dictionary and index), prose runs longer and more descriptive, and 'in an instant' / 'inexplicably' are legitimate in a magic system, so plausibility checks are muted.",
      bands: { dialogue: [15, 42], aslHigh: 25, aslLow: 9 },
      longSentence: { harsh: 45, normal: 55 },
      fkSlack: 2,
      adverbPer1k: 30,
      muteRulePrefixes: ["plaus:"],
      cliches: ["the chosen one", "ancient evil awakens", "a dark lord", "an ancient prophecy", "his eyes glinted", "her eyes glinted", "little did they know", "farm boy"],
      coachTips: ["Introduce invented terms one at a time and anchor each with a concrete image.", "Keep magic costs consistent; add rules to your dictionary and index."],
      aiNote: "Fantasy: invented names and magic terms are intentional; keep world rules consistent; keep lyrical register.",
    },
    {
      ...BASE_FICTION,
      id: "scifi",
      value: "Fiction (Science Fiction)",
      label: "Science Fiction",
      blurb: "Ideas, technology and worldbuilding; technical terms allowed.",
      rationale:
        "Top-five category. Technical vocabulary and longer explanatory sentences are expected; plausibility absolutes ('100%') are often meant literally in engineering dialogue, so that card is kept but long-sentence limits are relaxed and infodump (long dialogue) tolerance is wider.",
      bands: { dialogue: [18, 45], aslHigh: 24, aslLow: 8 },
      longSentence: { harsh: 42, normal: 50 },
      longDialogueChars: 110,
      fkSlack: 2,
      passiveCluster: 6,
      cliches: ["it's worse than we thought", "beam me up", "the fabric of space and time", "little did they know", "the aliens come in peace", "artificial intelligence turned against"],
      coachTips: ["Explain technology through what it changes for a character, not through lectures.", "Name each technical term the same way every time."],
      aiNote: "Science fiction: technical terms are intentional; keep explanations dramatised; do not 'correct' the science.",
    },
    {
      ...BASE_FICTION,
      id: "literary-drama",
      value: "Fiction (Literary/Drama)",
      label: "Literary / Drama",
      blurb: "Voice-driven, interior, longer and varied sentences.",
      rationale:
        "Core literary and book-club space. Sentence length and variation are stylistic choices, so long-sentence and rhythm limits are wide and fragment tolerance is high; clichés and weak agency cues are held to a stricter standard because voice is the product.",
      bands: { dialogue: [10, 40], aslHigh: 27, aslLow: 7 },
      longSentence: { harsh: 50, normal: 60 },
      fkSlack: 3,
      adverbPer1k: 22,
      filterPer1k: 18,
      tagAdverbMax: 2,
      cliches: ["a single tear rolled down", "time heals all wounds", "the weight of the world", "tears streamed down", "her whole life flashed", "a flood of memories"],
      coachTips: ["Make each long sentence earn its length: vary clause shape and land on the image.", "Prefer the exact detail to the abstract emotion word."],
      aiNote: "Literary/drama: preserve voice and rhythm above all; suggest minimal, specific edits only.",
    },
    {
      ...BASE_FICTION,
      id: "historical",
      value: "Fiction (Historical)",
      label: "Historical",
      blurb: "Period setting; period diction and longer sentences allowed.",
      rationale:
        "A consistently large category. Period diction and formal dialogue are intentional (no contraction pressure), sentences run longer, and anachronism is the key risk, so the coach prompts mention it and modern business jargon stays flagged.",
      bands: { dialogue: [18, 45], aslHigh: 25, aslLow: 8 },
      longSentence: { harsh: 45, normal: 55 },
      fkSlack: 2,
      cliches: ["a woman of her time", "little did she know", "in those days", "the winds of change", "a simpler time"],
      coachTips: ["Check idioms, objects and attitudes against the period; flag anything that sounds modern.", "Keep dates, titles and forms of address consistent across chapters."],
      aiNote: "Historical: keep period-appropriate diction; flag possible anachronisms but never modernise voice.",
    },

    {
      id: "nonfiction-memoir",
      family: "nonfiction",
      value: "Non-Fiction / Memoir",
      label: "Non-fiction / Memoir",
      blurb: "General non-fiction, memoir and narrative non-fiction.",
      rationale: "Catch-all for non-fiction. Narrative bands: shorter sentences for general readers; dialogue is checked as quoted material.",
      bands: { dialogue: [0, 35], aslHigh: 24, aslLow: 6 },
      longSentence: { harsh: 38, normal: 45 },
      longDialogueChars: 80,
      passiveCluster: 5,
      fkSlack: 0,
      weakCues: [],
      muteRulePrefixes: [],
      cliches: [],
      coachTips: ["State the claim, then the evidence, then why it matters to the reader."],
      aiNote: "Non-fiction/memoir: keep facts, names and quotations exact; improve clarity only.",
    },
    {
      id: "academic",
      family: "nonfiction",
      value: "Academic Paper / Journal",
      label: "Academic paper / journal",
      blurb: "Formal register, citations, objective voice.",
      rationale: "Longer sentences are normal, passive is conventional in methods text (higher passive tolerance), citations and contraction rules apply.",
      bands: { dialogue: [0, 5], aslHigh: 28, aslLow: 8 },
      longSentence: { harsh: 45, normal: 55 },
      longDialogueChars: 80,
      passiveCluster: 8,
      fkSlack: 3,
      weakCues: [],
      muteRulePrefixes: [],
      cliches: [],
      coachTips: ["Put the claim first; keep one idea per sentence in results and discussion."],
      aiNote: "Academic: keep terminology, citations and numbers exactly as written; objective register.",
    },
    {
      id: "business",
      family: "nonfiction",
      value: "Business / Corporate Report",
      label: "Business / corporate report",
      blurb: "Concise, plain-language, action-oriented.",
      rationale: "Executives skim: shorter sentences, low passive tolerance, corporate-jargon flags stay on.",
      bands: { dialogue: [0, 10], aslHigh: 25, aslLow: 6 },
      longSentence: { harsh: 32, normal: 40 },
      longDialogueChars: 80,
      passiveCluster: 4,
      fkSlack: 0,
      weakCues: [],
      muteRulePrefixes: [],
      cliches: [],
      coachTips: ["Lead with the decision or recommendation; put detail below it."],
      aiNote: "Business: concise, plain language, keep numbers and names exact.",
    },
    {
      id: "technical-journalism",
      family: "nonfiction",
      value: "Technical / Journalism",
      label: "Technical / journalism",
      blurb: "News, features and technical writing; tight ledes.",
      rationale: "Inverted-pyramid style: short sentences and a tight opening block; technical terms are allowed.",
      bands: { dialogue: [0, 20], aslHigh: 22, aslLow: 6 },
      longSentence: { harsh: 35, normal: 42 },
      longDialogueChars: 80,
      passiveCluster: 5,
      fkSlack: 1,
      weakCues: [],
      muteRulePrefixes: [],
      cliches: [],
      coachTips: ["Put the most important fact in the first sentence."],
      aiNote: "Technical/journalism: keep facts, quotes and attributions exact; tighten wording only.",
    },
  ];

  /** Optional vocabulary overlays (Advanced). Terms are added to the proper-noun/spelling allow-list. */
  const JARGON_PACKS = {
    none: { id: "none", label: "None", terms: [], passiveBonus: 0 },
    legal: {
      id: "legal",
      label: "Legal / courtroom",
      terms: ["subpoena", "voir dire", "habeas corpus", "affidavit", "deposition", "plaintiff", "defendant", "counsel", "tort", "arraignment", "pro bono", "bailiff", "indictment", "motion", "objection", "sustained", "overruled", "prosecutor", "esquire", "statute"],
      passiveBonus: 2,
    },
    medical: {
      id: "medical",
      label: "Medical / forensic",
      terms: ["hematoma", "contusion", "triage", "sutures", "myocardial", "trauma", "toxicology", "autopsy", "coroner", "lividity", "intubate", "sepsis", "oncology", "pathology"],
      passiveBonus: 1,
    },
    science: {
      id: "science",
      label: "Science / technology",
      terms: ["quantum", "algorithm", "isotope", "genome", "photon", "entropy", "plasma", "neural", "bandwidth", "protocol", "firmware", "kernel", "spectrometer"],
      passiveBonus: 2,
    },
    military: {
      id: "military",
      label: "Military / police",
      terms: ["perimeter", "recon", "sitrep", "ordnance", "battalion", "sergeant", "lieutenant", "dispatch", "precinct", "warrant", "detective", "ballistics", "rules of engagement"],
      passiveBonus: 0,
    },
  };

  const byValue = new Map(REGISTRY.map((p) => [p.value, p]));
  const byId = new Map(REGISTRY.map((p) => [p.id, p]));
  const DEFAULT_ID = "general-fiction";

  const LEGACY_PATTERNS = [
    [/Academic/i, "academic"],
    [/Business|Corporate/i, "business"],
    [/Technical|Journalism/i, "technical-journalism"],
    [/Non-?Fiction|Memoir/i, "nonfiction-memoir"],
    [/Romance/i, "romance"],
    [/Thriller|Suspense/i, "thriller-suspense"],
    [/Mystery|Crime/i, "mystery-crime"],
    [/Fantasy/i, "fantasy"],
    [/Sci(ence)?[- ]?Fi/i, "scifi"],
    [/Literary|Drama/i, "literary-drama"],
    [/Historical/i, "historical"],
    [/Fiction/i, "general-fiction"],
  ];

  const Genres = {
    REGISTRY,
    isFiction(type) {
      const t = String(type || "");
      return t.includes("Fiction") && !/non-?fiction/i.test(t);
    },
    JARGON_PACKS,
    DEFAULT_ID,
    list(family) {
      return REGISTRY.filter((p) => !family || p.family === family);
    },
    get(id) {
      return byId.get(id) || byId.get(DEFAULT_ID);
    },
    /** Map any stored manuscriptType string (current or legacy) to a profile. Unknown/empty -> General fiction. */
    resolve(manuscriptType) {
      const v = String(manuscriptType == null ? "" : manuscriptType).trim();
      if (byValue.has(v)) return byValue.get(v);
      for (const [re, id] of LEGACY_PATTERNS) if (re.test(v)) return byId.get(id);
      return byId.get(DEFAULT_ID);
    },
    jargon(id) {
      return JARGON_PACKS[id] || JARGON_PACKS.none;
    },
    /** Effective numeric parameters for a context (profile + jargon overlay). */
    params(ctx) {
      const p = Genres.resolve(ctx && ctx.manuscriptType);
      const j = Genres.jargon(ctx && ctx.genreJargon);
      return {
        profile: p,
        jargon: j,
        passiveCluster: p.passiveCluster + (j.passiveBonus || 0),
      };
    },
    /** One-line label for reports, e.g. "Fantasy (+ Legal / courtroom vocabulary)". */
    describe(ctx) {
      const { profile, jargon } = Genres.params(ctx);
      return jargon.id !== "none" ? `${profile.label} (+ ${jargon.label} vocabulary)` : profile.label;
    },
    /** Short text for AI prompts (genre + guidance). Never contains manuscript text. */
    promptNote(ctx) {
      const { profile, jargon } = Genres.params(ctx);
      const parts = [`Genre profile: ${profile.label}.`];
      if (profile.aiNote) parts.push(profile.aiNote);
      if (jargon.id !== "none") parts.push(`${jargon.label} terms are intentional.`);
      return parts.join(" ");
    },
    isMuted(profile, ruleId) {
      const id = String(ruleId || "");
      return (profile.muteRulePrefixes || []).some((pre) => id.startsWith(pre));
    },
    jargonTerms(ctx) {
      return Genres.jargon(ctx && ctx.genreJargon).terms;
    },
  };

  root.Genres = Genres;
})(typeof window !== "undefined" ? window : globalThis);
