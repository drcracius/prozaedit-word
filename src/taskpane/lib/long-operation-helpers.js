/* Long-operation warnings — prefs and scope heuristics (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.LongOp = {
  CONFIG_KEY: "showLongOperationWarnings",
  SESSION_DISMISS_PREFIX: "pe-longop-dismiss-",

  /**
   * Known slow actions (audit mandatory; scans and batch optional).
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
    return true;
  },

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

  actionIdForAudit(scopeMode, extendedLocal) {
    const mode = String(scopeMode || "selection");
    if (mode === "full") return ProzaEdit.LongOp.ACTION_IDS.AUDIT_FULL;
    if (ProzaEdit.LongOp.isSlowScopeMode(mode)) {
      return ProzaEdit.LongOp.ACTION_IDS.AUDIT_LARGE;
    }
    if (extendedLocal) return ProzaEdit.LongOp.ACTION_IDS.AUDIT_LARGE;
    return null;
  },

  /**
   * @param {object} options
   * @param {boolean} [options.showLongOperationWarnings]
   * @param {string|null} [options.actionId]
   * @param {function(string):*} [options.sessionGet]
   */
  shouldShowLongOperationWarning(options) {
    options = options || {};
    if (options.showLongOperationWarnings === false) return false;
    const actionId = String(options.actionId || "").trim();
    if (!actionId) return false;
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
        "A full-manuscript audit reads the entire document and may take several minutes on long drafts. " +
        "For very long documents, try Selected chapters or Page range."
      );
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.AUDIT_LARGE) {
      return "This audit covers a large scope and may take a minute or more.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.CITATION_SCAN) {
      return "Citation verify walks scoped paragraphs and may take a while on long sections.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.TIMELINE_SCAN) {
      return "Timeline scan walks scoped paragraphs and may take a while on long sections.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.BATCH_AUDIT) {
      return "Batch section audit runs multiple audits in a row and may take several minutes.";
    }
    if (id === ProzaEdit.LongOp.ACTION_IDS.DEEP_AUDIT) {
      return "Deep audit reads scope text then calls your AI provider — may take a minute.";
    }
    return "This action may take a while on long documents.";
  },
};
