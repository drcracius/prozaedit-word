// PE-95 skeptical re-audit of PE-93..95 changes in the pane (jsdom + Word mock).
import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";

const GENRES = [
  "Fiction (General)", "Fiction (Romance)", "Fiction (Mystery/Crime)", "Fiction (Thriller/Mystery/Crime)",
  "Fiction (Fantasy)", "Fiction (Science Fiction)", "Fiction (Literary/Drama)", "Fiction (Historical)",
  "Non-Fiction / Memoir", "Academic Paper / Journal", "Business / Corporate Report", "Technical / Journalism",
];
const BASE = [
  "She walked into the room and looked at the window, thinking of March 3rd, 1998 (Smith, 2004).",
  "\"I don't know,\" he said very quickly. Then, the next day, they left for Paris.",
  "Her heart skipped a beat; it was a dark night and the the rain fell on Marcus and Elena.",
  "Chapter text goes on and on, with many words to fill the page and make it long.",
];
function bigDoc(n, per = 300) {
  const paras = [], headings = [];
  for (let i = 0; i < n; i++) {
    if (i % per === 0) { headings.push(paras.length); paras.push("Chapter " + (i / per + 1)); }
    paras.push(BASE[i % 4] + " " + BASE[(i + 1) % 4]);
  }
  return { paras, headings };
}
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

test("PE-95: full local audit x 12 genres x Simple/Advanced, no script errors, Simple <= Advanced", async () => {
  const d = bigDoc(12, 6);
  for (const g of GENRES) {
    const counts = [];
    for (const simple of [true, false]) {
      const t = await boot(d, g);
      try {
        t.el("simpleMode").checked = simple;
        t.el("simpleMode").dispatchEvent(new t.window.Event("change"));
        await run(t, "btnRunAudit");
        counts.push(t.peval("currentAuditSuggestions.length"));
        assert.deepEqual(t.errors.map((e) => String(e && e.message)), [], g);
      } finally { await sleep(30); t.close(); }
    }
    assert.ok(counts[0] <= counts[1], `${g}: simple ${counts[0]} advanced ${counts[1]}`);
  }
});

test("PE-95: pane Apply reports tracked vs plain correctly and never records undo for tracked edits", async () => {
  for (const [mode, tracked] of [["Off", false], ["TrackAll", true], [undefined, false]]) {
    const t = await boot({ paras: ["She said hello to him."], headings: [] }, "Fiction (General)");
    try {
      t.state.trackingMode = mode;
      const r = await t.peval("swapTextInScope('said', 'told', { forceDocument: true })");
      assert.equal(!!(r && r.tracked), tracked, String(mode));
    } finally { t.close(); }
  }
  const t = await boot({ paras: ["She said hello to him."], headings: [] }, "Fiction (General)");
  try {
    t.state.apiMax = 1.3;
    t.state.trackingMode = "TrackAll";
    const r = await t.peval("swapTextInScope('said', 'told', { forceDocument: true })");
    assert.equal(!!(r && r.tracked), false, "WordApi 1.4 missing: behaves as before, no crash");
  } finally { t.close(); }
});

test("PE-95: 300k-word index rebuild - second build reuses chapters, equals first, within budget; cancel keeps cache valid", async () => {
  const d = bigDoc(9000);
  const t = await boot(d, "Fiction (General)");
  try {
    let t0 = Date.now();
    await run(t, "btnBuildManuscriptContext");
    const first = t.peval("JSON.stringify({ ...getManuscriptContextIndex(), builtAt: '' })");
    assert.ok(Date.now() - t0 < 20000);
    assert.ok(t.peval("mciDerivedCache.map.size") >= 30);
    t0 = Date.now();
    await run(t, "btnBuildManuscriptContext");
    const second = t.peval("JSON.stringify({ ...getManuscriptContextIndex(), builtAt: '' })");
    assert.equal(second, first);
    assert.ok(Date.now() - t0 < 20000);
    let n = 0;
    t.state.syncHook = async () => { if (++n === 3) t.click("btnCancelLongOp"); };
    await run(t, "btnBuildManuscriptContext");
    t.state.syncHook = null;
    await run(t, "btnBuildManuscriptContext");
    assert.equal(t.peval("JSON.stringify({ ...getManuscriptContextIndex(), builtAt: '' })"), first);
    assert.deepEqual(t.errors, []);
  } finally { await sleep(80); t.close(); }
});

test("PE-95: index build with browser storage throwing still completes and cache stays in memory", async () => {
  const d = bigDoc(600);
  const t = await bootTaskpane({
    word: { paragraphs: d.paras, headings: d.headings },
    keepDefaultScope: true,
    mutateWindow(w) {
      const boom = () => { throw new Error("blocked"); };
      Object.defineProperty(w, "localStorage", { get: boom });
      Object.defineProperty(w, "sessionStorage", { get: boom });
    },
  });
  try {
    await run(t, "btnBuildManuscriptContext");
    assert.match(t.status(), /outline ready/i);
    assert.ok(t.peval("mciDerivedCache.map.size") > 0);
  } finally { await sleep(50); t.close(); }
});

test("PE-95: pane records undo only for untracked Apply and says so in plain words when tracked", async () => {
  for (const [mode, expectUndo, msg] of [["Off", true, /Applied: Fix/], ["TrackAll", false, /tracked change.*Review tab/i]]) {
    const t = await boot({ paras: ["She said hello to him."], headings: [] }, "Fiction (General)");
    try {
      t.state.trackingMode = mode;
      t.peval("ProzaEdit.EditHistory._undo.length = 0");
      t.el("confirmBeforeApply").checked = false;
      assert.equal(await t.peval("applyDocumentEdit('said', 'told', 'Fix', { forceDocument: true })"), true);
      assert.equal(t.peval("ProzaEdit.EditHistory.canUndo()"), expectUndo, String(mode));
      assert.match(t.status(), msg);
    } finally { await sleep(30); t.close(); }
  }
});
