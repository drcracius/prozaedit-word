// PE-99: AI provider x cache x cancel x quota, exercised through the real pane code with a mocked fetch.
import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, sleep } from "./helpers/taskpane-harness.mjs";

const KEY = "AIzaSyTESTKEY-0123456789abcdefghij";
const okResp = (text, usage = { promptTokenCount: 10, candidatesTokenCount: 5 }) => ({
  ok: true, status: 200, headers: { get: () => null },
  json: async () => ({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: usage }),
});

async function boot(handler) {
  const calls = [];
  const fetch = (url, init) => { calls.push({ url: String(url), init }); return handler(calls.length, url, init); };
  const t = await bootTaskpane({ word: {}, fetch });
  t.peval(`document.getElementById("apiKey").value = ${JSON.stringify(KEY)};`);
  return { t, calls };
}
const hang = (_n, _u, init) => new Promise((_r, rej) => init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))));
const session = (t) => t.peval("ProzaEdit.AIQuotaManager.getSessionTokens()");
const entries = (t) => t.peval("ProzaEdit.AICache.stats().entries");
const gen = (t, prompt, withSignal) => t.peval(`aiGenerateWithQuota(${JSON.stringify(prompt)}, { temperature: 0.3 }, 100, ${withSignal ? "window.__ctl.signal" : "undefined"})`);

test("pane AI: cached repeat costs 0 tokens and sends no second request", async () => {
  const { t, calls } = await boot(async () => okResp("polished reply"));
  try {
    assert.equal(await gen(t, "Tighten: the quick brown fox."), "polished reply");
    const afterFirst = session(t);
    assert.equal(afterFirst, 15, "provider-reported usage is counted");
    assert.equal(entries(t), 1);
    assert.equal(await gen(t, "Tighten: the quick brown fox."), "polished reply");
    assert.equal(calls.length, 1);
    assert.equal(session(t), afterFirst, "cache hit adds 0 tokens");
    assert.match(t.el("aiUsageMeter").textContent, /cached, 0 tokens/);
  } finally { t.close(); }
});

test("pane AI: cancel mid-request does not populate the cache, counts the estimate once, then a retry works and caches", async () => {
  let mode = "hang";
  const { t, calls } = await boot(async (n, u, init) => (mode === "hang" ? hang(n, u, init) : okResp("second try")));
  try {
    t.peval("window.__ctl = new AbortController()");
    const p = gen(t, "Rewrite: slow request.", true).then(() => "resolved", (e) => e.code || e.message);
    await sleep(30);
    assert.equal(calls.length, 1, "request was sent");
    t.peval("window.__ctl.abort()");
    assert.equal(await p, "PE_CANCELLED");
    assert.equal(entries(t), 0, "cancelled call is never cached");
    const afterCancel = session(t);
    assert.ok(afterCancel > 0, "a sent-then-cancelled request may be billed: estimate counted");
    assert.equal(calls.length, 1, "cancel does not trigger a hidden retry");

    mode = "ok";
    t.peval("window.__ctl = new AbortController()");
    assert.equal(await gen(t, "Rewrite: slow request.", true), "second try");
    assert.equal(calls.length, 2);
    assert.equal(entries(t), 1);
    assert.equal(session(t), afterCancel + 15, "retry adds only its own reported usage");
    assert.equal(await gen(t, "Rewrite: slow request.", true), "second try");
    assert.equal(calls.length, 2, "repeat is served from cache");
    assert.equal(session(t), afterCancel + 15);
  } finally { t.close(); }
});

test("pane AI: already-cancelled signal sends nothing, counts nothing, caches nothing", async () => {
  const { t, calls } = await boot(async () => okResp("never"));
  try {
    t.peval("window.__ctl = new AbortController(); window.__ctl.abort()");
    const code = await gen(t, "Rewrite: pre-cancelled.", true).then(() => "resolved", (e) => e.code);
    assert.equal(code, "PE_CANCELLED");
    assert.equal(calls.length, 0);
    assert.equal(session(t), 0);
    assert.equal(entries(t), 0);
  } finally { t.close(); }
});

test("pane AI: the API key never reaches the cache, the meter, status text or errors", async () => {
  let mode = "hang";
  const { t } = await boot(async (n, u, init) => (mode === "hang" ? hang(n, u, init) : okResp(`echo ${KEY} back`)));
  try {
    t.peval("window.__ctl = new AbortController()");
    const p = gen(t, "Rewrite: leak check.", true).then(() => null, (e) => e);
    await sleep(20);
    t.peval("window.__ctl.abort()");
    const err = await p;
    assert.ok(!String(err && err.message).includes(KEY));
    mode = "ok";
    await gen(t, "Rewrite: leak check.");
    assert.equal(entries(t), 0, "a reply that echoes the key is not cached");
    const dump = JSON.stringify([...Array(t.window.localStorage.length).keys()].map((i) => { const k = t.window.localStorage.key(i); return [k, t.window.localStorage.getItem(k)]; }));
    assert.ok(!dump.includes(KEY), "key not stored in cache/local storage even when the provider echoes it");
    assert.ok(!t.el("aiUsageMeter").textContent.includes(KEY));
    assert.ok(!t.status().includes(KEY));
    assert.ok(!t.document.body.innerHTML.replace(/<input[^>]*id="apiKey"[^>]*>/, "").includes(KEY));
  } finally { t.close(); }
});
