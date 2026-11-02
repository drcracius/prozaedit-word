import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, scoreCorpus } from "./helpers/corpus-harness.mjs";
import { PE96_ALL } from "./corpus/pe-96-blind.mjs";

const P = loadEngine();

test("PE-96: third blind corpus has 250+ passages across all 12 genres and the new styles", () => {
  assert.ok(PE96_ALL.length >= 250, String(PE96_ALL.length));
  assert.equal(new Set(PE96_ALL.map((c) => c.genre)).size, 12);
  for (const cat of ["selfhelp", "travel", "screenplay", "ya", "translated", "esl", "truecrime", "cookbook", "technical", "essay"]) assert.ok(PE96_ALL.some((c) => c.id.endsWith(cat)), cat);
});

test("PE-96: third corpus - Simple view precision/recall gates", () => {
  const r = scoreCorpus(P, PE96_ALL);
  console.log(`# PE96 corpus n=${PE96_ALL.length} tp=${r.tp} fp=${r.fp} fn=${r.fn} precision=${r.precision.toFixed(3)} recall=${r.recall.toFixed(3)}`);
  if (r.fpList.length) console.log("# FP:", r.fpList.join(" | "));
  if (r.fnList.length) console.log("# FN:", r.fnList.join(" | "));
  assert.ok(r.precision >= 0.95, `precision ${r.precision}`);
  assert.ok(r.recall >= 0.9, `recall ${r.recall}`);
});

test("PE-96: per-genre, clean passages stay quiet in Simple view (at most 2% visible)", () => {
  const clean = PE96_ALL.filter((c) => !c.expect.length);
  const byGenre = new Map();
  for (const c of clean) (byGenre.get(c.genre) || byGenre.set(c.genre, []).get(c.genre)).push(c);
  let total = 0;
  for (const [g, cs] of byGenre) {
    const r = scoreCorpus(P, cs);
    total += r.fp;
    assert.ok(r.fp <= Math.ceil(cs.length * 0.05), `${g}: ${r.fpList.join(" | ")}`);
  }
  assert.ok(total <= Math.ceil(clean.length * 0.02), `total visible FPs ${total}`);
});
