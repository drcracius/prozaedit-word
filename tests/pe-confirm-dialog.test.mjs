import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { loadLib } from "./load-lib.mjs";

function bootConfirmDom() {
  const dom = new JSDOM(
    `<!DOCTYPE html><body>
      <button id="focusBefore">Before</button>
      <div id="pe-confirm-modal" class="pe-confirm-modal hidden" role="dialog" aria-modal="true" aria-labelledby="peConfirmTitle" aria-hidden="true">
        <div class="pe-confirm-backdrop" tabindex="-1"></div>
        <div class="pe-confirm-dialog" role="document">
          <h2 id="peConfirmTitle">Confirm</h2>
          <p id="peConfirmMessage"></p>
          <button type="button" id="peConfirmPrimary">OK</button>
          <button type="button" id="peConfirmSecondary">Cancel</button>
        </div>
      </div>
    </body>`,
    { pretendToBeVisual: true }
  );
  const { document, window } = dom.window;
  const ConfirmDialog = loadLib("src/taskpane/lib/pe-confirm-dialog.js", {
    document,
    globalThis: { document, ProzaEdit: {} },
  }).ConfirmDialog;
  return { document, window, ConfirmDialog };
}

test("ConfirmDialog: primary button resolves true", async () => {
  const { document, ConfirmDialog } = bootConfirmDom();
  document.getElementById("focusBefore").focus();
  const pending = ConfirmDialog.show({ message: "Apply edit?", confirmLabel: "Apply" });
  assert.equal(ConfirmDialog.isOpen(), true);
  document.getElementById("peConfirmPrimary").click();
  assert.equal(await pending, true);
  assert.equal(ConfirmDialog.isOpen(), false);
});

test("ConfirmDialog: secondary and backdrop resolve false", async () => {
  const { document, ConfirmDialog } = bootConfirmDom();
  let pending = ConfirmDialog.show({ message: "Reset?" });
  document.getElementById("peConfirmSecondary").click();
  assert.equal(await pending, false);

  pending = ConfirmDialog.show({ message: "Again?" });
  document.querySelector(".pe-confirm-backdrop").click();
  assert.equal(await pending, false);
});

test("ConfirmDialog: Escape dismisses with false", async () => {
  const { document, window, ConfirmDialog } = bootConfirmDom();
  const pending = ConfirmDialog.show({ message: "Large prompt?" });
  const ev = new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
  document.dispatchEvent(ev);
  assert.equal(await pending, false);
});
