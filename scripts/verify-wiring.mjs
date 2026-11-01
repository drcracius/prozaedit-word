#!/usr/bin/env node
/**
 * Static wiring gate for the task pane (no browser, no Office.js).
 * Fails on: duplicate HTML ids, getEl()/getElementById() literals with no matching id,
 * inline on*="" handlers that call undefined functions, and missing local script/CSS files.
 *
 * Limits: dynamic ids (template literals) are not checked; handlers defined at runtime are
 * only seen if they appear as `function name`, `window.name =`, or top-level const/let/var.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.join(here, "..");

const HANDLER_KEYWORDS = new Set([
  "if", "for", "while", "switch", "return", "function", "typeof", "new", "catch", "event", "this", "void", "delete",
  "alert", "confirm", "prompt", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "parseInt", "parseFloat",
  "String", "Number", "Boolean", "Array", "Object", "JSON", "Math", "Date", "Promise", "encodeURIComponent",
]);

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function listLocalAssets(html, re) {
  return [...html.matchAll(re)].map((m) => m[1]).filter((u) => u && !/^(https?:)?\/\//i.test(u) && !u.startsWith("data:"));
}

export function checkWiring(root = defaultRoot) {
  const paneDir = path.join(root, "src", "taskpane");
  const htmlPath = path.join(paneDir, "taskpane.html");
  const html = read(htmlPath);
  const problems = [];

  const scripts = listLocalAssets(html, /<script[^>]*\ssrc="([^"]+)"/g);
  const styles = listLocalAssets(html, /<link[^>]*\shref="([^"]+\.css[^"]*)"/g);
  for (const rel of [...scripts, ...styles]) {
    const clean = rel.split("?")[0].split("#")[0];
    if (!fs.existsSync(path.join(paneDir, clean))) problems.push(`missing asset: ${rel} (referenced from taskpane.html)`);
  }

  const jsSources = scripts
    .map((rel) => rel.split("?")[0])
    .filter((rel) => fs.existsSync(path.join(paneDir, rel)))
    .map((rel) => ({ rel, text: read(path.join(paneDir, rel)) }));
  const allJs = jsSources.map((s) => s.text).join("\n");

  const idCounts = new Map();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    idCounts.set(m[1], (idCounts.get(m[1]) || 0) + 1);
  }
  for (const [id, n] of idCounts) {
    if (n > 1) problems.push(`duplicate id in taskpane.html: #${id} (${n} times)`);
  }

  const knownIds = new Set(idCounts.keys());
  for (const m of allJs.matchAll(/\bid=\\?"([A-Za-z][\w-]*)\\?"/g)) knownIds.add(m[1]);
  for (const m of allJs.matchAll(/\.id\s*=\s*["']([A-Za-z][\w-]*)["']/g)) knownIds.add(m[1]);
  for (const m of allJs.matchAll(/setAttribute\(\s*["']id["']\s*,\s*["']([A-Za-z][\w-]*)["']/g)) knownIds.add(m[1]);

  for (const { rel, text } of jsSources) {
    for (const m of text.matchAll(/\b(?:getEl|getElementById)\(\s*["']([^"']+)["']\s*\)/g)) {
      if (!knownIds.has(m[1])) problems.push(`orphan id: ${rel}:${lineOf(text, m.index)} looks up #${m[1]} but no element defines it`);
    }
  }

  const defined = new Set();
  for (const m of allJs.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
  for (const m of allJs.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) defined.add(m[1]);
  for (const m of allJs.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);

  const handlerSources = [{ rel: "taskpane.html", text: html }, ...jsSources.filter((s) => s.rel.endsWith("taskpane.js"))];
  for (const { rel, text } of handlerSources) {
    for (const m of text.matchAll(/\son(?:click|change|input|keydown|keyup|submit|focus|blur)=\\?"([^"]*)\\?"/g)) {
      const body = m[1].replace(/\\'/g, "'");
      for (const call of body.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
        const name = call[1];
        if (HANDLER_KEYWORDS.has(name) || defined.has(name)) continue;
        problems.push(`undefined inline handler: ${rel}:${lineOf(text, m.index)} calls ${name}() which is not defined in the loaded scripts`);
      }
    }
  }

  return { problems, stats: { ids: idCounts.size, scripts: scripts.length, handlers: defined.size } };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { problems, stats } = checkWiring(process.argv[2] ? path.resolve(process.argv[2]) : defaultRoot);
  if (problems.length) {
    console.error(`Wiring check FAILED (${problems.length} problem${problems.length === 1 ? "" : "s"}):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`OK: wiring check passed (${stats.ids} ids, ${stats.scripts} scripts, ${stats.handlers} named functions).`);
}
