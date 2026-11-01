import test from "node:test";
import assert from "node:assert/strict";
import { loadLib, loadLibs } from "./load-lib.mjs";

const lib = (name) => `src/taskpane/lib/${name}.js`;
const plain = (x) => JSON.parse(JSON.stringify(x));

function loadRecoveryStack() {
  return loadLibs([
    lib("long-operation-controller"),
    lib("audit-review-helpers"),
    lib("recovery-helpers"),
    lib("edit-apply"),
    lib("error-guard"),
    lib("phase-timing"),
  ]);
}

test("AuditReview.classifyError maps Gemini, network, and Office failures", () => {
  const { AuditReview: A } = loadRecoveryStack();
  assert.equal(A.classifyError({ code: "PE_CANCELLED" }).kind, "cancelled");
  assert.equal(A.classifyError({ name: "AbortError", message: "x" }).kind, "timeout");
  assert.equal(A.classifyError(new Error("Gemini request timed out.")).kind, "timeout");
  assert.equal(A.classifyError(new Error("API key not valid. Please pass a valid API key.")).kind, "auth");
  assert.equal(A.classifyError(new Error("Invalid or missing API key.")).kind, "auth");
  assert.equal(A.classifyError(new Error("Resource has been exhausted (e.g. check quota).")).kind, "quota");
  assert.equal(A.classifyError(new TypeError("Failed to fetch")).kind, "network");
  assert.equal(A.classifyError(Object.assign(new Error("x"), { code: "InvalidObjectPath" })).kind, "office-missing");
  assert.equal(A.classifyError(Object.assign(new Error("x"), { code: "ItemNotFound" })).kind, "office-missing");
  assert.equal(A.classifyError(Object.assign(new Error("x"), { code: "NotImplemented" })).kind, "office-unsupported");
  assert.equal(A.classifyError(Object.assign(new Error("x"), { code: "AccessDenied" })).kind, "office-blocked");
  assert.equal(A.classifyError(new Error("Text not found—document may have changed.")).kind, "scope");
  assert.equal(A.classifyError(new Error("GeneralException")).kind, "unknown");
  assert.equal(A.classifyError(null).kind, "unknown");
  assert.equal(A.classifyError(undefined).kind, "unknown");
});

test("AuditReview.recoveryMessage gives structured copy and never leaks API keys", () => {
  const { AuditReview: A } = loadRecoveryStack();
  assert.equal(A.recoveryMessage({ code: "PE_CANCELLED" }, "x"), "Cancelled.");
  assert.match(A.recoveryMessage(new Error("Gemini request timed out."), "x"), /Nothing was changed.*Try again/i);
  assert.match(A.recoveryMessage(new TypeError("Failed to fetch"), "get a Gemini reply"), /network/i);
  assert.doesNotMatch(A.recoveryMessage(new TypeError("Failed to fetch"), "finish this audit"), /gemini/i);
  assert.doesNotMatch(A.recoveryMessage(new Error("request timed out"), "finish this audit"), /gemini/i);
  assert.match(A.recoveryMessage(Object.assign(new Error("x"), { code: "InvalidObjectPath" }), "x"), /document may have changed/i);
  assert.match(A.recoveryMessage(Object.assign(new Error("x"), { code: "NotImplemented" }), "x"), /Word on the web/i);
  const leaked = A.recoveryMessage(
    new Error("HTTP failed https://generativelanguage.googleapis.com/v1beta/m:generate?key=AIzaSyA1234567890123456789012345678901 now"),
    "do thing"
  );
  assert.doesNotMatch(leaked, /AIza/);
  assert.match(leaked, /redacted/);
  assert.match(A.recoveryMessage("plain string", "do thing"), /Word could not do thing/);
  assert.ok(A.recoveryMessage(new Error("x".repeat(5000)), "t").length < 600);
});

test("AuditReview uncertain apply outcome is never retryable and says so", () => {
  const { AuditReview: A } = loadRecoveryStack();
  const err = Object.assign(new Error("GeneralException"), { peApplyPhase: "uncertain" });
  assert.equal(A.isRetryable(err), false);
  assert.match(A.recoveryMessage(err, "apply this edit"), /may or may not have been made/i);
  assert.equal(A.isRetryable(new Error("GeneralException")), true);
  assert.equal(A.isRetryable(new Error("Text not found—document may have changed.")), false);
  assert.equal(A.isRetryable({ code: "PE_CANCELLED" }), false);
});

test("AuditReview.capCards bounds rendering and card labels are distinct per finding", () => {
  const { AuditReview: A } = loadRecoveryStack();
  const many = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
  const capped = A.capCards(many, 300);
  assert.equal(capped.shown.length, 300);
  assert.equal(capped.hiddenCount, 700);
  assert.deepEqual(plain(A.capCards([], 10)), { shown: [], hiddenCount: 0 });
  assert.deepEqual(plain(A.capCards(null, 10)), { shown: [], hiddenCount: 0 });
  assert.equal(A.capCards(many.slice(0, 5), 0).shown.length, 5);
  assert.equal(A.cardActionLabel("apply", { targetText: "teh" }), "Apply fix: “teh”");
  assert.equal(A.cardActionLabel("mute", { targetText: "a".repeat(100) }).includes("…"), true);
  assert.equal(A.cardActionLabel("undo", { targetText: "x" }), "Undo last ProzaEdit replace");
  assert.equal(A.cardActionLabel("apply", { targetText: "(truncated)" }), "Apply fix");
  assert.equal(A.cardActionLabel("apply", {}), "Apply fix");
  assert.equal(A.cardActionLabel("apply", null), "Apply fix");
});

test("Retry controller consumes the entry so a double-click runs it once; failures can re-register", async () => {
  const { Recovery } = loadRecoveryStack();
  const changes = [];
  const rc = Recovery.createRetryController({ onChange: (s) => changes.push(s && s.label) });
  let runs = 0;
  let release;
  const gate = new Promise((r) => (release = r));
  rc.set("Apply fix", async () => {
    runs++;
    await gate;
  });
  assert.equal(rc.has(), true);
  const first = rc.retry();
  const second = rc.retry();
  const third = rc.retry();
  release();
  assert.deepEqual(await Promise.all([first, second, third]), [true, false, false]);
  assert.equal(runs, 1);
  assert.equal(rc.has(), false);
  assert.equal(rc.isBusy(), false);

  let attempts = 0;
  const op = async () => {
    attempts++;
    if (attempts === 1) {
      rc.set("again", op);
      throw new Error("boom");
    }
  };
  rc.set("again", op);
  assert.equal(await rc.retry(), false);
  assert.equal(rc.has(), true, "failed retry re-registered itself");
  assert.equal(await rc.retry(), true);
  assert.equal(rc.has(), false);
  assert.equal(await rc.retry(), false, "nothing pending");
  rc.set("x", "not a function");
  assert.equal(rc.has(), false);
});

test("Locks: single-flight and keyed single-flight release exactly once", () => {
  const { Recovery } = loadRecoveryStack();
  const lock = Recovery.createLock();
  const release = lock.tryAcquire();
  assert.equal(typeof release, "function");
  assert.equal(lock.tryAcquire(), null);
  release();
  release();
  assert.equal(lock.isLocked(), false);
  assert.equal(typeof lock.tryAcquire(), "function");

  const keyed = Recovery.createKeyedLock();
  const a = keyed.tryAcquire("card_1");
  assert.equal(keyed.tryAcquire("card_1"), null);
  assert.equal(typeof keyed.tryAcquire("card_2"), "function");
  a();
  assert.equal(keyed.isLocked("card_1"), false);
  assert.equal(keyed.size(), 1);
});

function makeCtx({ failSyncOn = [], hitText = "teh" } = {}) {
  let syncs = 0;
  const hit = {
    text: "",
    inserted: [],
    load() {
      this.text = hitText;
    },
    insertText(t, loc) {
      this.inserted.push([t, loc]);
    },
  };
  return {
    hit,
    ctx: {
      async sync() {
        syncs++;
        if (failSyncOn.includes(syncs)) throw Object.assign(new Error("GeneralException"), { code: "GeneralException" });
      },
    },
    syncs: () => syncs,
  };
}

test("EditApply.swapText replaces first match and tags failure phases", async () => {
  const { EditApply } = loadRecoveryStack();
  let h = makeCtx();
  await EditApply.swapText(h.ctx, "teh", "the", { searchInScope: async () => [h.hit], replaceLocation: "Replace" });
  assert.deepEqual(h.hit.inserted, [["the", "Replace"]]);

  h = makeCtx();
  await assert.rejects(
    EditApply.swapText(h.ctx, "teh", "the", { searchInScope: async () => [], replaceLocation: "Replace" }),
    (e) => e.peApplyPhase === "before-edit" && /Text not found/.test(e.message)
  );
  assert.equal(h.hit.inserted.length, 0);

  h = makeCtx({ failSyncOn: [1] });
  await assert.rejects(
    EditApply.swapText(h.ctx, "teh", "the", { searchInScope: async () => [h.hit], replaceLocation: "Replace" }),
    (e) => e.peApplyPhase === "before-edit"
  );
  assert.equal(h.hit.inserted.length, 0);

  h = makeCtx({ failSyncOn: [2] });
  await assert.rejects(
    EditApply.swapText(h.ctx, "teh", "the", { searchInScope: async () => [h.hit], replaceLocation: "Replace" }),
    (e) => e.peApplyPhase === "uncertain"
  );
  assert.equal(h.hit.inserted.length, 1);

  h = makeCtx({ hitText: "" });
  await assert.rejects(
    EditApply.swapText(h.ctx, "teh", "the", { searchInScope: async () => [h.hit], replaceLocation: "Replace" }),
    (e) => e.peApplyPhase === "before-edit" && /Match lost/.test(e.message)
  );

  h = makeCtx();
  h.hit.insertText = () => {
    throw Object.assign(new Error("InvalidArgument"), { code: "InvalidArgument" });
  };
  await assert.rejects(
    EditApply.swapText(h.ctx, "teh", "the", { searchInScope: async () => [h.hit], replaceLocation: "Replace" }),
    (e) => e.peApplyPhase === "before-edit"
  );

  h = makeCtx();
  await assert.rejects(
    EditApply.swapText(h.ctx, "teh", "the", {
      searchInScope: async () => {
        throw "string failure";
      },
      replaceLocation: "Replace",
    }),
    (e) => e.name === "Error" && e.peApplyPhase === "before-edit" && /string failure/.test(e.message)
  );
});

test("ErrorGuard: shows a redacted recovery message, rate-limits, and ignores cancels and benign noise", () => {
  const { ErrorGuard } = loadRecoveryStack();
  let t = 0;
  const notes = [];
  let fatal = 0;
  const guard = ErrorGuard.create({ now: () => t, notify: (n) => notes.push(n), onFatal: () => fatal++ });
  assert.equal(guard.handleError({ message: "ResizeObserver loop limit exceeded" }), false);
  assert.equal(guard.handleRejection({ reason: { code: "PE_CANCELLED", message: "Cancelled." }, preventDefault() {} }), false);
  assert.equal(notes.length, 0);

  assert.equal(guard.handleError({ message: "boom url?key=AIzaSyA1234567890123456789012345678901" }), true);
  assert.equal(notes.length, 1);
  assert.match(notes[0].message, /reload/i);
  assert.doesNotMatch(notes[0].detail, /AIza/);
  assert.equal(guard.handleRejection({ reason: new Error("again") }), true);
  assert.equal(guard.handleRejection({ reason: "string reason" }), false, "third inside window is suppressed");
  assert.equal(notes.length, 2);
  assert.equal(fatal, 3, "busy-state reset still runs for suppressed notifications");
  t = 11000;
  assert.equal(guard.handleError({ message: "later" }), true);
  assert.equal(notes[2].suppressed, 1);
  assert.equal(guard.handleError(undefined), true, "undefined event still produces a safe message");
});

test("ErrorGuard.bind attaches once, tolerates missing window pieces, and never throws from hooks", () => {
  const { ErrorGuard } = loadRecoveryStack();
  assert.equal(ErrorGuard.bind(null, {}), null);
  assert.equal(ErrorGuard.bind({}, {}), null);
  const listeners = {};
  const win = {
    addEventListener(type, fn) {
      listeners[type] = fn;
    },
  };
  const guard = ErrorGuard.bind(win, {
    notify() {
      throw new Error("notify boom");
    },
    onFatal() {
      throw new Error("fatal boom");
    },
  });
  assert.ok(guard);
  assert.equal(ErrorGuard.bind(win, {}), null, "second bind is a no-op");
  assert.doesNotThrow(() => listeners.error({ message: "x" }));
  assert.doesNotThrow(() => listeners.unhandledrejection({ reason: new Error("y") }));
});

test("ErrorGuard.redact scrubs keys and caps length", () => {
  const { ErrorGuard } = loadRecoveryStack();
  assert.equal(ErrorGuard.redact("apiKey: sk-secret-value more"), "apiKey: [redacted] more");
  assert.equal(ErrorGuard.redact(null), "");
  assert.ok(ErrorGuard.redact("y".repeat(1000)).length <= 160);
});

test("PhaseTiming is a no-op unless enabled and formats a summary when on", () => {
  const { PhaseTiming } = loadRecoveryStack();
  const off = PhaseTiming.create({ enabled: false });
  off.mark("read");
  assert.equal(off.summary(), "");
  let t = 1000;
  const on = PhaseTiming.create({ enabled: true, now: () => t });
  t = 1120;
  on.mark("read");
  t = 1160;
  on.mark("analyze");
  assert.equal(on.summary(), "read 120ms · analyze 40ms (total 160ms)");
  assert.equal(PhaseTiming.isEnabled({ location: { search: "?pe-dev=1" } }), true);
  assert.equal(PhaseTiming.isEnabled({ location: { search: "", hash: "#pe-dev=1" } }), true);
  assert.equal(PhaseTiming.isEnabled({ location: { search: "?x=1" }, localStorage: { getItem: () => "1" } }), true);
  assert.equal(PhaseTiming.isEnabled({ location: { search: "" }, localStorage: { getItem: () => null } }), false);
  assert.equal(
    PhaseTiming.isEnabled({
      localStorage: {
        getItem() {
          throw new Error("denied");
        },
      },
    }),
    false
  );
  assert.equal(PhaseTiming.isEnabled(undefined), false);
});

function officeMock({ saveStatus = "succeeded", throwOnSet = false, never = false } = {}) {
  const store = {};
  return {
    store,
    Office: {
      AsyncResultStatus: { Succeeded: "succeeded" },
      context: {
        document: {
          settings: {
            get: (k) => store[k],
            set: (k, v) => {
              if (throwOnSet) throw new Error("quota");
              store[k] = v;
            },
            saveAsync: (cb) => {
              if (!never) cb({ status: saveStatus });
            },
          },
        },
      },
    },
  };
}

test("Settings.setAsync always resolves: success, failed save, throw, missing Office, and a hung save", async () => {
  const ok = officeMock();
  let { Settings } = loadLib(lib("settings-store"), { Office: ok.Office, setTimeout, clearTimeout });
  assert.equal(await Settings.setAsync("K", "v"), true);
  assert.equal(ok.store.K, "v");

  const failed = officeMock({ saveStatus: "failed" });
  ({ Settings } = loadLib(lib("settings-store"), { Office: failed.Office, setTimeout, clearTimeout }));
  assert.equal(await Settings.setAsync("K", "v"), false);

  const thrower = officeMock({ throwOnSet: true });
  ({ Settings } = loadLib(lib("settings-store"), { Office: thrower.Office, setTimeout, clearTimeout }));
  assert.equal(await Settings.setAsync("K", "v"), false);

  ({ Settings } = loadLib(lib("settings-store"), { setTimeout, clearTimeout }));
  assert.equal(await Settings.setAsync("K", "v"), false);
  assert.equal(Settings.get("K", "fallback"), "fallback");

  const hung = officeMock({ never: true });
  ({ Settings } = loadLib(lib("settings-store"), { Office: hung.Office, setTimeout, clearTimeout }));
  Settings.SAVE_TIMEOUT_MS = 20;
  assert.equal(await Settings.setAsync("K", "v"), false);
});

test("Settings tolerates corrupt stored lists and unavailable localStorage", async () => {
  const mock = officeMock();
  mock.store.PROZAEDIT_MUTED_RULES = '{"not":"an array"}';
  mock.store.PROZAEDIT_DICTIONARY = "not json {{{";
  mock.store.PROZAEDIT_CUSTOM_STYLE = "42";
  const { Settings } = loadLib(lib("settings-store"), { Office: mock.Office, setTimeout, clearTimeout });
  assert.deepEqual(plain(Settings.getMutedRules()), []);
  assert.deepEqual(plain(Settings.getDictionary()), []);
  assert.doesNotThrow(() => Settings.getCustomStyleGuide());
  await assert.doesNotReject(Settings.muteRule("rule:a"));
  assert.deepEqual(JSON.parse(mock.store.PROZAEDIT_MUTED_RULES), ["rule:a"]);
  assert.deepEqual(plain(Settings.getGlobalMutedRules()), [], "no localStorage in this sandbox");
  assert.equal(Settings.isTargetDismissedGlobally("anything"), false);
  await assert.doesNotReject(Settings.dismissTarget("anything"));
});

test("Settings global lists keep the newest 800 entries", () => {
  const writes = {};
  const store = {
    getItem: (k) => writes[k] ?? null,
    setItem: (k, v) => {
      writes[k] = v;
    },
  };
  const { Settings } = loadLib(lib("settings-store"), { localStorage: store });
  const arr = Array.from({ length: 900 }, (_, i) => `t${i}`);
  assert.equal(Settings._writeGlobalJson("K", arr), true);
  const back = Settings._readGlobalJson("K");
  assert.equal(back.length, 800);
  assert.equal(back[back.length - 1], "t899");
});
