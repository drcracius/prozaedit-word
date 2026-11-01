/* Search-and-replace with explicit outcome phases so a failed Apply is never blindly repeated. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.EditApply = {
  /**
   * @param {Word.RequestContext} ctx
   * @param {string} fromText
   * @param {string} toText
   * @param {{ searchInScope: function(ctx, string): Promise<Array>, replaceLocation: * }} deps
   * Errors carry peApplyPhase: "before-edit" (nothing changed) or "uncertain" (edit was queued, commit failed).
   */
  async swapText(ctx, fromText, toText, deps) {
    const tag = (err, phase) => {
      try {
        err.peApplyPhase = phase;
      } catch (_) {}
      return err;
    };
    let items;
    try {
      items = await deps.searchInScope(ctx, fromText);
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "before-edit");
    }
    if (!items || !items.length) {
      throw tag(new Error("Text not found—document may have changed. Use Go to, then Apply again."), "before-edit");
    }
    const hit = items[0];
    try {
      hit.load("text");
      await ctx.sync();
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "before-edit");
    }
    if (!hit.text) throw tag(new Error("Match lost after sync—try Go to first."), "before-edit");
    try {
      hit.insertText(String(toText), deps.replaceLocation);
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "before-edit");
    }
    try {
      await ctx.sync();
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "uncertain");
    }
  },
};
