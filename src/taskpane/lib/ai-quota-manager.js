/*
 * AI budget guard — client-side hard limits so optional AI help can never burn tokens unnoticed.
 * Limits: per-run prompt size + output cap, per-session tokens, per-day tokens (this device), minimum gap between calls.
 * Counting uses provider-reported usage when available, otherwise the estimate. Nothing runs in the background.
 */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.AIQuotaManager = {
  SESSION_TOKEN_KEY: "pe_ai_session_tokens",
  DAY_TOKEN_KEY: "pe_ai_day_tokens",

  DEFAULT_LIMITS: {
    maxSessionTokens: 50000,
    maxDayTokens: 150000,
    maxPromptChars: 32000,
    maxOutputTokens: 1200,
    minIntervalMs: 1500,
    enforceCeiling: true,
  },

  estimateTokens(text) {
    if (!text) return 0;
    return Math.max(1, Math.ceil(String(text).length / 4));
  },

  _today() {
    // Local calendar date: the daily cap resets at the user's local midnight (documented in Help/shipped notes).
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  /* Pane-lifetime counters: the larger of these and browser storage is used, so blocked or failing storage can never
     make the hard caps unenforceable. */
  _mem: { session: 0, day: 0, dayKey: "" },

  getSessionTokens() {
    let stored = 0;
    try {
      stored = parseInt(sessionStorage.getItem(this.SESSION_TOKEN_KEY) || "0", 10) || 0;
    } catch (_) {}
    return Math.max(stored, this._mem.session);
  },

  getDayTokens() {
    let stored = 0;
    try {
      const raw = JSON.parse(localStorage.getItem(this.DAY_TOKEN_KEY) || "null");
      stored = raw && raw.day === this._today() ? parseInt(raw.tokens, 10) || 0 : 0;
    } catch (_) {}
    return Math.max(stored, this._mem.dayKey === this._today() ? this._mem.day : 0);
  },

  resetSessionTokens() {
    this._mem.session = 0;
    try {
      sessionStorage.setItem(this.SESSION_TOKEN_KEY, "0");
    } catch (_) {}
  },

  resetDayTokens() {
    this._mem.day = 0;
    try {
      localStorage.removeItem(this.DAY_TOKEN_KEY);
    } catch (_) {}
  },

  recordUsage(tokensUsed) {
    const add = Math.max(0, parseInt(tokensUsed, 10) || 0);
    if (!add) return;
    const session = this.getSessionTokens() + add;
    const day = this.getDayTokens() + add;
    this._mem.session = session;
    this._mem.day = day;
    this._mem.dayKey = this._today();
    try {
      sessionStorage.setItem(this.SESSION_TOKEN_KEY, String(session));
    } catch (_) {}
    try {
      localStorage.setItem(this.DAY_TOKEN_KEY, JSON.stringify({ day: this._today(), tokens: day }));
    } catch (_) {}
  },

  _clamp(raw, lo, hi, fallback) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  },

  readLimitsFromConfig(cfg) {
    cfg = cfg || {};
    const d = this.DEFAULT_LIMITS;
    return {
      maxSessionTokens: this._clamp(cfg.aiMaxSessionTokens, 1000, 500000, d.maxSessionTokens),
      maxDayTokens: this._clamp(cfg.aiMaxDayTokens, 1000, 2000000, d.maxDayTokens),
      maxPromptChars: d.maxPromptChars,
      maxOutputTokens: d.maxOutputTokens,
      minIntervalMs: d.minIntervalMs,
      enforceCeiling: cfg.aiEnforceSessionCeiling !== false,
    };
  },

  /**
   * Pre-flight gate. `cost` is the estimated total (input + max output). With enforceCeiling off only the
   * per-run prompt cap and call spacing still apply (a runaway prompt is never allowed).
   * @param {number} estimatedCost
   * @param {object} [limits]
   * @param {{ promptChars?: number, now?: number, lastCallAt?: number }} [run]
   */
  canExecute(estimatedCost, limits, run) {
    limits = Object.assign({}, this.DEFAULT_LIMITS, limits || {});
    run = run || {};
    const cost = Math.max(0, parseInt(estimatedCost, 10) || 0);
    if (run.promptChars != null && run.promptChars > limits.maxPromptChars) {
      return {
        ok: false,
        code: "run_cap",
        message: `This request is too large (${run.promptChars.toLocaleString()} characters). Select a smaller passage or turn off the manuscript index for this call.`,
      };
    }
    if (run.lastCallAt && run.now != null && run.now - run.lastCallAt < limits.minIntervalMs) {
      return { ok: false, code: "too_fast", message: "Please wait a moment between AI requests." };
    }
    if (!limits.enforceCeiling) return { ok: true };
    const session = this.getSessionTokens();
    if (session + cost > limits.maxSessionTokens) {
      return {
        ok: false,
        code: "session_cap",
        message: `Session AI limit reached (~${session.toLocaleString()} / ${limits.maxSessionTokens.toLocaleString()} estimated tokens). Raise it in Settings → AI help, or reset the counter.`,
      };
    }
    const day = this.getDayTokens();
    if (day + cost > limits.maxDayTokens) {
      return {
        ok: false,
        code: "day_cap",
        message: `Daily AI limit reached (~${day.toLocaleString()} / ${limits.maxDayTokens.toLocaleString()} estimated tokens on this device). Raise it in Settings → AI help, or try again tomorrow.`,
      };
    }
    return { ok: true };
  },

  /** Short text for the visible usage meter. */
  meterText(limits) {
    limits = Object.assign({}, this.DEFAULT_LIMITS, limits || {});
    return `AI usage: ~${this.getSessionTokens().toLocaleString()} / ${limits.maxSessionTokens.toLocaleString()} this session · ~${this.getDayTokens().toLocaleString()} / ${limits.maxDayTokens.toLocaleString()} today`;
  },
};
