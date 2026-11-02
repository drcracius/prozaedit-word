import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("WordSafeNavigator.sanitizeSearch strips caret codes and caps length", () => {
  const pe = loadLib("src/taskpane/lib/word-safe-navigator.js");
  const { sanitizeSearch } = pe.WordSafeNavigator;
  assert.equal(sanitizeSearch("  hello^pworld?  "), "hellopworld?");
  assert.equal(sanitizeSearch("a\nb\rc"), "a b c");
  const long = "x".repeat(300);
  assert.equal(sanitizeSearch(long).length, 255);
  assert.equal(sanitizeSearch(""), "");
});
