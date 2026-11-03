window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.Metrics = {
  /** Sentence split without regex lookbehind (older Office WebViews lack it). */
  splitSentences(text) {
    return String(text == null ? "" : text)
      .replace(/([.!?])\s+/g, "$1\u0001")
      .split("\u0001");
  },

  countSyllables(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0;
    if (w.length <= 3) return 1;
    const vowels = w.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    if (w.endsWith("e") && count > 1) count--;
    if (w.endsWith("le") && w.length > 2 && !"aeiouy".includes(w[w.length - 3])) count++;
    return Math.max(1, count);
  },

  _letterDigitRe() {
    try {
      return /[\p{L}\p{N}]/u;
    } catch (_) {
      return /[0-9A-Za-z\u00C0-\u024F\u0400-\u04FF]/;
    }
  },

  /** Word-style: whitespace tokens that contain a letter or digit. Matches Word's status bar, not paragraphs × 42. */
  countWords(text) {
    const hasLetter = this._letterDigitRe();
    let n = 0;
    for (const t of String(text == null ? "" : text).split(/\s+/)) if (t && hasLetter.test(t)) n++;
    return n;
  },

  analyze(text) {
    const raw = String(text == null ? "" : text);
    const sentences = ProzaEdit.Metrics.splitSentences(raw).filter((s) => s.trim());
    const hasLetter = this._letterDigitRe();
    const words = raw.split(/\s+/).filter((t) => t && hasLetter.test(t));
    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    let syllables = 0;
    words.forEach((w) => {
      syllables += this.countSyllables(w);
    });
    const asl = wordCount / sentenceCount;
    const asw = syllables / Math.max(1, wordCount);
    const fre = 206.835 - 1.015 * asl - 84.6 * asw;
    const fkg = 0.39 * asl + 11.8 * asw - 15.59;
    return {
      wordCount,
      sentenceCount,
      fleschReadingEase: Math.round(fre * 10) / 10,
      fleschKincaidGrade: Math.max(0, Math.round(fkg * 10) / 10),
    };
  },

  targetGradeRange(audience) {
    const map = {
      "Middle School": [5, 8],
      "High School": [7, 10],
      Teenager: [7, 10],
      "Young Adult": [8, 11],
      "College Student": [10, 13],
      "College Graduate": [11, 14],
      Adult: [8, 12],
      "Post Graduate": [12, 16],
    };
    return map[audience] || [8, 12];
  },

  trafficLight(score) {
    if (score >= 8.5) return { level: "green", label: "Strong" };
    if (score >= 6.5) return { level: "yellow", label: "Needs polish" };
    return { level: "red", label: "Priority fixes" };
  },
};
