import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadLib } from "./load-lib.mjs";

test("AuditReview exposes card position and stable next target", () => {
  const { AuditReview } = loadLib("src/taskpane/lib/audit-review-helpers.js");
  assert.equal(AuditReview.progressLabel(0, 12), "Finding 1 of 12");
  assert.equal(AuditReview.progressLabel(11, 12), "Finding 12 of 12");
  assert.equal(AuditReview.nextTargetId(["a", "b", "c"], "b"), "c");
  assert.equal(AuditReview.nextTargetId(["a", "b", "c"], "c"), "b");
  assert.equal(AuditReview.nextTargetId(["a"], "a"), "");
});

test("AuditReview recovery copy preserves actionable scope errors", () => {
  const { AuditReview } = loadLib("src/taskpane/lib/audit-review-helpers.js");
  assert.equal(
    AuditReview.recoveryMessage(new Error("Document too large—use chapter range."), "finish this audit"),
    "Document too large—use chapter range."
  );
  assert.match(
    AuditReview.recoveryMessage(new Error("GeneralException"), "finish this audit"),
    /reopen the task pane.*smaller scope/i
  );
});

test("audit card state, cancel accessibility, and Gemini disclosure are wired", () => {
  const js = fs.readFileSync(path.join("src", "taskpane", "taskpane.js"), "utf8");
  const html = fs.readFileSync(path.join("src", "taskpane", "taskpane.html"), "utf8");
  assert.match(js, /nextTargetId\?\.\(visibleIds, id\)/);
  assert.match(js, /focus\?\.\(\{ preventScroll: true \}\)/);
  assert.match(js, /Finding \$\{i \+ 1\} of \$\{list\.length\}/);
  assert.match(js, /Cancelling after the current Word step/);
  assert.match(js, /else if \(failed\) \{\s*showPeStatus\(\s*getRetryController\(\)\?\.has\?\.\(\)\s*\? "Audit could not finish/);
  assert.match(js, /if \(e\.key === "Tab"\) trapFocusWithin\(e, shell\.querySelector\("\.pe-onboarding-tour-panel"\)\)/);
  assert.match(html, /audit-review-helpers\.js/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /Remember” stores the key in this Word document/);
  assert.match(html, /Context is selection-only by default/);
  assert.match(html, /only the search word is sent to Datamuse/);
});
