/**
 * ProzaEdit Master Engine (production copy of the compiled v4 suite).
 * Phrase tables hydrate from LexicalBanks when present. Audit.engine still
 * owns genre/plot/spell/AI-voice; this file supplies dialogue immunity,
 * Micro-POS, lanes, extra heuristics, and AuditPipeline.audit().
 */

(function (global) {
  "use strict";

  const root = (global.ProzaEdit = global.ProzaEdit || {});
  const Engine = (root.MasterEngine = {});

  function isFictionType(t) {
    if (root.Genres && typeof root.Genres.isFiction === "function") return root.Genres.isFiction(t);
    return String(t || "").includes("Fiction") && !/non-?fiction/i.test(String(t));
  }

  function banks() {
    return root.LexicalBanks || {};
  }

  const MAX_TOKENS = 80000;
  const MAX_PHRASE_HITS = 40;
  const MAX_CONTRIB_FINDINGS = 36;
  const MAX_SCAN_CHARS = 400000;

  function wordTokenRe() {
    try {
      return new RegExp("[\\p{L}\\p{N}'-]+", "gu");
    } catch (_) {
      return /[A-Za-z0-9\u00C0-\u024F'-]+/g;
    }
  }

  /** Bounded exec so a zero-width match cannot spin the pane forever. */
  function collectExec(re, text, limit) {
    const out = [];
    if (!re || !text) return out;
    const cap = limit > 0 ? limit : MAX_PHRASE_HITS;
    re.lastIndex = 0;
    let m;
    let steps = 0;
    while ((m = re.exec(text)) !== null) {
      if (!m[0]) {
        re.lastIndex++;
        if (re.lastIndex > text.length) break;
        continue;
      }
      out.push(m);
      if (out.length >= cap) break;
      if (++steps > cap * 8) break;
    }
    return out;
  }

  /* ==========================================================================
     1. DIALOGUE IMMUNITY ENGINE
     ========================================================================== */
  Engine.DialogueImmunity = {
    /**
     * Strips quoted dialogue while replacing characters with exact spaces
     * to preserve 1:1 character index parity for Word 'Go To' navigation.
     */
    stripDialogue(text) {
      if (!text || typeof text !== "string") return "";
      try {
        return text
          .replace(/["“”«»][^"“”«»\r\n]{0,8000}["“”«»]/g, (m) => " ".repeat(m.length))
          .replace(/(^|[\s(\[{])['‘]([^\r\n']{0,2000})['’](?=[\s)\]},.!?;:]|$)/g, (m, lead) => {
            return lead + " ".repeat(m.length - lead.length);
          })
          .replace(/["“][^"”\r\n]{0,8000}[—–-]["”]?/g, (m) => " ".repeat(m.length));
      } catch (_) {
        return text;
      }
    }
  };

  /* ==========================================================================
     2. MICRO-POS (PART-OF-SPEECH) TAGGER & TOKENIZER
     ========================================================================== */
  Engine.MicroPOS = {
    DETERMINERS: new Set(["the", "a", "an", "this", "that", "these", "those", "my", "your", "his", "her", "its", "our", "their", "any", "some", "every", "no", "all"]),
    PRONOUNS: new Set(["i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "who", "whom", "which", "what"]),
    PREPOSITIONS: new Set(["in", "on", "at", "to", "for", "from", "by", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "of", "under", "over"]),
    AUX_VERBS: new Set(["is", "am", "are", "was", "were", "be", "being", "been", "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should", "can", "could", "may", "might", "must"]),

    /**
     * Tokenizes text and applies Brill-style contextual POS rules.
     * Essential for solving context-blind homophone false positives.
     */
    tokenizeAndTag(text) {
      const tokens = [];
      if (!text) return tokens;
      const tokenRe = wordTokenRe();
      const matches = collectExec(tokenRe, String(text), MAX_TOKENS);
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        const word = m[0];
        const lower = word.toLowerCase();
        let tag = "UNK";

        // Lexicon Lookup
        if (this.DETERMINERS.has(lower)) tag = "DET";
        else if (this.PRONOUNS.has(lower)) tag = "PRON";
        else if (this.PREPOSITIONS.has(lower)) tag = "PREP";
        else if (this.AUX_VERBS.has(lower)) tag = "VERB";
        else if (lower.endsWith("tion") || lower.endsWith("ness") || lower.endsWith("ment") || lower.endsWith("ity")) tag = "NOUN";
        else if (lower.endsWith("ly") && lower.length > 4) tag = "ADV";
        else if (lower.endsWith("ed") || lower.endsWith("ing") || lower.endsWith("s")) tag = "VERB";

        // Contextual Disambiguation
        if (tag === "UNK" || tag === "VERB") {
          if (tokens.length > 0) {
            const prevTag = tokens[tokens.length - 1].tag;
            if (prevTag === "DET" || prevTag === "PREP") tag = "NOUN";
            else if (prevTag === "PRON") tag = "VERB";
          }
        }
        
        // Force fallback if still unknown
        if (tag === "UNK") tag = "NOUN"; 

        tokens.push({
          raw: word,
          lower: lower,
          tag: tag,
          index: m.index,
          length: word.length
        });
      }
      return tokens;
    }
  };

  /* ==========================================================================
     3. TEXT METRICS & STATISTICAL ENGINE
     ========================================================================== */
  Engine.Metrics = {
    splitSentences(text) {
      if (!text) return [];
      return text.replace(/([.?!])\s*(?=[A-ZÀ-ɏ"'“‘])/g, "$1|~|").split("|~|").map(s => s.trim()).filter(s => s.length > 0);
    },

    countSyllables(word) {
      const w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
      if (w.length <= 3) return 1;
      const clean = w.replace(/(?:[^laeiouy]|ed|es|e)$/, "").replace(/^y/, "");
      const matches = clean.match(/[aeiouy]{1,2}/g);
      return matches ? Math.max(1, matches.length) : 1;
    },

    calculateScores(text) {
      const src = String(text || "");
      const words = collectExec(wordTokenRe(), src, MAX_TOKENS).map((m) => m[0]);
      const wordCount = words.length;
      if (wordCount === 0) return { wordCount: 0, fleschKincaidGrade: 0, fleschReadingEase: 100, averageSentenceLength: 0, dialogueRatio: 0, sentenceVariance: 0 };

      const sentences = this.splitSentences(text);
      const sentenceCount = Math.max(1, sentences.length);
      const sentenceLengths = sentences.map((s) => collectExec(wordTokenRe(), s, 4000).length);

      let totalSyllables = 0;
      for (let i = 0; i < words.length; i++) totalSyllables += this.countSyllables(words[i]);

      const asl = wordCount / sentenceCount;
      const asw = totalSyllables / wordCount;

      const fre = Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * asl - 84.6 * asw)));
      const fk = Math.max(0, Math.round((0.39 * asl + 11.8 * asw - 15.59) * 10) / 10);
      const variance = sentenceLengths.reduce((acc, len) => acc + Math.pow(len - asl, 2), 0) / sentenceCount;

      const dialogueText = (src.match(/["“”][^"“”\r\n]{0,8000}["“”]/g) || []).join(" ");
      const dialogueWords = collectExec(wordTokenRe(), dialogueText, MAX_TOKENS).length;
      const dialogueRatio = Math.round((dialogueWords / wordCount) * 100);

      return { wordCount, sentenceCount, fleschKincaidGrade: fk, fleschReadingEase: fre, averageSentenceLength: Math.round(asl * 10) / 10, dialogueRatio, sentenceVariance: Math.round(variance * 10) / 10 };
    }
  };

  /* ==========================================================================
     4. COMPREHENSIVE LEXICAL & STYLE RULE BASES
     ========================================================================== */
  Engine.LexicalRules = {
    // [Target, Replacement, Explanation, POSGuard Function (optional)]
    MISUSED_WORDS: [
      ["affect", "effect", "Common confusion: 'affect' is usually a verb (to influence).", (idx, tokens) => tokens[idx].tag === "NOUN"],
      ["effect", "affect", "Common confusion: 'effect' is a noun (the result).", (idx, tokens) => {
         if (tokens[idx].tag !== "VERB") return false;
         const next = tokens[idx + 1];
         if (next && (next.lower === "change" || next.lower === "policy")) return false; // "effect change" is valid
         return true;
      }],
      ["compliment", "complement", "Confusion: 'compliment' is praise; 'complement' completes.", null],
      ["discrete", "discreet", "Confusion: 'discrete' is separate; 'discreet' is unobtrusive.", null],
      ["principal", "principle", "Confusion: 'principal' is chief; 'principle' is a rule.", null],
      ["stationery", "stationary", "Confusion: 'stationery' is paper; 'stationary' means unmoving.", null],
      ["peek", "pique", "Confusion: 'peek' is a look; 'pique' stimulates interest.", null],
      ["forgo", "forego", "Confusion: 'forgo' means to do without; 'forego' means to precede.", null],
      ["hoard", "horde", "Confusion: 'hoard' is a cache; 'horde' is a crowd.", null]
    ],

    NOMINALIZATIONS: [
      ["make a decision", "decide", "Hidden verb: use direct action verb."],
      ["make a determination", "determine", "Hidden verb: use direct action verb."],
      ["conduct an investigation", "investigate", "Hidden verb: use direct action verb."],
      ["give consideration to", "consider", "Hidden verb: use direct action verb."],
      ["reach an agreement", "agree", "Hidden verb: use direct action verb."],
      ["perform an evaluation", "evaluate", "Hidden verb: use direct action verb."],
      ["make an attempt", "try", "Hidden verb: use direct action verb."]
    ],

    WORDINESS: [
      ["in order to", "to", "Concise phrasing: 'to' suffices."],
      ["due to the fact that", "because", "Concise phrasing: direct cause."],
      ["at this point in time", "now", "Concise phrasing: eliminate temporal padding."],
      ["for the purpose of", "to", "Concise phrasing: omit filler."],
      ["prior to", "before", "Plain language: use common preposition."],
      ["a number of", "several / some", "Plain language: be specific or concise."],
      ["in the near future", "soon", "Concise phrasing: direct temporal marker."],
      ["inasmuch as", "since / because", "Plain language: modern conjunction."],
      ["the fact that", "that", "Strunk: omit needless words"]
    ],

    PLEONASMS: [
      ["absolutely essential", "essential", "Pleonasm: 'essential' cannot be modified."],
      ["actual experience", "experience", "Pleonasm: all experience is actual."],
      ["added bonus", "bonus", "Pleonasm: a bonus is inherently an addition."],
      ["armed gunman", "gunman", "Pleonasm: a gunman is armed by definition."],
      ["blend together", "blend", "Pleonasm: 'together' is redundant with blend."],
      ["close proximity", "proximity", "Pleonasm: proximity means closeness."],
      ["end result", "result", "Pleonasm: a result is the final state."],
      ["exact same", "same", "Pleonasm: colloquial doubling."],
      ["free gift", "gift", "Pleonasm: gifts are inherently free."],
      ["honest truth", "truth", "Pleonasm: truth is honest."],
      ["nodded his head", "nodded", "Narrative redundancy: nodding only involves the head."],
      ["nodded her head", "nodded", "Narrative redundancy: nodding only involves the head."],
      ["shrugged his shoulders", "shrugged", "Narrative redundancy: only shoulders shrug."],
      ["shrugged her shoulders", "shrugged", "Narrative redundancy: only shoulders shrug."]
    ],

    UNCOMPARABLES: [
      ["very unique", "unique", "Absolute adjective: 'unique' cannot be modified by degree."],
      ["more unique", "unique", "Absolute adjective: 'unique' is binary."],
      ["completely empty", "empty", "Absolute adjective: 'empty' cannot take degree."],
      ["more preferable", "preferable", "Redundant comparison: 'preferable' already conveys preference."],
      ["very dead", "dead", "Absolute binary state."]
    ],

    CORPORATE_JARGON: [
      ["synergy", "cooperation / joint effort"],
      ["leverage", "use / apply"],
      ["circle back", "follow up / return to"],
      ["move the needle", "make measurable progress"],
      ["boil the ocean", "overcomplicate the scope"],
      ["low-hanging fruit", "immediate opportunities / easy wins"],
      ["paradigm shift", "fundamental change"],
      ["deep dive", "detailed analysis"],
      ["think outside the box", "think innovatively"],
      ["game changer", "major breakthrough"]
    ],

    DIALECT_PAIRS: [
      ["color", "colour"], ["flavor", "flavour"], ["honor", "honour"], ["humor", "humour"],
      ["labor", "labour"], ["neighbor", "neighbour"], ["behavior", "behaviour"],
      ["center", "centre"], ["theater", "theatre"], ["meter", "metre"],
      ["defense", "defence"], ["offense", "offence"], ["license", "licence"],
      ["analyze", "analyse"], ["organize", "organise"], ["recognize", "recognise"],
      ["realize", "realise"], ["traveled", "travelled"]
    ],

    TAG_ADVERBS: [
      ["said angrily", "snapped / barked (or show emotion via action beat)"],
      ["said softly", "murmured / whispered"],
      ["said loudly", "bellowed / called"],
      ["asked curiously", "asked (show curiosity in dialogue)"],
      ["shouted furiously", "shouted (show fury in beat)"]
    ]
  };

  /* ==========================================================================
     5. ADVANCED HEURISTIC ENGINES (Paul Beverley / Macro-Tool Patterns)
     ========================================================================== */
  Engine.Heuristics = {
    scanProperNounCollisions(cleanText, dictionary, limit = 8) {
      const dictLower = new Set((dictionary || []).map((d) => String(d).toLowerCase()));
      let nameRe;
      try {
        nameRe = new RegExp("[\\p{Lu}][\\p{L}]+(?:['\\u2019\\-][\\p{Lu}][\\p{L}]+)*(?:\\s+[\\p{Lu}][\\p{L}]+){0,2}", "gu");
      } catch (_) {
        nameRe = /\b[A-Z][A-Za-z]+(?:['\u2019-][A-Z][A-Za-z]+)*(?:\s+[A-Z][A-Za-z]+){0,2}\b/g;
      }
      const counts = new Map();
      collectExec(nameRe, String(cleanText || ""), 4000).forEach((m) => {
        const token = m[0].trim();
        if (token.length < 4 || token.length > 35) return;
        const lower = token.toLowerCase();
        if (dictLower.has(lower) || Engine.MicroPOS.DETERMINERS.has(lower)) return;
        counts.set(token, (counts.get(token) || 0) + 1);
      });

      const forms = [...counts.keys()];
      const findings = [];
      const used = new Set();

      for (let i = 0; i < forms.length && findings.length < limit; i++) {
        for (let j = i + 1; j < forms.length && findings.length < limit; j++) {
          const a = forms[i];
          const b = forms[j];
          if (a.includes(" ") || b.includes(" ")) continue;

          const aLow = a.toLowerCase();
          const bLow = b.toLowerCase();
          const key = [aLow, bLow].sort().join("|");
          if (used.has(key)) continue;

          if (aLow.slice(0, 3) === bLow.slice(0, 3) && Math.abs(a.length - b.length) <= 3 && aLow !== bLow) {
            used.add(key);
            const canonical = (counts.get(a) || 0) >= (counts.get(b) || 0) ? a : b;
            const variant = canonical === a ? b : a;
            findings.push({
              ruleId: `prop:collision:${variant.toLowerCase()}`,
              lane: "Consistency",
              type: "preference",
              confidence: "low",
              explanation: `Visual name similarity: "${a}" and "${b}" share their first three letters. Verify character distinction.`,
              targetText: variant,
              replacementText: "(verify character distinction)"
            });
          }
        }
      }
      return findings;
    },

    scanWordProximity(tokens, limit = 6) {
      const seenIndex = new Map();
      const findings = [];

      for (let i = 0; i < tokens.length; i++) {
        if (findings.length >= limit) break;
        const t = tokens[i];
        if (t.length < 6 || Engine.MicroPOS.DETERMINERS.has(t.lower) || Engine.MicroPOS.PREPOSITIONS.has(t.lower)) continue;

        const prevIndex = seenIndex.get(t.lower);
        if (prevIndex !== undefined) {
          const distance = i - prevIndex;
          if (distance <= 45) {
            findings.push({
              ruleId: `rep:echo:${t.lower}`,
              lane: "Clarity",
              type: "preference",
              confidence: "low",
              explanation: `Echoed word: "${t.raw}" appears twice within ${distance} words in narrative exposition.`,
              targetText: t.raw,
              replacementText: "(vary diction)"
            });
          }
        }
        seenIndex.set(t.lower, i);
      }
      return findings;
    },

    scanPrefixConsistency(text, limit = 4) {
      const PREFIX_ROOTS = new Set(["author", "creator", "edit", "editor", "exist", "founder", "operate", "opt", "order", "organize", "owner", "produce", "sponsor", "star", "worker", "write"]);
      const prefixes = ["co", "re", "pre", "anti"];
      const findings = [];

      for (const pfx of prefixes) {
        if (findings.length >= limit) break;
        const hyphenRe = new RegExp(`\\b(${pfx})-([a-z]{3,})\\b`, "gi");
        const closedRe = new RegExp(`\\b(${pfx})([a-z]{3,})\\b`, "gi");
        const hyphenated = new Set();
        const closed = new Set();
        collectExec(hyphenRe, text, 400).forEach((m) => {
          if (PREFIX_ROOTS.has(String(m[2] || "").toLowerCase())) hyphenated.add(m[2].toLowerCase());
        });
        collectExec(closedRe, text, 800).forEach((m) => {
          if (PREFIX_ROOTS.has(String(m[2] || "").toLowerCase())) closed.add(m[2].toLowerCase());
        });

        for (const base of hyphenated) {
          if (findings.length >= limit) break;
          if (closed.has(base)) {
            findings.push({
              ruleId: `edit:prefix:${pfx}_${base}`,
              lane: "Consistency",
              type: "preference",
              confidence: "medium",
              explanation: `Inconsistent compound prefix: both "${pfx}-${base}" and "${pfx}${base}" appear. Standardize on one form.`,
              targetText: `${pfx}${base}`,
              replacementText: `${pfx}-${base}`
            });
          }
        }
      }
      return findings;
    },

    scanRhythmMono(text) {
      const sentences = Engine.Metrics.splitSentences(text);
      if (sentences.length < 5) return [];
      const countWords = (s) => {
        try {
          return (s.match(/\b[\p{L}\p{N}'-]+\b/gu) || []).length;
        } catch (_) {
          return (s.match(/\b[A-Za-z0-9\u00C0-\u024F'-]+\b/g) || []).length;
        }
      };
      const lengths = sentences.map(countWords);
      const findings = [];
      let runStart = 0, runLength = 1;

      for (let i = 1; i < lengths.length; i++) {
        if (Math.abs(lengths[i] - lengths[i - 1]) <= 2 && lengths[i] >= 6) {
          runLength++;
        } else {
          if (runLength >= 5) {
            findings.push({
              ruleId: "craft:rhythm_monotony",
              lane: "Craft",
              type: "preference",
              confidence: "low",
              explanation: `Rhythmic monotony: ${runLength} consecutive sentences have nearly identical lengths (~${lengths[runStart]} words). Vary sentence rhythm.`,
              targetText: sentences[runStart].substring(0, 80),
              replacementText: "(vary sentence lengths)"
            });
            break;
          }
          runStart = i;
          runLength = 1;
        }
      }
      return findings;
    },
    
    scanTenseAndPOV(tokens) {
      let past = 0, present = 0, firstPerson = 0, thirdPerson = 0;
      const findings = [];
      
      tokens.forEach(t => {
        if (t.tag === "PRON") {
          if (["i", "me", "my", "we", "us", "our"].includes(t.lower)) firstPerson++;
          else if (["he", "she", "him", "her", "they", "them"].includes(t.lower)) thirdPerson++;
        }
        if (t.tag === "VERB") {
          if (t.lower.endsWith("ed")) past++;
          else if (t.lower.endsWith("s") && t.lower !== "is" && t.lower !== "was") present++;
        }
      });
      
      const totalVerbs = past + present;
      const totalPronouns = firstPerson + thirdPerson;
      
      if (totalPronouns > 10 && thirdPerson / totalPronouns > 0.85 && firstPerson > 0) {
        findings.push({
          ruleId: "pov:drift",
          lane: "Craft",
          type: "preference",
          confidence: "low",
          explanation: "POV Drift: Found first-person pronouns in a strictly third-person narrative. Check for accidental slips.",
          targetText: tokens.find(t => ["i", "me", "my"].includes(t.lower))?.raw || "I",
          replacementText: "(check POV)"
        });
      }
      
      if (totalVerbs > 15 && past / totalVerbs > 0.85 && present > 2) {
        findings.push({
          ruleId: "tense:drift",
          lane: "Craft",
          type: "preference",
          confidence: "low",
          explanation: "Tense Drift: Found present-tense verbs in a strictly past-tense narrative.",
          targetText: tokens.find(t => t.tag === "VERB" && t.lower.endsWith("s") && t.lower !== "is" && t.lower !== "was")?.raw || "(verb)",
          replacementText: "(check tense)"
        });
      }
      
      return findings;
    }
  };

  /* ==========================================================================
     6. AUDIT PIPELINE & PERSONA-WEIGHTED ORCHESTRATION
     ========================================================================== */
  Engine.AuditPipeline = {
    PERSONA_WEIGHTS: {
      "Average Reader": { criticalWeight: 0.35, prefWeight: 0.08, passThreshold: 6.0 },
      "More Critical Reader": { criticalWeight: 0.40, prefWeight: 0.10, passThreshold: 7.0 },
      "NYT Best Seller Critic": { criticalWeight: 0.45, prefWeight: 0.12, passThreshold: 8.5 },
      "Very Harsh Senior Editor (9.0+ Target)": { criticalWeight: 0.50, prefWeight: 0.15, passThreshold: 9.0 }
    },

    _buildSingleWordIndex() {
      if (this._singleWordRules) return this._singleWordRules;
      const index = new Map();
      const add = (arr, lane, type) => {
        arr.forEach(([target, replace, expl, guard]) => {
          if (!target.includes(" ")) index.set(target.toLowerCase(), { target, replace, expl, guard, lane, type });
        });
      };
      add(Engine.LexicalRules.MISUSED_WORDS, "Correctness", "confirmed");
      add(Engine.LexicalRules.NOMINALIZATIONS, "Clarity", "preference");
      add(Engine.LexicalRules.PLEONASMS, "Clarity", "preference");
      add(Engine.LexicalRules.UNCOMPARABLES, "Clarity", "preference");
      add(Engine.LexicalRules.CORPORATE_JARGON, "Clarity", "preference");
      this._singleWordRules = index;
      return index;
    },

    _findBoundedPhrases(text, phrase) {
      const p = String(phrase || "").trim();
      if (!p || !text) return [];
      const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      let re;
      try {
        re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${esc})(?=[^\\p{L}\\p{N}_]|$)`, "giu");
      } catch (_) {
        re = new RegExp(`(^|[^A-Za-z0-9_])(${esc})(?=[^A-Za-z0-9_]|$)`, "gi");
      }
      return collectExec(re, String(text), MAX_PHRASE_HITS).map((m) => ({
        match: m[2],
        index: m.index + String(m[1] || "").length
      })).filter((hit) => hit.match);
    },

    audit(text, options = {}) {
      Engine.hydrateBanks();
      const srcText = String(text || "");
      const isFiction = isFictionType(options.manuscriptType);
      const language = options.language || "en-US";
      const criticPersona = options.criticPersona || "Average Reader";
      const dictionary = options.dictionary || [];
      const mutedRules = new Set(options.mutedRules || []);

      const metrics = Engine.Metrics.calculateScores(srcText);
      const cleanNarration = isFiction ? Engine.DialogueImmunity.stripDialogue(srcText) : srcText;
      
      // O(1) Tokenization & POS Tagging (Runs ONCE)
      const taggedTokens = Engine.MicroPOS.tokenizeAndTag(cleanNarration);

      const rawFindings = [];
      const pushFinding = (f) => {
        if (!f || !f.targetText || f.targetText.length > 255) return;
        if (mutedRules.has(f.ruleId)) return;
        rawFindings.push({ ...f, id: `pe_${rawFindings.length}`, confidence: f.confidence || (f.type === "confirmed" ? "high" : "medium") });
      };

      // 1. Single-Word Passes using O(1) POS Token Array
      const singleWordIndex = this._buildSingleWordIndex();
      for (let i = 0; i < taggedTokens.length; i++) {
        const token = taggedTokens[i];
        const rule = singleWordIndex.get(token.lower);
        if (rule) {
          let trigger = true;
          if (rule.guard && !rule.guard(i, taggedTokens)) trigger = false;
          
          if (trigger) {
            pushFinding({
              ruleId: `rule:${token.lower}`,
              lane: rule.lane,
              type: (rule.type === "confirmed" || !isFiction) ? rule.type : "preference",
              explanation: rule.expl,
              targetText: token.raw,
              replacementText: rule.replace
            });
          }
        }
      }

      // 2. Multi-Word Phrase Passes
      const processMultiWord = (arr, lane, type, isDialect = false) => {
        (arr || []).forEach((row) => {
          const target = row[0];
          const replace = row[1];
          const expl = row[2] || "Prefer a plainer term.";
          if (!target) return;
          if (target.includes(" ") || isDialect) {
            const hits = this._findBoundedPhrases(cleanNarration, target);
            hits.forEach(hit => {
               pushFinding({
                 ruleId: `phrase:${target.replace(/\s+/g, "_")}`,
                 lane: lane,
                 type: type,
                 explanation: expl,
                 targetText: hit.match,
                 replacementText: Engine.MutationUtils.alignCase(hit.match, replace)
               });
            });
          }
        });
      };

      processMultiWord(Engine.LexicalRules.WORDINESS, "Clarity", "preference");
      processMultiWord(Engine.LexicalRules.PLEONASMS, "Clarity", isFiction ? "preference" : "confirmed");
      processMultiWord(Engine.LexicalRules.NOMINALIZATIONS, "Clarity", "preference");
      processMultiWord(Engine.LexicalRules.UNCOMPARABLES, "Clarity", "preference");
      if (!isFiction) processMultiWord(Engine.LexicalRules.CORPORATE_JARGON, "Clarity", "preference");

      // Dialect
      Engine.LexicalRules.DIALECT_PAIRS.forEach(([us, uk]) => {
        const foreign = language === "en-GB" ? us : uk;
        const correct = language === "en-GB" ? uk : us;
        const hits = this._findBoundedPhrases(cleanNarration, foreign);
        hits.forEach(hit => {
          pushFinding({
            ruleId: `dialect:${foreign}`,
            lane: "Consistency",
            type: "preference",
            explanation: `Spelling mismatch: "${hit.match}" is standard for ${language === "en-GB" ? "US English" : "UK English"}.`,
            targetText: hit.match,
            replacementText: Engine.MutationUtils.alignCase(hit.match, correct)
          });
        });
      });

      // Fiction Craft Checks
      if (isFiction) {
        Engine.LexicalRules.TAG_ADVERBS.forEach(([target, hint]) => {
          const hits = this._findBoundedPhrases(srcText, target);
          hits.forEach(hit => {
             pushFinding({
                ruleId: `craft:tag_adverb:${target.replace(/\s+/g, "_")}`,
                lane: "Craft",
                type: "preference",
                explanation: `Told dialogue emotion: "${hit.match}". Use an action beat instead.`,
                targetText: hit.match,
                replacementText: hint
             });
          });
        });
        Engine.Heuristics.scanRhythmMono(cleanNarration).forEach(pushFinding);
        Engine.Heuristics.scanTenseAndPOV(taggedTokens).forEach(pushFinding);
      }

      // Advanced Heuristics
      Engine.Heuristics.scanProperNounCollisions(cleanNarration, dictionary, 6).forEach(pushFinding);
      Engine.Heuristics.scanWordProximity(taggedTokens, 6).forEach(pushFinding);
      Engine.Heuristics.scanPrefixConsistency(srcText, 4).forEach(pushFinding);

      // Deduplication & Scoring
      const seen = new Set();
      const findings = rawFindings.filter(f => {
        const key = `${f.lane}|${String(f.targetText).toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const persona = this.PERSONA_WEIGHTS[criticPersona] || this.PERSONA_WEIGHTS["Average Reader"];
      const criticalCount = findings.filter((f) => f.type === "confirmed").length;
      const prefCount = findings.filter((f) => f.type === "preference").length;

      let score = 10.0 - (criticalCount * persona.criticalWeight) - (prefCount * persona.prefWeight);
      score = Math.max(5.0, Math.min(10.0, Math.round(score * 10) / 10));
      const traffic = root.Metrics && typeof root.Metrics.trafficLight === "function"
        ? root.Metrics.trafficLight(score)
        : (score >= persona.passThreshold ? "Strong" : score >= (persona.passThreshold - 1.5) ? "Moderate" : "Needs Work");

      return {
        score, traffic,
        metrics, findings,
        summary: Engine.Lanes.summarize(findings, criticalCount, prefCount)
      };
    }
  };

  /* ==========================================================================
     7. MUTATION UTILITIES & CASING PRESERVATION
     ========================================================================== */
  Engine.MutationUtils = {
    alignCase(original, replacement) {
      const o = String(original || "");
      const r = String(replacement || "");
      if (!o || !r || r.startsWith("(")) return r;
      if (/[a-z][A-Z]|[A-Z]{2,}/.test(r)) return r;
      if (o.length > 1 && o === o.toUpperCase() && o !== o.toLowerCase()) return r.toUpperCase();
      const first = o.charAt(0);
      if (first !== first.toLowerCase() && first === first.toUpperCase()) return r.charAt(0).toUpperCase() + r.slice(1);
      return r;
    },
    extractAnchorContext(text, target, windowSize = 35) {
      const idx = text.indexOf(target);
      if (idx === -1) return null;
      return { prefix: text.substring(Math.max(0, idx - windowSize), idx), target, suffix: text.substring(idx + target.length, Math.min(text.length, idx + target.length + windowSize)), index: idx };
    }
  };

  Engine.Lanes = {
    NAMES: ["Correctness", "Clarity", "Consistency", "Craft"],
    PREFIX: [
      { re: /^(spell:|edit:aan|edit:quote|edit:cap|edit:open|rule:)/, lane: "Correctness" },
      { re: /^(prop:|gb:|edit:prefix|edit:hyphen|edit:num|dialect:|cont:)/, lane: "Consistency" },
      { re: /^(plot:|mot:|genre:|pov:|tense:|craft:|rhythm:|sense:|plaus:|content:)/, lane: "Craft" },
      { re: /^(rep:|sg:|biz:|nf:|phrase:|ai:|acad:|journal:|read:|fk:|ext:|edit:)/, lane: "Clarity" }
    ],
    forRuleId(ruleId, item) {
      if (item && item.lane && this.NAMES.indexOf(item.lane) !== -1) return item.lane;
      const id = String(ruleId || "");
      for (let i = 0; i < this.PREFIX.length; i++) {
        if (this.PREFIX[i].re.test(id)) return this.PREFIX[i].lane;
      }
      return "Clarity";
    },
    summarize(findings, criticalCount, prefCount) {
      const list = findings || [];
      const byLane = { Correctness: 0, Clarity: 0, Consistency: 0, Craft: 0 };
      list.forEach((f) => {
        const lane = this.forRuleId(f.ruleId, f);
        if (byLane[lane] == null) byLane[lane] = 0;
        byLane[lane]++;
      });
      return {
        total: list.length,
        critical: criticalCount == null ? list.filter((f) => f.type === "confirmed").length : criticalCount,
        style: prefCount == null ? list.filter((f) => f.type === "preference" && !String(f.ruleId).startsWith("content:")).length : prefCount,
        byLane
      };
    }
  };

  Engine.hydrateBanks = function hydrateBanks() {
    if (Engine._banksHydrated) return;
    const B = banks();
    const merge = (into, extra) => {
      if (!Array.isArray(extra) || !extra.length) return into;
      const seen = new Set(into.map((r) => String(r[0] || "").toLowerCase()));
      extra.forEach((row) => {
        const key = String(row[0] || "").toLowerCase();
        if (key && !seen.has(key)) {
          into.push(row);
          seen.add(key);
        }
      });
      return into;
    };
    merge(Engine.LexicalRules.PLEONASMS, B.PLEONASMS);
    merge(Engine.LexicalRules.WORDINESS, B.WORDINESS);
    merge(Engine.LexicalRules.NOMINALIZATIONS, B.NOMINALIZATIONS);
    merge(Engine.LexicalRules.UNCOMPARABLES, B.UNCOMPARABLES);
    merge(Engine.LexicalRules.CORPORATE_JARGON, B.BUSINESS_JARGON);
    merge(Engine.LexicalRules.TAG_ADVERBS, B.TAG_ADVERBS);
    Engine.AuditPipeline._singleWordRules = null;
    Engine._banksHydrated = true;
  };

  /**
   * Extra cards for live Audit.run. Only the compiled-master checks that
   * other modules do not already run (POS homophones, tag-adverbs, similar
   * names, word echoes, prefix spelling). Wordiness/hidden-verb/jargon
   * phrases stay on the style-guide and bank paths so Run does not scan
   * the same list twice. Low-confidence so Simple stays quiet.
   */
  Engine.contributeSupplemental = function contributeSupplemental(text, options) {
    options = options || {};
    try {
      Engine.hydrateBanks();
      let srcText = String(text || "");
      if (!srcText) return [];
      if (srcText.length > MAX_SCAN_CHARS) srcText = srcText.slice(0, MAX_SCAN_CHARS);
      const muted = new Set(options.mutedRules || []);
      const isFiction = isFictionType(options.manuscriptType);
      const dictionary = options.dictionary || [];
      const cleanNarration = isFiction ? Engine.DialogueImmunity.stripDialogue(srcText) : srcText;
      const taggedTokens = Engine.MicroPOS.tokenizeAndTag(cleanNarration);
      const jargon = new Set((Engine.LexicalRules.CORPORATE_JARGON || []).map((r) => String(r[0] || "").toLowerCase()));
      const skipJargon = isFiction || /Business/i.test(String(options.manuscriptType || ""));
      const out = [];
      const push = (f) => {
        if (!f || !f.targetText || f.targetText.length > 255) return;
        if (muted.has(f.ruleId)) return;
        if (out.length >= MAX_CONTRIB_FINDINGS) return;
        f.lane = Engine.Lanes.forRuleId(f.ruleId, f);
        f.confidence = f.confidence || "low";
        f.module = f.module || (f.lane === "Craft" ? "Genre craft" : f.lane === "Correctness" ? "Proofreading & Language" : f.lane === "Consistency" ? "Editorial consistency" : "Repetition & Redundancy");
        out.push(f);
      };

      const singleWordIndex = Engine.AuditPipeline._buildSingleWordIndex();
      for (let i = 0; i < taggedTokens.length && out.length < MAX_CONTRIB_FINDINGS; i++) {
        const token = taggedTokens[i];
        const rule = singleWordIndex.get(token.lower);
        if (!rule) continue;
        if (skipJargon && jargon.has(token.lower)) continue;
        if (rule.lane !== "Correctness" && !rule.guard) continue;
        if (rule.guard && !rule.guard(i, taggedTokens)) continue;
        push({
          ruleId: `rule:${token.lower}`,
          lane: rule.lane === "Style" ? "Clarity" : rule.lane,
          type: "preference",
          confidence: "low",
          explanation: rule.expl || "Prefer a plainer or more precise term.",
          targetText: token.raw,
          replacementText: rule.replace
        });
      }

      if (isFiction && options.mDialogue !== false) {
        const tags = Engine.LexicalRules.TAG_ADVERBS || [];
        for (let t = 0; t < tags.length && out.length < MAX_CONTRIB_FINDINGS; t++) {
          const target = tags[t][0];
          const hint = tags[t][1];
          if (!target) continue;
          const hits = Engine.AuditPipeline._findBoundedPhrases(srcText, target);
          for (let h = 0; h < hits.length && out.length < MAX_CONTRIB_FINDINGS; h++) {
            const hit = hits[h];
            push({
              ruleId: `craft:tag_adverb:${String(target).replace(/\s+/g, "_")}`,
              lane: "Craft",
              type: "preference",
              confidence: "low",
              explanation: `Told dialogue emotion: "${hit.match}". Use an action beat instead.`,
              targetText: hit.match,
              replacementText: hint
            });
          }
        }
      }

      if (options.chkProp !== false) {
        Engine.Heuristics.scanProperNounCollisions(cleanNarration, dictionary, 6).forEach((f) => {
          push({ ...f, confidence: f.confidence || "low" });
        });
      }
      if (options.chkRep !== false) {
        Engine.Heuristics.scanWordProximity(taggedTokens, 6).forEach((f) => {
          push({ ...f, confidence: f.confidence || "low" });
        });
      }
      Engine.Heuristics.scanPrefixConsistency(srcText, 4).forEach((f) => {
        push({ ...f, confidence: f.confidence || "low" });
      });

      return out;
    } catch (_) {
      return [];
    }
  };

})(typeof window !== "undefined" ? window : globalThis);