import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bootTaskpane, sleep } from "./helpers/taskpane-harness.mjs";

const css = fs.readFileSync(new URL("../src/taskpane/taskpane.css", import.meta.url), "utf8");

test("PE-95: every dialog has a name, aria-modal and starts hidden; live regions for progress exist", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["Hello."] } });
  try {
    const dialogs = [...t.document.querySelectorAll('[role="dialog"]')];
    assert.ok(dialogs.length >= 3);
    for (const d of dialogs) {
      assert.equal(d.getAttribute("aria-modal"), "true", d.id);
      assert.ok(t.document.getElementById(d.getAttribute("aria-labelledby")), `${d.id} label`);
      assert.ok(d.classList.contains("hidden") && d.getAttribute("aria-hidden") === "true", `${d.id} hidden at start`);
    }
    const walk = t.el("peChapterWalkProgress");
    assert.equal(walk.getAttribute("role"), "status");
    assert.equal(walk.getAttribute("aria-live"), "polite");
    assert.equal(walk.getAttribute("aria-atomic"), "true");
    assert.equal(t.el("peOpBarLabel").getAttribute("aria-live"), "polite");
  } finally { await sleep(700); t.close(); }
});

test("PE-95: confirm dialog traps focus, Escape cancels, focus returns to the opener", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["Hello."] } });
  try {
    t.peval(fs.readFileSync(new URL("../src/taskpane/lib/pe-confirm-dialog.js", import.meta.url), "utf8"));
    Object.defineProperty(t.window.HTMLElement.prototype, "offsetParent", { get() { return this.parentNode; }, configurable: true });
    const opener = t.el("btnRunAudit");
    opener.focus();
    const p = t.peval("peConfirm({ message: 'Go ahead?', confirmLabel: 'Yes', cancelLabel: 'No' })");
    await sleep(20);
    assert.equal(t.document.activeElement.id, "peConfirmPrimary");
    const press = (key, shiftKey = false) => t.document.dispatchEvent(new t.window.KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
    t.el("peConfirmSecondary").focus();
    press("Tab");
    assert.equal(t.document.activeElement.id, "peConfirmPrimary", "Tab from the last control wraps to the first");
    press("Tab", true);
    assert.equal(t.document.activeElement.id, "peConfirmSecondary", "Shift+Tab from the first wraps to the last");
    press("Escape");
    assert.equal(await p, false);
    assert.equal(t.document.activeElement.id, "btnRunAudit");
    assert.ok(t.el("pe-confirm-modal").classList.contains("hidden"));
  } finally { await sleep(700); t.close(); }
});

test("PE-95: settings dialog opens with focus inside, Escape closes it", async () => {
  const t = await bootTaskpane({ word: { paragraphs: ["Hello."] } });
  try {
    t.peval("openSettingsModal()");
    await sleep(40);
    const modal = t.el("pe-settings-modal");
    assert.ok(!modal.classList.contains("hidden"));
    assert.ok(modal.contains(t.document.activeElement), "focus moved into the dialog");
    t.document.dispatchEvent(new t.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await sleep(20);
    assert.ok(modal.classList.contains("hidden"));
  } finally { await sleep(700); t.close(); }
});

test("PE-95: narrow-pane CSS - status text wraps, dialog text wraps and scrolls, walk buttons wrap, 340px rules exist", () => {
  const block = (sel) => (css.match(new RegExp(`${sel.replace(/[.#]/g, "\\$&")}\\s*\\{[^}]*\\}`)) || [""])[0];
  assert.ok(!/nowrap|ellipsis/.test(block(".pe-status")), "status line must not truncate");
  assert.match(block(".pe-confirm-message"), /overflow-wrap:\s*anywhere/);
  assert.match(block(".pe-confirm-message"), /overflow-y:\s*auto/);
  assert.match(css, /\.pe-chapter-walk \.pe-btn[^}]*white-space:\s*normal/);
  assert.match(css, /@media \(max-width: 340px\)/);
});
