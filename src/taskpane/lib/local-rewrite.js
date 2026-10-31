/* Rule-based paraphrase (no LLM). Based on classic style/editing heuristics (Strunk-style tightening, register shifts). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.LocalRewrite = {
  get CONTRACTIONS() {
    return ProzaEdit.LexicalBanks?.CONTRACTIONS || {};
  },

  get WORDINESS() {
    return ProzaEdit.LexicalBanks?.WORDINESS || [];
  },

  get INFORMAL_TO_FORMAL() {
    return ProzaEdit.LexicalBanks?.INFORMAL_TO_FORMAL || [];
  },

  _normalize(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/ +([,.;:!?])/g, "$1")
      .replace(/\n{3,}/g, "\n\n");
  },

  _replaceAllInsensitive(text, find, repl) {
    if (!find) return text;
    const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return text.replace(re, repl);
  },

  _applyPleonasms(text) {
    let t = text;
    const list = ProzaEdit.LexicalBanks?.PLEONASMS || ProzaEdit.Audit?.PLEONASMS || [];
    list.forEach(([target, replacement]) => {
      t = this._replaceAllInsensitive(t, target, replacement);
    });
    return t;
  },

  fluency(text) {
    let t = this._normalize(text);
    this.WORDINESS.forEach(([a, b]) => {
      t = this._replaceAllInsensitive(t, a, b);
    });
    t = this._applyPleonasms(t);
    t = t.replace(/\b(in fact|as a matter of fact),?\s*/gi, "");
    return t.trim();
  },

  formal(text) {
    let t = this.fluency(text);
    Object.entries(this.CONTRACTIONS).forEach(([c, exp]) => {
      t = this._replaceAllInsensitive(t, c, exp);
    });
    this.INFORMAL_TO_FORMAL.forEach(([a, b]) => {
      t = this._replaceAllInsensitive(t, ` ${a} `, ` ${b} `);
    });
    return t.trim();
  },

  academic(text) {
    let t = this.formal(text);
    t = t.replace(/\b(very|really|quite|extremely|incredibly)\s+(\w+)/gi, "$2");
    t = t.replace(/\bI think\b/gi, "The analysis indicates");
    t = t.replace(/\bI believe\b/gi, "The evidence suggests");
    return t.trim();
  },

  creative(text) {
    let t = this.fluency(text);
    t = t.replace(/\b(Suddenly|Instantly|Without warning),?\s*/g, "");
    return t.trim();
  },

  run(mode, text) {
    const m = String(mode || "fluency").toLowerCase();
    if (m === "formal") return this.formal(text);
    if (m === "academic") return this.academic(text);
    if (m === "creative") return this.creative(text);
    return this.fluency(text);
  },
};
