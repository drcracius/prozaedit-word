import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

function eqArr(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

test("ScopeReader.expandRangeToIndices", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  eqArr(ScopeReader.expandRangeToIndices(3, 5), [3, 4, 5]);
  eqArr(ScopeReader.expandRangeToIndices(5, 2), [2, 3, 4, 5]);
});

test("ScopeReader.normalizeSelectedChapterIndices dedupes and bounds", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  const chapters = [{ index: 1 }, { index: 7 }, { index: 10 }];
  eqArr(ScopeReader.normalizeSelectedChapterIndices([2, 7, 2, 99, 0], chapters), [7]);
  eqArr(ScopeReader.normalizeSelectedChapterIndices([1, 7, 10], chapters), [1, 7, 10]);
  eqArr(ScopeReader.normalizeSelectedChapterIndices(null, chapters), []);
  eqArr(ScopeReader.normalizeSelectedChapterIndices([1, 2, 3], []), []);
});

test("ScopeReader.migrateLegacyChapterScope", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  const single = ScopeReader.migrateLegacyChapterScope({
    scope: "chapter",
    scopeChapterSingle: "4",
  });
  assert.equal(single.scope, "selected-chapters");
  eqArr(single.selectedChapterIndices, [4]);

  const range = ScopeReader.migrateLegacyChapterScope({
    scope: "chapter-range",
    scopeChapterFrom: "2",
    scopeChapterTo: "4",
  });
  assert.equal(range.scope, "selected-chapters");
  eqArr(range.selectedChapterIndices, [2, 3, 4]);

  const kept = ScopeReader.migrateLegacyChapterScope({
    scope: "selected-chapters",
    selectedChapterIndices: [1, 5],
  });
  eqArr(kept.selectedChapterIndices, [1, 5]);
});

test("ScopeReader.formatSelectedChaptersLabel", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  const chapters = [
    { index: 1, title: "Opening" },
    { index: 2, title: "Middle" },
    { index: 7, title: "Finale" },
  ];
  assert.match(ScopeReader.formatSelectedChaptersLabel([2], chapters), /Ch\. 2/);
  assert.equal(ScopeReader.formatSelectedChaptersLabel([2, 7], chapters), "Ch.2 + Ch.7");
  assert.equal(ScopeReader.formatSelectedChaptersLabel([], chapters), "no chapters selected");
});
