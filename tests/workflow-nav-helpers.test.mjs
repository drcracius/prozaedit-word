import test from "node:test";
import assert from "node:assert/strict";
import { loadLib, loadLibs } from "./load-lib.mjs";

test("WorkflowNav tab order", () => {
  const { WorkflowNav } = loadLib("src/taskpane/lib/workflow-nav-helpers.js");
  assert.equal(WorkflowNav.TAB_ORDER_SIMPLE.slice(0, 4).join(","), "tab1,tab3,tab4,tab7");
  assert.ok(WorkflowNav.tabFlexOrder("tab1", true) < WorkflowNav.tabFlexOrder("tab3", true));
  assert.ok(WorkflowNav.tabFlexOrder("tab7", true) < WorkflowNav.tabFlexOrder("tab5", true));
  assert.equal(WorkflowNav.tabVisibleLabel("tab1", "Target", true), "Start");
  assert.equal(WorkflowNav.tabVisibleLabel("tab1", "Target", false), "Start");
  assert.equal(WorkflowNav.tabVisibleLabel("tab3", "Checks", false), "Run");
  assert.equal(WorkflowNav.tabVisibleLabel("tab4", "Audit", false), "Fix");
  assert.equal(WorkflowNav.tabVisibleLabel("tab2", "Thesaurus", false), "Thesaurus");
  assert.match(WorkflowNav.tabAriaLabel("tab4", "Audit", false), /Fix/i);
});

test("WorkflowNav crossNavLinks", () => {
  const { WorkflowNav } = loadLib("src/taskpane/lib/workflow-nav-helpers.js");
  const auditLinks = WorkflowNav.crossNavLinks("tab4", { hasAuditResults: true });
  assert.ok(auditLinks.some((l) => l.id === "to-target"));
  assert.ok(auditLinks.some((l) => l.id === "run-audit" && /Run again/i.test(l.label)));
  const startLinks = WorkflowNav.crossNavLinks("tab1", { hasAuditResults: false });
  assert.ok(startLinks.some((l) => l.id === "run-audit" && l.label === "Run"));
  const checksNo = WorkflowNav.crossNavLinks("tab3", { hasAuditResults: false });
  assert.ok(checksNo.some((l) => l.id === "to-target"));
  const checksYes = WorkflowNav.crossNavLinks("tab3", { hasAuditResults: true });
  assert.ok(checksYes.some((l) => l.id === "to-audit" && l.label === "Review"));
  assert.ok(checksNo.some((l) => l.id === "run-audit" && l.label === "Run"));
  assert.equal(
    WorkflowNav.partialScopeWarning({ enabled: true, fictionChecks: true, fullManuscript: false }).length > 0,
    true
  );
  assert.equal(WorkflowNav.partialScopeWarning({ fictionChecks: true, fullManuscript: true }), "");
  assert.equal(WorkflowNav.partialScopeWarning({ enabled: false, fictionChecks: true, fullManuscript: false }), "");
});

test("WorkflowNav dictionary footer relevance", () => {
  const { WorkflowNav } = loadLibs([
    "src/taskpane/lib/plain-language-helpers.js",
    "src/taskpane/lib/workflow-nav-helpers.js",
  ]);
  assert.equal(WorkflowNav.shouldShowCardDictionaryFooter({ targetText: "Elena" }), true);
  assert.equal(WorkflowNav.shouldShowCardDictionaryFooter({ ruleId: "rep:x" }), false);
  assert.equal(
    WorkflowNav.shouldShowCardDictionaryFooter({ ruleId: "spell:double_space", targetText: "  " }),
    false
  );
});
