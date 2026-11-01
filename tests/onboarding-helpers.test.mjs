import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("Onboarding.whatsNewSeenStorageKey and shouldShowWhatsNewBanner", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(Onboarding.whatsNewSeenStorageKey("2.0.0.15"), "pe-whats-new-seen-2.0.0.15");
  const store = {};
  assert.equal(
    Onboarding.shouldShowWhatsNewBanner({
      showWhatsNew: true,
      buildVersion: "2.0.0.15",
      storageGet: (k) => store[k],
    }),
    true
  );
  store[Onboarding.whatsNewSeenStorageKey("2.0.0.15")] = "1";
  assert.equal(
    Onboarding.shouldShowWhatsNewBanner({
      showWhatsNew: true,
      buildVersion: "2.0.0.15",
      storageGet: (k) => store[k],
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowWhatsNewBanner({ showWhatsNew: false, buildVersion: "2.0.0.15" }),
    false
  );
});

test("Onboarding session summary serialize and format", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  const json = Onboarding.serializeSessionSummary({
    lastVisitAt: "2026-11-01T12:00:00.000Z",
    lastTab: "tab4",
    scopeMode: "Full manuscript",
    ranAudit: true,
    buildVersion: "2.0.0.15",
  });
  assert.ok(json.includes("tab4"));
  const parsed = Onboarding.parseSessionSummary(json);
  assert.equal(parsed.lastTab, "tab4");
  assert.equal(parsed.ranAudit, true);
  const lines = Onboarding.formatPriorSessionLines(parsed);
  assert.ok(lines.some((l) => l.includes("Audit")));
  assert.ok(lines.some((l) => l.includes("Ran audit: Yes")));
  assert.equal(Onboarding.parseSessionSummary("{bad"), null);
});

test("Onboarding.migrateShowSessionTipsFromLegacy", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(Onboarding.migrateShowSessionTipsFromLegacy({}, true).showSessionTips, false);
  assert.equal(Onboarding.migrateShowSessionTipsFromLegacy({}, false).showSessionTips, true);
  assert.equal(Onboarding.migrateShowSessionTipsFromLegacy({ showSessionTips: false }, false).showSessionTips, false);
});
