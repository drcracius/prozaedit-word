/* Read audit text by selection, approximate pages, or Heading 1–3 chapters. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ScopeReader = {
  /** Approximate chars per printed page for page-range mode (Word JS has no page API). */
  CHARS_PER_PAGE: 2800,

  LIMITS: {
    selection: 150000,
    pages: 150000,
    chapter: 150000,
    "chapter-range": 200000,
    "selected-chapters": 200000,
    full: 450000,
  },

  getLimit(mode) {
    return this.LIMITS[mode] || this.LIMITS.selection;
  },

  /** Fraction of scope char cap at which we warn before hard truncate (audit read). */
  SOFT_CAP_RATIO: 0.85,

  softCapThreshold(charCap) {
    const cap = Math.max(1, Math.floor(Number(charCap) || 0));
    return Math.floor(cap * this.SOFT_CAP_RATIO);
  },

  /**
   * Status line for long reads (audit / index). Pure — safe for unit tests.
   * @param {{ phase?: string, paragraphsLoaded?: number, paragraphTotal?: number, charCount?: number, charCap?: number, scopeLabel?: string }} info
   */
  formatReadStatus(info) {
    info = info || {};
    const phase = String(info.phase || "Reading");
    const parts = [phase];
    const pl = Number(info.paragraphsLoaded);
    const pt = Number(info.paragraphTotal);
    if (pt > 0 && pl >= 0) parts.push(`~${pl}/${pt} paragraphs`);
    const cc = Number(info.charCount);
    const cap = Number(info.charCap);
    if (cc > 0) {
      parts.push(`~${cc.toLocaleString()} chars`);
      if (cap > 0 && cc >= this.softCapThreshold(cap)) {
        parts.push(`(approaching ${cap.toLocaleString()} cap — try Selected chapters)`);
      }
    }
    if (info.scopeLabel) parts.push(`— ${info.scopeLabel}`);
    return parts.join(" ");
  },

  /** Session key for last completed paragraph index during a cancelled scope read (Help documents this). */
  SCOPE_READ_RESUME_KEY: "pe-scope-read-resume",

  readScopeResumeSnapshot() {
    try {
      const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(this.SCOPE_READ_RESUME_KEY) : null;
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p && typeof p === "object" ? p : null;
    } catch (_) {
      return null;
    }
  },

  writeScopeResumeSnapshot(data) {
    try {
      if (typeof sessionStorage === "undefined") return;
      sessionStorage.setItem(this.SCOPE_READ_RESUME_KEY, JSON.stringify(data));
    } catch (_) {}
  },

  clearScopeResumeSnapshot() {
    try {
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(this.SCOPE_READ_RESUME_KEY);
    } catch (_) {}
  },

  /** Contiguous chapter numbers (1-based) inclusive. */
  expandRangeToIndices(fromNum, toNum) {
    const a = Math.min(parseInt(fromNum, 10) || 1, parseInt(toNum, 10) || 1);
    const b = Math.max(parseInt(fromNum, 10) || 1, parseInt(toNum, 10) || 1);
    const out = [];
    for (let i = a; i <= b; i++) out.push(i);
    return out;
  },

  /** Unique sorted 1-based chapter indices; pass chapter list or max index number. */
  normalizeSelectedChapterIndices(indices, chaptersOrMax) {
    let max = 0;
    let valid = null;
    if (Array.isArray(chaptersOrMax)) {
      valid = new Set();
      chaptersOrMax.forEach((c) => {
        const n = parseInt(c?.index, 10);
        if (n >= 1) {
          valid.add(n);
          if (n > max) max = n;
        }
      });
    } else {
      max = Math.max(0, parseInt(chaptersOrMax, 10) || 0);
    }
    if (!max) return [];
    const set = new Set();
    (Array.isArray(indices) ? indices : []).forEach((raw) => {
      const n = parseInt(raw, 10);
      if (n < 1 || n > max) return;
      if (valid && valid.size && !valid.has(n)) return;
      set.add(n);
    });
    return Array.from(set).sort((a, b) => a - b);
  },

  /** One-time migration from legacy single/range chapter scope fields. */
  migrateLegacyChapterScope(config) {
    const p = config && typeof config === "object" ? { ...config } : {};
    if (Array.isArray(p.selectedChapterIndices) && p.selectedChapterIndices.length) {
      if (p.scope === "chapter" || p.scope === "chapter-range") p.scope = "selected-chapters";
      return p;
    }
    if (p.scope === "chapter") {
      const n = parseInt(p.scopeChapterSingle, 10) || 1;
      p.selectedChapterIndices = [n];
      p.scope = "selected-chapters";
    } else if (p.scope === "chapter-range") {
      p.selectedChapterIndices = this.expandRangeToIndices(p.scopeChapterFrom, p.scopeChapterTo);
      p.scope = "selected-chapters";
    }
    return p;
  },

  formatSelectedChaptersLabel(indices, chapters) {
    const list = chapters || [];
    const normalized = this.normalizeSelectedChapterIndices(indices, list);
    if (!normalized.length) return "no chapters selected";
    if (normalized.length === 1) {
      const ch = list.find((c) => c.index === normalized[0]);
      return ch ? `Ch. ${normalized[0]}: ${ch.title}` : `Ch. ${normalized[0]}`;
    }
    if (normalized.length <= 4) {
      return normalized.map((n) => `Ch.${n}`).join(" + ");
    }
    return `${normalized.length} chapters`;
  },

  async listChapters(context) {
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    const total = paras.items.length;
    if (!total) return [];
    for (let i = 0; i < total; i++) paras.items[i].load(["text", "styleBuiltIn"]);
    await context.sync();
    const headings = [];
    for (let i = 0; i < total; i++) {
      const s = paras.items[i].styleBuiltIn;
      if (s === Word.Style.heading1 || s === Word.Style.heading2 || s === Word.Style.heading3) {
        headings.push({ paraIndex: i, title: (paras.items[i].text || "").trim().substring(0, 80) || `Chapter ${headings.length + 1}` });
      }
    }
    return headings.map((h, idx) => {
      const endPara = idx + 1 < headings.length ? headings[idx + 1].paraIndex - 1 : total - 1;
      return { index: idx + 1, title: h.title, startPara: h.paraIndex, endPara };
    });
  },

  _cancelCheck(opts) {
    if (opts && typeof opts.cancelCheck === "function") opts.cancelCheck();
  },

  /** Yield to the browser event loop between Office.js batches (keeps the pane responsive). */
  microYield() {
    return new Promise((resolve) => {
      if (typeof queueMicrotask === "function") queueMicrotask(resolve);
      else if (typeof setTimeout === "function") setTimeout(resolve, 0);
      else resolve();
    });
  },

  /** Pure helper: inclusive paragraph batch ranges for chunked reads. */
  planParagraphBatches(totalParagraphs, chunkSize) {
    const total = Math.max(0, Math.floor(Number(totalParagraphs) || 0));
    const chunk = Math.max(1, Math.floor(Number(chunkSize) || 40));
    const batches = [];
    for (let start = 0; start < total; start += chunk) {
      batches.push({ start, end: Math.min(start + chunk - 1, total - 1) });
    }
    return batches;
  },

  /**
   * Read body text in paragraph batches with cooperative cancel and micro-yields.
   * @param {object} [opts] — cancelCheck, maxChars (default 600000), chunkSize, onProgress({ batchIndex, batchCount, paragraphsLoaded, paragraphTotal })
   */
  async readBodyTextChunked(context, opts) {
    opts = opts || {};
    const maxChars = opts.maxChars != null ? Number(opts.maxChars) : 600000;
    const chunkSize = opts.chunkSize != null ? Number(opts.chunkSize) : 40;
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    const total = paras.items.length;
    const batches = this.planParagraphBatches(total, chunkSize);
    let text = "";
    for (let bi = 0; bi < batches.length; bi++) {
      this._cancelCheck(opts);
      const { start, end } = batches[bi];
      for (let i = start; i <= end; i++) paras.items[i].load("text");
      await context.sync();
      for (let i = start; i <= end; i++) {
        text += (paras.items[i].text || "") + "\n";
        if (text.length >= maxChars) return text.substring(0, maxChars);
      }
      if (typeof opts.onProgress === "function") {
        opts.onProgress({
          batchIndex: bi + 1,
          batchCount: batches.length,
          paragraphsLoaded: end + 1,
          paragraphTotal: total,
        });
      }
      if (bi + 1 < batches.length) await this.microYield();
    }
    return text;
  },

  async textFromParagraphRange(context, startPara, endPara, opts) {
    opts = opts || {};
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    if (startPara < 0 || endPara >= paras.items.length) throw new Error("Chapter range out of document bounds.");
    const CHUNK = 50;
    let text = "";
    for (let blockStart = startPara; blockStart <= endPara; blockStart += CHUNK) {
      this._cancelCheck(opts);
      const blockEnd = Math.min(blockStart + CHUNK - 1, endPara);
      for (let i = blockStart; i <= blockEnd; i++) paras.items[i].load("text");
      await context.sync();
      for (let i = blockStart; i <= blockEnd; i++) text += (paras.items[i].text || "") + "\n";
      if (typeof opts.onProgress === "function") {
        opts.onProgress({
          paragraphsLoaded: blockEnd - startPara + 1,
          paragraphTotal: endPara - startPara + 1,
          charCount: text.length,
        });
      }
      if (blockEnd < endPara) await this.microYield();
    }
    return text;
  },

  async readFullManuscriptChunked(context, opts) {
    opts = opts || {};
    const maxChars = opts.maxChars != null ? Number(opts.maxChars) : this.getLimit("full");
    const text = await this.readBodyTextChunked(context, { ...opts, maxChars });
    return { text, label: "full manuscript" };
  },

  async readByPageRange(context, pageFrom, pageTo, opts) {
    opts = opts || {};
    const from = Math.max(1, parseInt(pageFrom, 10) || 1);
    const to = Math.max(from, parseInt(pageTo, 10) || from);
    const startChar = (from - 1) * this.CHARS_PER_PAGE;
    const endChar = to * this.CHARS_PER_PAGE;
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    const total = paras.items.length;
    if (!total) throw new Error("Document is empty.");
    let charPos = 0;
    let out = "";
    const CHUNK = 50;
    for (let blockStart = 0; blockStart < total; blockStart += CHUNK) {
      this._cancelCheck(opts);
      const blockEnd = Math.min(blockStart + CHUNK - 1, total - 1);
      for (let i = blockStart; i <= blockEnd; i++) paras.items[i].load("text");
      await context.sync();
      for (let i = blockStart; i <= blockEnd; i++) {
        const t = paras.items[i].text || "";
        const chunkLen = t.length + 1;
        const paraStart = charPos;
        const paraEnd = charPos + chunkLen;
        if (paraEnd > startChar && paraStart < endChar) {
          out += t + "\n";
        }
        charPos = paraEnd;
        if (charPos >= endChar) break;
      }
      if (charPos >= endChar) break;
    }
    if (!out.trim()) throw new Error(`No text in approximate pages ${from}–${to}. Try a wider range.`);
    return { text: out, label: `approx. pages ${from}–${to}` };
  },

  async readByChapter(context, chapterNum, chapters, opts) {
    opts = opts || {};
    const list = chapters || (await this.listChapters(context));
    const n = parseInt(chapterNum, 10);
    const ch = list.find((c) => c.index === n);
    if (!ch) throw new Error(`Chapter ${n} not found. Use Heading 1–3 on chapter titles.`);
    const text = await this.textFromParagraphRange(context, ch.startPara, ch.endPara, opts);
    return { text, label: `Ch. ${n}: ${ch.title}` };
  },

  async readByChapterRange(context, fromNum, toNum, chapters, opts) {
    opts = opts || {};
    const list = chapters || (await this.listChapters(context));
    const a = Math.min(parseInt(fromNum, 10) || 1, parseInt(toNum, 10) || 1);
    const b = Math.max(parseInt(fromNum, 10) || 1, parseInt(toNum, 10) || 1);
    const start = list.find((c) => c.index === a);
    const end = list.find((c) => c.index === b);
    if (!start || !end) throw new Error("Chapter range not found. Apply Heading 1–3 styles.");
    const text = await this.textFromParagraphRange(context, start.startPara, end.endPara, opts);
    return { text, label: `Ch. ${a}–${b}` };
  },

  async readBySelectedChapters(context, indices, chapters, opts) {
    opts = opts || {};
    const list = chapters || (await this.listChapters(context));
    const normalized = this.normalizeSelectedChapterIndices(indices, list);
    if (!normalized.length) {
      throw new Error("Select at least one chapter on Target (Reload chapter list), then check the chapters to include.");
    }
    let text = "";
    for (let i = 0; i < normalized.length; i++) {
      this._cancelCheck(opts);
      const ch = list.find((c) => c.index === normalized[i]);
      if (!ch) continue;
      text += await this.textFromParagraphRange(context, ch.startPara, ch.endPara, opts);
      if (typeof opts.onProgress === "function") {
        opts.onProgress({
          paragraphsLoaded: i + 1,
          paragraphTotal: normalized.length,
          charCount: text.length,
          scopeLabel: `chapter ${normalized[i]}`,
        });
      }
    }
    if (!text.trim()) throw new Error("Selected chapters contain no text.");
    const label = this.formatSelectedChaptersLabel(normalized, list);
    return { text, label: `Selected: ${label}` };
  },

  async measureScope(context, opts) {
    opts = opts || {};
    const mode = opts.mode || "selection";
    this._cancelCheck(opts);
    if (mode === "selection") {
      const sel = context.document.getSelection();
      sel.load("text");
      await context.sync();
      this._cancelCheck(opts);
      return { text: sel.text || "", label: "selection" };
    }
    if (mode === "full") {
      if (typeof opts.cancelCheck === "function" || typeof opts.onProgress === "function") {
        const merged = { ...opts, maxChars: opts.maxChars != null ? opts.maxChars : this.getLimit("full") };
        return this.readFullManuscriptChunked(context, merged);
      }
      const body = context.document.body;
      body.load("text");
      await context.sync();
      return { text: body.text || "", label: "full manuscript" };
    }
    if (mode === "pages") {
      return this.readByPageRange(context, opts.pageFrom, opts.pageTo, opts);
    }
    if (mode === "chapter") {
      return this.readByChapter(context, opts.chapterSingle, opts.chapters, opts);
    }
    if (mode === "chapter-range") {
      return this.readByChapterRange(context, opts.chapterFrom, opts.chapterTo, opts.chapters, opts);
    }
    if (mode === "selected-chapters") {
      return this.readBySelectedChapters(context, opts.selectedChapterIndices, opts.chapters, opts);
    }
    throw new Error("Unknown scope mode.");
  },

  /** Paragraph objects for chronology walk (15k cap; indices are body paragraph indexes). */
  async readParagraphsInScope(context, opts) {
    opts = opts || {};
    const mode = opts.mode || "selection";
    this._cancelCheck(opts);
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    const total = paras.items.length;
    if (total > 15000) throw new Error("Too many paragraphs for timeline scan (15,000 cap).");

    let start = 0;
    let end = total - 1;

    if (mode === "full") {
      start = 0;
      end = total - 1;
    } else if (mode === "chapter") {
      const list = opts.chapters || (await this.listChapters(context));
      const n = parseInt(opts.chapterSingle, 10) || 1;
      const ch = list.find((c) => c.index === n);
      if (!ch) throw new Error(`Chapter ${n} not found. Use Heading 1–3 on chapter titles.`);
      start = ch.startPara;
      end = ch.endPara;
    } else if (mode === "chapter-range") {
      const list = opts.chapters || (await this.listChapters(context));
      const a = Math.min(parseInt(opts.chapterFrom, 10) || 1, parseInt(opts.chapterTo, 10) || 1);
      const b = Math.max(parseInt(opts.chapterFrom, 10) || 1, parseInt(opts.chapterTo, 10) || 1);
      const startCh = list.find((c) => c.index === a);
      const endCh = list.find((c) => c.index === b);
      if (!startCh || !endCh) throw new Error("Chapter range not found. Apply Heading 1–3 styles.");
      start = startCh.startPara;
      end = endCh.endPara;
    } else if (mode === "selected-chapters") {
      const list = opts.chapters || (await this.listChapters(context));
      const normalized = this.normalizeSelectedChapterIndices(opts.selectedChapterIndices, list);
      if (!normalized.length) throw new Error("No chapters selected. Check chapters on Target after Reload chapter list.");
      const ranges = normalized
        .map((n) => list.find((c) => c.index === n))
        .filter(Boolean)
        .sort((x, y) => x.startPara - y.startPara);
      for (let r = 0; r < ranges.length; r++) {
        const ch = ranges[r];
        for (let i = ch.startPara; i <= ch.endPara; i++) {
          paras.items[i].load(["text", "styleBuiltIn"]);
        }
      }
      await context.sync();
      const out = [];
      for (let r = 0; r < ranges.length; r++) {
        const ch = ranges[r];
        for (let i = ch.startPara; i <= ch.endPara; i++) {
          const p = paras.items[i];
          const s = p.styleBuiltIn;
          let headingLevel = 0;
          if (s === Word.Style.heading1) headingLevel = 1;
          else if (s === Word.Style.heading2) headingLevel = 2;
          else if (s === Word.Style.heading3) headingLevel = 3;
          out.push({ index: i, text: p.text || "", headingLevel });
        }
      }
      return out;
    } else if (mode === "pages") {
      const from = Math.max(1, parseInt(opts.pageFrom, 10) || 1);
      const to = Math.max(from, parseInt(opts.pageTo, 10) || from);
      const startChar = (from - 1) * this.CHARS_PER_PAGE;
      const endChar = to * this.CHARS_PER_PAGE;
      let charPos = 0;
      let foundStart = false;
      for (let i = 0; i < total; i++) paras.items[i].load("text");
      await context.sync();
      for (let i = 0; i < total; i++) {
        const t = paras.items[i].text || "";
        const chunkLen = t.length + 1;
        const paraStart = charPos;
        const paraEnd = charPos + chunkLen;
        if (paraEnd > startChar && paraStart < endChar) {
          if (!foundStart) {
            start = i;
            foundStart = true;
          }
          end = i;
        }
        charPos = paraEnd;
        if (charPos >= endChar) break;
      }
      if (!foundStart) throw new Error(`No paragraphs in approximate pages ${from}–${to}.`);
    } else if (mode === "selection") {
      const sel = context.document.getSelection();
      sel.load("text");
      await context.sync();
      if (!(sel.text || "").trim()) throw new Error("Highlight text in Word, or choose page/chapter/full scope.");
      const selParas = sel.paragraphs;
      selParas.load("items");
      await context.sync();
      if (!selParas.items.length) {
        return (sel.text || "")
          .split(/\r?\n/)
          .map((line, i) => ({ index: i, text: line, headingLevel: 0 }))
          .filter((p) => p.text.trim());
      }
      for (let i = 0; i < selParas.items.length; i++) selParas.items[i].load("text");
      await context.sync();
      const firstT = (selParas.items[0].text || "").trim();
      const lastT = (selParas.items[selParas.items.length - 1].text || "").trim();
      for (let i = 0; i < total; i++) paras.items[i].load("text");
      await context.sync();
      start = -1;
      end = -1;
      for (let i = 0; i < total; i++) {
        const t = (paras.items[i].text || "").trim();
        if (start < 0 && t === firstT) start = i;
        if (t === lastT) end = i;
      }
      if (start < 0) start = 0;
      if (end < start) end = Math.min(start + selParas.items.length - 1, total - 1);
    }

    const out = [];
    const CHUNK = 50;
    for (let blockStart = start; blockStart <= end; blockStart += CHUNK) {
      this._cancelCheck(opts);
      const blockEnd = Math.min(blockStart + CHUNK - 1, end);
      for (let i = blockStart; i <= blockEnd; i++) paras.items[i].load(["text", "styleBuiltIn"]);
      await context.sync();
      for (let i = blockStart; i <= blockEnd; i++) {
        const p = paras.items[i];
        const s = p.styleBuiltIn;
        let headingLevel = 0;
        if (s === Word.Style.heading1) headingLevel = 1;
        else if (s === Word.Style.heading2) headingLevel = 2;
        else if (s === Word.Style.heading3) headingLevel = 3;
        out.push({ index: i, text: p.text || "", headingLevel });
      }
    }
    return out;
  },
};
