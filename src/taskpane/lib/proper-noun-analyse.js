/* Proper-noun consistency — original JS for ProzaEdit (not a port of Word Macro Tools VBA). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ProperNoun = {
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
      const skip = ["The", "He", "She", "They", "It", "We", "I", "But", "And", "Then", "When", "What", "Chapter"];
      if (skip.includes(token.split(" ")[0])) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
    }
    return counts;
  },

  findInconsistencies(text, dictionary) {
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
        const dist = this.levenshtein(a.toLowerCase(), b.toLowerCase());
        if (dist > 0 && dist <= 2 && a[0] === b[0]) {
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
    return suggestions;
  },
};
