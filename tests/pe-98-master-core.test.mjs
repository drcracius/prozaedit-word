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

test("phrase find misses do not hang on long text", () => {
  const P = loadEngine();
  const hay = `${"absorbing orbs ".repeat(8000)} the end.`;
  const t0 = Date.now();
  assert.equal(P.Audit._find(hay, hay.toLowerCase(), "end result"), null);
  assert.equal(P.Audit._containsExact(hay, "xyzzy"), false);
  assert.ok(Date.now() - t0 < 2000);
});

test("bounded phrase scan ignores empty targets and does not hang", () => {
  const pe = loadLib("src/taskpane/lib/prozaedit-master-engine.js");
  assert.equal(pe.MasterEngine.AuditPipeline._findBoundedPhrases("hello world", "").length, 0);
  assert.equal(pe.MasterEngine.AuditPipeline._findBoundedPhrases("", "hello").length, 0);
  const hits = pe.MasterEngine.AuditPipeline._findBoundedPhrases("the end result was fine", "end result");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].match.toLowerCase(), "end result");
});

test("contributeSupplemental returns [] on throw and caps huge input", () => {
  const pe = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/prozaedit-master-engine.js"]);
  const huge = `${"word ".repeat(120000)} said angrily now`;
  const t0 = Date.now();
  const extra = pe.MasterEngine.contributeSupplemental(huge, { manuscriptType: "Fiction (General)", mDialogue: true });
  assert.ok(Date.now() - t0 < 4000);
  assert.ok(Array.isArray(extra));
  assert.ok(extra.length <= 36);
});

test("live extra pass uses master name-similarity and echo, not a second wordiness scan", () => {
  const pe = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/prozaedit-master-engine.js"]);
  const extra = pe.MasterEngine.contributeSupplemental(
    "In order to finish, Marcus met Marcia. Beautiful beautiful lanterns filled the hall.",
    { manuscriptType: "Fiction (General)", chkRep: true, chkProp: true, mDialogue: true }
  );
  assert.ok(!extra.some((f) => String(f.ruleId).startsWith("phrase:")));
  assert.ok(extra.some((f) => String(f.ruleId).startsWith("prop:collision")));
  assert.ok(extra.some((f) => String(f.ruleId).startsWith("rep:echo")));
  assert.ok(extra.every((f) => f.confidence === "low"));
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
