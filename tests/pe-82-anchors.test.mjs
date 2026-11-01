import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function loadEA() {
  const sb = { window: {}, ProzaEdit: undefined };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, "src/taskpane/lib/edit-apply.js"), "utf8"), sb);
  return sb.ProzaEdit.EditApply;
}
const EA = loadEA();

/** Mock document: paragraphs[]; search is case-insensitive substring in document order, like Word. */
function mockDoc(paras, { badAfter = false, failParaRead = false } = {}) {
  const doc = { paras: paras.slice(), edits: 0 };
  const hitsFor = (q) => {
    const hits = [];
    doc.paras.forEach((_, pi) => {
      const low = doc.paras[pi].toLowerCase();
      let at = low.indexOf(q.toLowerCase());
      while (at !== -1) {
        hits.push(makeHit(pi, at, q.length));
        at = low.indexOf(q.toLowerCase(), at + 1);
      }
    });
    return hits;
  };
  const paraObj = (pi) => ({ text: "", load() { if (failParaRead) throw new Error("x"); this.text = doc.paras[pi]; } });
  function makeHit(pi, at, len) {
    return {
      text: "",
      load() { this.text = doc.paras[pi].substr(at, len); },
      paragraphs: { getFirst: () => paraObj(pi) },
      insertText(to) {
        const P = doc.paras[pi];
        doc.paras[pi] = P.slice(0, at) + to + P.slice(at + len);
        doc.edits++;
        return {
          text: "",
          load() { this.text = badAfter ? "WRONG" : to; },
          paragraphs: { getFirst: () => paraObj(pi) },
        };
      },
    };
  }
  const ctx = { sync: async () => {} };
  const deps = (anchor) => ({ searchInScope: async (_c, t) => hitsFor(t), replaceLocation: "Replace", anchor });
  return { doc, ctx, deps };
}
const excerptOf = (paras) => paras.join("\n");
const anchorFor = (paras, target) => EA.buildAnchor(excerptOf(paras), target);

test("anchor: built only when the target occurs once; carries hash and context", () => {
  const paras = ["Alpha beta gamma.", "She said very softly that it was very late."];
  const a = anchorFor(paras, "beta");
  assert.ok(a.anchor && a.count === 1);
  assert.equal(a.anchor.before, "Alpha ");
  assert.equal(a.anchor.after, " gamma.");
  assert.equal(a.anchor.paraIndex, 0);
  assert.equal(anchorFor(paras, "very").anchor, null);
  assert.equal(anchorFor(paras, "very").count, 2);
  assert.equal(anchorFor(paras, "missing").anchor, null);
  assert.equal(EA.buildAnchor("", "x").anchor, null);
});

test("anchor apply: edits the right paragraph among identical texts using context; verifies after", async () => {
  const paras = ["He said very little.", "A very small step.", "Another very small step, no."];
  const m = mockDoc(paras);
  const a = anchorFor(paras, "very little").anchor;
  const r = await EA.swapText(m.ctx, "very little", "little", m.deps(a));
  assert.equal(r.verified, true);
  assert.deepEqual(m.doc.paras, ["He said little.", "A very small step.", "Another very small step, no."]);
});

test("anchor apply: unique target in doc with duplicates elsewhere differing by context", async () => {
  const paras = ["The cat sat.", "The cat sat.", "Then the dog ran far."];
  const m = mockDoc(paras);
  const a = anchorFor(paras, "dog ran").anchor;
  await EA.swapText(m.ctx, "dog ran", "dog walked", m.deps(a));
  assert.equal(m.doc.paras[2], "Then the dog walked far.");
});

test("refuses (no edit) when identical paragraphs exist", async () => {
  const paras = ["Same line with very odd text.", "Same line with very odd text."];
  const m = mockDoc(paras);
  const excerpt = excerptOf([paras[0]]);
  const a = EA.buildAnchor(excerpt, "very odd").anchor;
  await assert.rejects(EA.swapText(m.ctx, "very odd", "odd", m.deps(a)), (e) => e.peApplyPhase === "before-edit" && /cannot be sure/.test(e.message));
  assert.equal(m.doc.edits, 0);
});

test("refuses when paragraph was edited or moved text changed", async () => {
  const paras = ["Alpha beta gamma.", "Other."];
  const a = anchorFor(paras, "beta").anchor;
  const m = mockDoc(["Alpha beta gamma, edited.", "Other."]);
  await assert.rejects(EA.swapText(m.ctx, "beta", "B", m.deps(a)), (e) => /changed/.test(e.message) && e.peApplyPhase === "before-edit");
  assert.equal(m.doc.edits, 0);
});

test("moved paragraph (different index, same text) still applies to the right one; edit elsewhere is fine", async () => {
  const paras = ["First para.", "Alpha beta gamma.", "Last para."];
  const a = anchorFor(paras, "beta").anchor;
  const m = mockDoc(["Inserted new para.", "First para.", "Last para.", "Alpha beta gamma."]);
  await EA.swapText(m.ctx, "beta", "BETA", m.deps(a));
  assert.equal(m.doc.paras[3], "Alpha BETA gamma.");
  assert.equal(m.doc.edits, 1);
});

test("multiple occurrences inside one paragraph: context picks one; identical context refuses", async () => {
  const p1 = ["red fox and red hen"];
  const m1 = mockDoc(p1);
  const a1 = EA.buildAnchor("red fox and red hen", "red");
  assert.equal(a1.anchor, null);
  await assert.rejects(EA.swapText(m1.ctx, "red", "blue", m1.deps(a1.anchor)), (e) => /cannot be sure/.test(e.message));
  assert.equal(m1.doc.edits, 0);
  const a2 = EA.buildAnchor("red fox and red hen", "red hen").anchor;
  await EA.swapText(m1.ctx, "red hen", "blue hen", m1.deps(a2));
  assert.equal(m1.doc.paras[0], "red fox and blue hen");
  const forged = { ...a2, target: "red", before: "", after: "" };
  const m2 = mockDoc(["red red"]);
  await assert.rejects(EA.swapText(m2.ctx, "red", "x", m2.deps({ ...forged, paraHash: EA._hash("red red") })), (e) => /cannot be sure/.test(e.message));
  assert.equal(m2.doc.edits, 0);
});

test("no anchor: unique match applies, multiple exact matches refuse, case mismatch refuses", async () => {
  const one = mockDoc(["Alpha beta."]);
  await EA.swapText(one.ctx, "beta", "B", one.deps(null));
  assert.equal(one.doc.paras[0], "Alpha B.");
  const many = mockDoc(["a beta.", "b beta."]);
  await assert.rejects(EA.swapText(many.ctx, "beta", "B", many.deps(null)), (e) => e.peApplyPhase === "before-edit" && /2 times/.test(e.message));
  assert.equal(many.doc.edits, 0);
  const cs = mockDoc(["Beta only"]);
  await assert.rejects(EA.swapText(cs.ctx, "beta", "B", cs.deps(null)), /not exactly/);
  assert.equal(cs.doc.edits, 0);
});

test("too many hits refuse; paragraph read failure refuses before edit", async () => {
  const many = mockDoc(Array.from({ length: 60 }, () => "x beta y"));
  await assert.rejects(EA.swapText(many.ctx, "beta", "B", many.deps(null)), /too many times/);
  assert.equal(many.doc.edits, 0);
  const paras = ["Alpha beta gamma."];
  const a = anchorFor(paras, "beta").anchor;
  const m = mockDoc(paras, { failParaRead: true });
  await assert.rejects(EA.swapText(m.ctx, "beta", "B", m.deps(a)), (e) => e.peApplyPhase === "before-edit");
  assert.equal(m.doc.edits, 0);
});

test("verify-after: wrong inserted text is reported uncertain; placeholders never edit", async () => {
  const paras = ["Alpha beta gamma."];
  const a = anchorFor(paras, "beta").anchor;
  const bad = mockDoc(paras, { badAfter: true });
  await assert.rejects(EA.swapText(bad.ctx, "beta", "B", bad.deps(a)), (e) => e.peApplyPhase === "uncertain");
  const ph = mockDoc(paras);
  await assert.rejects(EA.swapText(ph.ctx, "beta", "(split)", ph.deps(a)), (e) => e.peApplyPhase === "before-edit");
  assert.equal(ph.doc.edits, 0);
});

test("anchor with mismatched target (sanitised differently) is ignored, falling back to unique-match rule", async () => {
  const m = mockDoc(["x beta y", "z beta w"]);
  const a = { ...anchorFor(["x beta y"], "beta").anchor, target: "other" };
  await assert.rejects(EA.swapText(m.ctx, "beta", "B", m.deps(a)), /2 times/);
  assert.equal(m.doc.edits, 0);
});

test("wiring: Simple and Advanced share one apply path that builds an anchor from the audit excerpt", () => {
  const tp = fs.readFileSync(path.join(root, "src/taskpane/taskpane.js"), "utf8");
  assert.match(tp, /EditApply\.buildAnchor\(lastAuditExcerpt, target\)/);
  assert.match(tp, /anchor: built\.anchor/);
  const fn = tp.slice(tp.indexOf("function applyFix("), tp.indexOf("function parseManifestVersion"));
  assert.ok(!/isSimple|simpleMode|uiMode/i.test(fn));
});
