/* Safe Word search strings (255-char cap, wildcard strip) and scope-aware search/navigation. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.WordSafeNavigator = {
  sanitizeSearch(t) {
    return String(t)
      .replace(/[\r\n\u000b\u000c\u2028\u2029]/g, " ")
      .replace(/[\^?$*[\]{}<>@#]/g, "")
      .trim()
      .substring(0, 255);
  },

  /**
   * @param {Word.RequestContext} context
   * @param {string} target
   * @param {{ forceDocument?: boolean, selectionOnly?: boolean }} [options]
   */
  async searchInScope(context, target, options) {
    options = options || {};
    const q = this.sanitizeSearch(target);
    if (!q) return [];
    if (options.selectionOnly && !options.forceDocument) {
      const sel = context.document.getSelection();
      sel.load("text");
      await context.sync();
      if (!sel.text?.trim()) throw new Error("Select text in Word (selection-only edits on).");
      const r = sel.search(q, { matchCase: false });
      r.load("items");
      await context.sync();
      return r.items;
    }
    const r = context.document.body.search(q, { matchCase: false });
    r.load("items");
    await context.sync();
    return r.items;
  },

  /** Select first body match for audit card "Go to". */
  async selectFirstInBody(context, target) {
    const q = this.sanitizeSearch(target);
    if (!q) throw new Error("Cannot locate.");
    const r = context.document.body.search(q, { matchCase: false });
    r.load("items");
    await context.sync();
    if (!r.items.length) throw new Error("Not found.");
    r.items[0].select();
    await context.sync();
  },
};
