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
  const actionId = LongOp.ACTION_IDS.CITATION_SCAN;
  const key = LongOp.sessionDismissKey(actionId);
  const store = {};
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: true,
      actionId,
      charCount: 100000,
      scopeMode: "full",
      sessionGet: (k) => store[k],
    }),
    true
  );
  store[key] = "1";
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: true,
      actionId,
      charCount: 100000,
      scopeMode: "full",
      sessionGet: (k) => store[k],
    }),
    false
  );
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: false,
      actionId,
      charCount: 100000,
      scopeMode: "full",
      sessionGet: (k) => store[k],
    }),
    false
  );
});

test("LongOp.shouldShowLongOperationWarning skips short scope for scans", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  assert.equal(
    LongOp.shouldShowLongOperationWarning({
      showLongOperationWarnings: true,
      actionId: LongOp.ACTION_IDS.TIMELINE_SCAN,
      charCount: 5000,
      scopeMode: "selection",
    }),
    false
  );
});

test("LongOp.actionIdForAudit never returns a pre-ack id (Run report uses progress UI)", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  assert.equal(LongOp.actionIdForAudit("full", false, 500000), null);
  assert.equal(LongOp.actionIdForAudit("pages", false, 100000), null);
  assert.equal(LongOp.actionIdForAudit("selection", false, 500), null);
});

test("LongOp.scopeLooksLong uses WARN_MIN_CHARS", () => {
  const { LongOp } = loadLib("src/taskpane/lib/long-operation-helpers.js");
  assert.equal(LongOp.scopeLooksLong(79999, "selection"), false);
  assert.equal(LongOp.scopeLooksLong(80000, "selection"), true);
  assert.equal(LongOp.scopeLooksLong(0, "full"), true);
});

test("LongOperationController cancel signal", () => {
  const { LongOperationController } = loadLib("src/taskpane/lib/long-operation-controller.js");
  const ctrl = LongOperationController.create({});
  assert.equal(ctrl.isCancelled(), false);
  ctrl.cancel();
  assert.equal(ctrl.isCancelled(), true);
  assert.throws(() => ctrl.throwIfCancelled(), (e) => e.code === "PE_CANCELLED");
});
