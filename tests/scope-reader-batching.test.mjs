import test from "node:test";
import assert from "node:assert";
import { loadLib } from "./load-lib.mjs";

test("ScopeReader.planParagraphBatches", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  assert.deepEqual(ScopeReader.planParagraphBatches(0, 40), []);
  assert.deepEqual(ScopeReader.planParagraphBatches(3, 40), [{ start: 0, end: 2 }]);
  assert.deepEqual(ScopeReader.planParagraphBatches(40, 40), [{ start: 0, end: 39 }]);
  assert.deepEqual(ScopeReader.planParagraphBatches(41, 40), [
    { start: 0, end: 39 },
    { start: 40, end: 40 },
  ]);
});

test("ScopeReader.readBodyTextChunked respects cancel between batches", async () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  let syncCount = 0;
  const items = Array.from({ length: 5 }, (_, i) => ({
    text: `p${i}`,
    load() {},
  }));
  const context = {
    document: {
      body: {
        paragraphs: {
          items,
          load(prop) {
            if (prop === "items") return;
            throw new Error(`unexpected load ${prop}`);
          },
        },
      },
    },
    sync: async () => {
      syncCount += 1;
    },
  };
  let batchesSeen = 0;
  await assert.rejects(
    () =>
      ScopeReader.readBodyTextChunked(context, {
        chunkSize: 2,
        cancelCheck: () => {
          batchesSeen += 1;
          if (batchesSeen >= 2) {
            const err = new Error("Cancelled.");
            err.code = "PE_CANCELLED";
            throw err;
          }
        },
      }),
    /Cancelled/
  );
  assert.ok(syncCount >= 2, "expected at least two sync rounds before cancel");
});

test("ScopeReader.microYield resolves", async () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  await ScopeReader.microYield();
  assert.equal(typeof ScopeReader.microYield(), "object");
});
