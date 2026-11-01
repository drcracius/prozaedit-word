/*
 * Manuscript Context Index (MCI) — lightweight, local, HEURISTIC full-document profile.
 * It is NOT an AI summary: chapter titles, word counts, first/last lines, recurring names, motifs and time cues.
 * When you use an AI action, the index text is included in that request (see injectPromptBlock).
 */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ManuscriptContextIndex = {
  VERSION: 2,
  STORAGE_VERSION: 2,
  STORAGE_KEY: "PROZAEDIT_MCI_V2",
  SUMMARY_MAX_CHARS: 8000,
  ARC_NOTES_MAX_CHARS: 2000,
  MAX_STORED_JSON_CHARS: 64000,
  MAX_RAW_STORED_CHARS: 400000,
  MAX_SECTIONS: 600,
  SNIPPET_CHARS: 160,
  SAMPLE_TEXT_CAP: 120000,
  SAMPLE_PIECE_CHARS: 400,
  STRUCTURE_ONLY_PARAGRAPH_THRESHOLD: 12000,
  PARAGRAPH_BATCH: 40,
  PROBE_MAX: 300,
  PROBE_BATCH: 60,
  PROBE_SIG_MAX_CHARS: 9000,
  NAME_SEED_LIMIT: 60,
  MIN_NAME_COUNT_LONG_DOC: 2,
  LONG_DOC_CHARS: 20000,

  TIME_PHRASES: [
    "flashback",
    "years later",
    "years earlier",
    "the next morning",
    "meanwhile",
    "that evening",
  ],

  /* ---------- hashing / fingerprints ---------- */

  newHasher() {
    let h = 0x811c9dc5;
    return {
      update(s) {
        const str = String(s == null ? "" : s);
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        h ^= 31;
        h = Math.imul(h, 0x01000193);
      },
      digest() {
        return (h >>> 0).toString(36);
      },
    };
  },

  hashString(s) {
    const hasher = this.newHasher();
    hasher.update(s);
    return hasher.digest();
  },

  normalizeParagraphText(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  },

  paragraphHash(text) {
    return this.hashString(this.normalizeParagraphText(text));
  },

  paragraphCountHash(paragraphTotal) {
    const n = Math.max(0, Math.floor(Number(paragraphTotal) || 0));
    return `p${n}`;
  },

  /** Evenly spaced paragraph indexes (always includes first and last) used for the quick in-paragraph edit check. */
  probeIndexes(paragraphTotal, max) {
    const total = Math.max(0, Math.floor(Number(paragraphTotal) || 0));
    const cap = Math.max(2, Math.floor(Number(max) || this.PROBE_MAX));
    if (!total) return [];
    if (total <= cap) return Array.from({ length: total }, (_, i) => i);
    const out = [];
    const seen = new Set();
    for (let k = 0; k < cap; k++) {
      const i = Math.floor((k * (total - 1)) / (cap - 1));
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }
    return out;
  },

  encodeProbeSig(pairs) {
    let out = (pairs || []).map(([i, h]) => `${i}.${h}`).join(",");
    if (out.length > this.PROBE_SIG_MAX_CHARS) {
      const cut = out.lastIndexOf(",", this.PROBE_SIG_MAX_CHARS);
      out = cut > 0 ? out.substring(0, cut) : "";
    }
    return out;
  },

  decodeProbeSig(sig) {
    const out = [];
    String(sig || "")
      .split(",")
      .forEach((part) => {
        const m = /^(\d{1,7})\.([0-9a-z]{1,8})$/.exec(part.trim());
        if (m) out.push([parseInt(m[1], 10), m[2]]);
      });
    return out;
  },

  /* ---------- freshness ---------- */

  isFresh(index, paragraphTotal) {
    const norm = this.normalizeStored(index);
    if (!norm || !norm.builtAt) return false;
    const hash = this.paragraphCountHash(paragraphTotal);
    return norm.paragraphCountHash === hash && !norm.invalid;
  },

  isStale(index, paragraphTotal) {
    return !this.isFresh(index, paragraphTotal);
  },

  /** Pure: compare probe hashes against freshly read paragraph texts (Map index -> text). */
  compareProbes(index, textsByIndex) {
    const norm = this.normalizeStored(index);
    const pairs = norm ? this.decodeProbeSig(norm.probeSig) : [];
    const changedParas = [];
    pairs.forEach(([i, h]) => {
      if (!textsByIndex.has(i)) return;
      if (this.paragraphHash(textsByIndex.get(i)) !== h) changedParas.push(i);
    });
    const changedSections = [];
    if (norm && changedParas.length) {
      const seen = new Set();
      changedParas.forEach((p) => {
        const sec = norm.sections.find((s) => s.startPara != null && p >= s.startPara && p <= s.endPara);
        if (sec && !seen.has(sec.index)) {
          seen.add(sec.index);
          changedSections.push(sec.index);
        }
      });
    }
    return { probesChecked: pairs.length, changedParas, changedSections };
  },

  /**
   * Quick staleness check against the live document: paragraph count, then probe paragraphs (hash compare).
   * Does not rebuild anything. Detects in-paragraph edits in the probed paragraphs (all paragraphs for docs up to PROBE_MAX).
   * @returns {{ state: "none"|"fresh"|"stale", reason: string, paragraphTotal: number, probesChecked: number, changedParas: number[], changedSections: number[] }}
   */
  async checkFreshness(context, index, opts) {
    opts = opts || {};
    const norm = this.normalizeStored(index);
    const base = { paragraphTotal: 0, probesChecked: 0, changedParas: [], changedSections: [] };
    if (!norm || norm.invalid) return { ...base, state: "none", reason: "no-index" };
    const cancelCheck = () => {
      if (typeof opts.cancelCheck === "function") opts.cancelCheck();
    };
    const SR = ProzaEdit.ScopeReader;
    const yieldFn = opts.yieldFn || (() => (SR?.microYield ? SR.microYield() : Promise.resolve()));
    const paras = context.document.body.paragraphs;
    paras.load("items");
    await context.sync();
    cancelCheck();
    const items = paras.items;
    const total = items.length;
    if (typeof opts.fiction === "boolean" && typeof norm.fiction === "boolean" && norm.fiction !== opts.fiction) {
      return { ...base, paragraphTotal: total, state: "stale", reason: "genre" };
    }
    if (this.paragraphCountHash(total) !== norm.paragraphCountHash) {
      return { ...base, paragraphTotal: total, state: "stale", reason: "count" };
    }
    const pairs = this.decodeProbeSig(norm.probeSig);
    if (!pairs.length) return { ...base, paragraphTotal: total, state: "fresh", reason: "count-only" };
    const texts = new Map();
    for (let b = 0; b < pairs.length; b += this.PROBE_BATCH) {
      cancelCheck();
      const slice = pairs.slice(b, b + this.PROBE_BATCH).filter(([i]) => i < total);
      slice.forEach(([i]) => items[i].load("text"));
      await context.sync();
      slice.forEach(([i]) => texts.set(i, items[i].text || ""));
      if (b + this.PROBE_BATCH < pairs.length) await yieldFn();
    }
    const cmp = this.compareProbes(norm, texts);
    if (cmp.changedParas.length) {
      return { ...base, ...cmp, paragraphTotal: total, state: "stale", reason: "edited" };
    }
    return { ...base, ...cmp, paragraphTotal: total, state: "fresh", reason: "ok" };
  },

  /** Normalize either a legacy paragraph total (number) or a freshness record into { state, reason }. */
  freshnessOf(index, fresh) {
    const norm = this.normalizeStored(index);
    if (!norm || norm.invalid) return { state: "none", reason: "no-index" };
    if (fresh && typeof fresh === "object") {
      return { state: fresh.state || "unknown", reason: fresh.reason || "", changedSections: fresh.changedSections || [] };
    }
    if (fresh == null) return { state: "unknown", reason: "", changedSections: [] };
    return this.isFresh(norm, fresh)
      ? { state: "fresh", reason: "count-only", changedSections: [] }
      : { state: "stale", reason: "count", changedSections: [] };
  },

  /* ---------- storage ---------- */

  normalizeStored(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const out = {
      version: Number(raw.version) || 1,
      builtAt: typeof raw.builtAt === "string" ? raw.builtAt : "",
      paragraphCountHash: typeof raw.paragraphCountHash === "string" ? raw.paragraphCountHash : "",
      paragraphTotal: Math.max(0, Math.floor(Number(raw.paragraphTotal) || 0)),
      truncated: !!raw.truncated,
      sampleCoverage: Math.min(1, Math.max(0, Number(raw.sampleCoverage) || 0)),
      contentHash: typeof raw.contentHash === "string" ? raw.contentHash.substring(0, 16) : "",
      probeSig: typeof raw.probeSig === "string" ? raw.probeSig.substring(0, this.PROBE_SIG_MAX_CHARS) : "",
      summary: String(raw.summary || "").substring(0, this.SUMMARY_MAX_CHARS),
      arcNotes: String(raw.arcNotes || "").substring(0, this.ARC_NOTES_MAX_CHARS),
      nameSeeds: [],
      sections: [],
      sectionTotal: Math.max(0, Math.floor(Number(raw.sectionTotal) || 0)),
      droppedSections: Math.max(0, Math.floor(Number(raw.droppedSections) || 0)),
      storageNote: String(raw.storageNote || "").substring(0, 300),
      invalid: false,
    };
    if (typeof raw.fiction === "boolean") out.fiction = raw.fiction;
    if (Array.isArray(raw.nameSeeds)) {
      out.nameSeeds = raw.nameSeeds
        .map((x) => String(x || "").trim())
        .filter((x) => x.length > 0 && x.length <= 80)
        .slice(0, 80);
    }
    if (Array.isArray(raw.sections)) {
      out.sections = raw.sections.slice(0, this.MAX_SECTIONS).map((s) => {
        const idx = parseInt(s?.index, 10);
        const sp = parseInt(s?.startPara, 10);
        const ep = parseInt(s?.endPara, 10);
        const sec = {
          index: Number.isFinite(idx) && idx >= 0 ? idx : 1,
          title: String(s?.title || "").substring(0, 120),
          wordCount: Math.max(0, Math.floor(Number(s?.wordCount) || 0)),
          povHint: String(s?.povHint || "").substring(0, 24),
          firstSnippet: String(s?.firstSnippet || "").substring(0, this.SNIPPET_CHARS),
          lastSnippet: String(s?.lastSnippet || "").substring(0, this.SNIPPET_CHARS),
          hash: typeof s?.hash === "string" ? s.hash.substring(0, 16) : "",
        };
        if (Number.isFinite(sp) && Number.isFinite(ep) && sp >= 0 && ep >= sp) {
          sec.startPara = sp;
          sec.endPara = ep;
        }
        return sec;
      });
    }
    if (!out.sectionTotal) out.sectionTotal = out.sections.length + out.droppedSections;
    if (!out.builtAt || !out.paragraphCountHash) out.invalid = true;
    return out;
  },

  estimateJsonChars(index) {
    try {
      return JSON.stringify(index || {}).length;
    } catch (_) {
      return 0;
    }
  },

  elideMiddle(text, max, marker) {
    const t = String(text || "");
    if (t.length <= max) return t;
    const mark = marker != null ? marker : "\n… (middle omitted) …\n";
    if (max <= mark.length + 20) return t.substring(0, Math.max(0, max));
    const room = max - mark.length;
    const head = Math.ceil(room * 0.6);
    return `${t.substring(0, head)}${mark}${t.substring(t.length - (room - head))}`;
  },

  /**
   * Shrink to maxChars of JSON. Degradation ladder (never silent — sets storageNote / droppedSections):
   * 1) drop per-chapter snippets (already inside the outline text), 2) drop the least-informative MIDDLE chapter
   * entries (keeps opening and ending chapters), 3) shorten the outline from the middle, 4) trim seeds/probes.
   */
  trimForStorage(index, maxChars) {
    maxChars = maxChars != null ? maxChars : this.MAX_STORED_JSON_CHARS;
    const norm = this.normalizeStored(index);
    if (!norm) return null;
    if (this.estimateJsonChars(norm) <= maxChars) return norm;

    const notes = [];
    const NOTE_RESERVE = 260;
    norm.storageNote = "#".repeat(NOTE_RESERVE);
    const originalSections = norm.sectionTotal || norm.sections.length;
    const fits = () => this.estimateJsonChars(norm) <= maxChars;

    norm.sections.forEach((s) => {
      s.firstSnippet = "";
      s.lastSnippet = "";
    });
    if (!fits()) {
      const KEEP_EDGE = 3;
      while (!fits() && norm.sections.length > KEEP_EDGE * 2) {
        const interior = norm.sections
          .map((s, pos) => ({ pos, words: s.wordCount }))
          .filter((x) => x.pos >= KEEP_EDGE && x.pos < norm.sections.length - KEEP_EDGE)
          .sort((a, b) => a.words - b.words || a.pos - b.pos);
        if (!interior.length) break;
        const chunk = Math.max(1, Math.ceil(interior.length * 0.1));
        const drop = new Set(interior.slice(0, chunk).map((x) => x.pos));
        norm.sections = norm.sections.filter((_, pos) => !drop.has(pos));
      }
    }
    norm.droppedSections = Math.max(0, originalSections - norm.sections.length);
    norm.sectionTotal = originalSections;
    if (norm.droppedSections) {
      notes.push(
        `${norm.droppedSections} of ${originalSections} chapter entries omitted (middle, shortest first) to fit document settings`
      );
    }
    if (!fits() && norm.summary.length > 200) {
      let guard = 0;
      while (!fits() && norm.summary.length > 200 && guard++ < 60) {
        norm.summary = this.elideMiddle(norm.summary, Math.floor(norm.summary.length * 0.85), "\n… (outline shortened for storage) …\n");
      }
      notes.push("outline shortened from the middle");
    }
    if (!fits()) {
      norm.nameSeeds = norm.nameSeeds.slice(0, 30);
      norm.probeSig = this.encodeProbeSig(this.decodeProbeSig(norm.probeSig).filter((_, i) => i % 2 === 0));
    }
    if (!fits() && norm.sections.length > 6) {
      norm.sections = norm.sections.slice(0, 3).concat(norm.sections.slice(-3));
      norm.droppedSections = Math.max(0, originalSections - norm.sections.length);
    }
    norm.storageNote = `Stored copy trimmed: ${notes.join("; ") || "size cap"}. Rebuild to refresh.`.substring(0, NOTE_RESERVE);
    return norm;
  },

  /** @returns {{ json: string, index: object|null, trimmed: boolean }} JSON string for ONE settings key (never the main config blob). */
  serializeForStorage(index, maxChars) {
    maxChars = maxChars != null ? maxChars : this.MAX_STORED_JSON_CHARS;
    const envelopeOverhead = 80;
    const trimmed = this.trimForStorage(index, Math.max(500, maxChars - envelopeOverhead));
    if (!trimmed) return { json: "", index: null, trimmed: false };
    const json = JSON.stringify({
      storageVersion: this.STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      index: trimmed,
    });
    return { json, index: trimmed, trimmed: !!trimmed.storageNote };
  },

  /**
   * Parse a stored value from the dedicated key, or a legacy bare index object (PE-77: inside PROZAEDIT_CONFIG).
   * @returns {{ index: object|null, problem: ""|"corrupt"|"oversized"|"newer-version"|"not-object" }}
   */
  parseStored(raw) {
    if (raw == null || raw === "") return { index: null, problem: "" };
    let parsed = raw;
    if (typeof raw === "string") {
      if (raw.length > this.MAX_RAW_STORED_CHARS) return { index: null, problem: "oversized" };
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        return { index: null, problem: "corrupt" };
      }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { index: null, problem: "not-object" };
    let candidate = parsed;
    if (parsed.storageVersion != null) {
      if (Number(parsed.storageVersion) > this.STORAGE_VERSION) return { index: null, problem: "newer-version" };
      candidate = parsed.index;
    }
    const norm = this.normalizeStored(candidate);
    if (!norm || norm.invalid) return { index: null, problem: "corrupt" };
    return { index: norm, problem: "" };
  },

  /* ---------- text helpers ---------- */

  wordCount(text) {
    return (String(text || "").match(/\b[\w'-]+\b/g) || []).length;
  },

  trimSnippet(text, max) {
    const t = String(text || "").replace(/\s+/g, " ").trim();
    const cap = max != null ? max : this.SNIPPET_CHARS;
    if (t.length <= cap) return t;
    return `${t.substring(0, cap - 1)}…`;
  },

  povFromCounts(first, third) {
    if (first > third * 1.4 && first >= 3) return "first-person";
    if (third > first * 1.2 && third >= 3) return "third-person";
    if (first >= 2 && third >= 2) return "mixed";
    return "";
  },

  /** Pronoun counts outside quoted dialogue (dialogue "I" would otherwise skew third-person narration). */
  pronounCounts(text) {
    const narrative = String(text || "")
      .replace(/"[^"]*"|“[^”]*”/g, " ")
      .toLowerCase();
    return {
      first: (narrative.match(/\b(i|me|my|we|our|us)\b/g) || []).length,
      third: (narrative.match(/\b(he|she|they|him|her|them|his|hers|their)\b/g) || []).length,
    };
  },

  guessPovHint(text) {
    const c = this.pronounCounts(String(text || "").substring(0, 4000));
    return this.povFromCounts(c.first, c.third);
  },

  formatBuildProgress(info) {
    info = info || {};
    const phase = String(info.phase || "Reading manuscript for context");
    const loaded = Number(info.paragraphsLoaded);
    const total = Number(info.paragraphTotal);
    if (total > 0 && loaded >= 0) {
      return `${phase}… ${Math.min(100, Math.floor((loaded / total) * 100))}% (${loaded.toLocaleString()}/${total.toLocaleString()} paragraphs)`;
    }
    const si = Number(info.sectionIndex);
    const st = Number(info.sectionTotal);
    if (st > 0 && si >= 0) return `${phase}… section ${si}/${st}`;
    if (info.batchIndex && info.batchCount) {
      return `${phase}… batch ${info.batchIndex}/${info.batchCount}`;
    }
    return `${phase}…`;
  },

  /**
   * Heuristic outline (not an AI summary). Always fits `cap`: shrinks per-chapter snippets first, then drops
   * chapter lines from the MIDDLE (keeps the opening and the ending) with a visible omission line. Arc notes are never cut.
   */
  buildRollingSummary(sections, arcNotes, cap) {
    cap = cap != null ? cap : this.SUMMARY_MAX_CHARS;
    const list = Array.isArray(sections) ? sections : [];
    const head = (s) => `§${s.index} ${s.title || "Untitled"} (~${s.wordCount || 0} w${s.povHint ? `, ${s.povHint}` : ""})`;
    const arcLine = arcNotes ? `Cues (heuristic): ${arcNotes}` : "";
    const reserve = arcLine ? arcLine.length + 1 : 0;
    const avail = Math.max(200, cap - reserve - 40);
    const bodyOf = (s, budget) => {
      const parts = [s.firstSnippet, s.lastSnippet].filter(Boolean);
      if (!parts.length) return "";
      let body = parts.join(" … ");
      if (budget != null && body.length > budget) {
        if (budget < 24) return "";
        const half = Math.floor((budget - 3) / 2);
        body = parts.length === 2 ? `${parts[0].substring(0, half)} … ${parts[1].substring(0, half)}` : parts[0].substring(0, budget);
      }
      return body;
    };
    const lineOf = (s, budget) => {
      const body = bodyOf(s, budget);
      return body ? `${head(s)}: ${body}` : head(s);
    };
    let lines = list.map((s) => lineOf(s));
    const total = (arr) => arr.reduce((n, l) => n + l.length + 1, 0);
    if (total(lines) > avail && list.length) {
      const perLine = Math.floor(avail / list.length);
      lines = list.map((s) => {
        const h = head(s).length;
        return lineOf(s, perLine - h - 4);
      });
    }
    if (total(lines) > avail) {
      const heads = list.map((s) => head(s));
      if (total(heads) <= avail) lines = heads;
      else {
        const keep = [];
        let used = 60;
        let lo = 0;
        let hi = heads.length - 1;
        const front = [];
        const back = [];
        while (lo <= hi) {
          const takeFront = front.length <= back.length;
          const idx = takeFront ? lo : hi;
          const cost = heads[idx].length + 1;
          if (used + cost > avail) break;
          used += cost;
          if (takeFront) {
            front.push(heads[idx]);
            lo++;
          } else {
            back.unshift(heads[idx]);
            hi--;
          }
        }
        const omitted = Math.max(0, hi - lo + 1);
        keep.push(...front);
        if (omitted) keep.push(`… (${omitted} chapter${omitted === 1 ? "" : "s"} omitted from this outline to fit) …`);
        keep.push(...back);
        lines = keep;
      }
    }
    if (arcLine) lines.push(arcLine);
    let out = lines.join("\n");
    if (out.length > cap) out = this.elideMiddle(out, cap, "\n… (outline shortened) …\n");
    return out;
  },

  scanTimeSignals(text, acc) {
    const t = String(text || "");
    if (!t) return acc;
    const lower = t.toLowerCase();
    this.TIME_PHRASES.forEach((p) => {
      if (lower.includes(p)) acc.phrases.add(p);
    });
    const years = t.match(/\b(?:18|19|20)\d{2}\b/g);
    if (years) years.forEach((y) => acc.years.add(y));
    return acc;
  },

  newTimeSignals() {
    return { phrases: new Set(), years: new Set() };
  },

  /** `signals` (from a whole-document scan) wins over scanning `text`; `text` is still used for motifs. */
  lightArcNotes(text, fiction, signals) {
    const t = String(text || "");
    const sig = signals || this.scanTimeSignals(t, this.newTimeSignals());
    if (!t.trim() && !sig.phrases.size && !sig.years.size) return "";
    const notes = [];
    if (fiction && t && ProzaEdit.ManuscriptOverview?.topMotifs) {
      const motifs = ProzaEdit.ManuscriptOverview.topMotifs(t, 5);
      if (motifs.length) notes.push(`Frequent words: ${motifs.map((m) => m.word).join(", ")}`);
    }
    const temporalHits = [...sig.phrases];
    const years = [...sig.years].sort();
    if (years.length) {
      const shown = years.length > 6 ? [...years.slice(0, 3), ...years.slice(-3)] : years;
      temporalHits.push(`year-like numbers: ${shown.join(", ")}`);
    }
    if (temporalHits.length) notes.push(`Time cues: ${temporalHits.slice(0, 8).join("; ")}`);
    let out = notes.join(" · ");
    if (out.length > this.ARC_NOTES_MAX_CHARS) out = out.substring(0, this.ARC_NOTES_MAX_CHARS - 1) + "…";
    return out;
  },

  newNameAccumulator() {
    return { counts: new Map(), lower: new Map() };
  },

  accumulateNames(text, acc) {
    const t = String(text || "");
    if (t.length < 2) return acc;
    if (ProzaEdit.ProperNoun?.extract) {
      ProzaEdit.ProperNoun.extract(t, new Set()).forEach((c, name) => {
        acc.counts.set(name, (acc.counts.get(name) || 0) + c);
      });
    }
    const words = t.match(/\b[a-z]{3,}\b/g);
    if (words) words.forEach((w) => acc.lower.set(w, (acc.lower.get(w) || 0) + 1));
    return acc;
  },

  /**
   * Recurring-name seeds. `source` is either a Map of name -> count (whole-document scan) or a text sample.
   * Filters sentence-initial common words (a single-token "name" that mostly appears lowercase elsewhere).
   */
  buildNameSeeds(source, dictionary, opts) {
    opts = opts || {};
    let counts;
    let lower;
    if (source && typeof source === "object" && source.counts instanceof Map) {
      counts = source.counts;
      lower = source.lower || new Map();
    } else {
      const acc = this.accumulateNames(String(source || ""), this.newNameAccumulator());
      counts = acc.counts;
      lower = acc.lower;
    }
    const minCount = Math.max(1, Math.floor(Number(opts.minCount) || 1));
    const ranked = [];
    counts.forEach((count, name) => {
      const low = name.toLowerCase();
      const multi = name.includes(" ");
      if (count < minCount && !(multi && count >= 2)) return;
      if (!multi && (lower.get(low) || 0) * 3 > count) return;
      ranked.push({ name, count });
    });
    ranked.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const seeds = ranked.map((x) => x.name);
    return seeds.slice(0, this.NAME_SEED_LIMIT);
  },

  /** Roster for audit/continuity checks: seeds + capitalized user-dictionary words (the author already approved those spellings). */
  knownNames(index, dictionary) {
    const norm = this.normalizeStored(index);
    const out = new Set();
    if (norm && !norm.invalid) norm.nameSeeds.forEach((n) => out.add(n));
    (dictionary || []).forEach((d) => {
      const w = String(d || "").trim();
      if (/^[A-Z][a-z]{3,}$/.test(w)) out.add(w);
    });
    return [...out];
  },

  mergeBuiltPayload(parts) {
    parts = parts || {};
    const sections = (parts.sections || []).slice(0, this.MAX_SECTIONS);
    const arcNotes = this.lightArcNotes(parts.sampleText || "", !!parts.fiction, parts.timeSignals || null);
    const summary = this.buildRollingSummary(sections, arcNotes, this.SUMMARY_MAX_CHARS);
    const nameSource = parts.nameAccumulator || parts.sampleText || "";
    const nameSeeds = this.buildNameSeeds(nameSource, parts.dictionary || [], { minCount: parts.minNameCount });
    return {
      version: this.VERSION,
      builtAt: new Date().toISOString(),
      paragraphCountHash: this.paragraphCountHash(parts.paragraphTotal),
      paragraphTotal: parts.paragraphTotal || 0,
      truncated: !!parts.truncated,
      sampleCoverage: parts.sampleCoverage || 0,
      contentHash: parts.contentHash || "",
      probeSig: parts.probeSig || "",
      summary,
      arcNotes,
      nameSeeds,
      sections,
      sectionTotal: sections.length,
      droppedSections: 0,
      storageNote: "",
      fiction: !!parts.fiction,
    };
  },

  /**
   * Prompt block for AI requests (and local profile text). A stale or unverified index is INCLUDED but flagged, never silently dropped.
   * options: { freshness | fresh | paragraphTotal, scopeMode, destination: "gemini"|"copilot"|"local", maxChars, dropStale }
   */
  injectPromptBlock(index, options) {
    options = options || {};
    const norm = this.normalizeStored(index);
    if (!norm || norm.invalid) return "";
    let fresh;
    if (options.freshness && typeof options.freshness === "object") fresh = options.freshness.state === "fresh";
    else if (typeof options.freshness === "string") fresh = options.freshness === "fresh";
    else if (options.paragraphTotal != null) fresh = this.isFresh(norm, options.paragraphTotal);
    else fresh = options.fresh !== false;
    if (!fresh && options.dropStale) return "";
    const maxChars = Math.max(400, Number(options.maxChars) || this.SUMMARY_MAX_CHARS + 1200);
    const dest = options.destination || (options.cloud ? "gemini" : "local");
    const where =
      dest === "gemini"
        ? "included in this AI request"
        : dest === "copilot"
          ? "included in the text you copy"
          : "stays on this device";
    const head = [`Full-manuscript context (heuristic local outline — not an AI summary; ${where}):`];
    if (options.genre) head.push(`Genre profile: ${String(options.genre).slice(0, 80)} (weigh the outline against this genre's conventions).`);
    if (!fresh) {
      head.push(
        "NOTE: this index may be out of date (the document changed after it was built). Treat names, chapter list and outline as approximate."
      );
    }
    if (norm.truncated) {
      const pct = norm.sampleCoverage > 0 ? ` (~${Math.round(norm.sampleCoverage * 100)}% of paragraphs)` : "";
      head.push(`(Names and word cues came from an evenly spread sample across the whole book${pct}.)`);
    }
    if (norm.storageNote) head.push("(Stored outline was trimmed to fit document settings.)");
    if (options.scopeMode && options.scopeMode !== "full") {
      head.push("(Audit scope is narrower — use index for arc/continuity only.)");
    }
    const tail = [];
    if (norm.nameSeeds?.length) tail.push(`Recurring names (seeds): ${norm.nameSeeds.slice(0, 24).join(", ")}`);
    const fixed = head.join("\n").length + tail.join("\n").length + 2;
    const body = norm.summary || norm.arcNotes || "";
    const room = Math.max(0, maxChars - fixed);
    const bodyText = body ? this.elideMiddle(body, room, "\n… (outline shortened) …\n") : "";
    return [...head, ...(bodyText ? [bodyText] : []), ...tail].join("\n").substring(0, maxChars);
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

  /* ---------- build ---------- */

  createSampler(paragraphTotal, opts) {
    opts = opts || {};
    const cap = Math.max(1000, Number(opts.cap) || this.SAMPLE_TEXT_CAP);
    const piece = Math.max(50, Number(opts.pieceChars) || this.SAMPLE_PIECE_CHARS);
    const total = Math.max(1, Math.floor(Number(paragraphTotal) || 1));
    const perPara = cap / total;
    const maxCredit = piece * 2;
    let credit = piece;
    const parts = [];
    const indexes = [];
    let chars = 0;
    let taken = 0;
    let skipped = 0;
    return {
      /** Offer every paragraph in order (empty ones just earn credit). Returns true when the paragraph was sampled. */
      offer(paraIndex, trimmedText) {
        credit = Math.min(maxCredit, credit + perPara);
        if (!trimmedText) return false;
        const cut = trimmedText.substring(0, piece);
        if (cut.length <= credit && chars + cut.length <= cap + piece) {
          credit -= cut.length;
          parts.push(cut);
          indexes.push(paraIndex);
          chars += cut.length + 1;
          taken++;
          return true;
        }
        skipped++;
        return false;
      },
      text() {
        return parts.join("\n");
      },
      stats() {
        const seen = taken + skipped;
        return { taken, skipped, chars, coverage: seen ? taken / seen : 1, indexes };
      },
    };
  },

  newSectionAcc(index, title, startPara) {
    return {
      index,
      title,
      startPara,
      endPara: startPara,
      wordCount: 0,
      firstSnippet: "",
      lastSnippet: "",
      first: 0,
      third: 0,
      hasher: this.newHasher(),
    };
  },

  isHeadingStyle(style) {
    const W = typeof Word !== "undefined" ? Word : null;
    const S = W && W.Style ? W.Style : null;
    if (!S) return style === "Heading1" || style === "Heading2" || style === "Heading3";
    return style === S.heading1 || style === S.heading2 || style === S.heading3;
  },

  /** Merge adjacent sections so the list never exceeds `max` (instead of dropping the end of the book). */
  mergeSectionAccs(list, max) {
    if (list.length <= max) return list;
    const size = Math.ceil(list.length / max);
    const out = [];
    for (let i = 0; i < list.length; i += size) {
      const group = list.slice(i, i + size);
      const a = group[0];
      const z = group[group.length - 1];
      const h = this.newHasher();
      group.forEach((g) => h.update(g.hash));
      out.push({
        index: out.length + 1,
        title: group.length > 1 ? `${a.title} – ${z.title}`.substring(0, 120) : a.title,
        startPara: a.startPara,
        endPara: z.endPara,
        wordCount: group.reduce((n, g) => n + g.wordCount, 0),
        firstSnippet: a.firstSnippet,
        lastSnippet: z.lastSnippet,
        first: group.reduce((n, g) => n + g.first, 0),
        third: group.reduce((n, g) => n + g.third, 0),
        hash: h.digest(),
      });
    }
    return out;
  },

  finalizeSectionAcc(acc) {
    return {
      index: acc.index,
      title: acc.title,
      startPara: acc.startPara,
      endPara: acc.endPara,
      wordCount: acc.wordCount,
      povHint: this.povFromCounts(acc.first, acc.third),
      firstSnippet: this.trimSnippet(acc.firstSnippet),
      lastSnippet: this.trimSnippet(acc.lastSnippet),
      hash: acc.hash || (acc.hasher ? acc.hasher.digest() : ""),
    };
  },

  fallbackSectionSize: 80,

  /**
   * Single chunked pass (Office.js): headings → chapters, per-chapter hashes, whole-document names and time cues,
   * stratified text sample for frequent-word cues, probe hashes for the quick staleness check. Yields between batches.
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
    const items = paras.items;
    const paragraphTotal = items.length;
    if (!paragraphTotal) throw new Error("Document is empty.");

    const batches = SR.planParagraphBatches(paragraphTotal, this.PARAGRAPH_BATCH);
    const probeSet = new Set(this.probeIndexes(paragraphTotal, this.PROBE_MAX));

    let st = opts.checkpointStore ? opts.checkpointStore.state : null;
    let resumed = false;
    if (st && (await this.checkpointValid(context, items, st, paragraphTotal, batches.length))) {
      resumed = true;
    } else {
      st = {
        version: this.CHECKPOINT_VERSION,
        paragraphTotal,
        createdAt: Date.now(),
        nextBatch: 0,
        sampler: this.createSampler(paragraphTotal),
        names: this.newNameAccumulator(),
        timeSignals: this.newTimeSignals(),
        probePairs: [],
        docHasher: this.newHasher(),
        chapterAccs: [],
        frontMatter: null,
        current: null,
        chunkAccs: [],
        nonEmptyChars: 0,
        checks: [],
      };
    }
    if (opts.checkpointStore) opts.checkpointStore.state = st;
    const { sampler, names, timeSignals, probePairs, docHasher, chapterAccs, chunkAccs } = st;
    let { frontMatter, current, nonEmptyChars } = st;
    if (resumed && onProgress) {
      onProgress({ phase: "Resuming manuscript read", batchIndex: st.nextBatch, batchCount: batches.length, sectionIndex: 1, sectionTotal: Math.max(1, chapterAccs.length), paragraphsLoaded: batches[st.nextBatch - 1] ? batches[st.nextBatch - 1].end + 1 : 0, paragraphTotal });
    }

    for (let bi = st.nextBatch; bi < batches.length; bi++) {
      cancelCheck();
      const { start, end } = batches[bi];
      for (let i = start; i <= end; i++) items[i].load(["text", "styleBuiltIn"]);
      await context.sync();
      try {
      for (let i = start; i <= end; i++) {
        const item = items[i];
        const text = item.text || "";
        const trimmed = this.normalizeParagraphText(text);
        const isHeading = trimmed && this.isHeadingStyle(item.styleBuiltIn);

        if (isHeading) {
          current = this.newSectionAcc(chapterAccs.length + 1, trimmed.substring(0, 80) || `Chapter ${chapterAccs.length + 1}`, i);
          chapterAccs.push(current);
        } else if (!current) {
          if (!frontMatter) frontMatter = this.newSectionAcc(0, "Front matter (before first heading)", i);
          current = frontMatter;
        }
        const chunkIdx = Math.floor(i / this.fallbackSectionSize);
        if (!chunkAccs[chunkIdx]) {
          chunkAccs[chunkIdx] = this.newSectionAcc(chunkIdx + 1, `Section ${chunkIdx + 1}`, i);
        }
        const wc = trimmed ? this.wordCount(text) : 0;
        [current, chunkAccs[chunkIdx]].forEach((sec) => {
          sec.endPara = i;
          sec.hasher.update(trimmed);
          if (!trimmed) return;
          sec.wordCount += wc;
          if (isHeading && sec === current) return;
          if (!sec.firstSnippet) sec.firstSnippet = trimmed;
          sec.lastSnippet = trimmed;
        });
        docHasher.update(trimmed);
        if (probeSet.has(i)) probePairs.push([i, this.hashString(trimmed)]);
        if (trimmed) {
          nonEmptyChars += trimmed.length;
          const pc = this.pronounCounts(trimmed);
          current.first += pc.first;
          current.third += pc.third;
          chunkAccs[chunkIdx].first += pc.first;
          chunkAccs[chunkIdx].third += pc.third;
          this.accumulateNames(trimmed, names);
          this.scanTimeSignals(trimmed, timeSignals);
        }
        sampler.offer(i, trimmed);
      }
      } catch (err) {
        if (opts.checkpointStore) opts.checkpointStore.state = null;
        throw err;
      }
      st.frontMatter = frontMatter;
      st.current = current;
      st.nonEmptyChars = nonEmptyChars;
      st.nextBatch = bi + 1;
      // Up to CHECK_POINTS evenly spaced paragraphs per finished batch (was: first only) so an edit anywhere in a
      // finished batch is much more likely to invalidate a resume instead of producing a mixed index.
      st.checks.push(this.spreadIndexes(start, end, this.CHECK_POINTS).map((idx) => [idx, this.hashString(this.normalizeParagraphText(items[idx].text || ""))]));
      if (onProgress) {
        const loaded = end + 1;
        const secCount = Math.max(1, chapterAccs.length || chunkAccs.length);
        onProgress({
          phase: "Reading manuscript for context",
          batchIndex: bi + 1,
          batchCount: batches.length,
          sectionIndex: Math.min(secCount, Math.max(1, Math.ceil((loaded / paragraphTotal) * secCount))),
          sectionTotal: secCount,
          paragraphsLoaded: loaded,
          paragraphTotal,
        });
      }
      if (bi + 1 < batches.length) await yieldFn();
    }

    if (opts.checkpointStore) opts.checkpointStore.state = null;
    let accs = chapterAccs.length ? [...(frontMatter && frontMatter.wordCount > 0 ? [frontMatter] : []), ...chapterAccs] : chunkAccs.filter(Boolean);
    accs = accs.map((a) => ({ ...a, hash: a.hasher ? a.hasher.digest() : a.hash }));
    accs = this.mergeSectionAccs(accs, this.MAX_SECTIONS);
    const sections = accs.map((a) => this.finalizeSectionAcc(a));

    const stats = sampler.stats();
    const sampled = stats.skipped > 0;
    const minNameCount = nonEmptyChars > this.LONG_DOC_CHARS ? this.MIN_NAME_COUNT_LONG_DOC : 1;
    return this.normalizeStored(
      this.mergeBuiltPayload({
        sections,
        sampleText: sampler.text(),
        timeSignals,
        nameAccumulator: names,
        minNameCount,
        truncated: sampled || paragraphTotal >= this.STRUCTURE_ONLY_PARAGRAPH_THRESHOLD,
        sampleCoverage: stats.coverage,
        paragraphTotal,
        contentHash: docHasher.digest(),
        probeSig: this.encodeProbeSig(probePairs),
        dictionary: opts.dictionary || [],
        fiction: !!opts.fiction,
      })
    );
  },

  CHECKPOINT_VERSION: 2,
  CHECK_POINTS: 8,

  spreadIndexes(start, end, n) {
    const len = end - start + 1;
    if (len <= n) return Array.from({ length: Math.max(0, len) }, (_, k) => start + k);
    const out = [];
    for (let k = 0; k < n; k++) out.push(start + Math.floor((k * (len - 1)) / (n - 1)));
    return out;
  },
  CHECKPOINT_MAX_AGE_MS: 30 * 60 * 1000,

  /**
   * A checkpoint (in-memory only, never written to the document) is reusable when it is the same version, recent, the
   * paragraph count matches, and a spread of already-processed paragraphs still hash the same. Otherwise discard it.
   */
  async checkpointValid(context, items, st, paragraphTotal, batchCount) {
    try {
      if (!st || st.version !== this.CHECKPOINT_VERSION || st.paragraphTotal !== paragraphTotal) return false;
      if (Date.now() - (st.createdAt || 0) > this.CHECKPOINT_MAX_AGE_MS) return false;
      if (!(st.nextBatch > 0 && st.nextBatch < batchCount) || !Array.isArray(st.checks) || st.checks.length !== st.nextBatch) return false;
      const picks = [];
      for (const group of st.checks) {
        if (!Array.isArray(group) || !group.length) return false;
        for (const pair of group) {
          if (!Array.isArray(pair)) return false;
          picks.push(pair);
        }
      }
      picks.forEach(([idx]) => items[idx] && items[idx].load("text"));
      await context.sync();
      return picks.every(([idx, h]) => items[idx] && this.hashString(this.normalizeParagraphText(items[idx].text || "")) === h);
    } catch (_) {
      return false;
    }
  },

  /** Compare two indexes by per-chapter hash (same chapter count only). */
  diffSections(prev, next) {
    const a = this.normalizeStored(prev);
    const b = this.normalizeStored(next);
    if (!a || !b || a.invalid || b.invalid) return { comparable: false, changed: 0, total: b ? b.sections.length : 0 };
    if (a.sections.length !== b.sections.length || !a.sections.length || a.droppedSections || b.droppedSections) {
      return { comparable: false, changed: 0, total: b.sections.length };
    }
    let changed = 0;
    b.sections.forEach((s, i) => {
      if (s.hash && a.sections[i].hash && s.hash !== a.sections[i].hash) changed++;
    });
    return { comparable: true, changed, total: b.sections.length };
  },

  /* ---------- UI strings ---------- */

  formatStaleReason(fresh) {
    if (!fresh || fresh.state !== "stale") return "";
    if (fresh.reason === "count") return "paragraph count changed";
    if (fresh.reason === "genre") return "genre changed since it was built";
    const n = (fresh.changedSections || []).length;
    if (fresh.reason === "edited") return n ? `${n} chapter${n === 1 ? "" : "s"} edited` : "text was edited";
    return "document changed";
  },

  formatStatusBadge(index, fresh) {
    const norm = this.normalizeStored(index);
    if (!norm || norm.invalid) {
      return { text: "Full MS context not built", className: "pe-mci-stale", state: "none" };
    }
    const f = this.freshnessOf(norm, fresh);
    const built = norm.builtAt ? new Date(norm.builtAt) : null;
    const stamp = built && !Number.isNaN(built.getTime()) ? built.toLocaleString() : norm.builtAt;
    if (f.state === "stale") {
      const why = this.formatStaleReason(f);
      return {
        text: `Index may be out of date${why ? ` (${why})` : ""} — refresh · last built ${stamp}`,
        className: "pe-mci-stale",
        state: "stale",
      };
    }
    let text = `Full MS context ready · ${stamp}`;
    if (norm.truncated) text += " · sampled";
    if (norm.storageNote) text += " · trimmed for storage";
    return { text, className: "pe-mci-ready", state: f.state };
  },

  formatStorageBlurb(index) {
    const stored = index ? this.trimForStorage(index) : null;
    const chars = stored ? this.estimateJsonChars(stored) : 0;
    const where = "own document-settings key; heuristic outline, not AI";
    if (!chars || chars < 1024) return `~${chars} characters (${where})`;
    return `~${Math.round(chars / 1024)} KB (${where})`;
  },
};
