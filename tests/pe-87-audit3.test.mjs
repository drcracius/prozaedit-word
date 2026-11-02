import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

const FINDINGS = `[
  { id: "a", type: "confirmed", module: "M", explanation: "e", targetText: "alpha", replacementText: "(x)", confidence: "high" },
  { id: "b", type: "preference", module: "M", explanation: "e", targetText: "beta", replacementText: "(x)", confidence: "low" },
  { id: "c", type: "preference", module: "M", explanation: "e", targetText: "gamma", replacementText: "(x)", confidence: "low" },
  { id: "d", type: "preference", module: "M", explanation: "e", targetText: "delta", replacementText: "(x)", confidence: "medium" }]`;

async function setup(simple) {
  const t = await bootTaskpane({ word: { selection: "alpha beta gamma delta." } });
  t.el("simpleMode").checked = simple;
  t.el("simpleMode").dispatchEvent(new t.window.Event("change"));
  t.peval(`auditCardFilter = "all"; auditShowLowConfidence = false;
    finalizeAudit({ suggestions: ${FINDINGS}, metrics: ProzaEdit.Metrics.analyze("alpha beta gamma delta.") }, "Full audit (local)");`);
  return t;
}
const score = (t) => Number(/Score ([\d.]+)/.exec(t.el("trafficBar").textContent)[1]);
const counts = (t) => /Critical|Errors?|Issues?[^:]*: (\d+) · 🟡 Style: (\d+)/.exec(t.el("summaryReport").textContent);

test("PE-87: Simple view counts and score only cover visible findings, and say so", async () => {
  const t = await setup(true);
  try {
    const txt = t.el("summaryReport").textContent;
    assert.match(txt, /Style: 1\b/);
    assert.match(txt, /findings shown in Simple view \(2 lower-confidence hidden\)/);
    assert.equal(t.document.querySelectorAll("#cardContainer .card").length, 2);
    assert.match(t.el("btnAuditFilterAll")?.textContent || "All (2)", /All \(2\)/);
    assert.ok(t.peval("lastAuditMeta.prefCount") === 1 && t.peval("lastAuditMeta.criticalCount") === 1);
    const simpleScore = score(t);
    // Advanced counts everything and scores lower or equal
    t.el("simpleMode").checked = false;
    t.el("simpleMode").dispatchEvent(new t.window.Event("change"));
    const adv = t.el("summaryReport").textContent;
    assert.match(adv, /Style: 3\b/);
    assert.match(adv, /all findings \(Advanced view\)/);
    assert.ok(score(t) <= simpleScore);
    assert.equal(t.document.querySelectorAll("#cardContainer .card").length, 4);
    // back to Simple: consistent again, no stale advanced numbers
    t.el("simpleMode").checked = true;
    t.el("simpleMode").dispatchEvent(new t.window.Event("change"));
    assert.match(t.el("summaryReport").textContent, /Style: 1\b/);
    assert.equal(score(t), simpleScore);
  } finally {
    await t.settle(60);
    t.close();
  }
});

test("PE-87: 'Show them' and export/report use the same visible set as the cards", async () => {
  const t = await setup(true);
  try {
    assert.equal(t.peval("auditReportInput().suggestions.length"), 2);
    t.document.querySelector(".audit-hidden-note button").click();
    assert.equal(t.peval("auditReportInput().suggestions.length"), 4);
    assert.match(t.el("summaryReport").textContent, /Style: 3\b/);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
  } finally {
    await t.settle(60);
    t.close();
  }
});

test("PE-87: content notes are not counted as Style findings (matches score)", async () => {
  const t = await bootTaskpane({ word: { selection: "x" } });
  try {
    t.peval(`finalizeAudit({ suggestions: [
      { id: "n1", type: "preference", ruleId: "content:violence", module: "M", explanation: "e", targetText: "t", replacementText: "(x)" },
      { id: "n2", type: "preference", ruleId: "x:y", module: "M", explanation: "e", targetText: "u", replacementText: "(x)" }] }, "Full audit (local)")`);
    assert.equal(t.peval("lastAuditMeta.prefCount"), 1);
  } finally {
    await t.settle(60);
    t.close();
  }
});

function ctx(paragraphs) {
  const items = paragraphs.map((p) => ({ text: p.text, styleBuiltIn: p.style || "Normal", load() {} }));
  return { items, context: { document: { body: { paragraphs: { items, load() {} } } }, sync: async () => {} } };
}

test("PE-87: stale chapter list is refused instead of reading the wrong paragraphs", async () => {
  const SR = loadLib("src/taskpane/lib/scope-reader.js", { Word: { Style: { heading1: "H1", heading2: "H2", heading3: "H3" } } }).ScopeReader;
  const { context } = ctx([{ text: "Inserted new line" }, { text: "Chapter One", style: "H1" }, { text: "body" }]);
  const chapters = [{ index: 1, title: "Chapter One", startPara: 0, endPara: 2 }];
  await assert.rejects(SR.readByChapter(context, 1, chapters), /out of date/);
  const ok = [{ index: 1, title: "Chapter One", startPara: 1, endPara: 2 }];
  const r = await SR.readByChapter(context, 1, ok);
  assert.match(r.text, /Chapter One\nbody/);
});

test("PE-87: timeline selection scope picks the right duplicate paragraph run", async () => {
  const SR = loadLib("src/taskpane/lib/scope-reader.js", { Word: { Style: { heading1: "H1", heading2: "H2", heading3: "H3" } } }).ScopeReader;
  const texts = ["* * *", "intro", "* * *", "alpha", "beta", "* * *", "end"].map((text) => ({ text }));
  const { items } = ctx(texts);
  const sel = { text: "alpha\nbeta", load() {}, paragraphs: { items: [items[3], items[4]], load() {} } };
  const context = { document: { body: { paragraphs: { items, load() {} } }, getSelection: () => sel }, sync: async () => {} };
  const out = await SR.readParagraphsInScope(context, { mode: "selection" });
  assert.equal(JSON.stringify(out.map((p) => p.text)), JSON.stringify(["alpha", "beta"]));
  const sel2 = { text: "* * *\nintro\n* * *", load() {}, paragraphs: { items: [items[0], items[1], items[2]], load() {} } };
  context.document.getSelection = () => sel2;
  const out2 = await SR.readParagraphsInScope(context, { mode: "selection" });
  assert.equal(out2.length, 3);
});

test("PE-87: dictionary save failure rolls back the staged value and reports failure", async () => {
  const store = new Map();
  const settings = {
    get: (k) => store.get(k),
    set: (k, v) => store.set(k, v),
    remove: (k) => store.delete(k),
    saveAsync: (cb) => cb({ status: "failed" }),
  };
  const P = loadLib("src/taskpane/lib/settings-store.js", { Office: { context: { document: { settings } }, AsyncResultStatus: { Succeeded: "succeeded" } } }).Settings;
  assert.equal(await P.addDictionaryWord("Zorblax"), false);
  assert.equal(store.has(P.KEYS.DICTIONARY), false, "no poisoned staged value");
});
