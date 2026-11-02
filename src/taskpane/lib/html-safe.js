/* Allow-list HTML sanitizer for markup restored from document settings (which a shared file can forge). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.HtmlSafe = {
  TAGS: ["details", "summary", "p", "h3", "h4", "ul", "ol", "li", "strong", "em", "span", "div", "br", "code"],
  ATTRS: ["class", "title", "open", "aria-hidden"],
  MAX_CHARS: 200000,

  safeStyle(value) {
    const v = String(value || "");
    if (v.length > 80) return "";
    return /^(?:\s*(?:width|height)\s*:\s*\d{1,3}(?:\.\d+)?(?:px|%)\s*;?)+\s*$/.test(v) ? v : "";
  },

  sanitize(html) {
    const src = String(html == null ? "" : html);
    if (!src || src.length > this.MAX_CHARS) return "";
    let doc;
    try {
      doc = new DOMParser().parseFromString(`<body>${src}</body>`, "text/html");
    } catch (_) {
      return "";
    }
    const self = this;
    const clean = (parent) => {
      Array.from(parent.childNodes).forEach((node) => {
        if (node.nodeType === 3) return;
        if (node.nodeType !== 1) {
          parent.removeChild(node);
          return;
        }
        const tag = node.tagName.toLowerCase();
        if (!self.TAGS.includes(tag)) {
          parent.removeChild(node);
          return;
        }
        Array.from(node.attributes).forEach((a) => {
          const name = a.name.toLowerCase();
          if (name === "style") {
            const ok = self.safeStyle(a.value);
            if (ok) node.setAttribute("style", ok);
            else node.removeAttribute(a.name);
            return;
          }
          if (!self.ATTRS.includes(name)) node.removeAttribute(a.name);
        });
        clean(node);
      });
    };
    clean(doc.body);
    return doc.body.innerHTML;
  },

  num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback == null ? 0 : fallback;
  },

  token(v, allowed, fallback) {
    const s = String(v == null ? "" : v);
    return allowed.includes(s) ? s : fallback;
  },
};
