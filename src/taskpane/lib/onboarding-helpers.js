/* Onboarding banners, prior-session summary, and what's-new keys (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Onboarding = {
  LAST_SESSION_SUMMARY_KEY: "pe-last-session-summary",
  SESSION_TIPS_DISMISSED_KEY: "pe-session-tips-dismissed",
  /** localStorage permanent hide (legacy; migrated to CONFIG showSessionTips). */
  LEGACY_TIPS_PERMANENT_LOCAL_KEY: "pe-session-tips-dismissed",
  PRIOR_BANNER_SESSION_KEY: "pe-prior-session-banner-dismissed",
  DARK_APPEARANCE_TIP_DISMISSED_KEY: "pe-dark-appearance-tip-dismissed",

  /** sessionStorage keys cleared when CONFIG re-enables a banner (must match dismiss handlers). */
  ONBOARDING_PREF_SESSION_KEYS: {
    showSessionTips: "pe-session-tips-dismissed",
    showPriorSessionSummary: "pe-prior-session-banner-dismissed",
    showDarkAppearanceTip: "pe-dark-appearance-tip-dismissed",
  },

  ONBOARDING_CONFIG_KEYS: [
    "showSessionTips",
    "showWhatsNew",
    "showPriorSessionSummary",
    "showDarkAppearanceTip",
    "onboardingTourComplete",
  ],

  FIRST_RUN_COMPLETE_KEY: "firstRunComplete",
  ONBOARDING_TOUR_COMPLETE_KEY: "onboardingTourComplete",
  FIRST_AUDIT_CHECKLIST_DISMISSED_KEY: "pe-first-audit-checklist-dismissed",
  SIMPLE_MODE_FIRST_RUN_DISMISSED_KEY: "pe-simple-mode-first-run-dismissed",

  /** Share of ScopeReader cap treated as “large scope” for post-audit footnote (aligned with truncation). */
  LARGE_SCOPE_CAP_RATIO: 0.85,

  ONBOARDING_TOUR_STOPS: [
    {
      id: "scope",
      title: "1. Choose what to check",
      body: "On Target, pick the part of your book to work on — a highlight, one chapter, a page range, or the whole file. Tap Refresh count to see how big it is.",
      tabId: "tab1",
      anchorSelector: "#scope",
    },
    {
      id: "run",
      title: "2. Run audit",
      body: "On Checks, leave one or two switches on (you do not need them all). Then click Run audit — ProzaEdit waits for you; it does not underline as you type.",
      tabId: "tab3",
      anchorSelector: "#btnRunAudit",
    },
    {
      id: "fix",
      title: "3. Fix what matters",
      body: "Open Audit for your list. Start with Important items, jump to each spot in Word, then Apply fix when you agree.",
      tabId: "tab4",
      anchorSelector: "#cardContainer",
    },
  ],

  SIMPLE_MODE_FIRST_RUN_BANNER_LEAD:
    "Simple mode is on — fewer tabs, important issues first. Turn off in Settings → Essentials.",

  FULL_MANUSCRIPT_SCOPE_TIP:
    "For very long documents, try Selected chapters or Page range (common pro workaround).",

  MANUAL_AUDIT_HELP_COPY:
    "ProzaEdit runs manual audits when you click Run audit — not Grammarly-style realtime underlines.",

  FIRST_AUDIT_CHECKLIST_STEPS: [
    "On Target, choose what to check (highlight, a chapter, or a page range).",
    "On Checks, turn on one or two checks — not every switch.",
    "Click Run audit (toolbar or the big button on Checks).",
    "On Audit, fix Important items first; Mute or Dictionary for names that are correct.",
  ],

  PHASE_1_QUICKSTART_URL:
    "https://github.com/drcracius/prozaedit-word/blob/main/docs/PHASE-1-QUICKSTART.md",

  /** Shipped first-run defaults (PE-61): Simple + Critical filter; user can turn off once. */
  buildFirstRunBootstrapPatch() {
    return {
      simpleMode: true,
      auditCardFilter: "confirmed",
      firstRunComplete: false,
      onboardingTourComplete: false,
      auditExtended: false,
      reportDensity: "balanced",
    };
  },

  applyOnboardingTourCompletePatch(config) {
    const c = config && typeof config === "object" ? { ...config } : {};
    c.onboardingTourComplete = true;
    return c;
  },

  getOnboardingTourStop(stepIndex) {
    const stops = ProzaEdit.Onboarding.ONBOARDING_TOUR_STOPS || [];
    const i = Math.max(0, Math.min(stops.length - 1, parseInt(stepIndex, 10) || 0));
    return stops[i] || null;
  },

  onboardingTourStopCount() {
    return (ProzaEdit.Onboarding.ONBOARDING_TOUR_STOPS || []).length;
  },

  /**
   * @param {object} options
   * @param {boolean} [options.onboardingTourComplete]
   * @param {boolean} [options.firstRunComplete]
   * @param {boolean} [options.showSessionTips]
   * @param {boolean} [options.checklistDismissed]
   */
  shouldShowOnboardingTour(options) {
    options = options || {};
    if (options.onboardingTourComplete === true) return false;
    if (options.showSessionTips === false) return false;
    if (options.checklistDismissed) return false;
    if (options.firstRunComplete === true) return false;
    return true;
  },

  /**
   * Defer tour while other first-session banners are still showing (avoid stacking).
   */
  shouldDeferOnboardingTour(options) {
    options = options || {};
    if (options.simpleModeFirstRunBannerVisible) return true;
    if (options.sessionTipsVisible) return true;
    if (options.firstAuditChecklistExpanded) return true;
    if (options.onboardingTourOpen) return true;
    return false;
  },

  /** Skip session tips while Simple-mode first-run banner sequence is active (PE-64). */
  shouldShowSessionTipsOnLoad(options) {
    options = options || {};
    if (options.showSessionTips === false) return false;
    if (options.firstRunComplete === true) return true;
    if (options.simpleMode) return false;
    return true;
  },

  shouldShowFirstAuditChecklist(options) {
    options = options || {};
    if (options.simpleModeFirstRunBannerVisible) return false;
    if (options.onboardingTourOpen) return false;
    if (options.onboardingTourPending && !options.checklistDismissed) return false;
    return true;
  },

  /**
   * Post-audit footnote when truncation or large scope (threshold aligned with ScopeReader caps).
   */
  shouldShowAuditScopeFootnote(options) {
    options = options || {};
    if (options.hadTruncation) return true;
    const limit =
      typeof options.scopeLimit === "number" && options.scopeLimit > 0
        ? options.scopeLimit
        : 450000;
    const len = typeof options.excerptCharLength === "number" ? options.excerptCharLength : 0;
    if (len > 0 && len >= limit * ProzaEdit.Onboarding.LARGE_SCOPE_CAP_RATIO) return true;
    if (options.scopeMode === "full" && len >= 200000) return true;
    return false;
  },

  buildAuditScopeFootnoteCopy(options) {
    options = options || {};
    const lines = [];
    if (options.hadTruncation) {
      lines.push("This run hit the scope character cap — see the Truncated scope card above.");
    } else if (ProzaEdit.Onboarding.shouldShowAuditScopeFootnote(options)) {
      lines.push("This was a large scope — runs can take longer on full manuscripts.");
    }
    lines.push(
      "Next run: try Selected chapters or Page range, and keep the Critical filter for a faster first pass."
    );
    return lines.join(" ");
  },

  /**
   * @param {object} options
   * @param {string|null} [options.rawConfig] — PROZAEDIT_CONFIG raw
   * @param {object|null} [options.parsedConfig] — parsed object when raw present
   * @returns {{ kind: "bootstrap"|"migrate-legacy"|"none", patch?: object }}
   */
  resolveFirstRunOnLoad(options) {
    options = options || {};
    const raw = options.rawConfig;
    const empty = raw == null || raw === "";
    if (empty) {
      return { kind: "bootstrap", patch: ProzaEdit.Onboarding.buildFirstRunBootstrapPatch() };
    }
    const p = options.parsedConfig;
    if (!p || typeof p !== "object") return { kind: "none" };
    if (p.firstRunComplete === true) return { kind: "none" };
    if (p.firstRunComplete === false) return { kind: "none" };
    return {
      kind: "migrate-legacy",
      patch: { firstRunComplete: true, onboardingTourComplete: true },
    };
  },

  shouldShowSimpleModeFirstRunBanner(options) {
    options = options || {};
    if (options.firstRunComplete === true) return false;
    if (!options.simpleMode) return false;
    try {
      if (options.sessionGet) {
        if (options.sessionGet(ProzaEdit.Onboarding.SIMPLE_MODE_FIRST_RUN_DISMISSED_KEY) === "1") return false;
      } else if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(ProzaEdit.Onboarding.SIMPLE_MODE_FIRST_RUN_DISMISSED_KEY) === "1"
      ) {
        return false;
      }
    } catch (_) {}
    return true;
  },

  shouldShowWorkflowNextStep(options) {
    options = options || {};
    if (options.sessionAuditCompleted) return false;
    if (options.hasAuditCards) return false;
    return true;
  },

  DARK_APPEARANCE_TIP_COPY:
    "Dark pane is for long audits; switch to Light or Match system in Settings → Appearance if you prefer Word-like chrome.",

  WHATS_NEW_RELEASE: {
    version: "2.0.0.19",
    bullet:
      "Pick what you are writing (romance, mystery, thriller, fantasy, sci-fi, literary, historical or non-fiction) and checks adjust to it. Optional AI help now works with Gemini, OpenAI, Claude or OpenRouter keys, with hard token limits. Fixes now check their exact spot before editing, and repeated AI requests are reused at no cost. New: tense and viewpoint shifts are flagged only when clearly accidental, and an optional Content notes switch (Settings, off by default) reports strong language and violence neutrally. Accuracy is now measured on a labeled test set. Everything still works offline.",
    releaseNotesUrl:
      "https://github.com/drcracius/prozaedit-word/blob/main/docs/RELEASE-NOTES-PE-81.md",
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

  readOnboardingFlagsFromConfig(raw) {
    if (raw == null || raw === "") return null;
    let p;
    try {
      p = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      return null;
    }
    if (!p || typeof p !== "object") return null;
    return {
      showSessionTips: p.showSessionTips !== false,
      showWhatsNew: p.showWhatsNew !== false,
      showPriorSessionSummary: p.showPriorSessionSummary !== false,
      showDarkAppearanceTip: p.showDarkAppearanceTip !== false,
    };
  },

  shouldShowDarkAppearanceTip(options) {
    options = options || {};
    if (options.showDarkAppearanceTip === false) return false;
    if (options.effectiveTheme !== "dark") return false;
    if (options.sessionDismissed) return false;
    try {
      if (options.storageGet) {
        if (options.storageGet(ProzaEdit.Onboarding.DARK_APPEARANCE_TIP_DISMISSED_KEY) === "1") return false;
      } else if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(ProzaEdit.Onboarding.DARK_APPEARANCE_TIP_DISMISSED_KEY) === "1"
      ) {
        return false;
      }
    } catch (_) {}
    return true;
  },

  clearSessionDismissForPref(prefKey) {
    const key = ProzaEdit.Onboarding.ONBOARDING_PREF_SESSION_KEYS[prefKey];
    if (!key) return;
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
    } catch (_) {}
  },

  clearAllSessionBannerDismissals() {
    Object.values(ProzaEdit.Onboarding.ONBOARDING_PREF_SESSION_KEYS).forEach((key) => {
      try {
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
      } catch (_) {}
    });
  },

  /** Permanent off: patch document CONFIG onboarding flags (for tests). */
  applyPermanentOffPatch(config, prefKey) {
    const c = config && typeof config === "object" ? { ...config } : {};
    if (prefKey === "showSessionTips") c.showSessionTips = false;
    else if (prefKey === "showWhatsNew") c.showWhatsNew = false;
    else if (prefKey === "showPriorSessionSummary") c.showPriorSessionSummary = false;
    else if (prefKey === "showDarkAppearanceTip") c.showDarkAppearanceTip = false;
    return c;
  },
};
