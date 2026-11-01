/* Cooperative cancellation for long Word.run / async flows. */
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
    const signal = {
      get aborted() {
        return aborted;
      },
    };
    return {
      signal,
      cancel() {
        if (aborted) return;
        aborted = true;
        abortListeners.forEach((fn) => {
          try {
            fn();
          } catch (_) {}
        });
        hooks.onCancel?.();
      },
      isCancelled() {
        return aborted;
      },
      throwIfCancelled() {
        if (aborted) throw new ProzaEdit.LongOperationController.CancelledError();
      },
      onAbort(fn) {
        if (typeof fn === "function") abortListeners.push(fn);
      },
      setStatus(msg) {
        hooks.setStatus?.(msg);
      },
    };
  },
};
