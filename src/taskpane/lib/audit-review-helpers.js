/* Small, testable helpers for a stable card-by-card review flow and structured error recovery copy. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.AuditReview = {
  MAX_RENDERED_CARDS: 300,
  PASS_THROUGH_PATTERN:
    /text not found|match lost|highlight text|no text|too large|exceeds limit|cannot locate|no automatic replacement|ceiling reached|select text in word|no paragraphs|no heading/i,

  progressLabel(index, total) {
    const count = Math.max(0, Number(total) || 0);
    if (!count) return "No findings";
    const position = Math.min(count, Math.max(1, (Number(index) || 0) + 1));
    return `Finding ${position} of ${count}`;
  },

  nextTargetId(ids, removedId) {
    const list = Array.isArray(ids) ? ids.map(String) : [];
    const index = list.indexOf(String(removedId || ""));
    if (index < 0) return list[0] || "";
    return list[index + 1] || list[index - 1] || "";
  },

  /** Cap how many cards are rendered at once so very large audits never freeze the pane. */
  capCards(list, max) {
    const items = Array.isArray(list) ? list : [];
    const limit = Math.max(1, Math.floor(Number(max)) || ProzaEdit.AuditReview.MAX_RENDERED_CARDS);
    if (items.length <= limit) return { shown: items, hiddenCount: 0 };
    return { shown: items.slice(0, limit), hiddenCount: items.length - limit };
  },

  /** Strip API keys and cap length before any error text is shown to the user. */
  sanitizeDetail(text, maxLen) {
    const limit = Math.max(20, Number(maxLen) || 200);
    let s = String(text == null ? "" : text)
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
      .replace(/([?&]key=)[^&\s"']+/gi, "$1[redacted]")
      .replace(/\s+/g, " ")
      .trim();
    if (s.length > limit) s = `${s.slice(0, limit - 1)}…`;
    return s;
  },

  /**
   * @returns {{ kind: string, retryable: boolean }}
   * kinds: cancelled | timeout | network | auth | quota | office-unsupported | office-missing | office-blocked | scope | unknown
   */
  classifyError(error) {
    const code = String(error?.code || "");
    const name = String(error?.name || "");
    const raw = String(error?.message || error || "");
    if (code === "PE_CANCELLED" || name === "ProzaEditCancelledError") return { kind: "cancelled", retryable: false };
    if (code === "PE_TIMEOUT" || name === "AbortError" || /timed out|timeout/i.test(raw)) {
      return { kind: "timeout", retryable: true };
    }
    if (ProzaEdit.AuditReview.PASS_THROUGH_PATTERN.test(raw)) return { kind: "scope", retryable: false };
    if (/invalid or missing api key|api key not valid|api_key_invalid|permission denied|unauthori[sz]ed|\b40[13]\b/i.test(raw)) {
      return { kind: "auth", retryable: false };
    }
    if (/quota|rate.?limit|resource_exhausted|too many requests|\b429\b/i.test(raw)) return { kind: "quota", retryable: true };
    if (/failed to fetch|networkerror|network request failed|load failed|offline|err_internet/i.test(raw)) {
      return { kind: "network", retryable: true };
    }
    if (code === "InvalidObjectPath" || code === "ItemNotFound" || code === "InvalidArgument") {
      return { kind: "office-missing", retryable: false };
    }
    if (code === "ApiNotFound" || code === "NotImplemented" || code === "UnsupportedOperation" || /not supported|not implemented/i.test(raw)) {
      return { kind: "office-unsupported", retryable: false };
    }
    if (code === "AccessDenied" || code === "InvalidOperation" || /read-?only|protected|locked|permission/i.test(raw)) {
      return { kind: "office-blocked", retryable: false };
    }
    return { kind: "unknown", retryable: true };
  },

  /** True when a Try again control makes sense for this failure. */
  isRetryable(error) {
    if (error && error.peApplyPhase === "uncertain") return false;
    return ProzaEdit.AuditReview.classifyError(error).retryable;
  },

  recoveryMessage(error, action) {
    const R = ProzaEdit.AuditReview;
    const task = String(action || "complete that action");
    if (error && error.peApplyPhase === "uncertain") {
      return `Word reported a problem while it was applying the change, so it may or may not have been made. Use Go to to check the text in Word, then Apply again only if it is still unchanged.`;
    }
    const info = R.classifyError(error);
    const raw = R.sanitizeDetail(error?.message || error || "");
    switch (info.kind) {
      case "cancelled":
        return "Cancelled.";
      case "scope":
        return raw;
      case "timeout":
        return `Gemini request timed out. Nothing was changed in Word. Try again, or use the free local tools.`;
      case "network":
        return `Could not reach Gemini (network problem). Nothing was changed in Word. Check your connection, then Try again.`;
      case "auth":
        return `Gemini rejected the API key. Check it under Settings → Essentials, or use the free local tools.`;
      case "quota":
        return `Gemini rate limit or quota reached. Wait a minute, then Try again, or use the free local tools.`;
      case "office-missing":
        return `Word could not find that text or object (the document may have changed). Use Go to to locate it, then retry.`;
      case "office-unsupported":
        return `This version of Word does not support that action (common in Word on the web). Try a smaller scope or Word desktop.`;
      case "office-blocked":
        return `Word blocked that action. The document may be read-only, protected, or in Restricted Editing. Unlock it, then retry.`;
      default: {
        const detail = raw ? ` (${raw})` : "";
        return `Word could not ${task}${detail}. Try again. If it keeps failing, reopen the task pane and retry with a smaller scope.`;
      }
    }
  },

  CARD_ACTION_LABELS: {
    apply: "Apply fix",
    goto: "Go to finding in Word",
    rewrite: "Rewrite finding",
    localtip: "Local tip",
    dict: "Add to dictionary",
    "dict-footer": "Manage dictionary",
    house: "Add house rule",
    mute: "Mute rule",
    chat: "Ask Gemini about finding",
    dismiss: "Dismiss finding",
    undo: "Undo last ProzaEdit replace",
  },

  /** Distinct accessible name per card action (screen readers hear many identical "Apply fix" buttons otherwise). */
  cardActionLabel(action, item) {
    const base = ProzaEdit.AuditReview.CARD_ACTION_LABELS[action] || String(action || "Action");
    if (action === "undo" || action === "dict-footer") return base;
    const target = String(item?.targetText || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!target || target.startsWith("(")) return base;
    const short = target.length > 40 ? `${target.slice(0, 39)}…` : target;
    return `${base}: “${short}”`;
  },
};
