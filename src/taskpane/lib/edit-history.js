/* Session undo/redo for ProzaEdit-applied Word replacements */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.EditHistory = {
  MAX: 40,
  _undo: [],
  _redo: [],

  record(before, after, label) {
    const b = String(before || "");
    const a = String(after || "");
    if (!b || b === a) return;
    this._undo.push({ before: b, after: a, label: String(label || "Edit").slice(0, 80) });
    if (this._undo.length > this.MAX) this._undo.shift();
    this._redo = [];
  },

  canUndo() {
    return this._undo.length > 0;
  },

  canRedo() {
    return this._redo.length > 0;
  },

  peekUndo() {
    return this._undo[this._undo.length - 1] || null;
  },

  popUndo() {
    if (!this._undo.length) return null;
    const entry = this._undo.pop();
    this._redo.push(entry);
    return entry;
  },

  popRedo() {
    if (!this._redo.length) return null;
    const entry = this._redo.pop();
    this._undo.push(entry);
    return entry;
  },

  revertPopUndo(entry) {
    if (this._redo.length && this._redo[this._redo.length - 1] === entry) this._redo.pop();
    this._undo.push(entry);
  },

  revertPopRedo(entry) {
    if (this._undo.length && this._undo[this._undo.length - 1] === entry) this._undo.pop();
    this._redo.push(entry);
  },
};
