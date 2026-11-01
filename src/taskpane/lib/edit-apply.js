/* Search-and-replace with explicit outcome phases so a failed Apply is never blindly repeated. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.EditApply = {
  MAX_CANDIDATES: 50,

  /** Placeholder replacements such as "(split)" are advice, never text to insert. */
  isApplicable(fromText, toText) {
    const from = String(fromText == null ? "" : fromText);
    const to = String(toText == null ? "" : toText);
    if (!from.trim()) return { ok: false, reason: "There is no text to replace." };
    if (!to.trim() && to !== "") return { ok: false, reason: "The replacement is blank." };
    if (/^\(.*\)$/.test(to.trim())) return { ok: false, reason: "This card has no automatic replacement." };
    if (from === to) return { ok: false, reason: "The replacement is identical to the original." };
    return { ok: true };
  },

  _norm(s) {
    return String(s == null ? "" : s).replace(/[\r\n\u000b\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  },

  /**
   * Replace exactly the text the user was shown. Word's search ignores case, so every hit's text is loaded and only a
   * hit that matches the shown text exactly (case-sensitive, whitespace-normalised) is edited; when none does, nothing
   * is changed. After the edit the new range is read back and verified. The result reports how many exact matches existed
   * so the UI can say which one was changed.
   * @param {Word.RequestContext} ctx
   * @param {string} fromText
   * @param {string} toText
   * @param {{ searchInScope: function(ctx, string): Promise<Array>, replaceLocation: *, sanitize?: function(string): string }} deps
   * Errors carry peApplyPhase: "before-edit" (nothing changed) or "uncertain" (edit was queued, commit/verify failed).
   * @returns {Promise<{ occurrences: number, verified: boolean }>}
   */
  async swapText(ctx, fromText, toText, deps) {
    const tag = (err, phase) => {
      try {
        err.peApplyPhase = phase;
      } catch (_) {}
      return err;
    };
    const applicable = this.isApplicable(fromText, toText);
    if (!applicable.ok) throw tag(new Error(applicable.reason), "before-edit");
    let items;
    try {
      items = await deps.searchInScope(ctx, fromText);
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "before-edit");
    }
    if (!items || !items.length) {
      throw tag(new Error("Text not found—document may have changed. Use Go to, then Apply again."), "before-edit");
    }
    const candidates = items.slice(0, this.MAX_CANDIDATES);
    try {
      candidates.forEach((it) => it.load("text"));
      await ctx.sync();
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "before-edit");
    }
    const want = this._norm(deps.sanitize ? deps.sanitize(fromText) : fromText);
    const exact = candidates.filter((it) => this._norm(it.text) === want);
    if (!exact.length) {
      const anyText = candidates.some((it) => it.text);
      throw tag(
        new Error(
          anyText
            ? "The matching text in Word is not exactly what the audit showed (for example different capitalisation or it has been edited). Nothing was changed. Run the check again."
            : "Match lost after sync—try Go to first."
        ),
        "before-edit"
      );
    }
    const hit = exact[0];
    let inserted;
    try {
      inserted = hit.insertText(String(toText), deps.replaceLocation);
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "before-edit");
    }
    try {
      await ctx.sync();
    } catch (e) {
      throw tag(e instanceof Error ? e : new Error(String(e)), "uncertain");
    }
    let verified = false;
    if (inserted && typeof inserted.load === "function") {
      try {
        inserted.load("text");
        await ctx.sync();
      } catch (e) {
        throw tag(new Error("Word applied the change but it could not be re-read to confirm. Use Go to to check the text."), "uncertain");
      }
      if (this._norm(inserted.text) !== this._norm(toText)) {
        throw tag(new Error("Word reported a different result than expected after the edit. Use Undo in Word (Ctrl+Z) and check the text."), "uncertain");
      }
      verified = true;
    }
    return { occurrences: exact.length, verified };
  },
};
