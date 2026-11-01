import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("PlainLanguage report depth and audit banner", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.match(PlainLanguage.reportDepthHintLabel("light"), /quick pass/i);
  assert.match(PlainLanguage.reportDepthHintLabel("balanced"), /recommended/i);
  assert.match(PlainLanguage.reportDepthHintLabel("dense"), /everything|maximum/i);
  assert.match(PlainLanguage.simpleModeAuditBannerText("confirmed"), /important issues only/i);
  assert.match(PlainLanguage.simpleModeAuditBannerText("all"), /Simple mode is on/i);
});

test("PlainLanguage scope friendly labels", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.equal(PlainLanguage.scopeFriendlyLabel("selection"), "Text you selected in Word");
  assert.equal(PlainLanguage.scopeFriendlyLabel("selected-chapters", { chapterCount: 1 }), "This chapter");
  assert.equal(PlainLanguage.scopeFriendlyLabel("full"), "Whole document");
  assert.equal(PlainLanguage.scopeSelectOptionLabel("pages"), "A range of pages (estimated)");
});

test("PlainLanguage audit filter hint differs for simple mode", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.match(PlainLanguage.auditFilterLanesHint(true), /Important \(Critical\)/i);
  assert.match(PlainLanguage.auditFilterLanesHint(false), /Filter lanes/i);
});

test("PlainLanguage new-to-editing bullets", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.ok(PlainLanguage.NEW_TO_EDITING_TOOLS_BULLETS.length >= 3);
  assert.ok(PlainLanguage.CHECKS_RUN_AUDIT_TAGLINE.includes("Run"));
});
