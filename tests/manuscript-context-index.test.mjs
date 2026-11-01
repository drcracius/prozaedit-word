import test from "node:test";
import assert from "node:assert/strict";
import { loadLibs } from "./load-lib.mjs";

function loadMci() {
  return loadLibs(
    [
      "src/taskpane/lib/proper-noun-analyse.js",
      "src/taskpane/lib/text-metrics.js",
      "src/taskpane/lib/manuscript-overview.js",
      "src/taskpane/lib/continuity-guard.js",
      "src/taskpane/lib/scope-reader.js",
      "src/taskpane/lib/manuscript-context-index.js",
    ],
    { Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } } }
  );
}

test("ManuscriptContextIndex staleness uses paragraph count hash", () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const index = {
    version: 1,
    builtAt: new Date().toISOString(),
    paragraphCountHash: "p120",
    paragraphTotal: 120,
    summary: "ok",
    sections: [],
    nameSeeds: [],
  };
  assert.equal(MCI.isFresh(index, 120), true);
  assert.equal(MCI.isStale(index, 121), true);
  assert.equal(MCI.paragraphCountHash(120), "p120");
});

test("ManuscriptContextIndex summary cap and inject helper", () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const sections = Array.from({ length: 40 }, (_, i) => ({
    index: i + 1,
    title: `Chapter ${i + 1}`,
    wordCount: 900,
    povHint: "third-person",
    firstSnippet: "Opening line with enough words here.",
    lastSnippet: "Closing beat for the section.",
  }));
  const summary = MCI.buildRollingSummary(sections, "Arc: test", 8000);
  assert.ok(summary.length <= 8000);
  const index = MCI.mergeBuiltPayload({
    sections: sections.slice(0, 5),
    sampleText: "Alice met Bob in Austin. Years later they returned.",
    paragraphTotal: 400,
    truncated: false,
    fiction: true,
    dictionary: ["Alice"],
  });
  assert.ok(index.nameSeeds.length >= 1);
  const block = MCI.injectPromptBlock(index, { paragraphTotal: 400, scopeMode: "selected-chapters" });
  assert.match(block, /Full-manuscript context/);
  assert.match(block, /Alice|Bob|Austin/i);
});

test("ManuscriptContextIndex trimForStorage and continuityAugment", () => {
  const { ManuscriptContextIndex: MCI } = loadMci();
  const huge = MCI.mergeBuiltPayload({
    sections: Array.from({ length: 100 }, (_, i) => ({
      index: i + 1,
      title: `S${i}`,
      wordCount: 1000,
      firstSnippet: "x".repeat(120),
      lastSnippet: "y".repeat(120),
    })),
    sampleText: "Name One and Name Two",
    paragraphTotal: 8000,
    truncated: true,
    fiction: false,
    dictionary: [],
  });
  const trimmed = MCI.trimForStorage(huge, 4000);
  assert.ok(trimmed);
  assert.ok(MCI.estimateJsonChars(trimmed) <= 4200);
  const aug = MCI.continuityAugment({ topNames: [{ name: "Zed", count: 2 }], lowerSample: "" }, trimmed);
  assert.ok(aug.topNames.some((n) => n.name === "Zed"));
});

test("ManuscriptContextIndex buildFromDocument cancel mid-build (mock)", async () => {
  const { ManuscriptContextIndex: MCI, ScopeReader } = loadMci();
  const paraTexts = [];
  for (let c = 0; c < 3; c++) {
    paraTexts.push(`Chapter ${c + 1}`);
    for (let p = 0; p < 30; p++) paraTexts.push(`Body paragraph ${c}-${p} with sample prose.`);
  }
  let batch = 0;
  const items = paraTexts.map((text) => ({
    text,
    styleBuiltIn: null,
    load() {},
  }));
  items[0].styleBuiltIn = "Heading1";
  items[31].styleBuiltIn = "Heading1";
  items[62].styleBuiltIn = "Heading1";

  const context = {
    document: {
      body: {
        paragraphs: {
          items,
          load() {},
        },
      },
    },
    sync: async () => {
      batch += 1;
      if (batch >= 2) {
        const err = new Error("Cancelled.");
        err.code = "PE_CANCELLED";
        throw err;
      }
    },
  };

  await assert.rejects(
    () =>
      MCI.buildFromDocument(context, {
        cancelCheck: () => {
          if (batch >= 2) {
            const err = new Error("Cancelled.");
            err.code = "PE_CANCELLED";
            throw err;
          }
        },
        yieldFn: () => Promise.resolve(),
        dictionary: [],
        fiction: true,
      }),
    (e) => e.code === "PE_CANCELLED" || e.message === "Cancelled."
  );

  assert.ok(ScopeReader.planParagraphBatches(paraTexts.length, 40).length >= 2);
});
