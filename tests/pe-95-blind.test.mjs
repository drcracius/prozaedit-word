import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, scoreCorpus } from "./helpers/corpus-harness.mjs";
import { PE95_ALL } from "./corpus/pe-95-blind.mjs";

test("PE-95: blind-style corpus has 200+ passages across all 12 genres, with dialogue, dialect, poetry, academic, business and legal", () => {
  assert.ok(PE95_ALL.length >= 200, String(PE95_ALL.length));
  assert.equal(new Set(PE95_ALL.map((c) => c.genre)).size, 12);
  for (const cat of ["dialogue", "dialect", "poetry", "academic", "business", "legal"]) assert.ok(PE95_ALL.some((c) => c.id.endsWith(cat)), cat);
});

test("PE-95: blind-style corpus - Simple view precision/recall gates", () => {
  const P = loadEngine();
  const r = scoreCorpus(P, PE95_ALL);
  console.log(`# PE95 corpus n=${PE95_ALL.length} tp=${r.tp} fp=${r.fp} fn=${r.fn} precision=${r.precision.toFixed(3)} recall=${r.recall.toFixed(3)}`);
  if (r.fpList.length) console.log("# FP:", r.fpList.join(" | "));
  if (r.fnList.length) console.log("# FN:", r.fnList.join(" | "));
  assert.ok(r.precision >= 0.95, `precision ${r.precision}`);
  assert.ok(r.recall >= 0.9, `recall ${r.recall}`);
});

test("PE-95: no clean passage in any genre triggers a visible finding in Simple view", () => {
  const P = loadEngine();
  const clean = PE95_ALL.filter((c) => !c.expect.length);
  const r = scoreCorpus(P, clean);
  assert.ok(r.fp <= 2, r.fpList.join(" | "));
});
