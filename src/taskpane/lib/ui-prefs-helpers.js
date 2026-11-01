/* Pure helpers for tab restore, settings deep-links, and settings defaults (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.UiPrefs = {
  TAB_IDS: ["tab1", "tab2", "tab3", "tab4", "tab5", "tab6", "tab7"],

  SETTINGS_SECTION_ALIASES: {
    essentials: "essentials",
    style: "custom-style",
    "custom-style": "custom-style",
    safety: "safety",
    onboarding: "onboarding",
    appearance: "appearance",
    audit: "audit",
    privacy: "privacy",
    reference: "reference",
    dictionary: "dictionary",
    manuscript: "manuscript",
  },

  SETTINGS_GROUP_KEYS: [
    "essentials",
    "safety",
    "onboarding",
    "appearance",
    "audit",
    "privacy",
    "reference",
    "dictionary",
    "manuscript",
    "custom-style",
  ],

  THEME_PREFERENCES: ["light", "dark", "system"],

  /** Built-in style guides that imply formal / consistency-first review (PE-57). */
  REVIEW_MODE_STYLE_GUIDES: [
    "govuk",
    "strunk",
    "plain-us",
    "microsoft",
    "google-dev",
    "redhat",
    "custom",
    "custom-plus-auto",
  ],

  /** Shipped defaults for Settings groups (matches taskpane.html on first load). */
  UI_CONFIG_DEFAULTS: {
    replaceInSelectionOnly: true,
    chatSelectionOnly: true,
    confirmBeforeApply: true,
    rememberApiKey: false,
    simpleMode: false,
    showHoverTips: true,
    fkLock: false,
    remindVersionHistory: true,
    fictionScopeReminder: true,
    continuityWarnLevel: 3,
    auditCardFilter: "all",
    auditCardSort: "priority",
    auditExtended: false,
    reportDensity: "balanced",
    aiEnforceSessionCeiling: false,
    aiMaxSessionTokens: "50000",
    showSessionTips: true,
    showWhatsNew: true,
    showPriorSessionSummary: true,
    showLongOperationWarnings: true,
    showDarkAppearanceTip: true,
    shaperComplexity: 3,
    shaperIntensity: 4,
    shaperDensity: 2,
    themePreference: "light",
    autoRefreshManuscriptContext: false,
  },

  SHAPER_KEYS: ["shaperComplexity", "shaperIntensity", "shaperDensity"],

  clampShaperValue(n, fallback) {
    const v = parseInt(n, 10);
    if (isNaN(v)) return fallback;
    return Math.min(5, Math.max(1, v));
  },

  normalizeShaperFields(raw) {
    const base = ProzaEdit.UiPrefs.UI_CONFIG_DEFAULTS;
    const src = raw && typeof raw === "object" ? raw : {};
    return {
      shaperComplexity: ProzaEdit.UiPrefs.clampShaperValue(src.shaperComplexity, base.shaperComplexity),
      shaperIntensity: ProzaEdit.UiPrefs.clampShaperValue(src.shaperIntensity, base.shaperIntensity),
      shaperDensity: ProzaEdit.UiPrefs.clampShaperValue(src.shaperDensity, base.shaperDensity),
    };
  },

  getShaperDefaultsPatch() {
    const base = ProzaEdit.UiPrefs.UI_CONFIG_DEFAULTS;
    return {
      shaperComplexity: base.shaperComplexity,
      shaperIntensity: base.shaperIntensity,
      shaperDensity: base.shaperDensity,
    };
  },

  validateThemePreference(value) {
    const v = value == null ? "" : String(value).trim().toLowerCase();
    return ProzaEdit.UiPrefs.THEME_PREFERENCES.includes(v) ? v : ProzaEdit.UiPrefs.UI_CONFIG_DEFAULTS.themePreference;
  },

  resolveEffectiveTheme(themePreference, systemPrefersDark) {
    const pref = ProzaEdit.UiPrefs.validateThemePreference(themePreference);
    if (pref === "system") return systemPrefersDark ? "dark" : "light";
    return pref;
  },

  isReviewModeManuscriptType(manuscriptType) {
    const t = String(manuscriptType || "");
    return /Academic|Business|Legal/i.test(t);
  },

  isReviewModeStyleGuide(styleGuideRef) {
    const ref = String(styleGuideRef || "").trim();
    return ProzaEdit.UiPrefs.REVIEW_MODE_STYLE_GUIDES.includes(ref);
  },

  isReviewModeProfile(manuscriptType, styleGuideRef) {
    return (
      ProzaEdit.UiPrefs.isReviewModeManuscriptType(manuscriptType) ||
      ProzaEdit.UiPrefs.isReviewModeStyleGuide(styleGuideRef)
    );
  },

  /** Default audit filter chip for academic / house-style workflows. */
  reviewModeDefaultAuditFilter() {
    return "styleguide";
  },

  validateLastActiveTab(tabId, options) {
    options = options || {};
    const tabIds = options.tabIds || ProzaEdit.UiPrefs.TAB_IDS;
    const simpleMode = !!options.simpleMode;
    if (typeof tabId !== "string" || !tabIds.includes(tabId)) return null;
    if (simpleMode && tabId === "tab2") return null;
    return tabId;
  },

  normalizeSettingsSection(section) {
    if (section == null || section === "") return null;
    const key = String(section).trim().toLowerCase();
    return ProzaEdit.UiPrefs.SETTINGS_SECTION_ALIASES[key] || null;
  },

  settingsHashForSection(section) {
    const norm = ProzaEdit.UiPrefs.normalizeSettingsSection(section);
    return norm ? `#pe-settings-${norm === "custom-style" ? "style" : norm}` : "";
  },

  parseSettingsHash(hash) {
    const h = String(hash || "").replace(/^#/, "");
    const m = /^pe-settings-(.+)$/.exec(h);
    if (!m) return null;
    return ProzaEdit.UiPrefs.normalizeSettingsSection(m[1]);
  },

  getDefaultsPatchForGroup(groupKey) {
    const g = ProzaEdit.UiPrefs.normalizeSettingsSection(groupKey) || groupKey;
    const base = ProzaEdit.UiPrefs.UI_CONFIG_DEFAULTS;
    switch (g) {
      case "safety":
        return {
          simpleMode: base.simpleMode,
          replaceInSelectionOnly: base.replaceInSelectionOnly,
          confirmBeforeApply: base.confirmBeforeApply,
          showHoverTips: base.showHoverTips,
          fkLock: base.fkLock,
          remindVersionHistory: base.remindVersionHistory,
          fictionScopeReminder: base.fictionScopeReminder,
          continuityWarnLevel: base.continuityWarnLevel,
          aiEnforceSessionCeiling: base.aiEnforceSessionCeiling,
          aiMaxSessionTokens: base.aiMaxSessionTokens,
        };
      case "onboarding":
        return {
          showSessionTips: base.showSessionTips,
          showWhatsNew: base.showWhatsNew,
          showPriorSessionSummary: base.showPriorSessionSummary,
          showLongOperationWarnings: base.showLongOperationWarnings,
          showDarkAppearanceTip: base.showDarkAppearanceTip,
        };
      case "appearance":
        return { themePreference: base.themePreference };
      case "audit":
        return {
          reportDensity: base.reportDensity,
          auditCardFilter: base.auditCardFilter,
          auditExtended: base.auditExtended,
        };
      case "manuscript":
        return {
          autoRefreshManuscriptContext: base.autoRefreshManuscriptContext,
        };
      case "privacy":
        return { diagnosticsOptIn: false, diagnosticsNote: "" };
      case "reference":
        return Object.assign({}, {});
      case "dictionary":
        return { clearDictionary: true };
      case "custom-style":
        return { clearCustomStyleGuide: true };
      default:
        return null;
    }
  },
};
