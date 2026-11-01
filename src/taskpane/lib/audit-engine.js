window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Audit = {
  PERSONA_WEIGHTS: {
    "Average Reader": { c: 0.35, p: 0.08 },
    "More Critical Reader": { c: 0.4, p: 0.1 },
    "NYT Best Seller Critic": { c: 0.45, p: 0.12 },
    "Very Harsh Senior Editor (9.0+ Target)": { c: 0.5, p: 0.15 },
  },

  includesWord(text, lower, phrase) {
    const p = phrase.trim().toLowerCase();
    if (!p) return false;
    if (p.includes(" ") || p.length > 8) return lower.includes(p);
    return new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
  },

  isMuted(ruleId, mutedSet) {
    return mutedSet.has(ruleId);
  },

  _stripIneligibleFictionFlags(ctx) {
    const fiction = String(ctx.manuscriptType || "").includes("Fiction");
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
    const lower = text.toLowerCase();
    const push = (item) => {
      if (!item.targetText || item.targetText.length > 255) return;
      if (!item.ruleId) {
        item.ruleId = `auto:${String(item.module || "rule").slice(0, 40)}:${String(item.targetText).slice(0, 40)}`.toLowerCase();
      }
      if (muted.has(item.ruleId)) return;
      if (gp && G.isMuted(gp.profile, item.ruleId)) return;
      if (ProzaEdit.Settings?.isTargetDismissedGlobally?.(item.targetText)) return;
      suggestions.push({ ...item, id: item.id || `sug_${idSeq++}` });
    };

    const fiction = String(ctx.manuscriptType || "").includes("Fiction");
    const anyFiction =
      fiction &&
      (ctx.mPlot || ctx.mMotivation || ctx.mDialogue || ctx.mContinuity || ctx.mPlausibility || ctx.mPacing || ctx.mSpoiler);
    const anyCore = ctx.chkRep || ctx.chkProp || ctx.chkSpell || ctx.chkAI || ctx.extendedLocal || anyFiction;
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

    if (ctx.chkRep) this._repetition(text, lower, push);
    if (ctx.chkProp) {
      ProzaEdit.ProperNoun.findInconsistencies(text, ctx.dictionary, { knownNames: roster }).forEach(push);
    }
    if (ctx.chkSpell) this._proofing(text, lower, push, ctx.language);
    if (ctx.chkAI) this._aiVoice(text, lower, push);
    if (ctx.chkAIDetection) this._aiDetectionHeuristic(text, lower, push);

    if (fiction) {
      if (ctx.mPlot) this._plot(text, lower, push, ctx);
      if (ctx.mMotivation) this._motivation(text, lower, push, ctx);
      if (ctx.mDialogue) this._dialogue(text, lower, push, ctx);
      if (ctx.mContinuity) this._continuity(text, lower, push);
      if (ctx.mPlausibility) this._plausibility(text, lower, push);
      if (ctx.mPacing) this._pacing(text, lower, push, ctx);
      if (ctx.mSpoiler) this._spoiler(text, lower, push);
      if (gp && (ctx.mPacing || ctx.mDialogue || ctx.mMotivation)) this._genreCraft(text, lower, push, ctx, gp);
    }

    if (ctx.chkSpell) {
      this._manuscriptRules(text, lower, push, ctx);
      if (ProzaEdit.StyleGuideRules?.apply) {
        ProzaEdit.StyleGuideRules.apply(text, lower, push, ctx);
      }
      if (ctx.language === "en-GB") this._gbIseIze(text, lower, push);
    }
    if (ctx.chkRep || ctx.chkSpell) {
      if (ProzaEdit.EditorHeuristics?.runStandardChecks) {
        ProzaEdit.EditorHeuristics.runStandardChecks(text, push, ctx);
      }
    }
    if (ctx.extendedLocal) this._extendedLocalPass(text, lower, push, ctx);
    if ((fiction && ctx.mPacing) || ctx.chkRep) this._rhythmMonotony(text, push);
    if (ctx.fkLock) this._fkLockFlag(text, push, ctx);
    if (fiction && ctx.mPacing) this._sensoryWeakSpot(text, push);

    const metrics = ProzaEdit.Metrics.analyze(text);
    const [gMin, gMax] = ProzaEdit.Metrics.targetGradeRange(ctx.targetAudience);
    if ((fiction && ctx.mPacing) || ctx.chkSpell) {
      if (metrics.fleschKincaidGrade < gMin - 2) {
        push({
          ruleId: "read:too_simple",
          module: "Pacing & Readability",
          type: "preference",
          explanation: `Reading level (~grade ${metrics.fleschKincaidGrade}) may be below target (${ctx.targetAudience}).`,
          targetText: text.trim().substring(0, 80),
          replacementText: "(raise lexical complexity)",
        });
      }
      if (metrics.fleschKincaidGrade > gMax + 2 + (gp ? gp.profile.fkSlack : 0)) {
        push({
          ruleId: "read:too_complex",
          module: "Pacing & Readability",
          type: "preference",
          explanation: `Reading level (~grade ${metrics.fleschKincaidGrade}) may exceed target (${ctx.targetAudience}).`,
          targetText: text.trim().substring(0, 80),
          replacementText: "(simplify syntax)",
        });
      }
    }

    const maxCards = ProzaEdit.ReportDensity?.maxCards?.(ctx.reportDensity) || 60;
    const deduped = this._dedupe(suggestions).slice(0, maxCards).map((x) => ({ ...x, confidence: this.confidenceFor(x) }));
    const persona = this.PERSONA_WEIGHTS[ctx.criticPersona] || this.PERSONA_WEIGHTS["Average Reader"];
    const criticalCount = deduped.filter((s) => s.type === "confirmed").length;
    const prefCount = deduped.filter((s) => s.type === "preference").length;
    let score = 10 - criticalCount * persona.c - prefCount * persona.p;
    if (score < 5) score = 5;
    score = Math.round(score * 10) / 10;
    const traffic = ProzaEdit.Metrics.trafficLight(score);

    return { suggestions: deduped, metrics, score, traffic, criticalCount, prefCount, manuscriptContext, genre };
  },

  LOW_CONFIDENCE_PREFIXES: ["genre:filter_words", "genre:adverb_density", "genre:tag_adverbs", "edit:aan", "edit:cap", "edit:open", "setting:", "read:", "rhythm:", "plaus:", "mot:", "cont:", "fk:"],

  /** high = objective (typo-class); medium = style judgment; low = noisy heuristic (hidden in Simple view by default). */
  confidenceFor(item) {
    if (item.confidence) return item.confidence;
    const id = String(item.ruleId || "");
    if (this.LOW_CONFIDENCE_PREFIXES.some((p) => id.startsWith(p))) return "low";
    return item.type === "confirmed" ? "high" : "medium";
  },

  _dedupe(list) {
    const seen = new Set();
    return list.filter((s) => {
      const t = String(s.targetText || "")
        .toLowerCase()
        .trim()
        .slice(0, 80);
      const key = `${t}|${s.type}`;
      if (t && seen.has(key)) return false;
      if (t) seen.add(key);
      return true;
    });
  },

  _repetition(text, lower, push) {
    (ProzaEdit.LexicalBanks?.PLEONASMS || []).forEach(([target, replacement]) => {
      if (lower.includes(target)) {
        push({
          ruleId: `rep:pleo:${target}`,
          module: "Repetition & Redundancy",
          type: "confirmed",
          explanation: "Pleonasm / tautology.",
          targetText: target,
          replacementText: replacement,
        });
      }
    });
    const words = lower.match(/\b[\w'-]+\b/g) || [];
    let n = 0;
    const seen = new Map();
    for (let i = 0; i < words.length - 1 && n < 16; i++) {
      const pair = `${words[i]} ${words[i + 1]}`;
      const prev = seen.get(pair);
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

  _proofing(text, lower, push, language) {
    if (text.includes("  ")) {
      push({
        ruleId: "spell:double_space",
        module: "Proofreading & Language",
        type: "preference",
        explanation: "Double space.",
        targetText: "  ",
        replacementText: " ",
      });
    }
    [" ,", " .", " ;", " :"].forEach((bad) => {
      if (text.includes(bad)) {
        push({
          ruleId: `spell:punct:${bad.trim()}`,
          module: "Proofreading & Language",
          type: "preference",
          explanation: "Space before punctuation.",
          targetText: bad,
          replacementText: bad.trim(),
        });
      }
    });
    const uk = ["colour", "centre", "organise", "recognise", "favour", "behaviour", "defence"];
    const us = ["color", "center", "organize", "recognize", "favor", "behavior", "defense"];
    const foreign = language === "en-GB" ? us : uk;
    foreign.slice(0, 8).forEach((word) => {
      if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
        push({
          ruleId: `spell:dialect:${word}`,
          module: "Proofreading & Language",
          type: "preference",
          explanation: `Dialect mismatch for ${language}.`,
          targetText: word,
          replacementText: "(align spelling standard)",
        });
      }
    });
  },

  _aiVoice(text, lower, push) {
    let hits = 0;
    (ProzaEdit.LexicalBanks?.AI_PHRASES || []).forEach((phrase) => {
      if (hits >= 15) return;
      if (this.includesWord(text, lower, phrase)) {
        hits++;
        push({
          ruleId: `ai:voice:${phrase.trim()}`,
          module: "Anti-AI Voice Directive",
          type: "preference",
          explanation: `AI-voice trope: "${phrase.trim()}".`,
          targetText: phrase.trim(),
          replacementText: "(rewrite in human cadence)",
        });
      }
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
    if (text.includes("went to the restroom and left")) {
      push({
        ruleId: "plot:restroom",
        module: "Plot & Chapter Structure",
        type: "confirmed",
        explanation: "Scene lacks immediate tension at transition.",
        targetText: "went to the restroom and left",
        replacementText: "stepped into the restroom, leaving her glass unattended on the dark counter",
      });
    }
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

  _motivation(text, lower, push, ctx) {
    const gp = ctx && ctx._genre;
    (gp ? gp.profile.weakCues : ["suddenly", "for some reason", "somehow", "started to", "began to"]).forEach((w) => {
      if (lower.includes(w)) {
        push({
          ruleId: `mot:${w}`,
          module: "Characterization & Motivation",
          type: "preference",
          explanation: `Weak agency cue "${w}".`,
          targetText: w,
          replacementText: "(show motive)",
        });
      }
    });
    const passive = text.match(/\b(was|were|been|being)\s+[a-z]+ed\b/gi) || [];
    if (passive.length >= (gp ? gp.passiveCluster : 5)) {
      push({
        ruleId: "mot:passive_cluster",
        module: "Characterization & Motivation",
        type: "preference",
        explanation: "Passive voice cluster may reduce character agency.",
        targetText: passive[0],
        replacementText: "(active verb)",
      });
    }
  },

  _dialogue(text, lower, push, ctx) {
    const longChars = (ctx && ctx._genre && ctx._genre.profile.longDialogueChars) || 80;
    const lines = text.split(/\n/);
    let longDlg = 0;
    lines.forEach((line) => {
      if (new RegExp(`^["\\u201c].{${longChars},}["\\u201d]?$`).test(line.trim()) && longDlg < 3) {
        longDlg++;
        push({
          ruleId: `dlg:long:${longDlg}`,
          module: "Dialogue & Viewpoint (POV)",
          type: "preference",
          explanation: "Long dialogue block—possible exposition dump.",
          targetText: line.trim().substring(0, 100),
          replacementText: "(break with beats)",
        });
      }
    });
    const paras = text.split(/\n\n+/);
    paras.forEach((p, idx) => {
      if (idx > 8) return;
      const hasI = /\b(I|me|my)\b/.test(p);
      const hasHeShe = /\b(he|she|they|him|her)\b/i.test(p);
      if (hasI && hasHeShe && p.length > 120) {
        push({
          ruleId: `pov:slip:${idx}`,
          module: "Dialogue & Viewpoint (POV)",
          type: "confirmed",
          explanation: "Possible POV slip (first + third person in same paragraph).",
          targetText: p.substring(0, 100),
          replacementText: "(align POV)",
        });
      }
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
      if (lower.includes(phrase)) {
        push({
          ruleId: `plaus:${phrase}`,
          module: "Plausibility, Logic & Evidence",
          type: "preference",
          explanation: `Absolute/unearned claim "${phrase}".`,
          targetText: phrase,
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
          explanation: `Long sentence (~${wc} words).`,
          targetText: s.trim().substring(0, 120),
          replacementText: "(split)",
        });
      }
    });
  },

  _genreCraft(text, lower, push, ctx, gp) {
    const p = gp.profile;
    const label = p.label;
    p.cliches.forEach((c) => {
      if (lower.includes(c)) {
        push({
          ruleId: `genre:cliche:${c}`,
          module: "Genre craft",
          type: "preference",
          explanation: `Common ${label} cliché — a fresher, more specific image will stand out.`,
          targetText: c,
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
      if (lower.includes(phrase)) {
        push({
          ruleId: `spoiler:${phrase}`,
          module: "Spoiler Control & Reveal Timing",
          type: "preference",
          explanation: "Narrator telegraphs future outcome.",
          targetText: phrase,
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
    (ProzaEdit.LexicalBanks?.EXTENDED_FILLERS || []).forEach(([word, hint]) => {
      if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
        push({
          ruleId: `ext:filler:${word}`,
          module: "Extended local pass",
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
      .filter(([w, c]) => c >= 8 && !["that", "with", "from", "they", "this", "have", "were", "been", "would", "could", "about"].includes(w))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([w, c]) => {
        if (rep >= 4) return;
        rep++;
        push({
          ruleId: `ext:repeat:${w}`,
          module: "Extended local pass",
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
        module: "Extended local pass",
        type: "preference",
        explanation: "Mixed hyphen (-) with en/em dashes — pick one dash style for consistency.",
        targetText: "-",
        replacementText: "–",
      });
    }
    if (emDash >= 6) {
      push({
        ruleId: "ext:emdash",
        module: "Extended local pass",
        type: "preference",
        explanation: "Heavy em-dash use—vary with commas or sentence breaks.",
        targetText: "—",
        replacementText: ",",
      });
    }
    if (ProzaEdit.EditorHeuristics?.runExtendedChecks) {
      ProzaEdit.EditorHeuristics.runExtendedChecks(text, push, ctx);
    }
  },

  _manuscriptRules(text, lower, push, ctx) {
    const t = ctx.manuscriptType;
    if (t.includes("Academic")) {
      if (/\b(don't|can't|won't|it's|I'm)\b/i.test(text)) {
        push({
          ruleId: "acad:contraction",
          module: "Academic Paper / Journal",
          type: "preference",
          explanation: "Contractions discouraged in formal academic prose.",
          targetText: "don't",
          replacementText: "do not",
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
      ["synergy", "leverage", "circle back", "move the needle"].forEach((b) => {
        if (lower.includes(b)) {
          push({
            ruleId: `biz:${b}`,
            module: "Business / Corporate Report",
            type: "preference",
            explanation: `Corporate jargon "${b}"—prefer plain action language.`,
            targetText: b,
            replacementText: "(plain term)",
          });
        }
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
