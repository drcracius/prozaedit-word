import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine, ctxFor, scoreCorpus } from "./helpers/corpus-harness.mjs";
import { buildCases, buildStressCases } from "./corpus/passages.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRECISION_GATE = 0.85;
const RECALL_GATE = 0.9;

const P = loadEngine();
const profiles = P.Genres.REGISTRY;
const all = [...buildCases(profiles), ...buildStressCases(profiles)];

test("corpus: every profile has clean, planted and stress cases", () => {
  for (const p of profiles) {
    assert.ok(all.some((c) => c.id === `${p.id}/clean`), p.id);
    assert.ok(all.some((c) => c.id === `${p.id}/planted`), p.id);
    assert.ok(all.filter((c) => c.genre === p.id && c.id.includes("stress")).length >= 4, p.id);
  }
});

test(`corpus gate: Simple-visible precision >= ${PRECISION_GATE}, recall >= ${RECALL_GATE} (all profiles)`, () => {
  const r = scoreCorpus(P, all);
  console.log(`# corpus ${all.length} cases tp=${r.tp} fp=${r.fp} fn=${r.fn} precision=${r.precision.toFixed(3)} recall=${r.recall.toFixed(3)}`);
  assert.ok(r.precision >= PRECISION_GATE, `precision ${r.precision.toFixed(3)} FPs: ${r.fpList.join("; ")}`);
  assert.ok(r.recall >= RECALL_GATE, `recall ${r.recall.toFixed(3)} FNs: ${r.fnList.join("; ")}`);
});

test("corpus gate: per-profile precision >= gate", () => {
  for (const p of profiles) {
    const r = scoreCorpus(P, all.filter((c) => c.genre === p.id));
    assert.ok(r.precision >= PRECISION_GATE, `${p.id} precision ${r.precision.toFixed(3)}: ${r.fpList.join("; ")}`);
  }
});

test("non-fiction profiles never run fiction-only checks (Non-Fiction is not Fiction)", () => {
  assert.equal(P.Genres.isFiction("Non-Fiction / Memoir"), false);
  assert.equal(P.Genres.isFiction("Fiction (Romance)"), true);
  const memoir = P.Audit.run("I walked home. I knew he would wait, and I knew she would not forgive me for it, and so I kept walking while he watched me from the window and she did not.\n\n".repeat(3), ctxFor("Non-Fiction / Memoir"));
  assert.ok(!memoir.suggestions.some((s) => /^(pov|plot|dlg|pace|mot|plaus):/.test(s.ruleId)));
});

test("hidden-in-Simple rules stay low confidence (repeated pair, pov hint, sparse senses)", () => {
  assert.equal(P.Audit.confidenceFor({ ruleId: "rep:pair:x y", type: "preference" }), "low");
  assert.equal(P.Audit.confidenceFor({ ruleId: "pov:slip:0", type: "preference" }), "low");
  assert.equal(P.Audit.confidenceFor({ ruleId: "sense:sparse", type: "preference" }), "low");
  assert.equal(P.Audit.confidenceFor({ ruleId: "spell:double_space", type: "confirmed" }), "high");
});

test("pov:slip ignores quoted dialogue; function-word pairs are not flagged as repetition", () => {
  const dlg = `Ana walked home alone that evening and thought about the letter. "I told you I would, and I meant it, my love," he said to her, and she said "I know, but I wish you had told me, I really do," and they both laughed in the dark.`;
  const r = P.Audit.run(dlg, ctxFor("Fiction (General)"));
  assert.ok(!r.suggestions.some((s) => s.ruleId.startsWith("pov:slip")));
  const rep = P.Audit.run("On the hill in the rain. In the barn on the hill in the dark.", ctxFor("Fiction (General)"));
  assert.ok(!rep.suggestions.some((s) => s.ruleId.startsWith("rep:pair")));
});

// ---- Perf budgets (generous: mocked host, loaded CI) ----
const SENTENCES = [
  "The rain kept falling on the old road and nobody on the bridge said a word about the river.",
  "\"We should leave before dark,\" Marta said, and he nodded without looking at her.",
  "She folded the letter twice and slipped it behind the clock where the dust had settled long ago.",
  "They waited near the harbour until the tide turned and the last of the boats drifted out to sea.",
];
function generate(words) {
  const paras = [];
  let n = 0, i = 0;
  while (n < words) {
    const para = [0, 1, 2, 3].map((k) => SENTENCES[(i + k) % SENTENCES.length]).join(" ");
    paras.push(para);
    n += para.split(/\s+/).length;
    i++;
  }
  return paras;
}

for (const [words, auditMs, indexMs] of [[10000, 2500, 3000], [50000, 7000, 8000], [100000, 12000, 15000]]) {
  test(`perf budget: ${words}-word fixture audit < ${auditMs}ms`, () => {
    const paras = generate(words);
    const text = paras.join("\n\n");
    const t0 = Date.now();
    const r = P.Audit.run(text.slice(0, 450000), ctxFor("Fiction (Thriller/Mystery/Crime)"));
    const dt = Date.now() - t0;
    console.log(`# perf audit ${words}w ${dt}ms`);
    assert.ok(r.suggestions.length <= 60);
    assert.ok(dt < auditMs, `audit took ${dt}ms`);
  });

  test(`perf budget: ${words}-word fixture index build < ${indexMs}ms (mocked host)`, async () => {
    const pe = (() => {
      const sandbox = { ProzaEdit: {}, AbortController, setTimeout, clearTimeout, Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } };
      sandbox.window = sandbox; sandbox.globalThis = sandbox;
      vm.createContext(sandbox);
      for (const n of ["long-operation-controller", "settings-store", "text-metrics", "proper-noun-analyse", "manuscript-overview", "continuity-guard", "scope-reader", "manuscript-context-index"]) {
        vm.runInContext(fs.readFileSync(path.join(root, `src/taskpane/lib/${n}.js`), "utf8"), sandbox);
      }
      return sandbox.ProzaEdit;
    })();
    const paras = generate(words);
    const texts = [];
    const headings = [];
    paras.forEach((p, i) => { if (i % 14 === 0) { headings.push(texts.length); texts.push(`Chapter ${headings.length}`); } texts.push(p); });
    const items = texts.map((text, i) => ({ text, styleBuiltIn: headings.includes(i) ? "Heading1" : "Normal", load() {} }));
    const context = { document: { body: { paragraphs: { items, load() {} } } }, async sync() {} };
    const t0 = Date.now();
    const index = await pe.ManuscriptContextIndex.buildFromDocument(context, { yieldFn: () => Promise.resolve(), dictionary: [], fiction: true });
    const dt = Date.now() - t0;
    console.log(`# perf index ${words}w ${dt}ms`);
    assert.ok(index && index.sections.length > 0);
    assert.ok(dt < indexMs, `index build took ${dt}ms`);
  });
}
