import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function load({ blocked = false, quotaChars = Infinity } = {}) {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (blocked ? (() => { throw new Error("blocked"); })() : store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      if (blocked) throw new Error("blocked");
      if (String(v).length > quotaChars) throw new Error("QuotaExceeded");
      store.set(k, String(v));
    },
    removeItem: (k) => { if (blocked) throw new Error("blocked"); store.delete(k); },
  };
  const sb = { localStorage };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, "src/taskpane/lib/ai-cache.js"), "utf8"), sb);
  return { C: sb.ProzaEdit.AICache, store };
}
const k = (C, o) => C.makeKey({ providerId: "gemini", model: "m", genre: "g", temperature: 0.3, prompt: "excerpt A", ...o });

test("key depends on excerpt/prompt, model, provider, genre and temperature", () => {
  const { C } = load();
  const base = k(C, {});
  assert.equal(base, k(C, {}));
  for (const o of [{ prompt: "excerpt B" }, { model: "m2" }, { providerId: "openai" }, { genre: "g2" }, { temperature: 0.5 }]) assert.notEqual(base, k(C, o));
});

test("set/get round trip, hit refreshes LRU order, miss returns null", () => {
  const { C } = load();
  assert.equal(C.get("nope"), null);
  assert.equal(C.set("a", "reply a"), true);
  assert.equal(C.get("a").text, "reply a");
  assert.equal(C.stats().entries, 1);
});

test("TTL expiry removes the entry", () => {
  const { C } = load();
  C.set("a", "x", [], 1000);
  assert.ok(C.get("a", 1000 + C.TTL_MS - 1));
  assert.equal(C.get("a", 1000 + C.TTL_MS + 5000), null);
  assert.equal(C.stats(1000 + C.TTL_MS + 5000).entries, 0);
});

test("entry-count cap evicts least recently used (a hit protects an entry)", () => {
  const { C } = load();
  C.MAX_ENTRIES = 3;
  C.set("a", "1", [], 1); C.set("b", "2", [], 2); C.set("c", "3", [], 3);
  C.get("a", 4);
  C.set("d", "4", [], 5);
  assert.ok(C.get("a", 6));
  assert.equal(C.get("b", 6), null);
  assert.ok(C.get("c", 6) && C.get("d", 6));
});

test("total size cap, oversized entries and empty text are not stored", () => {
  const { C } = load();
  C.MAX_TOTAL_CHARS = 100; C.MAX_ENTRY_CHARS = 60;
  C.set("a", "x".repeat(50), [], 1); C.set("b", "y".repeat(50), [], 2); C.set("c", "z".repeat(50), [], 3);
  assert.ok(C.stats(4).chars <= 100);
  assert.equal(C.get("a", 4), null);
  assert.equal(C.set("big", "q".repeat(61)), false);
  assert.equal(C.set("empty", "   "), false);
});

test("never stores a reply containing the API key; storage holds no prompt or key", () => {
  const { C, store } = load();
  const key = "AIzaSySECRETSECRET123";
  assert.equal(C.set("a", `leak ${key}`, [key]), false);
  C.set(k(C, { prompt: "SECRET_PROMPT_TEXT" }), "ok reply", [key]);
  const raw = store.get(C.STORE_KEY);
  assert.ok(!raw.includes(key) && !raw.includes("SECRET_PROMPT_TEXT"));
});

test("clear empties the cache; blocked storage never throws", () => {
  const { C } = load();
  C.set("a", "x");
  assert.equal(C.clear(), true);
  assert.equal(C.get("a"), null);
  const b = load({ blocked: true }).C;
  assert.equal(b.set("a", "x"), false);
  assert.equal(b.get("a"), null);
  assert.equal(b.clear(), false);
  assert.equal(b.stats().entries, 0);
});

test("corrupt or foreign storage is ignored; quota errors degrade gracefully", () => {
  const { C, store } = load();
  store.set(C.STORE_KEY, "{not json");
  assert.equal(C.get("a"), null);
  assert.equal(C.set("a", "x"), true);
  store.set(C.STORE_KEY, JSON.stringify({ v: 2, entries: [{ k: "a", t: 1, text: "x" }] }));
  assert.equal(C.get("a"), null);
  const q = load({ quotaChars: 10 }).C;
  assert.equal(q.set("a", "x".repeat(50)), false);
});

test("wiring: cache is consulted before the quota gate and shows cached, 0 tokens; settings has clear button; no config writes", () => {
  const tp = fs.readFileSync(path.join(root, "src/taskpane/taskpane.js"), "utf8");
  const fn = tp.slice(tp.indexOf("async function aiGenerateWithQuota"), tp.indexOf("const geminiGenerateWithQuota"));
  assert.ok(fn.indexOf("AICache.get") > -1 && fn.indexOf("AICache.get") < fn.indexOf("canExecute"));
  assert.match(fn, /cached, 0 tokens/);
  assert.match(fn, /AICache\.set\(cacheKey, clean, \[getApiKey\(\)\]\)/);
  const html = fs.readFileSync(path.join(root, "src/taskpane/taskpane.html"), "utf8");
  assert.match(html, /lib\/ai-cache\.js/);
  assert.match(html, /clearAiCache\(\)/);
  const lib = fs.readFileSync(path.join(root, "src/taskpane/lib/ai-cache.js"), "utf8");
  assert.ok(!/customXml|settings\.set|Office\./.test(lib));
});
