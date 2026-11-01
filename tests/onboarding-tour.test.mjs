import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("Onboarding.shouldShowOnboardingTour respects prefs and checklist", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(
    Onboarding.shouldShowOnboardingTour({
      onboardingTourComplete: true,
      firstRunComplete: false,
      showSessionTips: true,
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowOnboardingTour({
      onboardingTourComplete: false,
      firstRunComplete: false,
      showSessionTips: false,
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowOnboardingTour({
      onboardingTourComplete: false,
      firstRunComplete: false,
      showSessionTips: true,
      checklistDismissed: true,
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowOnboardingTour({
      onboardingTourComplete: false,
      firstRunComplete: true,
      showSessionTips: true,
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowOnboardingTour({
      onboardingTourComplete: false,
      firstRunComplete: false,
      showSessionTips: true,
      checklistDismissed: false,
    }),
    true
  );
});

test("Onboarding.shouldDeferOnboardingTour when banners visible", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(
    Onboarding.shouldDeferOnboardingTour({ simpleModeFirstRunBannerVisible: true }),
    true
  );
  assert.equal(Onboarding.shouldDeferOnboardingTour({ sessionTipsVisible: true }), true);
  assert.equal(Onboarding.shouldDeferOnboardingTour({ firstAuditChecklistExpanded: true }), true);
  assert.equal(Onboarding.shouldDeferOnboardingTour({ onboardingTourOpen: true }), true);
  assert.equal(Onboarding.shouldDeferOnboardingTour({}), false);
});

test("Onboarding PE-64 session tips and checklist gating", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(
    Onboarding.shouldShowSessionTipsOnLoad({
      showSessionTips: true,
      firstRunComplete: false,
      simpleMode: true,
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowSessionTipsOnLoad({
      showSessionTips: true,
      firstRunComplete: true,
      simpleMode: true,
    }),
    true
  );
  assert.equal(
    Onboarding.shouldShowFirstAuditChecklist({
      simpleModeFirstRunBannerVisible: true,
      onboardingTourOpen: false,
      onboardingTourPending: false,
      checklistDismissed: false,
    }),
    false
  );
  assert.equal(
    Onboarding.shouldShowFirstAuditChecklist({
      simpleModeFirstRunBannerVisible: false,
      onboardingTourOpen: false,
      onboardingTourPending: false,
      checklistDismissed: false,
    }),
    true
  );
});

test("Onboarding tour stops and complete patch", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(Onboarding.onboardingTourStopCount(), 3);
  const stop = Onboarding.getOnboardingTourStop(1);
  assert.equal(stop.id, "run");
  assert.ok(stop.anchorSelector);
  assert.equal(Onboarding.applyOnboardingTourCompletePatch({}).onboardingTourComplete, true);
  assert.equal(Onboarding.buildFirstRunBootstrapPatch().onboardingTourComplete, false);
});

test("Onboarding audit scope footnote thresholds", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(
    Onboarding.shouldShowAuditScopeFootnote({ hadTruncation: true, excerptCharLength: 1000 }),
    true
  );
  assert.equal(
    Onboarding.shouldShowAuditScopeFootnote({
      hadTruncation: false,
      scopeMode: "full",
      excerptCharLength: 250000,
      scopeLimit: 450000,
    }),
    true
  );
  assert.equal(
    Onboarding.shouldShowAuditScopeFootnote({
      hadTruncation: false,
      scopeMode: "selection",
      excerptCharLength: 5000,
      scopeLimit: 150000,
    }),
    false
  );
  const copy = Onboarding.buildAuditScopeFootnoteCopy({ hadTruncation: true });
  assert.match(copy, /Critical/i);
  assert.match(copy, /chapters/i);
});

test("resolveFirstRunOnLoad legacy migrates onboardingTourComplete", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  const leg = Onboarding.resolveFirstRunOnLoad({ rawConfig: "{}", parsedConfig: {} });
  assert.equal(leg.kind, "migrate-legacy");
  assert.equal(leg.patch.onboardingTourComplete, true);
});
