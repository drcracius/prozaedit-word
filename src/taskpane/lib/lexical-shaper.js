/**
 * Lexical shaper v1 — three-axis calibration using existing local-rewrite pipelines only.
 *
 * Behavior (Phase 3):
 * - Primary rewrite modes (Fluency / Formal / Creative / Academic) stay the first pass via LocalRewrite.run.
 * - When the Advanced shaper panel is open, taskpane.js calls shape() to optionally stack calibration passes.
 * - Sliders at neutral (3) on an axis add no extra pass for that axis.
 * - Full Zipf substitution and VIVID_VERB_MAP intensity rewrites are deferred to a later phase; banks are seeded only.
 */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const DEFAULTS = { complexity: 3, intensity: 3, density: 3 };

  function clampAxis(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 3;
    return Math.min(5, Math.max(1, Math.round(v)));
  }

  function normalizeSettings(settings) {
    settings = settings || {};
    return {
      complexity: clampAxis(settings.complexity ?? DEFAULTS.complexity),
      intensity: clampAxis(settings.intensity ?? DEFAULTS.intensity),
      density: clampAxis(settings.density ?? DEFAULTS.density),
    };
  }

  function pruneDensityFillers(text) {
    const fillers = ProzaEdit.LexicalBanks?.DENSITY_FILLERS || [];
    let t = String(text || "");
    fillers.forEach((word) => {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "gi");
      t = t.replace(re, "");
    });
    return t;
  }

  function shape(text, baseMode, settings) {
    const LR = ProzaEdit.LocalRewrite;
    if (!LR?.run) return String(text || "").trim();

    const s = normalizeSettings(settings);
    let t = LR.run(baseMode, text);

    if (s.complexity <= 2) {
      t = LR.fluency(t);
    } else if (s.complexity >= 4) {
      t = LR.formal(t);
    }

    if (s.intensity <= 2) {
      t = LR.creative(t);
    } else if (s.intensity >= 4) {
      t = LR.academic(t);
    }

    if (s.density <= 2) {
      t = pruneDensityFillers(t);
      t = LR.fluency(t);
    }

    return String(t || "").trim();
  }

  function readSettingsFromDom() {
    const complexity = document.getElementById("slider-shaper-complexity")?.value;
    const intensity = document.getElementById("slider-shaper-intensity")?.value;
    const density = document.getElementById("slider-shaper-density")?.value;
    return normalizeSettings({ complexity, intensity, density });
  }

  /** The shaper only applies in Advanced view: in Simple view its hidden panel/sliders must never change results. */
  function isShaperPanelActive() {
    if (document.body && document.body.classList.contains("pe-simple-mode")) return false;
    const panel = document.getElementById("pe-shaper-panel");
    return !!(panel && panel.open);
  }

  root.LexicalShaper = {
    DEFAULTS,
    normalizeSettings,
    shape,
    readSettingsFromDom,
    isShaperPanelActive,
  };
})(typeof window !== "undefined" ? window : globalThis);
