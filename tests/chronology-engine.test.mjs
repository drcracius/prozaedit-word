import test from "node:test";
import assert from "node:assert/strict";
import { loadLibs } from "./load-lib.mjs";

test("ChronologyEngine.analyze finds temporal anchors in fiction scope", () => {
  const pe = loadLibs([
    "src/taskpane/lib/lexical-banks.js",
    "src/taskpane/lib/chronology-engine.js",
  ]);
  const paragraphs = [
    { index: 0, text: "Chapter One", headingLevel: 1 },
    { index: 1, text: "The next morning she opened the door." },
    { index: 2, text: "In January 1999 the case began." },
  ];
  const result = pe.ChronologyEngine.analyze(paragraphs, {
    manuscriptType: "Fiction (Thriller/Mystery/Crime)",
    chronoDepth: "meso",
    chronoSpoilerGuard: false,
    mutedRules: [],
    reportDensity: "balanced",
  });
  assert.ok(result.timeline.length >= 2);
  assert.ok(result.findings.length >= 0);
  assert.equal(result.truncated, false);
});

test("ChronologyEngine.mergeFindings dedupes by rule and target", () => {
  const pe = loadLibs([
    "src/taskpane/lib/lexical-banks.js",
    "src/taskpane/lib/chronology-engine.js",
  ]);
  const existing = [{ ruleId: "a", targetText: "same", id: "1" }];
  const incoming = [
    { ruleId: "a", targetText: "same" },
    { ruleId: "b", targetText: "other" },
  ];
  const merged = pe.ChronologyEngine.mergeFindings(existing, incoming);
  assert.equal(merged.length, 2);
});
