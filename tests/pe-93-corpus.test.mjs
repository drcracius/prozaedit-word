import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, scoreCorpus } from "./helpers/corpus-harness.mjs";
import { PE93_ALL } from "./corpus/pe-93-passages.mjs";

test("PE-93: independent corpus has at least 150 passages across all 12 genres", () => {
  assert.ok(PE93_ALL.length >= 150, String(PE93_ALL.length));
  assert.equal(new Set(PE93_ALL.map((c) => c.genre)).size, 12);
});

test("PE-93: independent corpus - Simple view precision/recall gates", () => {
  const P = loadEngine();
  const r = scoreCorpus(P, PE93_ALL);
  console.log(`# PE93 corpus n=${PE93_ALL.length} tp=${r.tp} fp=${r.fp} fn=${r.fn} precision=${r.precision.toFixed(3)} recall=${r.recall.toFixed(3)}`);
  if (r.fpList.length) console.log("# FP:", r.fpList.join(" | "));
  if (r.fnList.length) console.log("# FN:", r.fnList.join(" | "));
  assert.ok(r.precision >= 0.9, `precision ${r.precision}`);
  assert.ok(r.recall >= 0.85, `recall ${r.recall}`);
});

test("PE-93: quote balance counts a closing quote after a digit but still ignores inch marks", () => {
  const P = loadEngine();
  const run = (t) => P.Audit.run(t, { manuscriptType: "Fiction (General)", chkRep: true, chkSpell: true, dictionary: [], mutedRules: [] }).suggestions.filter((s) => s.ruleId === "edit:quote:double");
  assert.equal(run(`He stamped it "L-14", then left.`).length, 0);
  assert.equal(run(`She was 5'10" and he was 6" shorter.`).length, 0);
  assert.equal(run(`"I never meant to go, she said.`).length, 1);
});

test("PE-93: citation scan does not treat sentence-start nouns or labels as authors; real gaps still flagged", async () => {
  const { loadLib } = await import("./load-lib.mjs");
  const C = loadLib("src/taskpane/lib/citation-engine.js").CitationEngine;
  const run = (t) => C.analyze([{ index: 0, text: t }], { manuscriptType: "Academic Paper / Journal" }).findings.map((f) => f.ruleId);
  assert.equal(JSON.stringify(run("Results showed a gain. Participants reported less pain (Smith, 2020). Two cities (New York) took part.")), "[]");
  assert.ok(run("Smith found a large effect in the sample.").some((r) => r.includes("narrative_year")));
});

test("PE-93: timeline year-jump only fires for years that are close together in the text", async () => {
  const { loadLib } = await import("./load-lib.mjs");
  const C = loadLib("src/taskpane/lib/chronology-engine.js").ChronologyEngine;
  const paras = (a, b) => [{ index: 0, text: `It was ${a}.` }, ...Array.from({ length: 30 }, (_, i) => ({ index: i + 1, text: "Filler." })), { index: 31, text: `By ${b} all was changed.` }];
  const far = C.analyze([{ index: 400, text: "In 1812 the city burned." }, { index: 20, text: "In 2024 the city was rebuilt." }], { manuscriptType: "Fiction (Historical)", chronoDepth: "meso" });
  assert.ok(!far.findings.some((f) => f.ruleId.startsWith("chrono:year:gap")), "paragraphs 380 apart are not a short span");
  const near = C.analyze([{ index: 5, text: "In 1812 the city burned." }, { index: 6, text: "In 2024 the city was rebuilt." }], { manuscriptType: "Fiction (Historical)", chronoDepth: "meso" });
  assert.ok(near.findings.some((f) => f.ruleId.startsWith("chrono:year:gap")));
  void paras;
});
