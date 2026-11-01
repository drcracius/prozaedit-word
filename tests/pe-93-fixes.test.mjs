import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

const close = async (t) => { await sleep(80); t.close(); };
const KEY = "abcdefghijklmnopqrstuvwxyz";

test("PE-93: long-operation warning banner explains that nothing has started (status text, not silence)", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["Some text here."] }, keepDefaultScope: true });
  try {
    t.peval(`runAfterLongOperationWarning("audit", () => 1)`);
    await sleep(20);
    assert.equal(t.isHidden("peLongOpWarningBanner"), false);
    assert.match(t.status(), /Waiting for you.*Continue/);
  } finally { await close(t); }
});

test("PE-93: 'Fresh reply' is cleared even when the request fails", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`ProzaEdit.AICache.get = () => null; ProzaEdit.AIProviders.complete = async () => { throw Object.assign(new Error("boom"), { code: "http" }); };
      document.getElementById("apiKey").value = "${KEY}";`);
    t.el("aiFreshReply").checked = true;
    await assert.rejects(() => t.peval(`aiGenerateWithQuota("p", { temperature: 0.5 }, 100)`), /boom/);
    assert.equal(t.el("aiFreshReply").checked, false);
  } finally { await close(t); }
});

test("PE-93: legacy document key with blocked device storage says so (no false 'moved to this device')", async () => {
  const t = await bootTaskpane({ word: {}, mutateWindow: (w) => { Object.defineProperty(w, "localStorage", { get() { throw new Error("blocked"); } }); } });
  try {
    t.peval(`applyUiConfig({ apiKey: "${KEY}" })`);
    assert.match(t.status(), /blocked device storage|paste the key again/);
    assert.ok(!/moved to this device/.test(t.status()));
  } finally { await close(t); }
});

test("PE-93: legacy document key with working storage is moved and reported", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`applyUiConfig({ apiKey: "${KEY}" })`);
    assert.match(t.status(), /moved to this device/);
    assert.equal(t.peval(`ProzaEdit.AIKeys.has("gemini")`), true);
  } finally { await close(t); }
});

test("PE-93: a key remembered in another document is flagged when this document has Remember unticked", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`ProzaEdit.AIKeys.set("gemini", "${KEY}")`);
    t.peval(`applyUiConfig({ rememberApiKey: false })`);
    assert.match(t.status(), /remembered from another document/);
    assert.equal(t.el("apiKey").value, "", "the stored key is not loaded into this document");
  } finally { await close(t); }
});

test("PE-93: daily AI cap uses the local calendar date", () => {
  const P = loadLib("src/taskpane/lib/ai-quota-manager.js");
  const Q = P.AIQuotaManager;
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  assert.equal(Q._today(), `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
});

test("PE-93: double-confirm guard is a clean assertion (second call resolves false immediately, no hang)", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    let shown = 0, release;
    t.window.ProzaEdit.ConfirmDialog.show = () => { shown++; return new Promise((r) => (release = r)); };
    const first = t.peval(`aiConfirmOnce({ message: "x" })`);
    const second = await Promise.race([t.peval(`aiConfirmOnce({ message: "x" })`), sleep(500).then(() => "HUNG")]);
    assert.equal(second, false);
    assert.equal(shown, 1);
    release(true);
    assert.equal(await first, true);
  } finally { await close(t); }
});

test("PE-93: Apply refuses a passage Word search cannot match exactly instead of editing a shortened match", async () => {
  const pe = loadLib("src/taskpane/lib/edit-apply.js", {});
  const nav = loadLib("src/taskpane/lib/word-safe-navigator.js", {});
  const EA = pe.EditApply;
  const sanitize = nav.WordSafeNavigator.sanitizeSearch;
  let searched = 0;
  const deps = { sanitize, searchInScope: async () => { searched++; return []; }, replaceLocation: "Replace" };
  await assert.rejects(() => EA.swapText({ sync: async () => {} }, "x".repeat(300), "y", deps), /Nothing was changed/);
  await assert.rejects(() => EA.swapText({ sync: async () => {} }, "use ^p here", "y", deps), /Nothing was changed/);
  assert.equal(searched, 0);
  await assert.rejects(() => EA.swapText({ sync: async () => {} }, "Really?", "Truly?", deps), /Text not found/);
  assert.equal(searched, 1, "'?' is literal in non-wildcard search and is searched exactly");
});
