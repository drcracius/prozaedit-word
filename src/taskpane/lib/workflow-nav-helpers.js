/* Tab strip order, Simple-mode labels, and cross-tab workflow links (unit-testable). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.WorkflowNav = {
  /** Workflow-first order (Target → Checks → Audit → … → Help). */
  TAB_ORDER_FULL: ["tab1", "tab3", "tab4", "tab2", "tab5", "tab6", "tab7"],

  /** Simple mode: core path then Help; advanced tabs stay reachable but last. */
  TAB_ORDER_SIMPLE: ["tab1", "tab3", "tab4", "tab7", "tab5", "tab6"],

  SIMPLE_TAB_VISIBLE_LABELS: {
    tab1: "Start",
    tab3: "Run",
    tab4: "Fix",
    tab7: "Help",
  },

  SIMPLE_TAB_ARIA_SUFFIX: {
    tab1: "Start — what to check",
    tab3: "Run — run check",
    tab4: "Fix — review issues",
    tab7: "Help — how it works",
  },

  PIPELINE_HINT_SIMPLE:
    "One audit pipeline — filter issue groups on Audit (Important, Style, …), not a menu of separate reports.",

  tabFlexOrder(tabId, simpleMode) {
    const order = simpleMode
      ? ProzaEdit.WorkflowNav.TAB_ORDER_SIMPLE
      : ProzaEdit.WorkflowNav.TAB_ORDER_FULL;
    const idx = order.indexOf(tabId);
    return idx >= 0 ? idx + 1 : 99;
  },

  tabVisibleLabel(tabId, defaultLabel, simpleMode) {
    if (!simpleMode) return defaultLabel;
    return ProzaEdit.WorkflowNav.SIMPLE_TAB_VISIBLE_LABELS[tabId] || defaultLabel;
  },

  tabAriaLabel(tabId, defaultLabel, simpleMode) {
    if (!simpleMode) return defaultLabel;
    return ProzaEdit.WorkflowNav.SIMPLE_TAB_ARIA_SUFFIX[tabId] || defaultLabel;
  },

  /**
   * @param {string} tabId
   * @param {{ hasAuditResults?: boolean, auditBusy?: boolean }} ctx
   * @returns {{ id: string, label: string, targetTab: string, primary?: boolean }[]}
   */
  crossNavLinks(tabId, ctx) {
    ctx = ctx || {};
    const has = !!ctx.hasAuditResults;
    const links = [];

    if (tabId === "tab1") {
      links.push({ id: "to-checks", label: "Run check", targetTab: "tab3", primary: true });
      if (has) links.push({ id: "to-audit", label: "View issues", targetTab: "tab4" });
      links.push({ id: "to-help-scope", label: "Chapter-first tips", targetTab: "tab7" });
    } else if (tabId === "tab3") {
      links.push({ id: "to-target", label: "Change what to check", targetTab: "tab1" });
      if (has) links.push({ id: "to-audit", label: "View issues", targetTab: "tab4", primary: true });
      else links.push({ id: "run-audit", label: "Run audit", targetTab: "tab3", primary: true });
    } else if (tabId === "tab4") {
      links.push({ id: "to-target", label: "Change scope", targetTab: "tab1" });
      links.push({ id: "to-checks", label: "Run again", targetTab: "tab3", primary: !has });
      if (has) {
        links.push({ id: "dict", label: "Manage dictionary", targetTab: "__settings_dictionary__" });
      }
    } else if (tabId === "tab7") {
      links.push({ id: "to-target", label: "Set scope on Start", targetTab: "tab1", primary: true });
      links.push({ id: "to-checks", label: "Run check", targetTab: "tab3" });
    }

    return links.filter(Boolean);
  },

  shouldShowCardDictionaryFooter(item) {
    if (!item) return false;
    if (ProzaEdit.PlainLanguage?.isNameLikeMuteTarget?.(item)) return true;
    const mod = String(item.module || "").toLowerCase();
    if (mod.includes("proper noun")) return true;
    const ruleId = String(item.ruleId || "");
    return ruleId.startsWith("prop:") || ruleId.startsWith("spell:");
  },

  ADVANCED_TABS_WHEN_SIMPLE_OFF: "Coach, Rewrite, Thesaurus, optional Gemini blocks, and extended checks.",
};
