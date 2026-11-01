import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("Onboarding.readOnboardingFlagsFromConfig", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.deepEqual(Onboarding.readOnboardingFlagsFromConfig(null), null);
  const flags = Onboarding.readOnboardingFlagsFromConfig(
    JSON.stringify({ showSessionTips: false, showWhatsNew: true })
  );
  assert.equal(flags.showSessionTips, false);
  assert.equal(flags.showWhatsNew, true);
  assert.equal(flags.showPriorSessionSummary, true);
});

test("Onboarding.applyPermanentOffPatch updates CONFIG flags", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  const next = Onboarding.applyPermanentOffPatch({ showSessionTips: true }, "showSessionTips");
  assert.equal(next.showSessionTips, false);
  assert.equal(Onboarding.applyPermanentOffPatch({}, "showWhatsNew").showWhatsNew, false);
  assert.equal(
    Onboarding.applyPermanentOffPatch({}, "showPriorSessionSummary").showPriorSessionSummary,
    false
  );
});

test("Onboarding session dismiss key map covers tips and prior session", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(
    Onboarding.ONBOARDING_PREF_SESSION_KEYS.showSessionTips,
    Onboarding.SESSION_TIPS_DISMISSED_KEY
  );
  assert.equal(
    Onboarding.ONBOARDING_PREF_SESSION_KEYS.showPriorSessionSummary,
    Onboarding.PRIOR_BANNER_SESSION_KEY
  );
});
