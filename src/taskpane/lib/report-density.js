window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ReportDensity = {
  levels: {
    light: { maxCards: 18, label: "Light", overview: "minimal" },
    balanced: { maxCards: 60, label: "Balanced", overview: "standard" },
    dense: { maxCards: 100, label: "Dense", overview: "full" },
  },

  normalize(value) {
    const v = String(value || "balanced").toLowerCase();
    return this.levels[v] ? v : "balanced";
  },

  maxCards(value) {
    return this.levels[this.normalize(value)].maxCards;
  },

  overviewMode(value) {
    return this.levels[this.normalize(value)].overview;
  },
};
