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

test("ScopeReader.lastLayoutPageWithText ignores blank layout pages", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  const pages = [
    { index: 1, text: "About one hundred twenty words here." },
    { index: 2, text: "   " },
    { index: 18, text: "" },
  ];
  assert.equal(ScopeReader.lastLayoutPageWithText(pages), 1);
});

test("ScopeReader.estimatePagesFromWords", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  assert.equal(ScopeReader.estimatePagesFromWords(0), 0);
  assert.equal(ScopeReader.estimatePagesFromWords(120), 1);
  assert.equal(ScopeReader.estimatePagesFromWords(500), 2);
});

test("ScopeReader.layoutPagesAvailable is false on Word on the web", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js", {
    Office: {
      context: { platform: "OfficeOnline", requirements: { isSetSupported: () => true } },
      PlatformType: { OfficeOnline: "OfficeOnline" },
    },
  });
  assert.equal(ScopeReader.layoutPagesAvailable(), false);
});

test("ScopeReader.capPageRange clamps to document max", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  eqArr(ScopeReader.capPageRange(1, 18, 1), { from: 1, to: 1 });
  eqArr(ScopeReader.capPageRange(3, 5, 0), { from: 3, to: 5 });
});

test("ScopeReader.capChapterRange clamps to chapter list", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  eqArr(ScopeReader.capChapterRange(1, 9, 3), { from: 1, to: 3 });
});

test("ScopeReader.readByChapter clamps chapter number to chapterCount", async () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js", {
    Word: { Style: { heading1: "H1", heading2: "H2", heading3: "H3" } },
  });
  const chapters = [
    { index: 1, title: "a", startPara: 0, endPara: 0 },
    { index: 2, title: "b", startPara: 1, endPara: 1 },
    { index: 3, title: "c", startPara: 2, endPara: 2 },
  ];
  const texts = ["a", "b", "c"];
  const items = texts.map((text) => ({ text, load() {} }));
  const context = {
    document: { body: { paragraphs: { items, load() {} } } },
    sync: async () => {},
  };
  const r = await ScopeReader.readByChapter(context, 18, chapters, { chapterCount: 3 });
  assert.match(r.label, /Ch\. 3: c/);
  assert.equal(r.text.trim(), "c");
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
