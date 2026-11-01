/* Safe parsing of PROZAEDIT_CONFIG: corrupt, oversized, or wrong-shaped values fall back to defaults. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ConfigGuard = {
  MAX_CONFIG_CHARS: 400000,
  MAX_STRING_FIELD_CHARS: 20000,

  /**
   * @param {*} raw stored value (JSON string or object)
   * @returns {{ config: object|null, problem: "" | "corrupt" | "oversized" | "not-object" }}
   */
  parse(raw) {
    if (raw == null || raw === "") return { config: null, problem: "" };
    let parsed = raw;
    if (typeof raw === "string") {
      if (raw.length > ProzaEdit.ConfigGuard.MAX_CONFIG_CHARS) return { config: null, problem: "oversized" };
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        return { config: null, problem: "corrupt" };
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { config: null, problem: "not-object" };
    return { config: ProzaEdit.ConfigGuard.clamp(parsed), problem: "" };
  },

  /** Drops absurdly long string fields (except known list fields handled elsewhere) so one bad key cannot freeze the UI. */
  clamp(config) {
    const out = {};
    const limit = ProzaEdit.ConfigGuard.MAX_STRING_FIELD_CHARS;
    Object.keys(config).forEach((key) => {
      const v = config[key];
      if (typeof v === "string" && v.length > limit) return;
      out[key] = v;
    });
    if (out.modules && (typeof out.modules !== "object" || Array.isArray(out.modules))) delete out.modules;
    if (out.selectedChapterIndices && !Array.isArray(out.selectedChapterIndices)) delete out.selectedChapterIndices;
    if (Array.isArray(out.selectedChapterIndices)) {
      out.selectedChapterIndices = out.selectedChapterIndices
        .map((n) => parseInt(n, 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, 2000);
    }
    return out;
  },
};
