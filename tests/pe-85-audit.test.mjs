import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function load() {
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ["edit-apply", "edit-history"]) vm.runInContext(fs.readFileSync(path.join(root, "src/taskpane/lib", f + ".js"), "utf8"), sandbox);
  return sandbox.ProzaEdit;
}
function miniDoc(paras) {
  const doc = { paras: paras.slice() };
  const para = (pi) => ({ text: "", load() { this.text = doc.paras[pi]; } });
  const hit = (pi, at, len) => ({
    text: "", load() { this.text = doc.paras[pi].substr(at, len); }, paragraphs: { getFirst: () => para(pi) },
    insertText(to) { const P = doc.paras[pi]; doc.paras[pi] = P.slice(0, at) + to + P.slice(at + len); return { text: "", load() { this.text = to; }, paragraphs: { getFirst: () => para(pi) } }; },
  });
  const hits = (q) => {
    const out = [];
    doc.paras.forEach((P, pi) => { let at = P.toLowerCase().indexOf(q.toLowerCase()); while (at !== -1) { out.push(hit(pi, at, q.length)); at = P.toLowerCase().indexOf(q.toLowerCase(), at + 1); } });
    return out;
  };
  return { doc, ctx: { sync: async () => {} }, deps: (anchor) => ({ searchInScope: async (_c, t) => hits(t), replaceLocation: "Replace", anchor }) };
}

test("PE-85: anchored Undo/Redo target the original paragraph even when the text now repeats elsewhere", async () => {
  const P = load();
  const paras = ["It was very late.", "Filler.", "It was very early."];
  const m = miniDoc(paras);
  const r = await P.EditApply.swapText(m.ctx, "was very late", "was late", m.deps(P.EditApply.buildAnchor(paras.join("\n"), "was very late").anchor));
  assert.ok(r.undoAnchor && r.redoAnchor);
  P.EditHistory.record("was very late", "was late", "x", r);
  m.doc.paras.push("Then it was late again.");
  const e = P.EditHistory.popUndo();
  await P.EditApply.swapText(m.ctx, e.after, e.before, m.deps(e.undoAnchor));
  assert.deepEqual(m.doc.paras, ["It was very late.", "Filler.", "It was very early.", "Then it was late again."]);
  const e2 = P.EditHistory.popRedo();
  await P.EditApply.swapText(m.ctx, e2.before, e2.after, m.deps(e2.redoAnchor));
  assert.equal(m.doc.paras[0], "It was late.");
  assert.equal(m.doc.paras[3], "Then it was late again.");
});

test("PE-85: anchored Undo refuses when the paragraph was edited meanwhile", async () => {
  const P = load();
  const paras = ["It was very late."];
  const m = miniDoc(paras);
  const r = await P.EditApply.swapText(m.ctx, "was very late", "was late", m.deps(P.EditApply.buildAnchor(paras[0], "was very late").anchor));
  m.doc.paras[0] = "It was late, truly.";
  const err = await P.EditApply.swapText(m.ctx, "was late", "was very late", m.deps(r.undoAnchor)).catch((x) => x);
  assert.equal(err.peApplyPhase, "before-edit");
  assert.equal(m.doc.paras[0], "It was late, truly.");
});

test("PE-85: taskpane counts sent-but-failed AI calls (timeout/cancel/network/empty) toward the caps", () => {
  const src = fs.readFileSync(path.join(root, "src/taskpane/taskpane.js"), "utf8");
  assert.match(src, /abortedBeforeSend[\s\S]{0,200}PE_TIMEOUT[\s\S]{0,200}recordUsage\(est\.totalTokens\)/);
});

import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";

function loadProviders() {
  const sb = { console, setTimeout, clearTimeout, AbortController };
  sb.window = sb;
  vm.createContext(sb);
  for (const f of ["ai-safety", "ai-providers"]) vm.runInContext(fs.readFileSync(path.join(root, "src/taskpane/lib", f + ".js"), "utf8"), sb);
  return sb.ProzaEdit.AIProviders;
}

test("PE-86: Gemini key travels in x-goog-api-key, never in the URL", () => {
  const AP = loadProviders();
  const r = AP.get("gemini").buildRequest({ apiKey: "SECRETKEY123", model: "gemini-3.8-flash", prompt: "p", maxOutputTokens: 50, temperature: 0.4 });
  assert.ok(!r.url.includes("SECRETKEY123") && !r.url.includes("key="));
  assert.equal(r.init.headers["x-goog-api-key"], "SECRETKEY123");
});

test("PE-86: Anthropic sends no temperature; gpt-6 uses max_completion_tokens and no temperature; legacy keeps both", () => {
  const AP = loadProviders();
  const a = JSON.parse(AP.get("anthropic").buildRequest({ apiKey: "k", model: "claude-haiku-5-5", prompt: "p", maxOutputTokens: 50, temperature: 0.4 }).init.body);
  assert.ok(!("temperature" in a));
  const g6 = JSON.parse(AP.get("openai").buildRequest({ apiKey: "k", model: "gpt-6-luna", prompt: "p", maxOutputTokens: 50, temperature: 0.4 }).init.body);
  assert.equal(g6.max_completion_tokens, 50);
  assert.ok(!("temperature" in g6) && !("max_tokens" in g6));
  const g4 = JSON.parse(AP.get("openai").buildRequest({ apiKey: "k", model: "gpt-4o-mini", prompt: "p", maxOutputTokens: 50, temperature: 0.4 }).init.body);
  assert.equal(g4.max_tokens, 50);
});

test("PE-86: retired model ids are gone; every default is a listed model", () => {
  const AP = loadProviders();
  const ids = AP.list().flatMap((p) => p.models.map((m) => m.id));
  for (const dead of ["claude-3-5-haiku-latest", "claude-sonnet-4-0", "anthropic/claude-3.5-haiku"]) assert.ok(!ids.includes(dead), dead);
  for (const p of AP.list()) assert.ok(p.models.some((m) => m.id === p.defaultModel), p.id);
});

test("PE-86: 404 says model unavailable; 'Failed to fetch' gets key/CORS guidance", async () => {
  const AP = loadProviders();
  const e404 = AP.mapError(AP.get("anthropic"), 404, null, []);
  assert.match(e404.message, /model unavailable/i);
  for (const [id, re] of [["openai", /mistyped or revoked key/], ["anthropic", /organization/i]]) {
    const err = await AP.complete({ providerId: id, apiKey: "abcdefgh1234", prompt: "x", fetchImpl: async () => { throw new TypeError("Failed to fetch"); } }).catch((x) => x);
    assert.equal(err.code, "network");
    assert.match(err.message, re);
  }
});

test("PE-86: dash rules never propose replacement text and em-dash flag is density based", () => {
  const P = loadEngine();
  const ctx = ctxFor("Fiction (General)", { extendedLocal: true });
  const hy = "A well-known, off-the-cuff, twenty-one-year-old, ill-advised, so-called, one-way, long-term, hand-made man – yes. ";
  const r = P.Audit.run(hy.repeat(2), ctx).suggestions.find((s) => s.ruleId === "ext:dash_mix");
  if (r) assert.match(r.replacementText, /^\(.*\)$/);
  const long = ("She walked home through the quiet evening and thought about nothing at all today. ".repeat(60)) + "He stopped — then went on — and left — quickly — and — never — came back.";
  const none = P.Audit.run(long, ctx).suggestions.find((s) => s.ruleId === "ext:emdash");
  assert.equal(none, undefined);
  const dense = P.Audit.run("Wait — no — stop — go — run — hide — now. ".repeat(3), ctx).suggestions.find((s) => s.ruleId === "ext:emdash");
  if (dense) assert.match(dense.replacementText, /^\(.*\)$/);
});

test("PE-86: first-screen defaults - scope is Full manuscript, AI-voice check off, no 10px text, no dev copy", () => {
  const html = fs.readFileSync(path.join(root, "src/taskpane/taskpane.html"), "utf8");
  assert.match(html, /<option value="full" selected>/);
  assert.doesNotMatch(html, /id="chkAI"[^>]*checked/);
  assert.doesNotMatch(html, /font-size:\s*(?:[0-9]|10|11)px/);
  assert.doesNotMatch(html.match(/id="peSessionTips"[\s\S]*?<\/ul>/)[0], /manifest\.hosted/);
});

test("PE-85: manifests declare WordApi 1.3 and versions are in sync", () => {
  for (const f of ["manifest.hosted.xml", "manifest.xml"]) assert.match(fs.readFileSync(path.join(root, f), "utf8"), /<Set Name="WordApi" MinVersion="1.3"\/>/);
  assert.match(fs.readFileSync(path.join(root, "src/taskpane/taskpane.js"), "utf8"), /isSetSupported\("WordApi", "1\.3"\)/);
});

test("PE-85: audit engine has no catastrophic backtracking on pathological long lines", () => {
  const P = loadEngine();
  const ctx = ctxFor("Fiction (General)", { extendedLocal: true });
  const shapes = ["a".repeat(60000), "word ".repeat(30000), "—".repeat(20000), ("\"" + "x ".repeat(50) + "\" ").repeat(2000), "very ".repeat(20000) + "!", "(".repeat(20000), "a, ".repeat(25000), ". ".repeat(30000), "Mr. ".repeat(15000), "ing ".repeat(20000)];
  for (const t of shapes) {
    const s = Date.now();
    P.Audit.run(t, ctx);
    assert.ok(Date.now() - s < 4000, `slow on shape ${t.slice(0, 12)}: ${Date.now() - s}ms`);
  }
});

test("PE-85: audit engine fuzz - random text never throws and scores stay in range", () => {
  const P = loadEngine();
  const ctx = ctxFor("Fiction (General)", { extendedLocal: true });
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const alpha = ["the", "he", "was", "very", "—", "-", "\"", "'", "\n", "...", "?", "!", "ly", "felt", "said", "😀", "א", "é", "Chapter 1", "  ", "(", ")", "1999", "she", "." ];
  for (let i = 0; i < 150; i++) {
    let t = "";
    const n = Math.floor(rnd() * 200);
    for (let j = 0; j < n; j++) t += alpha[Math.floor(rnd() * alpha.length)] + (rnd() < 0.7 ? " " : "");
    const r = P.Audit.run(t, ctx);
    assert.ok(Array.isArray(r.suggestions));
    for (const s of r.suggestions) assert.ok(s.ruleId && typeof s.explanation === "string");
    if (r.score != null) assert.ok(r.score >= 0 && r.score <= 10, `score ${r.score}`);
  }
});
