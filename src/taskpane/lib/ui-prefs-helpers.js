/* Pure helpers for tab restore, settings deep-links, and settings defaults (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.UiPrefs = {
  TAB_IDS: ["tab1", "tab2", "tab3", "tab4", "tab5", "tab6", "tab7"],

  SETTINGS_SECTION_ALIASES: {
    style: "custom-style",
    "custom-style": "custom-style",
    safety: "safety",
    audit: "audit",
    privacy: "privacy",
    reference: "reference",
    dictionary: "dictionary",
  },

  SETTINGS_GROUP_KEYS: ["safety", "audit", "privacy", "reference", "dictionary", "custom-style"],

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
      case "audit":
        return {
          reportDensity: base.reportDensity,
          auditCardFilter: base.auditCardFilter,
          auditExtended: base.auditExtended,
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
