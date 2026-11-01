/**
 * Device-local API key storage. Keys live only in this browser profile's localStorage (never in the Word document,
 * never in diagnostics). Unremembered keys stay in memory for the pane session only.
 */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});
  const KEY = "pe_ai_keys_v1";

  function read() {
    try {
      const o = JSON.parse(global.localStorage.getItem(KEY) || "{}");
      return o && typeof o === "object" && !Array.isArray(o) ? o : {};
    } catch (_) {
      return {};
    }
  }
  function write(o) {
    try {
      if (Object.keys(o).length) global.localStorage.setItem(KEY, JSON.stringify(o));
      else global.localStorage.removeItem(KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  root.AIKeys = {
    STORAGE_KEY: KEY,
    get(providerId) {
      const v = read()[providerId];
      return typeof v === "string" ? v : "";
    },
    set(providerId, key) {
      const k = String(key || "").trim();
      const o = read();
      if (k) o[providerId] = k;
      else delete o[providerId];
      return write(o);
    },
    clear(providerId) {
      return this.set(providerId, "");
    },
    clearAll() {
      return write({});
    },
    has(providerId) {
      return !!this.get(providerId);
    },
    /**
     * Pre-PE-81 documents could hold the Gemini key inside the document settings. Move it to this device
     * (only if the device has none) and report that the document copy must be removed.
     * @returns {{ migrated: boolean, hadDocumentKey: boolean }}
     */
    migrateFromDocumentConfig(cfg) {
      const legacy = cfg && typeof cfg.apiKey === "string" ? cfg.apiKey.trim() : "";
      if (!legacy) return { migrated: false, hadDocumentKey: false };
      let migrated = false;
      if (!this.has("gemini")) migrated = this.set("gemini", legacy);
      return { migrated, hadDocumentKey: true };
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
