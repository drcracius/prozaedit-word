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

  /** Subtle tab hints (Simple mode subtitles + title tooltips). DOM tab ids unchanged. */
  TAB_HINTS: {
    tab1: "What to check",
    tab3: "Run check",
    tab4: "Fix issues",
    tab7: "How it works",
  },

  REPORT_DEPTH_OPTION_HELPER: {
    light: "Light — quick pass, fewer cards",
    balanced: "Balanced — recommended for most sessions",
    dense: "Dense — maximum detail we can show",
  },

  SIMPLE_MODE_ESSENTIALS_INTRO:
    "Simple view hides the Thesaurus tab, the lexical shaper, and extra tuning. Coach, Rewrite and optional AI help stay available. Turn Simple off for every control.",

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

  /** User-visible filter name; internal id stays `confirmed`. */
  auditFilterUserLabel(filterKey, simpleMode) {
    const key = String(filterKey || "");
    if (key === "confirmed") return simpleMode ? "Important" : "Critical";
    if (key === "preference") return "Style";
    if (key === "styleguide") return "Style guide";
    return "All";
  },

  auditFilterChipText(filterKey, count, simpleMode) {
    const label = ProzaEdit.PlainLanguage.auditFilterUserLabel(filterKey, simpleMode);
    const n = typeof count === "number" ? count : 0;
    return n ? `${label} (${n})` : label;
  },

  auditSeverityLegendLine(simpleMode) {
    const sev = simpleMode ? "Important" : "Critical";
    return `Color legend: ${sev} · Style · OK / primary action (card border = severity; green buttons = actions).`;
  },

  auditFilterLanesHint(simpleMode) {
    if (simpleMode) {
      return "Show one group at a time: Important, Style, or Style guide — not every category at once.";
    }
    return 'Filter lanes: Pick one chip (Critical, Style, Style guide) to work one category at a time — not a full “run every report” pass.';
  },

  reportDepthOptionHelper(densityKey) {
    const key = String(densityKey || "balanced").toLowerCase();
    return (
      ProzaEdit.PlainLanguage.REPORT_DEPTH_OPTION_HELPER[key] ||
      ProzaEdit.PlainLanguage.REPORT_DEPTH_OPTION_HELPER.balanced
    );
  },

  /** First session mute nudge: name-like tokens only (PE-60 P2). */
  isNameLikeMuteTarget(item) {
    if (!item) return false;
    const ruleId = String(item.ruleId || "");
    if (ruleId.startsWith("prop:")) return true;
    const mod = String(item.module || "").toLowerCase();
    if (mod.includes("proper noun")) return true;
    const text = String(item.targetText || "").trim();
    if (!text || text.length > 48 || text === "(truncated)") return false;
    return /^[A-Z][a-z]+(?:['\u2019][A-Z][a-z]+)*(?:\s+[A-Z][a-z]+){0,2}$/.test(text);
  },

  shouldShowMuteDictionaryNudge(item, alreadyShownThisSession) {
    if (alreadyShownThisSession) return false;
    return ProzaEdit.PlainLanguage.isNameLikeMuteTarget(item);
  },

  muteDictionaryNudgeStatusHtml() {
    return (
      'Add to Dictionary so this name isn\u2019t flagged again \u2014 ' +
      '<button type="button" class="btn-linkish" onclick="openSettingsModal(\'dictionary\')">Open Dictionary in Settings</button>'
    );
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
