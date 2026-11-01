/* ProzaEdit document-scoped settings (Office.context.document.settings) */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Settings = {
  KEYS: {
    CONFIG: "PROZAEDIT_CONFIG",
    MUTED: "PROZAEDIT_MUTED_RULES",
    GLOBAL_MUTED: "PROZAEDIT_GLOBAL_MUTED_RULES",
    GLOBAL_DISMISSED: "PROZAEDIT_GLOBAL_DISMISSED_TARGETS",
    DICTIONARY: "PROZAEDIT_DICTIONARY",
    LAST_AUDIT: "PROZAEDIT_LAST_AUDIT",
    SECTION_IDX: "PROZAEDIT_SECTION_IDX",
    CHAPTER_IDX: "PROZAEDIT_CHAPTER_IDX",
    LAST_AUDIT_STATS: "PROZAEDIT_LAST_AUDIT_STATS",
    CHAPTER_HEATMAP: "PROZAEDIT_CHAPTER_HEATMAP",
    REFERENCE_STYLE: "PROZAEDIT_REFERENCE_STYLE",
    CUSTOM_STYLE: "PROZAEDIT_CUSTOM_STYLE",
    MCI: "PROZAEDIT_MCI_V2",
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

  SAVE_TIMEOUT_MS: 15000,

  get(key, fallback) {
    try {
      return Office.context.document.settings.get(key) ?? fallback;
    } catch (_) {
      return fallback;
    }
  },

  /** Always resolves (never rejects or hangs): false on quota errors, missing Office, or a saveAsync that never calls back. */
  setAsync(key, value) {
    return new Promise((resolve) => {
      let done = false;
      let timer = null;
      const finish = (ok) => {
        if (done) return;
        done = true;
        if (timer != null && typeof clearTimeout === "function") clearTimeout(timer);
        resolve(!!ok);
      };
      try {
        const settings = Office.context.document.settings;
        settings.set(key, value);
        if (typeof setTimeout === "function") timer = setTimeout(() => finish(false), this.SAVE_TIMEOUT_MS);
        settings.saveAsync((r) => {
          finish(r && r.status === Office.AsyncResultStatus.Succeeded);
        });
      } catch (_) {
        finish(false);
      }
    });
  },

  /**
   * Like setAsync, but when the save fails the staged value is rolled back so a bad/oversized value
   * can never poison later saves of other keys (e.g. the main PROZAEDIT_CONFIG blob).
   */
  async setAsyncGuarded(key, value) {
    let hadPrev = false;
    let prev;
    try {
      prev = Office.context.document.settings.get(key);
      hadPrev = prev !== undefined && prev !== null;
    } catch (_) {}
    const ok = await this.setAsync(key, value);
    if (!ok) {
      try {
        const settings = Office.context.document.settings;
        if (hadPrev) settings.set(key, prev);
        else if (typeof settings.remove === "function") settings.remove(key);
        else settings.set(key, null);
      } catch (_) {}
    }
    return ok;
  },

  _readGlobalJson(key) {
    try {
      const raw = localStorage.getItem(key);
      const arr = this._parse(raw, []);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === "string" && x.length <= 200).slice(-800) : [];
    } catch (_) {
      return [];
    }
  },

  _writeGlobalJson(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr.slice(-800)));
      return true;
    } catch (_) {
      return false;
    }
  },

  normalizeTargetKey(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .substring(0, 120);
  },

  getGlobalMutedRules() {
    return this._readGlobalJson(this.KEYS.GLOBAL_MUTED);
  },

  getGlobalDismissedTargets() {
    return this._readGlobalJson(this.KEYS.GLOBAL_DISMISSED);
  },

  getMutedRules() {
    const raw = this.get(this.KEYS.MUTED, "[]");
    const doc = this._parse(raw, []);
    const docArr = Array.isArray(doc) ? doc : [];
    const merged = new Set([...docArr, ...this.getGlobalMutedRules()]);
    return [...merged].filter((x) => typeof x === "string" && x.length <= 200).slice(-800);
  },

  isTargetDismissedGlobally(targetText) {
    const key = this.normalizeTargetKey(targetText);
    if (!key || key.startsWith("(")) return false;
    return this.getGlobalDismissedTargets().includes(key);
  },

  async muteRule(ruleId, options) {
    options = options || {};
    if (!ruleId) return true;
    const global = options.global !== false;
    const existing = this._parse(this.get(this.KEYS.MUTED, "[]"), []);
    const setDoc = new Set(Array.isArray(existing) ? existing.filter((x) => typeof x === "string") : []);
    setDoc.add(ruleId);
    const saved = await this.setAsyncGuarded(this.KEYS.MUTED, JSON.stringify([...setDoc]));
    if (global) {
      const g = new Set(this.getGlobalMutedRules());
      g.add(ruleId);
      this._writeGlobalJson(this.KEYS.GLOBAL_MUTED, [...g]);
    }
    return saved !== false;
  },

  async dismissTarget(targetText) {
    const key = this.normalizeTargetKey(targetText);
    if (!key || key.startsWith("(")) return;
    const g = new Set(this.getGlobalDismissedTargets());
    g.add(key);
    this._writeGlobalJson(this.KEYS.GLOBAL_DISMISSED, [...g]);
  },

  async resetMutedRules() {
    const ok = await this.setAsyncGuarded(this.KEYS.MUTED, JSON.stringify([]));
    try {
      localStorage.removeItem(this.KEYS.GLOBAL_MUTED);
      localStorage.removeItem(this.KEYS.GLOBAL_DISMISSED);
    } catch (_) {}
    return ok;
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
    return this.setAsyncGuarded(this.KEYS.DICTIONARY, JSON.stringify(list.slice(-500)));
  },

  async removeDictionaryWord(word) {
    const w = String(word || "").trim().toLowerCase();
    const next = this.getDictionary().filter((x) => x.toLowerCase() !== w);
    return this.setAsyncGuarded(this.KEYS.DICTIONARY, JSON.stringify(next));
  },

  /** JSON array export for author backup (Settings copy/paste). */
  exportDictionaryJson() {
    return JSON.stringify(this.getDictionary(), null, 2);
  },

  /**
   * Merge unique terms from JSON (array of strings). Returns { ok, added, total }.
   */
  async importDictionaryJson(raw) {
    const parsed = this._parse(raw, null);
    if (!Array.isArray(parsed)) return { ok: false, added: 0, total: this.getDictionary().length };
    const list = this.getDictionary();
    const seen = new Set(list.map((x) => x.toLowerCase()));
    let added = 0;
    for (const item of parsed) {
      const w = String(item || "").trim();
      if (!w || w.length > 80) continue;
      const low = w.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      list.push(w);
      added += 1;
    }
    const next = list.slice(-500);
    const ok = await this.setAsyncGuarded(this.KEYS.DICTIONARY, JSON.stringify(next));
    return { ok: !!ok, added, total: next.length };
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
    return this.setAsyncGuarded(this.KEYS.CUSTOM_STYLE, json);
  },
};
