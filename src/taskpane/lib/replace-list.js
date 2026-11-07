/* Plain find/replace pairs for the Rewrite tab. No wildcards and no macro files. */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ReplaceList = {
  MAX_PAIRS: 80,
  MAX_FIND: 120,
  MAX_REPLACE: 200,
  MAX_HITS: 400,

  /**
   * One pair per line: `find => replace`, `find -> replace`, or a tab.
   * A blank replacement deletes the find. Lines starting with # are notes.
   * @returns {{ pairs: {find: string, replace: string, line: number}[], errors: string[] }}
   */
  parse(text) {
    const lines = String(text == null ? "" : text).split(/\r?\n/);
    const pairs = [];
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.charAt(0) === "#") continue;
      const split = this._split(raw);
      if (!split) {
        errors.push(`Line ${i + 1}: use find => replace.`);
        continue;
      }
      const find = split.find.trim();
      const repl = split.replace.trim();
      if (!find) {
        errors.push(`Line ${i + 1}: the text to find is empty.`);
        continue;
      }
      if (find.length > this.MAX_FIND) {
        errors.push(`Line ${i + 1}: the find text is too long.`);
        continue;
      }
      if (repl.length > this.MAX_REPLACE) {
        errors.push(`Line ${i + 1}: the replacement is too long.`);
        continue;
      }
      if (find === repl) continue;
      pairs.push({ find, replace: repl, line: i + 1 });
      if (pairs.length > this.MAX_PAIRS) {
        errors.push(`Use at most ${this.MAX_PAIRS} lines.`);
        break;
      }
    }
    return { pairs: pairs.slice(0, this.MAX_PAIRS), errors };
  },

  _split(raw) {
    const arrow = raw.indexOf("=>");
    if (arrow >= 0) return { find: raw.slice(0, arrow), replace: raw.slice(arrow + 2) };
    const tab = raw.indexOf("\t");
    if (tab >= 0) return { find: raw.slice(0, tab), replace: raw.slice(tab + 1) };
    const dash = raw.indexOf("->");
    if (dash >= 0) return { find: raw.slice(0, dash), replace: raw.slice(dash + 2) };
    return null;
  },
};
