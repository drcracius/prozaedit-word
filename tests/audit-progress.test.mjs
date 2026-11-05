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
