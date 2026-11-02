// PE-94: "Audit next chapter" guided flow (pure helpers + real pane in the Word mock).
import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

const CW = loadLib("src/taskpane/lib/chapter-walk.js").ChapterWalk;
const chapters = (n) => Array.from({ length: n }, (_, i) => ({ index: i + 1, title: "Ch " + (i + 1) }));

test("walk helpers: progress, next, reconcile, merge, skip", () => {
  const list = chapters(3);
  let st = CW.create(list);
  assert.equal(CW.nextIndex(st, list), 1);
  assert.equal(CW.progressLabel(st, list), "Chapter 1 of 3");
  CW.record(st, list[0], { words: 100, critical: 2, style: 1 });
  CW.record(st, list[1], { skipped: true });
  assert.equal(CW.nextIndex(st, list), 3);
  assert.equal(CW.progressLabel(st, list), "Chapter 3 of 3");
  const back = CW.reconcile(CW.parse(CW.serialize(st)), list);
  assert.equal(CW.doneCount(back.state), 2);
  assert.equal(back.reset, false);
  assert.equal(CW.reconcile(CW.parse(CW.serialize(st)), chapters(4)).reset, true, "changed chapter list resets");
  const renamed = list.map((c, i) => (i === 2 ? { ...c, title: "Other" } : c));
  assert.equal(CW.doneCount(CW.reconcile(CW.parse(CW.serialize(st)), renamed).state), 0);
  CW.record(st, list[2], { words: 50, critical: 1 });
  assert.ok(CW.isComplete(st, list));
  assert.equal(CW.progressLabel(st, list), "All 3 chapters audited");
  assert.deepEqual(JSON.parse(JSON.stringify(CW.totals(st))), { chapters: 3, words: 150, critical: 3, style: 1, truncated: 0, skipped: 1 });
  const m = CW.mergedSuggestions({ 1: [{ id: "a" }, { id: "b", ruleId: "sys:truncated" }], 3: [{ id: "a" }] }, list);
  assert.equal(m.map((s) => s.id).join(), "ch1_a,ch3_a");
  assert.equal(CW.parse("{bad"), null);
  assert.equal(CW.reconcile({ v: 1, fp: "x" }, list).state.total, 3);
});

const PARAS = [];
const HEAD = [];
for (let c = 0; c < 4; c++) {
  HEAD.push(PARAS.length);
  PARAS.push("Chapter " + (c + 1));
  PARAS.push("She walked in very quickly and looked at the window, thinking of the long night " + c + ".");
  PARAS.push("The the rain fell on Marcus and Elena, who had had enough of it all.");
}
async function boot(settings) {
  const t = await bootTaskpane({ word: { paragraphs: PARAS, settings }, keepDefaultScope: true });
  t.state.headings = HEAD;
  return t;
}
async function step(t) {
  t.click("btnAuditNextChapter");
  await sleep(30);
  await waitFor(() => !t.peval("isOperationBusy()"), { timeout: 20000, interval: 20 });
  await sleep(30);
}

test("pane: chapter walk audits one chapter per click, merges, resumes after reload, restarts", async () => {
  const t = await boot();
  try {
    await step(t);
    assert.match(t.el("peChapterWalkProgress").textContent, /Chapter 2 of 4/);
    assert.match(t.status(), /1 of 4 chapters audited/);
    const afterOne = t.el("cardContainer").children.length;
    await step(t);
    assert.match(t.el("peChapterWalkProgress").textContent, /Chapter 3 of 4/);
    assert.ok(t.el("cardContainer").children.length > afterOne, "merged cards grow");
    assert.match(t.el("summaryReport").textContent, /Chapter 2 of 4/);
    assert.equal(t.peval("getScopeMode()"), "full", "user's scope is restored after each chapter");
    assert.ok(!t.el("btnRestartChapterWalk").classList.contains("hidden"));
    await t.click("btnRestartChapterWalk");
    await sleep(50);
    assert.match(t.el("peChapterWalkProgress").textContent, /Chapter 1 of 4/);
  } finally {
    t.close?.();
  }
});

test("pane: cancel mid-chapter leaves position unchanged; skip advances", async () => {
  const t = await boot();
  try {
    await step(t);
    t.click("btnAuditNextChapter");
    await sleep(0);
    t.peval("activeLongOp && activeLongOp.cancel()");
    await waitFor(() => !t.peval("isOperationBusy()"), { timeout: 20000, interval: 20 });
    await sleep(30);
    const txt = t.el("peChapterWalkProgress").textContent;
    assert.match(txt, /Chapter (2|3) of 4/);
    const before = t.peval("ProzaEdit.ChapterWalk.doneCount(chapterWalkState)");
    t.click("btnSkipChapter");
    await sleep(50);
    assert.equal(t.peval("ProzaEdit.ChapterWalk.doneCount(chapterWalkState)"), before + 1);
  } finally {
    t.close?.();
  }
});

test("pane: position survives a reload (stored in document settings) and mismatched docs start over", async () => {
  const a = await boot();
  let saved;
  try {
    await step(a);
    await step(a);
    saved = { ...a.mock.settings };
  } finally {
    a.close();
  }
  assert.ok(saved.PROZAEDIT_CHAPTER_WALK);
  const b = await boot(saved);
  try {
    b.peval("refreshChapterScopeLists()");
    await waitFor(() => b.peval("scopeChapterListCache.length") === 4);
    b.peval("renderChapterWalkPanel()");
    assert.match(b.el("peChapterWalkProgress").textContent, /Chapter 3 of 4/);
    assert.match(b.el("peChapterWalkProgress").textContent, /Chapters done: 2 of 4/);
  } finally {
    b.close();
  }
  const c = await bootTaskpane({ word: { paragraphs: PARAS.slice(0, 6), headings: [0, 3], settings: saved }, keepDefaultScope: true });
  try {
    c.peval("refreshChapterScopeLists()");
    await waitFor(() => c.peval("scopeChapterListCache.length") === 2);
    c.peval("renderChapterWalkPanel()");
    assert.match(c.el("peChapterWalkProgress").textContent, /Chapter 1 of 2/);
  } finally {
    c.close();
  }
});

test("pane: a partial chapter walk never writes 'last run' stats or a 'Vs last run' line", async () => {
  const stats = JSON.stringify({ critical: 99, pref: 1, score: 9, at: "2026-01-01T00:00:00.000Z" });
  const t = await boot({ PROZAEDIT_LAST_AUDIT_STATS: stats });
  try {
    await step(t);
    assert.doesNotMatch(t.el("summaryReport").textContent, /Vs last run/);
    assert.equal(t.mock.settings.PROZAEDIT_LAST_AUDIT_STATS, stats);
  } finally {
    t.close();
  }
});
