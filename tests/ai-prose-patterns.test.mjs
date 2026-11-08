import test from "node:test";
import assert from "node:assert/strict";
import { loadLib, loadLibs } from "./load-lib.mjs";

const fiction = { manuscriptType: "Fiction (Thriller / Suspense)", _genre: { profile: { family: "fiction" } } };

test("stacked isn't-just pairs are flagged; one triad and thriller punches are not", () => {
  const { AiProsePatterns } = loadLib("src/taskpane/lib/ai-prose-patterns.js");
  const text =
    "The job isn't just a robbery. It is a message to the mayor. Later the street isn't just quiet. It is wrong, and he knew it. " +
    "He checked the lock, the alley, and the car. He stopped. She turned. Nobody moved. Then he walked to the river with the case.";
  const rows = AiProsePatterns.scan(text, fiction);
  assert.ok(rows.some((r) => r.ruleId === "ai:pattern:not-just"));
  assert.equal(rows.some((r) => r.ruleId === "ai:pattern:rule-of-three"), false);
  assert.equal(rows.some((r) => r.ruleId === "ai:pattern:fragment-stack"), false);
});

test("back-to-back triads, noun piles, and essay frames are flagged; quoted speech is not", () => {
  const { AiProsePatterns } = loadLib("src/taskpane/lib/ai-prose-patterns.js");
  const text =
    'He wanted speed, silence, and cash before dawn. She wanted time, cover, and proof before the bank opened. Blood. Glass. Silence. "This isn\'t just a job. It is a war," she said. Let\'s dive in.';
  const rows = AiProsePatterns.scan(text, fiction);
  assert.ok(rows.some((r) => r.ruleId === "ai:pattern:rule-of-three"));
  assert.ok(rows.some((r) => r.ruleId === "ai:pattern:fragment-stack"));
  assert.ok(rows.some((r) => r.ruleId === "ai:pattern:essay-frame"));
  assert.equal(rows.some((r) => r.ruleId === "ai:pattern:not-just"), false);
});

test("a sense of dread is not a soft ending; the empty bookend is", () => {
  const { AiProsePatterns } = loadLib("src/taskpane/lib/ai-prose-patterns.js");
  const dread =
    "A sense of dread sat in the stairwell while he counted the doors and waited for the elevator to open on the wrong floor.";
  assert.equal(AiProsePatterns.scan(dread, fiction).some((r) => r.ruleId === "ai:pattern:soft-ending"), false);
  const bookend =
    "He stood at the window for a long time and wondered what the future held as the city went dark beyond the river.";
  assert.ok(AiProsePatterns.scan(bookend, fiction).some((r) => r.ruleId === "ai:pattern:soft-ending"));
});

test("cadence drops fillers and leaves the verb", () => {
  const { LocalRewrite } = loadLibs([
    "src/taskpane/lib/lexical-banks.js",
    "src/taskpane/lib/ai-prose-patterns.js",
    "src/taskpane/lib/local-rewrite.js",
  ]);
  const out = LocalRewrite.cadence("Moreover, let's dive in. It is important to note that the door was open.");
  assert.equal(/moreover/i.test(out), false);
  assert.equal(/dive in/i.test(out), false);
  assert.equal(/important to note/i.test(out), false);
  assert.match(out, /door was open/i);
});
