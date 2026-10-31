/**
 * Safe anonymous diagnostics — no document text, selection, API keys, or PII.
 */
(function (global) {
  const ns = (global.ProzaEdit = global.ProzaEdit || {});
  const cfg = () => ns.DiagnosticsConfig || {};
  const OPT_IN_KEY = "peDiagnosticsOptIn";
  const DEDUPE_MS = 60_000;
  const MAX_NOTE = 500;
  const MAX_MESSAGE = 2000;
  const MAX_STACK = 8000;
  const MAX_CONTEXT_JSON = 4000;
  const MAX_BODY_BYTES = 32_000;

  const SENSITIVE_KEY = /^(apikey|api_key|token|password|secret|authorization|gemini|key|document|selection|excerpt|body|text|content|manuscript|snippet|prompt|message_full)$/i;
  const SENSITIVE_SUB = /(apikey|api_key|password|secret|token|authorization|bearer|sk-[a-z0-9]{10,})/i;
  const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

  let lastFingerprint = "";
  let lastSentAt = 0;
  const retryQueue = [];
  let flushTimer = null;

  function isOptIn() {
    try {
      return localStorage.getItem(OPT_IN_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  function setOptIn(on) {
    try {
      localStorage.setItem(OPT_IN_KEY, on ? "1" : "0");
    } catch (_) {}
  }

  function truncate(s, max) {
    const t = String(s == null ? "" : s);
    if (t.length <= max) return t;
    return t.slice(0, max) + "…";
  }

  function redactString(s) {
    let out = truncate(String(s == null ? "" : s), MAX_MESSAGE);
    out = out.replace(EMAIL_RE, "[redacted-email]");
    out = out.replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted-key]");
    out = out.replace(/\bsk-[a-zA-Z0-9]{16,}\b/g, "[redacted-key]");
    if (SENSITIVE_SUB.test(out)) out = "[redacted-sensitive]";
    return out;
  }

  function redactValue(key, val, depth) {
    if (depth > 4) return "[depth]";
    const k = String(key || "");
    if (SENSITIVE_KEY.test(k)) return "[redacted]";
    if (val == null) return val;
    if (typeof val === "string") return redactString(val);
    if (typeof val === "number" || typeof val === "boolean") return val;
    if (Array.isArray(val)) {
      return val.slice(0, 20).map((v, i) => redactValue(String(i), v, depth + 1));
    }
    if (typeof val === "object") {
      const out = {};
      const keys = Object.keys(val).slice(0, 30);
      keys.forEach((kk) => {
        out[kk] = redactValue(kk, val[kk], depth + 1);
      });
      return out;
    }
    return String(val).slice(0, 200);
  }

  function redactContext(ctx) {
    if (!ctx || typeof ctx !== "object") return undefined;
    const red = redactValue("context", ctx, 0);
    try {
      const raw = JSON.stringify(red);
      if (raw.length > MAX_CONTEXT_JSON) {
        return { summary: truncate(raw, MAX_CONTEXT_JSON), truncated: true };
      }
    } catch (_) {
      return { summary: "[context-unserializable]" };
    }
    return red;
  }

  function buildPayload(input) {
    const kind = ["crash", "unhandled", "user", "major"].includes(input?.kind) ? input.kind : "user";
    const platform = (() => {
      try {
        const o = global.Office?.context?.platform;
        const h = global.Office?.context?.host;
        return { officePlatform: o != null ? String(o) : "unknown", officeHost: h != null ? String(h) : "unknown" };
      } catch (_) {
        return { officePlatform: "unknown", officeHost: "unknown" };
      }
    })();
    return {
      kind,
      version: cfg().getBuildVersion?.() || "unknown",
      message: redactString(input?.message || "(no message)"),
      stack: input?.stack ? truncate(redactString(input.stack), MAX_STACK) : undefined,
      context: redactContext(input?.context),
      userNote:
        input?.userNote != null && String(input.userNote).trim()
          ? truncate(redactString(input.userNote), MAX_NOTE)
          : undefined,
      ts: new Date().toISOString(),
      ua: truncate(typeof navigator !== "undefined" ? navigator.userAgent : "", 400),
      ...platform,
    };
  }

  function fingerprint(payload) {
    return `${payload.kind}|${payload.message}|${(payload.stack || "").slice(0, 120)}`;
  }

  function shouldDedupe(fp) {
    const now = Date.now();
    if (fp === lastFingerprint && now - lastSentAt < DEDUPE_MS) return true;
    lastFingerprint = fp;
    lastSentAt = now;
    return false;
  }

  function payloadJson(payload) {
    return JSON.stringify(payload, null, 2);
  }

  async function copyToClipboard(text) {
    if (global.navigator?.clipboard?.writeText) {
      await global.navigator.clipboard.writeText(text);
      return true;
    }
    const ta = global.document?.createElement?.("textarea");
    if (!ta) return false;
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    global.document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = global.document.execCommand("copy");
    } catch (_) {}
    ta.remove();
    return ok;
  }

  async function postIngest(payload) {
    const url = cfg().DIAGNOSTICS_INGEST_URL?.trim?.() || "";
    if (!url) return { ok: false, reason: "no-url" };
    const body = JSON.stringify(payload);
    if (body.length > MAX_BODY_BYTES) return { ok: false, reason: "too-large" };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      mode: "cors",
      credentials: "omit",
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    return { ok: true };
  }

  function scheduleRetry(payload) {
    if (retryQueue.length >= 5) retryQueue.shift();
    retryQueue.push(payload);
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushRetryQueue();
    }, 30_000);
  }

  async function flushRetryQueue() {
    if (!isOptIn() || !cfg().ingestEnabled?.()) return;
    while (retryQueue.length) {
      const p = retryQueue[0];
      try {
        const r = await postIngest(p);
        if (r.ok) retryQueue.shift();
        else break;
      } catch (_) {
        break;
      }
    }
  }

  async function deliver(payload, opts) {
    const forceClipboard = opts?.forceClipboard;
    const optIn = isOptIn();
    const hasUrl = cfg().ingestEnabled?.();

    if (optIn && hasUrl && !forceClipboard) {
      try {
        const r = await postIngest(payload);
        if (r.ok) return { mode: "sent", detail: "Report sent (anonymous)." };
        scheduleRetry(payload);
        return { mode: "queued", detail: "Could not send now; queued for retry." };
      } catch (_) {
        scheduleRetry(payload);
        return { mode: "queued", detail: "Network error; queued for retry." };
      }
    }

    const json = payloadJson(payload);
    const copied = await copyToClipboard(json);
    if (copied) {
      if (!optIn) {
        return {
          mode: "clipboard",
          detail: "Opt-in is off — redacted report copied to clipboard. Email it to the owner or enable Send anonymous crash reports.",
        };
      }
      if (!hasUrl) {
        return {
          mode: "clipboard",
          detail: "Ingest URL not configured — redacted report copied to clipboard for the owner.",
        };
      }
      return { mode: "clipboard", detail: "Redacted report copied to clipboard." };
    }
    return { mode: "failed", detail: "Could not copy report — check browser clipboard permissions." };
  }

  async function sendReport(input) {
    const payload = buildPayload(input || {});
    const fp = fingerprint(payload);
    if (input?.skipDedupe !== true && shouldDedupe(fp)) {
      return { mode: "deduped", detail: "Same report was sent recently; skipped." };
    }
    return deliver(payload, input);
  }

  function reportMajor(context, message) {
    return sendReport({
      kind: "major",
      message: message || "Major operational failure",
      context: context || {},
    });
  }

  function bindGlobalHandlers() {
    if (global.__peDiagnosticsBound) return;
    global.__peDiagnosticsBound = true;

    const prevOnError = global.onerror;
    global.onerror = function (message, source, lineno, colno, error) {
      if (isOptIn()) {
        sendReport({
          kind: "crash",
          message: String(message || "Script error"),
          stack: error?.stack || `${source}:${lineno}:${colno}`,
          context: { source: redactString(source), lineno, colno },
        }).catch(() => {});
      }
      if (typeof prevOnError === "function") return prevOnError.apply(this, arguments);
      return false;
    };

    global.addEventListener("unhandledrejection", (ev) => {
      if (!isOptIn()) return;
      const reason = ev.reason;
      sendReport({
        kind: "unhandled",
        message: reason?.message ? String(reason.message) : String(reason || "Unhandled rejection"),
        stack: reason?.stack,
      }).catch(() => {});
    });
  }

  function initDiagnosticsUi() {
    const toggle = global.document?.getElementById?.("peDiagnosticsOptIn");
    if (toggle) {
      toggle.checked = isOptIn();
      if (!toggle.dataset.bound) {
        toggle.dataset.bound = "1";
        toggle.addEventListener("change", () => setOptIn(toggle.checked));
      }
    }
    const ghFallback = global.document?.getElementById?.("peDiagnosticsGithubFallback");
    const ghUrl = cfg().DIAGNOSTICS_GITHUB_ISSUES_URL;
    if (ghFallback) {
      const show = !cfg().ingestEnabled?.() && typeof ghUrl === "string" && ghUrl.length > 0;
      ghFallback.hidden = !show;
    }
  }

  ns.Diagnostics = {
    OPT_IN_KEY,
    isOptIn,
    setOptIn,
    buildPayload,
    sendReport,
    reportMajor,
    bindGlobalHandlers,
    initDiagnosticsUi,
    flushRetryQueue,
    redactString,
  };
})(typeof window !== "undefined" ? window : globalThis);
