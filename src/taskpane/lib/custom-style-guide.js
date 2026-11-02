/**
 * User-defined style rules (per document). Original content by the author — not third-party guides.
 */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.CustomStyleGuide = {
  MAX_RULES: 60,
  MAX_FIND: 120,
  MAX_REPLACE: 120,
  MAX_HINT: 200,
  MAX_NAME: 80,

  empty() {
    return { name: "My house style", rules: [] };
  },

  normalize(data) {
    data = data || this.empty();
    const name = String(data.name || "My house style").trim().substring(0, this.MAX_NAME) || "My house style";
    const rules = Array.isArray(data.rules) ? data.rules : [];
    const clean = [];
    const seen = new Set();
    for (let i = 0; i < rules.length && clean.length < this.MAX_RULES; i++) {
      const r = this.normalizeRule(rules[i]);
      if (!r) continue;
      const key = r.find.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push(r);
    }
    return { name, rules: clean };
  },

  normalizeRule(raw) {
    if (!raw) return null;
    const find = String(raw.find || raw.phrase || "").trim();
    if (!find || find.length > this.MAX_FIND) return null;
    let replace = raw.replace != null ? String(raw.replace).trim() : "";
    if (replace.length > this.MAX_REPLACE) replace = replace.substring(0, this.MAX_REPLACE);
    let hint = raw.hint != null ? String(raw.hint).trim() : "";
    if (hint.length > this.MAX_HINT) hint = hint.substring(0, this.MAX_HINT);
    const id =
      raw.id ||
      `custom_${find
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "_")
        .slice(0, 48)}`;
    return { id, find, replace, hint };
  },

  /** One rule per line: `find => replace` or `find => replace | hint` (# = comment) */
  parseBulk(text) {
    const out = [];
    String(text || "")
      .split(/\r?\n/)
      .forEach((line) => {
        line = line.trim();
        if (!line || line.startsWith("#")) return;
        let hint = "";
        const pipe = line.indexOf("|");
        if (pipe >= 0) {
          hint = line.substring(pipe + 1).trim();
          line = line.substring(0, pipe).trim();
        }
        let find = "";
        let replace = "";
        if (line.includes("=>")) {
          const p = line.split("=>");
          find = (p[0] || "").trim();
          replace = p.slice(1).join("=>").trim();
        } else if (line.includes("\t")) {
          const p = line.split("\t");
          find = (p[0] || "").trim();
          replace = (p[1] || "").trim();
        } else if (/\s->\s/.test(line)) {
          const p = line.split(/\s->\s/);
          find = (p[0] || "").trim();
          replace = (p[1] || "").trim();
        } else {
          find = line;
          replace = "";
        }
        const r = this.normalizeRule({ find, replace, hint });
        if (r) out.push(r);
      });
    return out;
  },

  escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  /**
   * Case-insensitive phrase test. With wholeWord, the match must not touch a letter, digit or underscore on either
   * side (Unicode-aware, so "café" and "naïve" work); a side that starts/ends with punctuation needs no boundary.
   */
  phraseInText(text, lower, phrase, wholeWord) {
    const p = String(phrase || "").trim().toLowerCase();
    if (!p) return false;
    if (!wholeWord) return String(lower != null ? lower : text).includes(p);
    const W = "[\\p{L}\\p{N}_]";
    const pre = new RegExp(`^${W}`, "u").test(p) ? `(?:^|[^\\p{L}\\p{N}_])` : "";
    const post = new RegExp(`${W}$`, "u").test(p) ? `(?!${W})` : "";
    const body = this.escapeRegex(p).replace(/\s+/g, "\\s+");
    try {
      return new RegExp(`${pre}${body}${post}`, "iu").test(String(text != null ? text : lower));
    } catch (_) {
      return String(lower != null ? lower : text).includes(p);
    }
  },

  /** Curated starters (original lines — not copied from licensed guides). */
  getPreset(id) {
    if (id === "plain-starter") {
      return {
        name: "Plain Language starter",
        rules: [
          { find: "in order to", replace: "to", hint: "Shorter phrasing" },
          { find: "due to the fact that", replace: "because", hint: "Plain language" },
          { find: "utilize", replace: "use", hint: "Simpler verb" },
          { find: "at this point in time", replace: "now", hint: "Cut padding" },
        ],
      };
    }
    if (id === "uk-starter") {
      return {
        name: "UK English starter",
        rules: [
          { find: "e-mail", replace: "email", hint: "GOV.UK-style spelling" },
          { find: "amongst", replace: "among", hint: "Pick one register" },
          { find: "color", replace: "colour", hint: "UK spelling" },
          { find: "organize", replace: "organise", hint: "UK spelling" },
        ],
      };
    }
    return null;
  },

  exportLines(data) {
    data = this.normalize(data);
    return data.rules
      .map((r) => {
        let line = `${r.find} => ${r.replace || ""}`.trim();
        if (r.hint) line += ` | ${r.hint}`;
        return line;
      })
      .join("\n");
  },

  mergeRules(existing, incoming) {
    const base = this.normalize(existing);
    incoming.forEach((r) => {
      const n = this.normalizeRule(r);
      if (!n) return;
      const idx = base.rules.findIndex((x) => x.find.toLowerCase() === n.find.toLowerCase());
      if (idx >= 0) base.rules[idx] = n;
      else if (base.rules.length < this.MAX_RULES) base.rules.push(n);
    });
    return base;
  },
};
