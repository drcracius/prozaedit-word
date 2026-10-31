import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/**
 * Load a taskpane lib script in an isolated VM (no Office.js).
 * @param {string} relPath e.g. "src/taskpane/lib/lexical-banks.js"
 * @param {object} [seed] extra globals (e.g. preloaded ProzaEdit modules)
 */
export function loadLib(relPath, seed = {}) {
  const file = path.join(root, relPath);
  const code = fs.readFileSync(file, "utf8");
  const globalThis = { ProzaEdit: {}, ...(seed.globalThis || {}) };
  globalThis.ProzaEdit = globalThis.ProzaEdit || {};
  const sandbox = {
    globalThis,
    window: globalThis,
    ProzaEdit: globalThis.ProzaEdit,
    document: undefined,
    Office: undefined,
    ...seed,
  };
  sandbox.window = globalThis;
  sandbox.ProzaEdit = globalThis.ProzaEdit;
  vm.runInNewContext(code, sandbox, { filename: relPath });
  return globalThis.ProzaEdit || sandbox.ProzaEdit;
}

export function loadLibs(relPaths, seed = {}) {
  let ns = { ...(seed.globalThis?.ProzaEdit || seed.ProzaEdit || {}) };
  for (const rel of relPaths) {
    const loaded = loadLib(rel, { globalThis: { ProzaEdit: ns } });
    ns = { ...ns, ...loaded };
  }
  return ns;
}
