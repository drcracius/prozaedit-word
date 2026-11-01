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
});
