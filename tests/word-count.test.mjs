import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

const { Metrics } = loadLib("src/taskpane/lib/text-metrics.js");
const { ManuscriptContextIndex: MCI } = loadLib("src/taskpane/lib/manuscript-context-index.js");

const SAMPLE = "Marcus’s café didn’t open. “Well-known,” she said — naïve 2026 plans.\n\nChapter 2\n\n\n";

test("Metrics.countWords matches Word's rule: whitespace tokens with a letter or digit", () => {
  // Marcus’s café didn’t open. “Well-known,” she said naïve 2026 plans. Chapter 2  -> 12 ("—" alone is not a word)
  assert.equal(Metrics.countWords(SAMPLE), 12);
  assert.equal(Metrics.countWords(""), 0);
  assert.equal(Metrics.countWords(null), 0);
  assert.equal(Metrics.countWords("   \n\t "), 0);
});

test("curly apostrophes and accents no longer split words (old counter said 2 for each)", () => {
  for (const w of ["don’t", "Marcus’s", "naïve", "café", "rock’n’roll"]) assert.equal(Metrics.countWords(w), 1, w);
  assert.equal(Metrics.analyze("I don’t know. She’s naïve.").wordCount, 5);
});

test("blank paragraphs add no words (the old estimate added 42 per paragraph)", () => {
  assert.equal(Metrics.countWords("One.\n\n\n\n\nTwo."), 2);
});

test("book outline section counts use the same rule", () => {
  assert.equal(MCI.wordCount(SAMPLE), Metrics.countWords(SAMPLE));
});
