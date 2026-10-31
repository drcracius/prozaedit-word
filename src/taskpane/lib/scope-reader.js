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
    full: 450000,
  },

  getLimit(mode) {
    return this.LIMITS[mode] || this.LIMITS.selection;
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

  async textFromParagraphRange(context, startPara, endPara) {
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    if (startPara < 0 || endPara >= paras.items.length) throw new Error("Chapter range out of document bounds.");
    for (let i = startPara; i <= endPara; i++) paras.items[i].load("text");
    await context.sync();
    let text = "";
    for (let i = startPara; i <= endPara; i++) text += (paras.items[i].text || "") + "\n";
    return text;
  },

  async readByPageRange(context, pageFrom, pageTo) {
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
    for (let i = 0; i < total; i++) {
      paras.items[i].load("text");
    }
    await context.sync();
    for (let i = 0; i < total; i++) {
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
    if (!out.trim()) throw new Error(`No text in approximate pages ${from}–${to}. Try a wider range.`);
    return { text: out, label: `approx. pages ${from}–${to}` };
  },

  async readByChapter(context, chapterNum, chapters) {
    const list = chapters || (await this.listChapters(context));
    const n = parseInt(chapterNum, 10);
    const ch = list.find((c) => c.index === n);
    if (!ch) throw new Error(`Chapter ${n} not found. Use Heading 1–3 on chapter titles.`);
    const text = await this.textFromParagraphRange(context, ch.startPara, ch.endPara);
    return { text, label: `Ch. ${n}: ${ch.title}` };
  },

  async readByChapterRange(context, fromNum, toNum, chapters) {
    const list = chapters || (await this.listChapters(context));
    const a = Math.min(parseInt(fromNum, 10) || 1, parseInt(toNum, 10) || 1);
    const b = Math.max(parseInt(fromNum, 10) || 1, parseInt(toNum, 10) || 1);
    const start = list.find((c) => c.index === a);
    const end = list.find((c) => c.index === b);
    if (!start || !end) throw new Error("Chapter range not found. Apply Heading 1–3 styles.");
    const text = await this.textFromParagraphRange(context, start.startPara, end.endPara);
    return { text, label: `Ch. ${a}–${b}` };
  },

  async measureScope(context, opts) {
    opts = opts || {};
    const mode = opts.mode || "selection";
    if (mode === "selection") {
      const sel = context.document.getSelection();
      sel.load("text");
      await context.sync();
      return { text: sel.text || "", label: "selection" };
    }
    if (mode === "full") {
      const body = context.document.body;
      body.load("text");
      await context.sync();
      return { text: body.text || "", label: "full manuscript" };
    }
    if (mode === "pages") {
      return this.readByPageRange(context, opts.pageFrom, opts.pageTo);
    }
    if (mode === "chapter") {
      return this.readByChapter(context, opts.chapterSingle, opts.chapters);
    }
    if (mode === "chapter-range") {
      return this.readByChapterRange(context, opts.chapterFrom, opts.chapterTo, opts.chapters);
    }
    throw new Error("Unknown scope mode.");
  },
};
