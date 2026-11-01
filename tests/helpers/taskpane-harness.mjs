/**
 * Boots the real taskpane.html + scripts in jsdom with a mocked Office/Word host.
 * Not a real Word host: it proves wiring, state machines, and error handling — not Word API behavior.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const paneDir = path.join(root, "src", "taskpane");

export function readPaneHtml() {
  return fs.readFileSync(path.join(paneDir, "taskpane.html"), "utf8");
}

export function listPaneScripts(html = readPaneHtml()) {
  return [...html.matchAll(/<script src="((?!https?:)[^"]+\.js)"/g)].map((m) => m[1]);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function waitFor(predicate, { timeout = 3000, interval = 10, message = "condition" } = {}) {
  const start = Date.now();
  for (;;) {
    let value;
    try {
      value = predicate();
    } catch (_) {
      value = false;
    }
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`Timed out waiting for ${message}`);
    await sleep(interval);
  }
}

export function createWordMock(opts = {}) {
  const state = {
    paragraphs: opts.paragraphs || ["Hello world. This is very good text."],
    selection: opts.selection ?? "",
    syncCount: 0,
    runs: 0,
    inserted: [],
    selected: [],
    failSyncAt: null,
    failSyncError: null,
    failRunError: null,
    syncHook: null,
    settingsFail: false,
    headings: [],
  };
  const settings = { ...(opts.settings || {}) };
  const makeRange = (text) => ({
    text,
    load() {},
    select() {
      state.selected.push(text);
    },
    insertText(t) {
      state.inserted.push([text, t]);
      state.paragraphs = state.paragraphs.map((p) => p.replace(text, t));
    },
    getRange() {
      return makeRange(text);
    },
    expandTo() {
      return makeRange(text);
    },
    search(q) {
      return state.bodySearch(q);
    },
  });
  state.bodySearch = (q) => {
    const full = state.paragraphs.join("\n");
    const items = [];
    const low = full.toLowerCase();
    const ql = String(q).toLowerCase();
    let i = 0;
    while (ql && (i = low.indexOf(ql, i)) >= 0 && items.length < 50) {
      items.push(makeRange(full.substr(i, ql.length)));
      i += ql.length;
    }
    return { items, load() {} };
  };
  const Word = {
    InsertLocation: { replace: "Replace", end: "End", start: "Start" },
    Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3", normal: "Normal" },
    run(fn) {
      state.runs++;
      if (state.failRunError) return Promise.reject(state.failRunError);
      const ctx = {
        document: {
          getSelection: () => makeRange(state.selection),
          body: {
            get text() {
              return state.paragraphs.join("\n");
            },
            load() {},
            paragraphs: {
              load() {},
              get items() {
                return state.paragraphs.map((t, i) => ({
                  text: t,
                  styleBuiltIn: state.headings.includes(i) ? "Heading1" : "Normal",
                  load() {},
                  getRange: () => makeRange(t),
                }));
              },
            },
            search: (q) => state.bodySearch(q),
            getRange: () => makeRange(state.paragraphs.join("\n")),
          },
          load() {},
        },
        async sync() {
          state.syncCount++;
          if (state.failSyncAt != null && state.syncCount === state.failSyncAt) {
            throw state.failSyncError || Object.assign(new Error("GeneralException"), { code: "GeneralException" });
          }
          if (state.syncHook) await state.syncHook(state);
        },
      };
      return Promise.resolve().then(() => fn(ctx));
    },
  };
  const Office = {
    HostType: { Word: "Word" },
    AsyncResultStatus: { Succeeded: "succeeded", Failed: "failed" },
    context: {
      document: {
        settings: {
          get: (k) => settings[k],
          set: (k, v) => {
            settings[k] = v;
          },
          saveAsync: (cb) => setTimeout(() => cb({ status: state.settingsFail ? "failed" : "succeeded" }), 0),
        },
      },
    },
    _cb: null,
    onReady(cb) {
      Office._cb = cb;
    },
  };
  return { Word, Office, state, settings };
}

/**
 * @param {{ word?: object, noOffice?: boolean, confirm?: boolean, fetch?: Function, mutateWindow?: Function, url?: string }} [opts]
 */
export async function bootTaskpane(opts = {}) {
  const html = readPaneHtml().replace(/<script\b[^>]*><\/script>/gi, "");
  const errors = [];
  const dom = new JSDOM(html, {
    url: opts.url || "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  const vmContext = dom.getInternalVMContext();
  const mock = createWordMock(opts.word);
  if (!opts.noOffice) {
    window.Office = mock.Office;
    window.Word = mock.Word;
  }
  window.__alerts = [];
  window.alert = (m) => window.__alerts.push(String(m));
  window.confirm = () => (opts.confirm === undefined ? true : opts.confirm);
  window.scrollBy = () => {};
  if (opts.fetch) window.fetch = opts.fetch;
  if (opts.mutateWindow) opts.mutateWindow(window);
  window.addEventListener("error", (e) => errors.push(e.error || new Error(e.message)));
  window.addEventListener("unhandledrejection", (e) => errors.push(e.reason));
  for (const rel of listPaneScripts()) {
    const code = fs.readFileSync(path.join(paneDir, rel), "utf8");
    try {
      new vm.Script(code, { filename: rel }).runInContext(vmContext);
    } catch (e) {
      errors.push(e);
    }
  }
  if (mock.Office._cb) {
    try {
      mock.Office._cb({ host: "Word" });
    } catch (e) {
      errors.push(e);
    }
  }
  if (opts.keepDefaultScope !== true) {
    const sc = window.document.getElementById("scope");
    if (sc) sc.value = "selection";
  }
  const acceptConfirm = opts.confirm === undefined ? true : !!opts.confirm;
  if (window.ProzaEdit?.ConfirmDialog) {
    window.ProzaEdit.ConfirmDialog.show = () => Promise.resolve(acceptConfirm);
  }
  const d = window.document;
  const api = {
    peval: (code) => new vm.Script(code).runInContext(vmContext),
    window,
    document: d,
    errors,
    mock,
    state: mock.state,
    el: (id) => d.getElementById(id),
    click(id) {
      const el = d.getElementById(id);
      if (!el) throw new Error(`#${id} not found`);
      el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
    },
    status: () => d.getElementById("peStatus")?.textContent || "",
    isHidden: (id) => d.getElementById(id)?.classList.contains("hidden") ?? true,
    async settle(ms = 30) {
      await sleep(ms);
    },
    close() {
      try {
        window.close();
      } catch (_) {}
    },
  };
  return api;
}
