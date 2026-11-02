// PE-96: diagnostics ingest worker (not deployed by default) must not let a report forge markdown, mentions or break its code fence.
import test from "node:test";
import assert from "node:assert/strict";
import { buildIssueBody, sanitizeField } from "../tools/diagnostics-ingest/src/index.js";

test("PE-96 worker: report fields cannot break the code fence, mention users or inject HTML", () => {
  const evil = "```\n# pwned @octocat <img src=x onerror=1> | x |\r\n```";
  const body = buildIssueBody({ kind: "user", version: evil, ts: evil, officePlatform: evil, officeHost: evil, message: evil, userNote: evil, stack: evil, context: { a: evil }, ua: evil });
  assert.ok(!body.includes("```\n# pwned"), "fence escaped");
  assert.ok(!/@octocat/.test(body), "mention neutralised");
  assert.ok(!/<img/i.test(body), "html neutralised");
  const fences = body.split("\n").filter((l) => l.trim() === "```" || l.startsWith("```json")).length;
  assert.equal(fences % 2, 0, "balanced fences");
  const tableRows = body.split("\n").filter((l) => l.startsWith("| Version") || l.startsWith("| Time"));
  for (const r of tableRows) assert.equal((r.match(/(?<!\\)\|/g) || []).length, 3, "cell cannot add columns: " + r);
});

test("PE-96 worker: sanitizeField bounds length and strips control characters", () => {
  assert.equal(sanitizeField(null, 5), "");
  assert.ok(sanitizeField("a".repeat(100), 10).length <= 11);
  assert.equal(sanitizeField("a\u0000b\u0007c", 10), "abc");
});
