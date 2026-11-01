import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

async function settleClose(t) {
  await sleep(80);
  t.close();
}

test("PE-91: switching to non-fiction and back restores the fiction modules", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`document.getElementById("manuscriptType").value = "Fiction (General)"; adaptModules();`);
    t.el("mPlot").checked = true;
    t.el("mPacing").checked = false;
    t.el("manuscriptType").value = "Non-Fiction / Memoir";
    t.peval(`adaptModules()`);
    assert.equal(t.el("mPlot").checked, false);
    assert.equal(t.el("mPlot").disabled, true);
    t.el("manuscriptType").value = "Fiction (General)";
    t.peval(`adaptModules()`);
    assert.equal(t.el("mPlot").checked, true);
    assert.equal(t.el("mPacing").checked, false);
    assert.equal(t.el("mPlot").disabled, false);
  } finally {
    await settleClose(t);
  }
});

test("PE-91: index built under another fiction/non-fiction setting is reported stale (genre)", async () => {
  const MCI = loadLib("src/taskpane/lib/manuscript-context-index.js").ManuscriptContextIndex;
  const built = MCI.normalizeStored(MCI.mergeBuiltPayload({ paragraphTotal: 2, fiction: true, sections: [] }));
  assert.equal(built.fiction, true);
  const ctx = {
    document: { body: { paragraphs: { items: [{ text: "a", load() {} }, { text: "b", load() {} }], load() {} } } },
    sync: async () => {},
  };
  assert.equal((await MCI.checkFreshness(ctx, built, { fiction: false })).reason, "genre");
  assert.equal((await MCI.checkFreshness(ctx, built, { fiction: true })).state, "fresh");
  assert.equal((await MCI.checkFreshness(ctx, built)).state, "fresh");
  assert.match(MCI.formatStaleReason({ state: "stale", reason: "genre" }), /genre/);
});

test("PE-91: audit options are snapshotted at run start (genre change mid-read cannot mix)", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.el("manuscriptType").value = "Fiction (General)";
    t.peval(`auditCtxSnapshot = buildAuditContext({})`);
    t.el("manuscriptType").value = "Non-Fiction / Memoir";
    assert.equal(t.peval(`buildAuditContext({ extendedLocal: true }).manuscriptType`), "Fiction (General)");
    assert.equal(t.peval(`buildAuditContext({ extendedLocal: true }).extendedLocal`), true);
    t.peval(`auditCtxSnapshot = null`);
    assert.equal(t.peval(`buildAuditContext({}).manuscriptType`), "Non-Fiction / Memoir");
  } finally {
    await settleClose(t);
  }
});

test("PE-91: a double click opens only one AI confirm dialog", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    let shown = 0;
    let release;
    t.window.ProzaEdit.ConfirmDialog.show = () => {
      shown++;
      return new Promise((r) => (release = r));
    };
    const first = t.peval(`aiConfirmOnce({ message: "x" })`);
    const second = await t.peval(`aiConfirmOnce({ message: "x" })`);
    assert.equal(second, false);
    assert.equal(shown, 1);
    release(true);
    assert.equal(await first, true);
    const third = t.peval(`aiConfirmOnce({ message: "y" })`);
    release(false);
    assert.equal(await third, false);
    assert.equal(shown, 2);
  } finally {
    await settleClose(t);
  }
});

test("PE-91: leaving the Coach tab stops dictation", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`window.__stopped = 0; recognition = { stop() { window.__stopped++; } }; isRecording = true;`);
    t.peval(`showTab("tab1")`);
    assert.equal(t.peval(`isRecording`), false);
    assert.equal(t.window.__stopped, 1);
  } finally {
    await settleClose(t);
  }
});

test("PE-91: Apply keeps the audit excerpt in step with the document", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["alpha beta gamma"] } });
  try {
    t.peval(`lastAuditExcerpt = "alpha beta gamma"; currentAuditSuggestions = [];`);
    t.peval(`swapTextInScope = async () => ({ occurrences: 1 })`);
    assert.equal(await t.peval(`applyFix("a", "beta", "delta")`), true);
    assert.equal(t.peval(`lastAuditExcerpt`), "alpha delta gamma");
  } finally {
    await settleClose(t);
  }
});

test("PE-91: muting a rule reports a failed document save", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`currentAuditSuggestions = [{ id: "a", ruleId: "r:a", type: "preference", module: "M", explanation: "e", targetText: "alpha", replacementText: "(x)", confidence: "high" }]`);
    t.mock.state.settingsFail = true;
    await t.peval(`muteRule(currentAuditSuggestions[0])`);
    assert.match(t.el("peStatus").textContent, /could not save/i);
    const Settings = t.window.ProzaEdit.Settings;
    t.mock.state.settingsFail = false;
    assert.equal(await Settings.muteRule("r:b"), true);
  } finally {
    await settleClose(t);
  }
});

test("PE-91: overlapping scope-count refreshes: only the latest result is shown", async () => {
  const t = await bootTaskpane({ word: { selection: "aaaaaaaaaa" } });
  try {
    t.peval(`window.__shown = []; updateScopeCharPreviewDisplay = (len) => window.__shown.push(len);`);
    let gate;
    let calls = 0;
    t.mock.state.syncHook = async () => {
      calls++;
      if (calls === 1) await new Promise((r) => (gate = r));
    };
    const slow = t.peval(`refreshScopeCharPreview()`);
    await waitFor(() => gate, { message: "first sync held" });
    t.mock.state.selection = "bb";
    await t.peval(`refreshScopeCharPreview()`);
    gate();
    await slow;
    assert.equal(JSON.stringify(t.window.__shown), "[2]");
  } finally {
    await settleClose(t);
  }
});

test("PE-91: selected-chapter read lists paragraphs once, not once per chapter", async () => {
  const SR = loadLib("src/taskpane/lib/scope-reader.js", { Word: { Style: { heading1: "H1", heading2: "H2", heading3: "H3" } } }).ScopeReader;
  let loads = 0;
  const items = [];
  for (let i = 0; i < 6; i++) items.push({ text: i % 2 ? "body" : `Ch${i}`, styleBuiltIn: "Normal", load() {} });
  const ctx = {
    document: { body: { paragraphs: { items, load() { loads++; } } } },
    sync: async () => {},
  };
  const chapters = [0, 1, 2].map((k) => ({ index: k + 1, title: `Ch${k * 2}`, startPara: k * 2, endPara: k * 2 + 1 }));
  const res = await SR.readBySelectedChapters(ctx, [1, 2, 3], chapters, {});
  assert.match(res.text, /Ch4/);
  assert.equal(loads, 1);
  await assert.rejects(() => SR.readBySelectedChapters(ctx, [1, 2, 3], chapters, { maxChars: 5 }), /exceed/);
});
