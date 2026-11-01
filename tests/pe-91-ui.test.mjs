import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { analyze, ratio } from "../scripts/check-contrast.mjs";

async function settleClose(t) {
  await sleep(80);
  t.close();
}

test("PE-91: every CSS text/background pair meets WCAG AA (4.5:1) in light and dark themes", () => {
  const res = analyze();
  assert.ok(res.checked > 300, `checked ${res.checked}`);
  assert.deepEqual(res.fails, []);
  assert.ok(ratio([0, 0, 0], [255, 255, 255]) > 20.9);
});

test("PE-91: focus is visible by default and tab order is natural (no positive tabindex)", () => {
  const css = fs.readFileSync("src/taskpane/taskpane.css", "utf8");
  assert.match(css, /:where\(button, \[role="button"\][\s\S]*?:focus-visible\s*\{\s*outline: 2px solid/);
  const html = fs.readFileSync("src/taskpane/taskpane.html", "utf8");
  assert.doesNotMatch(html, /tabindex="[1-9]/);
  for (let n = 1; n <= 7; n++) {
    assert.match(html, new RegExp(`id="peTabBtn${n}"[^>]*aria-controls="tab${n}"`));
    assert.match(html, new RegExp(`id="tab${n}"[^>]*role="tabpanel"[^>]*aria-labelledby="peTabBtn${n}"`));
  }
});

test("PE-91: thesaurus never invents synonyms offline, keeps case, handles accents", async () => {
  const t = await bootTaskpane({ word: {}, fetch: () => Promise.reject(new Error("offline")) });
  try {
    await t.peval(`renderThesaurus("Happy", document.getElementById("thesaurusResults"))`);
    const box = t.el("thesaurusResults");
    assert.match(box.textContent, /Could not reach/);
    assert.equal(box.querySelectorAll(".tag").length, 0);
    assert.doesNotMatch(box.textContent, /sharp/);
  } finally {
    await settleClose(t);
  }
  const ok = (words) => () => Promise.resolve({ ok: true, json: async () => words.map((word) => ({ word })) });
  const t2 = await bootTaskpane({ word: {}, fetch: ok(["glad", "joyful"]) });
  try {
    await t2.peval(`renderThesaurus("Happy ending", document.getElementById("thesaurusResults"))`);
    const tags = [...t2.el("thesaurusResults").querySelectorAll(".tag")];
    assert.deepEqual(tags.map((x) => x.dataset.replacement).slice(0, 2), ["Glad", "Joyful"]);
    assert.equal(tags[0].dataset.target, "Happy");
    assert.equal(tags[0].getAttribute("role"), "button");
    assert.match(t2.el("thesaurusResults").textContent, /first word/);
    await t2.peval(`renderThesaurus("café", document.getElementById("thesaurusResults"))`);
    assert.match(t2.el("thesaurusResults").querySelector("strong").textContent, /^café$/);
    assert.equal(t2.peval(`matchWordCase("HAPPY", "glad")`), "GLAD");
  } finally {
    await settleClose(t2);
  }
  const t3 = await bootTaskpane({ word: {}, fetch: ok([]) });
  try {
    await t3.peval(`renderThesaurus("zzzz", document.getElementById("thesaurusResults"))`);
    assert.match(t3.el("thesaurusResults").textContent, /No synonyms found/);
  } finally {
    await settleClose(t3);
  }
});

test("PE-91: thesaurus suggestion chips are keyboard operable", async () => {
  const t = await bootTaskpane({ word: {}, fetch: () => Promise.resolve({ ok: true, json: async () => [{ word: "glad" }] }) });
  try {
    t.peval(`window.__rw = []; replaceWithWord = (a, b) => window.__rw.push([a, b]);`);
    await t.peval(`renderThesaurus("happy", document.getElementById("thesaurusResults"))`);
    t.peval(`setupThesaurusDelegation()`);
    const tag = t.el("thesaurusResults").querySelector(".tag");
    tag.dispatchEvent(new t.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    assert.equal(JSON.stringify(t.window.__rw), '[["happy","glad"]]');
  } finally {
    await settleClose(t);
  }
});

test("PE-91: 'fresh reply' bypasses the AI cache once, then returns to caching", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`window.__calls = 0;
      ProzaEdit.AICache.get = () => ({ text: "old" });
      ProzaEdit.AICache.set = () => true;
      ProzaEdit.AIProviders.complete = async () => { window.__calls++; return { text: "new", usage: null }; };
      document.getElementById("apiKey").value = "abcdefghijklmnopqrstuvwxyz";`);
    assert.equal(await t.peval(`aiGenerateWithQuota("p", { temperature: 0.5 }, 100)`), "old");
    assert.equal(t.window.__calls, 0);
    t.el("aiFreshReply").checked = true;
    assert.equal(await t.peval(`aiGenerateWithQuota("p", { temperature: 0.5 }, 100)`), "new");
    assert.equal(t.window.__calls, 1);
    assert.equal(t.el("aiFreshReply").checked, false);
    assert.equal(await t.peval(`aiGenerateWithQuota("p", { temperature: 0.5 }, 100)`), "old");
  } finally {
    await settleClose(t);
  }
});
