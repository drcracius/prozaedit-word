/* Fluent-style 16px inline SVG icons (single stroke weight, no external fonts). */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const PATHS = {
    undo:
      '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo:
      '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    flash: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    locate:
      '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M4.9 19.1l2.1-2.1M16.9 7.1l2.1-2.1"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    edit:
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    pin:
      '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>',
  };

  root.PeIcons = {
    svg(name) {
      const inner = PATHS[name];
      if (!inner) return "";
      return (
        `<svg class="pe-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
      );
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
