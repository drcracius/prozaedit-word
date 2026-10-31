import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("CitationEngine eligibility and default style", () => {
  const pe = loadLib("src/taskpane/lib/citation-engine.js");
  const { CitationEngine } = pe;
  assert.equal(CitationEngine.isEligibleManuscript("Academic Paper / Journal"), true);
  assert.equal(CitationEngine.isEligibleManuscript("Fiction (Thriller/Mystery/Crime)"), false);
  assert.equal(CitationEngine.defaultStyle("Business / Corporate Report"), "BLUEBOOK");
  assert.equal(CitationEngine.defaultStyle("Technical / Journalism"), "CHICAGO");
  assert.equal(CitationEngine.defaultStyle("Academic Paper / Journal"), "APA");
});

test("CitationEngine.analyze flags APA parenthetical patterns", () => {
  const pe = loadLib("src/taskpane/lib/citation-engine.js");
  const paragraphs = [
    {
      index: 0,
      text: "Recent work (Smith, 2020) supports the claim.",
    },
  ];
  const result = pe.CitationEngine.analyze(paragraphs, {
    manuscriptType: "Academic Paper / Journal",
    citationStyle: "APA",
    citationReconcileBiblio: false,
    mutedRules: [],
    reportDensity: "balanced",
  });
  assert.ok(result.stats.inTextCount >= 1);
  assert.ok(result.inTextCitations.length >= 1);
});
