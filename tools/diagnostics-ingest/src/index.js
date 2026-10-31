const MAX_BODY = 32_000;
const ALLOWED_KINDS = new Set(["crash", "unhandled", "user", "major"]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function sanitizeField(s, max) {
  if (s == null) return "";
  const t = String(s);
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function buildIssueBody(payload) {
  const lines = [
    "Automated anonymous diagnostics report (ProzaEdit Word).",
    "",
    "**Do not paste manuscript text here.** Client redacts document content; verify before acting.",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Kind | ${sanitizeField(payload.kind, 40)} |`,
    `| Version | ${sanitizeField(payload.version, 40)} |`,
    `| Time (client) | ${sanitizeField(payload.ts, 60)} |`,
    `| Office platform | ${sanitizeField(payload.officePlatform, 80)} |`,
    `| Office host | ${sanitizeField(payload.officeHost, 40)} |`,
    "",
    "### Message",
    "",
    "```",
    sanitizeField(payload.message, 4000),
    "```",
  ];
  if (payload.userNote) {
    lines.push("", "### User note", "", sanitizeField(payload.userNote, 600));
  }
  if (payload.stack) {
    lines.push("", "### Stack", "", "```", sanitizeField(payload.stack, 6000), "```");
  }
  if (payload.context) {
    lines.push(
      "",
      "### Context (redacted)",
      "",
      "```json",
      sanitizeField(JSON.stringify(payload.context, null, 2), 8000),
      "```"
    );
  }
  if (payload.ua) {
    lines.push("", "### User-Agent", "", sanitizeField(payload.ua, 500));
  }
  return lines.join("\n");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "method" }, 405, cors);
    }

    const ct = request.headers.get("Content-Type") || "";
    if (!ct.includes("application/json")) {
      return json({ ok: false, error: "content-type" }, 415, cors);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return json({ ok: false, error: "too-large" }, 413, cors);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "invalid-json" }, 400, cors);
    }

    if (!payload || typeof payload !== "object") {
      return json({ ok: false, error: "invalid-body" }, 400, cors);
    }

    const kind = ALLOWED_KINDS.has(payload.kind) ? payload.kind : "user";
    const version = sanitizeField(payload.version || "unknown", 40);
    const ctxHint =
      payload.context && typeof payload.context === "object"
        ? sanitizeField(payload.context.phase || payload.context.label || payload.context.source || "report", 80)
        : "report";

    const token = env.GITHUB_TOKEN;
    const repo = env.GITHUB_REPO || "drcracius/prozaedit-word";
    if (!token) {
      return json({ ok: false, error: "server-not-configured" }, 503, cors);
    }

    const title = `[PE ${kind}] ${version} · ${ctxHint}`.slice(0, 240);
    const labels = String(env.GITHUB_LABELS || "auto-report")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "prozaedit-diagnostics-ingest",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body: buildIssueBody({ ...payload, kind }),
        labels,
      }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      return json({ ok: false, error: "github", status: ghRes.status, detail: errText.slice(0, 200) }, 502, cors);
    }

    const issue = await ghRes.json();
    return json({ ok: true, issue: issue.html_url }, 202, cors);
  },
};
