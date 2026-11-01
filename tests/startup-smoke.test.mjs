import test from "node:test";
import assert from "node:assert/strict";
import { bootTaskpane, waitFor } from "./helpers/taskpane-harness.mjs";

/**
 * Read-only smoke against a MOCKED Office/Word host (jsdom). This proves the real HTML + scripts
 * initialise and the main read-only paths run without uncaught errors or document writes.
 * It does NOT prove behavior inside real Word or Word on the web.
 */
const SAMPLE = "He was very tired and really just walked. She said that it was nice. ".repeat(8);

test("smoke: init completes, every tab opens, settings modal opens and closes, no uncaught errors", async () => {
  const t = await bootTaskpane({ word: { selection: SAMPLE } });
  try {
    await t.settle(80);
    for (const id of t.peval("TAB_IDS")) {
      t.peval(`showTab(${JSON.stringify(id)})`);
      assert.equal(t.document.querySelectorAll(".tab-content.active").length, 1, `exactly one active tab after showTab(${id})`);
    }
    t.peval("openSettingsModal()");
    assert.ok(!t.isHidden("pe-settings-modal"));
    t.peval("closeSettingsModal()");
    assert.ok(t.isHidden("pe-settings-modal"));
    await t.settle(50);
    assert.deepEqual(t.errors.map((e) => String(e && (e.message || e))), []);
    assert.deepEqual(t.window.__alerts, []);
  } finally {
    t.close();
  }
});

test("smoke: local audit and Local Coach run read-only (no insertText, no selection changes)", async () => {
  const t = await bootTaskpane({ word: { selection: SAMPLE } });
  try {
    await t.settle(60);
    t.click("btnRunAudit");
    await waitFor(() => /Audit finished/.test(t.status()), { message: "audit finished" });
    t.el("chatInput").value = "How do I fix POV slips?";
    t.peval("sendLocalCoachMessage()");
    await t.settle(60);
    assert.equal(t.state.inserted.length, 0, "no document writes");
    assert.equal(t.state.selected.length, 0, "no selection changes");
    assert.deepEqual(t.errors, []);
    assert.deepEqual(t.window.__alerts, []);
  } finally {
    t.close();
  }
});

test("smoke: Word.run rejecting at startup leaves the pane usable (no white screen)", async () => {
  const t = await bootTaskpane({ word: { selection: SAMPLE } });
  try {
    t.state.failRunError = Object.assign(new Error("InvalidObjectPath"), { code: "InvalidObjectPath" });
    t.peval("showTab('tab3')");
    t.click("btnRunAudit");
    await t.settle(150);
    assert.ok(t.document.body.textContent.length > 200);
    assert.equal(t.peval("auditBusy"), false);
    assert.equal(t.peval("auditStarting"), false);
    assert.deepEqual(t.errors, []);
  } finally {
    t.close();
  }
});
