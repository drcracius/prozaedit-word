/*
 * Deep AI-style check for Run, plus a small on-device cadence cut for Rewrite.
 * Style only. Not a detector, not a copyright test, not a way to change a detector score.
 *
 * Five review passes (public editor notes, Reddit writing threads, trade pieces):
 * 1. Short punchy sentences are normal in thrillers. Do not flag them.
 * 2. One "not just" or one three-part list is ordinary craft. Flag density and the
 *    "isn't just … it's" pair, not a single device.
 * 3. Ignore text inside quotation marks so a character's line is not treated as narration.
 * 4. "A sense of dread" is real suspense. Only flag the empty bookend
 *    ("wondered what the future held").
 * 5. Rewrite may delete discourse fillers. It must not invent a new metaphor or verb.
 */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.AiProsePatterns = {
  CUTS: [
    ["moreover", ""],
    ["furthermore", ""],
    ["it is important to note that", ""],
    ["it is important to note", ""],
    ["in today's world", ""],
    ["in today’s world", ""],
    ["let's dive in", ""],
    ["let’s dive in", ""],
    ["let's break it down", ""],
    ["let’s break it down", ""],
  ],

  _fiction(ctx) {
    const t = String(ctx?.manuscriptType || "");
    return /fiction/i.test(t) || ctx?._genre?.profile?.family === "fiction";
  },

  _narration(text) {
    const raw = String(text || "");
    if (ProzaEdit.Audit?.blankQuotedSpeech) return ProzaEdit.Audit.blankQuotedSpeech(raw);
    return raw.replace(/["\u201C][^"\u201C\u201D]{0,4000}["\u201D]/g, (q) => " ".repeat(q.length));
  },

  _sentences(text) {
    return String(text || "")
      .split(/[.!?]+\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  },

  /**
   * @returns {Array<{ruleId, explanation, targetText, confidence}>}
   */
  scan(text, ctx) {
    const narration = this._narration(text);
    if (narration.trim().length < 80) return [];
    const fiction = this._fiction(ctx);
    const out = [];
    const push = (row) => {
      if (out.length >= 6) return;
      out.push(row);
    };

    const pairs = narration.match(/\b(?:isn['’]t|is not|wasn['’]t|aren['’]t|were not|not)\s+just\b[\s\S]{0,90}?\b(?:it['’]s|it is|they['’]re|they are)\b/gi) || [];
    if (pairs.length >= 2) {
      const sample = pairs[0].replace(/\s+/g, " ").slice(0, 120);
      push({
        ruleId: "ai:pattern:not-just",
        confidence: "medium",
        targetText: sample,
        explanation: fiction
          ? `This "isn't just … it's" turn shows up ${pairs.length} times in the narration. Suspense needs the concrete stake once. A second copy reads like a template.`
          : `"Isn't just … it's" appears ${pairs.length} times. Keep one contrast.`,
      });
    }

    const triads = [];
    const triRe = /\b[A-Za-z][\w'-]{1,24},\s+[A-Za-z][\w'-]{1,24},\s+and\s+[A-Za-z][\w'-]{1,24}\b/g;
    let tm;
    while ((tm = triRe.exec(narration)) !== null && triads.length < 12) {
      triads.push({ at: tm.index, text: tm[0] });
      if (tm.index === triRe.lastIndex) triRe.lastIndex++;
    }
    const stacked = triads.some((a, i) => triads.slice(i + 1).some((b) => b.at - a.at < 420 && b.at - a.at > 0));
    if (stacked) {
      push({
        ruleId: "ai:pattern:rule-of-three",
        confidence: "low",
        targetText: triads[0].text,
        explanation:
          "Two three-part lists sit close together. One list of three is normal. Back-to-back lists, especially when the third item repeats the first two, are a common model habit. Keep a triad only when each item is a different fact.",
      });
    }

    const nounPile = /\b(?:[A-Z][a-z]{2,18}\.\s+){2}[A-Z][a-z]{2,18}\./;
    const pile = narration.match(nounPile);
    if (pile) {
      push({
        ruleId: "ai:pattern:fragment-stack",
        confidence: "low",
        targetText: pile[0],
        explanation: fiction
          ? "A stack of bare noun sentences (Thing. Thing. Thing.). Action beats of three short lines are fine in a thriller. This shape is a drama effect with no verb. Use it once in a book, or cut it."
          : "Bare noun sentences in a stack. Put a verb in, or keep a single short line.",
      });
    }

    const stockRes = [
      { re: /\ba symphony of\b/i, label: "a symphony of" },
      { re: /\bbeacon of\b/i, label: "beacon of" },
      { re: /\bnestled\b/i, label: "nestled" },
      { re: /\btapestry\b/i, label: "tapestry" },
      { re: /\bunderscor(?:e|es|ing)\b/i, label: "underscore" },
      { re: /\bhighlighting the importance\b/i, label: "highlighting the importance" },
    ];
    const stockHits = stockRes.filter((row) => row.re.test(narration));
    if (stockHits.length >= 2) {
      push({
        ruleId: "ai:pattern:stock-images",
        confidence: "medium",
        targetText: stockHits[0].label,
        explanation: fiction
          ? `Stock images in the narration: ${stockHits.map((h) => h.label).join(", ")}. Suspense wants one physical detail (a lock, a plate number, a wet cuff), not a grand metaphor.`
          : `Stock images together: ${stockHits.map((h) => h.label).join(", ")}. Replace with a detail the reader can check.`,
      });
    }

    if (fiction && /\bwondered what the future held\b/i.test(narration)) {
      push({
        ruleId: "ai:pattern:soft-ending",
        confidence: "low",
        targetText: "wondered what the future held",
        explanation: "Empty scene ending. Close on what the character does next, or on the fact that just changed. A feeling of dread by itself is fine.",
      });
    }

    const essay = narration.match(/\b(?:in conclusion|to summarize|as we have seen|let's dive in|let's break it down)\b/i);
    if (essay) {
      push({
        ruleId: "ai:pattern:essay-frame",
        confidence: fiction ? "medium" : "low",
        targetText: essay[0],
        explanation: fiction
          ? `"${essay[0]}" is an essay frame inside a story. Cut it. Start the scene.`
          : `"${essay[0]}" is a stock frame. Open with the point instead.`,
      });
    }

    return out;
  },
};
