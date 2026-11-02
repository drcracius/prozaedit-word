// PE-96: repeated-run leak checks (heap, timers, listeners).
import test from "node:test";
import assert from "node:assert/strict";
import { loadEngine, ctxFor } from "./helpers/corpus-harness.mjs";
import { bootTaskpane } from "./helpers/taskpane-harness.mjs";

const P = loadEngine();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test("PE-96 leak: 200 repeated audits keep heap bounded and leave no timers", async () => {
  const text = "She walked to the door and said, \"Hello there.\" Really, it was a lot of work. ".repeat(300);
  const cx = ctxFor(P.Genres.REGISTRY[0].value);
  for (let i = 0; i < 20; i++) P.Audit.run(text, cx);
  global.gc && global.gc();
  const before = process.memoryUsage().heapUsed;
  const handles = process._getActiveHandles().length;
  for (let i = 0; i < 200; i++) P.Audit.run(text, cx);
  global.gc && global.gc();
  const growth = process.memoryUsage().heapUsed - before;
  assert.ok(growth < 120 * 1024 * 1024, `heap grew ${(growth / 1048576).toFixed(1)}MB`);
  assert.ok(process._getActiveHandles().length <= handles + 1);
});

test("PE-96 leak: repeated boot/close of the taskpane does not accumulate timers or errors", async () => {
  const before = process._getActiveHandles().length;
  for (let i = 0; i < 12; i++) {
    const t = await bootTaskpane({ paragraphs: ["Chapter 1", "She walked slowly. It was really very good."] });
    await t.settle();
    assert.deepEqual(t.errors, []);
    await sleep(20);
    t.close();
  }
  await sleep(100);
  assert.ok(process._getActiveHandles().length <= before + 2, `handles ${before} -> ${process._getActiveHandles().length}`);
});

test("PE-96 resilience: a hanging update check is aborted and reports a failure instead of spinning forever", async () => {
  const t = await bootTaskpane({});
  let aborted = false;
  t.window.fetch = (url, opts) => new Promise((_, rej) => {
    opts.signal.addEventListener("abort", () => { aborted = true; rej(new Error("aborted")); });
  });
  const realSetTimeout = t.window.setTimeout;
  t.window.setTimeout = (fn, ms, ...a) => realSetTimeout(fn, ms >= 10000 ? 20 : ms, ...a);
  await t.window.checkForUpdates(false);
  assert.ok(aborted, "fetch was not aborted by the timeout");
  assert.doesNotMatch(t.document.getElementById("updateStatus").textContent, /^Checking GitHub…$/);
  await sleep(80);
  t.close();
});
