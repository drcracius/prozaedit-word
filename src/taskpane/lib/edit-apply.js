/* Search-and-replace with explicit outcome phases so a failed Apply is never blindly repeated. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.EditApply = {
  MAX_CANDIDATES: 50,

  /** Placeholder replacements such as "(split)" are advice, never text to insert. */
  isApplicable(fromText, toText) {
    const from = String(fromText == null ? "" : fromText);
    const to = String(toText == null ? "" : toText);
    if (!from.trim()) {
      return {
        ok: false,
        reason: from
          ? "Spacing-only fixes cannot be applied one at a time safely. In Word use Find & Replace (Ctrl+H): replace two spaces with one."
          : "There is no text to replace.",
      };
    }
    if (!to.trim() && to !== "") return { ok: false, reason: "The replacement is blank." };
    if (/^\(.*\)$/.test(to.trim())) return { ok: false, reason: "This card has no automatic replacement." };
    if (from === to) return { ok: false, reason: "The replacement is identical to the original." };
    return { ok: true };
  },

  _norm(s) {
    return String(s == null ? "" : s).replace(/[\r\n\u000b\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
  },

  _hash(s) {
    let h = 2166136261;
    const t = String(s);
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36) + ":" + t.length;
  },

  CONTEXT_CHARS: 30,

  /**
   * Anchor for a finding: the paragraph's text hash, ~30 chars of context either side and the paragraph index within
   * the audited excerpt (a hint only; excerpts may start mid-document). Returns null unless the target occurs exactly
   * once in the excerpt, because an identical repeat cannot be told apart from the excerpt alone.
   * @returns {{ anchor: object|null, count: number }}
   */
  buildAnchor(excerpt, target) {
    const want = this._norm(target);
    if (!want || String(excerpt || "").length === 0) return { anchor: null, count: 0 };
    const paras = String(excerpt).split(/\r\n|[\r\n\u000b\u2028\u2029]/);
    let count = 0;
    let found = null;
    for (let i = 0; i < paras.length; i++) {
      const P = this._norm(paras[i]);
      let at = P.indexOf(want);
      while (at !== -1) {
        count++;
        if (!found) found = { P, at, i };
        at = P.indexOf(want, at + 1);
      }
      if (count > 1) return { anchor: null, count };
    }
    if (count !== 1) return { anchor: null, count };
    const n = this.CONTEXT_CHARS;
    return {
      anchor: {
        paraIndex: found.i,
        paraHash: this._hash(found.P),
        before: found.P.slice(Math.max(0, found.at - n), found.at),
        after: found.P.slice(found.at + want.length, found.at + want.length + n),
        target: want,
      },
      count,
    };
  },

  _occurrences(P, want) {
    const out = [];
    let at = P.indexOf(want);
    while (at !== -1) {
      out.push(at);
      at = P.indexOf(want, at + 1);
    }
    return out;
  },

  /**
   * Replace exactly the text the user was shown. Word's search ignores case, so every hit's text is loaded and only a
   * hit that matches the shown text exactly (case-sensitive, whitespace-normalised) is edited; when none does, nothing
   * is changed. After the edit the new range is read back and verified. The result reports how many exact matches existed
   * so the UI can say which one was changed.
   * @param {Word.RequestContext} ctx
   * @param {string} fromText
   * @param {string} toText
   * With deps.anchor (see buildAnchor) the hit's paragraph must be unchanged (hash) and the context must match exactly one
   * occurrence; without it exactly one exact match must exist. Anything else is refused and nothing is edited.
   * @param {{ searchInScope: function(ctx, string): Promise<Array>, replaceLocation: *, sanitize?: function(string): string, anchor?: object|null }} deps
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
    if (items.length > this.MAX_CANDIDATES) {
      throw tag(new Error("This text appears too many times to apply safely. Nothing was changed. Edit it in Word."), "before-edit");
    }
    const candidates = items;
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
    const anchor = deps.anchor && deps.anchor.target === want ? deps.anchor : null;
    const ambiguous = (n) =>
      tag(
        new Error(
          `This text appears ${n} times and ProzaEdit cannot be sure which one the card refers to. Nothing was changed. Use Go to, select the exact passage in Word and edit it there.`
        ),
        "before-edit"
      );
    let hit;
    let expectedPara = null;
    if (!anchor) {
      if (exact.length > 1) throw ambiguous(exact.length);
      hit = exact[0];
    } else {
      let paras;
      try {
        paras = exact.map((it) => it.paragraphs.getFirst());
        paras.forEach((p) => p.load("text"));
        await ctx.sync();
      } catch (e) {
        throw tag(new Error("Could not read the surrounding paragraph to confirm the location. Nothing was changed. Run the check again."), "before-edit");
      }
      const group = [];
      let P = null;
      exact.forEach((it, i) => {
        const text = this._norm(paras[i].text);
        if (this._hash(text) === anchor.paraHash) {
          group.push(it);
          P = text;
        }
      });
      if (!group.length) {
        throw tag(new Error("The paragraph has changed since the audit (or moved). Nothing was changed. Run the check again."), "before-edit");
      }
      const occ = this._occurrences(P, want);
      if (group.length !== occ.length) throw ambiguous(exact.length);
      const ctxOcc = occ.filter((at) => P.slice(Math.max(0, at - anchor.before.length), at) === anchor.before && P.slice(at + want.length, at + want.length + anchor.after.length) === anchor.after);
      if (ctxOcc.length !== 1) throw ambiguous(ctxOcc.length || occ.length);
      const at = ctxOcc[0];
      hit = group[occ.indexOf(at)];
      expectedPara = P.slice(0, at) + this._norm(toText) + P.slice(at + want.length);
    }
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
      if (expectedPara !== null && typeof inserted.paragraphs?.getFirst === "function") {
        try {
          const pp = inserted.paragraphs.getFirst();
          pp.load("text");
          await ctx.sync();
          if (this._norm(pp.text) !== expectedPara) {
            throw new Error("mismatch");
          }
        } catch (e) {
          throw tag(new Error("The paragraph does not look as expected after the edit. Use Undo in Word (Ctrl+Z) and check the text."), "uncertain");
        }
      }
    }
    return { occurrences: exact.length, verified };
  },
};
