#!/usr/bin/env node
/**
 * Production-level Office manifest check (same rules Word web upload uses for AppDomain and icons).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const r = spawnSync("npx --yes office-addin-manifest validate -p manifest.hosted.xml", {
  cwd: root,
  encoding: "utf8",
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});

const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
if (r.status !== 0) {
  console.error(out || "office-addin-manifest validate failed");
  process.exit(r.status ?? 1);
}
console.log("OK: manifest.hosted.xml passes Microsoft production validation.");
