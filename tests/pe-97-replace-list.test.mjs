import assert from "node:assert/strict";
import test from "node:test";
import { loadLib } from "./load-lib.mjs";

test("replace list parses arrows, tabs, deletions, and notes", () => {
  const R = loadLib("src/taskpane/lib/replace-list.js").ReplaceList;
  const parsed = R.parse("colour => color\n# note\n\n" + "same\tsame\n" + "beta\tgamma\nOK -> ok\nremove =>\nbad line");
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.pairs.map((p) => [p.find, p.replace]))), [
    ["colour", "color"],
    ["beta", "gamma"],
    ["OK", "ok"],
    ["remove", ""],
  ]);
  assert.equal(parsed.errors.length, 1);
  assert.match(parsed.errors[0], /Line 8/);
});

test("replace list stops at the pair cap", () => {
  const R = loadLib("src/taskpane/lib/replace-list.js").ReplaceList;
  const lines = Array.from({ length: R.MAX_PAIRS + 2 }, (_, i) => `word${i} => word${i}x`).join("\n");
  const parsed = R.parse(lines);
  assert.equal(parsed.pairs.length, R.MAX_PAIRS);
  assert.ok(parsed.errors.some((e) => /at most/.test(e)));
});

test("page reading stays on the estimate when Word's layout API is absent", () => {
  const S = loadLib("src/taskpane/lib/scope-reader.js").ScopeReader;
  assert.equal(S.layoutPagesAvailable(), false);
});
