import test from "node:test";
import assert from "node:assert/strict";
import { loadLibs } from "./load-lib.mjs";

function load() {
  return loadLibs(["src/taskpane/lib/edit-passes.js", "src/taskpane/lib/audit-engine.js"]);
}

test("passes run structure before dialogue before line before copyedit", () => {
  const { EditPasses } = load();
  const steps = EditPasses.sortSteps([
    { id: "chkSpell" },
    { id: "mDialogue" },
    { id: "chkAI" },
    { id: "mPlot" },
  ]);
  assert.deepEqual(
    steps.map((s) => s.id),
    ["mPlot", "mDialogue", "chkAI", "chkSpell"]
  );
});

test("deep-check prompts diagnose and refuse a rewrite except a small copyedit", () => {
  const { EditPasses } = load();
  const structure = EditPasses.diagnosisInstruction("structure");
  assert.match(structure, /causality/i);
  assert.match(structure, /do not rewrite/i);
  assert.match(structure, /hook/i);
  const dialogue = EditPasses.diagnosisInstruction("dialogue");
  assert.match(dialogue, /without tags/i);
  assert.match(dialogue, /on-the-nose/i);
  const line = EditPasses.diagnosisInstruction("line");
  assert.match(line, /filter words/i);
  const copy = EditPasses.diagnosisInstruction("copyedit");
  assert.match(copy, /Do not change vocabulary/i);
  const all = EditPasses.diagnosisInstruction("all");
  assert.match(all, /PASS 1/);
  assert.match(all, /PASS 4/);
});

test("structure pass leaves copyedit off", () => {
  const { EditPasses } = load();
  const flags = EditPasses.presetFlags("structure", true);
  assert.equal(flags.mPlot, true);
  assert.equal(flags.chkSpell, false);
  assert.equal(flags.mDialogue, false);
  assert.equal(EditPasses.presetFlags("all", true), null);
});

test("structure, dialogue, and line notes quote the page and do not rewrite", () => {
  const { EditPasses } = load();
  const cards = [];
  const push = (row) => cards.push(row);
  const scene =
    "He had no choice as luck would have it. She felt angry and walked quickly toward the door. " +
    '"I feel angry," she said, and the street stayed empty for a long beat after that.';
  EditPasses.structureNotes(scene, push);
  EditPasses.dialogueNotes(scene, push);
  EditPasses.lineNotes(scene, push);
  assert.ok(cards.some((c) => c.ruleId === "pass1:passive-hero"));
  assert.ok(cards.some((c) => c.ruleId === "pass1:coincidence"));
  assert.ok(cards.some((c) => c.ruleId === "pass2:on-the-nose"));
  assert.ok(cards.some((c) => c.ruleId === "pass3:named-emotion"));
  assert.ok(cards.some((c) => c.ruleId === "pass3:weak-adverb"));
  cards.forEach((c) => assert.match(c.replacementText, /your revision/));
});
