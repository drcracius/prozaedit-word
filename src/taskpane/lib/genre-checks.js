window.ProzaEdit = window.ProzaEdit || {};

/**
 * PE-83: genre-aware, conservative, local-only checks.
 *  - tense drift  (tense:drift:<n>)  preference, hidden in Simple unless confidence high
 *  - POV drift    (pov:drift:<n>)    preference, always low confidence (hidden in Simple)
 *  - content notes (content:profanity / content:violence)  informational, opt-in, never judgmental
 * Dialogue/quoted text is excluded; flashback cues and past-perfect paragraphs are exempt.
 */
ProzaEdit.GenreChecks = {
  PAST: new Set("was were did went said saw came took made knew thought felt got gave told found stood sat ran heard left kept began held brought wrote asked looked turned walked".split(" ")),
  PRESENT: new Set("is are am does goes says sees comes takes makes knows thinks feels gives tells finds stands sits runs hears leaves keeps begins holds brings asks looks turns walks".split(" ")),
  // Words that read as past or present only in some contexts are excluded on purpose (had, has, would, could, will).
  FLASHBACK: /\b(years ago|months ago|back then|remember(?:ed|s)?|once upon|that (?:summer|night|winter|spring|autumn|day|morning)|when (?:i|he|she|we|they) (?:was|were)|as a (?:child|boy|girl|kid)|used to|had been|dear [a-z]+|diary|in those days|long before)\b/i,

  PROFANITY: ["fuck", "fucking", "fucked", "shit", "shitty", "bullshit", "asshole", "bastard", "bitch", "goddamn", "motherfucker", "piss", "pissed", "cunt"],
  VIOLENCE: ["stab", "stabbed", "stabbing", "slashed", "gunshot", "shot dead", "bleeding", "blood", "corpse", "gore", "gory", "murder", "murdered", "strangled", "beheaded", "dismembered", "skull", "slaughter", "massacre", "torture", "tortured", "wounded", "killed", "kill"],

  /** Allowed density (per 1,000 words) before a violence note appears; profanity uses a single count rule. */
  VIOLENCE_TOLERANCE: { "thriller-suspense": 9, "mystery-crime": 9, fantasy: 8, historical: 8, scifi: 8, romance: 4, "literary-drama": 5, "general-fiction": 5 },

  _narration(p) {
    return String(p).replace(/["\u201c][^"\u201d]*["\u201d]?/g, " ").replace(/\u2018[^\u2019]*\u2019/g, " ");
  },

  _tenseCounts(narration) {
    const words = narration.toLowerCase().match(/[a-z']+/g) || [];
    let past = 0;
    let present = 0;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (this.PAST.has(w)) past++;
      else if (this.PRESENT.has(w)) present++;
      else if (/^(he|she|they|i|we)$/.test(words[i - 1] || "") && /^[a-z]{3,}ed$/.test(w)) past++;
    }
    return { past, present, total: words.length };
  },

  _fictionProfile(ctx) {
    const gp = ctx && ctx._genre;
    return gp && gp.profile && gp.profile.family === "fiction" ? gp.profile : null;
  },

  tense(text, push, ctx) {
    const profile = this._fictionProfile(ctx);
    if (!profile) return;
    const paras = String(text).split(/\n\n+/);
    const stats = paras.map((p) => {
      const nar = this._narration(p);
      return { p, nar, ...this._tenseCounts(nar) };
    });
    const past = stats.reduce((n, s) => n + s.past, 0);
    const present = stats.reduce((n, s) => n + s.present, 0);
    const total = past + present;
    if (total < 15) return;
    const dominant = past >= present ? "past" : "present";
    const share = Math.max(past, present) / total;
    if (share < 0.75) return;
    const other = dominant === "past" ? "present" : "past";
    let n = 0;
    stats.forEach((s, idx) => {
      if (n >= 3) return;
      const mine = s[other];
      const theirs = s[dominant];
      if (mine < 3 || mine / (mine + theirs) < 0.85) return;
      if (this.FLASHBACK.test(s.nar)) return;
      if ((s.nar.match(/\bhad\b/gi) || []).length >= 2) return;
      // "High" (shown in Simple) only for a long, entirely off-tense block with no colon: a colon usually
      // introduces an embedded letter, message, prophecy or recipe, which is legitimately in another tense.
      const prevEndsColon = idx > 0 && /:\s*$/.test(paras[idx - 1]);
      const pure = theirs === 0 && mine >= 8 && share >= 0.8 && !/:/.test(s.p) && !prevEndsColon;
      n++;
      push({
        ruleId: `tense:drift:${idx}`,
        module: "Dialogue & Viewpoint (POV)",
        type: "preference",
        confidence: pure && profile.id !== "literary-drama" ? "high" : "low",
        explanation: `This passage reads as ${other} tense in a mostly ${dominant}-tense text. Fine if intentional (flashback, frame, voice); worth a look if not.`,
        targetText: s.p.trim().substring(0, 100),
        replacementText: "(check tense)",
      });
    });
  },

  pov(text, push, ctx) {
    const profile = this._fictionProfile(ctx);
    if (!profile) return;
    const paras = String(text).split(/\n\n+/);
    const FIRST = /\b(I|me|my|mine|myself)\b/g;
    const THIRD = /\b(he|she|him|her|his|hers)\b/gi;
    let thirdParas = 0;
    const drift = [];
    paras.forEach((p, idx) => {
      const nar = this._narration(p);
      const first = (nar.match(FIRST) || []).length;
      const third = (nar.match(THIRD) || []).length;
      if (third >= 2 && first === 0) thirdParas++;
      if (first >= 3 && !/^\s*(dear|\*)/i.test(p)) drift.push({ p, idx, first, third });
    });
    if (thirdParas < 4 || drift.length === 0 || drift.length > 2) return;
    drift.forEach((d) => {
      push({
        ruleId: `pov:drift:${d.idx}`,
        module: "Dialogue & Viewpoint (POV)",
        type: "preference",
        confidence: "low",
        explanation: "First-person narration appears in an otherwise third-person text. Fine for direct thought or an intentional shift; check it is deliberate.",
        targetText: d.p.trim().substring(0, 100),
        replacementText: "(check viewpoint)",
      });
    });
  },

  _count(lower, list) {
    let n = 0;
    const hits = [];
    list.forEach((w) => {
      const m = lower.match(new RegExp(`\\b${w}\\b`, "g"));
      if (m) {
        n += m.length;
        hits.push(w);
      }
    });
    return { n, hits };
  },

  contentNotes(text, push, ctx) {
    const lower = String(text).toLowerCase();
    const words = (lower.match(/[a-z']+/g) || []).length;
    if (words < 200) return;
    const gp = ctx && ctx._genre;
    const id = gp && gp.profile ? gp.profile.id : "general-fiction";
    const prof = this._count(lower, this.PROFANITY);
    if (prof.n >= 3) {
      push({
        ruleId: "content:profanity",
        module: "Content notes",
        type: "preference",
        confidence: "low",
        explanation: `Content note (informational): strong language appears ${prof.n} times (e.g. "${prof.hits[0]}"). Common in many genres and not an error; useful for content labels, age ratings or submission guidelines.`,
        targetText: prof.hits[0],
        replacementText: "(informational — no change needed)",
      });
    }
    const viol = this._count(lower, this.VIOLENCE);
    const perK = (viol.n / words) * 1000;
    const tol = this.VIOLENCE_TOLERANCE[id] != null ? this.VIOLENCE_TOLERANCE[id] : 5;
    if (viol.n >= 6 && perK > tol) {
      push({
        ruleId: "content:violence",
        module: "Content notes",
        type: "preference",
        confidence: "low",
        explanation: `Content note (informational): violent or injury-related words appear about ${perK.toFixed(1)} times per 1,000 words (${viol.n} total). Typical for some scenes and genres; useful for content labels and pacing awareness, not a judgment.`,
        targetText: viol.hits[0],
        replacementText: "(informational — no change needed)",
      });
    }
  },
};
