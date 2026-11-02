// PE-99: non-fiction long-sentence and passive-voice cards. Corpus gate: Simple precision >= 0.85, recall >= 0.9.
import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, ctxFor, scoreCorpus } from "./helpers/corpus-harness.mjs";

const P = loadEngine();
const ACTIVE = "The team measured the result and wrote down what it meant for the next step. ";
const words = (n) => Array.from({ length: n }, (_, i) => (i % 9 === 8 ? "and" : "word" + String.fromCharCode(97 + (i % 26)))).join(" ");
const longSentence = (n) => `The committee considered ${words(n)}.`;
const passives = (n) => Array.from({ length: n }, (_, i) => `The sample${i} was collected on day ${i}.`).join(" ");
const pad = ACTIVE.repeat(6);

const GENRES = ["nonfiction-memoir", "academic", "business", "technical-journalism"];
const limit = (id) => P.Genres.REGISTRY.find((g) => g.id === id);

const cases = [];
for (const g of GENRES) {
  const pr = limit(g);
  const normal = pr.longSentence.normal;
  const lim = pr.passiveCluster + 2;
  cases.push(
    { id: `${g}-plant-long`, genre: g, text: pad + longSentence(Math.ceil(normal * 1.7)), expect: ["nf:long"] },
    { id: `${g}-plant-passive`, genre: g, text: passives(Math.ceil(lim * 1.6)) + " " + pad, expect: ["nf:passive"] },
    { id: `${g}-clean-short`, genre: g, text: pad + "Short sentences read well. " + pad, expect: [] },
    { id: `${g}-clean-below-limit`, genre: g, text: pad + longSentence(normal - 8), expect: [] },
    { id: `${g}-clean-few-passives`, genre: g, text: passives(3) + " " + pad, expect: [] },
    { id: `${g}-clean-adjectival`, genre: g, text: pad + Array.from({ length: 20 }, () => "She was tired and he was excited and they were pleased.").join(" "), expect: [] },
    { id: `${g}-clean-borderline-long`, genre: g, text: pad + longSentence(Math.ceil(normal * 1.2)), expect: [] },
  );
}

test("PE-99: corpus gate - non-fiction clarity cards, Simple precision >= 0.85 and recall >= 0.9", () => {
  const r = scoreCorpus(P, cases, {}, { only: ["nf:"] });
  console.log(`# PE99 n=${cases.length} tp=${r.tp} fp=${r.fp} fn=${r.fn} precision=${r.precision.toFixed(3)} recall=${r.recall.toFixed(3)}`);
  assert.ok(r.tp >= 8);
  assert.ok(r.precision >= 0.85, r.fpList.join(" | "));
  assert.ok(r.recall >= 0.9, r.fnList.join(" | "));
});

test("PE-99: cards are preference severity; borderline ones are low confidence (hidden in Simple)", () => {
  for (const g of GENRES) {
    const normal = limit(g).longSentence.normal;
    const cx = ctxFor(P.Genres.REGISTRY.find((x) => x.id === g).value);
    const border = P.Audit.run(pad + longSentence(Math.ceil(normal * 1.2)), cx).suggestions.find((s) => s.ruleId.startsWith("nf:long"));
    assert.ok(border, g);
    assert.equal(border.type, "preference");
    assert.equal(border.confidence, "low");
    const strong = P.Audit.run(pad + longSentence(Math.ceil(normal * 1.7)), cx).suggestions.find((s) => s.ruleId.startsWith("nf:long"));
    assert.equal(strong.type, "preference");
    assert.equal(strong.confidence, "medium");
  }
});

test("PE-99: quoted target exists verbatim, muting works, fiction genres do not get nf: cards", () => {
  const g = P.Genres.REGISTRY.find((x) => x.id === "business");
  const text = pad + longSentence(120);
  const r = P.Audit.run(text, ctxFor(g.value)).suggestions.find((s) => s.ruleId.startsWith("nf:long"));
  assert.ok(text.includes(r.targetText));
  assert.equal(P.Audit.run(text, ctxFor(g.value, { mutedRules: ["nf:long:1"] })).suggestions.some((s) => s.ruleId === "nf:long:1"), false);
  assert.equal(P.Audit.run(text, ctxFor(g.value, { chkSpell: false })).suggestions.some((s) => s.ruleId.startsWith("nf:")), false);
  const fic = P.Genres.REGISTRY.find((x) => x.id === "general-fiction");
  assert.equal(P.Audit.run(passives(30) + text, ctxFor(fic.value)).suggestions.some((s) => s.ruleId.startsWith("nf:")), false);
});
