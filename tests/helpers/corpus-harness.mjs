import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIBS = ["long-operation-controller", "settings-store", "text-metrics", "proper-noun-analyse", "genre-profiles", "lexical-banks", "editor-heuristics", "style-guide-rules", "audit-engine", "genre-checks", "manuscript-overview", "local-coach"];

export function loadEngine() {
  const store = new Map();
  const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const sandbox = { ProzaEdit: {}, AbortController, setTimeout, clearTimeout, localStorage: ls, sessionStorage: ls };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const n of LIBS) {
    const f = `src/taskpane/lib/${n}.js`;
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
  }
  return sandbox.ProzaEdit;
}

const FLAGS = { chkRep: true, chkSpell: true, chkProp: true, mPacing: true, mDialogue: true, mMotivation: true, mPlausibility: true, mSpoiler: true, mPlot: true, mContinuity: true, criticPersona: "Average Reader", targetAudience: "Adult", language: "en-US" };

export function ctxFor(genreValue, extra = {}) {
  return { manuscriptType: genreValue, ...FLAGS, dictionary: [], mutedRules: [], ...extra };
}

/** Findings the user would see in Simple view: everything except low-confidence cards. */
export function simpleFindings(P, text, ctx) {
  return P.Audit.run(text, ctx).suggestions.filter((s) => s.confidence !== "low");
}

/**
 * Score a corpus. Each case: { id, genre (profile id), text, expect: [ruleId prefix], optional }.
 * A visible finding is a true positive iff its ruleId starts with an expected prefix of that case;
 * every other visible finding counts as a false positive.
 */
export function scoreCorpus(P, cases, ctxExtra = {}, { includeLow = false, only = null } = {}) {
  let tp = 0, fp = 0, fn = 0;
  const fpList = [], fnList = [];
  for (const c of cases) {
    const profile = P.Genres.REGISTRY.find((g) => g.id === c.genre);
    const cx = ctxFor(profile.value, { ...ctxExtra, ...(c.ctx || {}) });
    let found = includeLow ? P.Audit.run(c.text, cx).suggestions : simpleFindings(P, c.text, cx);
    const used = new Set();
    if (only) found = found.filter((f) => only.some((o) => String(f.ruleId).startsWith(o)));
    for (const f of found) {
      const hit = (c.expect || []).find((e) => String(f.ruleId).startsWith(e));
      if (hit) { tp++; used.add(hit); } else { fp++; fpList.push(`${c.id}: ${f.ruleId}`); }
    }
    for (const e of c.expect || []) if (!used.has(e)) { fn++; fnList.push(`${c.id}: ${e}`); }
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  return { tp, fp, fn, precision, recall, fpList, fnList };
}
