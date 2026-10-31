/* Client-side Gemini session token estimate ceiling (optional, default off — v2 parity). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.AIQuotaManager = {
  SESSION_TOKEN_KEY: "pe_ai_session_tokens",

  DEFAULT_LIMITS: {
    maxSessionTokens: 50000,
    enforceCeiling: false,
  },

  estimateTokens(text) {
    if (ProzaEdit.Gemini?.estimateTokens) return ProzaEdit.Gemini.estimateTokens(text);
    if (!text) return 0;
    return Math.max(1, Math.ceil(String(text).length / 4));
  },

  getSessionTokens() {
    try {
      return parseInt(sessionStorage.getItem(this.SESSION_TOKEN_KEY) || "0", 10) || 0;
    } catch (_) {
      return 0;
    }
  },

  resetSessionTokens() {
    try {
      sessionStorage.setItem(this.SESSION_TOKEN_KEY, "0");
    } catch (_) {}
  },

  recordUsage(tokensUsed) {
    const add = Math.max(0, parseInt(tokensUsed, 10) || 0);
    if (!add) return;
    try {
      const current = this.getSessionTokens();
      sessionStorage.setItem(this.SESSION_TOKEN_KEY, String(current + add));
    } catch (_) {}
  },

  readLimitsFromConfig(cfg) {
    cfg = cfg || {};
    const rawMax = parseInt(cfg.aiMaxSessionTokens, 10);
    const maxSessionTokens = Number.isFinite(rawMax)
      ? Math.max(1000, Math.min(500000, rawMax))
      : this.DEFAULT_LIMITS.maxSessionTokens;
    return {
      maxSessionTokens,
      enforceCeiling: !!cfg.aiEnforceSessionCeiling,
    };
  },

  /**
   * @param {number} estimatedCost
   * @param {{ maxSessionTokens?: number, enforceCeiling?: boolean }} limits
   */
  canExecute(estimatedCost, limits) {
    limits = limits || this.DEFAULT_LIMITS;
    if (!limits.enforceCeiling) return { ok: true };
    const cost = Math.max(0, parseInt(estimatedCost, 10) || 0);
    const current = this.getSessionTokens();
    if (current + cost > limits.maxSessionTokens) {
      return {
        ok: false,
        message: `Session token ceiling reached (~${current.toLocaleString()} / ${limits.maxSessionTokens.toLocaleString()} estimated). Reset the counter on Target or turn enforcement off.`,
      };
    }
    return { ok: true };
  },
};
