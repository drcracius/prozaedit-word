import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("UiPrefs.validateLastActiveTab", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  assert.equal(UiPrefs.validateLastActiveTab("tab4", {}), "tab4");
  assert.equal(UiPrefs.validateLastActiveTab("tab99", {}), null);
  assert.equal(UiPrefs.validateLastActiveTab("tab2", { simpleMode: true }), null);
  assert.equal(UiPrefs.validateLastActiveTab(null, {}), null);
});

test("UiPrefs.normalizeSettingsSection and hash", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  assert.equal(UiPrefs.normalizeSettingsSection("style"), "custom-style");
  assert.equal(UiPrefs.normalizeSettingsSection("privacy"), "privacy");
  assert.equal(UiPrefs.normalizeSettingsSection("nope"), null);
  assert.equal(UiPrefs.settingsHashForSection("privacy"), "#pe-settings-privacy");
  assert.equal(UiPrefs.settingsHashForSection("style"), "#pe-settings-style");
  assert.equal(UiPrefs.parseSettingsHash("#pe-settings-style"), "custom-style");
  assert.equal(UiPrefs.parseSettingsHash("#pe-settings-audit"), "audit");
  assert.equal(UiPrefs.parseSettingsHash("#other"), null);
});

test("UiPrefs.getDefaultsPatchForGroup", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  const safety = UiPrefs.getDefaultsPatchForGroup("safety");
  assert.equal(safety.confirmBeforeApply, true);
  assert.equal(safety.simpleMode, false);
  const audit = UiPrefs.getDefaultsPatchForGroup("audit");
  assert.equal(audit.reportDensity, "balanced");
  assert.equal(audit.auditCardFilter, "all");
  assert.equal(Object.keys(UiPrefs.getDefaultsPatchForGroup("reference")).length, 0);
  assert.equal(UiPrefs.getDefaultsPatchForGroup("unknown"), null);
  const onboarding = UiPrefs.getDefaultsPatchForGroup("onboarding");
  assert.equal(onboarding.showSessionTips, true);
  assert.equal(onboarding.showWhatsNew, true);
  assert.equal(onboarding.showPriorSessionSummary, true);
  assert.equal(onboarding.showLongOperationWarnings, true);
  assert.equal(UiPrefs.UI_CONFIG_DEFAULTS.showLongOperationWarnings, true);
});

test("UiPrefs themePreference default and round-trip", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  assert.equal(UiPrefs.UI_CONFIG_DEFAULTS.themePreference, "light");
  assert.equal(UiPrefs.validateThemePreference(undefined), "light");
  assert.equal(UiPrefs.validateThemePreference("dark"), "dark");
  assert.equal(UiPrefs.validateThemePreference("system"), "system");
  assert.equal(UiPrefs.validateThemePreference("neon"), "light");
  assert.equal(UiPrefs.resolveEffectiveTheme("light", true), "light");
  assert.equal(UiPrefs.resolveEffectiveTheme("dark", false), "dark");
  assert.equal(UiPrefs.resolveEffectiveTheme("system", true), "dark");
  assert.equal(UiPrefs.resolveEffectiveTheme("system", false), "light");
  const appearance = UiPrefs.getDefaultsPatchForGroup("appearance");
  assert.equal(appearance.themePreference, "light");
  assert.equal(UiPrefs.normalizeSettingsSection("appearance"), "appearance");
  assert.equal(UiPrefs.settingsHashForSection("appearance"), "#pe-settings-appearance");
});
