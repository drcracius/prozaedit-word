import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function load() {
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ["edit-apply", "edit-history"]) vm.runInContext(fs.readFileSync(path.join(root, "src/taskpane/lib", f + ".js"), "utf8"), sandbox);
  return sandbox.ProzaEdit;
}
function miniDoc(paras) {
  const doc = { paras: paras.slice() };
  const para = (pi) => ({ text: "", load() { this.text = doc.paras[pi]; } });
  const hit = (pi, at, len) => ({
    text: "", load() { this.text = doc.paras[pi].substr(at, len); }, paragraphs: { getFirst: () => para(pi) },
    insertText(to) { const P = doc.paras[pi]; doc.paras[pi] = P.slice(0, at) + to + P.slice(at + len); return { text: "", load() { this.text = to; }, paragraphs: { getFirst: () => para(pi) } }; },
  });
  const hits = (q) => {
    const out = [];
    doc.paras.forEach((P, pi) => { let at = P.toLowerCase().indexOf(q.toLowerCase()); while (at !== -1) { out.push(hit(pi, at, q.length)); at = P.toLowerCase().indexOf(q.toLowerCase(), at + 1); } });
    return out;
  };
  return { doc, ctx: { sync: async () => {} }, deps: (anchor) => ({ searchInScope: async (_c, t) => hits(t), replaceLocation: "Replace", anchor }) };
}

test("PE-85: anchored Undo/Redo target the original paragraph even when the text now repeats elsewhere", async () => {
  const P = load();
  const paras = ["It was very late.", "Filler.", "It was very early."];
  const m = miniDoc(paras);
  const r = await P.EditApply.swapText(m.ctx, "was very late", "was late", m.deps(P.EditApply.buildAnchor(paras.join("\n"), "was very late").anchor));
  assert.ok(r.undoAnchor && r.redoAnchor);
  P.EditHistory.record("was very late", "was late", "x", r);
  m.doc.paras.push("Then it was late again.");
  const e = P.EditHistory.popUndo();
  await P.EditApply.swapText(m.ctx, e.after, e.before, m.deps(e.undoAnchor));
  assert.deepEqual(m.doc.paras, ["It was very late.", "Filler.", "It was very early.", "Then it was late again."]);
  const e2 = P.EditHistory.popRedo();
  await P.EditApply.swapText(m.ctx, e2.before, e2.after, m.deps(e2.redoAnchor));
  assert.equal(m.doc.paras[0], "It was late.");
  assert.equal(m.doc.paras[3], "Then it was late again.");
});

test("PE-85: anchored Undo refuses when the paragraph was edited meanwhile", async () => {
  const P = load();
  const paras = ["It was very late."];
  const m = miniDoc(paras);
  const r = await P.EditApply.swapText(m.ctx, "was very late", "was late", m.deps(P.EditApply.buildAnchor(paras[0], "was very late").anchor));
  m.doc.paras[0] = "It was late, truly.";
  const err = await P.EditApply.swapText(m.ctx, "was late", "was very late", m.deps(r.undoAnchor)).catch((x) => x);
  assert.equal(err.peApplyPhase, "before-edit");
  assert.equal(m.doc.paras[0], "It was late, truly.");
});

test("PE-85: taskpane counts sent-but-failed AI calls (timeout/cancel/network/empty) toward the caps", () => {
  const src = fs.readFileSync(path.join(root, "src/taskpane/taskpane.js"), "utf8");
  assert.match(src, /abortedBeforeSend[\s\S]{0,200}PE_TIMEOUT[\s\S]{0,200}recordUsage\(est\.totalTokens\)/);
});
