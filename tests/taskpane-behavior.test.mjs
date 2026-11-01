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
    await waitFor(() => /Audit finished/.test(t.status()), { message: "audit finished with no storage" });
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
    await waitFor(() => /Audit finished/.test(t.status()), { message: "audit finished" });
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
    await waitFor(() => /Audit finished/.test(t.status()), { message: "re-run finished" });
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
    await waitFor(() => /Audit finished/.test(t.status()), { message: "finished" });
    await t.settle(30);
    const used = t.state.runs - before;
    t.click("btnRunAudit");
    await waitFor(() => t.state.runs - before > used, { message: "second run starts" });
    assert.ok(used >= 1 && used <= 3, `Word.run count for one audit was ${used}`);
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
    await waitFor(() => /Audit finished/.test(t.status()), { message: "finished" });
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
    await waitFor(() => /Audit finished/.test(t.status()), { message: "retry finished" });
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
    await waitFor(() => flag(empty, "auditBusy") === false && flag(empty, "auditStarting") === false, { message: "idle" });
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
    t.peval("runDeepAuditAI()");
    await waitFor(() => !t.isHidden("peLongOpWarningBanner"), { message: "warning banner" });
    t.click("btnLongOpContinue");
    await waitFor(() => calls.length === 1, { message: "deep fetch started" });
    assert.equal(flag(t, "deepBusy"), true);
    t.click("btnCancelLongOp");
    await waitFor(() => flag(t, "deepBusy") === false, { message: "deep idle" });
    assert.ok(calls[0].signal.aborted);
    assert.ok(t.isHidden("peOpBar"));
    assert.match(t.status(), /Cancelled/);
    mode = "ok";
    t.peval("runDeepAuditAI()");
    await waitFor(() => !t.isHidden("peLongOpWarningBanner") || /Deep audit finished/.test(t.status()), { message: "banner or run" });
    if (!t.isHidden("peLongOpWarningBanner")) t.click("btnLongOpContinue");
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
    t.peval("runDeepAuditAI()");
    await waitFor(() => !t.isHidden("peLongOpWarningBanner"), { message: "warning banner" });
    t.click("btnLongOpContinue");
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
    t.el("apiKey").value = "AIzaSyDUMMYKEYDUMMYKEY1234567890";
    t.peval("runDeepAuditAI()");
    await waitFor(() => !t.isHidden("peLongOpWarningBanner"), { message: "warning banner" });
    t.click("btnLongOpNotNow");
    await t.settle(30);
    assert.ok(t.isHidden("peLongOpWarningBanner"));
    assert.equal(flag(t, "deepBusy"), false);
    assert.equal(flag(t, "auditStarting"), false);
    t.click("btnRunAudit");
    await waitFor(() => /Audit finished/.test(t.status()), { message: "audit after Not now" });
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
    await waitFor(() => /Audit finished/.test(off.status()));
    assert.ok(!/read \d|analyze \d|ms/.test(off.status()), off.status());
  } finally {
    off.close();
  }
  const on = await boot({ url: "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html?pe-dev=1" });
  try {
    on.click("btnRunAudit");
    await waitFor(() => /Audit finished/.test(on.status()));
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
