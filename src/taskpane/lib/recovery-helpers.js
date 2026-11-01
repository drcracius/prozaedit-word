/* Retry + re-entrancy guards for failed operations (pure logic, unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Recovery = {
  /**
   * One pending "Try again" action at a time. The entry is consumed when retry starts, so rapid double-clicks
   * can never run it twice; the operation re-registers itself if it fails again.
   * @param {{ onChange?: function({ label: string, busy: boolean }|null): void }} [hooks]
   */
  createRetryController(hooks) {
    hooks = hooks || {};
    let entry = null;
    let busy = false;
    const notify = () => {
      try {
        hooks.onChange?.(entry ? { label: entry.label, busy } : null);
      } catch (_) {}
    };
    return {
      set(label, run) {
        if (typeof run !== "function") return;
        entry = { label: String(label || "last action"), run };
        notify();
      },
      clear() {
        if (!entry) return;
        entry = null;
        notify();
      },
      has() {
        return !!entry;
      },
      label() {
        return entry ? entry.label : "";
      },
      isBusy() {
        return busy;
      },
      async retry() {
        if (!entry || busy) return false;
        const current = entry;
        entry = null;
        busy = true;
        notify();
        try {
          await current.run();
          return true;
        } catch (_) {
          return false;
        } finally {
          busy = false;
          notify();
        }
      },
    };
  },

  /** Single-flight lock: tryAcquire() returns a release function, or null when already held. */
  createLock() {
    let held = false;
    return {
      tryAcquire() {
        if (held) return null;
        held = true;
        let released = false;
        return () => {
          if (released) return;
          released = true;
          held = false;
        };
      },
      isLocked() {
        return held;
      },
    };
  },

  /** Per-key single-flight (e.g. one Apply per card, one Mute per rule). */
  createKeyedLock() {
    const held = new Set();
    return {
      tryAcquire(key) {
        const k = String(key);
        if (held.has(k)) return null;
        held.add(k);
        let released = false;
        return () => {
          if (released) return;
          released = true;
          held.delete(k);
        };
      },
      isLocked(key) {
        return held.has(String(key));
      },
      size() {
        return held.size;
      },
    };
  },
};
