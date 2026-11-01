import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("LongOp.readShowWarningsFromConfig defaults true", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  assert.equal(LongOp.readShowWarningsFromConfig(null), true);
  assert.equal(LongOp.readShowWarningsFromConfig("{}"), true);
  assert.equal(LongOp.readShowWarningsFromConfig(JSON.stringify({ showLongOperationWarnings: false })), false);
});

test("LongOp.shouldShowLongOperationWarning respects pref and session dismiss", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  const actionId = LongOp.ACTION_IDS.AUDIT_FULL;
  const key = LongOp.sessionDismissKey(actionId);
  const store = {};
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: true,
      actionId,
      sessionGet: (k) => store[k],
    }),
    true
  );
  store[key] = "1";
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: true,
      actionId,
      sessionGet: (k) => store[k],
    }),
    false
  );
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: false,
      actionId,
      sessionGet: (k) => store[k],
    }),
    false
  );
});

test("LongOp.actionIdForAudit scope heuristics", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  assert.equal(LongOp.actionIdForAudit("full", false), LongOp.ACTION_IDS.AUDIT_FULL);
  assert.equal(LongOp.actionIdForAudit("selection", false), null);
  assert.equal(LongOp.actionIdForAudit("pages", false), LongOp.ACTION_IDS.AUDIT_LARGE);
});

test("LongOperationController cancel signal", () => {
  const { LongOperationController } = loadLib("src/taskpane/lib/long-operation-controller.js");
  const ctrl = LongOperationController.create({});
  assert.equal(ctrl.isCancelled(), false);
  ctrl.cancel();
  assert.equal(ctrl.isCancelled(), true);
  assert.throws(() => ctrl.throwIfCancelled(), (e) => e.code === "PE_CANCELLED");
});
