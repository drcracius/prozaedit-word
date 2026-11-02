import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

function fakeCtx(texts) {
  const items = texts.map((t) => ({ text: t, styleBuiltIn: "Normal", load() {} }));
  const sel = { text: "", load() {}, paragraphs: { items: [], load() {} } };
  return {
    sel,
    document: { body: { paragraphs: { items, load() {} } }, getSelection: () => sel },
    sync: async () => {},
  };
}
const loadSR = () => loadLib("src/taskpane/lib/scope-reader.js", { globalThis: { Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } }, Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } }).ScopeReader;

test("PE-88: stale chapter list (paragraphs deleted) gives a reload message, not a TypeError", async () => {
  const SR = loadSR();
  const ctx = fakeCtx(["a", "b", "c"]);
  const chapters = [{ index: 1, title: "x", startPara: 0, endPara: 1 }, { index: 2, title: "y", startPara: 2, endPara: 9 }];
  for (const opts of [
    { mode: "chapter", chapterSingle: 2, chapters },
    { mode: "chapter-range", chapterFrom: 1, chapterTo: 2, chapters },
    { mode: "selected-chapters", selectedChapterIndices: [2], chapters },
  ]) {
    await assert.rejects(SR.readParagraphsInScope(ctx, opts), /out of date/);
  }
  const ok = await SR.readParagraphsInScope(ctx, { mode: "chapter", chapterSingle: 1, chapters });
  assert.equal(ok.length, 2);
});

test("PE-88: selection that cannot be located is an error, not the document start", async () => {
  const SR = loadSR();
  const ctx = fakeCtx(["first para", "second para"]);
  ctx.sel.text = "gone text";
  ctx.sel.paragraphs.items = [{ text: "vanished", load() {} }];
  await assert.rejects(SR.readParagraphsInScope(ctx, { mode: "selection" }), /locate your selection/);
});

test("PE-88: removeDictionaryWord / resetMutedRules roll back a failed save", async () => {
  const t = await bootTaskpane({ word: { settings: { PROZAEDIT_DICTIONARY: '["Aelwyn","Bryn"]', PROZAEDIT_MUTED_RULES: '["r1"]' } } });
  try {
    t.state.settingsFail = true;
    const ok1 = await t.peval(`ProzaEdit.Settings.removeDictionaryWord("Aelwyn")`);
    assert.equal(ok1, false);
    assert.deepEqual(JSON.parse(t.mock.settings.PROZAEDIT_DICTIONARY), ["Aelwyn", "Bryn"]);
    const ok2 = await t.peval(`ProzaEdit.Settings.resetMutedRules()`);
    assert.equal(ok2, false);
    assert.equal(t.mock.settings.PROZAEDIT_MUTED_RULES, '["r1"]');
    t.state.settingsFail = false;
    assert.equal(await t.peval(`ProzaEdit.Settings.removeDictionaryWord("Aelwyn")`), true);
    assert.deepEqual(JSON.parse(t.mock.settings.PROZAEDIT_DICTIONARY), ["Bryn"]);
  } finally {
    t.close();
  }
});

test("PE-88: a running manuscript-context build counts as busy; audit-start does not block its own auto-refresh", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["Chapter one text here.", "More text."] } });
  try {
    t.peval(`mciBuildBusy = true`);
    assert.equal(t.peval(`isOperationBusy()`), true);
    t.peval(`mciBuildBusy = false; auditStarting = true`);
    assert.equal(t.peval(`isOperationBusy()`), true);
    assert.equal(t.peval(`isOperationBusy(false, true)`), false);
    const ran = await t.peval(`runBuildFullManuscriptContext(false, { fromAuditStart: true })`);
    assert.equal(ran, true);
    const blocked = await t.peval(`runBuildFullManuscriptContext(false)`);
    assert.equal(blocked, false);
  } finally {
    t.close();
  }
});

test("PE-88: auto-refresh consent still asked when localStorage throws", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["Some text."] } });
  try {
    t.el("autoRefreshManuscriptContext").checked = true;
    let asked = 0;
    t.window.ProzaEdit.ConfirmDialog.show = () => {
      asked++;
      return Promise.resolve(false);
    };
    t.peval(`Storage.prototype.getItem = function () { throw new Error("blocked"); }`);
    const ok = await t.peval(`maybeAutoRefreshManuscriptContextBeforeAudit()`);
    assert.equal(ok, false);
    assert.equal(asked, 1);
  } finally {
    t.close();
  }
});

test("PE-88: index-build status text is rebuilt (not left on 'Building ...') after a scoped build", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["x ".repeat(300)], selection: "x ".repeat(300) } });
  try {
    t.peval(`getEl("peWorkflowStatusLine").textContent = "Building chapter outline: 1/2"; msIndexBuildToken++;`);
    const tok = t.peval(`msIndexBuildToken`);
    t.peval(`scheduleManuscriptIndexBuild(false)`);
    await t.settle(80);
    assert.doesNotMatch(t.el("peWorkflowStatusLine").textContent, /^Building (scoped|manuscript) index/);
    assert.ok(t.peval(`msIndexBuildToken`) > tok);
  } finally {
    t.close();
  }
});

test("PE-88: audit with chapter scope and no chapters stops with guidance", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["plain", "text"] }, keepDefaultScope: true });
  try {
    t.el("scope").value = "selected-chapters";
    const ready = await t.peval(`prepareScopeForAudit({})`);
    assert.equal(ready, false);
    assert.match(t.status(), /chapter/i);
  } finally {
    t.close();
  }
});
