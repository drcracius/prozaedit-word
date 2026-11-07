import assert from "node:assert/strict";
import test from "node:test";
import { loadLib, loadLibs } from "./load-lib.mjs";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";

test("master engine dialogue strip keeps character offsets", () => {
  const pe = loadLib("src/taskpane/lib/prozaedit-master-engine.js");
  const src = 'He said, "Hello there," and left.';
  const out = pe.MasterEngine.DialogueImmunity.stripDialogue(src);
  assert.equal(out.length, src.length);
  assert.equal(out.indexOf("Hello"), -1);
  assert.ok(out.includes("and left"));
});

test("master Micro-POS tags a verb after a pronoun", () => {
  const pe = loadLib("src/taskpane/lib/prozaedit-master-engine.js");
  const tokens = pe.MasterEngine.MicroPOS.tokenizeAndTag("They affect policy.");
  const affect = tokens.find((t) => t.lower === "affect");
  assert.ok(affect);
  assert.equal(affect.tag, "VERB");
});

test("master AuditPipeline returns lanes and a summary", () => {
  const pe = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/prozaedit-master-engine.js"]);
  const r = pe.MasterEngine.AuditPipeline.audit("In order to finish, the end result was very unique.", {
    manuscriptType: "Business / Corporate Report",
    language: "en-US",
  });
  assert.ok(Array.isArray(r.findings));
  assert.ok(r.summary && r.summary.byLane);
  assert.ok(r.findings.every((f) => ["Correctness", "Clarity", "Consistency", "Craft"].includes(f.lane)));
});

test("lane map: spelling is Correctness, pleonasm is Clarity", () => {
  const pe = loadLib("src/taskpane/lib/prozaedit-master-engine.js");
  assert.equal(pe.MasterEngine.Lanes.forRuleId("spell:dialect:colour"), "Correctness");
  assert.equal(pe.MasterEngine.Lanes.forRuleId("rep:pleo:end result"), "Clarity");
  assert.equal(pe.MasterEngine.Lanes.forRuleId("prop:collision:jon"), "Consistency");
  assert.equal(pe.MasterEngine.Lanes.forRuleId("plot:restroom"), "Craft");
});

test("live audit stamps lanes and byLane without dropping suggestions", () => {
  const P = loadEngine();
  const r = P.Audit.run("The end result was a surprise.", ctxFor("Business / Corporate Report"));
  assert.ok(r.suggestions.length >= 1);
  assert.ok(r.suggestions.every((s) => s.lane));
  assert.ok(r.summary && r.summary.byLane);
  assert.equal(
    r.summary.byLane.Correctness + r.summary.byLane.Clarity + r.summary.byLane.Consistency + r.summary.byLane.Craft,
    r.suggestions.length
  );
});

test("coach summarises last-audit lanes", () => {
  const P = loadEngine();
  const line = P.LocalCoach.formatLaneSummary({
    total: 5,
    byLane: { Correctness: 2, Clarity: 3, Consistency: 0, Craft: 0 },
  });
  assert.match(line, /2 Correctness/);
  assert.match(line, /3 Clarity/);
  const reply = P.LocalCoach.answer("What did the last report find?", "", {
    manuscriptType: "General Fiction",
    lastAuditSummary: { total: 5, byLane: { Correctness: 2, Clarity: 3, Consistency: 0, Craft: 0 } },
  });
  assert.match(reply, /Correctness/);
});

test("lexical banks include licensed extras as soft or hard rows", () => {
  const pe = loadLib("src/taskpane/lib/lexical-banks.js");
  const hard = pe.LexicalBanks.PLEONASMS.map((r) => r[0]);
  const soft = pe.LexicalBanks.PLEONASMS_SOFT.map((r) => r[0]);
  assert.ok(hard.includes("more unique"));
  assert.ok(soft.includes("nodded his head"));
  assert.ok(Array.isArray(pe.LexicalBanks.TAG_ADVERBS) && pe.LexicalBanks.TAG_ADVERBS.length);
  assert.ok(Array.isArray(pe.LexicalBanks.NOMINALIZATIONS));
});

test("contributeSupplemental tag adverbs stay low confidence", () => {
  const pe = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/prozaedit-master-engine.js"]);
  const extra = pe.MasterEngine.contributeSupplemental('She said angrily, "Go."', {
    manuscriptType: "General Fiction",
    mDialogue: true,
  });
  const tag = extra.find((f) => String(f.ruleId).startsWith("craft:tag_adverb"));
  assert.ok(tag);
  assert.equal(tag.confidence, "low");
  assert.equal(tag.lane, "Craft");
});
