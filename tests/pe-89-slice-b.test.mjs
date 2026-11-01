import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";
import { loadLib } from "./load-lib.mjs";

async function settleClose(t) {
  await sleep(80);
  t.close();
}

const FINDINGS = `[
  { id: "a", ruleId: "r:a", type: "confirmed", module: "M", explanation: "e", targetText: "alpha", replacementText: "(x)", confidence: "high" },
  { id: "b", ruleId: "r:b", type: "preference", module: "M", explanation: "e", targetText: "beta", replacementText: "(x)", confidence: "high" },
  { id: "c", ruleId: "r:b", type: "preference", module: "M", explanation: "e", targetText: "gamma", replacementText: "(x)", confidence: "high" }]`;

async function setup() {
  const t = await bootTaskpane({ word: { selection: "alpha beta gamma." } });
  t.peval(`auditCardFilter = "all";
    finalizeAudit({ suggestions: ${FINDINGS}, metrics: ProzaEdit.Metrics.analyze("alpha beta gamma.") }, "Full audit (local)");`);
  return t;
}

test("PE-89: summary counts update live after a card is removed (Apply/Dismiss)", async () => {
  const t = await setup();
  try {
    assert.match(t.el("summaryReport").textContent, /Style: 2\b/);
    t.peval(`removeAuditCard("b")`);
    assert.match(t.el("summaryReport").textContent, /Style: 1\b/);
    t.peval(`removeAuditCard("a")`);
    assert.match(t.el("summaryReport").textContent, /Style: 1\b/);
    assert.doesNotMatch(t.el("summaryReport").textContent, /: 1 · 🟡 Style: 1.*Critical: 1/);
    assert.equal(t.peval("lastAuditMeta.criticalCount"), 0);
    assert.equal(t.document.querySelectorAll("#cardContainer .card").length, 1);
  } finally {
    await settleClose(t);
  }
});

test("PE-89: muting/dismissing a rule removes every card of that rule", async () => {
  const t = await setup();
  try {
    await t.peval(`muteRule(currentAuditSuggestions[1])`);
    assert.equal(t.document.querySelectorAll("#cardContainer .card").length, 1);
    assert.match(t.el("summaryReport").textContent, /Style: 0\b/);
  } finally {
    await settleClose(t);
  }
});

test("PE-89: starting a new audit clears stale summary state so mode toggles cannot resurrect old results", async () => {
  const t = await setup();
  try {
    t.peval(`resetStaleAuditSummaryState()`);
    assert.equal(t.peval("lastAuditResultForMode"), null);
    assert.ok(t.el("trafficBar").classList.contains("hidden"));
    t.peval(`refreshAuditSummaryForMode()`);
    assert.doesNotMatch(t.el("summaryReport").textContent, /^Score/);
  } finally {
    await settleClose(t);
  }
});

test("PE-89: custom style rule chips are keyboard operable", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    await t.peval(`ProzaEdit.Settings.setCustomStyleGuide(ProzaEdit.CustomStyleGuide.mergeRules(ProzaEdit.Settings.getCustomStyleGuide(), [ProzaEdit.CustomStyleGuide.normalizeRule({ find: "utilize", replace: "use" })]))`);
    t.peval(`renderCustomStyleRulesList()`);
    const chip = t.document.querySelector("#customStyleRulesList [data-custom-rule]");
    assert.equal(chip.getAttribute("role"), "button");
    assert.equal(chip.getAttribute("tabindex"), "0");
    assert.match(chip.getAttribute("aria-label"), /Remove rule utilize/);
    chip.dispatchEvent(new t.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await waitFor(() => !t.document.querySelector("#customStyleRulesList [data-custom-rule]"), { message: "rule removed" });
  } finally {
    await settleClose(t);
  }
});

test("PE-89: failed house-rule save is reported, not claimed as saved", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.peval(`ProzaEdit.Settings.setCustomStyleGuide = async () => false`);
    await t.peval(`addCustomStyleFromCard({ targetText: "utilize", replacementText: "use", explanation: "x" })`);
    assert.match(t.el("peStatus").textContent, /Could not save the house rule/);
  } finally {
    await settleClose(t);
  }
});

test("PE-89: programmatic scope change to selection syncs panels", async () => {
  const t = await bootTaskpane({ word: {} });
  try {
    t.el("scope").value = "chapter-range";
    t.peval(`syncScopePanels()`);
    t.peval(`forceScopeToSelection()`);
    assert.equal(t.el("scope").value, "selection");
    assert.ok(t.el("scopeChapterPanel").classList.contains("hidden"));
  } finally {
    await settleClose(t);
  }
});

function chapterCtx(n, perChapter, len, hooks = {}) {
  const items = [];
  for (let i = 0; i < n * perChapter; i++) {
    items.push({ text: "x".repeat(len), styleBuiltIn: "Normal", load() {} });
  }
  let syncs = 0;
  return {
    get syncs() {
      return syncs;
    },
    document: { body: { paragraphs: { items, load() {} } } },
    sync: async () => {
      syncs++;
      if (hooks.onSync) hooks.onSync(syncs);
    },
    chapters: Array.from({ length: n }, (_, k) => ({ index: k + 1, startPara: k * perChapter, endPara: (k + 1) * perChapter - 1 })),
  };
}

function loadReader() {
  return loadLib("src/taskpane/lib/scope-reader.js", { Word: { Style: { heading1: "H1", heading2: "H2", heading3: "H3" } } }).ScopeReader;
}

test("PE-89: selected-chapters paragraph read is chunked and honours cancel", async () => {
  const SR = loadReader();
  let cancelled = false;
  const ctx = chapterCtx(2, 200, 10, { onSync: (n) => { if (n >= 4) cancelled = true; } });
  const opts = {
    mode: "selected-chapters",
    selectedChapterIndices: [1, 2],
    chapters: ctx.chapters,
    cancelCheck: () => {
      if (cancelled) throw new Error("cancelled");
    },
  };
  await assert.rejects(() => SR.readParagraphsInScope(ctx, opts), /cancelled/);
  assert.ok(ctx.syncs >= 4 && ctx.syncs < 9, `synced in chunks, got ${ctx.syncs}`);
});

test("PE-89: selected-chapters paragraph read enforces a char cap", async () => {
  const SR = loadReader();
  const ctx = chapterCtx(2, 100, 1000);
  await assert.rejects(
    () => SR.readParagraphsInScope(ctx, { mode: "selected-chapters", selectedChapterIndices: [1, 2], chapters: ctx.chapters, maxChars: 50000 }),
    /exceed/
  );
  const small = chapterCtx(1, 20, 10);
  const out = await SR.readParagraphsInScope(small, { mode: "selected-chapters", selectedChapterIndices: [1], chapters: small.chapters });
  assert.equal(out.length, 20);
});
