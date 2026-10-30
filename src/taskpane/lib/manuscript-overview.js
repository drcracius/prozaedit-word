/* PMAT-inspired local manuscript overview (0 tokens — heuristics only). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ManuscriptOverview = {
  STOPWORDS: new Set(
    "the a an and or but in on at to for of with by from as is was are were be been being have has had do does did will would could should may might must that this these those it its they them he she we you i not no yes if so very can just".split(
      " "
    )
  ),

  dialogueRatioPercent(text) {
    const blocks = String(text || "").match(/["\u201c][^"\u201d\n]{0,800}["\u201d]/g) || [];
    let dWords = 0;
    blocks.forEach((b) => {
      dWords += (b.match(/\b[\w'-]+\b/g) || []).length;
    });
    const total = (String(text || "").match(/\b[\w'-]+\b/g) || []).length;
    if (!total) return 0;
    return Math.round((1000 * dWords) / total) / 10;
  },

  sensoryCounts(text) {
    const t = String(text || "").toLowerCase();
    return {
      sight: (t.match(/\b(saw|seen|looked|watched|glimpse|bright|dark|color|grey|gray)\b/g) || []).length,
      sound: (t.match(/\b(heard|sound|voice|whisper|shout|quiet|loud|crack|bang)\b/g) || []).length,
      touch: (t.match(/\b(felt|touch|skin|cold|warm|rough|smooth|grasp|held)\b/g) || []).length,
      smell: (t.match(/\b(smell|scent|odor|odour|aroma|stink|reek)\b/g) || []).length,
      taste: (t.match(/\b(taste|bitter|sweet|sour|salt|flavor|flavour)\b/g) || []).length,
    };
  },

  topMotifs(text, limit) {
    const words = String(text || "")
      .toLowerCase()
      .match(/\b[a-z']{5,}\b/g) || [];
    const freq = new Map();
    words.forEach((w) => {
      if (this.STOPWORDS.has(w)) return;
      freq.set(w, (freq.get(w) || 0) + 1);
    });
    return [...freq.entries()]
      .filter(([, c]) => c >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit || 8)
      .map(([w, c]) => ({ word: w, count: c }));
  },

  topProperLabels(text, dictionary, limit) {
    if (!ProzaEdit.ProperNoun?.extract) return [];
    const dictLower = new Set((dictionary || []).map((d) => d.toLowerCase()));
    const counts = ProzaEdit.ProperNoun.extract(String(text || ""), dictLower);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit || 10)
      .map(([name, count]) => ({ name, count }));
  },

  similarNamePairs(text, limit) {
    const names = this.topProperLabels(text, [], 40).map((x) => x.name);
    const pairs = [];
    const lev = ProzaEdit.ProperNoun?.levenshtein;
    for (let i = 0; i < names.length && pairs.length < (limit || 6); i++) {
      for (let j = i + 1; j < names.length && pairs.length < (limit || 6); j++) {
        const a = names[i];
        const b = names[j];
        let hit = a[0]?.toLowerCase() === b[0]?.toLowerCase() && a.toLowerCase() !== b.toLowerCase();
        if (!hit && lev) {
          const d = lev(a.toLowerCase(), b.toLowerCase());
          hit = d > 0 && d <= 2 && a[0]?.toLowerCase() === b[0]?.toLowerCase();
        }
        if (hit) pairs.push(`${a} / ${b}`);
      }
    }
    return pairs;
  },

  genreBenchmarks(manuscriptType, metrics, dialoguePct, targetAudience) {
    const flags = [];
    const t = String(manuscriptType || "");
    const fiction = t.includes("Fiction");
    const narrativePct = Math.round((100 - dialoguePct) * 10) / 10;
    if (fiction) {
      const dLo = 22;
      const dHi = 48;
      if (dialoguePct < dLo) {
        flags.push({ level: "orange", text: `Dialogue ~${dialoguePct}% (typical thriller band ~${dLo}–${dHi}%).` });
      } else if (dialoguePct > dHi) {
        flags.push({ level: "yellow", text: `Dialogue ~${dialoguePct}% — above common thriller ratio; check exposition in tags.` });
      } else {
        flags.push({ level: "green", text: `Dialogue ~${dialoguePct}% within typical commercial fiction band.` });
      }
      const asl = metrics.sentenceCount ? metrics.wordCount / metrics.sentenceCount : 0;
      if (asl > 22) flags.push({ level: "orange", text: `Avg sentence ~${Math.round(asl)} words — consider shorter beats for tension.` });
      else if (asl < 8) flags.push({ level: "yellow", text: `Avg sentence ~${Math.round(asl)} words — may feel choppy; vary rhythm.` });
      else flags.push({ level: "green", text: `Avg sentence length ~${Math.round(asl)} words — reasonable variety target.` });
      flags.push({ level: "green", text: `Narrative ~${narrativePct}% · Dialogue ~${dialoguePct}% (action–dialogue radar).` });
    } else if (t.includes("Academic")) {
      const asl = metrics.sentenceCount ? metrics.wordCount / metrics.sentenceCount : 0;
      if (asl > 28) flags.push({ level: "orange", text: `Long sentences (~${Math.round(asl)} w) — clarity risk in academic prose.` });
      if (dialoguePct > 5) flags.push({ level: "yellow", text: `Dialogue ~${dialoguePct}% — unusual for formal academic excerpt.` });
      else flags.push({ level: "green", text: "Low dialogue ratio fits academic register." });
    } else if (t.includes("Business")) {
      const asl = metrics.sentenceCount ? metrics.wordCount / metrics.sentenceCount : 0;
      if (asl > 25) flags.push({ level: "orange", text: "Shorten sentences for executive readability." });
      else flags.push({ level: "green", text: `Avg sentence ~${Math.round(asl)} — concise business target.` });
    } else if (t.includes("Journalism")) {
      const asl = metrics.sentenceCount ? metrics.wordCount / metrics.sentenceCount : 0;
      if (asl > 22) flags.push({ level: "yellow", text: "Tighten lede sentences (journalism)." });
      else flags.push({ level: "green", text: `Sentence length ~${Math.round(asl)} ok for news/feature pace.` });
    } else if (t.includes("Non-Fiction") || t.includes("Memoir")) {
      const asl = metrics.sentenceCount ? metrics.wordCount / metrics.sentenceCount : 0;
      if (dialoguePct > 35) {
        flags.push({ level: "yellow", text: `Dialogue ~${dialoguePct}% — high for narrative non-fiction; check quoted vs paraphrased material.` });
      } else {
        flags.push({ level: "green", text: `Dialogue ~${dialoguePct}% · Narrative ~${narrativePct}% (memoir/non-fiction band).` });
      }
      if (asl > 24) flags.push({ level: "orange", text: `Avg sentence ~${Math.round(asl)} words — shorten for general non-fiction readability.` });
    } else {
      flags.push({ level: "green", text: `Dialogue ~${dialoguePct}% · Narrative ~${narrativePct}%.` });
    }
    const [gMin, gMax] = ProzaEdit.Metrics.targetGradeRange(targetAudience);
    const fk = metrics.fleschKincaidGrade;
    if (fk > gMax + 1.5) flags.push({ level: "orange", text: `FK ~${fk} above target band (${gMin}–${gMax}) for ${targetAudience}.` });
    else if (fk < gMin - 2) flags.push({ level: "yellow", text: `FK ~${fk} below target band for ${targetAudience}.` });
    else flags.push({ level: "green", text: `FK ~${fk} aligns with ${targetAudience} target (~${gMin}–${gMax}).` });
    return flags;
  },

  buildHtml(text, ctx, meta, extras) {
    extras = extras || {};
    const metrics = meta.metrics || ProzaEdit.Metrics.analyze(text || "");
    const dialoguePct = this.dialogueRatioPercent(text);
    const narrativePct = Math.round((100 - dialoguePct) * 10) / 10;
    const motifs = this.topMotifs(text, 6);
    const castLimit = ctx.scopeSelection ? 6 : 8;
    const cast = this.topProperLabels(text, ctx.dictionary, castLimit);
    const senses = this.sensoryCounts(text);
    const namePairs = this.similarNamePairs(text, 4);
    const benchmarks = this.genreBenchmarks(ctx.manuscriptType, metrics, dialoguePct, ctx.targetAudience);
    const fiction = String(ctx.manuscriptType || "").includes("Fiction");
    const setting = ctx.settingAnchor || "(not set)";

    let html = `<details class="overview-panel" open><summary>Manuscript overview (local)</summary>`;
    html += `<p class="overview-lead">PMAT-style snapshot — rules &amp; stats only, no API.</p>`;

    html += `<h4>About this excerpt</h4><ul>`;
    html += `<li><strong>Type:</strong> ${this._esc(ctx.manuscriptType)} · <strong>Reader:</strong> ${this._esc(ctx.targetAudience)} · <strong>Style basis:</strong> ${this._esc(this.styleGuideLabel(ctx.styleGuideRef, ctx))}</li>`;
    html += `<li><strong>Words:</strong> ${metrics.wordCount} · <strong>Sentences:</strong> ${metrics.sentenceCount} · <strong>Dialogue:</strong> ~${dialoguePct}% · <strong>Narrative:</strong> ~${narrativePct}%</li>`;
    if (extras.docStats) {
      html += `<li><strong>Document:</strong> ~${extras.docStats.paragraphs} paragraphs · ~${extras.docStats.estWords} words (estimate)</li>`;
    }
    if (ProzaEdit.EditorHeuristics?.docFormalTally && /Academic|Business|Technical/.test(String(ctx.manuscriptType || ""))) {
      const ft = ProzaEdit.EditorHeuristics.docFormalTally(text);
      if (ft.ie + ft.eg + ft.etc > 0) {
        html += `<li><strong>Formal markers:</strong> i.e. ${ft.ie} · e.g. ${ft.eg} · etc. ${ft.etc} · among/amongst ${ft.among}/${ft.amongst}</li>`;
      }
    }
    if (meta.compareLine) html += `<li>${this._esc(meta.compareLine)}</li>`;
    if (meta.refLine) html += `<li>${this._esc(meta.refLine)}</li>`;
    html += `<li><strong>Setting anchor:</strong> ${this._esc(setting)}</li>`;
    html += `</ul>`;

    if (motifs.length) {
      html += `<h4>Themes &amp; motifs (word frequency)</h4><p>${motifs.map((m) => `${this._esc(m.word)} (${m.count})`).join(", ")}</p>`;
    }

    if (fiction && cast.length) {
      html += `<h4>Characters &amp; names (capitalized terms)</h4><p>${cast.map((c) => `${this._esc(c.name)}×${c.count}`).join(" · ")}</p>`;
      if (namePairs.length) {
        html += `<p class="overview-warn">Same-initial names in excerpt: ${namePairs.map(this._esc.bind(this)).join("; ")}</p>`;
      }
    }

    html += `<h4>Setting &amp; sensory grounding</h4><ul>`;
    html += `<li>Sight ${senses.sight} · Sound ${senses.sound} · Touch ${senses.touch} · Smell ${senses.smell} · Taste ${senses.taste}</li>`;
    html += `</ul>`;

    html += `<h4>Plot &amp; structure (local signals)</h4><ul>`;
    html += `<li>🔴 Critical flags: ${meta.criticalCount || 0} · 🟡 Style: ${meta.prefCount || 0} · Score: ${meta.score ?? "—"}/10</li>`;
    html += `</ul>`;

    if (ProzaEdit.DocAnalytics?.sentenceWordCounts) {
      const lengths = ProzaEdit.DocAnalytics.sentenceWordCounts(text);
      html += `<h4>Sentence rhythm (local)</h4>`;
      html += ProzaEdit.DocAnalytics.rhythmChartHtml(lengths, 24);
      const run = ProzaEdit.DocAnalytics.findMonotonyRun(lengths);
      if (run) html += `<p class="overview-warn">${run.len} similar-length sentences (~${run.avg} words).</p>`;
    }

    html += `<h4>Genre benchmarks (heuristic)</h4><ul>`;
    benchmarks.forEach((b) => {
      const icon = b.level === "green" ? "🟢" : b.level === "orange" ? "🟠" : "🟡";
      html += `<li>${icon} ${this._esc(b.text)}</li>`;
    });
    html += `</ul>`;
    if (extras.heatmapHtml) html += extras.heatmapHtml;
    html += `</details>`;
    return html;
  },

  buildFeedbackLetter(text, ctx, meta, suggestions) {
    const lines = [];
    lines.push("PROZAEDIT — EDITORIAL FEEDBACK LETTER (local report)");
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push(this.buildManuscriptProfileLine(ctx));
    lines.push("");
    lines.push("EXECUTIVE SUMMARY");
    lines.push(`Audit: ${meta.label || "Local audit"}`);
    lines.push(`Score: ${meta.score ?? "—"}/10 · Critical: ${meta.criticalCount || 0} · Style: ${meta.prefCount || 0}`);
    const m = meta.metrics || ProzaEdit.Metrics.analyze(text || "");
    lines.push(`Words: ${m.wordCount} · FK grade ~${m.fleschKincaidGrade} · Dialogue ~${this.dialogueRatioPercent(text)}%`);
    lines.push("");
    lines.push("PRIORITIZED FINDINGS");
    (suggestions || []).slice(0, 40).forEach((s, i) => {
      lines.push(`${i + 1}. [${s.type}] ${s.module}: ${s.explanation}`);
      if (s.targetText && !String(s.targetText).startsWith("(")) lines.push(`   Text: "${String(s.targetText).substring(0, 100)}"`);
    });
    lines.push("");
    lines.push("— End of local report (no generative AI). For prose rewrites use Word Copilot.");
    return lines.join("\n").substring(0, 32000);
  },

  styleGuideLabel(ref, ctx) {
    const labels = {
      "plain-us": "U.S. Plain Language (CC0)",
      strunk: "Strunk 1920 (PD)",
      govuk: "GOV.UK A–Z (OGL v2.0)",
      microsoft: "Microsoft Style Guide (CC BY 4.0)",
      "google-dev": "Google Dev Style (CC BY 4.0)",
      redhat: "Red Hat Technical Writing (CC BY-SA 4.0)",
      custom: "Custom house style",
      "custom-plus-auto": "Custom + Auto packs",
    };
    if (ref === "custom" || ref === "custom-plus-auto") {
      const n = ctx?.customStyleGuide?.name;
      if (ref === "custom-plus-auto") return n ? `Custom + Auto (${n})` : labels["custom-plus-auto"];
      return n ? `Custom: ${n}` : labels.custom;
    }
    if (ref && ref !== "auto" && labels[ref]) return labels[ref];
    const lang = ctx?.language || "en-US";
    const type = String(ctx?.manuscriptType || "");
    if (lang === "en-GB") return "GOV.UK A–Z (auto / OGL)";
    if (type.includes("Technical")) return "Microsoft Style (auto / CC BY 4.0)";
    if (type.includes("Journalism")) return "Plain Language + clarity (auto)";
    return "Plain Language + Strunk (auto / PD)";
  },

  buildManuscriptProfileLine(ctx) {
    const sg = this.styleGuideLabel(ctx.styleGuideRef, ctx);
    return `Profile: ${ctx.manuscriptType} | ${ctx.targetAudience} | ${ctx.criticPersona} | ${ctx.language} | Style: ${sg} | Setting: ${ctx.settingAnchor || "—"}`;
  },

  _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};
