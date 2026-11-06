import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";
import { loadLib } from "./load-lib.mjs";

const P = loadEngine();

test("business jargon is one whole-word card and does not also raise an AI-voice card", () => {
  const text = "Let us leverage synergy and circle back tomorrow.";
  const biz = P.Audit.run(text, ctxFor("Business / Corporate Report", { chkAI: true })).suggestions;
  const lev = biz.filter((s) => s.ruleId === "biz:leverage");
  assert.equal(lev.length, 1);
  assert.equal(lev[0].targetText, "leverage");
  assert.equal(lev[0].replacementText, "use");
  assert.equal(lev[0].confidence, "medium");
  assert.equal(biz.some((s) => String(s.ruleId).startsWith("ai:voice") && /leverage/i.test(s.targetText)), false);
  const fic = P.Audit.run(text, ctxFor("Fiction (General)", { chkAI: true })).suggestions;
  assert.equal(fic.some((s) => String(s.ruleId).startsWith("biz:")), false);
  const winner = P.Audit.run("The winner spoke at noon.", ctxFor("Business / Corporate Report")).suggestions;
  assert.equal(winner.some((s) => s.ruleId === "biz:win-win"), false);
});

test("passive voice raises one card, and adjectives after was are not passive", () => {
  const hits = "The door was opened and the note was signed and the lamp was moved and the box was closed and the file was locked and the gate was shut and the book was placed and the chair was turned.";
  const fic = P.Audit.run(hits, ctxFor("Fiction (General)")).suggestions.filter((s) => /passive_cluster/.test(s.ruleId));
  assert.equal(fic.length, 1);
  assert.equal(fic[0].ruleId, "mot:passive_cluster");
  const long = `${hits} ${"The office stayed quiet after the meeting ended for the day. ".repeat(12)}`;
  const nf = P.Audit.run(long, ctxFor("Business / Corporate Report")).suggestions.filter((s) => /passive_cluster/.test(s.ruleId));
  assert.equal(nf.length, 1);
  assert.equal(nf[0].ruleId, "nf:passive_cluster");
  const tired = "She was tired and he was pleased and they were worried and she was surprised and he was concerned and she was bored and he was scared.";
  assert.equal(P.Audit.run(tired, ctxFor("Fiction (General)")).suggestions.some((s) => /passive_cluster/.test(s.ruleId)), false);
});

test("fiction narration checks skip quoted speech and still quote the original wording", () => {
  const quoted = `"very very very", she said, and then she walked home before dark.`;
  const inside = P.Audit.run(quoted, ctxFor("Fiction (General)")).suggestions.filter((s) => String(s.ruleId).startsWith("rep:") && /very/i.test(s.targetText || ""));
  assert.equal(inside.length, 0);
  const narr = "She walked very very slowly toward the old door before dark fell.";
  const outside = P.Audit.run(narr, ctxFor("Fiction (General)")).suggestions.find((s) => String(s.ruleId).startsWith("rep:") && /very/i.test(s.targetText || ""));
  if (outside) assert.equal(narr.includes(outside.targetText), true);
});

test("a dialect card quotes the inflected word and maps the ending", () => {
  const hit = P.Audit.run("They organised the files before noon.", ctxFor("Business / Corporate Report", { language: "en-US" })).suggestions.find((s) => s.ruleId === "spell:dialect:organise");
  assert.ok(hit);
  assert.equal(hit.targetText, "organised");
  assert.equal(hit.replacementText, "organized");
  const analyses = P.Audit.run("The analyses were ready before noon.", ctxFor("Business / Corporate Report", { language: "en-US" })).suggestions;
  assert.equal(analyses.some((s) => s.ruleId.startsWith("spell:dialect:analyse")), false);
});

test("names keep an internal capital and one apostrophe; a lone sentence start is dropped", () => {
  const PN = loadLib("src/taskpane/lib/proper-noun-analyse.js").ProperNoun;
  const names = PN.extract("After lunch Elena met MacDonald and O'Connor near the gate. However the train was late.", new Set());
  const keys = [...names.keys()];
  assert.ok(keys.some((k) => k.includes("Elena")));
  assert.ok(keys.some((k) => k.includes("MacDonald")));
  assert.ok(keys.some((k) => k.includes("O'Connor")));
  assert.equal(keys.includes("However"), false);
});

test("tense counts a capital subject and one adverb between subject and verb", () => {
  const counts = P.GenreChecks._tenseCounts("Vega stepped into the hall. He quietly closed the door.");
  assert.ok(counts.past >= 2);
});

test("continuity counts a whole word and not a piece of a longer word", () => {
  const C = loadLib("src/taskpane/lib/continuity-guard.js").ContinuityGuard;
  assert.equal(C.countOccurrences("the department party started", "art"), 0);
  assert.equal(C.countOccurrences("the art show started", "art"), 1);
});

test("AI findings parse a balanced array and ignore an earlier bracket", () => {
  const A = loadLib("src/taskpane/lib/ai-safety.js").AISafety;
  const reply = 'note [see] then [{"targetText":"hello","explanation":"shorten it","replacementText":"hi"}]';
  const parsed = A.parseFindings(reply, "hello world");
  assert.equal(parsed.findings.length, 1);
  assert.equal(parsed.findings[0].targetText, "hello");
  assert.throws(() => A.parseFindings("[{bad", "hello"), /not valid JSON/);
});

test("quote-balance cards stay low confidence", () => {
  const cards = P.Audit.run(`"I never meant to leave, she said, and turned to the window.`, ctxFor("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("edit:quote"));
  assert.ok(cards.length >= 1);
  assert.ok(cards.every((s) => s.confidence === "low"));
});
