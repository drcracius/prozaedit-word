// PE-94 re-audit: walk x 12 genres x Simple/Advanced, cancel at each stage, 300k-word timing, rule/copy fixes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib, loadLibs } from "./load-lib.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENRES = [
  "Fiction (General)", "Fiction (Romance)", "Fiction (Mystery/Crime)", "Fiction (Thriller/Mystery/Crime)",
  "Fiction (Fantasy)", "Fiction (Science Fiction)", "Fiction (Literary/Drama)", "Fiction (Historical)",
  "Non-Fiction / Memoir", "Academic Paper / Journal", "Business / Corporate Report", "Technical / Journalism",
];
const BODY = [
  "She walked into the room and looked at the window, thinking of March 3rd, 1998 (Smith, 2004).",
  "\"I don't know,\" he said very quickly. Then, the next day, they left for Paris.",
  "It was a dark night and the the rain fell on Marcus and Elena, who had had enough.",
  "Utilize the means in order to finish the long chapter text, with many words to fill the page.",
];
function doc(chapters, parasPer) {
  const paras = [];
  const headings = [];
  for (let c = 0; c < chapters; c++) {
    headings.push(paras.length);
    paras.push("Chapter " + (c + 1));
    for (let i = 0; i < parasPer; i++) paras.push(BODY[(i + c) % 4] + " " + BODY[(i + c + 1) % 4]);
  }
  return { paras, headings };
}
async function boot(d, genre, simple, settings) {
  const t = await bootTaskpane({ word: { paragraphs: d.paras, settings }, keepDefaultScope: true });
  t.state.headings = d.headings;
  t.el("simpleMode").checked = simple;
  t.el("simpleMode").dispatchEvent(new t.window.Event("change"));
  t.el("manuscriptType").value = genre;
  t.el("manuscriptType").dispatchEvent(new t.window.Event("change"));
  return t;
}
async function step(t, timeout = 60000) {
  t.click("btnAuditNextChapter");
  await sleep(30);
  await waitFor(() => !t.peval("isOperationBusy()"), { timeout, interval: 20 });
  await sleep(30);
}

test("PE-94: chapter walk x 12 genres x Simple/Advanced completes all chapters, merges, no script errors", async () => {
  const d = doc(3, 6);
  for (const g of GENRES) {
    for (const simple of [true, false]) {
      const t = await boot(d, g, simple);
      try {
        for (let i = 0; i < 3; i++) await step(t);
        assert.match(t.el("peChapterWalkProgress").textContent, /All 3 chapters audited/, `${g} simple=${simple}`);
        assert.match(t.el("summaryReport").textContent, /Combined results for 3 of 3 chapters/);
        const n = t.peval("currentAuditSuggestions.length");
        assert.ok(n >= 3, `${g}: merged findings ${n}`);
        const ids = t.peval("currentAuditSuggestions.map((s) => s.id).join('|')").split("|");
        assert.equal(new Set(ids).size, ids.length, "merged ids unique");
        assert.equal(t.peval("getScopeMode()"), "full");
        assert.deepEqual(t.errors.map((e) => String(e && e.message)), [], g);
      } finally {
        await sleep(50);
        t.close();
      }
    }
  }
});

test("PE-94: cancel at every stage of a chapter step leaves position and totals unchanged; retry then succeeds", async () => {
  const d = doc(3, 6);
  for (const stage of [1, 2, 4, 8, 14]) {
    const t = await boot(d, "Fiction (General)", true);
    try {
      await step(t);
      const done0 = t.peval("ProzaEdit.ChapterWalk.doneCount(chapterWalkState)");
      let syncs = 0;
      t.state.syncHook = async () => {
        syncs++;
        if (syncs === stage) t.click("btnCancelLongOp");
      };
      await step(t);
      t.state.syncHook = null;
      const done1 = t.peval("ProzaEdit.ChapterWalk.doneCount(chapterWalkState)");
      assert.ok(done1 === done0 || done1 === done0 + 1, `stage ${stage}: ${done0}->${done1}`);
      assert.equal(t.peval("isOperationBusy()"), false);
      assert.equal(t.peval("getScopeMode()"), "full", "scope restored after cancel");
      const stored = JSON.parse(t.mock.settings.PROZAEDIT_CHAPTER_WALK);
      assert.equal(Object.keys(stored.done).length, done1, "stored matches in-memory");
      while (t.peval("ProzaEdit.ChapterWalk.nextIndex(chapterWalkState, scopeChapterListCache)")) await step(t);
      assert.match(t.el("peChapterWalkProgress").textContent, /All 3 chapters/);
      assert.deepEqual(t.errors.map((e) => String(e && e.message)), []);
    } finally {
      await sleep(50);
      t.close();
    }
  }
});

test("PE-94: 300k-word book - whole-book audit refused, chapter walk steps stay fast, full walk of 31 chapters merges", async () => {
  const d = doc(31, 290);
  const words = d.paras.join(" ").split(/\s+/).length;
  assert.ok(words >= 290000, String(words));
  const t = await boot(d, "Fiction (General)", true);
  try {
    t.click("btnRunAudit");
    await sleep(30);
    if (!t.el("peLongOpWarningBanner").classList.contains("hidden")) t.click("btnLongOpContinue");
    await waitFor(() => /exceeds character limit/i.test(t.status()), { timeout: 30000, message: "refusal" });
    assert.ok(t.el("peChapterWalk").open, "refusal opens the chapter panel");
    const t0 = Date.now();
    await step(t);
    const first = Date.now() - t0;
    assert.ok(first < 5000, `first chapter ${first} ms`);
    assert.match(t.el("peChapterWalkProgress").textContent, /Chapter 2 of 31/);
    const t1 = Date.now();
    for (let i = 1; i < 31; i++) await step(t);
    assert.ok(Date.now() - t1 < 90000, "whole walk < 90 s in the mock");
    assert.match(t.el("peChapterWalkProgress").textContent, /All 31 chapters audited/);
    assert.match(t.el("summaryReport").textContent, /Combined results for 31 of 31/);
    assert.ok(JSON.parse(t.mock.settings.PROZAEDIT_CHAPTER_WALK) && t.mock.settings.PROZAEDIT_CHAPTER_WALK.length < 4000, "stored state is small");
    assert.deepEqual(t.errors.map((e) => String(e && e.message)), []);
  } finally {
    await sleep(80);
    t.close();
  }
});

test("PE-94: a single chapter over the limit can be skipped and the walk goes on", async () => {
  const big = doc(2, 1);
  big.paras.splice(2, 0, ...Array.from({ length: 700 }, () => "x".repeat(400)));
  big.headings = [0, big.paras.findIndex((p) => p === "Chapter 2")];
  const t = await boot(big, "Fiction (General)", true);
  try {
    await step(t);
    assert.match(t.status(), /not audited|over|exceed/i);
    t.click("btnSkipChapter");
    await sleep(50);
    await step(t);
    assert.match(t.el("peChapterWalkProgress").textContent, /All 2 chapters audited/);
    assert.match(t.el("peChapterWalkProgress").textContent, /1 chapter\(s\) skipped/);
  } finally {
    await sleep(50);
    t.close();
  }
});

test("rule fixes: phraseInText is Unicode-aware and punctuation-safe; plot:restroom removed; a/an skips acronyms", () => {
  const CSG = loadLib("src/taskpane/lib/custom-style-guide.js").CustomStyleGuide;
  const has = (t, p) => CSG.phraseInText(t, t.toLowerCase(), p, true);
  assert.equal(has("a colorful day", "color"), false);
  assert.equal(has("the color red", "color"), true);
  assert.equal(has("café au lait", "caf"), false);
  assert.equal(has("un café noir", "café"), true);
  assert.equal(has("Naïve, truly", "naïve"), true);
  assert.equal(has("this is (sic) fine", "(sic)"), true);
  assert.equal(has("we did it in order  to win", "in order to"), true, "whitespace runs match");
  assert.equal(has("Utilize it", "utilize"), true);
  assert.equal(has("x", ""), false);
  assert.equal(CSG.phraseInText("colorful", "colorful", "color", false), true);
  const lib = fs.readFileSync(path.join(root, "src/taskpane/lib/audit-engine.js"), "utf8");
  assert.ok(!lib.includes("plot:restroom"));
  const EH = loadLibs(["src/taskpane/lib/editor-heuristics.js"]).EditorHeuristics;
  const out = [];
  EH.scanAAn("He is an FBI agent, an NHS nurse, an MP, an LED lamp, an historic figure, an hour late.", (s) => out.push(s), 10);
  assert.equal(out.length, 0, JSON.stringify(out.map((o) => o.targetText)));
  const out2 = [];
  EH.scanAAn("He was an university man and a honest one, not an hunted man.", (s) => out2.push(s), 10);
  assert.ok(out2.length >= 2);
});

test("copy: retired insider terms are gone from UI, help and live docs; new terms are used consistently", () => {
  const files = [
    "src/taskpane/taskpane.html", "src/taskpane/taskpane.js", "README.md",
    ...fs.readdirSync(path.join(root, "src/taskpane/lib")).map((f) => "src/taskpane/lib/" + f),
    "docs/MANUSCRIPT-CONTEXT-INDEX.md", "docs/QUICK-START.md", "docs/BETA-ONBOARDING-COMMS.md",
  ];
  const retired = /Full MS context|Extended checks|Selected chapters|Build full manuscript context|Manuscript index may|Extended local audit/;
  for (const f of files) {
    const txt = fs.readFileSync(path.join(root, f), "utf8");
    assert.doesNotMatch(txt, retired, f);
  }
  const html = fs.readFileSync(path.join(root, "src/taskpane/taskpane.html"), "utf8");
  assert.match(html, /Deeper checks/);
  assert.match(html, /Chosen chapters/);
  assert.match(html, /Book outline/);
});

test("helpers: onboarding session lines are friendly; name nudge accepts accented/hyphenated names; tooltip Escape hides", () => {
  const ns = loadLibs(["src/taskpane/lib/onboarding-helpers.js", "src/taskpane/lib/plain-language-helpers.js"]);
  const lines = ns.Onboarding.formatPriorSessionLines({ lastVisitAt: "2026-01-02T03:04:05.000Z", lastTab: "tab4", scopeMode: "selected-chapters", ranAudit: true });
  assert.ok(lines.includes("Scope: Chosen chapters"), lines.join("|"));
  assert.ok(!lines[0].includes("T03:04:05"));
  for (const n of ["Élodie", "Zoë Brontë", "Anne-Marie", "McDonald", "O'Neil"]) {
    assert.equal(ns.PlainLanguage.isNameLikeMuteTarget({ targetText: n }), true, n);
  }
  assert.equal(ns.PlainLanguage.isNameLikeMuteTarget({ targetText: "the rain" }), false);
});
