import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor, sleep } from "./helpers/taskpane-harness.mjs";

const SAMPLE = "He was very tired and really just walked. She said that it was nice. ".repeat(10);

async function boot(opts = {}) {
  const t = await bootTaskpane({ word: { selection: SAMPLE, ...(opts.word || {}) }, ...opts });
  await t.settle(40);
  return t;
}

function holdSyncs(t) {
  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  t.state.syncHook = async () => {
    if (!t.isHidden("peOpBar")) await gate;
  };
  return () => {
    t.state.syncHook = null;
    release();
  };
}

const flag = (t, name) => t.peval(name);

function abortableFetch(calls) {
  return (url, init) => {
    calls.push(init);
    return new Promise((resolve, reject) => {
      const sig = init?.signal;
      const onAbort = () => reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" }));
      if (sig?.aborted) return onAbort();
      sig?.addEventListener?.("abort", onAbort, { once: true });
    });
  };
}

test("startup: no uncaught errors and key controls exist", async () => {
  const t = await boot();
  try {
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
    assert.deepEqual(t.window.__alerts, []);
    for (const id of ["peOpBar", "btnCancelLongOp", "peRetryBar", "btnPeRetry", "peGlobalError", "peStatus"]) {
      assert.ok(t.el(id), `#${id} present`);
    }
    assert.equal(t.el("btnCancelLongOp").getAttribute("aria-label"), "Cancel current operation");
    assert.ok(t.isHidden("peOpBar"));
    assert.ok(t.isHidden("peRetryBar"));
    assert.ok(t.isHidden("peGlobalError"));
  } finally {
    t.close();
  }
});

test("startup: Office undefined shows a recovery message instead of a white screen", async () => {
  const t = await bootTaskpane({ noOffice: true });
  try {
    await t.settle(50);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
    assert.ok(t.document.body.textContent.length > 100);
  } finally {
    t.close();
  }
});

test("startup: throwing storage and missing matchMedia do not crash init or an audit", async () => {
  const t = await bootTaskpane({
    word: { selection: SAMPLE },
    mutateWindow(w) {
      for (const name of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(w, name, {
          get() {
            throw new Error("SecurityError");
          },
          configurable: true,
        });
      }
      w.matchMedia = undefined;
    },
  });
  try {
    await t.settle(60);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
    t.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(t.status()), { message: "Report finished with no storage" });
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
  } finally {
    t.close();
  }
});

test("startup: corrupt PROZAEDIT_CONFIG falls back to defaults without errors", async () => {
  const t = await bootTaskpane({ word: { selection: SAMPLE, settings: { PROZAEDIT_CONFIG: "{not json" } } });
  try {
    await t.settle(60);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
    assert.ok(t.el("btnRunAudit"));
  } finally {
    t.close();
  }
});

test("startup: oversized and non-object PROZAEDIT_CONFIG are ignored safely", async () => {
  for (const raw of ["x".repeat(500000), "[1,2,3]", "null", '"str"', "42"]) {
    const t = await bootTaskpane({ word: { selection: SAMPLE, settings: { PROZAEDIT_CONFIG: raw } } });
    try {
      await t.settle(40);
      assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), [], raw.slice(0, 12));
    } finally {
      t.close();
    }
  }
});

test("audit: finishes, op bar returns to idle, no alerts", async () => {
  const t = await boot();
  try {
    t.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(t.status()), { message: "Report finished" });
    assert.ok(t.isHidden("peOpBar"));
    assert.equal(flag(t, "auditBusy"), false);
    assert.equal(flag(t, "auditStarting"), false);
    assert.deepEqual(t.window.__alerts, []);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("audit: Cancel is visible, enabled, aria-busy; cancel returns UI to idle and re-run works", async () => {
  const t = await boot();
  try {
    const release = holdSyncs(t);
    t.click("btnRunAudit");
    await waitFor(() => !t.isHidden("peOpBar"), { message: "op bar visible" });
    const cancel = t.el("btnCancelLongOp");
    assert.equal(cancel.disabled, false);
    assert.equal(t.el("peOpBar").getAttribute("aria-busy"), "true");
    t.click("btnCancelLongOp");
    release();
    await waitFor(() => flag(t, "auditBusy") === false, { message: "audit idle" });
    await t.settle(20);
    assert.ok(t.isHidden("peOpBar"));
    assert.equal(t.el("peOpBar").getAttribute("aria-busy"), "false");
    assert.match(t.status(), /Cancelled/);

    t.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(t.status()), { message: "re-run finished" });
    assert.equal(flag(t, "auditBusy"), false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("audit: rapid double-click starts only one audit", async () => {
  const t = await boot();
  try {
    const before = t.state.runs;
    t.click("btnRunAudit");
    t.click("btnRunAudit");
    t.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(t.status()), { message: "finished" });
    await t.settle(30);
    const used = t.state.runs - before;
    t.click("btnRunAudit");
    await waitFor(() => t.state.runs - before > used, { message: "second run starts" });
    assert.ok(used >= 1 && used <= 4, `Word.run count for one audit was ${used}`);
    await waitFor(() => flag(t, "auditBusy") === false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("audit: run while running is refused with a status line and does not wedge busy state", async () => {
  const t = await boot();
  try {
    const release = holdSyncs(t);
    t.click("btnRunAudit");
    await waitFor(() => !t.isHidden("peOpBar"));
    t.click("btnRunAudit");
    await t.settle(20);
    assert.match(t.status(), /already|wait|running|busy/i);
    release();
    await waitFor(() => /Report finished/.test(t.status()), { message: "finished" });
    assert.equal(flag(t, "auditBusy"), false);
  } finally {
    t.close();
  }
});

test("audit: Word sync failure shows recovery copy and Try again re-runs once", async () => {
  const t = await boot();
  try {
    t.state.failRunError = Object.assign(new Error("Network request failed"), { code: "GeneralException" });
    t.click("btnRunAudit");
    await waitFor(() => !t.isHidden("peRetryBar"), { message: "retry bar shown" });
    assert.doesNotMatch(t.status(), /gemini/i);
    assert.equal(flag(t, "auditBusy"), false);
    assert.equal(flag(t, "auditStarting"), false);
    assert.ok(t.isHidden("peOpBar"));
    assert.deepEqual(t.window.__alerts, []);
    t.state.failRunError = null;
    const before = t.state.runs;
    t.click("btnPeRetry");
    t.click("btnPeRetry");
    await waitFor(() => /Report finished/.test(t.status()), { message: "retry finished" });
    assert.ok(t.isHidden("peRetryBar"));
    assert.ok(t.state.runs - before <= 3, "retry did not fan out into duplicate audits");
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("audit: empty selection and empty document give guidance, not a crash", async () => {
  const empty = await boot({ word: { selection: "" } });
  try {
    empty.click("btnRunAudit");
    await waitFor(
      () =>
        /Report finished|Highlight text|No selection|could not|Cancelled/i.test(empty.status()) ||
        (flag(empty, "auditBusy") === false && flag(empty, "auditStarting") === false && empty.status().length > 0),
      { message: "empty-scope guidance or finished report", timeout: 15000 }
    );
    await empty.settle(40);
    assert.equal(flag(empty, "auditBusy"), false);
    assert.equal(flag(empty, "auditStarting"), false);
    assert.deepEqual(empty.errors, []);
    assert.deepEqual(empty.window.__alerts, []);
  } finally {
    empty.close();
  }
  const ws = await boot({ word: { selection: "   \n\t  " } });
  try {
    ws.click("btnRunAudit");
    await ws.settle(150);
    assert.equal(flag(ws, "auditBusy"), false);
    assert.deepEqual(ws.errors, []);
  } finally {
    ws.close();
  }
});

test("cards: render cap keeps the pane responsive and adds a note", async () => {
  const t = await boot();
  try {
    const list = Array.from({ length: 1200 }, (_, i) => ({
      id: `x${i}`,
      ruleId: `r${i}`,
      module: "Test",
      type: "confirmed",
      explanation: "e",
      targetText: `word${i}`,
      replacementText: `w${i}`,
    }));
    t.peval(`setAuditSuggestions(${JSON.stringify(list)})`);
    await t.settle(30);
    const n = t.document.querySelectorAll("#cardContainer .card").length;
    assert.ok(n > 0 && n <= 300, `cards rendered: ${n}`);
    assert.ok(t.document.querySelector("#cardContainer .pe-card-cap-note"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("cards: colliding ids stay unique so dismiss cannot hit the wrong finding", async () => {
  const t = await boot();
  try {
    t.peval(`auditCardFilter = "all"`);
    t.peval(`setAuditSuggestions(${JSON.stringify([
      { id: "same!", ruleId: "r1", module: "A", type: "confirmed", explanation: "e", targetText: "very", replacementText: "quite" },
      { id: "same?", ruleId: "r2", module: "B", type: "confirmed", explanation: "e", targetText: "really", replacementText: "truly" },
    ])})`);
    await t.settle(20);
    const ids = t.peval(`[...document.querySelectorAll("#cardContainer details.card")].map((el) => el.id)`);
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("cards: long quotes are preview-capped in the DOM; apply still uses the full text", async () => {
  const t = await boot();
  try {
    const long = "q".repeat(5000);
    t.peval(`setAuditSuggestions(${JSON.stringify([{
      id: "long1",
      ruleId: "r-long",
      module: "Long",
      type: "confirmed",
      explanation: "why ".repeat(200),
      targetText: long,
      replacementText: "short",
    }])})`);
    await t.settle(20);
    const target = t.document.querySelector("#cardContainer .card-target")?.textContent || "";
    assert.ok(target.length < 400, `preview leaked full quote: ${target.length}`);
    assert.ok(target.includes("…"));
    const kept = t.peval(`currentAuditSuggestions[0].targetText.length`);
    assert.equal(kept, 5000);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("cards: malformed items and hostile text do not break rendering or inject markup", async () => {
  const t = await boot();
  try {
    const list = [
      { id: "a b<c>", ruleId: "r", module: "<img src=x onerror=alert(1)>", type: "x\" onclick=\"y", explanation: null, targetText: "<b>t</b>", replacementText: undefined },
      null,
      "str",
      { id: "ok", module: "M", type: "confirmed", explanation: "e", targetText: "a".repeat(5000), replacementText: "b" },
    ];
    t.peval(`setAuditSuggestions(${JSON.stringify(list)})`);
    await t.settle(30);
    assert.equal(t.document.querySelectorAll("#cardContainer img").length, 0);
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.window.__alerts, []);
  } finally {
    t.close();
  }
});

function seedCard(t, extra = {}) {
  const card = {
    id: "c1",
    ruleId: "r1",
    module: "Test",
    type: "confirmed",
    explanation: "e",
    targetText: "very good",
    replacementText: "excellent",
    ...extra,
  };
  t.peval(`setAuditSuggestions(${JSON.stringify([card])})`);
  return card;
}

test("apply: success applies once, rapid double-click never double-applies, no alert", async () => {
  const t = await boot({ word: { selection: "", paragraphs: ["Hello world. This is very good text."] } });
  try {
    seedCard(t);
    await t.settle(20);
    const btn = t.document.querySelector('#card_c1 [data-a="apply"]');
    assert.ok(btn);
    btn.click();
    btn.click();
    btn.click();
    await waitFor(() => /Applied/.test(t.status()), { message: "applied" });
    await t.settle(30);
    assert.equal(t.state.inserted.length, 1, "exactly one insertText");
    assert.deepEqual(t.window.__alerts, []);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("apply: failure before the edit is retryable; retry applies exactly once", async () => {
  const t = await boot({ word: { selection: "", paragraphs: ["Hello world. This is very good text."] } });
  try {
    seedCard(t);
    await t.settle(20);
    let calls = 0;
    t.state.syncHook = async () => {
      calls++;
      if (calls === 2) throw Object.assign(new Error("GeneralException"), { code: "GeneralException" });
    };
    t.document.querySelector('#card_c1 [data-a="apply"]').click();
    await waitFor(() => !t.isHidden("peRetryBar"), { message: "retry bar" });
    assert.equal(t.state.inserted.length, 0);
    assert.deepEqual(t.window.__alerts, []);
    assert.equal(flag(t, "historyBusy"), false);
    t.state.syncHook = null;
    t.click("btnPeRetry");
    t.click("btnPeRetry");
    await waitFor(() => /Applied/.test(t.status()), { message: "applied after retry" });
    await t.settle(30);
    assert.equal(t.state.inserted.length, 1);
    assert.ok(t.isHidden("peRetryBar"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("apply: failure after the edit may have landed is never offered as retry", async () => {
  const t = await boot({ word: { selection: "", paragraphs: ["Hello world. This is very good text."] } });
  try {
    seedCard(t);
    await t.settle(20);
    let calls = 0;
    t.state.syncHook = async () => {
      calls++;
      if (calls === 3) throw Object.assign(new Error("GeneralException"), { code: "GeneralException" });
    };
    t.document.querySelector('#card_c1 [data-a="apply"]').click();
    await waitFor(() => /may or may not/i.test(t.status()), { message: "uncertain copy" });
    assert.ok(t.isHidden("peRetryBar"), "no Try again for uncertain apply");
    assert.equal(flag(t, "historyBusy"), false);
    assert.deepEqual(t.window.__alerts, []);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("apply: declined confirm applies nothing and leaves nothing busy", async () => {
  const t = await boot({ confirm: false, word: { selection: "", paragraphs: ["Hello world. This is very good text."] } });
  try {
    seedCard(t);
    await t.settle(20);
    t.document.querySelector('#card_c1 [data-a="apply"]').click();
    await t.settle(60);
    assert.equal(t.state.inserted.length, 0);
    assert.equal(flag(t, "historyBusy"), false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("go to: missing text reports without alert; busy state is clear", async () => {
  const t = await boot({ word: { selection: "", paragraphs: ["Nothing relevant here."] } });
  try {
    seedCard(t, { targetText: "absent phrase" });
    await t.settle(20);
    t.document.querySelector('#card_c1 [data-a="goto"]').click();
    await t.settle(80);
    assert.deepEqual(t.window.__alerts, []);
    assert.deepEqual(t.errors, []);
    assert.ok(t.status().length > 0);
  } finally {
    t.close();
  }
});

test("chat: Gemini cancel aborts the in-flight request, UI returns to idle, no unhandled rejection", async () => {
  const calls = [];
  const t = await boot({ fetch: abortableFetch(calls) });
  try {
    t.el("apiKey").value = "AIzaSyDUMMYKEYDUMMYKEY1234567890";
    t.el("chatInput").value = "How do I fix POV slips?";
    t.peval("sendChatMessage()");
    await waitFor(() => calls.length === 1, { message: "fetch started" });
    await waitFor(() => !t.isHidden("peOpBar"));
    assert.equal(flag(t, "chatBusy"), true);
    t.click("btnCancelLongOp");
    await waitFor(() => flag(t, "chatBusy") === false, { message: "chat idle" });
    assert.ok(calls[0].signal.aborted);
    assert.ok(t.isHidden("peOpBar"));
    assert.match(t.status(), /Cancelled/);
    assert.equal(t.document.querySelector("#btnPeRetry")?.disabled ?? false, false);
    await t.settle(30);
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.window.__alerts, []);
  } finally {
    t.close();
  }
});

test("chat: network failure shows recovery copy, redacts the key, and Try again works once", async () => {
  let n = 0;
  const key = "AIzaSyDUMMYKEYDUMMYKEY1234567890";
  const t = await boot({
    fetch: (url) => {
      n++;
      if (n === 1) return Promise.reject(new TypeError(`Failed to fetch ${url}`));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "Try showing the POV character's thoughts." }] } }] }),
      });
    },
  });
  try {
    t.el("apiKey").value = key;
    t.el("chatInput").value = "How do I fix POV slips?";
    t.peval("sendChatMessage()");
    await waitFor(() => !t.isHidden("peRetryBar"), { message: "retry bar" });
    assert.equal(flag(t, "chatBusy"), false);
    assert.ok(!t.document.body.textContent.includes(key), "API key never appears in UI text");
    t.click("btnPeRetry");
    t.click("btnPeRetry");
    await waitFor(() => /POV character/.test(t.el("chatLog").textContent), { message: "reply shown" });
    assert.equal(n, 2, "retry sent exactly one more request");
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("chat: rapid double send while running is refused", async () => {
  const calls = [];
  const t = await boot({ fetch: abortableFetch(calls) });
  try {
    t.el("apiKey").value = "AIzaSyDUMMYKEYDUMMYKEY1234567890";
    t.el("chatInput").value = "Question one";
    t.peval("sendChatMessage()");
    await waitFor(() => calls.length === 1);
    t.el("chatInput").value = "Question two";
    t.peval("sendChatMessage()");
    await t.settle(40);
    assert.equal(calls.length, 1);
    t.click("btnCancelLongOp");
    await waitFor(() => flag(t, "chatBusy") === false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("deep audit: cancel aborts the in-flight Gemini request and the next run works", async () => {
  const calls = [];
  let mode = "hang";
  const t = await boot({
    fetch: (url, init) => {
      if (mode === "hang") return abortableFetch(calls)(url, init);
      calls.push(init);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '[{"module":"Deep","type":"confirmed","explanation":"x","targetText":"very tired","replacementText":"exhausted","ruleId":"ai:1"}]' }] } }],
        }),
      });
    },
  });
  try {
    t.el("apiKey").value = "AIzaSyDUMMYKEYDUMMYKEY1234567890";
    t.peval("lastScopePreviewChars = 120000;");
    t.peval("(async () => { await runDeepAuditAICore(); })()");
    await waitFor(() => !t.isHidden("peOpBar"), { message: "progress bar" });
    await waitFor(() => calls.length === 1, { message: "deep fetch started" });
    assert.equal(flag(t, "deepBusy"), true);
    t.click("btnCancelLongOp");
    await waitFor(() => flag(t, "deepBusy") === false, { message: "deep idle" });
    assert.ok(calls[0].signal.aborted);
    assert.ok(t.isHidden("peOpBar"));
    assert.match(t.status(), /Cancelled/);
    mode = "ok";
    t.peval("lastScopePreviewChars = 120000;");
    await t.peval("(async () => { await runDeepAuditAICore(); })()");
    await waitFor(() => /Deep audit finished/.test(t.status()), { message: "deep finished" });
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.window.__alerts, []);
  } finally {
    t.close();
  }
});

test("deep audit: unparseable Gemini reply fails cleanly without a stuck busy state", async () => {
  const t = await boot({
    fetch: () =>
      Promise.resolve({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "no json here" }] } }] }) }),
  });
  try {
    t.el("apiKey").value = "AIzaSyDUMMYKEYDUMMYKEY1234567890";
    t.peval("lastScopePreviewChars = 120000;");
    await t.peval("(async () => { await runDeepAuditAICore(); })()");
    await waitFor(() => /could not finish/.test(t.status()), { message: "failure status" });
    assert.equal(flag(t, "deepBusy"), false);
    assert.ok(t.isHidden("peOpBar"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("deep audit: Not now on the long-operation warning leaves nothing busy and a later run works", async () => {
  const t = await boot();
  try {
    t.peval('applyUiConfig({ showLongOperationWarnings: true }); lastScopePreviewChars = 120000;');
    t.peval(
      `runAfterLongOperationWarning(ProzaEdit.LongOp.ACTION_IDS.DEEP_AUDIT, () => runDeepAuditAICore())`
    );
    await waitFor(() => !t.isHidden("peLongOpWarningBanner"), { message: "optional warning banner" });
    t.click("btnLongOpNotNow");
    await t.settle(30);
    assert.ok(t.isHidden("peLongOpWarningBanner"));
    assert.equal(flag(t, "deepBusy"), false);
    assert.equal(flag(t, "auditStarting"), false);
    t.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(t.status()), { message: "report after Not now" });
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("global error guard: an uncaught error shows a recovery banner and never leaves controls disabled", async () => {
  const t = await boot();
  try {
    t.window.dispatchEvent(new t.window.ErrorEvent("error", { error: new Error("boom"), message: "boom" }));
    await t.settle(20);
    assert.ok(!t.isHidden("peGlobalError"));
    assert.ok(t.el("peGlobalErrorMessage").textContent.length > 0);
    t.click("btnPeGlobalErrorDismiss");
    assert.ok(t.isHidden("peGlobalError"));
  } finally {
    t.close();
  }
});

test("global error guard: a cancellation rejection is not shown as an error", async () => {
  const t = await boot();
  try {
    const err = Object.assign(new Error("Cancelled"), { name: "CancelledError", code: "PE_CANCELLED" });
    const ev = new t.window.Event("unhandledrejection");
    ev.reason = err;
    ev.preventDefault = () => {};
    t.window.dispatchEvent(ev);
    await t.settle(20);
    assert.ok(t.isHidden("peGlobalError"));
  } finally {
    t.close();
  }
});

test("settings save failure does not break persistence callers", async () => {
  const t = await boot({ word: { selection: SAMPLE } });
  try {
    t.state.settingsFail = true;
    const ok = await t.peval("ProzaEdit.Settings.setAsync('k', 'v')");
    assert.equal(ok, false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("tabs: switching tabs during an operation keeps the Cancel control reachable", async () => {
  const t = await boot();
  try {
    const release = holdSyncs(t);
    t.click("btnRunAudit");
    await waitFor(() => !t.isHidden("peOpBar"));
    for (const id of ["tab1", "tab2", "tab3", "tab5"]) {
      t.peval(`showTab(${JSON.stringify(id)})`);
      assert.ok(!t.isHidden("peOpBar"), `op bar visible on ${id}`);
      assert.equal(t.el("btnCancelLongOp").disabled, false);
    }
    t.click("btnCancelLongOp");
    release();
    await waitFor(() => flag(t, "auditBusy") === false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("diagnostics flag: phase timing is off by default and on with pe-dev", async () => {
  const off = await boot();
  try {
    off.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(off.status()));
    assert.ok(!/read \d|analyze \d|ms/.test(off.status()), off.status());
  } finally {
    off.close();
  }
  const on = await boot({ url: "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html?pe-dev=1" });
  try {
    on.click("btnRunAudit");
    await waitFor(() => /Report finished/.test(on.status()));
    assert.match(on.status(), /ms/);
  } finally {
    on.close();
  }
});

test("pathological inputs: very long single line and repeated punctuation stay bounded", async () => {
  const cases = [
    "word ".repeat(60000),
    "a".repeat(200000),
    "!!!???...,,,;;;---".repeat(15000),
    "\"".repeat(100000),
    "He said, \"" + "very really just ".repeat(20000),
    "\u0645\u0631\u062D\u0628\u0627 ".repeat(20000),
  ];
  const t = await boot();
  try {
    for (const text of cases) {
      const start = Date.now();
      t.peval(`ProzaEdit.Audit.run(${JSON.stringify(text)}, buildAuditContext({}))`);
      const ms = Date.now() - start;
      assert.ok(ms < 8000, `audit took ${ms}ms on ${text.slice(0, 12)}`);
    }
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("module-level sanity: sleep helper is usable", async () => {
  await sleep(1);
});

test("cards: findings are collapsible; first opens and actions stay wired", async () => {
  const t = await boot();
  try {
    const list = [
      { id: "c1", ruleId: "r1", module: "First", type: "confirmed", explanation: "e1", targetText: "very", replacementText: "quite" },
      { id: "c2", ruleId: "r2", module: "Second", type: "confirmed", explanation: "e2", targetText: "really", replacementText: "truly" },
    ];
    t.peval(`setAuditSuggestions(${JSON.stringify(list)})`);
    await t.settle(30);
    const cards = t.document.querySelectorAll("#cardContainer details.card");
    assert.equal(cards.length, 2);
    assert.equal(cards[0].open, true, "first finding starts open");
    assert.equal(cards[1].open, false, "later findings start collapsed");
    assert.ok(cards[0].querySelector('[data-a="goto"]'));
    assert.ok(cards[0].querySelector('[data-a="apply"]'));
    cards[1].open = true;
    assert.equal(cards[1].open, true);
    assert.ok(cards[1].querySelector(".card-body"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("cards: dismiss keeps other open cards and opens the next finding", async () => {
  const t = await boot();
  try {
    t.peval(`auditCardFilter = "all"`);
    const list = [
      { id: "a", ruleId: "ra", module: "A", type: "confirmed", explanation: "e", targetText: "very", replacementText: "quite" },
      { id: "b", ruleId: "rb", module: "B", type: "confirmed", explanation: "e", targetText: "really", replacementText: "truly" },
      { id: "c", ruleId: "rc", module: "C", type: "confirmed", explanation: "e", targetText: "just", replacementText: "simply" },
    ];
    t.peval(`setAuditSuggestions(${JSON.stringify(list)})`);
    await t.settle(30);
    t.peval(`document.getElementById("card_b").open = true`);
    t.peval(`document.querySelector("#card_b [data-a=dismiss]").focus()`);
    t.peval(`removeAuditCard("b")`);
    await t.settle(20);
    assert.equal(t.document.getElementById("card_b"), null);
    assert.equal(t.document.getElementById("card_a")?.open, true);
    assert.equal(t.document.getElementById("card_c")?.open, true, "next card must open so actions stay visible");
    assert.ok(t.document.getElementById("card_c")?.querySelector("[data-a=dismiss]"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("cards: a collapsed first finding stays collapsed across a preserve re-render", async () => {
  const t = await boot();
  try {
    t.peval(`auditCardFilter = "all"`);
    const list = [
      { id: "a", ruleId: "ra", module: "A", type: "confirmed", explanation: "e", targetText: "very", replacementText: "quite" },
      { id: "b", ruleId: "rb", module: "B", type: "confirmed", explanation: "e", targetText: "really", replacementText: "truly" },
    ];
    t.peval(`setAuditSuggestions(${JSON.stringify(list)})`);
    await t.settle(20);
    t.peval(`document.getElementById("card_a").open = false`);
    t.peval(`applyAuditCardFilter({ preserveDisplayLimit: true })`);
    await t.settle(20);
    assert.equal(t.document.getElementById("card_a")?.open, false, "collapsed first card must not be forced open");
    assert.equal(t.document.getElementById("card_b")?.open, false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: settings modal inerts the shortcut rail; export waits when busy", async () => {
  const t = await boot();
  try {
    t.peval("openSettingsModal()");
    assert.ok(t.el("peUtilityRail").hasAttribute("inert"));
    assert.equal(t.el("peUtilityRail").getAttribute("aria-hidden"), "true");
    t.peval("closeSettingsModal()");
    assert.equal(t.el("peUtilityRail").hasAttribute("inert"), false);
    t.peval("auditBusy = true");
    t.peval("exportAuditReportNewWordDoc()");
    await t.settle(20);
    assert.match(t.status(), /Wait for the current action/);
    t.peval("auditBusy = false");
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: missing overlay shells do not lock the stepper", async () => {
  const t = await boot();
  try {
    t.peval(`document.getElementById("pe-settings-modal")?.remove()`);
    t.peval(`document.getElementById("peOnboardingTour")?.remove()`);
    assert.equal(t.peval("isPeOverlayDialogOpen()"), false);
    t.peval(`document.querySelector('[data-workflow-step="2"]').click()`);
    assert.ok(t.document.getElementById("tab3").classList.contains("active"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: stepper does not change tabs while Settings is open", async () => {
  const t = await boot();
  try {
    t.peval("showTab('tab1')");
    t.peval("openSettingsModal()");
    t.peval(`document.querySelector('[data-workflow-step="2"]').click()`);
    assert.equal(t.document.getElementById("tab1").classList.contains("active"), true);
    assert.equal(t.document.getElementById("tab3").classList.contains("active"), false);
    t.peval("closeSettingsModal()");
    t.peval(`document.querySelector('[data-workflow-step="2"]').click()`);
    assert.ok(t.document.getElementById("tab3").classList.contains("active"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: confirm-open and tour-open inert the shortcut rail", async () => {
  const t = await boot();
  try {
    t.peval(`document.body.classList.add("pe-confirm-open"); syncUtilityRailChrome()`);
    assert.ok(t.el("peUtilityRail").hasAttribute("inert"));
    t.peval(`document.body.classList.remove("pe-confirm-open"); syncUtilityRailChrome()`);
    assert.equal(t.el("peUtilityRail").hasAttribute("inert"), false);
    t.peval(`document.body.classList.add("pe-onboarding-tour-open"); syncUtilityRailChrome()`);
    assert.ok(t.el("peUtilityRail").hasAttribute("inert"));
    t.peval(`document.body.classList.remove("pe-onboarding-tour-open"); syncUtilityRailChrome()`);
    assert.equal(t.el("peUtilityRail").hasAttribute("inert"), false);
    assert.ok(t.el("peWorkflowStatusLine").classList.contains("pe-workflow-status-static"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: full-manuscript scope tip shows only after refresh at 80k+ chars", async () => {
  const t = await boot();
  try {
    const tip = t.el("peFullManuscriptScopeTip");
    assert.ok(tip.classList.contains("hidden"));
    t.peval(`document.getElementById("scope").value = "full"; syncScopePanels(); lastScopePreviewChars = 50000; updateFullManuscriptScopeTip()`);
    assert.ok(tip.classList.contains("hidden"));
    t.peval(`updateScopeCharPreviewDisplay(90000, "Full manuscript", "full")`);
    assert.equal(tip.classList.contains("hidden"), false);
    t.peval(`updateScopeCharPreviewDisplay(1000, "Full manuscript", "full")`);
    assert.ok(tip.classList.contains("hidden"));
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: Run pill starts a report and a bad character count does not throw", async () => {
  const t = await boot();
  try {
    t.peval(`window.__peRan = 0; runPrimaryAudit = () => { window.__peRan += 1; };`);
    t.peval(`document.querySelector('[data-workflow-step="3"]').dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))`);
    assert.equal(t.peval("window.__peRan"), 1);
    t.peval(`updateScopeCharPreviewDisplay(undefined, "Scope", "selection")`);
    assert.equal(t.el("scopeCharPreview").textContent.includes("NaN"), false);
    t.peval(`updateScopeCharPreviewDisplay(12000, "", "full")`);
    assert.match(t.el("scopeCharPreview").textContent, /^Scope:/);
    assert.doesNotMatch(t.el("peBadgeScope").textContent, /chars|characters/i);
    t.peval(`adaptModules()`);
    assert.ok(t.el("peGenreBlurb").querySelector(".visually-hidden"));
    assert.match(t.el("peGenreBlurb").textContent, /rules of thumb/);
    const profile = t.document.querySelector(".pe-target-section");
    t.peval(`document.getElementById("simpleMode").checked = true; applySimpleMode();`);
    profile.setAttribute("open", "");
    t.peval(`applySimpleMode()`);
    assert.equal(profile.hasAttribute("open"), true);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: a second Run is ignored until the first start finishes", async () => {
  const t = await boot();
  try {
    await t.peval(`(async () => { window.__starts = 0; prepareScopeForAudit = async () => { window.__starts += 1; return false; }; const first = runAuditInternal({}); runAuditInternal({}); await first; })()`);
    assert.equal(t.peval("window.__starts"), 1);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: a failed scope measure is not reported as over the character limit", async () => {
  const t = await boot();
  try {
    const ready = await t.peval(`document.getElementById("scope").value = "full"; refreshScopeCharPreview = () => { const el = document.getElementById("scopeCharPreview"); el.dataset.peMeasureFailed = "1"; el.classList.remove("over-limit"); el.textContent = "Could not measure this scope"; return Promise.resolve(); }; prepareScopeForAudit()`);
    assert.equal(ready, false);
    assert.match(t.el("peStatus").textContent, /Could not measure/);
    assert.doesNotMatch(t.el("peStatus").textContent, /exceeds character limit/);
    assert.equal(t.peval(`document.querySelector(".pe-toolbar .btn-tool-accent").disabled`), false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: chapter reload does not read Word while a report is running", async () => {
  const t = await boot();
  try {
    t.peval(`auditBusy = true; window.__wordReads = 0; const prev = wordRun; wordRun = function () { window.__wordReads += 1; return prev.apply(this, arguments); };`);
    await t.peval(`reloadChapterScopeFromDocument()`);
    assert.equal(t.peval("window.__wordReads"), 0);
    assert.match(t.el("peStatus").textContent, /Wait for the current operation/);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("wordRun never has two Word reads open at once", async () => {
  const t = await boot();
  try {
    let open = 0;
    let max = 0;
    t.state.syncHook = async () => {
      open += 1;
      if (open > max) max = open;
      await sleep(30);
      open -= 1;
    };
    const a = t.peval(`wordRun("a", async (ctx) => { await ctx.sync(); return 1; })`);
    const b = t.peval(`wordRun("b", async (ctx) => { await ctx.sync(); return 2; })`);
    assert.deepEqual(await Promise.all([a, b]), [1, 2]);
    assert.equal(max, 1);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("thesaurus lookup releases Word before the word service answers", async () => {
  const t = await boot({ word: { selection: "happy" } });
  try {
    let releaseFetch;
    const gate = new Promise((resolve) => {
      releaseFetch = resolve;
    });
    t.window.fetch = () => gate.then(() => ({ ok: true, json: async () => [] }));
    t.peval(`document.getElementById("thesaurusInput").value = ""; runThesaurusLookup()`);
    await sleep(40);
    const probe = await Promise.race([
      t.peval(`wordRun("probe", async () => "free")`),
      sleep(400).then(() => "blocked"),
    ]);
    assert.equal(probe, "free");
    releaseFetch();
    await t.settle(40);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: Pass 1 quiet chrome (Tips, type lift, hidden hints)", async () => {
  const t = await boot();
  try {
    const tips = t.el("peChromeHelp");
    assert.ok(tips);
    assert.equal(tips.open, false);
    assert.ok(tips.contains(t.el("peDocScopeTrustLine")));
    assert.ok(t.el("peTargetRecommendedHint").classList.contains("hidden"));
    assert.ok(t.el("peWorkflowNextStep").classList.contains("hidden"));
    const profile = t.document.querySelector(".pe-target-section");
    const typeSel = t.el("manuscriptType");
    assert.ok(profile && typeSel);
    assert.equal(profile.contains(typeSel), false);
    const pill = t.document.querySelector('[data-workflow-step="1"]');
    assert.equal(pill.getAttribute("aria-label"), "Target");
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: Pass 4 Help keeps required ids and drops duplicate scope essay", async () => {
  const t = await boot();
  try {
    assert.ok(t.el("peHelpPrivacySummary"));
    assert.ok(t.el("peHelpGotoTroubleshoot"));
    assert.ok(t.el("peHelpSupportSummary"));
    assert.ok(t.el("peAboutBuildVersion"));
    const helpText = t.document.getElementById("tab7").textContent;
    assert.doesNotMatch(helpText, /Analysis scope \(Target\)/);
    assert.doesNotMatch(helpText, /Settings \(toolbar gear\):/);
    assert.match(helpText, /Install & update/i);
    assert.equal(t.el("peSimpleModeEssentialsIntro").classList.contains("hidden"), true);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: Pass 2a audit chrome (summary block, hidden hints, More)", async () => {
  const t = await boot();
  try {
    const summary = t.el("summaryReport");
    assert.equal(summary.id, "summaryReport");
    assert.ok(summary.closest(".pe-report-block"));
    assert.ok(t.el("auditDefaultFilterHint").classList.contains("hidden"));
    assert.ok(t.el("peAuditFilterLanesHint").classList.contains("hidden"));
    assert.equal(t.el("auditReportDepthHint").classList.contains("hidden"), false);
    const share = t.document.querySelector(".audit-share summary");
    assert.ok(share);
    assert.match(share.textContent, /More/i);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});

test("layout: badge row and width-gated rail stay wired", async () => {
  const t = await boot();
  try {
    assert.ok(t.el("peOverheadBadges"));
    assert.ok(t.el("peBadgeGuide").textContent.trim().length > 0);
    assert.ok(t.el("peBadgeScope").textContent.trim().length > 0);
    assert.ok(t.el("peUtilityRail"));
    t.peval("setupNarrowPaneClass()");
    const wide = t.peval("document.body.classList.contains('pe-wide-pane')");
    const hidden = t.el("peUtilityRail").getAttribute("aria-hidden");
    if (wide) assert.equal(hidden, null);
    else assert.equal(hidden, "true");
    t.peval("showTab('tab5')");
    assert.ok(t.document.getElementById("tab5").classList.contains("active"));
    t.peval("exportAuditReportNewWordDoc()");
    await t.settle(20);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});
