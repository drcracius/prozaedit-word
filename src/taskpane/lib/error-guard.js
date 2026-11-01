/* Global error / unhandled-rejection guard: show a recovery message instead of a silent hang or white screen. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ErrorGuard = {
  WINDOW_MS: 10000,
  MAX_NOTIFICATIONS_PER_WINDOW: 2,
  BENIGN_PATTERN: /ResizeObserver loop|ResizeObserver was unable/i,
  USER_MESSAGE:
    "Something unexpected went wrong in ProzaEdit. If you were applying a change, use Go to to check the text in Word. If the pane looks stuck, reload it.",

  redact(text, maxLen) {
    const limit = Math.max(20, Number(maxLen) || 160);
    let s = String(text == null ? "" : text)
      .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
      .replace(/([?&]key=)[^&\s"']+/gi, "$1[redacted]")
      .replace(/(api[-_ ]?key["']?\s*[:=]\s*["']?)[^\s"',;]+/gi, "$1[redacted]")
      .replace(/\s+/g, " ")
      .trim();
    if (s.length > limit) s = `${s.slice(0, limit - 1)}…`;
    return s;
  },

  /**
   * @param {{ now?: function(): number, notify?: function({ message: string, detail: string, suppressed: number }): void, onFatal?: function(): void }} hooks
   */
  create(hooks) {
    hooks = hooks || {};
    const now = hooks.now || (() => Date.now());
    const G = ProzaEdit.ErrorGuard;
    let windowStart = null;
    let shown = 0;
    let suppressed = 0;
    let total = 0;

    const surface = (rawMessage) => {
      total++;
      const t = now();
      if (windowStart === null || t - windowStart > G.WINDOW_MS) {
        windowStart = t;
        shown = 0;
      }
      try {
        hooks.onFatal?.();
      } catch (_) {}
      if (shown >= G.MAX_NOTIFICATIONS_PER_WINDOW) {
        suppressed++;
        return false;
      }
      shown++;
      const note = { message: G.USER_MESSAGE, detail: G.redact(rawMessage), suppressed };
      suppressed = 0;
      try {
        hooks.notify?.(note);
      } catch (_) {}
      return true;
    };

    return {
      handleError(ev) {
        const message = String(ev?.message || ev?.error?.message || "Script error");
        if (G.BENIGN_PATTERN.test(message)) return false;
        if (ProzaEdit.LongOperationController?.isCancelledError?.(ev?.error)) return false;
        return surface(message);
      },
      handleRejection(ev) {
        const reason = ev?.reason;
        if (ProzaEdit.LongOperationController?.isCancelledError?.(reason)) {
          try {
            ev.preventDefault?.();
          } catch (_) {}
          return false;
        }
        const message = String(reason?.message || reason || "Unhandled promise rejection");
        if (G.BENIGN_PATTERN.test(message)) return false;
        return surface(message);
      },
      stats() {
        return { total, shown, suppressed };
      },
    };
  },

  /** Attach to a window once. Safe when addEventListener is missing. */
  bind(win, hooks) {
    if (!win || win.__peErrorGuardBound || typeof win.addEventListener !== "function") return null;
    win.__peErrorGuardBound = true;
    const guard = ProzaEdit.ErrorGuard.create(hooks);
    win.addEventListener("error", (ev) => guard.handleError(ev));
    win.addEventListener("unhandledrejection", (ev) => guard.handleRejection(ev));
    return guard;
  },
};
