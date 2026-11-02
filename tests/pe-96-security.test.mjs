// PE-96 security: DOM injection from manuscript text, rule names, dictionary/style imports, forged document settings.
import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, sleep, waitFor } from "./helpers/taskpane-harness.mjs";

const EVIL = [
  '<img src=x onerror="window.__pwn=1">',
  '"><svg/onload=window.__pwn=1>',
  "<script>window.__pwn=1</script>",
  "javascript:window.__pwn=1",
  "<b onmouseover=window.__pwn=1>x</b>",
];

function onAttrs(doc) {
  const out = new Set();
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of el.attributes) if (/^on/i.test(a.name)) out.add(el.tagName + ":" + a.name + "=" + a.value);
  });
  return out;
}
function snapshot(t) {
  return { on: onAttrs(t.document), scripts: t.document.querySelectorAll("script").length };
}
function assertNoInjection(t, base, label) {
  assert.equal(t.window.__pwn, undefined, label + ": payload executed");
  const now = onAttrs(t.document);
  for (const a of now) assert.ok(base.on.has(a), `${label}: new event-handler attribute ${a}`);
  assert.equal(t.document.querySelectorAll("script").length, base.scripts, label + ": script element added");
  for (const sel of ["img[onerror]", "svg[onload]", "svg script", "iframe", "object", "embed", "[href^='javascript:' i]", "[src^='javascript:' i]"]) {
    assert.equal(t.document.querySelectorAll(sel).length, 0, `${label}: ${sel}`);
  }
}

test("PE-96: hostile manuscript text never becomes markup anywhere in the pane", async () => {
  const paras = EVIL.flatMap((e) => [`She said ${e} very quickly and ${e} the the end.`, `"I don't know," ${e} he said. ${e}`]);
  const t = await bootTaskpane({ word: { paragraphs: paras, headings: [] }, keepDefaultScope: true });
  try {
    const base = snapshot(t);
    t.el("scope").value = "full";
    t.el("customStyleFind") && (t.el("customStyleFind").value = EVIL[0]);
    t.click("btnRunAudit");
    await sleep(40);
    if (!t.el("peLongOpWarningBanner").classList.contains("hidden")) t.click("btnLongOpContinue");
    await waitFor(() => !t.peval("isOperationBusy()"), { timeout: 30000, interval: 20, message: "audit" });
    assert.ok(t.peval("currentAuditSuggestions.length") >= 0);
    assertNoInjection(t, base, "after audit");
    for (const e of EVIL) {
      await t.peval(`addDictionaryWordFromCard(${JSON.stringify(e.replace(/\s+/g, ""))})`);
      t.peval(`showPeStatus(${JSON.stringify(e)}, "warn")`);
      t.peval(`appendCoachMessage(${JSON.stringify(e + " **bold**")}, false)`);
      t.peval(`appendCoachMessage(${JSON.stringify(e)}, true)`);
      t.peval(`renderChronologyTimeline([{label:${JSON.stringify(e)},type:"x",paraIndex:1}])`);
      t.peval(`renderCitationSamples([{raw:${JSON.stringify(e)}}])`);
    }
    t.peval("renderDictionaryList()");
    assertNoInjection(t, base, "after helpers");
    assert.equal(t.document.querySelector("#peStatus").children.length, 0, "status must be plain text");
    assert.deepEqual(t.errors.map((x) => String(x && x.message)), []);
  } finally {
    await sleep(80);
        t.close();
  }
});

test("PE-96: forged document settings cannot inject markup or throw", async () => {
  const forged = {
    PROZAEDIT_LAST_AUDIT: JSON.stringify({
      label: EVIL[0],
      summaryHtml: `<h3>ok</h3>${EVIL.join("")}<p onclick="window.__pwn=1" class="x" style="width:50%;background:url(javascript:1)">hi</p><details open><summary>s</summary></details>`,
      suggestions: EVIL.map((e, i) => ({ module: e, type: e, explanation: e, targetText: e, replacementText: e, ruleId: e, id: e + i })),
      traffic: { level: 'red" onmouseover="window.__pwn=1', label: EVIL[0] },
      score: EVIL[0],
      miniScores: { correctness: EVIL[0], clarity: EVIL[1], engagement: EVIL[2] },
    }),
    PROZAEDIT_CHAPTER_HEATMAP: JSON.stringify([{ title: EVIL[0], words: EVIL[1], asl: EVIL[2] }, null, 7, { title: EVIL[4], words: 10 }]),
    PROZAEDIT_DICTIONARY: JSON.stringify(EVIL),
    PROZAEDIT_MUTED_RULES: JSON.stringify(EVIL),
    PROZAEDIT_CUSTOM_STYLE: JSON.stringify({ name: EVIL[0], rules: EVIL.map((e) => ({ find: e, replace: e, hint: e, id: e })) }),
    PROZAEDIT_CONFIG: JSON.stringify({ manuscriptType: EVIL[0], settingAnchor: EVIL[1], __proto__: { polluted: 1 }, language: EVIL[2] }),
  };
  const t = await bootTaskpane({ word: { paragraphs: ["Plain text here."], settings: forged } });
  try {
    const base = snapshot(t);
    await sleep(100);
    t.peval("restoreCachedAuditIfEmpty()");
    t.peval("renderDictionaryList()");
    t.peval("renderCustomStyleRulesList()");
    t.peval("updateCustomRulesSummary && updateCustomRulesSummary()");
    t.peval("showTab('tab4')");
    await sleep(100);
    assertNoInjection(t, base, "forged settings");
    assert.equal(({}).polluted, undefined);
    assert.equal(t.window.Object.prototype.polluted, undefined);
    assert.deepEqual(t.errors.map((x) => String(x && x.message)), []);
  } finally {
    await sleep(80);
        t.close();
  }
});

test("PE-96: HtmlSafe keeps layout markup and drops everything executable", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["x"] } });
  try {
    const S = (h) => t.window.ProzaEdit.HtmlSafe.sanitize(h);
    assert.equal(S('<p class="a">hi <strong>there</strong></p>'), '<p class="a">hi <strong>there</strong></p>');
    assert.equal(S('<span class="hm-bar" style="width:40%" title="3 words"></span>'), '<span class="hm-bar" style="width:40%" title="3 words"></span>');
    assert.equal(S('<span style="width:40%;background:url(x)"></span>'), "<span></span>");
    assert.equal(S('<span style="height:999999px"></span>'), "<span></span>");
    assert.equal(S('<img src=x onerror=alert(1)>a'), "a");
    assert.equal(S('<p onclick="x()">a</p>'), "<p>a</p>");
    assert.equal(S('<a href="javascript:1">a</a>'), "");
    assert.equal(S("<script>x</script>b"), "b");
    assert.equal(S('<button onclick="x()">b</button>'), "");
    assert.equal(S("<!-- c --><p>d</p>"), "<p>d</p>");
    assert.equal(S('<svg><script>1</script></svg>'), "");
    assert.equal(S('<math><mtext><table><mglyph><style><img src=x onerror=1>')?.includes("onerror"), false);
    assert.equal(S(null), "");
    assert.equal(S("a".repeat(300000)), "");
    assert.equal(S("<p>a & b</p>"), "<p>a &amp; b</p>");
    assert.equal(t.window.ProzaEdit.HtmlSafe.num("abc", 5), 5);
    assert.equal(t.window.ProzaEdit.HtmlSafe.num(Infinity, 5), 5);
    assert.equal(t.window.ProzaEdit.HtmlSafe.token("x", ["a"], "a"), "a");
  } finally {
    await sleep(80);
        t.close();
  }
});

test("PE-96: legitimate summary markup survives a save/restore round trip", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["She walked into the room and looked at the window."] } });
  try {
    t.el("scope").value = "full";
    t.click("btnRunAudit");
    await sleep(40);
    if (!t.el("peLongOpWarningBanner").classList.contains("hidden")) t.click("btnLongOpContinue");
    await waitFor(() => !t.peval("isOperationBusy()"), { timeout: 30000, interval: 20, message: "audit" });
    const saved = JSON.parse(t.mock.settings.PROZAEDIT_LAST_AUDIT || "null");
    assert.ok(saved && saved.summaryHtml);
    const t2 = await bootTaskpane({ word: { paragraphs: ["x"], settings: { PROZAEDIT_LAST_AUDIT: JSON.stringify(saved) } } });
    try {
      t2.peval("restoreCachedAuditIfEmpty()");
      const html = t2.el("summaryReport").innerHTML;
      assert.ok(/Manuscript overview/.test(html), "overview panel kept");
      assert.ok(/<h3>/.test(html));
    } finally {
      await sleep(80);
            t2.close();
    }
  } finally {
    await sleep(80);
        t.close();
  }
});

test("PE-96: ConfigGuard drops prototype-pollution keys", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["x"] } });
  try {
    const raw = '{"__proto__":{"admin":true},"constructor":{"x":1},"manuscriptType":"Fiction (General)"}';
    const r = t.window.ProzaEdit.ConfigGuard.parse(raw);
    assert.equal(r.config.admin, undefined);
    assert.equal(Object.getPrototypeOf(r.config), t.window.Object.prototype);
    assert.equal(r.config.manuscriptType, "Fiction (General)");
  } finally {
    await sleep(80);
        t.close();
  }
});
