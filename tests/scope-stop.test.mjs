import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

function fakeContext(paragraphs) {
  const items = paragraphs.map((text) => ({ text, load() {} }));
  return {
    document: { body: { paragraphs: { items, load() {} } } },
    sync: async () => {},
  };
}

test("chunked full read sets stoppedEarly when the character cap is hit", async () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  const context = fakeContext(["aaaa", "bbbb", "cccc"]);
  const read = await ScopeReader.readBodyTextChunked(context, { maxChars: 6, chunkSize: 1 });
  assert.equal(read.stoppedEarly, true);
  assert.ok(read.text.length <= 6);
});

test("chunked full read finishes when the text is under the cap", async () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  const context = fakeContext(["Hello", "world"]);
  const read = await ScopeReader.readBodyTextChunked(context, { maxChars: 500, chunkSize: 2 });
  assert.equal(read.stoppedEarly, false);
  assert.match(read.text, /Hello/);
  assert.match(read.text, /world/);
});

test("word budgets still map to the character safety caps", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  assert.equal(ScopeReader.WORD_BUDGETS.full * ScopeReader.CHARS_PER_WORD, ScopeReader.LIMITS.full);
  assert.equal(ScopeReader.CHARS_PER_PAGE, ScopeReader.WORDS_PER_PAGE * ScopeReader.CHARS_PER_WORD);
  assert.equal(ScopeReader.getLimit("full"), 450000);
});
