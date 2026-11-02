// PE-96: keyboard and screen-reader semantics on the live task pane markup.
import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane } from "./helpers/taskpane-harness.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("PE-96 a11y: ids are unique, no positive tabindex, every control has an accessible name", async () => {
  const t = await bootTaskpane({});
  await t.settle();
  const d = t.document;
  const ids = [...d.querySelectorAll("[id]")].map((e) => e.id);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
  assert.deepEqual([...d.querySelectorAll("[tabindex]")].filter((e) => Number(e.getAttribute("tabindex")) > 0).map((e) => e.id || e.className), []);
  const nameOf = (e) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").trim() || (e.id && d.querySelector(`label[for="${e.id}"]`)?.textContent.trim()) || e.getAttribute("aria-labelledby");
  const unnamedButtons = [...d.querySelectorAll("button")].filter((b) => !nameOf(b)).map((b) => b.id || b.className);
  assert.deepEqual(unnamedButtons, []);
  const unlabelled = [...d.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea")].filter((e) => !(e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.id && d.querySelector(`label[for="${e.id}"]`)) || e.closest("label") || e.getAttribute("title"))).map((e) => e.id || e.name);
  assert.deepEqual(unlabelled, []);
  await sleep(80);
  t.close();
});

test("PE-96 a11y: custom clickable elements are keyboard reachable and every aria-labelledby/for target exists", async () => {
  const t = await bootTaskpane({});
  await t.settle();
  const d = t.document;
  const bad = [...d.querySelectorAll("[role=button]")].filter((e) => !["BUTTON", "A"].includes(e.tagName) && e.getAttribute("tabindex") == null).map((e) => e.id || e.className);
  assert.deepEqual(bad, []);
  const missing = [];
  d.querySelectorAll("[aria-labelledby],[aria-describedby],[aria-controls]").forEach((e) => {
    for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) (e.getAttribute(attr) || "").split(/\s+/).filter(Boolean).forEach((id) => { if (!d.getElementById(id)) missing.push(`${attr}=${id}`); });
  });
  assert.deepEqual(missing, []);
  d.querySelectorAll("label[for]").forEach((l) => { if (!d.getElementById(l.getAttribute("for"))) missing.push(`for=${l.getAttribute("for")}`); });
  assert.deepEqual(missing, []);
  await sleep(80);
  t.close();
});

test("PE-96 a11y: status regions announce politely and images are not unlabelled content", async () => {
  const t = await bootTaskpane({});
  await t.settle();
  const d = t.document;
  const live = [...d.querySelectorAll("[aria-live],[role=status],[role=alert]")];
  assert.ok(live.length >= 2);
  assert.deepEqual(live.filter((e) => e.getAttribute("aria-live") === "assertive" && e.getAttribute("role") !== "alert").map((e) => e.id), []);
  assert.deepEqual([...d.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).map((i) => i.src), []);
  assert.deepEqual([...d.querySelectorAll("svg")].filter((s) => !s.getAttribute("aria-hidden") && !s.getAttribute("aria-label") && !s.querySelector("title") && !s.getAttribute("role")).length, 0);
  await sleep(80);
  t.close();
});

test("PE-96 empty state: running the audit on an empty document says so plainly and does not throw", async () => {
  const t = await bootTaskpane({ paragraphs: [""] });
  await t.settle();
  const btn = t.document.getElementById("btnRunAudit");
  assert.ok(btn);
  btn.click();
  await sleep(400);
  assert.deepEqual(t.errors, []);
  const st = (t.document.getElementById("peStatus") || t.document.querySelector("[role=status]")).textContent;
  assert.doesNotMatch(st, /undefined|NaN|\[object/);
  await sleep(80);
  t.close();
});

test("PE-96 first-run copy: no pre-filled setting leaks into AI prompts and no developer jargon in visible labels", async () => {
  const t = await bootTaskpane({});
  await t.settle();
  const d = t.document;
  assert.equal(d.getElementById("settingAnchor").value, "");
  const text = d.body.textContent;
  for (const jargon of [/Phase \d/, /Zipf/, /Section loop/, /\bTODO\b/, /\bundefined\b/, /\[object/]) assert.doesNotMatch(text, jargon);
  await sleep(80);
  t.close();
});
