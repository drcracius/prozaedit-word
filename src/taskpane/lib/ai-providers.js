/**
 * Provider abstraction for optional AI help. Bring-your-own API key; nothing is called unless the user clicks an AI
 * action and confirms. One generic `complete()` handles timeout, cancel, retry, error mapping and redaction so every
 * provider behaves identically.
 *
 * Facts this design relies on (verified against vendor docs while building PE-81; re-check before release):
 *  - Consumer chat plans (ChatGPT Plus, Claude Pro, Gemini Advanced, Microsoft Copilot) do NOT include API access.
 *    Third-party apps cannot "sign in with the subscription"; API access is billed separately by key.
 *  - OpenAI, Gemini and OpenRouter accept browser (CORS) calls with a key. Anthropic accepts them only with the
 *    `anthropic-dangerous-direct-browser-access: true` header (the key is then visible to this page, so it is kept
 *    local and never written to the document).
 *  - Microsoft 365 Copilot / GitHub Copilot expose no public browser API for this; Azure OpenAI needs a per-customer
 *    endpoint domain — both deferred. "Copy for Copilot" remains the manual path.
 */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  /* MODEL CATALOGUE — edit only this block when vendors retire or add models. Ids/prices taken from vendor pages by the
   PE-86 review on 2026-11-01 (not re-verified with live keys by the code worker; the "Custom model id" box is the escape hatch). */
const MODEL_NOTE = "Prices are approximate (USD per million tokens) and change; check the provider's pricing page. Model list last reviewed 2026-11-01.";

  const PROVIDERS = {
    gemini: {
      id: "gemini",
      short: "Gemini",
      label: "Google Gemini",
      keyUrl: "https://aistudio.google.com/apikey",
      keyHelp: "Free-tier keys from Google AI Studio work (rate-limited). A Gemini Advanced / Google One subscription does not include an API key. Free-tier prompts may be used by Google to improve its products; paid keys are not.",
      browser: { ok: true, note: "CORS allowed with a key." },
      defaultModel: "gemini-3.8-flash",
      models: [
        { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", tier: "low", inUsdPerM: 0.25, outUsdPerM: 1.5 },
        { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", tier: "mid", inUsdPerM: 0.75, outUsdPerM: 3.75 },
        { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", tier: "mid", inUsdPerM: 0.75, outUsdPerM: 3.75 },
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (legacy; existing accounts only)", tier: "mid", inUsdPerM: 0.3, outUsdPerM: 2.5 },
      ],
      buildRequest({ apiKey, model, prompt, maxOutputTokens, temperature }) {
        return {
          url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens, temperature },
            }),
          },
        };
      },
      parse(data) {
        const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
        const text = Array.isArray(parts) ? parts.map((p) => (p && p.text) || "").join("").trim() : "";
        const u = data && data.usageMetadata;
        return {
          text,
          usage: u ? { inputTokens: u.promptTokenCount || 0, outputTokens: u.candidatesTokenCount || 0 } : null,
          blockReason: data && data.promptFeedback && data.promptFeedback.blockReason,
        };
      },
    },

    openai: {
      id: "openai",
      short: "OpenAI",
      label: "OpenAI",
      keyUrl: "https://platform.openai.com/api-keys",
      keyHelp: "Needs an API key with billing on platform.openai.com. A ChatGPT Plus/Pro subscription does not include API access.",
      browser: { ok: true, note: "CORS allowed with a key." },
      defaultModel: "gpt-4o-mini",
      models: [
        { id: "gpt-4o-mini", label: "GPT-4o mini", tier: "low", inUsdPerM: 0.15, outUsdPerM: 0.6 },
        { id: "gpt-4.1-mini", label: "GPT-4.1 mini", tier: "mid", inUsdPerM: 0.4, outUsdPerM: 1.6 },
        { id: "gpt-4.1", label: "GPT-4.1", tier: "high", inUsdPerM: 2, outUsdPerM: 8 },
        { id: "gpt-6-luna", label: "GPT-6 Luna (newer; if your account has it)", tier: "low", inUsdPerM: 0.1, outUsdPerM: 0.5 },
        { id: "gpt-6.1-terra", label: "GPT-6.1 Terra (newer)", tier: "mid", inUsdPerM: 1, outUsdPerM: 5 },
      ],
      buildRequest(o) {
        return chatCompletionsRequest("https://api.openai.com/v1/chat/completions", o);
      },
      parse: parseChatCompletions,
    },

    anthropic: {
      id: "anthropic",
      short: "Claude",
      label: "Anthropic Claude",
      keyUrl: "https://console.anthropic.com/settings/keys",
      keyHelp: "Needs an API key with credits at console.anthropic.com. A Claude Pro/Max subscription does not include API access.",
      browser: { ok: true, note: "Browser calls require the anthropic-dangerous-direct-browser-access header (sent automatically)." },
      defaultModel: "claude-haiku-5-5",
      models: [
        { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", tier: "low", inUsdPerM: 0.1, outUsdPerM: 0.5 },
        { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", tier: "high", inUsdPerM: 2, outUsdPerM: 10 },
        { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (older; may be retired)", tier: "mid", inUsdPerM: 1, outUsdPerM: 5 },
      ],
      buildRequest({ apiKey, model, prompt, maxOutputTokens }) {
        return {
          url: "https://api.anthropic.com/v1/messages",
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({ model, max_tokens: maxOutputTokens, messages: [{ role: "user", content: prompt }] }),
          },
        };
      },
      parse(data) {
        const blocks = data && Array.isArray(data.content) ? data.content : [];
        const text = blocks.map((b) => (b && b.type === "text" ? b.text || "" : "")).join("").trim();
        const u = data && data.usage;
        return { text, usage: u ? { inputTokens: u.input_tokens || 0, outputTokens: u.output_tokens || 0 } : null };
      },
    },

    openrouter: {
      id: "openrouter",
      short: "OpenRouter",
      label: "OpenRouter (many models)",
      keyUrl: "https://openrouter.ai/keys",
      keyHelp: "One key for many vendors' models (including some free ones). Pay-as-you-go credits at openrouter.ai.",
      browser: { ok: true, note: "CORS allowed with a key." },
      defaultModel: "openai/gpt-4o-mini",
      models: [
        { id: "openai/gpt-4o-mini", label: "GPT-4o mini (via OpenRouter)", tier: "low", inUsdPerM: 0.15, outUsdPerM: 0.6 },
        { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (via OpenRouter)", tier: "mid", inUsdPerM: 0.3, outUsdPerM: 2.5 },
        { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 (via OpenRouter)", tier: "mid", inUsdPerM: 1, outUsdPerM: 5 },
      ],
      buildRequest(o) {
        return chatCompletionsRequest("https://openrouter.ai/api/v1/chat/completions", o);
      },
      parse: parseChatCompletions,
    },
  };

  const DEFERRED = [
    { id: "azure-openai", label: "Azure OpenAI", reason: "Each customer has their own endpoint domain; needs a per-tenant manifest domain." },
    { id: "m365-copilot", label: "Microsoft 365 Copilot", reason: "No public API for third-party add-ins. Use 'Copy for Copilot' instead." },
    { id: "github-copilot", label: "GitHub Copilot", reason: "No public browser API." },
    { id: "oauth", label: "Sign in with a subscription", reason: "Not offered by any major vendor for third-party apps (OpenRouter OAuth is a possible later addition)." },
  ];

  function usesNewOpenAiParams(model) {
    return /^(o\d|gpt-[5-9])/i.test(String(model || "").replace(/^openai\//, ""));
  }

  function chatCompletionsRequest(url, { apiKey, model, prompt, maxOutputTokens, temperature }) {
    const body = { model, messages: [{ role: "user", content: prompt }] };
    if (usesNewOpenAiParams(model)) body.max_completion_tokens = maxOutputTokens;
    else {
      body.max_tokens = maxOutputTokens;
      body.temperature = temperature;
    }
    return {
      url,
      init: { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) },
    };
  }

  function parseChatCompletions(data) {
    const choice = data && data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;
    const text = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.map((c) => (c && c.text) || "").join("").trim() : "";
    const u = data && data.usage;
    return { text, usage: u ? { inputTokens: u.prompt_tokens || 0, outputTokens: u.completion_tokens || 0 } : null };
  }

  function makeError(code, message, extra) {
    const err = new Error(message);
    err.code = code;
    err.peAI = true;
    if (extra) Object.assign(err, extra);
    return err;
  }

  const AIProviders = {
    PROVIDERS,
    DEFERRED,
    MODEL_NOTE,
    DEFAULT_PROVIDER: "gemini",
    DEFAULT_TIMEOUT_MS: 90000,
    MAX_PROMPT_CHARS: 32000,
    MIN_INTERVAL_MS: 1500,
    _lastCallAt: 0,

    list() {
      return Object.values(PROVIDERS);
    },
    get(id) {
      return PROVIDERS[id] || null;
    },

    findModel(providerId, modelId) {
      const p = PROVIDERS[providerId];
      return p ? p.models.find((m) => m.id === modelId) || null : null;
    },

    /** Cheapest-adequate default: the provider's defaultModel (always a low/mid tier). */
    defaultModel(providerId) {
      const p = PROVIDERS[providerId];
      return p ? p.defaultModel : "";
    },

    /** Accept a listed model or a custom id (letters, digits and . _ : / - only). */
    normalizeModel(providerId, modelId) {
      const m = String(modelId || "").trim();
      if (!m) return this.defaultModel(providerId);
      if (!/^[A-Za-z0-9._:/-]{2,80}$/.test(m)) return this.defaultModel(providerId);
      return m;
    },

    estimateTokens(text) {
      return Math.max(1, Math.ceil(String(text || "").length / 4));
    },

    /**
     * Estimate for a call. USD is null when the model is unknown (custom id).
     * @returns {{ inputTokens: number, outputTokens: number, totalTokens: number, usd: number|null }}
     */
    estimate(providerId, modelId, prompt, maxOutputTokens) {
      const inputTokens = this.estimateTokens(prompt);
      const outputTokens = Math.max(0, maxOutputTokens || 0);
      const model = this.findModel(providerId, modelId);
      const usd = model ? (inputTokens * model.inUsdPerM + outputTokens * model.outUsdPerM) / 1e6 : null;
      return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, usd };
    },

    formatUsd(usd) {
      if (usd == null) return "cost unknown";
      if (usd < 0.001) return "< $0.001";
      return `~$${usd.toFixed(usd < 0.1 ? 3 : 2)}`;
    },

    mapError(provider, status, data, secrets) {
      const S = root.AISafety;
      const raw = data && data.error && (data.error.message || (typeof data.error === "string" ? data.error : ""));
      const detail = raw ? (S ? S.redact(String(raw), secrets) : String(raw)).slice(0, 220) : "";
      const label = provider.label.split(" ")[0] === "Google" ? "Gemini" : provider.label.split(" (")[0];
      let code = "server";
      let friendly = `${label} HTTP ${status} — the service had a problem; try again later.`;
      if (status === 401 || status === 403) {
        code = "auth";
        friendly = `${label} rejected the API key (HTTP ${status}). Check the key and that billing/credits are active.`;
      } else if (status === 402) {
        code = "billing";
        friendly = `${label} says the account has no credit (HTTP 402).`;
      } else if (status === 404) {
        code = "model";
        friendly = `${label}: model unavailable (HTTP 404) — it may have been retired or your account lacks access. Pick another model in Settings → AI help, or type a current model id under Custom model.`;
      } else if (status === 408) {
        code = "timeout";
        friendly = `${label} HTTP 408 — request timed out.`;
      } else if (status === 429) {
        code = "rate_limit";
        friendly = `${label} rate limit or quota reached (HTTP 429). Wait a minute, or check your plan.`;
      } else if (status >= 400 && status < 500) {
        code = "bad_request";
        friendly = `${label} refused the request (HTTP ${status}).`;
      }
      return makeError(code, detail ? `${friendly} ${detail}` : friendly, { status });
    },

    /** Last-resort length guard: keeps start and end of the prompt, removes the middle. */
    fitPrompt(text, maxChars, onTrim) {
      const G = root.Gemini;
      if (G && G.fitPrompt) return G.fitPrompt(text, maxChars, onTrim);
      const t = String(text || "");
      const max = Math.max(1000, maxChars || this.MAX_PROMPT_CHARS);
      return t.length <= max ? t : `${t.substring(0, Math.floor(max * 0.4))}\n[… omitted …]\n${t.substring(t.length - Math.floor(max * 0.55))}`;
    },

    /**
     * Run one completion. Never throws raw provider/network details containing the key.
     * Error codes: cancelled, timeout, auth, billing, model, rate_limit, bad_request, server, network, empty, config.
     * @param {{ providerId: string, apiKey: string, model?: string, prompt: string, maxOutputTokens?: number,
     *   temperature?: number, signal?: AbortSignal, timeoutMs?: number, retries?: number, fetchImpl?: Function,
     *   sleep?: Function, maxPromptChars?: number, onTrim?: Function }} opts
     * @returns {Promise<{ text: string, usage: {inputTokens:number,outputTokens:number}|null, providerId: string, model: string }>}
     */
    async complete(opts) {
      const provider = PROVIDERS[opts.providerId];
      if (!provider) throw makeError("config", "Unknown AI provider.");
      const apiKey = String(opts.apiKey || "").trim();
      if (apiKey.length < 8) throw makeError("config", "Invalid or missing API key.");
      const model = this.normalizeModel(provider.id, opts.model);
      const secrets = [apiKey];
      const S = root.AISafety;
      const redact = (s) => (S ? S.redact(s, secrets) : String(s));
      const fetchImpl = opts.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
      if (!fetchImpl) throw makeError("config", "This environment cannot make network requests.");
      const external = opts.signal || null;
      const cancelled = () => {
        const Ctor = root.LongOperationController && root.LongOperationController.CancelledError;
        if (Ctor) {
          const e = new Ctor(`${provider.label} request cancelled.`);
          e.code = "PE_CANCELLED";
          return e;
        }
        const e = makeError("cancelled", `${provider.label} request cancelled.`);
        e.name = "ProzaEditCancelledError";
        e.code = "PE_CANCELLED";
        return e;
      };
      if (external && external.aborted) throw cancelled();
      const prompt = this.fitPrompt(opts.prompt, opts.maxPromptChars || this.MAX_PROMPT_CHARS, opts.onTrim);
      const maxOutputTokens = Math.max(16, Math.min(8192, opts.maxOutputTokens || 1024));
      const temperature = opts.temperature == null ? 0.4 : opts.temperature;
      const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
      const retries = Math.max(0, Math.min(2, opts.retries || 0));
      const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : this.DEFAULT_TIMEOUT_MS;

      for (let attempt = 0; ; attempt++) {
        const req = provider.buildRequest({ apiKey, model, prompt, maxOutputTokens, temperature });
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs);
        const onAbort = () => controller.abort();
        if (external && typeof external.addEventListener === "function") external.addEventListener("abort", onAbort);
        let response;
        let data = null;
        try {
          response = await fetchImpl(req.url, { ...req.init, signal: controller.signal });
          try {
            data = await response.json();
          } catch (parseErr) {
            if (external && external.aborted) throw parseErr;
            if (timedOut || (parseErr && parseErr.name === "AbortError")) throw parseErr;
            data = null;
          }
        } catch (e) {
          if (external && external.aborted) throw cancelled();
          if (timedOut || (e && e.name === "AbortError")) {
            const err = makeError("timeout", `${provider.label} request timed out.`);
            err.name = "AbortError";
            err.code = "PE_TIMEOUT";
            err.peCode = "timeout";
            throw err;
          }
          const msg = redact(e && e.message ? e.message : "Network error");
          const hint = /failed to fetch|networkerror|load failed/i.test(msg)
            ? provider.id === "openai"
              ? " Couldn't reach OpenAI. Most often this is a mistyped or revoked key (OpenAI hides its error from browsers); otherwise check your connection."
              : provider.id === "anthropic"
                ? " If your connection is fine, your Anthropic organization may block browser (CORS) requests — check the key and organization settings."
                : " Check your connection and that the key is correct."
            : "";
          throw makeError("network", (msg || "Network error") + hint, { cause: undefined });
        } finally {
          clearTimeout(timer);
          if (external && typeof external.removeEventListener === "function") external.removeEventListener("abort", onAbort);
        }
        if (!response.ok) {
          const mapped = this.mapError(provider, response.status, data, secrets);
          const retryable = (mapped.code === "rate_limit" || response.status === 503 || response.status === 502) && attempt < retries;
          if (retryable) {
            const ra = Number(response.headers && response.headers.get && response.headers.get("retry-after"));
            const wait = Math.min(8000, Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1500 * (attempt + 1));
            await sleep(wait);
            if (external && external.aborted) throw cancelled();
            continue;
          }
          throw mapped;
        }
        const parsed = provider.parse(data);
        if (!parsed.text) {
          const why = parsed.blockReason || (data && data.error && data.error.message);
          throw makeError("empty", redact(why ? String(why) : `Empty ${provider.label.split(" ")[0] === "Google" ? "Gemini" : provider.label.split(" (")[0]} response`));
        }
        this._lastCallAt = Date.now();
        return { text: parsed.text, usage: parsed.usage, providerId: provider.id, model };
      }
    },
  };

  root.AIProviders = AIProviders;
})(typeof window !== "undefined" ? window : globalThis);
