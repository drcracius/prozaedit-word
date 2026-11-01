/* Chapter pacing heatmap — local stats per heading block (max 40 chapters). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ChapterHeatmap = {
  MAX: 40,

  heatmapHtml(entries) {
    if (!entries?.length) return "";
    const maxW = Math.max(...entries.map((e) => e.words || 0), 1);
    let html = '<details class="overview-panel"><summary>Chapter pacing heatmap (local)</summary><ul class="heatmap-list">';
    entries.slice(0, this.MAX).forEach((e, i) => {
      const w = e.words || 0;
      const pct = Math.round((100 * w) / maxW);
      const t = String(e.title || "Chapter")
        .substring(0, 28)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;");
      html += `<li><span class="hm-label">${i + 1}. ${t}</span>`;
      html += `<span class="hm-bar" style="width:${Math.max(8, pct)}%" title="${w} words, ~${e.asl || "?"} w/sent"></span>`;
      html += `<span class="hm-meta">${w}w</span></li>`;
    });
    html += "</ul></details>";
    return html;
  },

  async scanDocument(context) {
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    const total = paras.items.length;
    if (total > 15000) throw new Error("Too many paragraphs for chapter scan.");
    for (let i = 0; i < total; i += 500) {
      for (let j = i; j < Math.min(total, i + 500); j++) paras.items[j].load(["text", "styleBuiltIn"]);
      await context.sync();
    }
    const entries = [];
    let current = null;
    const flush = () => {
      if (!current || !current.text.trim()) return;
      const metrics = ProzaEdit.Metrics.analyze(current.text);
      const asl = metrics.sentenceCount ? Math.round(metrics.wordCount / metrics.sentenceCount) : 0;
      entries.push({
        title: current.title,
        words: metrics.wordCount,
        asl,
      });
    };
    for (let i = 0; i < total && entries.length < this.MAX; i++) {
      const p = paras.items[i];
      const s = p.styleBuiltIn;
      const isH = s === Word.Style.heading1 || s === Word.Style.heading2 || s === Word.Style.heading3;
      if (isH) {
        flush();
        current = { title: (p.text || "").trim().substring(0, 80) || "Chapter", text: "" };
      } else if (current) {
        current.text += (p.text || "") + "\n";
        if (current.text.length > 80000) current.text = current.text.substring(0, 80000);
      }
    }
    flush();
    return entries;
  },
};
