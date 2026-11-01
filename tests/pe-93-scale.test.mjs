// PE-93: 300k-word documents end to end in the Word mock, cancel at every stage, with time/memory budgets.
import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

const BASE = [
  "She walked into the room and looked at the window, thinking of March 3rd, 1998 (Smith, 2004).",
  "\"I don't know,\" he said very quickly. Then, the next day, they left for Paris.",
  "It was a dark night and the rain fell on Marcus and Elena, who had had enough.",
  "Chapter text goes on and on, with many words to fill the page and make it long.",
];
function bigDoc(n) {
  const paras = [];
  const headings = [];
  for (let i = 0; i < n; i++) {
    if (i % 300 === 0) {
      headings.push(paras.length);
      paras.push("Chapter " + (i / 300 + 1));
    }
    paras.push(BASE[i % 4] + " " + BASE[(i + 1) % 4]);
  }
  return { paras, headings };
}
const WORDS = (d) => d.paras.join(" ").split(/\s+/).length;

async function boot(d, genre, extra = {}) {
  const t = await bootTaskpane({ word: { paragraphs: d.paras, headings: d.headings, ...extra }, keepDefaultScope: true });
  t.el("manuscriptType").value = genre;
  t.el("manuscriptType").dispatchEvent(new t.window.Event("change"));
  return t;
}
async function run(t, id) {
  t.click(id);
  await sleep(30);
  if (!t.el("peLongOpWarningBanner").classList.contains("hidden")) t.click("btnLongOpContinue");
  await sleep(30);
  await waitFor(() => !t.peval("isOperationBusy()"), { timeout: 60000, interval: 20, message: id });
}
const HEAP = () => process.memoryUsage().heapUsed / 1e6;

test("PE-93: 300k-word fiction doc - index build, timeline and audit-refusal finish or refuse cleanly inside budgets", async () => {
  const d = bigDoc(9000);
  assert.ok(WORDS(d) >= 290000);
  const t = await boot(d, "Fiction (General)");
  try {
    const h0 = HEAP();
    let t0 = Date.now();
    await run(t, "btnBuildManuscriptContext");
    assert.match(t.status(), /context ready/i);
    assert.ok(Date.now() - t0 < 20000, "index build < 20 s");
    t0 = Date.now();
    await run(t, "btnScanTimeline");
    assert.match(t.status(), /exceeds character limit|Timeline scan complete/i, "whole-book timeline is refused cleanly or completes");
    assert.ok(Date.now() - t0 < 20000, "timeline < 20 s");
    t0 = Date.now();
    await run(t, "btnRunAudit");
    assert.match(t.status(), /exceeds character limit/i, "whole-book audit is refused, not attempted");
    assert.ok(Date.now() - t0 < 5000);
    assert.ok(HEAP() - h0 < 400, "heap growth < 400 MB");
    assert.deepEqual(t.errors, []);
  } finally {
    await sleep(80);
    t.close();
  }
});

test("PE-93: 300k-word academic doc - citation scan completes (opt-in) within budget", async () => {
  const d = bigDoc(9000);
  const t = await boot(d, "Academic Paper / Journal");
  try {
    t.el("chkCitationScan").checked = true;
    t.el("chkCitationScan").dispatchEvent(new t.window.Event("change"));
    const t0 = Date.now();
    await run(t, "btnScanCitations");
    assert.ok(Date.now() - t0 < 30000, "citation scan < 30 s");
    assert.ok(!/Opt in|only for/i.test(t.status()), t.status());
    assert.deepEqual(t.errors, []);
  } finally {
    await sleep(80);
    t.close();
  }
});

for (const [name, genre, btn, re] of [
  ["index build", "Fiction (General)", "btnBuildManuscriptContext", /cancel/i],
  ["timeline scan", "Fiction (General)", "btnScanTimeline", /cancel/i],
]) {
  test(`PE-93: cancel during ${name} on a large doc stops promptly, frees the pane and a rerun completes`, async () => {
    const d = bigDoc(name === "index build" ? 9000 : 1500);
    const t = await boot(d, genre);
    try {
      let syncs = 0;
      t.state.syncHook = async () => {
        syncs++;
        if (syncs === 3) t.click("btnCancelLongOp");
      };
      await run(t, btn);
      assert.match(t.status(), re, t.status());
      assert.ok(syncs < 40, `stopped early after cancel (syncs=${syncs})`);
      assert.equal(t.peval("isOperationBusy()"), false);
      t.state.syncHook = null;
      await run(t, btn);
      assert.match(t.status(), /ready|complete/i, t.status());
      assert.deepEqual(t.errors, []);
    } finally {
      await sleep(80);
      t.close();
    }
  });
}

test("PE-93: apply-all style double-space collapse on 5000 hits stays inside the safety cap and budget", async () => {
  const EA = loadLib("src/taskpane/lib/edit-apply.js").EditApply;
  const mk = (n) => {
    const items = Array.from({ length: n }, () => ({ text: "  ", load() {}, paragraphs: { getFirst: () => ({ text: "Ok  fine.", load() {} }) }, insertText() {} }));
    return { ctx: { sync: async () => {} }, deps: { replaceLocation: "Replace", searchScope: async () => items } };
  };
  let m = mk(5000);
  const t0 = Date.now();
  const r = await EA.collapseDoubleSpaces(m.ctx, m.deps, true);
  assert.equal(r.found, 5000);
  assert.ok(Date.now() - t0 < 2000);
  m = mk(5001);
  await assert.rejects(() => EA.collapseDoubleSpaces(m.ctx, m.deps, true), /too many/);
});
