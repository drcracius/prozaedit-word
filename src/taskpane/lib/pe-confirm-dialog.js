/* In-pane confirmation dialog (replaces blocked window.confirm in Office iframes). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ConfirmDialog = {
  _open: false,
  _resolve: null,
  _returnFocus: null,
  _keydownHandler: null,

  _els() {
    const doc = typeof document !== "undefined" ? document : null;
    if (!doc) return {};
    return {
      modal: doc.getElementById("pe-confirm-modal"),
      title: doc.getElementById("peConfirmTitle"),
      message: doc.getElementById("peConfirmMessage"),
      primary: doc.getElementById("peConfirmPrimary"),
      secondary: doc.getElementById("peConfirmSecondary"),
      backdrop: doc.querySelector("#pe-confirm-modal .pe-confirm-backdrop"),
      dialog: doc.querySelector("#pe-confirm-modal .pe-confirm-dialog"),
    };
  },

  isOpen() {
    const { modal } = this._els();
    return !!(modal && !modal.classList.contains("hidden"));
  },

  _trapFocus(e, container) {
    if (!container) return;
    const focusable = [...container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((el) => !el.closest(".hidden") && (el.offsetParent !== null || el === document.activeElement));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  _finish(result) {
    const { modal } = this._els();
    if (!this._open) return;
    this._open = false;
    const resolve = this._resolve;
    this._resolve = null;
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
    if (this._keydownHandler) {
      document.removeEventListener("keydown", this._keydownHandler);
      this._keydownHandler = null;
    }
    const ret = this._returnFocus;
    this._returnFocus = null;
    if (typeof resolve === "function") resolve(!!result);
    if (ret && typeof ret.focus === "function") {
      try {
        ret.focus();
      } catch (_) {}
    }
  },

  /**
   * @param {{ title?: string, message: string, confirmLabel?: string, cancelLabel?: string }} options
   * @returns {Promise<boolean>}
   */
  show(options) {
    options = options || {};
    const message = String(options.message || "").trim();
    if (!message) return Promise.resolve(false);
    if (this._open) return Promise.resolve(false);

    const { modal, title, message: msgEl, primary, secondary, backdrop, dialog } = this._els();
    if (!modal || !msgEl || !primary || !secondary) return Promise.resolve(false);

    if (!modal.dataset.peBound) {
      modal.dataset.peBound = "1";
      primary.addEventListener("click", () => this._finish(true));
      secondary.addEventListener("click", () => this._finish(false));
      if (backdrop) backdrop.addEventListener("click", () => this._finish(false));
    }

    if (title) title.textContent = String(options.title || "Confirm");
    msgEl.textContent = message;
    primary.textContent = String(options.confirmLabel || "Continue");
    secondary.textContent = String(options.cancelLabel || "Cancel");

    this._returnFocus = document.activeElement;
    this._open = true;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    this._keydownHandler = (e) => {
      if (!this._open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this._finish(false);
        return;
      }
      if (e.key === "Tab") this._trapFocus(e, dialog);
    };
    document.addEventListener("keydown", this._keydownHandler);

    return new Promise((resolve) => {
      this._resolve = resolve;
      try {
        primary.focus();
      } catch (_) {}
    });
  },
};
