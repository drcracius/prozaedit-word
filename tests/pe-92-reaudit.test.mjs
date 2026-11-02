import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

async function settleClose(t) {
  await sleep(100);
  t.close();
}

const GENRES = [
  "Fiction (General)", "Fiction (Romance)", "Fiction (Mystery/Crime)", "Fiction (Thriller/Mystery/Crime)",
  "Fiction (Fantasy)", "Fiction (Science Fiction)", "Fiction (Literary/Drama)", "Fiction (Historical)",
  "Non-Fiction / Memoir", "Academic Paper / Journal", "Business / Corporate Report", "Technical / Journalism",
];
const SAMPLE = "She walked to the door. \"I don't know,\" he said very quickly. It was a dark and stormy night, and the the rain fell. He had had enough.  Utilize the means in order to finish.";

test("PE-92: all 12 genres x Simple/Advanced run a real audit end to end with no script errors; Simple never shows more than Advanced", async () => {
  assert.equal(GENRES.length, 12);
  for (const g of GENRES) {
    const counts = {};
    for (const simple of [true, false]) {
      const t = await bootTaskpane({ word: { selection: SAMPLE, paragraphs: [SAMPLE] } });
      try {
        t.el("simpleMode").checked = simple;
        t.el("simpleMode").dispatchEvent(new t.window.Event("change"));
        t.el("manuscriptType").value = g;
        t.el("manuscriptType").dispatchEvent(new t.window.Event("change"));
        t.click("btnRunAudit");
        await waitFor(() => /Audit finished|could not/i.test(t.status()), { timeout: 6000, message: `audit ${g}` });
        assert.match(t.status(), /Audit finished/, g);
        counts[simple ? "s" : "a"] = t.peval(`currentAuditSuggestions.length`) - t.peval(`auditLowConfidenceHidden`);
        assert.deepEqual(t.errors.map((e) => String(e && e.message)), [], g);
        assert.match(t.el("summaryReport").textContent, simple ? /Simple view/ : /Advanced view/);
      } finally {
        await settleClose(t);
      }
    }
    assert.ok(counts.s <= counts.a, `${g}: simple ${counts.s} > advanced ${counts.a}`);
  }
});

test("PE-92: with localStorage and sessionStorage both throwing, boot + local audit + AI call still work and caps are tracked in memory", async () => {
  const t = await bootTaskpane({
    word: { selection: SAMPLE, paragraphs: [SAMPLE] },
    mutateWindow(w) {
      for (const n of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(w, n, { get() { throw new w.DOMException("denied", "SecurityError"); }, configurable: true });
      }
    },
  });
  try {
    await sleep(200);
    t.click("btnRunAudit");
    await waitFor(() => /Audit finished/.test(t.status()), { message: "local audit" });
    t.el("apiKey").value = "AIzaSyFAKEFAKEFAKEFAKEFAKEFAKE12345";
    t.el("apiKey").dispatchEvent(new t.window.Event("input"));
    t.window.fetch = async () => ({
      ok: true, status: 200, headers: { get: () => null },
      json: async () => ({ candidates: [{ content: { parts: [{ text: "[{\"targetText\":\"the the\",\"explanation\":\"dup\",\"replacementText\":\"the\"}]" }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 } }),
    });
    t.peval(`runDeepAuditAICore()`);
    await waitFor(() => /Deep audit finished/.test(t.status()), { message: "deep audit" });
    assert.equal(t.peval(`ProzaEdit.AIQuotaManager.getSessionTokens()`), 120);
    assert.deepEqual(t.errors, []);
  } finally {
    await settleClose(t);
  }
});

test("PE-92: session token cap holds in memory when sessionStorage throws (mutation: stored-only counter)", () => {
  const Q = loadLib("src/taskpane/lib/ai-quota-manager.js", { sessionStorage: { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); } }, localStorage: { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() {} } }).AIQuotaManager;
  const lim = { maxSessionTokens: 1000, maxDayTokens: 1e9, enforceCeiling: true };
  Q.recordUsage(900);
  assert.equal(Q.getSessionTokens(), 900);
  assert.equal(Q.canExecute(200, lim).ok, false);
});

test("PE-92: fiction module memo is refreshed on every return to fiction (user changes between genre switches are kept)", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    const setType = (v) => {
      t.el("manuscriptType").value = v;
      t.peval(`adaptModules()`);
    };
    setType("Fiction (General)");
    t.el("mPlot").checked = false;
    setType("Non-Fiction / Memoir");
    assert.equal(t.el("mPlot").checked, false);
    setType("Fiction (General)");
    assert.equal(t.el("mPlot").checked, false);
    t.el("mPlot").checked = true;
    setType("Non-Fiction / Memoir");
    setType("Fiction (General)");
    assert.equal(t.el("mPlot").checked, true);
  } finally {
    await settleClose(t);
  }
});

test("PE-92: custom style rule ids are unique for non-ASCII phrases", () => {
  const C = loadLib("src/taskpane/lib/custom-style-guide.js").CustomStyleGuide;
  const ids = ["日本語", "中文", "über", "ärger"].map((f) => C.normalizeRule({ find: f, replace: "x" }).id);
  assert.equal(new Set(ids).size, 4, ids.join(","));
});

test("PE-92: copy matches network behaviour (mic, update check, Datamuse disclosed; only allow-listed hosts are contacted)", () => {
  const html = fs.readFileSync("src/taskpane/taskpane.html", "utf8");
  assert.match(html, /Voice dictation[\s\S]*?browser's own speech service/);
  assert.match(html, /Update check[\s\S]*?GitHub/);
  assert.match(html, /id="micBtn"[^>]*aria-label="[^"]*speech service/);
  assert.match(fs.readFileSync("docs/PRIVACY-AND-DATA-PE.md", "utf8"), /voice dictation/i);
  const sources = ["src/taskpane/taskpane.js", ...fs.readdirSync("src/taskpane/lib").map((f) => `src/taskpane/lib/${f}`)];
  const hosts = new Set();
  for (const f of sources) {
    const src = fs.readFileSync(f, "utf8");
    for (const m of src.matchAll(/https:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1]);
  }
  const allowed = new Set([
    "api.datamuse.com", "raw.githubusercontent.com", "drcracius.github.io", "github.com",
    "generativelanguage.googleapis.com", "api.openai.com", "api.anthropic.com", "openrouter.ai",
    "aistudio.google.com", "platform.openai.com", "console.anthropic.com", "ai.google.dev", "docs.claude.com",
    "www.w3.org", "learn.microsoft.com", "support.microsoft.com", "www.microsoft.com", "www.google.com",
  ]);
  const unknown = [...hosts].filter((h) => !allowed.has(h));
  assert.deepEqual(unknown, [], `unreviewed hosts: ${unknown.join(", ")}`);
});
