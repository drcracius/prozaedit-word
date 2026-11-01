import test from "node:test";
import assert from "node:assert/strict";
import { loadLib, loadLibs } from "./load-lib.mjs";

test("WorkflowNav tab order", () => {
  const { WorkflowNav } = loadLib("src/taskpane/lib/workflow-nav-helpers.js");
  assert.equal(WorkflowNav.TAB_ORDER_SIMPLE.slice(0, 4).join(","), "tab1,tab3,tab4,tab7");
  assert.ok(WorkflowNav.tabFlexOrder("tab1", true) < WorkflowNav.tabFlexOrder("tab3", true));
  assert.ok(WorkflowNav.tabFlexOrder("tab7", true) < WorkflowNav.tabFlexOrder("tab5", true));
  assert.equal(WorkflowNav.tabVisibleLabel("tab1", "Target", true), "Start");
  assert.equal(WorkflowNav.tabVisibleLabel("tab1", "Target", false), "Target");
  assert.match(WorkflowNav.tabAriaLabel("tab4", "Audit", true), /Fix/i);
});

test("WorkflowNav crossNavLinks", () => {
  const { WorkflowNav } = loadLib("src/taskpane/lib/workflow-nav-helpers.js");
  const auditLinks = WorkflowNav.crossNavLinks("tab4", { hasAuditResults: true });
  assert.ok(auditLinks.some((l) => l.id === "to-target"));
  assert.ok(auditLinks.some((l) => l.id === "to-checks" && /Run again/i.test(l.label)));
  const checksNo = WorkflowNav.crossNavLinks("tab3", { hasAuditResults: false });
  assert.ok(checksNo.some((l) => l.id === "to-target"));
  const checksYes = WorkflowNav.crossNavLinks("tab3", { hasAuditResults: true });
  assert.ok(checksYes.some((l) => l.id === "to-audit"));
});

test("WorkflowNav dictionary footer relevance", () => {
  const { WorkflowNav } = loadLibs([
    "src/taskpane/lib/plain-language-helpers.js",
    "src/taskpane/lib/workflow-nav-helpers.js",
  ]);
  assert.equal(WorkflowNav.shouldShowCardDictionaryFooter({ targetText: "Elena" }), true);
  assert.equal(WorkflowNav.shouldShowCardDictionaryFooter({ ruleId: "rep:x" }), false);
});
