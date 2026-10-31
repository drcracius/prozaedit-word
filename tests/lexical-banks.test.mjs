import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("LexicalBanks exports non-empty shared lists", () => {
  const pe = loadLib("src/taskpane/lib/lexical-banks.js");
  const banks = pe.LexicalBanks;
  assert.ok(Array.isArray(banks.PLEONASMS) && banks.PLEONASMS.length > 5);
  assert.ok(Array.isArray(banks.AI_PHRASES) && banks.AI_PHRASES.includes("delve"));
  assert.ok(Array.isArray(banks.WORDINESS));
  assert.ok(banks.VIVID_VERB_MAP && typeof banks.VIVID_VERB_MAP === "object");
});
