/* Small, testable helpers for a stable card-by-card review flow. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.AuditReview = {
  progressLabel(index, total) {
    const count = Math.max(0, Number(total) || 0);
    if (!count) return "No findings";
    const position = Math.min(count, Math.max(1, (Number(index) || 0) + 1));
    return `Finding ${position} of ${count}`;
  },

  nextTargetId(ids, removedId) {
    const list = Array.isArray(ids) ? ids.map(String) : [];
    const index = list.indexOf(String(removedId || ""));
    if (index < 0) return list[0] || "";
    return list[index + 1] || list[index - 1] || "";
  },

  recoveryMessage(error, action) {
    const raw = String(error?.message || error || "").trim();
    if (
      /text not found|match lost|highlight text|no text|too large|exceeds limit|cannot locate|no automatic replacement/i.test(
        raw
      )
    ) {
      return raw;
    }
    const task = String(action || "complete that action");
    const detail = raw ? ` (${raw})` : "";
    return `Word could not ${task}${detail}. Try again. If it keeps failing, reopen the task pane and retry with a smaller scope.`;
  },
};
