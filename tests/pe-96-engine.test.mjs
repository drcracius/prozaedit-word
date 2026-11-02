// PE-96 engine regressions found in the final audit.
import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";

const P = loadEngine();
const aan = (text) => {
  const out = [];
  P.EditorHeuristics.scanAAn(text, (i) => out.push(i.targetText), 99);
  return out;
};

test("PE-96: a/an check no longer flags correct everyday usage", () => {
  const correctA = "university union useful usual unique unicorn unit united universal utility utensil uranium urine usage European euphoria eulogy one once ubiquitous Utah ewe user";
  assert.deepEqual(aan(correctA.split(" ").map((w) => `a ${w}`).join("; ")), []);
  const correctAn = "hour honest heir honor honour umbrella uncle unusual unknown ugly upper upset update upgrade uphill onion orange egg hourly historic hotel herb x-ray f-stop s-curve unimportant uninterested";
  assert.deepEqual(aan(correctAn.split(" ").map((w) => `an ${w}`).join("; ")), []);
  assert.deepEqual(aan("She got an F, an MRI, an SOS and an L-shaped desk."), []);
});

test("PE-96: a/an check still flags real mistakes", () => {
  assert.deepEqual(aan("a apple; a hour; a honest man; a egg; an dog; an book; an unicorn; an euphemism; an one"), ["a apple", "a hour", "a honest", "a egg", "an dog", "an book", "an unicorn", "an euphemism", "an one"]);
});

test("PE-96: gb:ise card quotes the document's own capitalisation so Apply can find it", () => {
  const cx = ctxFor("Non-Fiction / Memoir", { language: "en-GB" });
  const r = P.Audit.run("We Organize it later. Then ORGANIZE it again.", cx);
  const gb = r.suggestions.find((s) => s.ruleId === "gb:organize");
  assert.ok(gb);
  assert.ok("We Organize it later. Then ORGANIZE it again.".includes(gb.targetText));
  assert.ok(/^[A-Za-z]+$/.test(gb.replacementText));
  const r2 = P.Audit.run("So we Organize everything.", cx).suggestions.find((s) => s.ruleId === "gb:organize");
  assert.equal(r2.targetText, "Organize");
  assert.equal(r2.replacementText, "Organise");
  const r3 = P.Audit.run("So we ORGANIZE it.", cx).suggestions.find((s) => s.ruleId === "gb:organize");
  assert.equal(r3.targetText, "ORGANIZE");
  assert.equal(r3.replacementText, "ORGANISE");
});

test("PE-96: every applicable card quotes text that exists verbatim (case-sensitive) in the document", () => {
  const docs = [
    "Analyze the data. We Organize it and recognize the pattern; Finalize the colour plan. She said the the end. We can not stop, cannot stop.",
    '"Don\u2019t go," she said. Utilize leverage. It is what it is. 5\'10" tall. A lot of ALOT.',
    "He couldn\u2019t stop. They don't care. Isn\u2019t it? In order to win we utilize the realm.",
  ];
  for (const lang of ["en-US", "en-GB"]) {
    for (const g of P.Genres.REGISTRY) {
      for (const text of docs) {
        const cx = ctxFor(g.value, { language: lang, extendedLocal: true, chkAI: true, styleGuideRef: "auto" });
        const norm = text.replace(/[\u2018\u2019]/g, "'");
        for (const s of P.Audit.run(text, cx).suggestions) {
          if (!s.replacementText || s.replacementText.startsWith("(")) continue;
          assert.ok(norm.includes(String(s.targetText).replace(/[\u2018\u2019]/g, "'")), `${g.id}/${lang}: ${s.ruleId} target "${s.targetText}"`);
        }
      }
    }
  }
});

test("PE-96: genre profile numbers are internally sane", () => {
  for (const p of P.Genres.REGISTRY) {
    const [lo, hi] = p.bands.dialogue;
    assert.ok(lo >= 0 && hi <= 100 && lo < hi, `${p.id} dialogue band`);
    assert.ok(p.bands.aslLow > 0 && p.bands.aslLow < p.bands.aslHigh && p.bands.aslHigh < 60, `${p.id} asl band`);
    assert.ok(p.longSentence.harsh > 15 && p.longSentence.harsh <= p.longSentence.normal && p.longSentence.normal <= 80, `${p.id} long sentence`);
    assert.ok(p.passiveCluster >= 2 && p.passiveCluster <= 12, `${p.id} passive`);
    assert.ok(p.fkSlack >= -2 && p.fkSlack <= 4, `${p.id} fkSlack`);
    assert.ok(p.longDialogueChars >= 40 && p.longDialogueChars <= 300, `${p.id} dialogue chars`);
    if (p.family === "fiction") {
      assert.ok(p.adverbPer1k > p.filterPer1k / 2 && p.adverbPer1k < 80, `${p.id} adverb`);
      assert.ok(p.filterPer1k >= 5 && p.filterPer1k <= 40, `${p.id} filter`);
      assert.ok(p.tagAdverbMax >= 1 && p.tagAdverbMax <= 10, `${p.id} tag adverbs`);
      assert.ok(p.rationale && p.aiNote && p.blurb, `${p.id} docs`);
    }
    for (const c of p.cliches) assert.equal(c, c.toLowerCase(), `${p.id} cliche must be lowercase: ${c}`);
    assert.equal(new Set(p.cliches).size, p.cliches.length, `${p.id} duplicate cliche`);
  }
  assert.equal(new Set(P.Genres.REGISTRY.map((p) => p.id)).size, P.Genres.REGISTRY.length);
  assert.equal(new Set(P.Genres.REGISTRY.map((p) => p.value)).size, P.Genres.REGISTRY.length);
});

test("PE-96: replacements keep the capital of a sentence-start target (In order to -> To)", () => {
  const cx = ctxFor("Business / Corporate Report", { language: "en-US" });
  const text = "In order to grow we cut costs. End result: profit. Prior to launch, we tested. We tested; the end result was good.";
  const sug = P.Audit.run(text, cx).suggestions.filter((s) => s.replacementText && !s.replacementText.startsWith("("));
  const by = (id) => sug.find((s) => s.ruleId.startsWith(id));
  assert.equal(by("sg:plain:in_order_to").replacementText, "To");
  assert.equal(by("sg:plain:prior_to").replacementText, "Before");
  const pleo = by("rep:pleo:end result");
  assert.ok(pleo && text.includes(pleo.targetText));
  assert.equal(pleo.replacementText.charAt(0), pleo.targetText.charAt(0) === pleo.targetText.charAt(0).toUpperCase() ? "R" : "r");
  const lower = P.Audit.run("We acted in order to win.", cx).suggestions.find((s) => s.ruleId.startsWith("sg:plain:in_order_to"));
  assert.equal(lower.replacementText, "to");
});

test("PE-96: contested doublets ('past experience', 'foreign imports', 'advance warning') are low-confidence only", () => {
  const cx = ctxFor("Non-Fiction / Memoir", { language: "en-US" });
  const r = P.Audit.run("From past experience, with advance warning, foreign imports rose.", cx).suggestions;
  assert.ok(!r.some((s) => s.ruleId.startsWith("rep:pleo:")));
  assert.ok(r.filter((s) => s.ruleId.startsWith("rep:soft:")).every((s) => s.confidence === "low"));
});

test("PE-96: near-identical names used equally often are a hint, a rare typo stays a fix", () => {
  const cx = ctxFor("Fiction (General)");
  const two = "Marian waved to Marion. Marion smiled and Marian laughed. Marian told Marion, and Marion frowned at Marian.";
  const s = P.Audit.run(two, cx).suggestions.filter((x) => x.ruleId.startsWith("prop:"));
  assert.ok(s.length >= 1);
  for (const x of s) {
    assert.equal(x.type, "preference");
    assert.equal(x.confidence, "low");
    assert.ok(x.replacementText.startsWith("("), "no auto-fix for two possible characters");
  }
  const typo = "Marcus ran. Marcus stopped. Marcus smiled. Marcus left. Marcus sat. Marcus ate. Marcus slept. Marcis spoke. Marcis nodded.";
  const t = P.Audit.run(typo, cx).suggestions.find((x) => x.ruleId.startsWith("prop:variant"));
  assert.ok(t && t.type === "confirmed" && t.targetText === "Marcis" && t.replacementText === "Marcus");
});

import { loadLibs } from "./load-lib.mjs";

test("PE-96: local rewrite keeps sentence capitals and never produces ungrammatical swaps", () => {
  const pe = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/local-rewrite.js"]);
  const R = pe.LocalRewrite;
  assert.equal(R.run("creative", "Suddenly, the door opened. Instantly she ran. He left. Without warning the lights died."), "The door opened. She ran. He left. The lights died.");
  assert.equal(R.run("creative", "He ran suddenly, then stopped."), "He ran suddenly, then stopped.");
  assert.equal(R.run("academic", "Very good results. I think it's really quite fine. It was very very bad."), "Good results. The analysis indicates it is fine. It was bad.");
  assert.equal(R.run("fluency", "In fact, he left. As a matter of fact, she stayed. It is, in fact, true."), "He left. She stayed. It is, true.");
  const f = R.run("formal", "It's a lot of money and a lot of cars. The plan was kind of odd. Kind of odd. I get it, I got up.");
  assert.ok(f.includes("a great deal of money"), f);
  assert.ok(f.includes("many cars"), f);
  assert.ok(f.includes("was somewhat odd"), f);
  assert.ok(f.includes("Kind of odd"), "ambiguous sentence-start phrase left alone: " + f);
  assert.ok(f.includes("I get it, I got up"), "polysemous get/got left alone: " + f);
  assert.ok(!/\bobtain/.test(f));
});

test("PE-96: 'analyses' (plural noun) is not a UK/US dialect mismatch, but 'analysed' still is under en-US", () => {
  const ids = (t, lang) => P.Audit.run(t, ctxFor("General Fiction", { language: lang })).suggestions.map((s) => s.ruleId);
  assert.ok(!ids("The sensitivity analyses gave similar results.", "en-US").includes("spell:dialect:analyse"));
  assert.ok(ids("She analysed the results carefully.", "en-US").includes("spell:dialect:analyse"));
});
