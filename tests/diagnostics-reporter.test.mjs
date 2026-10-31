import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("Diagnostics.redactString removes emails and API key patterns", () => {
  const pe = loadLib("src/taskpane/lib/diagnostics-reporter.js");
  const { redactString } = pe.Diagnostics;
  assert.match(redactString("Contact me@example.com please"), /\[redacted-email\]/);
  assert.match(redactString("key AIzaSyDummyKey123456789012345678901"), /\[redacted-key\]/);
  assert.equal(redactString("password=secret"), "[redacted-sensitive]");
});

test("Diagnostics.buildPayload never includes raw document fields", () => {
  const pe = loadLib("src/taskpane/lib/diagnostics-reporter.js");
  const payload = pe.Diagnostics.buildPayload({
    kind: "user",
    message: "test",
    context: { apiKey: "AIzaSyShouldNotAppear", document: "chapter one text" },
  });
  assert.equal(payload.kind, "user");
  const ctx = JSON.stringify(payload.context || {});
  assert.doesNotMatch(ctx, /chapter one/i);
  assert.doesNotMatch(ctx, /AIzaSyShouldNotAppear/);
});
