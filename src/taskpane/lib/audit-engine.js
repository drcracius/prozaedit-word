window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Audit = {
  PERSONA_WEIGHTS: {
    "Average Reader": { c: 0.35, p: 0.08 },
    "More Critical Reader": { c: 0.4, p: 0.1 },
    "NYT Best Seller Critic": { c: 0.45, p: 0.12 },
    "Very Harsh Senior Editor (9.0+ Target)": { c: 0.5, p: 0.15 },
  },

  _WORDCH: /[A-Za-z0-9_\u00C0-\u024F]/,

  /**
   * Whole-word phrase search on the (apostrophe-normalised, lower-cased) text. Returns the phrase as it appears in
   * the document (so Apply/Find locate it even with curly apostrophes or capitals) or null. Never matches inside a
   * longer word ("orbs" in "absorbs", "end result" in "friend resulting").
   */
  _find(text, lower, phrase) {
    const p = String(phrase || "").trim().toLowerCase().replace(/[\u2018\u2019]/g, "'");
    if (!p) return null;
    const W = this._WORDCH;
    let i = 0;
    let steps = 0;
    while ((i = lower.indexOf(p, i)) !== -1) {
      if (++steps > 100000) break;
      const b = lower[i - 1];
      const a = lower[i + p.length];
      const leftOk = !W.test(p[0]) || !b || !W.test(b);
      const rightOk = !W.test(p[p.length - 1]) || !a || !W.test(a);
      if (leftOk && rightOk) return text.length === lower.length ? text.substr(i, p.length) : p;
      i++;
    }
    return null;
  },

  /** True when phrase occurs as its own word, same capitals and apostrophes as written. A hit inside a longer word does not count. */
  _containsExact(text, phrase) {
    const p = String(phrase || "");
    if (!p) return false;
    const W = this._WORDCH;
    let i = 0;
    let steps = 0;
    while ((i = text.indexOf(p, i)) !== -1) {
      if (++steps > 100000) break;
      const b = text[i - 1];
      const a = text[i + p.length];
      const leftOk = !W.test(p[0]) || !b || !W.test(b);
      const rightOk = !W.test(p[p.length - 1]) || !a || !W.test(a);
      if (leftOk && rightOk) return true;
      i++;
    }
    return false;
  },

  /**
   * Apply only edits text that matches the card exactly (case-sensitive). A rule that quotes its own lowercase form
   * ("organize") while the document has "Organize" would give a card whose Apply always refuses; quote the document's
   * own spelling instead. An exact whole-word match is kept, so a later "in order to" is not rewritten to an earlier
   * "In order to", and a match buried inside a longer word ("orbs" in "absorbs") is not treated as the target.
   * The target's capitalisation is carried into the replacement either way, so a fix at a sentence start
   * ("In order to" -> "To") keeps its capital.
   */
  _alignToDocumentCase(item, text, lower) {
    const rep = String(item.replacementText || "");
    const target = String(item.targetText || "");
    if (!rep || rep.startsWith("(") || !target || text.length !== lower.length) return item;
    let actual = target;
    if (!this._containsExact(text, target)) {
      const hit = this._find(text, lower, target);
      if (!hit) return item;
      actual = hit;
    }
    let r = rep;
    const first = actual.charAt(0);
    if (actual.length > 1 && actual === actual.toUpperCase() && actual !== actual.toLowerCase()) r = rep.toUpperCase();
    else if (first !== first.toLowerCase() && rep.charAt(0) === rep.charAt(0).toLowerCase() && rep.charAt(0) !== rep.charAt(0).toUpperCase()) r = rep.charAt(0).toUpperCase() + rep.slice(1);
    if (actual === target && r === rep) return item;
    return { ...item, targetText: actual, replacementText: r };
  },

  includesWord(text, lower, phrase) {
    return this._find(text, lower, phrase) != null;
  },

  /** Grade formulas swing on a sentence. Wait until the passage is long enough to mean something. */
  MIN_READING_LEVEL_WORDS: 200,

  _noteReadingLevel(metrics, ctx, fiction, gp, push, text) {
    if (!metrics || metrics.wordCount < this.MIN_READING_LEVEL_WORDS) return;
    if (!((fiction && ctx.mPacing) || ctx.chkSpell)) return;
    const [gMin, gMax] = ProzaEdit.Metrics.targetGradeRange(ctx.targetAudience);
    const sample = String(text || "").trim().substring(0, 80);
    if (!fiction && metrics.fleschKincaidGrade < gMin - 2) {
      push({
        ruleId: "read:too_simple",
        module: "Pacing & Readability",
        type: "preference",
        explanation: `Reading level (~grade ${metrics.fleschKincaidGrade}) may be below target (${ctx.targetAudience}).`,
        targetText: sample,
        replacementText: "(raise lexical complexity)",
      });
    }
    if (metrics.fleschKincaidGrade > gMax + 2 + (gp ? gp.profile.fkSlack : 0)) {
      push({
        ruleId: "read:too_complex",
        module: "Pacing & Readability",
        type: "preference",
        explanation: `Reading level (~grade ${metrics.fleschKincaidGrade}) may exceed target (${ctx.targetAudience}).`,
        targetText: sample,
        replacementText: "(simplify syntax)",
      });
    }
  },

  isMuted(ruleId, mutedSet) {
    return mutedSet.has(ruleId);
  },

  _stripIneligibleFictionFlags(ctx) {
    const fiction = ProzaEdit.Genres ? ProzaEdit.Genres.isFiction(ctx.manuscriptType) : (String(ctx.manuscriptType || "").includes("Fiction") && !/non-?fiction/i.test(String(ctx.manuscriptType)));
    if (fiction) return ctx;
    return {
      ...ctx,
      mPlot: false,
      mMotivation: false,
      mDialogue: false,
      mContinuity: false,
      mPlausibility: false,
      mPacing: false,
      mSpoiler: false,
    };
  },

  /**
   * Known-name roster from the manuscript context index. Only a FRESH index is used (a stale one could
   * contain names the author has since renamed, which would create false variant flags).
   */
  _manuscriptRoster(ctx) {
    const idx = ctx && ctx.manuscriptContextIndex;
    if (!idx || typeof idx !== "object" || idx.invalid || !ctx.manuscriptContextFresh) return [];
    const MCI = ProzaEdit.ManuscriptContextIndex;
    if (MCI?.knownNames) return MCI.knownNames(idx, ctx.dictionary);
    return Array.isArray(idx.nameSeeds) ? idx.nameSeeds.slice(0, 80) : [];
  },

  run(text, ctx) {
    text = String(text || "");
    ctx = this._stripIneligibleFictionFlags(ctx || {});
    const roster = this._manuscriptRoster(ctx);
    const G = ProzaEdit.Genres;
    const gp = G ? G.params(ctx) : null;
    const genre = gp ? { id: gp.profile.id, label: G.describe(ctx), jargon: gp.jargon.id } : null;
    ctx = gp ? { ...ctx, _genre: gp } : ctx;
    const manuscriptContext = {
      indexPresent: !!(ctx.manuscriptContextIndex && !ctx.manuscriptContextIndex.invalid),
      used: roster.length > 0,
      namesUsed: roster.length,
    };
    const suggestions = [];
    let idSeq = 0;
    const muted = new Set(ctx.mutedRules || []);
    const dict = new Set((ctx.dictionary || []).concat(G ? G.jargonTerms(ctx) : []).map((d) => String(d).toLowerCase()));
    if (G && G.jargonTerms(ctx).length) ctx = { ...ctx, dictionary: (ctx.dictionary || []).concat(G.jargonTerms(ctx)) };
    const lower = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    const push = (item) => {
      if (!item.targetText || item.targetText.length > 255) return;
      if (!item.ruleId) {
        item.ruleId = `auto:${String(item.module || "rule").slice(0, 40)}:${String(item.targetText).slice(0, 40)}`.toLowerCase();
      }
      item = this._alignToDocumentCase(item, text, lower);
      if (muted.has(item.ruleId)) return;
      if (gp && G.isMuted(gp.profile, item.ruleId)) return;
      if (ProzaEdit.Settings?.isTargetDismissedGlobally?.(item.targetText)) return;
      suggestions.push({ ...item, id: item.id || `sug_${idSeq++}` });
    };

    const fiction = ProzaEdit.Genres ? ProzaEdit.Genres.isFiction(ctx.manuscriptType) : (String(ctx.manuscriptType || "").includes("Fiction") && !/non-?fiction/i.test(String(ctx.manuscriptType)));
    const anyFiction =
      fiction &&
      (ctx.mPlot || ctx.mMotivation || ctx.mDialogue || ctx.mContinuity || ctx.mPlausibility || ctx.mPacing || ctx.mSpoiler);
    const anyCore = ctx.contentNotes || ctx.chkRep || ctx.chkProp || ctx.chkSpell || ctx.chkAI || ctx.extendedLocal || anyFiction;
    if (!anyCore && !ctx.fkLock) {
      return {
        suggestions: [],
        metrics: ProzaEdit.Metrics.analyze(text),
        score: 10,
        traffic: ProzaEdit.Metrics.trafficLight(10),
        criticalCount: 0,
        prefCount: 0,
        manuscriptContext,
        genre,
      };
    }

    const steps = this._checkSteps({ text, lower, ...this._fictionSearch(text, lower, fiction), push, ctx, fiction, gp, roster });
    for (const step of steps) step.fn();

    const metrics = ProzaEdit.Metrics.analyze(text);
    this._noteReadingLevel(metrics, ctx, fiction, gp, push, text);

    const deduped = this._finalizeCards(suggestions, ctx);
    const persona = this.PERSONA_WEIGHTS[ctx.criticPersona] || this.PERSONA_WEIGHTS["Average Reader"];
    const criticalCount = deduped.filter((s) => s.type === "confirmed").length;
    const prefCount = deduped.filter((s) => s.type === "preference" && !String(s.ruleId).startsWith("content:")).length;
    let score = 10 - criticalCount * persona.c - prefCount * persona.p;
    if (score < 5) score = 5;
    score = Math.round(score * 10) / 10;
    const traffic = ProzaEdit.Metrics.trafficLight(score);
    const summary = ProzaEdit.MasterEngine?.Lanes?.summarize
      ? ProzaEdit.MasterEngine.Lanes.summarize(deduped, criticalCount, prefCount)
      : { total: deduped.length, critical: criticalCount, style: prefCount, byLane: {} };

    return { suggestions: deduped, metrics, score, traffic, criticalCount, prefCount, manuscriptContext, genre, summary };
  },

  /**
   * Same checks as run(), but yields between them so the pane can show which one is active.
   * @param {{ onPhase?: Function, yieldFn?: Function, cancelled?: Function }} [hooks]
   */
  async runWithProgress(text, ctx, hooks) {
    text = String(text || "");
    ctx = this._stripIneligibleFictionFlags(ctx || {});
    hooks = hooks || {};
    const roster = this._manuscriptRoster(ctx);
    const G = ProzaEdit.Genres;
    const gp = G ? G.params(ctx) : null;
    const genre = gp ? { id: gp.profile.id, label: G.describe(ctx), jargon: gp.jargon.id } : null;
    ctx = gp ? { ...ctx, _genre: gp } : ctx;
    const manuscriptContext = {
      indexPresent: !!(ctx.manuscriptContextIndex && !ctx.manuscriptContextIndex.invalid),
      used: roster.length > 0,
      namesUsed: roster.length,
    };
    const suggestions = [];
    let idSeq = 0;
    const muted = new Set(ctx.mutedRules || []);
    const dict = new Set((ctx.dictionary || []).concat(G ? G.jargonTerms(ctx) : []).map((d) => String(d).toLowerCase()));
    if (G && G.jargonTerms(ctx).length) ctx = { ...ctx, dictionary: (ctx.dictionary || []).concat(G.jargonTerms(ctx)) };
    const lower = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    const push = (item) => {
      if (!item.targetText || item.targetText.length > 255) return;
      if (!item.ruleId) {
        item.ruleId = `auto:${String(item.module || "rule").slice(0, 40)}:${String(item.targetText).slice(0, 40)}`.toLowerCase();
      }
      item = this._alignToDocumentCase(item, text, lower);
      if (muted.has(item.ruleId)) return;
      if (gp && G.isMuted(gp.profile, item.ruleId)) return;
      if (ProzaEdit.Settings?.isTargetDismissedGlobally?.(item.targetText)) return;
      suggestions.push({ ...item, id: item.id || `sug_${idSeq++}` });
    };
    const fiction = ProzaEdit.Genres
      ? ProzaEdit.Genres.isFiction(ctx.manuscriptType)
      : String(ctx.manuscriptType || "").includes("Fiction") && !/non-?fiction/i.test(String(ctx.manuscriptType));
    const anyFiction =
      fiction &&
      (ctx.mPlot || ctx.mMotivation || ctx.mDialogue || ctx.mContinuity || ctx.mPlausibility || ctx.mPacing || ctx.mSpoiler);
    const anyCore = ctx.contentNotes || ctx.chkRep || ctx.chkProp || ctx.chkSpell || ctx.chkAI || ctx.extendedLocal || anyFiction;
    const finish = (extra) => {
      const metrics = ProzaEdit.Metrics.analyze(text);
      this._noteReadingLevel(metrics, ctx, fiction, gp, push, text);
      const deduped = this._finalizeCards(suggestions, ctx);
      const persona = this.PERSONA_WEIGHTS[ctx.criticPersona] || this.PERSONA_WEIGHTS["Average Reader"];
      const criticalCount = deduped.filter((s) => s.type === "confirmed").length;
      const prefCount = deduped.filter((s) => s.type === "preference" && !String(s.ruleId).startsWith("content:")).length;
      let score = 10 - criticalCount * persona.c - prefCount * persona.p;
      if (score < 5) score = 5;
      score = Math.round(score * 10) / 10;
      const summary = ProzaEdit.MasterEngine?.Lanes?.summarize
        ? ProzaEdit.MasterEngine.Lanes.summarize(deduped, criticalCount, prefCount)
        : { total: deduped.length, critical: criticalCount, style: prefCount, byLane: {} };
      return {
        suggestions: deduped,
        metrics,
        score,
        traffic: ProzaEdit.Metrics.trafficLight(score),
        criticalCount,
        prefCount,
        manuscriptContext,
        genre,
        summary,
        ...(extra || {}),
      };
    };
    if (!anyCore && !ctx.fkLock) {
      return {
        suggestions: [],
        metrics: ProzaEdit.Metrics.analyze(text),
        score: 10,
        traffic: ProzaEdit.Metrics.trafficLight(10),
        criticalCount: 0,
        prefCount: 0,
        manuscriptContext,
        genre,
        completedPhaseIds: [],
        skippedPhaseIds: [],
        failedPhaseIds: [],
      };
    }
    const steps = this._checkSteps({ text, lower, ...this._fictionSearch(text, lower, fiction), push, ctx, fiction, gp, roster });
    const completedPhaseIds = [];
    const skippedPhaseIds = [];
    const failedPhaseIds = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (typeof hooks.cancelled === "function" && hooks.cancelled()) {
        for (let j = i; j < steps.length; j++) skippedPhaseIds.push(steps[j].id);
        const partial = finish({
          stoppedEarly: completedPhaseIds.length > 0,
          completedPhaseIds: completedPhaseIds.slice(),
          skippedPhaseIds,
          failedPhaseIds,
        });
        const err = new Error("Cancelled");
        err.code = "PE_CANCELLED";
        err.partial = completedPhaseIds.length ? partial : null;
        throw err;
      }
      if (typeof hooks.onPhase === "function") hooks.onPhase({ id: step.id, label: step.label, state: "start" });
      if (typeof hooks.yieldFn === "function") await hooks.yieldFn();
      try {
        step.fn();
      } catch (e) {
        if (e && e.code === "PE_CANCELLED") throw e;
        failedPhaseIds.push(step.id);
        if (typeof hooks.onPhase === "function") hooks.onPhase({ id: step.id, label: step.label, state: "error" });
        continue;
      }
      completedPhaseIds.push(step.id);
      if (typeof hooks.onPhase === "function") hooks.onPhase({ id: step.id, label: step.label, state: "done" });
    }
    return finish({ stoppedEarly: false, completedPhaseIds, skippedPhaseIds: [], failedPhaseIds });
  },

  /** Same length as text. A quote pair is blanked only when it closes before the next line break. A stray opener is left in place, so later lines still count. A curly apostrophe inside a word does not end a quote. Straight apostrophes stay. One pass, so a long run of quote marks cannot stall the check. */
  blankQuotedSpeech(text) {
    const s = String(text || "");
    const n = s.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = s[i];
    let mode = "";
    let open = -1;
    const commit = (to) => {
      for (let k = open; k <= to; k++) out[k] = " ";
      mode = "";
      open = -1;
    };
    for (let i = 0; i < n; i++) {
      const ch = s[i];
      if (ch === "\n" || ch === "\r" || ch === "\u000b" || ch === "\u000c" || ch === "\u2028" || ch === "\u2029") {
        mode = "";
        open = -1;
        continue;
      }
      if (!mode) {
        if (ch === '"' || ch === "\u201c" || ch === "\u2018" || ch === "\u00ab") {
          mode = ch;
          open = i;
        }
        continue;
      }
      if (mode === '"' && ch === '"') commit(i);
      else if (mode === "\u201c" && ch === "\u201d") commit(i);
      else if (mode === "\u00ab" && ch === "\u00bb") commit(i);
      else if (mode === "\u2018" && ch === "\u2019" && !/[A-Za-z]/.test(s[i + 1] || "")) commit(i);
    }
    return out.join("");
  },

  /**
   * Closed quote spans in document order. Same pairing rules as blankQuotedSpeech.
   * Dialogue tools read these; narrator tools use the blanked copy instead.
   */
  quotedSpeechSpans(text) {
    const s = String(text || "");
    const spans = [];
    let mode = "";
    let open = -1;
    const close = (to) => {
      if (open >= 0 && to >= open && spans.length < 200) {
        spans.push({ start: open, end: to, text: s.slice(open, to + 1) });
      }
      mode = "";
      open = -1;
    };
    for (let i = 0; i < s.length && spans.length < 200; i++) {
      const ch = s[i];
      if (ch === "\n" || ch === "\r" || ch === "\u000b" || ch === "\u000c" || ch === "\u2028" || ch === "\u2029") {
        mode = "";
        open = -1;
        continue;
      }
      if (!mode) {
        if (ch === '"' || ch === "\u201c" || ch === "\u2018" || ch === "\u00ab") {
          mode = ch;
          open = i;
        }
        continue;
      }
      if (mode === '"' && ch === '"') close(i);
      else if (mode === "\u201c" && ch === "\u201d") close(i);
      else if (mode === "\u00ab" && ch === "\u00bb") close(i);
      else if (mode === "\u2018" && ch === "\u2019" && !/[A-Za-z]/.test(s[i + 1] || "")) close(i);
    }
    return spans;
  },

  _fictionSearch(text, lower, fiction) {
    if (!fiction) return { searchText: text, searchLower: lower };
    const searchText = this.blankQuotedSpeech(text);
    return { searchText, searchLower: searchText.toLowerCase().replace(/[\u2018\u2019]/g, "'") };
  },

  /** Ordered checks that run() actually executes. Ids match Checks toggles when one exists. */
  _checkSteps(env) {
    const { text, lower, searchText, searchLower, push, ctx, fiction, gp, roster } = env;
    const hay = searchText || text;
    const hayLower = searchLower || lower;
    const steps = [];
    const add = (id, label, fn) => steps.push({ id, label, fn });
    if (ctx.chkRep) add("chkRep", "Repetition", () => this._repetition(hay, hayLower, push));
    if (ctx.chkProp) {
      add("chkProp", "Names", () => {
        ProzaEdit.ProperNoun.findInconsistencies(text, ctx.dictionary, { knownNames: roster }).forEach(push);
      });
    }
    if (ctx.chkSpell) add("chkSpell", "Proofreading", () => this._proofing(text, lower, push, ctx.language));
    if (ctx.chkAI) add("chkAI", "AI-like phrasing", () => this._aiVoice(text, lower, push, ctx));
    if (ctx.chkAIDetection) add("chkAIDetection", "AI-style patterns", () => this._aiDetectionHeuristic(text, lower, push));
    if (fiction) {
      if (ctx.mPlot) {
        add("mPlot", "Plot", () => this._plot(text, lower, push, ctx));
        add("passStructure", "Structure notes", () => ProzaEdit.EditPasses?.structureNotes(text, push, ctx));
      }
      if (ctx.mMotivation) add("mMotivation", "Characters", () => this._motivation(hay, hayLower, push, ctx));
      if (ctx.mDialogue) {
        add("mDialogue", "Dialogue", () => this._dialogue(text, lower, push, ctx));
        add("passDialogue", "Dialogue notes", () => ProzaEdit.EditPasses?.dialogueNotes(text, push, ctx));
      }
      if (ctx.mContinuity) add("mContinuity", "Continuity", () => this._continuity(hay, hayLower, push));
      if (ctx.mPlausibility) add("mPlausibility", "Plausibility", () => this._plausibility(hay, hayLower, push));
      if (ctx.mPacing) add("mPacing", "Pacing", () => this._pacing(hay, hayLower, push, ctx));
      if (ctx.mSpoiler) add("mSpoiler", "Spoilers", () => this._spoiler(hay, hayLower, push));
      if (gp && (ctx.mPacing || ctx.mDialogue || ctx.mMotivation)) {
        add("genreCraft", "Genre craft", () => this._genreCraft(hay, hayLower, push, ctx, gp));
      }
    }
    if (ctx.chkSpell) {
      add("chkSpellStyle", "Style guide", () => {
        this._manuscriptRules(text, lower, push, ctx);
        if (ProzaEdit.StyleGuideRules?.apply) ProzaEdit.StyleGuideRules.apply(hay, hayLower, push, ctx);
        if (ctx.language === "en-GB") this._gbIseIze(text, lower, push);
      });
    }
    if (ctx.chkRep || ctx.chkSpell) {
      add("editorHeuristics", "House style", () => {
        if (ProzaEdit.EditorHeuristics?.runStandardChecks) ProzaEdit.EditorHeuristics.runStandardChecks(text, push, ctx);
      });
    }
    if (fiction && ctx.mDialogue && ProzaEdit.GenreChecks) {
      add("tensePov", "Tense and viewpoint", () => {
        ProzaEdit.GenreChecks.tense(text, push, ctx);
        ProzaEdit.GenreChecks.pov(text, push, ctx);
      });
    }
    if (ctx.contentNotes && ProzaEdit.GenreChecks) {
      add("contentNotes", "Content notes", () => ProzaEdit.GenreChecks.contentNotes(text, push, ctx));
    }
    if (ctx.extendedLocal) add("extendedLocal", "Deeper local pass", () => this._extendedLocalPass(text, lower, push, ctx));
    if ((fiction && ctx.mPacing) || ctx.chkRep) add("rhythm", "Rhythm", () => this._rhythmMonotony(fiction ? hay : text, push));
    if (ctx.chkRep || ctx.chkAI) add("passLine", "Line notes", () => ProzaEdit.EditPasses?.lineNotes(fiction ? hay : text, push, ctx));
    if (ctx.fkLock) add("fkLock", "Reading level", () => this._fkLockFlag(text, push, ctx));
    if (fiction && ctx.mPacing) add("sensory", "Sensory detail", () => this._sensoryWeakSpot(hay, push));
    if (!fiction && gp && ctx.chkSpell) add("nonfiction", "Clarity", () => this._nonfictionClarity(text, push, ctx, gp));
    if (
      ProzaEdit.MasterEngine &&
      ProzaEdit.MasterEngine.contributeSupplemental &&
      (ctx.chkSpell || ctx.chkRep || ctx.mDialogue)
    ) {
      add("masterCore", "Phrase and grammar", () => {
        try {
          ProzaEdit.MasterEngine.contributeSupplemental(text, ctx).forEach(push);
        } catch (_) {}
      });
    }
    return ProzaEdit.EditPasses?.sortSteps ? ProzaEdit.EditPasses.sortSteps(steps) : steps;
  },

  LOW_CONFIDENCE_PREFIXES: ["rep:pair", "rep:soft", "rep:echo", "plot:", "ai:detect", "gb:", "ext:dash", "ext:emdash", "ext:repeat", "edit:among", "edit:ie_density", "edit:duplsent", "edit:num:", "edit:hyphen:", "edit:prefix", "sg:writegood:", "pov:", "tense:", "content:", "sense:sparse", "genre:filter_words", "genre:adverb_density", "genre:tag_adverbs", "craft:tag_adverb", "craft:rhythm", "rule:", "phrase:", "edit:aan", "edit:cap", "edit:open", "setting:", "read:", "rhythm:", "plaus:", "mot:", "cont:", "fk:"],

  /** high = objective (typo-class); medium = style judgment; low = noisy heuristic (hidden in Simple view by default). */
  confidenceFor(item) {
    if (item.confidence) return item.confidence;
    const id = String(item.ruleId || "");
    if (this.LOW_CONFIDENCE_PREFIXES.some((p) => id.startsWith(p))) return "low";
    return item.type === "confirmed" ? "high" : "medium";
  },

  _finalizeCards(suggestions, ctx) {
    const maxCards = ProzaEdit.ReportDensity?.maxCards?.(ctx && ctx.reportDensity) || 60;
    return this._dedupe(suggestions).slice(0, maxCards).map((x) => {
      const confidence = this.confidenceFor(x);
      const lane = ProzaEdit.MasterEngine?.Lanes?.forRuleId
        ? ProzaEdit.MasterEngine.Lanes.forRuleId(x.ruleId, x)
        : x.lane || "Clarity";
      return { ...x, confidence, lane };
    });
  },

  /** Same target + type collapses to one card; the highest-confidence rule wins. A house rule on that phrase wins over a built-in, even across types. */
  _isHouseRule(item) {
    const id = String(item?.ruleId || "");
    return id.startsWith("sg:custom:") && id !== "sg:custom:empty";
  },

  _dedupe(list) {
    const rank = { high: 3, medium: 2, low: 1 };
    const phrase = (s) =>
      String(s.targetText || "")
        .toLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .trim()
        .replace(/\s+/g, " ");
    const housePhrases = new Set();
    list.forEach((s) => {
      const t = phrase(s);
      if (t && t.length >= 3 && !this.PAIR_STOPWORDS.has(t) && this._isHouseRule(s)) housePhrases.add(t);
    });
    const bestIdx = new Map();
    const keys = list.map((s) => {
      const t = phrase(s);
      if (!t) return null;
      const spelling = String(s.ruleId || "").startsWith("spell:");
      return housePhrases.has(t) && !spelling ? `house:${t}` : `${t}|${s.type}`;
    });
    list.forEach((s, i) => {
      if (!keys[i]) return;
      const cur = bestIdx.get(keys[i]);
      if (cur == null) {
        bestIdx.set(keys[i], i);
        return;
      }
      const curHouse = this._isHouseRule(list[cur]);
      const nextHouse = this._isHouseRule(s);
      if (nextHouse !== curHouse) {
        if (nextHouse) bestIdx.set(keys[i], i);
        return;
      }
      if ((rank[this.confidenceFor(s)] || 0) > (rank[this.confidenceFor(list[cur])] || 0)) bestIdx.set(keys[i], i);
    });
    return list.filter((s, i) => !keys[i] || bestIdx.get(keys[i]) === i);
  },

  PAIR_STOPWORDS: new Set("a an the and or but nor so yet of in on at to for from by with as into onto over under about than then that this these those it its is are was were be been being am i me my we us our you your he him his she her they them their will would could should can did do does had has have not no said asked said there here when what who which if up out off down all just".split(" ")),

  _repetition(text, lower, push) {
    (ProzaEdit.LexicalBanks?.PLEONASMS || []).forEach(([target, replacement]) => {
      const hit = this._find(text, lower, target);
      if (hit) {
        push({
          ruleId: `rep:pleo:${target}`,
          module: "Repetition & Redundancy",
          type: "confirmed",
          explanation: "Pleonasm / tautology.",
          targetText: hit,
          replacementText: replacement,
        });
      }
    });
    (ProzaEdit.LexicalBanks?.PLEONASMS_SOFT || []).forEach(([target, replacement]) => {
      const hit = this._find(text, lower, target);
      if (hit) {
        push({
          ruleId: `rep:soft:${target}`,
          module: "Repetition & Redundancy",
          type: "preference",
          confidence: "low",
          explanation: "Common doublet; often deliberate emphasis or a fixed phrase.",
          targetText: hit,
          replacementText: "(optional: tighten)",
        });
      }
    });
    const words = (lower.match(/\b[\w'-]+\b/g) || []).slice(0, 80000);
    let n = 0;
    const seen = new Map();
    for (let i = 0; i < words.length - 1 && n < 16; i++) {
      const pair = `${words[i]} ${words[i + 1]}`;
      const prev = seen.get(pair);
      if (this.PAIR_STOPWORDS.has(words[i]) || this.PAIR_STOPWORDS.has(words[i + 1])) {
        seen.set(pair, i);
        continue;
      }
      if (prev != null && i - prev <= 50) {
        push({
          ruleId: `rep:pair:${pair}`,
          module: "Repetition & redundancy",
          type: "preference",
          explanation: `Repeated word pair within 50 words: "${pair}".`,
          targetText: pair,
          replacementText: "(vary phrasing)",
        });
        n++;
      }
      seen.set(pair, i);
    }
  },

  _inflectDialect(matched, fromRoot, toRoot) {
    const src = String(matched || "");
    const lower = src.toLowerCase();
    const root = String(fromRoot || "").toLowerCase();
    const to = String(toRoot || "");
    if (!to || !lower.startsWith(root)) return "(align spelling)";
    const ending = lower.slice(root.length);
    if (ending && !/^(s|d|ed|ing)$/.test(ending)) return "(align spelling)";
    let rep = to + ending;
    if (src.charAt(0) !== src.charAt(0).toLowerCase()) rep = rep.charAt(0).toUpperCase() + rep.slice(1);
    return rep;
  },

  _proofing(text, lower, push, language) {
    if (/\S {2,}\S/.test(text)) {
      push({
        ruleId: "spell:double_space",
        module: "Proofreading & Language",
        type: "preference",
        explanation: "Double space.",
        targetText: "  ",
        replacementText: " ",
      });
    }
    // A word, closing quote or bracket + one space + punctuation + whitespace/end. Excludes spaced ellipses
    // (". . ."), decimals (" .5"), emoticons (" :)") and ratios/times (" : " between digits).
    const spaced = [
      [",", /[A-Za-z\u00C0-\u024F\d"\u201D)\]] ,(?=\s|$)/],
      [";", /[A-Za-z\u00C0-\u024F\d"\u201D)\]] ;(?=\s|$)/],
      [".", /[A-Za-z\u00C0-\u024F"\u201D)\]] \.(?=\s|$)(?! \.)/],
      [":", /[A-Za-z\u00C0-\u024F] :(?=\s|$)/],
    ];
    spaced.forEach(([ch, re]) => {
      let ok = false;
      try {
        ok = re.test(text);
      } catch (_) {
        ok = false;
      }
      if (ok) {
        push({
          ruleId: `spell:punct:${ch}`,
          module: "Proofreading & Language",
          type: "preference",
          explanation: "Space before punctuation.",
          targetText: ` ${ch}`,
          replacementText: ch,
        });
      }
    });
    const uk = ["colour", "centre", "organise", "recognise", "favour", "behaviour", "defence", "analyse", "apologise", "neighbour", "honour", "labour", "flavour", "humour", "realise", "jewellery", "aluminium", "travelled", "theatre"];
    const us = ["color", "center", "organize", "recognize", "favor", "behavior", "defense", "analyze", "apologize", "neighbor", "honor", "labor", "flavor", "humor", "realize", "jewelry", "aluminum", "traveled", "theater"];
    const foreign = language === "en-GB" ? us : uk;
    const stripped = text.replace(/["\u201C][^"\u201C\u201D]*["\u201D]/g, (q) => " ".repeat(q.length));
    foreign.forEach((word) => {
      const suffix = word === "analyse" ? "(?:d|ed|ing)?" : "(?:s|d|ed|ing)?";
      const re = new RegExp(`(?:\\b${word}${suffix}\\b|(?:^|[.!?]\\s+)${word[0].toUpperCase()}${word.slice(1)}${suffix}\\b)`);
      const m = re.exec(stripped);
      if (m) {
        const native = (language === "en-GB" ? uk : us)[foreign.indexOf(word)];
        push({
          ruleId: `spell:dialect:${word}`,
          module: "Proofreading & Language",
          type: "preference",
          explanation: `Dialect mismatch for ${language}.`,
          targetText: m[0],
          replacementText: this._inflectDialect(m[0], word, native),
        });
      }
    });
  },

  _aiVoice(text, lower, push, ctx) {
    const found = [];
    (ProzaEdit.LexicalBanks?.AI_PHRASES || []).forEach((phrase) => {
      if (found.length >= 15) return;
      const gp = ctx && ctx._genre;
      if (gp && ProzaEdit.Genres.isMuted(gp.profile, `ai:voice:${phrase.trim()}`)) return;
      const biz = String(ctx?.manuscriptType || "").includes("Business");
      const jargon = (ProzaEdit.LexicalBanks?.BUSINESS_JARGON || []).some((row) => String(row[0]).toLowerCase() === phrase.trim().toLowerCase());
      if (biz && jargon) return;
      const hit = this._find(text, lower, phrase);
      if (!hit) return;
      // "The Old/New Testament", "last will and testament" and a literal tapestry/beacon are ordinary nouns.
      if (/^testament$/i.test(phrase.trim()) && /\b(old|new)\s+testament|will and testament/.test(lower)) return;
      found.push([phrase.trim(), hit]);
    });
    // A single common word ("realm", "beacon") is weak evidence of anything; show cards in Simple only when the
    // text stacks several template phrases.
    found.forEach(([phrase, hit]) => {
      push({
        ruleId: `ai:voice:${phrase}`,
        module: "Anti-AI Voice Directive",
        type: "preference",
        confidence: found.length >= 3 ? "medium" : "low",
        explanation: `Stock phrase "${phrase}". Say the concrete thing instead. This is a style hint, not proof the text was machine-written.`,
        targetText: hit,
        replacementText: "(cut or replace with a specific detail)",
      });
    });
    (ProzaEdit.AiProsePatterns?.scan(text, ctx) || []).forEach((row) => {
      push({
        ruleId: row.ruleId,
        module: "Anti-AI Voice Directive",
        type: "preference",
        confidence: row.confidence || "low",
        explanation: row.explanation,
        targetText: row.targetText,
        replacementText: "(edit by hand — cadence cut on Rewrite can drop a few stock openers)",
      });
    });
  },

  _aiDetectionHeuristic(text, lower, push) {
    const sentences = ProzaEdit.Metrics.splitSentences(text).filter(Boolean);
    if (sentences.length < 4) return;
    const lengths = sentences.map((s) => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, len) => sum + (len - avg) * (len - avg), 0) / Math.max(1, lengths.length);
    if (variance < 8 && avg > 12 && avg < 28) {
      push({
        ruleId: "ai:detect:uniform_sentences",
        module: "AI Detection (heuristic)",
        type: "preference",
        explanation: "Low sentence-length variance may resemble uniform AI cadence (heuristic only—not proof).",
        targetText: sentences[0].substring(0, 100),
        replacementText: "(vary rhythm)",
      });
    }
    const commaDensity = (text.match(/,/g) || []).length / Math.max(1, text.split(/\s+/).length);
    const aiPhrases = ProzaEdit.LexicalBanks?.AI_PHRASES || [];
    if (commaDensity > 0.12 && aiPhrases.some((p) => lower.includes(p.trim()))) {
      push({
        ruleId: "ai:detect:pattern_bundle",
        module: "AI Detection (heuristic)",
        type: "preference",
        explanation: "Combined AI-phrase + punctuation pattern (heuristic—not plagiarism proof).",
        targetText: "AI pattern bundle",
        replacementText: "(manual review)",
      });
    }
  },

  _plot(text, lower, push, ctx) {
    const last = ProzaEdit.Metrics.splitSentences(text.trim()).pop() || "";
    if (last.length > 20 && !/[?!]$/.test(last.trim()) && /\b(went|walked|left|arrived|sat)\b/i.test(last)) {
      push({
        ruleId: "plot:weak_hook",
        module: "Plot & Chapter Structure",
        type: "preference",
        explanation: "Section ending may lack hook (no question/tension beat).",
        targetText: last.substring(0, 120),
        replacementText: "(strengthen end beat)",
      });
    }
    if (ctx.criticPersona.includes("NYT") || ctx.criticPersona.includes("Harsh")) {
      const flat = (lower.match(/\b(nothing happened|they talked|some time passed)\b/g) || []).length;
      if (flat) {
        push({
          ruleId: "plot:flat_middle",
          module: "Plot & Chapter Structure",
          type: "preference",
          explanation: "Mid-scene momentum dip flagged for commercial pacing.",
          targetText: "nothing happened",
          replacementText: "(add obstacle/reversal)",
        });
      }
    }
  },

  _PASSIVE_ADJ: /^(?:tired|excited|pleased|surprised|interested|concerned|worried|related|limited|advanced|detailed|experienced|complicated|determined|supposed|used|skilled|qualified|dedicated|committed|motivated|informed|alarmed|embarrassed|bored|scared)$/i,

  _passiveCluster(text, push, opts) {
    const re = /\b(?:was|were|been|being|is|are)\s+(?:(?:\w+ly|not|also|then|later|often)\s+)?([a-z]+ed)\b/gi;
    const hits = [];
    let m;
    while ((m = re.exec(String(text || ""))) !== null && hits.length < 40) {
      if (!m[0]) {
        re.lastIndex++;
        continue;
      }
      if (!this._PASSIVE_ADJ.test(m[1])) hits.push(m[0]);
    }
    if (hits.length < opts.limit || String(text || "").length <= (opts.minLen || 0)) return;
    const card = {
      ruleId: opts.ruleId,
      module: opts.module,
      type: "preference",
      explanation: opts.explanation(hits.length),
      targetText: hits[0],
      replacementText: "(active verb)",
    };
    if (typeof opts.confidence === "function") card.confidence = opts.confidence(hits.length, opts.limit);
    push(card);
  },

  _motivation(text, lower, push, ctx) {
    const gp = ctx && ctx._genre;
    (gp ? gp.profile.weakCues : ["suddenly", "for some reason", "somehow", "started to", "began to"]).forEach((w) => {
      const hit = this._find(text, lower, w);
      if (hit) {
        push({
          ruleId: `mot:${w}`,
          module: "Characterization & Motivation",
          type: "preference",
          explanation: `Weak agency cue "${w}".`,
          targetText: hit,
          replacementText: "(show motive)",
        });
      }
    });
    this._passiveCluster(text, push, {
      ruleId: "mot:passive_cluster",
      module: "Characterization & Motivation",
      limit: gp ? gp.passiveCluster : 5,
      minLen: 0,
      explanation: () => "Passive voice cluster may reduce character agency.",
    });
  },

  _dialogue(text, lower, push, ctx) {
    const longChars = (ctx && ctx._genre && ctx._genre.profile.longDialogueChars) || 80;
    const spans = this.quotedSpeechSpans(text);
    let longDlg = 0;
    let bookisms = 0;
    const BOOKISM = /\b(exclaimed|retorted|interjected|opined|queried|mused|snarled|hissed|bellowed|chortled|intoned)\b/i;
    const flagLong = (snippet) => {
      if (longDlg >= 3) return;
      const spoken = String(snippet || "").length;
      longDlg++;
      push({
        ruleId: `dlg:long:${longDlg}`,
        module: "Dialogue & Viewpoint (POV)",
        type: "preference",
        confidence: spoken >= longChars * 2 ? "medium" : "low",
        explanation: "Long dialogue block—possible exposition dump.",
        targetText: String(snippet || "").trim().substring(0, 100),
        replacementText: "(break with beats)",
      });
    };
    spans.forEach((span) => {
      if ((span.text || "").length >= longChars) flagLong(span.text);
      if (bookisms >= 4) return;
      const after = String(text || "").slice(span.end + 1, span.end + 56);
      const tag = BOOKISM.exec(after);
      if (!tag) return;
      bookisms++;
      push({
        ruleId: `dlg:bookism:${tag[0].toLowerCase()}`,
        module: "Dialogue & Viewpoint (POV)",
        type: "preference",
        confidence: "low",
        explanation: `Heavy dialogue tag “${tag[0]}”. “Said” or an action beat is usually quieter.`,
        targetText: tag[0],
        replacementText: "said",
      });
    });
    if (longDlg >= 3) return;
    String(text || "").split(/\n/).some((line) => {
      if (longDlg >= 3) return true;
      const trimmed = line.trim();
      if (!/^["\u201c\u00ab]/.test(trimmed)) return false;
      if (/["\u201d\u00bb]/.test(trimmed.slice(1))) return false;
      if (trimmed.length < longChars) return false;
      flagLong(trimmed);
      return false;
    });
  },

  _continuity(text, lower, push) {
    const skips = lower.match(/\b(the next (day|morning|evening)|hours later|days later|weeks later|months later|years later)\b/g);
    if (skips && skips.length >= 2) {
      push({
        ruleId: "cont:time_skips",
        module: "Continuity & Chronology",
        type: "preference",
        explanation: "Multiple time jumps—verify timeline.",
        targetText: skips[0],
        replacementText: "(timestamp anchor)",
      });
    }
    if (/\b\d+\s*(miles|km|hours|minutes)\b/i.test(text) && /\b(instantly|immediately)\b/i.test(text)) {
      push({
        ruleId: "cont:travel_timing",
        module: "Continuity & Chronology",
        type: "preference",
        explanation: "Travel/timing terms conflict—check distances/durations.",
        targetText: "instantly",
        replacementText: "(realistic elapsed time)",
      });
    }
  },

  _plausibility(text, lower, push) {
    ["without a trace", "in an instant", "inexplicably", "100%", "everyone always", "nobody ever"].forEach((phrase) => {
      const hit = this._find(text, lower, phrase);
      if (hit) {
        push({
          ruleId: `plaus:${phrase}`,
          module: "Plausibility, Logic & Evidence",
          type: "preference",
          explanation: `Absolute/unearned claim "${phrase}".`,
          targetText: hit,
          replacementText: "(evidence on page)",
        });
      }
    });
  },

  _pacing(text, lower, push, ctx) {
    const sentences = ProzaEdit.Metrics.splitSentences(text);
    let longCount = 0;
    sentences.forEach((s) => {
      const wc = s.trim().split(/\s+/).filter(Boolean).length;
      const ls = ctx._genre ? ctx._genre.profile.longSentence : { harsh: 38, normal: 45 };
      const threshold = String(ctx.criticPersona || "").includes("Harsh") ? ls.harsh : ls.normal;
      if (wc >= threshold && longCount < 4) {
        longCount++;
        push({
          ruleId: `pace:long:${longCount}`,
          module: "Pacing, Readability & Transitions",
          type: "preference",
          confidence: wc >= threshold * 1.3 ? "medium" : "low",
          explanation: `Long sentence (~${wc} words).`,
          targetText: s.trim().substring(0, 120),
          replacementText: "(split)",
        });
      }
    });
  },

  /** Non-fiction long-sentence and passive-voice cards: preference severity; Simple view only for clear outliers. */
  _nonfictionClarity(text, push, ctx, gp) {
    const p = gp.profile;
    const ls = p.longSentence;
    const threshold = String(ctx.criticPersona || "").includes("Harsh") ? ls.harsh : ls.normal;
    let longCount = 0;
    ProzaEdit.Metrics.splitSentences(text).forEach((s) => {
      const wc = s.trim().split(/\s+/).filter(Boolean).length;
      if (wc >= threshold && longCount < 3) {
        longCount++;
        push({
          ruleId: `nf:long:${longCount}`,
          module: "Pacing & Readability",
          type: "preference",
          confidence: wc >= threshold * 1.5 ? "medium" : "low",
          explanation: `Long sentence (~${wc} words) for ${p.label.toLowerCase()}; consider splitting.`,
          targetText: s.trim().substring(0, 120),
          replacementText: "(split)",
        });
      }
    });
    this._passiveCluster(text, push, {
      ruleId: "nf:passive_cluster",
      module: "Pacing & Readability",
      limit: p.passiveCluster + 2,
      minLen: 300,
      confidence: (n, limit) => (n >= limit * 1.5 ? "medium" : "low"),
      explanation: (n) => `Many passive-voice constructions (~${n}); active voice is usually clearer in ${p.label.toLowerCase()}.`,
    });
  },

  _genreCraft(text, lower, push, ctx, gp) {
    const p = gp.profile;
    const label = p.label;
    p.cliches.forEach((c) => {
      const hit = this._find(text, lower, c);
      if (hit) {
        push({
          ruleId: `genre:cliche:${c}`,
          module: "Genre craft",
          type: "preference",
          explanation: `Common ${label} cliché — a fresher, more specific image will stand out.`,
          targetText: hit,
          replacementText: "(fresher image)",
        });
      }
    });
    const words = (text.match(/\b[\w'-]+\b/g) || []).length;
    if (words < 400) return;
    const per1k = (n) => (n * 1000) / words;
    const tagAdv = (text.match(/\b(said|asked|replied|whispered|shouted|muttered|answered|cried)\s+\w{3,}ly\b/gi) || []);
    if (tagAdv.length > p.tagAdverbMax) {
      push({
        ruleId: "genre:tag_adverbs",
        module: "Genre craft",
        type: "preference",
        explanation: `${tagAdv.length} dialogue tags carry an adverb (more than the usual ${p.tagAdverbMax} for ${label}); let the line or a beat show the tone.`,
        targetText: tagAdv[0],
        replacementText: "(show tone in the line)",
      });
    }
    const filters = text.match(/\b(felt|saw|noticed|watched|realized|realised|wondered|seemed|heard)\b/gi) || [];
    if (p.filterPer1k && per1k(filters.length) > p.filterPer1k) {
      push({
        ruleId: "genre:filter_words",
        module: "Genre craft",
        type: "preference",
        explanation: `Filter words (felt, saw, noticed…) run ~${Math.round(per1k(filters.length))} per 1,000 words; ${label} usually stays under ~${p.filterPer1k}.`,
        targetText: filters[0],
        replacementText: "(show the perception directly)",
      });
    }
    const NOT_ADV = /^(only|family|early|likely|lonely|friendly|silly|ugly|holy|july|apply|reply|supply|rely|belly|jelly|bully|ally|fly|lovely|lively|elderly|orderly|daily|gravelly|curly|chilly|hilly|jolly|rally|sally|molly|billy|willy|emily|anomaly|italy|assembly|butterfly|monopoly|multiply|comply|imply|homily|oily|surly|wily|deadly|costly|bubbly|kindly|cowardly)$/i;
    const adv = (text.match(/\b[a-z]{4,}ly\b/gi) || []).filter((w) => !NOT_ADV.test(w));
    if (per1k(adv.length) > p.adverbPer1k) {
      push({
        ruleId: "genre:adverb_density",
        module: "Genre craft",
        type: "preference",
        explanation: `-ly adverbs run ~${Math.round(per1k(adv.length))} per 1,000 words (${label} norm ~${p.adverbPer1k}); strengthen a few verbs instead.`,
        targetText: adv[0],
        replacementText: "(stronger verb)",
      });
    }
  },

  _spoiler(text, lower, push) {
    (ProzaEdit.LexicalBanks?.SPOILER_PHRASES || []).forEach((phrase) => {
      const hit = this._find(text, lower, phrase);
      if (hit) {
        push({
          ruleId: `spoiler:${phrase}`,
          module: "Spoiler Control & Reveal Timing",
          type: "preference",
          explanation: "Narrator telegraphs future outcome.",
          targetText: hit,
          replacementText: "(delay reveal)",
        });
      }
    });
  },

  _rhythmMonotony(text, push) {
    if (!ProzaEdit.DocAnalytics?.sentenceWordCounts) return;
    const lengths = ProzaEdit.DocAnalytics.sentenceWordCounts(text);
    const run = ProzaEdit.DocAnalytics.findMonotonyRun(lengths);
    if (!run) return;
    push({
      ruleId: "rhythm:monotony",
      module: "Pacing & Readability",
      type: "preference",
      explanation: `${run.len} sentences in a row ~${run.avg} words — vary rhythm (monotony zone).`,
      targetText: `(sentence block ~${run.avg} words)`,
      replacementText: "(vary length)",
    });
  },

  _fkLockFlag(text, push, ctx) {
    const metrics = ProzaEdit.Metrics.analyze(text);
    const [gMin, gMax] = ProzaEdit.Metrics.targetGradeRange(ctx.targetAudience || "Adult");
    const fk = metrics.fleschKincaidGrade;
    if (fk > gMax + 1 || fk < gMin - 1.5) {
      push({
        ruleId: "fk:lock",
        module: "Pacing & Readability",
        type: "preference",
        explanation: `FK lock: grade ~${fk} outside target ${gMin}–${gMax} for ${ctx.targetAudience}.`,
        targetText: text.trim().substring(0, 80),
        replacementText: "(adjust complexity)",
      });
    }
  },

  _gbIseIze(text, lower, push) {
    const pairs = [
      ["organize", "organise"],
      ["recognize", "recognise"],
      ["analyze", "analyse"],
      ["finalize", "finalise"],
    ];
    pairs.forEach(([us, uk]) => {
      if (new RegExp(`\\b${us}\\b`, "i").test(text)) {
        push({
          ruleId: `gb:${us}`,
          module: "Proofreading & Language",
          type: "preference",
          explanation: `US spelling "${us}" in en-GB document — prefer "${uk}".`,
          targetText: us,
          replacementText: uk,
        });
      }
    });
  },

  _sensoryWeakSpot(text, push) {
    if (!ProzaEdit.ManuscriptOverview?.sensoryCounts) return;
    const s = ProzaEdit.ManuscriptOverview.sensoryCounts(text);
    const zero = ["sight", "sound", "touch", "smell", "taste"].filter((k) => (s[k] || 0) === 0);
    if (zero.length >= 3 && text.length > 400) {
      push({
        ruleId: "sense:sparse",
        module: "Setting Anchor",
        type: "preference",
        explanation: `Sparse sensory cues (missing: ${zero.join(", ")}) in this excerpt.`,
        targetText: "(sensory grounding)",
        replacementText: "(add concrete sense detail)",
      });
    }
  },

  _extendedLocalPass(text, lower, push, ctx) {
    ctx = ctx || {};
    const narration = this.blankQuotedSpeech ? this.blankQuotedSpeech(text) : text.replace(/["\u201C][^"\u201C\u201D]*["\u201D]/g, (q) => " ".repeat(q.length));
    (ProzaEdit.LexicalBanks?.EXTENDED_FILLERS || []).forEach(([word, hint]) => {
      if (new RegExp(`\\b${word}\\b`, "i").test(narration)) {
        push({
          ruleId: `ext:filler:${word}`,
          module: "Deeper local pass",
          type: "preference",
          explanation: `Filler/intensifier “${word}” — tighten prose (${hint}).`,
          targetText: word,
          replacementText: "(remove filler)",
        });
      }
    });
    const words = lower.match(/\b[a-z']{4,}\b/g) || [];
    const freq = new Map();
    words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
    let rep = 0;
    [...freq.entries()]
      .filter(([w, c]) => {
        if (c < 8 || this.PAIR_STOPWORDS.has(w) || ["with", "from", "have", "about", "back", "into", "like", "what", "their"].includes(w)) return false;
        const cap = (text.match(new RegExp(`\\b${w[0].toUpperCase()}${w.slice(1)}\\b`, "g")) || []).length;
        return cap < c * 0.5;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([w, c]) => {
        if (rep >= 4) return;
        rep++;
        push({
          ruleId: `ext:repeat:${w}`,
          module: "Deeper local pass",
          type: "preference",
          explanation: `Word “${w}” appears ~${c} times in excerpt—consider synonyms (Thesaurus tab, Datamuse, free).`,
          targetText: w,
          replacementText: "(vary diction)",
        });
      });
    const hyphens = (text.match(/-/g) || []).length;
    const enDash = (text.match(/–/g) || []).length;
    const emDash = (text.match(/—/g) || []).length;
    if (hyphens >= 8 && (enDash > 0 || emDash > 0)) {
      push({
        ruleId: "ext:dash_mix",
        module: "Deeper local pass",
        type: "preference",
        explanation: "Hyphens appear alongside en/em dashes — check dash style is consistent. Compound words keep their hyphens; review by hand.",
        targetText: "-",
        replacementText: "(manual review)",
      });
    }
    const wordCount = (text.match(/\S+/g) || []).length;
    if (emDash >= 6 && (emDash * 1000) / Math.max(1, wordCount) >= 12) {
      push({
        ruleId: "ext:emdash",
        module: "Deeper local pass",
        type: "preference",
        explanation: "Heavy em-dash use—consider whether some could be commas or sentence breaks. Dashes are normal for interrupted speech, so review by hand.",
        targetText: "—",
        replacementText: "(manual review)",
      });
    }
    if (ProzaEdit.EditorHeuristics?.runExtendedChecks) {
      ProzaEdit.EditorHeuristics.runExtendedChecks(text, push, ctx);
    }
  },

  _manuscriptRules(text, lower, push, ctx) {
    const t = ctx.manuscriptType;
    if (t.includes("Academic")) {
      const unquoted = text.replace(/["\u201c][^"\u201d]*["\u201d]/g, (q) => " ".repeat(q.length));
      const cm = /\b[A-Za-z]+n['\u2019]t\b|\b(?:it|that|there|here|let|I|you|we|they)['\u2019](?:s|m|re|ve|ll|d)\b/i.exec(unquoted);
      if (cm) {
        const key = cm[0].toLowerCase().replace(/\u2019/g, "'");
        const exp = ProzaEdit.LexicalBanks?.CONTRACTIONS?.[key];
        push({
          ruleId: "acad:contraction",
          module: "Academic Paper / Journal",
          type: "preference",
          explanation: "Contractions discouraged in formal academic prose.",
          targetText: cm[0],
          replacementText: exp || "(spell out)",
        });
      }
      if (!/\([A-Za-z][^)]*\d{4}[a-z]?\)/.test(text) && text.length > 800) {
        push({
          ruleId: "acad:citation_hint",
          module: "Academic Paper / Journal",
          type: "preference",
          explanation: "No parenthetical citations detected in this excerpt (Author, Year).",
          targetText: text.substring(0, 60),
          replacementText: "(add citation)",
        });
      }
    }
    if (t.includes("Business")) {
      (ProzaEdit.LexicalBanks?.BUSINESS_JARGON || []).forEach(([phrase, replacement]) => {
        const hit = this._find(text, lower, phrase);
        if (!hit) return;
        const rep = replacement || "(plain term)";
        const open = String(rep).startsWith("(");
        push({
          ruleId: `biz:${phrase}`,
          module: "Business / Corporate Report",
          type: "preference",
          ...(open ? { confidence: "low" } : {}),
          explanation: `Corporate jargon "${hit}"—prefer plain action language.`,
          targetText: hit,
          replacementText: rep,
        });
      });
    }
    if (t.includes("Technical / Journalism")) {
      const firstPara = text.split(/\n\n+/)[0] || text.substring(0, 300);
      if (firstPara.length > 280) {
        push({
          ruleId: "journal:lede_long",
          module: "Technical / Journalism",
          type: "preference",
          explanation: "Opening block is long—consider a tighter lede.",
          targetText: firstPara.substring(0, 100),
          replacementText: "(short lede)",
        });
      }
    }
    if (ctx.settingAnchor && ctx.settingAnchor.length > 3) {
      const city = ctx.settingAnchor.split(",")[0].trim();
      if (city.length > 2 && !lower.includes(city.toLowerCase()) && text.length > 1500) {
        push({
          ruleId: "setting:anchor_drift",
          module: "Setting Anchor",
          type: "preference",
          explanation: `Setting anchor "${city}" not referenced in this long excerpt.`,
          targetText: city,
          replacementText: "(ground scene locally)",
        });
      }
    }
  },
};

Object.defineProperties(ProzaEdit.Audit, {
  PLEONASMS: { get() { return ProzaEdit.LexicalBanks.PLEONASMS; }, enumerable: true },
  AI_PHRASES: { get() { return ProzaEdit.LexicalBanks.AI_PHRASES; }, enumerable: true },
  SPOILER_PHRASES: { get() { return ProzaEdit.LexicalBanks.SPOILER_PHRASES; }, enumerable: true },
});
