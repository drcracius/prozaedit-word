import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIBS = [
  "settings-store",
  "text-metrics",
  "proper-noun-analyse",
  "genre-profiles",
  "lexical-banks",
  "editor-heuristics",
  "style-guide-rules",
  "genre-checks",
  "audit-engine",
];

function loadAudit() {
  const sandbox = { ProzaEdit: {}, setTimeout, clearTimeout, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const n of LIBS) {
    const f = `src/taskpane/lib/${n}.js`;
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
  }
  return sandbox.ProzaEdit.Audit;
}

const ctx = {
  manuscriptType: "Fiction (General)",
  chkRep: true,
  chkSpell: true,
  chkProp: false,
  mPlot: false,
  dictionary: [],
  mutedRules: [],
  targetAudience: "Adult",
};

test("Audit.runWithProgress reports enabled checks in order and can stop early", async () => {
  const Audit = loadAudit();
  const seen = [];
  let stop = false;
  await assert.rejects(
    () =>
      Audit.runWithProgress("He was very tired and the the cat sat.", ctx, {
        onPhase: (p) => {
          if (p.state === "start") seen.push(p.label);
        },
        yieldFn: async () => {
          if (seen.length >= 2) stop = true;
        },
        cancelled: () => stop,
      }),
    (e) => e.code === "PE_CANCELLED" && e.partial && e.partial.stoppedEarly && e.partial.completedPhaseIds.length >= 1
  );
  assert.deepEqual(seen.slice(0, 2), ["Repetition", "Proofreading"]);
});

test("Audit.run and runWithProgress agree when nothing is cancelled", async () => {
  const Audit = loadAudit();
  const text = "He was very tired. She said that it was nice.";
  const syncIds = Audit.run(text, ctx).suggestions.map((s) => s.ruleId).sort();
  const asyncIds = (await Audit.runWithProgress(text, ctx, {})).suggestions.map((s) => s.ruleId).sort();
  assert.deepEqual(asyncIds, syncIds);
});

test("A house rule wins when it names the same phrase as a built-in check", () => {
  const Audit = loadAudit();
  const kept = Audit._dedupe([
    {
      ruleId: "sg:plain:email",
      type: "preference",
      confidence: "high",
      targetText: "e-mail",
      replacementText: "email",
    },
    {
      ruleId: "sg:custom:email",
      type: "confirmed",
      confidence: "medium",
      targetText: "E-mail",
      replacementText: "email",
    },
  ]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].ruleId, "sg:custom:email");
  const spellingKept = Audit._dedupe([
    {
      ruleId: "sg:custom:email",
      type: "preference",
      confidence: "medium",
      targetText: "email",
      replacementText: "e-mail",
    },
    {
      ruleId: "spell:email",
      type: "confirmed",
      confidence: "high",
      targetText: "email",
      replacementText: "e-mail",
    },
  ]);
  assert.equal(spellingKept.length, 2);
  const shortHouse = Audit._dedupe([
    { ruleId: "sg:custom:a", type: "preference", confidence: "high", targetText: "a", replacementText: "the" },
    { ruleId: "sg:plain:a_number", type: "confirmed", confidence: "medium", targetText: "a", replacementText: "one" },
  ]);
  assert.equal(shortHouse.length, 2);
  const curly = Audit._dedupe([
    { ruleId: "sg:custom:dont", type: "confirmed", confidence: "medium", targetText: "don't", replacementText: "do not" },
    { ruleId: "sg:plain:dont", type: "preference", confidence: "high", targetText: "don\u2019t", replacementText: "do not" },
  ]);
  assert.equal(curly.length, 1);
  assert.equal(curly[0].ruleId, "sg:custom:dont");
  const aligned = Audit._alignToDocumentCase(
    { targetText: "don't", replacementText: "do not" },
    "I don\u2019t know",
    "i don't know"
  );
  assert.equal(aligned.targetText, "don\u2019t");
  const laterExact = Audit._alignToDocumentCase(
    { targetText: "in order to", replacementText: "to" },
    "In order to start. Later in order to finish.",
    "in order to start. later in order to finish."
  );
  assert.equal(laterExact.targetText, "in order to");
  assert.equal(laterExact.replacementText, "to");
  const buried = Audit._alignToDocumentCase(
    { targetText: "orbs", replacementText: "spheres" },
    "absorbs light. Orbs glow.",
    "absorbs light. orbs glow."
  );
  assert.equal(buried.targetText, "Orbs");
  assert.equal(buried.replacementText, "Spheres");
  const longA = `${"a".repeat(80)} one`;
  const longB = `${"a".repeat(80)} two`;
  const longKept = Audit._dedupe([
    { ruleId: "sg:plain:a", type: "preference", confidence: "medium", targetText: longA, replacementText: "x" },
    { ruleId: "sg:plain:b", type: "preference", confidence: "medium", targetText: longB, replacementText: "y" },
  ]);
  assert.equal(longKept.length, 2);
  const stopword = Audit._dedupe([
    { ruleId: "sg:custom:the", type: "preference", confidence: "high", targetText: "the", replacementText: "a" },
    { ruleId: "sg:plain:the", type: "confirmed", confidence: "medium", targetText: "the", replacementText: "a" },
  ]);
  assert.equal(stopword.length, 2);
});
