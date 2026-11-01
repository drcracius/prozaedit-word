/* Plain-language copy when Simple mode is on (unit-testable). Power users unchanged when Simple is off. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.PlainLanguage = {
  REPORT_DEPTH_ARIA: {
    light: "Light — quick pass with fewer issue cards",
    balanced: "Balanced — recommended for most editing sessions",
    dense: "Dense — shows the maximum detail we can fit",
  },

  CHECKS_RUN_AUDIT_TAGLINE:
    "ProzaEdit checks when you click Run — it does not underline while you type.",

  SIMPLE_MODE_ESSENTIALS_INTRO:
    "Simple mode hides extra tabs and optional checks. Turn off to see Coach, Rewrite, and more.",

  NEW_TO_EDITING_TOOLS_BULLETS: [
    "Work one chapter or a highlighted passage at a time — you do not need the whole book on day one.",
    "Fix red or Important issues first; style suggestions can wait until the big problems are gone.",
    "Add character names to the dictionary when a check keeps flagging them.",
    "Click Run audit when you are ready — ProzaEdit is not a live underline tool like Grammarly.",
  ],

  /** @param {"all"|"confirmed"|"preference"|"styleguide"} filter */
  simpleModeAuditBannerText(filter) {
    if (filter === "confirmed") {
      return "Showing important issues only — turn off Simple mode in Settings for all issue types.";
    }
    return "Simple mode is on — fewer tabs and a simpler layout. Turn off in Settings → Essentials to see every feature.";
  },

  auditFilterLanesHint(simpleMode) {
    if (simpleMode) {
      return "Show one group at a time: Important (Critical), Style, or Style guide — not every category at once.";
    }
    return 'Filter lanes: Pick one chip (Critical, Style, Style guide) to work one category at a time — not a full “run every report” pass.';
  },

  reportDepthHintLabel(densityKey) {
    const key = String(densityKey || "balanced").toLowerCase();
    const map = ProzaEdit.PlainLanguage.REPORT_DEPTH_ARIA;
    if (key === "light") return map.light;
    if (key === "dense") return map.dense;
    return map.balanced;
  },

  /** Friendly scope line for chips and status (Simple mode). */
  scopeFriendlyLabel(mode, details) {
    details = details || {};
    const m = String(mode || "selection");
    if (m === "selection") return "Text you selected in Word";
    if (m === "pages") {
      const from = details.pageFrom != null ? details.pageFrom : "1";
      const to = details.pageTo != null ? details.pageTo : "5";
      return `About pages ${from}–${to}`;
    }
    if (m === "selected-chapters" || m === "chapter" || m === "chapter-range") {
      const n = typeof details.chapterCount === "number" ? details.chapterCount : 0;
      if (n === 1) return "This chapter";
      if (n > 1) return `${n} chapters`;
      return "One or more chapters";
    }
    if (m === "full") return "Whole document";
    return m;
  },

  scopeSelectOptionLabel(mode) {
    const m = String(mode || "");
    if (m === "selection") return "Text you selected";
    if (m === "pages") return "A range of pages (estimated)";
    if (m === "selected-chapters") return "One or more chapters (from headings)";
    if (m === "full") return "Whole document";
    return null;
  },
};
