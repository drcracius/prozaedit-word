/* Onboarding banners, prior-session summary, and what's-new keys (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Onboarding = {
  LAST_SESSION_SUMMARY_KEY: "pe-last-session-summary",
  SESSION_TIPS_DISMISSED_KEY: "pe-session-tips-dismissed",
  /** localStorage permanent hide (legacy; migrated to CONFIG showSessionTips). */
  LEGACY_TIPS_PERMANENT_LOCAL_KEY: "pe-session-tips-dismissed",
  PRIOR_BANNER_SESSION_KEY: "pe-prior-session-banner-dismissed",

  WHATS_NEW_RELEASE: {
    version: "2.0.0.15",
    bullet:
      "Phases 2–7: hover tips, Rewrite lexical shaper, timeline & citation scans, audit report export, optional Gemini session quota (off by default).",
    releaseNotesUrl:
      "https://github.com/drcracius/prozaedit-word/blob/main/docs/RELEASE-NOTES-2.0.0.15.md",
  },

  TAB_LABELS: {
    tab1: "Target",
    tab2: "Thesaurus",
    tab3: "Checks",
    tab4: "Audit",
    tab5: "Coach",
    tab6: "Rewrite",
    tab7: "Help",
  },

  whatsNewSeenStorageKey(version) {
    const v = String(version || "").trim();
    return v ? `pe-whats-new-seen-${v}` : "pe-whats-new-seen-unknown";
  },

  shouldShowWhatsNewBanner(options) {
    options = options || {};
    if (options.showWhatsNew === false) return false;
    const version = String(options.buildVersion || options.version || "").trim();
    if (!version) return false;
    const key = ProzaEdit.Onboarding.whatsNewSeenStorageKey(version);
    try {
      if (options.storageGet) {
        if (options.storageGet(key) === "1") return false;
      } else if (typeof localStorage !== "undefined" && localStorage.getItem(key) === "1") return false;
    } catch (_) {}
    return true;
  },

  normalizeSessionSummary(raw) {
    if (!raw || typeof raw !== "object") return null;
    const lastVisitAt = typeof raw.lastVisitAt === "string" ? raw.lastVisitAt : null;
    if (!lastVisitAt) return null;
    return {
      lastVisitAt,
      lastTab: typeof raw.lastTab === "string" ? raw.lastTab : "",
      scopeMode: typeof raw.scopeMode === "string" ? raw.scopeMode : "",
      ranAudit: !!raw.ranAudit,
      buildVersion: typeof raw.buildVersion === "string" ? raw.buildVersion : "",
    };
  },

  serializeSessionSummary(data) {
    const norm = ProzaEdit.Onboarding.normalizeSessionSummary(data);
    if (!norm) return null;
    return JSON.stringify(norm);
  },

  parseSessionSummary(json) {
    if (json == null || json === "") return null;
    try {
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      return ProzaEdit.Onboarding.normalizeSessionSummary(parsed);
    } catch (_) {
      return null;
    }
  },

  buildSessionSummaryPatch(partial, buildVersion) {
    partial = partial || {};
    return {
      lastVisitAt: partial.lastVisitAt || new Date().toISOString(),
      lastTab: partial.lastTab != null ? String(partial.lastTab) : "",
      scopeMode: partial.scopeMode != null ? String(partial.scopeMode) : "",
      ranAudit: partial.ranAudit === true,
      buildVersion: String(partial.buildVersion != null ? partial.buildVersion : buildVersion || ""),
    };
  },

  formatPriorSessionLines(summary, tabLabels) {
    const s = ProzaEdit.Onboarding.normalizeSessionSummary(summary);
    if (!s) return [];
    const labels = tabLabels || ProzaEdit.Onboarding.TAB_LABELS;
    const lines = [];
    lines.push(`Last visit: ${s.lastVisitAt}`);
    const tabLabel = labels[s.lastTab] || s.lastTab || "—";
    lines.push(`Last tab: ${tabLabel}`);
    if (s.scopeMode) lines.push(`Scope: ${s.scopeMode}`);
    lines.push(`Ran audit: ${s.ranAudit ? "Yes" : "No"}`);
    if (s.buildVersion) lines.push(`Build: ${s.buildVersion}`);
    return lines.slice(0, 4);
  },

  migrateShowSessionTipsFromLegacy(config, legacyPermanentHidden) {
    const c = config && typeof config === "object" ? { ...config } : {};
    if (typeof c.showSessionTips === "boolean") return c;
    if (legacyPermanentHidden) c.showSessionTips = false;
    else c.showSessionTips = true;
    return c;
  },
};
