/**
 * Editorial consistency checks — original ProzaEdit JavaScript.
 * Inspired by widely described proofreading workflows (e.g. Paul Beverley’s public
 * Word Macro Tools catalog). No VBA or macro source is copied; see THIRD-PARTY-ATTRIBUTION.md.
 */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.EditorHeuristics = {
  /** a/an — common false positives only; suggest review, not auto-fix. */
  scanAAn(text, push, limit) {
    limit = limit || 6;
    let n = 0;
    const re = /\b(a|an)\s+([A-Za-z][\w'-]*)/gi;
    let m;
    const anBeforeConsonantSound = /^(b|c(d|f|g|h|j|k|l|m|n|p|q|r|s|t|v|w|x|y|z)|uni(?!t)|one|once|u[bcdefghjkpqwxyz])/i;
    const aBeforeVowelSound = /^(a|e|i|o|u)/i;
    const useAn = /^(hour|honest|honor|heir|html|hmi|mba|mri|nlp|ngo|fbi|fda|eu|uk|un|us|ufo|mp|lp|rt|hr)\b/i;
    const useA = /^(uni(t|form|verse|ty)|user|euro|one|once|ouija|ukulele)\b/i;

    while ((m = re.exec(text)) !== null && n < limit) {
      const article = m[1].toLowerCase();
      const word = m[2];
      const wLow = word.toLowerCase();
      let bad = false;
      let hint = "";
      if (article === "a") {
        if (aBeforeVowelSound.test(wLow) && !useA.test(wLow)) {
          bad = true;
          hint = `Consider “an ${word}”.`;
        }
      } else if (article === "an") {
        if ((anBeforeConsonantSound.test(wLow) || /^[bcdfghjklmnpqrstvwxyz]/i.test(wLow)) && !useAn.test(wLow)) {
          bad = true;
          hint = `Consider “a ${word}”.`;
        }
      }
      if (bad) {
        n++;
        push({
          ruleId: `edit:aan:${wLow}:${m.index}`,
          module: "Editorial consistency",
          type: "preference",
          explanation: `Possible a/an issue — ${hint}`,
          targetText: `${m[1]} ${word}`,
          replacementText: "(check article)",
        });
      }
    }
  },

  /** Consecutive duplicate tokens (2- or 3-word), e.g. “the the”, “he said he said”. */
  scanConsecutiveDuplicates(text, push, limit) {
    limit = limit || 8;
    let n = 0;
    const re2 = /\b([\w'-]+)\s+\1\b/gi;
    let m;
    while ((m = re2.exec(text)) !== null && n < limit) {
      n++;
      push({
        ruleId: `edit:dup1:${m[1].toLowerCase()}:${m.index}`,
        module: "Editorial consistency",
        type: "confirmed",
        explanation: `Repeated word “${m[1]}”.`,
        targetText: m[0],
        replacementText: m[1],
      });
    }
    const re3 = /\b([\w'-]+\s+[\w'-]+)\s+\1\b/gi;
    while ((m = re3.exec(text)) !== null && n < limit) {
      n++;
      push({
        ruleId: `edit:dup2:${m.index}`,
        module: "Editorial consistency",
        type: "confirmed",
        explanation: `Repeated phrase “${m[1]}”.`,
        targetText: m[0].substring(0, 80),
        replacementText: m[1],
      });
    }
  },

  /** Exact duplicate sentences (normalized), min length to skip headings. */
  scanDuplicateSentences(text, push, limit) {
    limit = limit || 3;
    const parts = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length >= 45);
    const map = new Map();
    parts.forEach((s) => {
      const norm = s.replace(/\s+/g, " ").trim().toLowerCase();
      if (!map.has(norm)) map.set(norm, { count: 0, sample: s.trim() });
      const e = map.get(norm);
      e.count++;
    });
    let n = 0;
    [...map.entries()]
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([, v]) => {
        if (n >= limit) return;
        n++;
        push({
          ruleId: `edit:duplsent:${v.sample.substring(0, 40).toLowerCase()}`,
          module: "Editorial consistency",
          type: "preference",
          explanation: `Same sentence appears ${v.count} times — check copy-paste or repetition.`,
          targetText: v.sample.substring(0, 120),
          replacementText: "(revise or cut duplicate)",
        });
      });
  },

  scanQuoteBalance(text, push) {
    const straight = (text.match(/"/g) || []).length;
    if (straight > 0 && straight % 2 !== 0) {
      push({
        ruleId: "edit:quote:double",
        module: "Editorial consistency",
        type: "preference",
        explanation: "Odd number of straight double quotation marks — check pairing.",
        targetText: '"',
        replacementText: "(pair quotes)",
      });
    }
    const curlyOpen = (text.match(/\u201C/g) || []).length;
    const curlyClose = (text.match(/\u201D/g) || []).length;
    if (curlyOpen + curlyClose > 0 && curlyOpen !== curlyClose) {
      push({
        ruleId: "edit:quote:curly",
        module: "Editorial consistency",
        type: "preference",
        explanation: "Curly quote marks may be unbalanced — review dialogue.",
        targetText: "\u201C\u201D",
        replacementText: "(pair quotes)",
      });
    }
  },

  /** Both forms present in excerpt — consistency flag only. */
  scanSplitCompoundVariants(text, lower, push) {
    const pairs = [
      ["can not", "cannot"],
      ["all right", "alright"],
      ["a lot", "alot"],
      ["every day", "everyday"],
      ["any one", "anyone"],
      ["some one", "someone"],
    ];
    pairs.forEach(([a, b]) => {
      const hasA = lower.includes(a);
      const hasB = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower);
      if (hasA && hasB) {
        push({
          ruleId: `edit:split:${a.replace(/\s/g, "_")}`,
          module: "Editorial consistency",
          type: "preference",
          explanation: `Mixed “${a}” and “${b}” in this excerpt — pick one form.`,
          targetText: a,
          replacementText: b,
        });
      }
    });
  },

  /** Repeated sentence openings (first 5 words), capped. */
  scanRepeatedOpenings(text, push, limit) {
    limit = limit || 3;
    const counts = new Map();
    text.split(/(?<=[.!?])\s+/).forEach((s) => {
      const words = s.match(/\b[\w'-]+\b/g);
      if (!words || words.length < 6) return;
      const key = words.slice(0, 5).join(" ").toLowerCase();
      if (key.length < 12) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    let n = 0;
    [...counts.entries()]
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, c]) => {
        if (n >= limit) return;
        n++;
        push({
          ruleId: `edit:open:${key.substring(0, 30)}`,
          module: "Editorial consistency",
          type: "preference",
          explanation: `Sentence opening “${key}…” repeats ${c} times — vary structure.`,
          targetText: key,
          replacementText: "(vary opening)",
        });
      });
  },

  /** Same lemma with different mid-sentence capitalisation (simple CapitAlyse-style signal). */
  scanMidCapitalInconsistency(text, push, limit) {
    limit = limit || 4;
    const lowerFreq = new Map();
    const titleFreq = new Map();
    const re = /\b([A-Za-z][a-z]{2,})\b/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const w = m[1];
      const low = w.toLowerCase();
      if (w[0] === w[0].toUpperCase() && w.slice(1) === w.slice(1).toLowerCase()) {
        const before = text.substring(Math.max(0, m.index - 2), m.index);
        if (/^[.!?]\s*$/.test(before) || m.index < 3) continue;
        titleFreq.set(low, (titleFreq.get(low) || 0) + 1);
      } else if (w === low) {
        lowerFreq.set(low, (lowerFreq.get(low) || 0) + 1);
      }
    }
    let n = 0;
    [...titleFreq.keys()].forEach((low) => {
      if (n >= limit) return;
      const t = titleFreq.get(low) || 0;
      const l = lowerFreq.get(low) || 0;
      if (t >= 2 && l >= 2) {
        n++;
        push({
          ruleId: `edit:cap:${low}`,
          module: "Editorial consistency",
          type: "preference",
          explanation: `“${low}” appears both capitalized and lowercase mid-text — check style (titles vs common nouns).`,
          targetText: low,
          replacementText: "(pick one style)",
        });
      }
    });
  },

  /** Academic / formal tallies (DocAlyse-style signals, counts only). */
  docFormalTally(text) {
    const lower = text.toLowerCase();
    return {
      ie: (lower.match(/\bi\.e\.\b/g) || []).length,
      eg: (lower.match(/\be\.g\.\b/g) || []).length,
      etc: (lower.match(/\betc\.\b/g) || []).length,
      among: (lower.match(/\bamong\b/g) || []).length,
      amongst: (lower.match(/\bamongst\b/g) || []).length,
    };
  },

  scanFormalMix(text, lower, push, manuscriptType) {
    if (!String(manuscriptType || "").match(/Academic|Business|Technical/)) return;
    const t = this.docFormalTally(text);
    if (t.among > 0 && t.amongst > 0) {
      push({
        ruleId: "edit:among",
        module: "Editorial consistency",
        type: "preference",
        explanation: "Both “among” and “amongst” in excerpt — pick one register.",
        targetText: "amongst",
        replacementText: "among",
      });
    }
    if (t.ie > 0 && (lower.match(/\bin other words\b/g) || []).length > 2) {
      push({
        ruleId: "edit:ie_density",
        module: "Editorial consistency",
        type: "preference",
        explanation: "Heavy use of i.e. / “in other words” — tighten formal prose.",
        targetText: "i.e.",
        replacementText: "(rephrase)",
      });
    }
  },

  runStandardChecks(text, push, ctx) {
    if (!text || text.length < 20) return;
    if (ctx.chkSpell !== false) {
      this.scanAAn(text, push, 5);
      this.scanConsecutiveDuplicates(text, push, 6);
      this.scanQuoteBalance(text, push);
    }
    if (ctx.chkRep !== false) {
      this.scanSplitCompoundVariants(text, text.toLowerCase(), push);
    }
  },

  runExtendedChecks(text, push, ctx) {
    if (!text || text.length < 80) return;
    this.scanDuplicateSentences(text, push, 3);
    this.scanRepeatedOpenings(text, push, 3);
    this.scanMidCapitalInconsistency(text, push, 3);
    this.scanFormalMix(text, text.toLowerCase(), push, ctx.manuscriptType);
  },
};
