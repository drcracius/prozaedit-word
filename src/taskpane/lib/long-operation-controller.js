/* Cooperative cancellation for long Word.run / async flows (also aborts in-flight fetch via abortSignal). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.LongOperationController = {
  CancelledError: class ProzaEditCancelledError extends Error {
    constructor(message) {
      super(message || "Cancelled.");
      this.name = "ProzaEditCancelledError";
      this.code = "PE_CANCELLED";
    }
  },

  isCancelledError(err) {
    return !!(err && (err.code === "PE_CANCELLED" || err.name === "ProzaEditCancelledError"));
  },

  /**
   * @param {{ setStatus?: function(string): void, onCancel?: function(): void }} hooks
   */
  create(hooks) {
    hooks = hooks || {};
    let aborted = false;
    const abortListeners = [];
    const nativeController = typeof AbortController === "function" ? new AbortController() : null;
    const shimListeners = [];
    const abortSignal = nativeController
      ? nativeController.signal
      : {
          get aborted() {
            return aborted;
          },
          addEventListener(type, fn) {
            if (type === "abort" && typeof fn === "function") shimListeners.push(fn);
          },
          removeEventListener(type, fn) {
            const i = shimListeners.indexOf(fn);
            if (type === "abort" && i >= 0) shimListeners.splice(i, 1);
          },
        };
    const signal = {
      get aborted() {
        return aborted;
      },
    };
    return {
      signal,
      abortSignal,
      cancel() {
        if (aborted) return;
        aborted = true;
        if (nativeController) {
          try {
            nativeController.abort();
          } catch (_) {}
        } else {
          shimListeners.slice().forEach((fn) => {
            try {
              fn({ type: "abort" });
            } catch (_) {}
          });
        }
        abortListeners.slice().forEach((fn) => {
          try {
            fn();
          } catch (_) {}
        });
        try {
          hooks.onCancel?.();
        } catch (_) {}
      },
      isCancelled() {
        return aborted;
      },
      throwIfCancelled() {
        if (aborted) throw new ProzaEdit.LongOperationController.CancelledError();
      },
      onAbort(fn) {
        if (typeof fn !== "function") return () => {};
        abortListeners.push(fn);
        return () => {
          const i = abortListeners.indexOf(fn);
          if (i >= 0) abortListeners.splice(i, 1);
        };
      },
      setStatus(msg) {
        try {
          hooks.setStatus?.(msg);
        } catch (_) {}
      },
    };
  },
};
