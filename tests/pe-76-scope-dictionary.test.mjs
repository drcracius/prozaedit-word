import test from "node:test";
import assert from "node:assert/strict";
import { loadLib, loadLibs } from "./load-lib.mjs";

test("ScopeReader.formatReadStatus includes paragraph progress and soft cap hint", () => {
  const { ScopeReader } = loadLib("src/taskpane/lib/scope-reader.js");
  assert.ok(ScopeReader);
  const soft = ScopeReader.softCapThreshold(100000);
  assert.equal(soft, 85000);
  const msg = ScopeReader.formatReadStatus({
    phase: "Reading document",
    paragraphsLoaded: 120,
    paragraphTotal: 400,
    charCount: 90000,
    charCap: 100000,
  });
  assert.match(msg, /120\/400 paragraphs/);
  assert.match(msg, /approaching 100,000 cap/i);
});

test("ScopeReader scope resume snapshot round-trip", () => {
  const store = {};
  const sessionStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
  const pe = loadLib("src/taskpane/lib/scope-reader.js", { sessionStorage });
  const { ScopeReader } = pe;
  ScopeReader.writeScopeResumeSnapshot({ mode: "selected-chapters", paragraphsLoaded: 50, paragraphTotal: 200 });
  const snap = ScopeReader.readScopeResumeSnapshot();
  assert.equal(snap.mode, "selected-chapters");
  assert.equal(snap.paragraphsLoaded, 50);
  ScopeReader.clearScopeResumeSnapshot();
  assert.equal(ScopeReader.readScopeResumeSnapshot(), null);
});

test("AuditReview.planCardRenderBatches for cooperative cancel slices", () => {
  const pe = loadLib("src/taskpane/lib/audit-review-helpers.js");
  const { AuditReview } = pe;
  assert.equal(AuditReview.planCardRenderBatches(0, 25).length, 0);
  const small = AuditReview.planCardRenderBatches(3, 25);
  assert.equal(small.length, 1);
  assert.equal(small[0].start, 0);
  assert.equal(small[0].end, 2);
  const large = AuditReview.planCardRenderBatches(26, 25);
  assert.equal(large.length, 2);
  assert.equal(large[1].end, 25);
});

test("Audit.run applies dictionary before proper-noun findings", () => {
  const pe = loadLibs(
    [
      "src/taskpane/lib/proper-noun-analyse.js",
      "src/taskpane/lib/text-metrics.js",
      "src/taskpane/lib/settings-store.js",
      "src/taskpane/lib/editor-heuristics.js",
      "src/taskpane/lib/style-guide-rules.js",
      "src/taskpane/lib/audit-engine.js",
    ],
    {
      Office: { context: { document: { settings: { get: () => null, set() {}, saveAsync(cb) { cb({ status: "succeeded" }); } } } } },
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    }
  );
  const Audit = pe.Audit;
  assert.ok(Audit?.run, "Audit module should load");

  const text = "John went to Paris. john went again.";
  const withDict = Audit.run(text, {
    chkProp: true,
    dictionary: ["John"],
    mutedRules: [],
    manuscriptType: "Fiction",
  });
  const johnFindings = withDict.suggestions.filter((s) => /john/i.test(s.targetText || ""));
  assert.equal(johnFindings.length, 0, "dictionary should suppress proper-noun flags for John");

  const mutedId = "edit:dup1:the:12";
  const muted = Audit.run("the the cat sat.", {
    chkRep: true,
    mutedRules: [mutedId],
    manuscriptType: "Non-fiction",
  });
  assert.ok(!muted.suggestions.some((s) => s.ruleId === mutedId));
});

test("Settings import/export dictionary JSON", async () => {
  const bag = {};
  const Office = {
    AsyncResultStatus: { Succeeded: "succeeded" },
    context: {
      document: {
        settings: {
          get(key) {
            return bag[key];
          },
          set(key, value) {
            bag[key] = value;
          },
          saveAsync(cb) {
            cb({ status: Office.AsyncResultStatus.Succeeded });
          },
        },
      },
    },
  };
  const { Settings } = loadLib("src/taskpane/lib/settings-store.js", { Office, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
  await Settings.addDictionaryWord("Alpha");
  const exported = Settings.exportDictionaryJson();
  assert.match(exported, /Alpha/);
  const result = await Settings.importDictionaryJson('["Alpha","Beta"]');
  assert.equal(result.added, 1);
  assert.equal(result.total, 2);
  assert.equal(Settings.getDictionary().length, 2);
  assert.ok(Settings.getDictionary().includes("Beta"));
});
