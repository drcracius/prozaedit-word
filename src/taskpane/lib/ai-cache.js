/**
 * Device-local cache of AI replies, so repeating the same request costs nothing. Stored only in this browser profile's
 * localStorage (never in the Word document). Keyed by a hash of provider + model + genre + temperature + the full prompt
 * (which contains the excerpt). Holds the reply text only: never API keys, never the prompt. Size-capped LRU with a TTL.
 */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});
  const STORE_KEY = "pe_ai_cache_v1";

  function h32(str, seed) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
      h ^= h >>> 15;
    }
    return h.toString(36);
  }

  const AICache = {
    STORE_KEY,
    MAX_ENTRIES: 40,
    MAX_TOTAL_CHARS: 400000,
    MAX_ENTRY_CHARS: 60000,
    TTL_MS: 7 * 24 * 60 * 60 * 1000,

    makeKey(parts) {
      const p = parts || {};
      const prompt = String(p.prompt == null ? "" : p.prompt);
      const head = [p.providerId, p.model, p.genre, p.temperature == null ? "" : p.temperature].map((x) => String(x == null ? "" : x)).join("\u0001");
      const all = head + "\u0002" + prompt;
      return `${h32(all, 2166136261)}${h32(all, 5381)}${h32(all.split("").reverse().join(""), 7919)}.${all.length}`;
    },

    _read() {
      try {
        const o = JSON.parse(global.localStorage.getItem(STORE_KEY) || "null");
        if (o && o.v === 1 && Array.isArray(o.entries)) return o.entries.filter((e) => e && typeof e.k === "string" && typeof e.text === "string" && Number.isFinite(e.t));
      } catch (_) {}
      return [];
    },
    _write(entries) {
      try {
        if (!entries.length) global.localStorage.removeItem(STORE_KEY);
        else global.localStorage.setItem(STORE_KEY, JSON.stringify({ v: 1, entries }));
        return true;
      } catch (_) {
        return false;
      }
    },
    _prune(entries, now) {
      let list = entries.filter((e) => now - e.t <= this.TTL_MS && now - e.t >= -60000);
      while (list.length > this.MAX_ENTRIES) list.shift();
      let total = list.reduce((n, e) => n + e.text.length, 0);
      while (list.length && total > this.MAX_TOTAL_CHARS) total -= list.shift().text.length;
      return list;
    },

    /** @returns {{ text: string, ageMs: number }|null} and marks the entry most recently used. */
    get(key, now) {
      now = now == null ? Date.now() : now;
      const all = this._read();
      const list = this._prune(all, now);
      const i = list.findIndex((e) => e.k === key);
      if (i === -1) {
        if (list.length !== all.length) this._write(list);
        return null;
      }
      const [hit] = list.splice(i, 1);
      list.push({ ...hit, a: now });
      this._write(list);
      return { text: hit.text, ageMs: now - hit.t };
    },

    /** @param {string[]} [secrets] any value containing one of these is refused. @returns {boolean} stored */
    set(key, text, secrets, now) {
      now = now == null ? Date.now() : now;
      const t = String(text == null ? "" : text);
      if (!t.trim() || t.length > this.MAX_ENTRY_CHARS) return false;
      if ((secrets || []).some((s) => s && String(s).length >= 8 && t.includes(String(s)))) return false;
      let list = this._prune(this._read(), now).filter((e) => e.k !== key);
      list.push({ k: key, t: now, a: now, text: t });
      list = this._prune(list, now);
      if (this._write(list)) return true;
      while (list.length > 1) {
        list.shift();
        if (this._write(list)) return true;
      }
      return false;
    },

    stats(now) {
      const list = this._prune(this._read(), now == null ? Date.now() : now);
      return { entries: list.length, chars: list.reduce((n, e) => n + e.text.length, 0) };
    },

    clear() {
      try {
        global.localStorage.removeItem(STORE_KEY);
        return true;
      } catch (_) {
        return false;
      }
    },
  };

  root.AICache = AICache;
})(typeof window !== "undefined" ? window : globalThis);
