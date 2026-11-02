/**
 * "Audit next chapter" guided flow: pure state helpers (no Word, no DOM).
 * State is small (per-chapter counts only) so it can live in document settings; the merged finding cards of
 * chapters audited in an earlier session are not stored (re-run a chapter to see its cards again).
 */
(function (global) {
  "use strict";
  const ns = (global.ProzaEdit = global.ProzaEdit || {});

  const STORAGE_KEY = "PROZAEDIT_CHAPTER_WALK";
  const MAX_CHAPTERS = 2000;
  const MAX_MERGED = 600;

  function fingerprint(chapters) {
    const list = Array.isArray(chapters) ? chapters : [];
    let h = 5381;
    const s = list.length + "|" + list.map((c) => String(c.title || "")).join("\u0001");
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return `${list.length}:${(h >>> 0).toString(36)}`;
  }

  function create(chapters) {
    return { v: 1, fp: fingerprint(chapters), total: (chapters || []).length, done: {}, order: [] };
  }

  /** Returns a usable state for these chapters: the stored one if it still matches the document, else a fresh one. */
  function reconcile(stored, chapters) {
    const list = chapters || [];
    if (!stored || typeof stored !== "object" || stored.v !== 1 || stored.fp !== fingerprint(list)) {
      return { state: create(list), reset: !!(stored && Object.keys(stored.done || {}).length) };
    }
    const done = {};
    for (const k of Object.keys(stored.done || {})) {
      const n = parseInt(k, 10);
      if (n >= 1 && n <= list.length && stored.done[k] && typeof stored.done[k] === "object") done[n] = stored.done[k];
    }
    return { state: { ...stored, total: list.length, done, order: Object.keys(done).map(Number) }, reset: false };
  }

  function parse(raw) {
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function serialize(state) {
    return JSON.stringify({ v: 1, fp: state.fp, total: state.total, done: state.done });
  }

  function doneCount(state) {
    return Object.keys(state.done || {}).length;
  }

  function nextIndex(state, chapters) {
    const list = chapters || [];
    for (let i = 0; i < list.length; i++) {
      if (!state.done[list[i].index]) return list[i].index;
    }
    return 0;
  }

  function isComplete(state, chapters) {
    return (chapters || []).length > 0 && nextIndex(state, chapters) === 0;
  }

  /** Marks one chapter as audited. `suggestions` are kept in memory only (see mergedSuggestions). */
  function record(state, chapter, summary) {
    const s = summary || {};
    state.done[chapter.index] = {
      title: String(chapter.title || "").slice(0, 80),
      words: Math.max(0, Math.round(Number(s.words) || 0)),
      critical: Math.max(0, Math.round(Number(s.critical) || 0)),
      style: Math.max(0, Math.round(Number(s.style) || 0)),
      truncated: !!s.truncated,
      skipped: !!s.skipped,
      at: Number(s.at) || 0,
    };
    state.order = Object.keys(state.done).map(Number);
    return state;
  }

  function progressLabel(state, chapters) {
    const total = (chapters || []).length;
    const done = doneCount(state);
    if (!total) return "No chapters found";
    const next = nextIndex(state, chapters);
    if (!next) return `All ${total} chapters audited`;
    return `Chapter ${done + 1} of ${total}`;
  }

  /** Aggregates the per-chapter records into one set of totals. */
  function totals(state) {
    const t = { chapters: 0, words: 0, critical: 0, style: 0, truncated: 0, skipped: 0 };
    for (const k of Object.keys(state.done || {})) {
      const d = state.done[k];
      t.chapters += 1;
      t.words += d.words || 0;
      t.critical += d.critical || 0;
      t.style += d.style || 0;
      if (d.truncated) t.truncated += 1;
      if (d.skipped) t.skipped += 1;
    }
    return t;
  }

  /**
   * Merges in-memory per-chapter suggestion lists (keyed by chapter index) into one list, ordered by chapter.
   * Each item gets a chapter tag so cards stay traceable; ids are made unique per chapter.
   */
  function mergedSuggestions(memory, chapters) {
    const out = [];
    const list = chapters || [];
    for (const c of list) {
      const items = memory && memory[c.index];
      if (!Array.isArray(items)) continue;
      for (const s of items) {
        if (s && s.ruleId === "sys:truncated") continue;
        out.push({ ...s, id: `ch${c.index}_${s.id}`, chapterIndex: c.index, chapterTitle: c.title });
        if (out.length >= MAX_MERGED * 10) return out;
      }
    }
    return out;
  }

  function summaryLines(state, chapters) {
    const t = totals(state);
    const lines = [
      `Chapters done: ${t.chapters} of ${(chapters || []).length} (about ${t.words.toLocaleString()} words)`,
      `Critical: ${t.critical} · Style: ${t.style}`,
    ];
    if (t.skipped) lines.push(`${t.skipped} chapter(s) skipped (too long for one pass; use Page range for those).`);
    if (t.truncated) lines.push(`${t.truncated} chapter(s) were longer than the limit and only partly checked.`);
    return lines;
  }

  ns.ChapterWalk = {
    STORAGE_KEY,
    MAX_CHAPTERS,
    MAX_MERGED,
    fingerprint,
    create,
    reconcile,
    parse,
    serialize,
    doneCount,
    nextIndex,
    isComplete,
    record,
    progressLabel,
    totals,
    mergedSuggestions,
    summaryLines,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
