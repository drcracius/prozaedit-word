import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";
import { loadLibs } from "./load-lib.mjs";
import { PE90 } from "./corpus/pe-90-passages.mjs";

const P = loadEngine();
const G = P.Genres.REGISTRY;
const PER_RULE_GATE = 0.85;

function runAll(entries, { low = false, extra = {} } = {}) {
  const stat = new Map();
  const misses = [];
  const fps = [];
  for (const [g, cat, text, exp] of entries) {
    const profile = G.find((x) => x.id === g);
    const found = P.Audit.run(text, ctxFor(profile.value, extra)).suggestions.filter((s) => low || s.confidence !== "low");
    for (const s of found) {
      const hit = exp.some((e) => s.ruleId.startsWith(e));
      const key = s.ruleId.split(":").slice(0, 2).join(":");
      const e = stat.get(key) || { tp: 0, fp: 0 };
      e[hit ? "tp" : "fp"]++;
      stat.set(key, e);
      if (!hit) fps.push(`${g}/${cat}: ${s.ruleId}`);
    }
    for (const e of exp) if (!found.some((s) => s.ruleId.startsWith(e))) misses.push(`${g}/${cat}: ${e}`);
  }
  return { stat, misses, fps };
}

const SIMPLE = PE90.filter(([, cat]) => !cat.startsWith("adv-"));
const ADV = PE90.filter(([, cat]) => cat.startsWith("adv-"));

test("PE-90 corpus: >= 150 distinct passages, every genre represented", () => {
  assert.ok(new Set(PE90.map((e) => e[2])).size >= 150);
  for (const g of G) assert.ok(PE90.filter((e) => e[0] === g.id).length >= 10, g.id);
});

test(`PE-90 Simple view: per-rule precision >= ${PER_RULE_GATE}, planted recall 100%`, () => {
  const { stat, misses, fps } = runAll(SIMPLE);
  let tp = 0, fp = 0;
  for (const [rule, v] of stat) {
    tp += v.tp; fp += v.fp;
    const prec = v.tp / (v.tp + v.fp);
    assert.ok(prec >= PER_RULE_GATE, `${rule} precision ${prec.toFixed(2)} (${v.tp}/${v.tp + v.fp})`);
  }
  console.log(`# pe-90 simple tp=${tp} fp=${fp} precision=${(tp / (tp + fp)).toFixed(3)} planted-misses=${misses.length}`);
  assert.deepEqual(fps, []);
  assert.deepEqual(misses, []);
});

test("PE-90 Advanced view (low confidence included, all optional passes on): planted found, no cards on clean text", () => {
  const { misses } = runAll(ADV, { low: true });
  assert.deepEqual(misses, []);
  const clean = PE90.filter((e) => e[3].length === 0);
  const { fps } = runAll(clean, { low: true, extra: { extendedLocal: true, chkAI: true, chkAIDetection: true } });
  // Advanced may show low-confidence hints; none may be a high/medium card (those are Simple-visible FPs).
  const visible = runAll(clean, { low: false, extra: { extendedLocal: true, chkAI: true, chkAIDetection: true } }).fps;
  assert.deepEqual(visible, []);
  assert.ok(fps.length < clean.length, "advanced hints stay sparse");
});

test("rep:pleo matches whole words only; idiomatic doublets are low and never auto-rewritten", () => {
  const a = (t) => P.Audit.run(t, ctxFor("Fiction (General)")).suggestions;
  assert.ok(!a("The friend resulting from it was kind.").some((s) => s.ruleId.startsWith("rep:pleo")));
  assert.ok(a("The end result was fine.").some((s) => s.ruleId === "rep:pleo:end result"));
  const soft = P.Audit.run("Each and every guest arrived, and the future plans were null and void.", ctxFor("Fiction (General)"), {}).suggestions;
  assert.ok(soft.filter((s) => s.ruleId.startsWith("rep:soft")).every((s) => s.confidence === "low"));
  assert.ok(!P.LexicalBanks.PLEONASMS.some(([t]) => ["whether or not", "each and every", "null and void", "future plans"].includes(t)));
});

test("genre clichés/spoilers/weak cues match whole words and report the document's own spelling", () => {
  const r = P.Audit.run("The vacuum absorbs sound. Her eyes were wide. She hadn\u2019t slept and little did she know it.", ctxFor("Fiction (Romance)"));
  assert.ok(!r.suggestions.some((s) => s.ruleId === "genre:cliche:orbs"));
  const sp = r.suggestions.find((s) => s.ruleId.startsWith("spoiler:"));
  assert.ok(sp && sp.targetText === "little did she know");
  const curly = P.Audit.run("\u201CShe let out a breath she didn\u2019t know she was holding,\u201D he said.", ctxFor("Fiction (General)")).suggestions.find((s) => s.ruleId.startsWith("genre:cliche"));
  assert.ok(curly && curly.targetText.includes("\u2019"), "target keeps the curly apostrophe so Word Find locates it");
});

test("acad:contraction detects curly apostrophes and targets the actual contraction", () => {
  const r = P.Audit.run("We don\u2019t claim generality. Results follow.", ctxFor("Academic Paper / Journal")).suggestions.find((s) => s.ruleId === "acad:contraction");
  assert.ok(r);
  assert.equal(r.targetText, "don\u2019t");
  assert.equal(r.replacementText, "do not");
});

test("spell:punct ignores spaced ellipses, decimals, emoticons; still flags real stray spaces", () => {
  const f = (t) => P.Audit.run(t, ctxFor("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("spell:punct"));
  assert.equal(f("Well . . . maybe. It cost .5 dollars :) and 3 : 1 odds.").length, 0);
  assert.equal(f("He left , quietly.").length, 1);
  assert.equal(f("He left ; she stayed.").length, 1);
});

test("dialect check: names, dialogue and sentence-medial capitals are not mismatches; real ones are", () => {
  const f = (t, lang = "en-US") => P.Audit.run(t, ctxFor("Fiction (General)", { language: lang })).suggestions.filter((s) => s.ruleId.startsWith("spell:dialect"));
  assert.equal(f("He visited the Pompidou Centre and the Ministry of Defence.").length, 0);
  assert.equal(f(`"The colour is wrong," she said.`).length, 0);
  assert.equal(f("The colour is wrong.").length, 1);
  assert.equal(f("Centre of mass is here.").length, 1);
  assert.equal(f("The color is wrong.", "en-GB").length, 1);
});

test("edit:dup1 skips grammatical doublings, runs of 3+ and line breaks; flags real typos", () => {
  const f = (t) => P.Audit.run(t, ctxFor("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("edit:dup"));
  assert.equal(f("He knew that that was wrong; she had had enough. Bye bye, no no no, nothing nothing nothing.").length, 0);
  assert.equal(f("Yes\n\nYes, she said.").length, 0);
  assert.equal(f("She went into the the kitchen.").length, 1);
});

test("edit:quote: multi-paragraph speech and inch marks are balanced; a real stray quote is flagged", () => {
  const f = (t) => P.Audit.run(t, ctxFor("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("edit:quote"));
  assert.equal(f(`"First paragraph of a long speech.\n\n"Second paragraph closes it."`).length, 0);
  assert.equal(f("He was 5'10\" tall and she was 5'4\" with a smile."). length, 0);
  assert.equal(f("\u201CFirst paragraph.\n\n\u201CSecond paragraph.\u201D").length, 0);
  assert.equal(f(`"I never meant to leave, she said, and turned away from the door.`).length, 1);
});

test("edit:split no longer treats every day / everyday, any one / anyone as inconsistent", () => {
  const f = (t) => P.Audit.run(t, ctxFor("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("edit:split"));
  assert.equal(f("Every day she wore an everyday coat. Anyone could see any one of them.").length, 0);
  assert.equal(f("It can not wait. It cannot wait either.").length, 1);
});

test("ai:voice: lone generic words are low; stacked template phrases are medium; muted for realm genres; Testament ignored", () => {
  const ctx = (g) => ctxFor(g, { chkAI: true });
  const one = P.Audit.run("The Old Testament was read aloud in the hall that morning, slowly.", ctx("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("ai:voice"));
  assert.equal(one.length, 0);
  const lone = P.Audit.run("A beacon burned on the hill.", ctx("Fiction (General)")).suggestions.find((s) => s.ruleId.startsWith("ai:voice"));
  assert.equal(lone.confidence, "low");
  const stacked = P.Audit.run("We delve into a tapestry; moreover, it is pivotal and robust.", ctx("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("ai:voice"));
  assert.ok(stacked.length >= 3 && stacked.every((s) => s.confidence === "medium"));
  assert.equal(P.Audit.run("The realm and its beacon and tapestry.", ctx("Fiction (Fantasy)")).suggestions.filter((s) => s.ruleId.startsWith("ai:voice")).length, 0);
});

test("dedupe keeps the highest-confidence card for the same target (low AI card must not hide house-style card)", () => {
  const r = P.Audit.run("Let us leverage synergy.", ctxFor("Business / Corporate Report", { chkAI: true }));
  assert.ok(r.suggestions.some((s) => s.ruleId === "biz:leverage" && s.confidence === "medium"));
});

test("confidence: plot:*, ai:detect, ext dashes/repeat and long sentences barely over the limit are low; Strunk/plain are low in fiction only", () => {
  assert.equal(P.Audit.confidenceFor({ ruleId: "plot:restroom", type: "preference" }), "low");
  assert.equal(P.Audit.confidenceFor({ ruleId: "ai:detect:uniform_sentences", type: "preference" }), "low");
  assert.equal(P.Audit.confidenceFor({ ruleId: "ext:emdash", type: "preference" }), "low");
  const fic = P.Audit.run("He did it in order to win.", ctxFor("Fiction (General)")).suggestions.find((s) => s.ruleId.startsWith("sg:plain"));
  assert.equal(fic.confidence, "low");
  const biz = P.Audit.run("He did it in order to win.", ctxFor("Business / Corporate Report")).suggestions.find((s) => s.ruleId.startsWith("sg:plain"));
  assert.equal(biz.confidence, "medium");
});

test("govuk spelling rules ignore the surnames Gray/Defense (case-sensitive)", () => {
  const r = P.Audit.run("Dorian Gray met Sir Defense Smith. The gray sky stayed.", ctxFor("Fiction (General)", { language: "en-GB" })).suggestions.filter((s) => s.ruleId.startsWith("sg:govuk:gray"));
  assert.equal(r.length, 1);
});

test("genre checks: embedded letters/prophecies with a colon are never high-confidence tense drift", () => {
  const past = "She walked to the window and looked out at the rain. The street was empty and the lamps were lit. He came in later, shook off his coat, and sat down without a word. She kept her eyes on the glass.\n\n";
  const t = past.repeat(3) + "The prophecy goes: when the river runs red, the king is dead. The crown falls and the dark comes. Nobody knows who rules then, and nobody sees the end.\n\n" + past;
  const d = P.Audit.run(t, ctxFor("Fiction (General)")).suggestions.filter((s) => s.ruleId.startsWith("tense:"));
  assert.ok(d.every((s) => s.confidence === "low"));
});

test("content notes: a character named Dick is not profanity", () => {
  const t = "Dick walked in. ".repeat(4) + "word ".repeat(220);
  const r = P.Audit.run(t, ctxFor("Fiction (General)", { contentNotes: true }));
  assert.ok(!r.suggestions.some((s) => s.ruleId === "content:profanity"));
});

// ---- ReDoS / pathological-input fuzz over every profile with every optional pass on ----
test("fuzz: pathological inputs (60k chars) finish quickly under all profiles (no regex blow-up)", () => {
  const N = 60000;
  const inputs = {
    spaces: "a" + " ".repeat(N) + "b", hyphen: "well-".repeat(N / 5), quotes: '"'.repeat(N), curly: "\u201C".repeat(N / 2),
    dots: ". ".repeat(N / 2), dotsp: " .".repeat(N / 2), nlq: '"a\n'.repeat(N / 3), words: "that that ".repeat(N / 9),
    longword: "a".repeat(N) + " " + "a".repeat(N), mixcase: "Abc Def ".repeat(N / 8), parens: "(".repeat(N), emdash: "\u2014".repeat(N),
  };
  for (const [name, t] of Object.entries(inputs)) {
    for (const g of G) {
      const cx = ctxFor(g.value, { extendedLocal: true, chkAI: true, chkAIDetection: true, contentNotes: true });
      const t0 = Date.now();
      P.Audit.run(t, cx);
      assert.ok(Date.now() - t0 < 4000, `${name}/${g.id} took ${Date.now() - t0}ms`);
    }
  }
});

// ---- local rewrite / shaper ----
test("local rewrite: contractions and phrases are whole-word and case-preserving", () => {
  const ns = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/local-rewrite.js"]);
  const LR = ns.LocalRewrite;
  assert.equal(LR.formal("The bandit's horse is fast. It's late."), "The bandit's horse is fast. It is late.");
  assert.equal(LR.formal("Don\u2019t go. I can't."), "Do not go. I cannot.");
  assert.equal(LR.fluency("He left the friend resulting. The end result was good."), "He left the friend resulting. The result was good.");
});

test("shaper: density pruning keeps 'rather than', and the sentence's capital", () => {
  const ns = loadLibs(["src/taskpane/lib/lexical-banks.js", "src/taskpane/lib/local-rewrite.js", "src/taskpane/lib/lexical-shaper.js"]);
  const out = ns.LexicalShaper.shape("Very quiet rooms are better. He chose tea rather than coffee. It was really cold.", "fluency", { complexity: 3, intensity: 3, density: 1 });
  assert.match(out, /rather than coffee/);
  assert.match(out, /^Quiet rooms/);
  assert.match(out, /was cold/);
});

// ---- manuscript context index: strengthened resume check ----
function loadMci() {
  return loadLibs(
    ["src/taskpane/lib/proper-noun-analyse.js", "src/taskpane/lib/text-metrics.js", "src/taskpane/lib/manuscript-overview.js", "src/taskpane/lib/continuity-guard.js", "src/taskpane/lib/scope-reader.js", "src/taskpane/lib/manuscript-context-index.js"],
    { Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } }
  );
}
function makeDoc(texts, headingIdx = []) {
  const items = texts.map((text, i) => ({ text, styleBuiltIn: headingIdx.includes(i) ? "Heading1" : null, load() {} }));
  return { items, context: { document: { body: { paragraphs: { items, load() {} } } }, sync: async () => {} } };
}
test("resume: an edit in the MIDDLE or END of a finished batch (8 sampled points per batch, not just the first paragraph) discards the checkpoint", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const t = [], h = [];
  for (let c = 0; c < 5; c++) {
    h.push(t.length);
    t.push(`Chapter ${c + 1}`);
    for (let p = 0; p < 40; p++) t.push(`Alice walked in Austin ${c}-${p}. She said hello to Bob.`);
  }
  const opts = (extra) => ({ yieldFn: () => Promise.resolve(), dictionary: [], fiction: true, ...extra });
  for (const offset of MCI.spreadIndexes(0, MCI.PARAGRAPH_BATCH - 1, MCI.CHECK_POINTS)) {
    const doc = makeDoc(t, h);
    const store = { state: null };
    let done = 0;
    await assert.rejects(() => MCI.buildFromDocument(doc.context, opts({ checkpointStore: store, cancelCheck: () => { if (done >= 2) { const e = new Error("Cancelled."); e.code = "PE_CANCELLED"; throw e; } }, onProgress: () => { done++; } })));
    assert.ok(store.state && store.state.nextBatch === 2);
    doc.items[offset].text = "Edited in the middle of a finished batch.";
    const seen = [];
    await MCI.buildFromDocument(doc.context, opts({ checkpointStore: store, onProgress: (p) => seen.push(p.phase) }));
    assert.ok(!seen.includes("Resuming manuscript read"), `offset ${offset} should discard`);
  }
});
