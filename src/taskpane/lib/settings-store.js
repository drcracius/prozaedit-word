/* ProzaEdit document-scoped settings (Office.context.document.settings) */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Settings = {
  KEYS: {
    CONFIG: "PROZAEDIT_CONFIG",
    MUTED: "PROZAEDIT_MUTED_RULES",
    DICTIONARY: "PROZAEDIT_DICTIONARY",
    LAST_AUDIT: "PROZAEDIT_LAST_AUDIT",
    SECTION_IDX: "PROZAEDIT_SECTION_IDX",
    CHAPTER_IDX: "PROZAEDIT_CHAPTER_IDX",
    LAST_AUDIT_STATS: "PROZAEDIT_LAST_AUDIT_STATS",
    CHAPTER_HEATMAP: "PROZAEDIT_CHAPTER_HEATMAP",
    REFERENCE_STYLE: "PROZAEDIT_REFERENCE_STYLE",
    CUSTOM_STYLE: "PROZAEDIT_CUSTOM_STYLE",
  },

  _parse(raw, fallback) {
    if (raw == null) return fallback;
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  },

  get(key, fallback) {
    return Office.context.document.settings.get(key) ?? fallback;
  },

  setAsync(key, value) {
    Office.context.document.settings.set(key, value);
    return new Promise((resolve) => {
      Office.context.document.settings.saveAsync((r) => {
        resolve(r.status === Office.AsyncResultStatus.Succeeded);
      });
    });
  },

  getMutedRules() {
    const raw = this.get(this.KEYS.MUTED, "[]");
    const arr = this._parse(raw, []);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => typeof x === "string" && x.length <= 200).slice(0, 500);
  },

  async muteRule(ruleId) {
    if (!ruleId) return;
    const set = new Set(this.getMutedRules());
    set.add(ruleId);
    await this.setAsync(this.KEYS.MUTED, JSON.stringify([...set]));
  },

  async resetMutedRules() {
    await this.setAsync(this.KEYS.MUTED, JSON.stringify([]));
  },

  getDictionary() {
    const raw = this.get(this.KEYS.DICTIONARY, "[]");
    const arr = this._parse(raw, []);
    if (!Array.isArray(arr)) return [];
    return arr.map(String).filter((x) => x.length > 0 && x.length <= 80).slice(0, 500);
  },

  async addDictionaryWord(word) {
    const w = String(word || "").trim();
    if (!w || w.length > 80) return false;
    const list = this.getDictionary();
    if (list.some((x) => x.toLowerCase() === w.toLowerCase())) return true;
    list.push(w);
    await this.setAsync(this.KEYS.DICTIONARY, JSON.stringify(list.slice(-500)));
    return true;
  },

  async removeDictionaryWord(word) {
    const w = String(word || "").trim().toLowerCase();
    const next = this.getDictionary().filter((x) => x.toLowerCase() !== w);
    await this.setAsync(this.KEYS.DICTIONARY, JSON.stringify(next));
  },

  getCustomStyleGuide() {
    const raw = this.get(this.KEYS.CUSTOM_STYLE, null);
    const data = this._parse(raw, null);
    if (ProzaEdit.CustomStyleGuide?.normalize) return ProzaEdit.CustomStyleGuide.normalize(data);
    return { name: "My house style", rules: [] };
  },

  async setCustomStyleGuide(data) {
    const norm = ProzaEdit.CustomStyleGuide?.normalize ? ProzaEdit.CustomStyleGuide.normalize(data) : data;
    const json = JSON.stringify(norm);
    if (json.length > 48000) return false;
    return this.setAsync(this.KEYS.CUSTOM_STYLE, json);
  },
};
