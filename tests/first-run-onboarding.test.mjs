import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("Onboarding.resolveFirstRunOnLoad bootstrap vs legacy", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  const boot = Onboarding.resolveFirstRunOnLoad({ rawConfig: null, parsedConfig: null });
  assert.equal(boot.kind, "bootstrap");
  assert.equal(boot.patch.simpleMode, true);
  assert.equal(boot.patch.auditCardFilter, "confirmed");
  assert.equal(boot.patch.firstRunComplete, false);
  assert.equal(boot.patch.onboardingTourComplete, false);

  const legacy = Onboarding.resolveFirstRunOnLoad({ rawConfig: "{}", parsedConfig: {} });
  assert.equal(legacy.kind, "migrate-legacy");
  assert.equal(legacy.patch.onboardingTourComplete, true);
  assert.equal(
    Onboarding.resolveFirstRunOnLoad({ rawConfig: "{}", parsedConfig: { firstRunComplete: true } }).kind,
    "none"
  );
  assert.equal(
    Onboarding.resolveFirstRunOnLoad({ rawConfig: "{}", parsedConfig: { firstRunComplete: false } }).kind,
    "none"
  );
  assert.equal(
    Onboarding.resolveFirstRunOnLoad({
      rawConfig: "{}",
      parsedConfig: { simpleMode: false, firstRunComplete: true },
    }).kind,
    "none"
  );
});

test("Onboarding.shouldShowSimpleModeFirstRunBanner", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(
    Onboarding.shouldShowSimpleModeFirstRunBanner({ firstRunComplete: true, simpleMode: true }),
    false
  );
  assert.equal(
    Onboarding.shouldShowSimpleModeFirstRunBanner({ firstRunComplete: false, simpleMode: false }),
    false
  );
  assert.equal(
    Onboarding.shouldShowSimpleModeFirstRunBanner({ firstRunComplete: false, simpleMode: true }),
    true
  );
  assert.equal(
    Onboarding.shouldShowSimpleModeFirstRunBanner({
      firstRunComplete: false,
      simpleMode: true,
      sessionGet: () => "1",
    }),
    false
  );
});

test("Onboarding.shouldShowWorkflowNextStep", () => {
  const { Onboarding } = loadLib("src/taskpane/lib/onboarding-helpers.js");
  assert.equal(Onboarding.shouldShowWorkflowNextStep({ sessionAuditCompleted: true }), false);
  assert.equal(Onboarding.shouldShowWorkflowNextStep({ hasAuditCards: true }), false);
  assert.equal(Onboarding.shouldShowWorkflowNextStep({}), true);
});

test("LongOp full-manuscript warning mentions chapter workaround", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  const copy = LongOp.warningCopyForAction(LongOp.ACTION_IDS.AUDIT_FULL);
  assert.match(copy, /Chosen chapters/i);
  assert.match(copy, /Page range/i);
});
