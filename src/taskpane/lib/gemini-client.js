window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Gemini = {
  MODEL: "gemini-2.5-flash",
  DEFAULT_TIMEOUT_MS: 90000,
  MAX_PROMPT_CHARS: 32000,
  MIN_EXCERPT_KEEP_CHARS: 1200,
  TRIM_ORDER: ["index", "context", "excerpt"],

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
    const cfg = generationConfig || { maxOutputTokens: 1024, temperature: 0.5 };
    const result = await ProzaEdit.AIProviders.complete({
      providerId: "gemini",
      apiKey,
      model: options.model || this.MODEL,
      prompt: userText,
      maxOutputTokens: cfg.maxOutputTokens,
      temperature: cfg.temperature,
      signal: options.signal,
      timeoutMs: Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : this.DEFAULT_TIMEOUT_MS,
      maxPromptChars: this.MAX_PROMPT_CHARS,
      onTrim: options.onTrim,
      retries: options.retries || 0,
    });
    return result.text;
  },

  /**
   * Last-resort length guard (the budgeted builder normally keeps prompts under the cap already).
   * Keeps the START (instructions) and the END (question / tail of excerpt) and removes the middle — never the end.
   */
  fitPrompt(text, maxChars, onTrim) {
    const t = String(text || "");
    const max = Math.max(1000, maxChars || this.MAX_PROMPT_CHARS);
    if (t.length <= max) return t;
    const marker = `\n[… ${t.length - max} characters omitted from the middle to fit the AI prompt size limit …]\n`;
    const room = max - marker.length;
    const head = Math.floor(room * 0.4);
    const out = `${t.substring(0, head)}${marker}${t.substring(t.length - (room - head))}`;
    if (typeof onTrim === "function") onTrim({ id: "prompt", removed: t.length - max });
    return out;
  },

  elideMiddle(text, max, label) {
    const t = String(text || "");
    if (t.length <= max) return t;
    const marker = `\n[… ${t.length - max} characters omitted from the middle${label ? ` of ${label}` : ""} to fit the AI prompt size limit …]\n`;
    if (max <= marker.length + 40) return "";
    const room = max - marker.length;
    const head = Math.ceil(room * 0.55);
    return `${t.substring(0, head)}${marker}${t.substring(t.length - (room - head))}`;
  },

  /**
   * Budgeted prompt builder. Sections render in the order given, joined by a blank line.
   * role "fixed" (instruction, question, closing "return only…") is never trimmed.
   * Trim order when over budget: "index" (manuscript context block) → "context" (surrounding text) → "excerpt"
   * (middle is removed so the START and the END of the excerpt survive). Every trim is reported.
   * @param {{ id: string, text: string, role?: "fixed"|"index"|"context"|"excerpt", label?: string }[]} sections
   * @param {{ maxChars?: number }} [options]
   * @returns {{ text: string, trimmed: { id: string, role: string, from: number, to: number }[], note: string, overBudget: boolean }}
   */
  buildBudgetedPrompt(sections, options) {
    options = options || {};
    const max = Math.max(2000, options.maxChars || this.MAX_PROMPT_CHARS);
    const list = (sections || [])
      .map((s) => ({
        id: String(s.id || "section"),
        role: s.role || "fixed",
        label: s.label ? String(s.label) : "",
        body: String(s.text == null ? "" : s.text),
        original: String(s.text == null ? "" : s.text).length,
      }))
      .filter((s) => s.body.length > 0);
    const render = (s) => (s.label ? `${s.label}\n${s.body}` : s.body);
    const total = () => list.filter((s) => s.body).reduce((n, s) => n + render(s).length + 2, 0) - 2;
    const trimmed = [];
    for (const role of this.TRIM_ORDER) {
      let over = total() - max;
      if (over <= 0) break;
      for (const s of list.filter((x) => x.role === role && x.body)) {
        over = total() - max;
        if (over <= 0) break;
        const allowed = s.body.length - over;
        const minKeep = role === "excerpt" ? this.MIN_EXCERPT_KEEP_CHARS : role === "context" ? 400 : 600;
        let next = allowed >= minKeep ? this.elideMiddle(s.body, allowed, role === "index" ? "the manuscript index" : s.id) : "";
        if (role === "excerpt" && !next) {
          next = this.elideMiddle(s.body, Math.max(this.MIN_EXCERPT_KEEP_CHARS, allowed), s.id) || s.body;
        }
        if (role !== "excerpt" && next && next.length > allowed) next = "";
        const to = next ? next.length : 0;
        if (to < s.body.length) {
          trimmed.push({ id: s.id, role: s.role, from: s.original, to });
          s.body = next;
        }
      }
    }
    const text = list.filter((s) => s.body).map(render).join("\n\n");
    return { text, trimmed, note: this.describeTrim(trimmed), overBudget: text.length > max };
  },

  describeTrim(trimmed) {
    if (!trimmed || !trimmed.length) return "";
    const names = {
      index: "manuscript index",
      context: "surrounding context",
      excerpt: "selected text (middle only)",
    };
    const bits = trimmed.map((t) => {
      const what = names[t.role] || names[t.id] || t.id;
      return t.to === 0 ? `${what} left out` : `${what} shortened`;
    });
    return `Prompt was over the AI size limit: ${bits.join(", ")}. Your instruction, question, and the start and end of your text were kept.`;
  },

  REWRITE_MODES: {
    fluency: "Rewrite for smooth cadence and clear flow. Keep meaning. No AI clichés.",
    formal: "Rewrite in formal register with precise diction. Keep meaning.",
    creative: "Rewrite with sharper sensory detail and atmosphere. Keep facts/meaning.",
    academic: "Rewrite in objective academic register. No contractions. Keep meaning.",
  },

  buildRewritePromptDetailed(mode, excerpt, profile, guardrails, indexBlock) {
    const instr = this.REWRITE_MODES[mode] || this.REWRITE_MODES.fluency;
    return this.buildBudgetedPrompt([
      { id: "guardrails", text: guardrails },
      { id: "profile", text: profile },
      { id: "index", role: "index", text: indexBlock || "" },
      { id: "instruction", text: `MODE: ${mode}\nINSTRUCTION: ${instr}` },
      { id: "excerpt", role: "excerpt", label: "TEXT:", text: excerpt },
      { id: "closing", text: "Return ONLY the rewritten text." },
    ]);
  },

  buildRewritePrompt(mode, excerpt, profile, guardrails, indexBlock) {
    return this.buildRewritePromptDetailed(mode, excerpt, profile, guardrails, indexBlock).text;
  },
};
