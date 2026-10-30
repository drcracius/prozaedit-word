window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Gemini = {
  MODEL: "gemini-2.5-flash",

  estimateTokens(text) {
    const chars = String(text || "").length;
    return Math.max(1, Math.ceil(chars / 4));
  },

  async generate(apiKey, userText, generationConfig) {
    if (!apiKey || String(apiKey).length < 8) {
      throw new Error("Invalid or missing API key.");
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: String(userText || "").substring(0, 32000) }] }],
          generationConfig: generationConfig || { maxOutputTokens: 1024, temperature: 0.5 },
        }),
      });
    } finally {
      clearTimeout(timer);
    }
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    }
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = parts ? parts.map((p) => p.text || "").join("").trim() : "";
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
