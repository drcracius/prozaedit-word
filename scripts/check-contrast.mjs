#!/usr/bin/env node
/**
 * Computes WCAG 2.x contrast ratios for the task pane CSS, in both themes.
 * 1) Rules that set both a text colour and a background: pair checked as written.
 * 2) Rules that set only a text colour: checked against every page surface (--surface, --bg, --surface-subtle, --pe-card-surface).
 * Colours with alpha, gradients and unresolved var() are skipped (reported as "skipped").
 * Limits: static; cannot see inheritance from parent rules or runtime-injected inline styles.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cssPath = path.join(here, "..", "src", "taskpane", "taskpane.css");

function parseColor(v) {
  v = String(v || "").trim().toLowerCase();
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = v.match(/^#([0-9a-f]{6})$/);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = v.match(/^rgb\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)\s*\)$/);
  if (m) return [+m[1], +m[2], +m[3]];
  const named = { white: [255, 255, 255], black: [0, 0, 0] };
  return named[v] || null;
}

function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function parseRules(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const re = /([^{}@]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const decls = {};
    m[2].split(";").forEach((d) => {
      const i = d.indexOf(":");
      if (i > 0) decls[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim();
    });
    rules.push({ selector: m[1].trim().replace(/\s+/g, " "), decls });
  }
  return rules;
}

export function themeVars(rules, theme) {
  const vars = {};
  rules.forEach((r) => {
    const sel = r.selector;
    const light = /(^|,)\s*:root\s*(,|$)|\[data-pe-theme="light"\]/.test(sel);
    const dark = /\[data-pe-theme="dark"\]/.test(sel);
    const applies = theme === "dark" ? light || dark : light && !/^\[data-pe-theme="dark"\]$/.test(sel);
    if (!applies) return;
    Object.entries(r.decls).forEach(([k, v]) => {
      if (k.startsWith("--")) vars[k] = v;
    });
  });
  return vars;
}

function resolve(v, vars, depth = 0) {
  if (v == null || depth > 8) return null;
  v = v.replace(/\s*!important/, "").trim();
  const m = v.match(/^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/);
  if (m) return resolve(vars[m[1]] ?? m[2], vars, depth + 1);
  return v;
}

/** Pairs split across rules (class on the element + modifier class that sets the background). */
const EXTRA_PAIRS = [
  [".badge on .badge-confirmed", "--pe-on-accent", "--red"],
  [".badge on .badge-pref", "--pe-on-orange", "--orange"],
];

export function analyze(css = fs.readFileSync(cssPath, "utf8")) {
  const rules = parseRules(css);
  const out = { fails: [], checked: 0, skipped: 0 };
  for (const theme of ["light", "dark"]) {
    const vars = themeVars(rules, theme);
    const surfaces = ["--surface", "--bg", "--surface-subtle", "--pe-card-surface"].map((k) => [k, parseColor(resolve(vars[k], vars))]);
    for (const r of rules) {
      if (r === rules[0]) {
        EXTRA_PAIRS.forEach(([label, f, b]) => {
          const fg = parseColor(resolve(`var(${f})`, vars));
          const bg = parseColor(resolve(`var(${b})`, vars));
          out.checked++;
          const cr = ratio(fg, bg);
          if (cr < 4.5) out.fails.push({ theme, selector: label, fg: f, bg: b, ratio: Math.round(cr * 100) / 100, need: 4.5 });
        });
      }
      if (/\[data-pe-theme="(light|dark)"\]$/.test(r.selector) && !r.selector.includes(" ")) continue;
      if (r.selector.includes(":root")) continue;
      if (r.selector.includes("data-pe-theme=\"dark\"") && theme === "light") continue;
      if (r.selector.includes("data-pe-theme=\"light\"") && theme === "dark") continue;
      const fgRaw = r.decls.color;
      if (!fgRaw || r.selector === ".badge") continue;
      const fg = parseColor(resolve(fgRaw, vars));
      const bgRaw = r.decls["background-color"] || (r.decls.background && !/gradient|url/.test(r.decls.background) ? r.decls.background : null);
      const size = parseFloat(r.decls["font-size"]) || 0;
      const need = size >= 18 ? 3 : 4.5;
      if (!fg) {
        out.skipped++;
        continue;
      }
      const bgs = bgRaw ? [["own", parseColor(resolve(bgRaw, vars))]] : surfaces;
      for (const [name, bg] of bgs) {
        if (!bg) {
          out.skipped++;
          continue;
        }
        out.checked++;
        const cr = ratio(fg, bg);
        if (cr < need) out.fails.push({ theme, selector: r.selector, fg: resolve(fgRaw, vars), bg: name, ratio: Math.round(cr * 100) / 100, need });
      }
    }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = analyze();
  console.log(`checked ${res.checked}, skipped ${res.skipped}, failures ${res.fails.length}`);
  res.fails.forEach((f) => console.log(`${f.theme}\t${f.ratio}\t${f.fg} on ${f.bg}\t${f.selector}`));
  process.exit(res.fails.length ? 1 : 0);
}
