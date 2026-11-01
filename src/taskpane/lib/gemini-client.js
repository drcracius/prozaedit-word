window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Gemini = {
  MODEL: "gemini-2.5-flash",
  DEFAULT_TIMEOUT_MS: 90000,
  MAX_PROMPT_CHARS: 32000,

  estimateTokens(text) {
    const chars = String(text || "").length;
    return Math.max(1, Math.ceil(chars / 4));
  },

  _cancelledError() {
    const Ctor = ProzaEdit.LongOperationController?.CancelledError;
    if (Ctor) return new Ctor("Gemini request cancelled.");
    const err = new Error("Gemini request cancelled.");
    err.name = "ProzaEditCancelledError";
    err.code = "PE_CANCELLED";
    return err;
  },

  _timeoutError() {
    const err = new Error("Gemini request timed out.");
    err.name = "AbortError";
    err.code = "PE_TIMEOUT";
    return err;
  },

  /**
   * @param {string} apiKey
   * @param {string} userText
   * @param {object} [generationConfig]
   * @param {{ signal?: AbortSignal, timeoutMs?: number }} [options] signal: user Cancel from LongOperationController.abortSignal
   */
  async generate(apiKey, userText, generationConfig, options) {
    options = options || {};
    if (!apiKey || String(apiKey).length < 8) {
      throw new Error("Invalid or missing API key.");
    }
    const external = options.signal || null;
    if (external && external.aborted) throw this._cancelledError();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : this.DEFAULT_TIMEOUT_MS;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onExternalAbort = () => controller.abort();
    if (external && typeof external.addEventListener === "function") {
      external.addEventListener("abort", onExternalAbort);
    }
    let response;
    let data = null;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: String(userText || "").substring(0, this.MAX_PROMPT_CHARS) }] }],
          generationConfig: generationConfig || { maxOutputTokens: 1024, temperature: 0.5 },
        }),
      });
      try {
        data = await response.json();
      } catch (parseErr) {
        if (external?.aborted || timedOut || parseErr?.name === "AbortError") throw parseErr;
        data = null;
      }
    } catch (e) {
      if (external?.aborted) throw this._cancelledError();
      if (timedOut || e?.name === "AbortError") throw this._timeoutError();
      throw e;
    } finally {
      clearTimeout(timer);
      if (external && typeof external.removeEventListener === "function") {
        external.removeEventListener("abort", onExternalAbort);
      }
    }
    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    }
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts) ? parts.map((p) => p?.text || "").join("").trim() : "";
    if (!text) {
      throw new Error(data?.error?.message || data?.promptFeedback?.blockReason || "Empty Gemini response");
    }
    return text;
  },

  REWRITE_MODES: {
    fluency: "Rewrite for smooth cadence and clear flow. Keep meaning. No AI clichés.",
    formal: "Rewrite in formal register with precise diction. Keep meaning.",
    creative: "Rewrite with sharper sensory detail and atmosphere. Keep facts/meaning.",
    academic: "Rewrite in objective academic register. No contractions. Keep meaning.",
  },

  buildRewritePrompt(mode, excerpt, profile, guardrails) {
    const instr = this.REWRITE_MODES[mode] || this.REWRITE_MODES.fluency;
    return `${guardrails}\n\n${profile}\n\nMODE: ${mode}\nINSTRUCTION: ${instr}\n\nTEXT:\n${excerpt}\n\nReturn ONLY the rewritten text.`;
  },
};
