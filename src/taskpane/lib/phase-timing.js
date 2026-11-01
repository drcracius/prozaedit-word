/* Lightweight phase timing for owner chapter-timing logs. Off unless ?pe-dev=1 or localStorage pe-dev=1. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.PhaseTiming = {
  FLAG_KEY: "pe-dev",

  isEnabled(win) {
    try {
      const search = String(win?.location?.search || "");
      const hash = String(win?.location?.hash || "");
      if (/[?&]pe-dev=1\b/.test(search) || /pe-dev=1\b/.test(hash)) return true;
    } catch (_) {}
    try {
      return win?.localStorage?.getItem(ProzaEdit.PhaseTiming.FLAG_KEY) === "1";
    } catch (_) {
      return false;
    }
  },

  /** @param {{ enabled?: boolean, now?: function(): number }} [options] */
  create(options) {
    options = options || {};
    const enabled = !!options.enabled;
    const now = options.now || (() => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()));
    const start = enabled ? now() : 0;
    let last = start;
    const phases = [];
    return {
      enabled,
      mark(name) {
        if (!enabled) return;
        const t = now();
        phases.push({ name: String(name), ms: Math.max(0, Math.round(t - last)) });
        last = t;
      },
      summary() {
        if (!enabled || !phases.length) return "";
        const total = Math.max(0, Math.round(last - start));
        return `${phases.map((p) => `${p.name} ${p.ms}ms`).join(" · ")} (total ${total}ms)`;
      },
      phases() {
        return phases.slice();
      },
    };
  },
};
