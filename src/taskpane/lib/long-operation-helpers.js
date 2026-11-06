/* Long-operation warnings — prefs and scope heuristics (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.LongOp = {
  CONFIG_KEY: "showLongOperationWarnings",
  SESSION_DISMISS_PREFIX: "pe-longop-dismiss-",

  /**
   * Below this scoped character count, local report runs are fast enough to skip a pre-start banner.
   * ~80k chars ≈ 13–16k words; typical Word.run read + local engines finish well under a minute.
   */
  WARN_MIN_CHARS: 80000,

  /**
   * Known slow actions (scans, batch, deep AI). Local Run report uses progress UI only (no pre-ack).
   * In-flight Gemini HTTP (Coach, Rewrite, Deep audit) shares the long-op AbortSignal, so Cancel aborts the fetch;
   * the client timeout (90s) is unchanged.
   */
  ACTION_IDS: {
    AUDIT_FULL: "audit-full",
    AUDIT_LARGE: "audit-large",
    CITATION_SCAN: "citation-scan",
    TIMELINE_SCAN: "timeline-scan",
    BATCH_AUDIT: "batch-audit",
    DEEP_AUDIT: "deep-audit",
  },

  defaultShowWarnings() {
    return false;
  },

  /** Shown on the op bar during long reads (Run report and scans). */
  LONG_RUN_REASSURANCE:
    "This can take 1–2 minutes on a long scope. You can keep writing in Word — use Cancel to stop after the current step.",

  readShowWarningsFromConfig(raw) {
    if (raw == null || raw === "") return ProzaEdit.LongOp.defaultShowWarnings();
    let p;
    try {
      p = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      return ProzaEdit.LongOp.defaultShowWarnings();
    }
    if (!p || typeof p !== "object") return ProzaEdit.LongOp.defaultShowWarnings();
    if (typeof p.showLongOperationWarnings === "boolean") return p.showLongOperationWarnings;
    return ProzaEdit.LongOp.defaultShowWarnings();
  },

  sessionDismissKey(actionId) {
    const id = String(actionId || "").trim();
    return id ? `${ProzaEdit.LongOp.SESSION_DISMISS_PREFIX}${id}` : "";
  },

  isSlowScopeMode(mode) {
    const m = String(mode || "");
    return m === "full" || m === "pages" || m === "selected-chapters" || m === "chapter-range" || m === "chapter";
  },

  /**
   * @param {number} charCount scoped characters (0 if unknown)
   * @param {string} [scopeMode]
   */
  scopeLooksLong(charCount, scopeMode) {
    const chars = Number(charCount);
    if (Number.isFinite(chars) && chars > 0) {
      return chars >= ProzaEdit.LongOp.WARN_MIN_CHARS;
    }
    const mode = String(scopeMode || "");
    if (mode === "full") return true;
    return ProzaEdit.LongOp.isSlowScopeMode(mode);
  },

  /**
   * Local Run report never uses the pre-ack banner — progress + Cancel on the op bar instead.
   * @returns {null}
   */
  actionIdForAudit(_scopeMode, _extendedLocal, _charCount) {
    return null;
  },

  /** Optional pre-ack scans: pass action id only when scope is large (char count or mode). */
  actionIdWhenScopeLong(actionId, charCount, scopeMode) {
    const id = String(actionId || "").trim();
    if (!id) return null;
    return ProzaEdit.LongOp.scopeLooksLong(charCount, scopeMode) ? id : null;
  },

  /**
   * @param {object} options
   * @param {boolean} [options.showLongOperationWarnings]
   * @param {string|null} [options.actionId]
   * @param {number} [options.charCount]
   * @param {string} [options.scopeMode]
   * @param {function(string):*} [options.sessionGet]
   */
  shouldShowLongOperationWarning(options) {
    options = options || {};
    if (options.showLongOperationWarnings !== true) return false;
    const actionId = String(options.actionId || "").trim();
    if (!actionId) return false;
    if (actionId === ProzaEdit.LongOp.ACTION_IDS.AUDIT_FULL || actionId === ProzaEdit.LongOp.ACTION_IDS.AUDIT_LARGE) {
      return false;
    }
    if (!ProzaEdit.LongOp.scopeLooksLong(options.charCount, options.scopeMode)) return false;
    const key = ProzaEdit.LongOp.sessionDismissKey(actionId);
    if (!key) return false;
    try {
      if (options.sessionGet) {
        if (options.sessionGet(key) === "1") return false;
      } else if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key) === "1") return false;
    } catch (_) {}
    return true;
  },

  warningCopyForAction(actionId) {
    const id = String(actionId || "");
    if (id === ProzaEdit.LongOp.ACTION_IDS.AUDIT_FULL) {
      return (
        "A full-manuscript report reads the entire document and may take several minutes on long drafts. " +
        "For very long documents, try Chapters or Pages."
      );
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.AUDIT_LARGE) {
      return "This report covers a large scope and may take a minute or more.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.CITATION_SCAN) {
      return "Citation verify walks scoped paragraphs and may take a while on long sections.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.TIMELINE_SCAN) {
      return "Timeline scan walks scoped paragraphs and may take a while on long sections.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.BATCH_AUDIT) {
      return "Batch section report runs multiple passes in a row and may take several minutes.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.DEEP_AUDIT) {
      return "Deep report reads scope text then calls your AI provider — may take a minute.";
    }
    return "This action may take a while on long documents.";
  },

  /** Status prefix while the op bar is visible during long reads. */
  longRunHint(charCount, scopeMode) {
    if (!ProzaEdit.LongOp.scopeLooksLong(charCount, scopeMode)) return "";
    return `${ProzaEdit.LongOp.LONG_RUN_REASSURANCE} `;
  },

  initialRunReportStatus(charCount, scopeMode) {
    const hint = ProzaEdit.LongOp.longRunHint(charCount, scopeMode);
    return hint ? `${hint}Reading document…` : "Reading document…";
  },

  analyzePhaseStatus() {
    return "Running checks…";
  },
};
