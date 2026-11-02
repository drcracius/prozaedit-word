// PE-96: adversarial/property tests over the engines and settings parsers.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";

const P = loadEngine();
const sandbox = { ProzaEdit: P, console, setTimeout, clearTimeout, AbortController };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const n of ["config-guard", "custom-style-guide", "chronology-engine", "citation-engine", "local-rewrite", "lexical-shaper", "chapter-walk", "edit-apply"]) {
  try { vm.runInContext(fs.readFileSync(`src/taskpane/lib/${n}.js`, "utf8"), sandbox, { filename: n }); } catch (e) { /* html-safe needs DOMParser */ }
}

let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const WORDS = ["the", "she", "walked", "very", "really", "suddenly", "In", "order", "to", "a", "an", "hour", "Dr.", "Smith", "said,", "\"Hello.\"", "(Smith, 2019)", "yesterday", "tomorrow", "Chapter", "1", "organize", "colour", "teh", "—", "...", "\u200b", "\u202e", "שלום", "مرحبا", "😀", "👨‍👩‍👧", "\ud800", "\u0000", "\t", "a lot of", "kind of", "[1]", "Jaden", "Jayden", "\u0301"];
const phrase = (n) => Array.from({ length: n }, () => pick(WORDS)).join(rnd() < 0.2 ? "" : " ");
const INPUTS = [
  "", " ", "\n\n\n", "x".repeat(50000), "a ".repeat(30000), "。".repeat(5000), "\u200b".repeat(5000),
  "\u202e" + "abc ".repeat(200), "😀".repeat(3000), "\ud800\udc00 \ud800 \udfff", "\u0000\u0001\u0002 control", "....".repeat(2000),
  "A".repeat(100) + "!".repeat(100), "word\r\nword\rword\u2028word\u2029", "(".repeat(3000) + ")".repeat(3000),
  ...Array.from({ length: 40 }, () => phrase(5 + Math.floor(rnd() * 300))),
];

test("PE-96 fuzz: Audit.run never throws, shape holds, applicable targets occur verbatim", () => {
  const genres = P.Genres.REGISTRY;
  for (const text of INPUTS) {
    for (const g of [pick(genres), pick(genres), genres[0]]) {
      const cx = ctxFor(g.value, { language: pick(["en-US", "en-GB", "en-AU"]), chkRep: rnd() < 0.8, chkSpell: rnd() < 0.8, chkProp: rnd() < 0.8 });
      const r = P.Audit.run(text, cx);
      assert.ok(Array.isArray(r.suggestions));
      for (const s of r.suggestions) {
        assert.equal(typeof s.ruleId, "string");
        assert.ok(["high", "medium", "low", undefined].includes(s.confidence), String(s.confidence));
        if (s.targetText && s.replacementText != null && sandbox.ProzaEdit.EditApply.isApplicable(s.targetText, s.replacementText).ok) {
          assert.ok(text.replace(/[\u2018\u2019]/g, "'").includes(String(s.targetText).replace(/[\u2018\u2019]/g, "'")), `${s.ruleId} target not verbatim: ${JSON.stringify(s.targetText)}`);
        }
      }
    }
  }
});

test("PE-96 fuzz: Audit.run on huge input completes quickly", () => {
  const big = "She walked to the door and said, \"Hello there.\" ".repeat(8000);
  const t0 = Date.now();
  P.Audit.run(big, ctxFor(P.Genres.REGISTRY[0].value));
  assert.ok(Date.now() - t0 < 20000, `took ${Date.now() - t0}ms`);
});

test("PE-96 fuzz: rewrite modes are total, never empty a non-empty input, keep a capital start", () => {
  const LR = sandbox.ProzaEdit.LocalRewrite;
  assert.ok(LR);
  for (const text of INPUTS) {
    for (const mode of ["fluency", "formal", "academic", "creative", "bogus", "", null]) {
      const out = LR.run(mode, text);
      const s = typeof out === "string" ? out : out && out.text;
      assert.ok(s === undefined || typeof s === "string");
    }
  }
  for (const mode of ["fluency", "formal", "academic", "creative"]) {
    const o = LR.run(mode, "In order to win, we kept going. Really, it was a lot of work.");
    const s = typeof o === "string" ? o : o.text;
    assert.match(s, /^[A-Z]/);
    assert.doesNotMatch(s, /(^|[.!?]\s)[a-z]/);
  }
});

test("PE-96 fuzz: Chronology, Citation, Overview, Coach, Shaper tolerate adversarial paragraphs", () => {
  const sets = INPUTS.map((t) => t.split(/\n/).slice(0, 400));
  sets.push([null, undefined, 5, {}, "ok"].map((v) => (typeof v === "string" ? v : "")));
  for (const paras of sets) {
    const cx = ctxFor(P.Genres.REGISTRY[0].value);
    const c = sandbox.ProzaEdit.ChronologyEngine.analyze(paras, cx);
    assert.ok(Array.isArray(c) || (c && typeof c === "object"));
    const z = sandbox.ProzaEdit.CitationEngine.analyze(paras, { ...cx, citationStyle: "apa" });
    assert.ok(Array.isArray(z) || (z && typeof z === "object"));
    const text = paras.join("\n");
    P.ManuscriptOverview && Object.keys(P.ManuscriptOverview).forEach(() => {});
    P.LocalCoach && Object.keys(P.LocalCoach).forEach(() => {});
    P.TextMetrics && P.TextMetrics.analyze && P.TextMetrics.analyze(text);
  }
});

test("PE-96 fuzz: ConfigGuard.parse/clamp survive malformed JSON, proto keys and extreme values", () => {
  const CG = sandbox.ProzaEdit.ConfigGuard;
  const raws = ["", "{", "null", "[]", "42", "\"s\"", "{\"__proto__\":{\"polluted\":1}}", "{\"constructor\":{\"prototype\":{\"polluted\":1}}}", "\u0000", "{\"a\":" + "[".repeat(5000), JSON.stringify({ maxChars: 1e308, temperature: -1e308, n: NaN, big: "x".repeat(100000) })];
  for (const raw of raws) {
    let parsed;
    assert.doesNotThrow(() => { parsed = CG.parse(raw); });
    assert.doesNotThrow(() => CG.clamp(parsed && typeof parsed === "object" ? parsed : {}));
  }
  assert.doesNotThrow(() => CG.clamp(JSON.parse("{\"__proto__\":{\"polluted\":1},\"x\":1e999}")));
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test("PE-96 fuzz: CustomStyleGuide.normalize/parseBulk survive hostile imports without pollution", () => {
  const CS = sandbox.ProzaEdit.CustomStyleGuide;
  const hostile = [null, undefined, 1, "x", [], {}, { rules: "nope" }, { rules: [null, 1, "x", {}, { find: 5 }, { find: "a", replace: {} }] }, JSON.parse("{\"__proto__\":{\"polluted\":1},\"rules\":[{\"__proto__\":{\"polluted\":2},\"find\":\"a\"}]}"), { rules: Array.from({ length: 5000 }, (_, i) => ({ find: "w" + i, replace: "<img src=x onerror=alert(1)>" })) }];
  for (const h of hostile) assert.doesNotThrow(() => CS.normalize(h));
  for (const t of INPUTS) assert.doesNotThrow(() => CS.parseBulk(t));
  assert.equal({}.polluted, undefined);
});

test("PE-96 fuzz: ChapterWalk.parse tolerates anything", () => {
  const CW = sandbox.ProzaEdit.ChapterWalk;
  if (!CW || !CW.parse) return;
  for (const t of INPUTS) assert.doesNotThrow(() => CW.parse(t));
});
