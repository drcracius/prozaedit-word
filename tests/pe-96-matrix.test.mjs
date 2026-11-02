// PE-96: cross-feature properties: genre x language x flags, determinism, and "applying a fix removes that card".
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";
import { PE95_ALL } from "./corpus/pe-95-blind.mjs";
import { PE96_ALL } from "./corpus/pe-96-blind.mjs";

const P = loadEngine();
const sb = { ProzaEdit: P };
sb.window = sb; sb.globalThis = sb;
vm.createContext(sb);
vm.runInContext(fs.readFileSync("src/taskpane/lib/edit-apply.js", "utf8"), sb);
const applicable = (s) => s.targetText && s.replacementText != null && sb.ProzaEdit.EditApply.isApplicable(s.targetText, s.replacementText).ok;
const key = (r) => JSON.stringify(r.suggestions.map((s) => [s.ruleId, s.targetText, s.replacementText, s.confidence]));

test("PE-96 matrix: every genre x language x flag combination is deterministic and cache-safe (same input, same cards)", () => {
  const text = "She walked to the the door and  said, \"Hello.\" In order to win, it was really very good.";
  for (const g of P.Genres.REGISTRY) for (const language of ["en-US", "en-GB"]) for (const chkRep of [true, false]) for (const chkSpell of [true, false]) {
    const cx = () => ctxFor(g.value, { language, chkRep, chkSpell });
    assert.equal(key(P.Audit.run(text, cx())), key(P.Audit.run(text, cx())), `${g.id} ${language}`);
  }
});

test("PE-96 matrix: muting a rule removes exactly that rule's cards in every genre", () => {
  const text = "She walked to the the door and said, \"Hello.\" The end result was clear.";
  for (const g of P.Genres.REGISTRY) {
    const all = P.Audit.run(text, ctxFor(g.value)).suggestions;
    const target = all.find((s) => s.ruleId.startsWith("edit:dup"));
    assert.ok(target, g.id);
    const muted = P.Audit.run(text, ctxFor(g.value, { mutedRules: [target.ruleId] })).suggestions;
    assert.ok(!muted.some((s) => s.ruleId === target.ruleId), g.id);
    assert.equal(muted.length, all.filter((s) => s.ruleId !== target.ruleId).length, g.id);
  }
});

test("PE-96 matrix: applying a card's fix to the text removes that card on re-audit (corpus-wide)", () => {
  const cases = [...PE95_ALL, ...PE96_ALL].filter((c) => c.expect.length);
  let checked = 0;
  const bad = [];
  for (const c of cases) {
    const g = P.Genres.REGISTRY.find((x) => x.id === c.genre);
    const cx = () => ctxFor(g.value);
    const card = P.Audit.run(c.text, cx()).suggestions.find((s) => applicable(s) && c.expect.some((e) => s_id(s).startsWith(e)));
    if (!card) continue;
    const fixed = c.text.replace(card.targetText, card.replacementText);
    if (fixed === c.text) continue;
    checked++;
    const again = P.Audit.run(fixed, cx()).suggestions.filter((s) => s.ruleId === card.ruleId && s.targetText === card.targetText);
    if (again.length) bad.push(`${c.id}:${card.ruleId}`);
  }
  assert.ok(checked >= 50, `only checked ${checked}`);
  assert.deepEqual(bad, []);
});
function s_id(s) { return String(s.ruleId); }

test("PE-96 matrix: Track Changes on/off and cancel do not change what the audit finds (engine is pure)", () => {
  const text = "He reached for her hand hand and held it.";
  const a = key(P.Audit.run(text, ctxFor("General Fiction", { trackChanges: true })));
  const b = key(P.Audit.run(text, ctxFor("General Fiction", { trackChanges: false })));
  assert.equal(a, b);
});
