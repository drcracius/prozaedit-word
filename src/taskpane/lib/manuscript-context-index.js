/* Manuscript Context Index (MCI) — lightweight full-doc profile for Coach, audit, rewrite, continuity. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ManuscriptContextIndex = {
  VERSION: 1,
  SUMMARY_MAX_CHARS: 8000,
  ARC_NOTES_MAX_CHARS: 2000,
  MAX_STORED_JSON_CHARS: 48000,
  MAX_SECTIONS: 200,
  SNIPPET_CHARS: 160,
  SAMPLE_TEXT_CAP: 120000,
  STRUCTURE_ONLY_PARAGRAPH_THRESHOLD: 12000,
  SAMPLE_EVERY_N_PARAS: 6,
  PARAGRAPH_BATCH: 40,

  paragraphCountHash(paragraphTotal) {
    const n = Math.max(0, Math.floor(Number(paragraphTotal) || 0));
    return `p${n}`;
  },

  isFresh(index, paragraphTotal) {
    const norm = this.normalizeStored(index);
    if (!norm || !norm.builtAt) return false;
    const hash = this.paragraphCountHash(paragraphTotal);
    return norm.paragraphCountHash === hash && !norm.invalid;
  },

  isStale(index, paragraphTotal) {
    return !this.isFresh(index, paragraphTotal);
  },

  normalizeStored(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out = {
      version: Number(raw.version) || this.VERSION,
      builtAt: typeof raw.builtAt === "string" ? raw.builtAt : "",
      paragraphCountHash: typeof raw.paragraphCountHash === "string" ? raw.paragraphCountHash : "",
      paragraphTotal: Math.max(0, Math.floor(Number(raw.paragraphTotal) || 0)),
      truncated: !!raw.truncated,
      summary: String(raw.summary || "").substring(0, this.SUMMARY_MAX_CHARS),
      arcNotes: String(raw.arcNotes || "").substring(0, this.ARC_NOTES_MAX_CHARS),
      nameSeeds: [],
      sections: [],
      invalid: false,
    };
    if (Array.isArray(raw.nameSeeds)) {
      out.nameSeeds = raw.nameSeeds
        .map((x) => String(x || "").trim())
        .filter((x) => x.length > 0 && x.length <= 80)
        .slice(0, 80);
    }
    if (Array.isArray(raw.sections)) {
      out.sections = raw.sections
        .slice(0, this.MAX_SECTIONS)
        .map((s) => ({
          index: Math.max(1, parseInt(s?.index, 10) || 1),
          title: String(s?.title || "").substring(0, 120),
          wordCount: Math.max(0, Math.floor(Number(s?.wordCount) || 0)),
          povHint: String(s?.povHint || "").substring(0, 24),
          firstSnippet: String(s?.firstSnippet || "").substring(0, this.SNIPPET_CHARS),
          lastSnippet: String(s?.lastSnippet || "").substring(0, this.SNIPPET_CHARS),
        }));
    }
    if (!out.builtAt || !out.paragraphCountHash) out.invalid = true;
    return out;
  },

  wordCount(text) {
    return (String(text || "").match(/\b[\w'-]+\b/g) || []).length;
  },

  trimSnippet(text, max) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    const cap = max != null ? max : this.SNIPPET_CHARS;
    if (t.length <= cap) return t;
    return `${t.substring(0, cap - 1)}…`;
  },

  guessPovHint(text) {
    const sample = String(text || "").substring(0, 4000).toLowerCase();
    const first = (sample.match(/\b(i|me|my|we|our|us)\b/g) || []).length;
    const third = (sample.match(/\b(he|she|they|him|her|them|his|hers|their)\b/g) || []).length;
    if (first > third * 1.4 && first >= 3) return "first-person";
    if (third > first * 1.2 && third >= 3) return "third-person";
    if (first >= 2 && third >= 2) return "mixed";
    return "";
  },

  formatBuildProgress(info) {
    info = info || {};
    const phase = String(info.phase || "Reading manuscript for context");
    const si = Number(info.sectionIndex);
    const st = Number(info.sectionTotal);
    if (st > 0 && si >= 0) return `${phase}… section ${si}/${st}`;
    if (info.batchIndex && info.batchCount) {
      return `${phase}… batch ${info.batchIndex}/${info.batchCount}`;
    }
    return `${phase}…`;
  },

  buildRollingSummary(sections, arcNotes, cap) {
    cap = cap != null ? cap : this.SUMMARY_MAX_CHARS;
    const lines = [];
    const list = Array.isArray(sections) ? sections : [];
    list.forEach((s) => {
      const head = `§${s.index} ${s.title || "Untitled"} (~${s.wordCount || 0} w${s.povHint ? `, ${s.povHint}` : ""})`;
      const body = [s.firstSnippet, s.lastSnippet].filter(Boolean).join(" … ");
      lines.push(body ? `${head}: ${body}` : head);
    });
    if (arcNotes) lines.push(`Arc notes: ${arcNotes}`);
    let out = lines.join("\n");
    if (out.length > cap) out = `${out.substring(0, cap - 24)}\n… (summary truncated)`;
    return out;
  },

  lightArcNotes(text, fiction) {
    const t = String(text || "");
    if (!t.trim()) return "";
    const notes = [];
    if (fiction && ProzaEdit.ManuscriptOverview?.topMotifs) {
      const motifs = ProzaEdit.ManuscriptOverview.topMotifs(t, 5);
      if (motifs.length) notes.push(`Motifs: ${motifs.map((m) => m.word).join(", ")}`);
    }
    const lower = t.toLowerCase();
    const temporalHits = [];
    [
      "flashback",
      "years later",
      "years earlier",
      "the next morning",
      "meanwhile",
      "that evening",
    ].forEach((p) => {
      if (lower.includes(p)) temporalHits.push(p);
    });
    const years = t.match(/\b(?:18|19|20)\d{2}\b/g) || [];
    if (years.length) temporalHits.push(`years: ${[...new Set(years)].slice(0, 6).join(", ")}`);
    if (temporalHits.length) notes.push(`Time signals: ${[...new Set(temporalHits)].slice(0, 8).join("; ")}`);
    let out = notes.join(" · ");
    if (out.length > this.ARC_NOTES_MAX_CHARS) out = out.substring(0, this.ARC_NOTES_MAX_CHARS - 1) + "…";
    return out;
  },

  buildNameSeeds(sampleText, dictionary) {
    const seeds = new Set();
    if (ProzaEdit.ContinuityGuard?.buildIndex) {
      const idx = ProzaEdit.ContinuityGuard.buildIndex(sampleText);
      (idx.topNames || []).forEach((n) => {
        if (n?.name) seeds.add(n.name);
      });
    }
    if (ProzaEdit.ManuscriptOverview?.topProperLabels) {
      ProzaEdit.ManuscriptOverview.topProperLabels(sampleText, dictionary, 24).forEach((x) => {
        if (x?.name) seeds.add(x.name);
      });
    }
    return [...seeds].slice(0, 60);
  },

  mergeBuiltPayload(parts) {
    parts = parts || {};
    const sections = (parts.sections || []).slice(0, this.MAX_SECTIONS);
    const arcNotes = this.lightArcNotes(parts.sampleText || "", !!parts.fiction);
    const summary = this.buildRollingSummary(sections, arcNotes, this.SUMMARY_MAX_CHARS);
    const nameSeeds = this.buildNameSeeds(parts.sampleText || "", parts.dictionary || []);
    return {
      version: this.VERSION,
      builtAt: new Date().toISOString(),
      paragraphCountHash: this.paragraphCountHash(parts.paragraphTotal),
      paragraphTotal: parts.paragraphTotal || 0,
      truncated: !!parts.truncated,
      summary,
      arcNotes,
      nameSeeds,
      sections,
    };
  },

  estimateJsonChars(index) {
    try {
      return JSON.stringify(index || {}).length;
    } catch (_) {
      return 0;
    }
  },

  trimForStorage(index, maxChars) {
    maxChars = maxChars != null ? maxChars : this.MAX_STORED_JSON_CHARS;
    let norm = this.normalizeStored(index);
    if (!norm) return null;
    if (this.estimateJsonChars(norm) <= maxChars) return norm;

    norm.truncated = true;
    while (norm.sections.length > 8 && this.estimateJsonChars(norm) > maxChars) {
      norm.sections = norm.sections.slice(0, Math.ceil(norm.sections.length * 0.75));
    }
    while (this.estimateJsonChars(norm) > maxChars && norm.summary.length > 500) {
      norm.summary = norm.summary.substring(0, Math.floor(norm.summary.length * 0.85));
    }
    norm.summary = `${norm.summary}\n… (index storage capped — rebuild after major edits)`;
    if (this.estimateJsonChars(norm) > maxChars) {
      norm.summary = norm.summary.substring(0, Math.min(norm.summary.length, 4000));
      norm.sections = norm.sections.slice(0, 40);
      norm.nameSeeds = norm.nameSeeds.slice(0, 30);
    }
    return norm;
  },

  injectPromptBlock(index, options) {
    options = options || {};
    const norm = this.normalizeStored(index);
    if (!norm || norm.invalid) return "";
    const fresh =
      options.paragraphTotal != null
        ? this.isFresh(norm, options.paragraphTotal)
        : options.fresh !== false;
    if (!fresh && !options.allowStale) return "";
    const lines = ["Full-manuscript context (local index, not sent unless you use Gemini):"];
    if (norm.truncated) lines.push("(Index used sampling — very long document; arc notes may be partial.)");
    if (norm.summary) lines.push(norm.summary);
    else if (norm.arcNotes) lines.push(norm.arcNotes);
    if (norm.nameSeeds?.length) {
      lines.push(`Recurring names (seeds): ${norm.nameSeeds.slice(0, 24).join(", ")}`);
    }
    if (options.scopeMode && options.scopeMode !== "full") {
      lines.push("(Audit scope is narrower — use index for arc/continuity only.)");
    }
    return lines.join("\n").substring(0, this.SUMMARY_MAX_CHARS + 800);
  },

  continuityAugment(msIndex, mci) {
    const base = msIndex && typeof msIndex === "object" ? { ...msIndex } : { topNames: [], lowerSample: "" };
    const norm = this.normalizeStored(mci);
    if (!norm || norm.invalid) return base;
    const names = new Map((base.topNames || []).map((n) => [String(n.name).toLowerCase(), n]));
    norm.nameSeeds.forEach((name) => {
      const low = String(name).toLowerCase();
      if (!names.has(low)) names.set(low, { name, count: 1 });
    });
    base.topNames = [...names.values()].slice(0, 100);
    if (norm.summary && !base.lowerSample) {
      base.lowerSample = norm.summary.substring(0, 120000).toLowerCase();
    }
    return base;
  },

  sectionForParagraph(paraIndex, sections) {
    const i = Math.max(0, parseInt(paraIndex, 10) || 0);
    for (let s = 0; s < sections.length; s++) {
      const sec = sections[s];
      if (i >= sec.startPara && i <= sec.endPara) return sec;
    }
    return sections.length ? sections[sections.length - 1] : null;
  },

  fallbackSections(paragraphTotal) {
    const total = Math.max(0, Math.floor(Number(paragraphTotal) || 0));
    if (!total) return [];
    const SIZE = 80;
    const out = [];
    for (let start = 0; start < total; start += SIZE) {
      out.push({
        index: out.length + 1,
        title: `Section ${out.length + 1}`,
        startPara: start,
        endPara: Math.min(start + SIZE - 1, total - 1),
        wordCount: 0,
        povHint: "",
        firstSnippet: "",
        lastSnippet: "",
      });
    }
    return out.slice(0, this.MAX_SECTIONS);
  },

  finalizeSections(sectionRows) {
    return (sectionRows || []).map((s) => ({
      index: s.index,
      title: s.title,
      wordCount: s.wordCount || 0,
      povHint: this.guessPovHint(`${s.firstSnippet || ""} ${s.lastSnippet || ""}`),
      firstSnippet: this.trimSnippet(s.firstSnippet),
      lastSnippet: this.trimSnippet(s.lastSnippet),
    }));
  },

  /**
   * Chunked structure read + sampling (Office.js). Yields between batches.
   * @param {object} context Word request context
   * @param {{ cancelCheck?: Function, onProgress?: Function, dictionary?: string[], fiction?: boolean, yieldFn?: Function }} opts
   */
  async buildFromDocument(context, opts) {
    opts = opts || {};
    const SR = ProzaEdit.ScopeReader;
    if (!SR?.planParagraphBatches) throw new Error("ScopeReader unavailable.");
    const cancelCheck = () => {
      if (typeof opts.cancelCheck === "function") opts.cancelCheck();
    };
    const yieldFn = opts.yieldFn || (() => SR.microYield());
    const onProgress = typeof opts.onProgress === "function" ? opts.onProgress : null;

    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    cancelCheck();
    const paragraphTotal = paras.items.length;
    if (!paragraphTotal) throw new Error("Document is empty.");

    let chapterList = [];
    try {
      chapterList = await SR.listChapters(context);
    } catch (_) {
      chapterList = [];
    }
    cancelCheck();

    let sectionRows = [];
    if (chapterList.length) {
      sectionRows = chapterList.map((ch) => ({
        index: ch.index,
        title: ch.title,
        startPara: ch.startPara,
        endPara: ch.endPara,
        wordCount: 0,
        firstSnippet: "",
        lastSnippet: "",
      }));
    } else {
      sectionRows = this.fallbackSections(paragraphTotal);
    }
    sectionRows = sectionRows.slice(0, this.MAX_SECTIONS);

    const structureOnly = paragraphTotal >= this.STRUCTURE_ONLY_PARAGRAPH_THRESHOLD;
    let sampleText = "";
    let truncated = false;
    const batches = SR.planParagraphBatches(paragraphTotal, this.PARAGRAPH_BATCH);

    for (let bi = 0; bi < batches.length; bi++) {
      cancelCheck();
      const { start, end } = batches[bi];
      for (let i = start; i <= end; i++) paras.items[i].load("text");
      await context.sync();
      for (let i = start; i <= end; i++) {
        const text = paras.items[i].text || "";
        const sec = this.sectionForParagraph(i, sectionRows);
        if (!sec) continue;
        const wc = this.wordCount(text);
        sec.wordCount += wc;
        const trimmed = text.replace(/\s+/g, " ").trim();
        if (trimmed) {
          if (!sec.firstSnippet) sec.firstSnippet = trimmed;
          sec.lastSnippet = trimmed;
        }
        const allowSample =
          !structureOnly ||
          sampleText.length < this.SAMPLE_TEXT_CAP ||
          i % this.SAMPLE_EVERY_N_PARAS === 0;
        if (allowSample && trimmed && sampleText.length < this.SAMPLE_TEXT_CAP) {
          const piece = trimmed.substring(0, 400);
          sampleText += `${piece}\n`;
          if (sampleText.length >= this.SAMPLE_TEXT_CAP) {
            truncated = true;
            sampleText = sampleText.substring(0, this.SAMPLE_TEXT_CAP);
          }
        } else if (structureOnly && sampleText.length >= this.SAMPLE_TEXT_CAP) {
          truncated = true;
        }
      }
      if (onProgress) {
        onProgress({
          phase: "Reading manuscript for context",
          batchIndex: bi + 1,
          batchCount: batches.length,
          sectionIndex: Math.min(sectionRows.length, Math.ceil(((end + 1) / paragraphTotal) * sectionRows.length)),
          sectionTotal: sectionRows.length,
          paragraphsLoaded: end + 1,
          paragraphTotal,
        });
      }
      if (bi + 1 < batches.length) await yieldFn();
    }

    const sections = this.finalizeSections(sectionRows);
    return this.trimForStorage(
      this.mergeBuiltPayload({
        sections,
        sampleText,
        truncated: truncated || structureOnly,
        paragraphTotal,
        dictionary: opts.dictionary || [],
        fiction: !!opts.fiction,
      })
    );
  },

  formatStatusBadge(index, paragraphTotal) {
    const norm = this.normalizeStored(index);
    if (!norm || norm.invalid) {
      return { text: "Full MS context not built", className: "pe-mci-stale" };
    }
    const fresh = paragraphTotal != null ? this.isFresh(norm, paragraphTotal) : true;
    const built = norm.builtAt ? new Date(norm.builtAt) : null;
    const stamp = built && !Number.isNaN(built.getTime()) ? built.toLocaleString() : norm.builtAt;
    let text = `Full MS context ready · ${stamp}`;
    if (norm.truncated) text += " · sampled";
    if (!fresh) text = `Full MS context stale (document changed) · last ${stamp}`;
    return { text, className: fresh ? "pe-mci-ready" : "pe-mci-stale" };
  },

  formatStorageBlurb(index) {
    const chars = this.estimateJsonChars(index);
    if (chars < 1024) return `~${chars} characters in document settings`;
    return `~${Math.round(chars / 1024)} KB in document settings (local)`;
  },
};
