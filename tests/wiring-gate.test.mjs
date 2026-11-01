import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkWiring } from "../scripts/verify-wiring.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function makeFixture({ html, js }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pe-wiring-"));
  const pane = path.join(dir, "src", "taskpane");
  fs.mkdirSync(pane, { recursive: true });
  fs.writeFileSync(path.join(pane, "taskpane.html"), html);
  fs.writeFileSync(path.join(pane, "taskpane.js"), js);
  return dir;
}

test("wiring gate: the real task pane has no orphan ids, undefined handlers, duplicates, or missing assets", () => {
  const { problems, stats } = checkWiring(root);
  assert.deepEqual(problems, []);
  assert.ok(stats.ids > 100 && stats.scripts > 20, "gate actually scanned the pane");
});

test("wiring gate: detects duplicate ids, orphan getEl ids, undefined handlers, and missing scripts", () => {
  const dir = makeFixture({
    html: `<div id="a"></div><div id="a"></div><button id="b" onclick="missingFn(); realFn()"></button>
<script src="taskpane.js"></script><script src="lib/gone.js"></script>`,
    js: `function realFn() {}\nconst x = getEl("a");\nconst y = getEl("nope");\n`,
  });
  try {
    const { problems } = checkWiring(dir);
    const text = problems.join("\n");
    assert.match(text, /duplicate id.*#a/);
    assert.match(text, /orphan id.*#nope/);
    assert.match(text, /undefined inline handler.*missingFn/);
    assert.match(text, /missing asset: lib\/gone\.js/);
    assert.doesNotMatch(text, /realFn/);
    assert.doesNotMatch(text, /orphan id.*#a\b/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("wiring gate: ids created in JS templates and member calls in handlers are accepted", () => {
  const dir = makeFixture({
    html: `<button onclick="ProzaEdit.Foo.bar(); this.blur(); if (x) { realFn(); }"></button><script src="taskpane.js"></script>`,
    js: `function realFn() {}\nbox.innerHTML = '<span id="made">x</span>';\ngetEl("made");\n`,
  });
  try {
    assert.deepEqual(checkWiring(dir).problems, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
