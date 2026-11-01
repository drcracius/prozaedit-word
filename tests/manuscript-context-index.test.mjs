import test from "node:test";
import assert from "node:assert/strict";
import { loadLibs } from "./load-lib.mjs";

function loadMci() {
  return loadLibs(
    [
      "src/taskpane/lib/proper-noun-analyse.js",
      "src/taskpane/lib/text-metrics.js",
      "src/taskpane/lib/manuscript-overview.js",
      "src/taskpane/lib/continuity-guard.js",
      "src/taskpane/lib/scope-reader.js",
      "src/taskpane/lib/manuscript-context-index.js",
    ],
    { Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } }
  );
}

test("ManuscriptContextIndex staleness uses paragraph count hash", () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const index = {
    version: 1,
    builtAt: new Date().toISOString(),
    paragraphCountHash: "p120",
    paragraphTotal: 120,
    summary: "ok",
    sections: [],
    nameSeeds: [],
  };
  assert.equal(MCI.isFresh(index, 120), true);
  assert.equal(MCI.isStale(index, 121), true);
  assert.equal(MCI.paragraphCountHash(120), "p120");
});

test("ManuscriptContextIndex summary cap and inject helper", () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const sections = Array.from({ length: 40 }, (_, i) => ({
    index: i + 1,
    title: `Chapter ${i + 1}`,
    wordCount: 900,
    povHint: "third-person",
    firstSnippet: "Opening line with enough words here.",
    lastSnippet: "Closing beat for the section.",
  }));
  const summary = MCI.buildRollingSummary(sections, "Arc: test", 8000);
  assert.ok(summary.length <= 8000);
  const index = MCI.mergeBuiltPayload({
    sections: sections.slice(0, 5),
    sampleText: "Alice met Bob in Austin. Years later they returned.",
    paragraphTotal: 400,
    truncated: false,
    fiction: true,
    dictionary: ["Alice"],
  });
  assert.ok(index.nameSeeds.length >= 1);
  const block = MCI.injectPromptBlock(index, { paragraphTotal: 400, scopeMode: "selected-chapters" });
  assert.match(block, /Full-manuscript context/);
  assert.match(block, /Alice|Bob|Austin/i);
});

test("ManuscriptContextIndex trimForStorage and continuityAugment", () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const huge = MCI.mergeBuiltPayload({
    sections: Array.from({ length: 100 }, (_, i) => ({
      index: i + 1,
      title: `S${i}`,
      wordCount: 1000,
      firstSnippet: "x".repeat(120),
      lastSnippet: "y".repeat(120),
    })),
    sampleText: "Name One and Name Two",
    paragraphTotal: 8000,
    truncated: true,
    fiction: false,
    dictionary: [],
  });
  const trimmed = MCI.trimForStorage(huge, 4000);
  assert.ok(trimmed);
  assert.ok(MCI.estimateJsonChars(trimmed) <= 4200);
  const aug = MCI.continuityAugment({ topNames: [{ name: "Zed", count: 2 }], lowerSample: "" }, trimmed);
  assert.ok(aug.topNames.some((n) => n.name === "Zed"));
});

test("ManuscriptContextIndex buildFromDocument cancel mid-build (mock)", async () => {
  const { ManuscriptContextIndex: MCI, ScopeReader } = loadMci();
  const paraTexts = [];
  for (let c = 0; c < 3; c++) {
    paraTexts.push(`Chapter ${c + 1}`);
    for (let p = 0; p < 30; p++) paraTexts.push(`Body paragraph ${c}-${p} with sample prose.`);
  }
  let batch = 0;
  const items = paraTexts.map((text) => ({
    text,
    styleBuiltIn: null,
    load() {},
  }));
  items[0].styleBuiltIn = "Heading1";
  items[31].styleBuiltIn = "Heading1";
  items[62].styleBuiltIn = "Heading1";

  const context = {
    document: {
      body: {
        paragraphs: {
          items,
          load() {},
        },
      },
    },
    sync: async () => {
      batch += 1;
      if (batch >= 2) {
        const err = new Error("Cancelled.");
        err.code = "PE_CANCELLED";
        throw err;
      }
    },
  };

  await assert.rejects(
    () =>
      MCI.buildFromDocument(context, {
        cancelCheck: () => {
          if (batch >= 2) {
            const err = new Error("Cancelled.");
            err.code = "PE_CANCELLED";
            throw err;
          }
        },
        yieldFn: () => Promise.resolve(),
        dictionary: [],
        fiction: true,
      }),
    (e) => e.code === "PE_CANCELLED" || e.message === "Cancelled."
  );

  assert.ok(ScopeReader.planParagraphBatches(paraTexts.length, 40).length >= 2);
});

// ---- PE-82: checkpoint / resume ----
function cancelErr() {
  const e = new Error("Cancelled.");
  e.code = "PE_CANCELLED";
  return e;
}
function makeDoc(texts, headingIdx = []) {
  const items = texts.map((text, i) => ({ text, styleBuiltIn: headingIdx.includes(i) ? "Heading1" : null, load() {} }));
  let syncs = 0;
  const writes = { n: 0 };
  const context = {
    document: { body: { paragraphs: { items, load() {} } } },
    sync: async () => { syncs++; },
  };
  return { items, context, writes, get syncs() { return syncs; } };
}
function bookTexts(chapters = 5, per = 40) {
  const t = [], h = [];
  for (let c = 0; c < chapters; c++) {
    h.push(t.length);
    t.push(`Chapter ${c + 1}`);
    for (let p = 0; p < per; p++) t.push(`Alice walked in Austin ${c}-${p}. She said hello to Bob.`);
  }
  return { t, h };
}
const baseOpts = (extra) => ({ yieldFn: () => Promise.resolve(), dictionary: [], fiction: true, ...extra });
async function cancelAfter(MCI, doc, store, nBatches) {
  let done = 0;
  await assert.rejects(
    () => MCI.buildFromDocument(doc.context, baseOpts({
      checkpointStore: store,
      cancelCheck: () => { if (done >= nBatches) throw cancelErr(); },
      onProgress: () => { done++; },
    })),
    (e) => e.code === "PE_CANCELLED"
  );
}

test("resume: cancel keeps completed batches and resume reuses them, result equals clean build", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const { t, h } = bookTexts();
  const clean = await MCI.buildFromDocument(makeDoc(t, h).context, baseOpts());
  const doc = makeDoc(t, h);
  const store = { state: null };
  await cancelAfter(MCI, doc, store, 2);
  assert.ok(store.state);
  assert.equal(store.state.nextBatch, 2);
  const loads = [];
  doc.items.forEach((it, i) => { it.load = (f) => { if (Array.isArray(f)) loads.push(i); }; });
  const resumedIdx = await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store }));
  assert.equal(store.state, null);
  assert.ok(loads.length > 0 && Math.min(...loads) >= 2 * MCI.PARAGRAPH_BATCH, "completed batches are not re-read");
  assert.equal(JSON.stringify(resumedIdx.sections), JSON.stringify(clean.sections));
  assert.equal(resumedIdx.paragraphTotal, clean.paragraphTotal);
});

test("resume: discards on paragraph count, text hash, version and age mismatch", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const { t, h } = bookTexts();
  const mk = async () => {
    const doc = makeDoc(t, h);
    const store = { state: null };
    await cancelAfter(MCI, doc, store, 2);
    return { doc, store };
  };
  const cleanSections = JSON.stringify((await MCI.buildFromDocument(makeDoc(t, h).context, baseOpts())).sections);

  let { doc, store } = await mk();
  doc.items.push({ text: "Extra.", styleBuiltIn: null, load() {} });
  let r = await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store }));
  assert.equal(r.paragraphTotal, t.length + 1);

  ({ doc, store } = await mk());
  doc.items[0].text = "Edited heading";
  let seen = [];
  r = await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store, onProgress: (p) => seen.push(p.phase) }));
  assert.ok(!seen.includes("Resuming manuscript read"));
  assert.equal(r.sections[0].title, "Edited heading");

  ({ doc, store } = await mk());
  doc.items[MCI.PARAGRAPH_BATCH].text = "Changed at batch start";
  seen = [];
  await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store, onProgress: (p) => seen.push(p.phase) }));
  assert.ok(!seen.includes("Resuming manuscript read"));

  ({ doc, store } = await mk());
  store.state.version = 999;
  seen = [];
  r = await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store, onProgress: (p) => seen.push(p.phase) }));
  assert.ok(!seen.includes("Resuming manuscript read"));
  assert.equal(JSON.stringify(r.sections), cleanSections);

  ({ doc, store } = await mk());
  store.state.createdAt = Date.now() - MCI.CHECKPOINT_MAX_AGE_MS - 1000;
  seen = [];
  r = await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store, onProgress: (p) => seen.push(p.phase) }));
  assert.ok(!seen.includes("Resuming manuscript read"));
  assert.equal(JSON.stringify(r.sections), cleanSections);
});

test("resume: valid checkpoint reports resuming phase", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const { t, h } = bookTexts();
  const doc = makeDoc(t, h);
  const store = { state: null };
  await cancelAfter(MCI, doc, store, 1);
  const seen = [];
  await MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: store, onProgress: (p) => seen.push(p.phase) }));
  assert.equal(seen[0], "Resuming manuscript read");
});

test("resume: empty doc, single chapter, no store, corrupt state, error clears state", async () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const store = { state: null };
  await assert.rejects(() => MCI.buildFromDocument(makeDoc([]).context, baseOpts({ checkpointStore: store })), /empty/i);
  assert.equal(store.state, null);

  const one = await MCI.buildFromDocument(makeDoc(["Chapter 1", "Some prose here."], [0]).context, baseOpts({ checkpointStore: store }));
  assert.equal(one.paragraphTotal, 2);
  assert.equal(store.state, null);

  const { t, h } = bookTexts(2, 10);
  const noStore = await MCI.buildFromDocument(makeDoc(t, h).context, baseOpts());
  assert.ok(noStore.sections.length >= 1);

  for (const bad of [{}, { version: 1 }, "x", { version: 1, paragraphTotal: t.length, createdAt: Date.now(), nextBatch: 5, checks: [] }]) {
    const s = { state: bad };
    const r = await MCI.buildFromDocument(makeDoc(t, h).context, baseOpts({ checkpointStore: s }));
    assert.equal(r.paragraphTotal, t.length);
    assert.equal(s.state, null);
  }

  const doc = makeDoc(bookTexts().t, bookTexts().h);
  const s2 = { state: null };
  await cancelAfter(MCI, doc, s2, 1);
  const hasher = doc.items[MCI.PARAGRAPH_BATCH];
  Object.defineProperty(hasher, "text", { get() { throw new Error("boom"); } });
  await assert.rejects(() => MCI.buildFromDocument(doc.context, baseOpts({ checkpointStore: s2 })));
  assert.equal(s2.state, null);
});

test("resume: never writes to config/document and taskpane guards concurrent builds", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/taskpane/lib/manuscript-context-index.js", import.meta.url), "utf8");
  const start = src.indexOf("async buildFromDocument");
  const end = src.indexOf("diffSections(prev, next)");
  const body = src.slice(start, end);
  assert.ok(!/customXmlParts|settings\.set|localStorage|sessionStorage|insertText|\.insert\w*\(/.test(body));
  const tp = readFileSync(new URL("../src/taskpane/taskpane.js", import.meta.url), "utf8");
  assert.match(tp, /mciBuildBusy/);
  assert.match(tp, /checkpointStore: mciCheckpoint/);
});
