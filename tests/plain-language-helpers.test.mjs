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
  assert.match(PlainLanguage.auditFilterLanesHint(true), /Important/i);
  assert.doesNotMatch(PlainLanguage.auditFilterLanesHint(true), /Filter lanes/i);
  assert.match(PlainLanguage.auditFilterLanesHint(false), /Filter lanes/i);
  assert.match(PlainLanguage.auditFilterLanesHint(false), /Critical/i);
});

test("PlainLanguage Important vs Critical filter labels", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.equal(PlainLanguage.auditFilterUserLabel("confirmed", true), "Important");
  assert.equal(PlainLanguage.auditFilterUserLabel("confirmed", false), "Critical");
  assert.equal(PlainLanguage.auditFilterChipText("confirmed", 3, true), "Important (3)");
  assert.match(PlainLanguage.auditSeverityLegendLine(true), /Important/i);
  assert.match(PlainLanguage.auditSeverityLegendLine(false), /Critical/i);
});

test("PlainLanguage mute dictionary nudge rules", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.equal(PlainLanguage.isNameLikeMuteTarget({ ruleId: "prop:variant:smith", targetText: "Smith" }), true);
  assert.equal(PlainLanguage.isNameLikeMuteTarget({ ruleId: "spell:double_space", targetText: "  " }), false);
  assert.equal(PlainLanguage.isNameLikeMuteTarget({ targetText: "Elena" }), true);
  assert.equal(PlainLanguage.shouldShowMuteDictionaryNudge({ targetText: "Elena" }, false), true);
  assert.equal(PlainLanguage.shouldShowMuteDictionaryNudge({ targetText: "Elena" }, true), false);
  assert.equal(PlainLanguage.shouldShowMuteDictionaryNudge({ ruleId: "rep:pleo:test" }, false), false);
  assert.match(PlainLanguage.muteDictionaryNudgeStatusHtml(), /Dictionary/i);
});

test("PlainLanguage report depth option helpers", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.match(PlainLanguage.reportDepthOptionHelper("light"), /Light/i);
  assert.match(PlainLanguage.reportDepthOptionHelper("balanced"), /Balanced/i);
  assert.match(PlainLanguage.reportDepthOptionHelper("dense"), /Dense/i);
  assert.equal(PlainLanguage.TAB_HINTS.tab3, "Run check");
});

test("PlainLanguage new-to-editing bullets", () => {
  const { PlainLanguage } = loadLib("src/taskpane/lib/plain-language-helpers.js");
  assert.ok(PlainLanguage.NEW_TO_EDITING_TOOLS_BULLETS.length >= 3);
  assert.ok(PlainLanguage.CHECKS_RUN_AUDIT_TAGLINE.includes("Run"));
});
