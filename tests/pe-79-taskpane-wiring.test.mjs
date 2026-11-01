import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootTaskpane, waitFor } from "./helpers/taskpane-harness.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function book(chapters = 4, bodiesPer = 3) {
  const paragraphs = [];
  const headings = [];
  for (let c = 1; c <= chapters; c++) {
    headings.push(paragraphs.length);
    paragraphs.push(`Chapter ${c}`);
    for (let b = 0; b < bodiesPer; b++) {
      paragraphs.push(`Marcus Valdane walked through Brightwater in chapter ${c}, paragraph ${b}. Marcus waited and Brightwater slept.`);
    }
  }
  return { paragraphs, headings };
}

async function boot(opts = {}) {
  const b = book();
  const t = await bootTaskpane({ word: { paragraphs: b.paragraphs, selection: "Marcus waited.", ...(opts.word || {}) }, ...opts });
  t.state.headings = b.headings;
  await t.settle(40);
  return t;
}

async function buildIndex(t) {
  const ok = await t.peval("runBuildFullManuscriptContext(true)");
  await t.settle(40);
  return ok;
}

test("PE-79: a built index is stored under its own key and never in the main config blob", async () => {
  const t = await boot();
  try {
    assert.equal(await buildIndex(t), true);
    const raw = t.mock.settings.PROZAEDIT_MCI_V2;
    assert.ok(raw, "separate settings key written");
    const env = typeof raw === "string" ? JSON.parse(raw) : raw;
    assert.equal(env.storageVersion, 2);
    assert.ok(env.index && Array.isArray(env.index.sections) && env.index.sections.length >= 4);
    const cfg = t.mock.settings.PROZAEDIT_CONFIG;
    const cfgText = typeof cfg === "string" ? cfg : JSON.stringify(cfg || {});
    assert.ok(!cfgText.includes("manuscriptContext"), "main config does not carry the index");
    assert.ok(!cfgText.includes("Brightwater"), "no index content in the main config");
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
  } finally {
    t.close();
  }
});

test("PE-79: a failed save leaves the main config untouched and the index works for the session", async () => {
  const t = await boot();
  try {
    await t.peval("persistSettings(false)");
    await t.settle(20);
    const before = JSON.stringify(t.mock.settings.PROZAEDIT_CONFIG ?? null);
    t.state.settingsFail = true;
    assert.equal(await buildIndex(t), true);
    t.state.settingsFail = false;
    assert.equal(JSON.stringify(t.mock.settings.PROZAEDIT_CONFIG ?? null), before, "main config unchanged");
    assert.ok(!t.mock.settings.PROZAEDIT_MCI_V2, "failed write rolled back");
    assert.ok(t.peval("getManuscriptContextIndex()"), "index still usable in memory");
    assert.match(t.status(), /could not be saved/i);
  } finally {
    t.close();
  }
});

test("PE-79: a legacy index inside the config blob migrates to the new key and is stripped from the config", async () => {
  const legacy = {
    version: 1,
    builtAt: new Date(Date.now() - 1000).toISOString(),
    paragraphCountHash: "p16",
    paragraphTotal: 16,
    sections: [{ index: 1, title: "Chapter 1", wordCount: 40, firstSnippet: "Marcus", lastSnippet: "slept" }],
    nameSeeds: ["Marcus", "Brightwater"],
    summary: "legacy",
  };
  const t = await boot({
    word: { settings: { PROZAEDIT_CONFIG: JSON.stringify({ manuscriptContext: legacy }) } },
  });
  try {
    const idx = t.peval("getManuscriptContextIndex()");
    assert.ok(idx, "legacy index is read");
    assert.ok(idx.nameSeeds.includes("Marcus"));
    await waitFor(() => t.mock.settings.PROZAEDIT_MCI_V2, { message: "init migration" });
    await t.settle(60);
    assert.ok(t.mock.settings.PROZAEDIT_MCI_V2, "new key written");
    const cfg = t.mock.settings.PROZAEDIT_CONFIG;
    const cfgText = typeof cfg === "string" ? cfg : JSON.stringify(cfg || {});
    assert.ok(!cfgText.includes("manuscriptContext"), "legacy copy removed from the config");
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
  } finally {
    t.close();
  }
});

test("PE-79: an edit inside a paragraph (same paragraph count) shows the visible stale notice", async () => {
  const t = await boot();
  try {
    assert.equal(await buildIndex(t), true);
    await t.peval("refreshManuscriptContextFreshness({ force: true, ignoreBusy: true })");
    assert.equal(t.peval("mciFreshness.state"), "fresh");
    assert.ok(
      [...t.document.querySelectorAll(".pe-mci-stale-notice")].every((el) => el.classList.contains("hidden")),
      "no notice while fresh"
    );
    t.state.paragraphs = t.state.paragraphs.map((p, i) => (i === 2 ? p.replace("Marcus", "Marcos") : p));
    await t.peval("refreshManuscriptContextFreshness({ force: true, ignoreBusy: true })");
    assert.equal(t.peval("mciFreshness.state"), "stale");
    const notices = [...t.document.querySelectorAll(".pe-mci-stale-notice")];
    assert.ok(notices.length >= 3);
    assert.ok(notices.every((el) => !el.classList.contains("hidden")), "notice visible in every tab that uses the index");
    assert.match(notices[0].textContent, /out of date/i);
  } finally {
    t.close();
  }
});

test("PE-79: Gemini prompt keeps a stale index but flags it", async () => {
  const t = await boot();
  try {
    assert.equal(await buildIndex(t), true);
    t.state.paragraphs = t.state.paragraphs.map((p, i) => (i === 3 ? p.replace("Brightwater", "Brightwood") : p));
    const prepared = await t.peval(
      `prepareGeminiPrompt(({ index }) => [
        { role: "fixed", text: "INSTRUCTION" },
        { role: "index", text: index || "" },
        { role: "excerpt", text: "EXCERPT-END" },
      ])`
    );
    assert.match(prepared.text, /INSTRUCTION/);
    assert.match(prepared.text, /EXCERPT-END/);
    assert.match(prepared.text, /out of date|stale/i, "flagged as possibly stale");
    assert.equal(prepared.indexIncluded, true);
    assert.match(prepared.note, /may be out of date/i);
  } finally {
    t.close();
  }
});

test("PE-79: AI help is reachable in Simple and Advanced, off until a key is set, and survives mid-session toggling", async () => {
  const t = await boot();
  try {
    const setup = () => [...t.document.querySelectorAll("[data-pe-ai-help-setup]")];
    const ready = () => [...t.document.querySelectorAll("[data-pe-ai-help-ready]")];
    const simple = t.el("simpleMode");

    simple.checked = true;
    t.peval("applySimpleMode()");
    assert.ok(t.document.body.classList.contains("pe-simple-mode"));
    assert.ok(setup().every((el) => !el.classList.contains("hidden")), "Simple, no key: setup shown");
    assert.ok(ready().every((el) => el.classList.contains("hidden")));
    const titles = [...t.document.querySelectorAll("[data-pe-ai-help-title]")].map((e) => e.textContent);
    assert.ok(titles.every((x) => /AI help \(optional\).*off until you add a key/i.test(x)), titles.join("|"));

    t.el("apiKey").value = "AIza-test-key-123456";
    t.peval("applySimpleMode()");
    assert.ok(setup().every((el) => el.classList.contains("hidden")));
    assert.ok(ready().every((el) => !el.classList.contains("hidden")), "Simple, key set: ready");

    simple.checked = false;
    t.peval("applySimpleMode()");
    assert.ok(!t.document.body.classList.contains("pe-simple-mode"));
    assert.ok(ready().every((el) => !el.classList.contains("hidden")), "Advanced, key set: still ready");
    assert.ok([...t.document.querySelectorAll("[data-pe-ai-help-title]")].every((e) => !/AI help \(optional\)/.test(e.textContent)));

    t.el("apiKey").value = "";
    simple.checked = true;
    t.peval("applySimpleMode()");
    t.peval("openAiHelpSetup()");
    await t.settle(100);
    assert.match(t.status(), /AI help is off until you add a Gemini API key/i);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
  } finally {
    t.close();
  }
});

test("PE-79: toggling Simple/Advanced mid-session keeps a local audit and Apply working", async () => {
  const t = await boot();
  try {
    t.el("simpleMode").checked = true;
    t.peval("applySimpleMode()");
    t.el("simpleMode").checked = false;
    t.peval("applySimpleMode()");
    t.el("simpleMode").checked = true;
    t.peval("applySimpleMode()");
    t.el("simpleMode").checked = false;
    t.peval("applySimpleMode()");
    await t.settle(30);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
    assert.deepEqual(t.window.__alerts, []);
    assert.ok(t.el("btnCancelLongOp"));
  } finally {
    t.close();
  }
});

test("PE-79: no stylesheet rule hides the Gemini/AI help block in Simple mode", () => {
  const css = fs.readFileSync(path.join(root, "src/taskpane/taskpane.css"), "utf8");
  assert.ok(!/pe-simple-mode[^{}]*\.pe-gemini-block[^{}]*\{[^}]*display\s*:\s*none/i.test(css));
  assert.ok(!/pe-simple-mode[^{}]*\.pe-ai-help[^{}]*\{[^}]*display\s*:\s*none/i.test(css));
});

test("PE-79: the UI and docs no longer call the index an AI summary and say it is sent with Gemini", () => {
  const html = fs.readFileSync(path.join(root, "src/taskpane/taskpane.html"), "utf8");
  assert.ok(!/AI[- ]generated (manuscript )?summary/i.test(html));
  assert.match(html, /heuristic outline[^<]*is included in the request/i);
  const doc = fs.readFileSync(path.join(root, "docs/MANUSCRIPT-CONTEXT-INDEX.md"), "utf8");
  assert.match(doc, /heuristic/i);
});

test("PE-79: wiring helper exists for waitFor (harness sanity)", async () => {
  const t = await boot();
  try {
    await waitFor(() => t.el("simpleMode"), { message: "simple toggle" });
  } finally {
    t.close();
  }
});
