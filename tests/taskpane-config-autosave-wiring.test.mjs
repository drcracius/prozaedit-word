import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const taskpanePath = path.join("src", "taskpane", "taskpane.js");

test("setupAutoSaveHandlers persists chatSelectionOnly", () => {
  const src = fs.readFileSync(taskpanePath, "utf8");
  const fnStart = src.indexOf("function setupAutoSaveHandlers()");
  assert.ok(fnStart >= 0, "setupAutoSaveHandlers");
  const slice = src.slice(fnStart, fnStart + 3500);
  const listMatch = slice.match(/\[\s*([\s\S]*?)\]\.forEach\(\(id\) => bind\(getEl\(id\)\)\)/);
  assert.ok(listMatch, "autosave id list before MODULE_IDS bind");
  assert.match(listMatch[1], /"chatSelectionOnly"/);
});

test("setupSafeHandlers persists apiKey when remember is enabled", () => {
  const src = fs.readFileSync(taskpanePath, "utf8");
  assert.match(src, /getEl\("apiKey"\)[\s\S]*addEventListener\("input"/);
  assert.match(src, /remember\.checked[\s\S]*schedulePersistSettings\(\)/);
});

test("collectUiConfig and autosave include batchSectionCount and rewriteMode", () => {
  const src = fs.readFileSync(taskpanePath, "utf8");
  const collectStart = src.indexOf("function collectUiConfig()");
  assert.ok(collectStart >= 0);
  const collectSlice = src.slice(collectStart, collectStart + 4500);
  assert.match(collectSlice, /batchSectionCount:/);
  assert.match(collectSlice, /rewriteMode:/);
  const fnStart = src.indexOf("function setupAutoSaveHandlers()");
  const autosaveSlice = src.slice(fnStart, fnStart + 3500);
  const listMatch = autosaveSlice.match(/\[\s*([\s\S]*?)\]\.forEach\(\(id\) => bind\(getEl\(id\)\)\)/);
  assert.ok(listMatch);
  assert.match(listMatch[1], /"batchSectionCount"/);
  assert.match(listMatch[1], /"rewriteMode"/);
});

test("finalizeAudit surfaces truncation in status bar", () => {
  const src = fs.readFileSync(taskpanePath, "utf8");
  assert.match(src, /sys_trunc[\s\S]*showPeStatus\([\s\S]*truncated at cap/);
});
