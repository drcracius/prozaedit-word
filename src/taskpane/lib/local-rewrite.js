/* Rule-based paraphrase (no LLM). Based on classic style/editing heuristics (Strunk-style tightening, register shifts). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.LocalRewrite = {
  get CONTRACTIONS() {
    return ProzaEdit.LexicalBanks?.CONTRACTIONS || {};
  },

  get WORDINESS() {
    return ProzaEdit.LexicalBanks?.WORDINESS || [];
  },

  get NOMINALIZATIONS() {
    return ProzaEdit.LexicalBanks?.NOMINALIZATIONS || [];
  },

  get UNCOMPARABLES() {
    return ProzaEdit.LexicalBanks?.UNCOMPARABLES || [];
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

  /** Whole-word, case-preserving replace ("bandit's" is not "it's"; "Don't" becomes "Do not"). */
  _replaceWord(text, find, repl) {
    if (!find) return text;
    const esc = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^A-Za-z0-9_\\u00C0-\\u024F])(${esc})(?![A-Za-z0-9_\\u00C0-\\u024F])`, "gi");
    return text.replace(re, (m, pre, hit) => pre + (/^[A-Z]/.test(hit) && /^[a-z]/.test(repl) ? repl[0].toUpperCase() + repl.slice(1) : repl));
  },

  /** Remove matches of `re` (which must capture trailing whitespace) and keep a sentence-start capital on the next word. */
  _dropPhrase(text, re) {
    return text.replace(re, (m, offset, whole) => {
      const startsUpper = /^[A-Z]/.test(m);
      const before = whole.slice(0, offset);
      const atStart = !before.trim() || /[.!?]["\u201D')\]]*\s*$/.test(before);
      if (!(startsUpper || atStart)) return "";
      return "\u0001";
    }).replace(/\u0001(\s*)([a-z])/g, (m, sp, ch) => sp + ch.toUpperCase()).replace(/\u0001/g, "");
  },

  _applyBankPairs(text, list) {
    let t = text;
    (list || []).forEach((row) => {
      const find = row && row[0];
      const raw = row && row[1];
      if (!find || !raw || String(raw).startsWith("(")) return;
      const repl = String(raw).split(" / ")[0].trim();
      if (!repl) return;
      t = this._replaceWord(t, find, repl);
    });
    return t;
  },

  _applyPleonasms(text) {
    return this._applyBankPairs(text, ProzaEdit.LexicalBanks?.PLEONASMS || ProzaEdit.Audit?.PLEONASMS || []);
  },

  fluency(text) {
    let t = this._normalize(text);
    t = this._applyBankPairs(t, this.WORDINESS);
    t = this._applyBankPairs(t, this.NOMINALIZATIONS);
    t = this._applyPleonasms(t);
    t = this._applyBankPairs(t, this.UNCOMPARABLES);
    t = this._dropPhrase(t, /\b(?:in fact|as a matter of fact),?[ \t]*/gi);
    return t.trim();
  },

  formal(text) {
    let t = this.fluency(text);
    t = t.replace(/[\u2018\u2019]/g, "'");
    Object.entries(this.CONTRACTIONS).forEach(([c, exp]) => {
      t = this._replaceWord(t, c, exp);
    });
    t = t.replace(/\b(a lot of)\s+([A-Za-z\u00C0-\u024F'-]+)/gi, (m, lot, next) => {
      const many = /[^s]s$/i.test(next) || /(?:men|women|children|people)$/i.test(next);
      const word = many ? "many" : "a great deal of";
      return (/^A/.test(lot) ? word[0].toUpperCase() + word.slice(1) : word) + " " + next;
    });
    t = t.replace(/\b(is|was|are|were|be|been|seems?|seemed|looks?|looked|feels?|felt)\s+(?:kind|sort) of\s+/gi, "$1 somewhat ");
    return t.trim();
  },

  academic(text) {
    let t = this.formal(text);
    for (let i = 0; i < 3; i++) t = this._dropPhrase(t, /\b(?:very|really|quite|extremely|incredibly)[ \t]+(?=[A-Za-z])/gi);
    t = t.replace(/\bI think\b/g, "The analysis indicates");
    t = t.replace(/\bI believe\b/g, "The evidence suggests");
    return t.trim();
  },

  creative(text) {
    let t = this.fluency(text);
    t = this._dropPhrase(t, /\b(?:Suddenly|Instantly|Without warning),?[ \t]*/g);
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
