/* Proper-noun consistency — original JS for ProzaEdit (not a port of Word Macro Tools VBA). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ProperNoun = {
  /** Short/common words — similar to PerfectIt “Never Find” for false positives (states vs States, as vs As). */
  STOPWORDS: new Set(
    "as at an in on or to he she it we they but then when what who how why if so no yes up out all any can could would should may might must will did does do has have had was were been being are is am be by for of the the and nor not yet still also just even only very much more most such than that this these those with from into onto upon over under after before about between through during without within".split(
      " "
    )
  ),

  levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  },

  extract(text, dictionaryLower) {
    const re = /\b[A-Z][a-z]+(?:[''][A-Z][a-z]+)*(?:\s+[A-Z][a-z]+){0,2}\b/g;
    const counts = new Map();
    let m;
    while ((m = re.exec(text)) !== null) {
      const token = m[0].trim();
      if (token.length < 2 || token.length > 40) continue;
      const lower = token.toLowerCase();
      if (dictionaryLower.has(lower)) continue;
      const first = token.split(" ")[0];
      const skip = ["The", "He", "She", "They", "It", "We", "I", "But", "And", "Then", "When", "What", "Chapter", "His", "Her", "Their", "Our", "Your"];
      if (skip.includes(first)) continue;
      if (first.length < 4 && !token.includes(" ")) continue;
      if (this.STOPWORDS.has(first.toLowerCase())) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
    }
    return counts;
  },

  /**
   * Single-token names from the whole-manuscript roster (full-manuscript context index) that the audited text
   * spells almost the same but not identically. Conservative: type "preference", never "confirmed".
   */
  rosterVariants(text, roster, dictLower, limit) {
    const out = [];
    const known = new Map();
    (roster || []).forEach((n) => {
      const name = String(n || "").trim();
      if (/^[A-Z][a-z]{4,}$/.test(name) && !this.STOPWORDS.has(name.toLowerCase())) known.set(name.toLowerCase(), name);
    });
    if (!known.size) return out;
    const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const forms = new Set();
    const wordRe = /\b[A-Z][a-z]{4,}\b/g;
    let wm;
    while ((wm = wordRe.exec(text)) !== null && forms.size < 400) forms.add(wm[0]);
    for (const form of forms) {
      if (out.length >= limit) break;
      const fl = form.toLowerCase();
      if (known.has(fl) || this.STOPWORDS.has(fl) || dictLower.has(fl)) continue;
      const plainWord = new RegExp(`\\b${escape(fl)}\\b`);
      if (plainWord.test(text)) continue;
      for (const [rl, r] of known) {
        if (form[0] !== r[0] || Math.abs(form.length - r.length) > 2) continue;
        const dist = this.levenshtein(fl, rl);
        if (dist === 1 || (dist === 2 && form.length >= 8)) {
          out.push({
            ruleId: `prop:roster:${fl}`,
            module: "Proper noun consistency",
            type: "preference",
            explanation: `Possible spelling variant: "${form}" is very close to "${r}", a recurring name elsewhere in your manuscript (from your book outline). Check which spelling you intend.`,
            targetText: form,
            replacementText: r,
          });
          break;
        }
      }
    }
    return out;
  },

  findInconsistencies(text, dictionary, opts) {
    const sample = String(text || "").substring(0, 100000);
    const dictLower = new Set((dictionary || []).map((d) => d.toLowerCase()));
    const counts = this.extract(sample, dictLower);
    const forms = [...counts.keys()].slice(0, 120);
    const suggestions = [];
    const used = new Set();
    for (let i = 0; i < forms.length && suggestions.length < 12; i++) {
      for (let j = i + 1; j < forms.length && suggestions.length < 12; j++) {
        const a = forms[i];
        const b = forms[j];
        const key = [a.toLowerCase(), b.toLowerCase()].sort().join("|");
        if (used.has(key)) continue;
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        if (this.STOPWORDS.has(aLow) || this.STOPWORDS.has(bLow)) continue;
        if (a.includes(" ") || b.includes(" ")) {
          /* multi-word names OK */
        } else if (a.length < 5 || b.length < 5) continue;
        const dist = this.levenshtein(aLow, bLow);
        const minCount = Math.min(counts.get(a) || 0, counts.get(b) || 0);
        if (dist > 0 && dist <= 2 && a[0] === b[0] && Math.abs(a.length - b.length) <= 2 && minCount >= 2) {
          used.add(key);
          const canonical = counts.get(a) >= counts.get(b) ? a : b;
          const variant = canonical === a ? b : a;
          suggestions.push({
            ruleId: `prop:variant:${variant.toLowerCase()}`,
            module: "Proper noun consistency",
            type: "confirmed",
            explanation: `Proper noun spelling variants "${a}" vs "${b}".`,
            targetText: variant,
            replacementText: canonical,
          });
        }
      }
    }
    const roster = opts && Array.isArray(opts.knownNames) ? opts.knownNames : [];
    if (roster.length) {
      this.rosterVariants(String(text || ""), roster, dictLower, 6).forEach((x) => {
        if (!suggestions.some((y) => y.targetText === x.targetText)) suggestions.push(x);
      });
    }
    return suggestions;
  },
};
