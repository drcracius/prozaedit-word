/* Local continuity / name / cross-chapter signals (0 tokens). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ContinuityGuard = {
  KEYS: {
    INDEX: "PROZAEDIT_MS_INDEX",
    DISMISS: "PROZAEDIT_CONT_DISMISS",
  },

  _readDismiss() {
    try {
      const raw = localStorage.getItem(this.KEYS.DISMISS);
      const arr = JSON.parse(raw || "[]");
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (_) {
      return new Set();
    }
  },

  dismissWarningKey(key) {
    const set = this._readDismiss();
    set.add(key);
    try {
      localStorage.setItem(this.KEYS.DISMISS, JSON.stringify([...set].slice(0, 400)));
    } catch (_) {}
  },

  buildIndex(fullText) {
    const text = String(fullText || "").substring(0, 600000);
    const lower = text.toLowerCase();
    const names = ProzaEdit.ProperNoun?.extract ? ProzaEdit.ProperNoun.extract(text, new Set()) : new Map();
    const topNames = [...names.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 80)
      .map(([name, count]) => ({ name, count }));
    const chapters = [];
    if (ProzaEdit.ChapterHeatmap?.scanDocument) {
      /* filled async elsewhere */
    }
    return {
      builtAt: new Date().toISOString(),
      charLen: text.length,
      topNames,
      lowerSample: lower.substring(0, 120000),
    };
  },

  countOccurrences(hayLower, needle) {
    const n = String(needle || "").trim().toLowerCase();
    if (!n || n.length < 2) return 0;
    let c = 0;
    let i = 0;
    while ((i = hayLower.indexOf(n, i)) !== -1) {
      c++;
      i += n.length;
    }
    return c;
  },

  assessReplace(target, replacement, index, sensitivity) {
    sensitivity = Math.min(5, Math.max(1, parseInt(sensitivity, 10) || 3));
    const dismissed = this._readDismiss();
    const warnings = [];
    const t = String(target || "").trim();
    const r = String(replacement || "").trim();
    if (!t || !r || t === r || r.startsWith("(")) return warnings;

    const idx = index || { lowerSample: "", topNames: [] };
    const hay = idx.lowerSample || "";
    const occ = this.countOccurrences(hay, t);
    const minOcc = sensitivity <= 2 ? 4 : sensitivity === 3 ? 2 : 1;

    if (occ >= minOcc) {
      const key = `occ:${t.toLowerCase()}:${occ}`;
      if (!dismissed.has(key)) {
        warnings.push({
          key,
          severity: occ >= 5 ? "high" : "medium",
          title: "Appears elsewhere in manuscript",
          detail: `"${t}" occurs ~${occ} time(s) in the indexed manuscript. Changing one instance may leave inconsistent spelling or naming.`,
          where: "Indexed full-document sample (local, no AI).",
        });
      }
    }

    const tLow = t.toLowerCase();
    const isName = idx.topNames?.some((x) => {
      const n = String(x.name || "").toLowerCase();
      return n === tLow || (tLow.length >= 3 && n.split(/\s+/).includes(tLow));
    });
    if (isName && sensitivity >= 2) {
      const key = `name:${t.toLowerCase()}`;
      if (!dismissed.has(key)) {
        warnings.push({
          key,
          severity: "high",
          title: "Possible character or place name",
          detail: `"${t}" looks like a tracked proper label. Renaming without a global pass can break continuity.`,
          where: "Manuscript name index (local).",
        });
      }
    }

    if (t.length >= 4 && r.length >= 4 && t[0] === r[0] && ProzaEdit.ProperNoun?.levenshtein) {
      const d = ProzaEdit.ProperNoun.levenshtein(t.toLowerCase(), r.toLowerCase());
      if (d > 0 && d <= 2 && sensitivity >= 3) {
        const key = `spell:${t.toLowerCase()}->${r.toLowerCase()}`;
        if (!dismissed.has(key)) {
          warnings.push({
            key,
            severity: "medium",
            title: "Spelling-variant change",
            detail: `Replacing "${t}" with "${r}" may be intentional — verify other chapters use the same form.`,
            where: "Similar-token check (local).",
          });
        }
      }
    }

    return warnings;
  },

  formatWarningBlock(warnings) {
    if (!warnings.length) return "";
    return warnings.map((w) => `• ${w.title}: ${w.detail} (${w.where})`).join("\n");
  },
};
