/* Local document analytics — 0 tokens (no full-body load unless explicitly scanned). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.DocAnalytics = {
  sentenceWordCounts(text) {
    const sentences = ProzaEdit.Metrics.splitSentences(String(text || ""))
      .map((s) => (s.match(/\b[\w'-]+\b/g) || []).length)
      .filter((n) => n > 0);
    return sentences.slice(0, 500);
  },

  findMonotonyRun(lengths) {
    if (lengths.length < 5) return null;
    let best = { start: 0, len: 1, avg: lengths[0] };
    let start = 0;
    for (let i = 1; i <= lengths.length; i++) {
      const prev = lengths[i - 1];
      const cur = lengths[i];
      const inRun = cur != null && Math.abs(cur - prev) <= 2;
      if (!inRun || i === lengths.length) {
        const runLen = i - start;
        if (runLen >= 5) {
          const slice = lengths.slice(start, i);
          const avg = Math.round(slice.reduce((a, b) => a + b, 0) / slice.length);
          if (runLen > best.len) best = { start, len: runLen, avg };
        }
        start = i;
      }
    }
    return best.len >= 5 ? best : null;
  },

  rhythmChartHtml(lengths, maxBars) {
    const slice = lengths.slice(0, maxBars || 24);
    if (!slice.length) return "";
    const max = Math.max(...slice, 1);
    let html = '<div class="rhythm-chart" aria-hidden="true">';
    slice.forEach((n) => {
      const h = Math.max(4, Math.round((n / max) * 36));
      html += `<span class="rhythm-bar" style="height:${h}px" title="${n} words"></span>`;
    });
    html += "</div>";
    return html;
  },

  computeMiniScores(suggestions, metrics, text) {
    const critical = (suggestions || []).filter((s) => s.type === "confirmed").length;
    const pref = (suggestions || []).filter((s) => s.type === "preference").length;
    const fk = metrics?.fleschKincaidGrade ?? 0;
    const fre = metrics?.fleschReadingEase ?? 0;
    let correctness = Math.max(1, Math.min(10, 10 - critical * 0.85 - pref * 0.08));
    let clarity = Math.max(1, Math.min(10, 6 + (fre - 50) / 25 - pref * 0.05));
    let engagement = Math.max(1, Math.min(10, 7 - critical * 0.4));
    const dialogue = ProzaEdit.ManuscriptOverview?.dialogueRatioPercent(text) || 0;
    if (dialogue >= 15 && dialogue <= 55) engagement = Math.min(10, engagement + 0.5);
    const round1 = (x) => Math.round(x * 10) / 10;
    return {
      correctness: round1(correctness),
      clarity: round1(clarity),
      engagement: round1(engagement),
    };
  },

  compareToReference(currentMetrics, dialoguePct, ref) {
    if (!ref || ref.fk == null) return "";
    const dFk = (currentMetrics.fleschKincaidGrade - ref.fk).toFixed(1);
    const dDlg = (dialoguePct - (ref.dialoguePct || 0)).toFixed(1);
    return `Reference style Δ: FK ${dFk >= 0 ? "+" : ""}${dFk} · Dialogue ${dDlg >= 0 ? "+" : ""}${dDlg}%`;
  },
};
