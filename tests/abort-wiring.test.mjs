import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const globals = { AbortController, setTimeout, clearTimeout };

function loadWithGlobals(seed) {
  return loadLibsWithSeed({ ...globals, ...seed });
}

function loadLibsWithSeed(seed) {
  const ProzaEdit = {};
  const sandbox = { ProzaEdit, ...seed };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const rel of ["src/taskpane/lib/long-operation-controller.js", "src/taskpane/lib/gemini-client.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
  }
  return sandbox.ProzaEdit;
}

function abortableFetch(responder) {
  return (url, init) =>
    new Promise((resolve, reject) => {
      const onAbort = () => reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" }));
      if (init.signal.aborted) return onAbort();
      init.signal.addEventListener("abort", onAbort);
      responder?.(resolve, reject, init);
    });
}

const okBody = { candidates: [{ content: { parts: [{ text: "hello" }] } }] };

test("LongOperationController exposes a real AbortSignal that fires on cancel", () => {
  const pe = loadWithGlobals({});
  const op = pe.LongOperationController.create({});
  let fired = 0;
  op.abortSignal.addEventListener("abort", () => fired++);
  assert.equal(op.abortSignal.aborted, false);
  op.cancel();
  op.cancel();
  assert.equal(op.abortSignal.aborted, true);
  assert.equal(op.isCancelled(), true);
  assert.equal(op.signal.aborted, true);
  assert.equal(fired, 1);
  assert.throws(() => op.throwIfCancelled(), (e) => pe.LongOperationController.isCancelledError(e));
});

test("LongOperationController abortSignal shim works without AbortController", () => {
  const pe = loadWithGlobals({ AbortController: undefined });
  const op = pe.LongOperationController.create({});
  let fired = 0;
  op.abortSignal.addEventListener("abort", () => fired++);
  op.cancel();
  assert.equal(op.abortSignal.aborted, true);
  assert.equal(fired, 1);
});

test("LongOperationController: throwing listeners and hooks never break cancel; onAbort unsubscribes", () => {
  const pe = loadWithGlobals({});
  let hookCalls = 0;
  const op = pe.LongOperationController.create({
    onCancel() {
      hookCalls++;
      throw new Error("hook boom");
    },
    setStatus() {
      throw new Error("status boom");
    },
  });
  let ran = 0;
  op.onAbort(() => {
    throw new Error("listener boom");
  });
  const off = op.onAbort(() => ran++);
  off();
  op.onAbort(() => ran++);
  op.setStatus("x");
  assert.doesNotThrow(() => op.cancel());
  assert.equal(ran, 1);
  assert.equal(hookCalls, 1);
});

test("Gemini.generate: user Cancel aborts the in-flight fetch with a cancelled error (not a timeout)", async () => {
  const pe = loadWithGlobals({ fetch: abortableFetch() });
  const op = pe.LongOperationController.create({});
  const pending = pe.Gemini.generate("key-12345678", "hi", null, { signal: op.abortSignal });
  setTimeout(() => op.cancel(), 5);
  await assert.rejects(pending, (e) => pe.LongOperationController.isCancelledError(e));
});

test("Gemini.generate: pre-aborted signal never calls fetch", async () => {
  let called = 0;
  const pe = loadWithGlobals({
    fetch: () => {
      called++;
      return Promise.resolve();
    },
  });
  const op = pe.LongOperationController.create({});
  op.cancel();
  await assert.rejects(pe.Gemini.generate("key-12345678", "hi", null, { signal: op.abortSignal }), (e) =>
    pe.LongOperationController.isCancelledError(e)
  );
  assert.equal(called, 0);
});

test("Gemini.generate: timeout path still reports AbortError / timed out", async () => {
  const pe = loadWithGlobals({ fetch: abortableFetch() });
  await assert.rejects(
    pe.Gemini.generate("key-12345678", "hi", null, { timeoutMs: 10 }),
    (e) => e.name === "AbortError" && /timed out/i.test(e.message) && e.code === "PE_TIMEOUT"
  );
});

test("Gemini.generate: success, HTTP error, and non-JSON bodies", async () => {
  let pe = loadWithGlobals({
    fetch: () => Promise.resolve({ ok: true, status: 200, json: async () => okBody }),
  });
  assert.equal(await pe.Gemini.generate("key-12345678", "hi"), "hello");

  pe = loadWithGlobals({
    fetch: () => Promise.resolve({ ok: false, status: 429, json: async () => ({ error: { message: "Quota exceeded" } }) }),
  });
  await assert.rejects(pe.Gemini.generate("key-12345678", "hi"), /Quota exceeded/);

  pe = loadWithGlobals({
    fetch: () =>
      Promise.resolve({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      }),
  });
  await assert.rejects(pe.Gemini.generate("key-12345678", "hi"), /Gemini HTTP 502/);

  pe = loadWithGlobals({
    fetch: () => Promise.resolve({ ok: true, status: 200, json: async () => ({ candidates: [] }) }),
  });
  await assert.rejects(pe.Gemini.generate("key-12345678", "hi"), /Empty Gemini response/);
});

test("Gemini.generate: cancel while reading the response body is a cancel, listener is removed afterwards", async () => {
  let removed = 0;
  let added = 0;
  const signal = {
    aborted: false,
    addEventListener() {
      added++;
    },
    removeEventListener() {
      removed++;
    },
  };
  const pe = loadWithGlobals({
    fetch: () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => {
          signal.aborted = true;
          throw Object.assign(new Error("aborted"), { name: "AbortError" });
        },
      }),
  });
  await assert.rejects(pe.Gemini.generate("key-12345678", "hi", null, { signal }), (e) =>
    pe.LongOperationController.isCancelledError(e)
  );
  assert.equal(added, 1);
  assert.equal(removed, 1);
});

test("Gemini.generate: network failure surfaces the original error and rejects keys that are too short", async () => {
  const pe = loadWithGlobals({ fetch: () => Promise.reject(new TypeError("Failed to fetch")) });
  await assert.rejects(pe.Gemini.generate("key-12345678", "hi"), /Failed to fetch/);
  await assert.rejects(pe.Gemini.generate("short", "hi"), /Invalid or missing API key/);
});
