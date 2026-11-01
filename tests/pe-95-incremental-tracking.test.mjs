import test from "node:test";
import assert from "node:assert/strict";
import { loadLibs, loadLib } from "./load-lib.mjs";

function loadMci() {
  return loadLibs(
    ["src/taskpane/lib/proper-noun-analyse.js", "src/taskpane/lib/text-metrics.js", "src/taskpane/lib/manuscript-overview.js", "src/taskpane/lib/continuity-guard.js", "src/taskpane/lib/scope-reader.js", "src/taskpane/lib/manuscript-context-index.js"],
    { Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } }
  );
}
function makeDoc(texts, headingIdx) {
  const items = texts.map((text, i) => ({ text, styleBuiltIn: headingIdx.includes(i) ? "Heading1" : null, load() {} }));
  return { items, context: { document: { body: { paragraphs: { items, load() {} } } }, sync: async () => {} } };
}
function book(chapters, per, tweak) {
  const t = [], h = [];
  for (let c = 0; c < chapters; c++) {
    h.push(t.length);
    t.push(`Chapter ${c + 1}`);
    for (let p = 0; p < per; p++) t.push(`Mara Quillon walked through Brightwater in ${1990 + c}, later that year she met Tomas Vell ${c}-${p}.`);
  }
  if (tweak) tweak(t);
  return { t, h };
}
const opts = (x) => ({ yieldFn: () => Promise.resolve(), dictionary: [], fiction: true, ...x });
const strip = (i) => JSON.stringify({ ...i, builtAt: "" });

test("PE-95: incremental rebuild equals a full rebuild and reuses unchanged chapters only", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const cache = { map: new Map() };
  const s1 = {};
  const a = book(6, 20);
  await MCI.buildFromDocument(makeDoc(a.t, a.h).context, opts({ derivedCache: cache, statsOut: s1 }));
  assert.deepEqual([s1.reused, s1.computed], [0, 6]);
  const b = book(6, 20, (t) => { t[3 * 21 + 5] = "Mara Quillon met Zelda Pruitt near Ormond in 2031 at dusk."; });
  const s2 = {};
  const inc = await MCI.buildFromDocument(makeDoc(b.t, b.h).context, opts({ derivedCache: cache, statsOut: s2 }));
  assert.deepEqual([s2.reused, s2.computed], [5, 1]);
  const full = await MCI.buildFromDocument(makeDoc(b.t, b.h).context, opts());
  assert.equal(strip(inc), strip(full));
  assert.ok(inc.nameSeeds.length > 0 && /2031/.test(inc.arcNotes));
});

test("PE-95: incremental result is identical when a chapter is deleted, added, or retitled; no cache falls back to full", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const cache = { map: new Map() };
  const a = book(5, 15);
  await MCI.buildFromDocument(makeDoc(a.t, a.h).context, opts({ derivedCache: cache }));
  for (const mut of [
    (t) => t.splice(16, 16),
    (t) => t.push("Chapter 6", "Zelda Pruitt arrived in 2044."),
    (t) => { t[0] = "Prologue"; },
  ]) {
    const b = book(5, 15, mut);
    const heads = b.t.map((x, i) => (/^(Chapter|Prologue)/.test(x) && x.length < 12 ? i : -1)).filter((i) => i >= 0);
    const inc = await MCI.buildFromDocument(makeDoc(b.t, heads).context, opts({ derivedCache: cache }));
    const full = await MCI.buildFromDocument(makeDoc(b.t, heads).context, opts());
    assert.equal(strip(inc), strip(full));
  }
  const plain = await MCI.buildFromDocument(makeDoc(a.t, []).context, opts({ derivedCache: cache }));
  const plainFull = await MCI.buildFromDocument(makeDoc(a.t, []).context, opts());
  assert.equal(strip(plain), strip(plainFull));
});

test("PE-95: cancel then resume with a cache still equals a clean full build; cache is bounded and corrupt cache degrades", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const a = book(8, 40);
  const doc = makeDoc(a.t, a.h);
  const store = { state: null };
  const cache = { map: new Map() };
  let n = 0;
  await assert.rejects(() => MCI.buildFromDocument(doc.context, opts({ checkpointStore: store, derivedCache: cache, cancelCheck: () => { if (n >= 2) { const e = new Error("c"); e.code = "PE_CANCELLED"; throw e; } }, onProgress: () => n++ })), (e) => e.code === "PE_CANCELLED");
  assert.equal(cache.map.size, 0);
  const resumed = await MCI.buildFromDocument(doc.context, opts({ checkpointStore: store, derivedCache: cache }));
  const full = await MCI.buildFromDocument(makeDoc(a.t, a.h).context, opts());
  assert.equal(strip(resumed), strip(full));
  const bad = await MCI.buildFromDocument(makeDoc(a.t, a.h).context, opts({ derivedCache: { map: "nope" } }));
  assert.equal(strip(bad), strip(full));
  const big = { map: new Map() };
  const many = book(MCI.DERIVED_CACHE_MAX + 5, 1);
  await MCI.buildFromDocument(makeDoc(many.t, many.h).context, opts({ derivedCache: big }));
  assert.ok(big.map.size <= MCI.DERIVED_CACHE_MAX);
});

function ctxWith(mode, text, tamper) {
  const doc = { load() {}, changeTrackingMode: mode };
  const hit = { text, load() {}, paragraphs: { getFirst: () => ({ text, load() {} }) }, insertText(t) { return { text: tamper ? tamper(t) : t, load() {}, paragraphs: { getFirst: () => ({ text: "x", load() {} }) } }; } };
  return { ctx: { document: doc, sync: async () => {} }, hit };
}
const EA = () => loadLib("src/taskpane/lib/edit-apply.js").EditApply;

test("PE-95: Apply detects Track Changes, stays correct when on, off, unsupported, or unreadable", async () => {
  const E = EA();
  for (const [mode, tracked] of [["Off", false], ["TrackAll", true], ["TrackMineOnly", true], ["Weird", false], [undefined, false]]) {
    const { ctx, hit } = ctxWith(mode, "said");
    const r = await E.swapText(ctx, "said", "told", { searchInScope: async () => [hit], replaceLocation: "Replace" });
    assert.equal(r.tracked, tracked, String(mode));
    assert.equal(r.verified, true);
  }
  const { ctx, hit } = ctxWith("TrackAll", "said");
  Object.defineProperty(ctx.document, "load", { value() { throw new Error("not supported"); } });
  assert.equal((await E.swapText(ctx, "said", "told", { searchInScope: async () => [hit], replaceLocation: "R" })).tracked, false);
  const u = ctxWith("TrackAll", "said");
  assert.equal(await E.detectTracking(u.ctx, { trackingSupported: false }), "unknown");
  assert.equal(await E.detectTracking({}, {}), "unknown");
});

test("PE-95: tracked Apply gives no undo anchors; a wrong result is still refused with Track Changes wording; off still strict", async () => {
  const E = EA();
  const a = ctxWith("TrackAll", "said");
  const r = await E.swapText(a.ctx, "said", "told", { searchInScope: async () => [a.hit], replaceLocation: "R", anchor: null });
  assert.equal(r.undoAnchor, null);
  const bad = ctxWith("TrackAll", "said", () => "something else");
  await assert.rejects(E.swapText(bad.ctx, "said", "told", { searchInScope: async () => [bad.hit], replaceLocation: "R" }), (e) => e.peApplyPhase === "uncertain" && /Track Changes/.test(e.message));
  const okTracked = ctxWith("TrackAll", "said", (t) => "said" + t);
  assert.equal((await E.swapText(okTracked.ctx, "said", "told", { searchInScope: async () => [okTracked.hit], replaceLocation: "R" })).verified, true);
  const strict = ctxWith("Off", "said", (t) => "said" + t);
  await assert.rejects(E.swapText(strict.ctx, "said", "told", { searchInScope: async () => [strict.hit], replaceLocation: "R" }), (e) => e.peApplyPhase === "uncertain");
});
