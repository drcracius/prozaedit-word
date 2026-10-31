/* Centralized hover tips (data-pe-tip keys). Event delegation supports dynamic audit cards. */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const TOOLTIP_REGISTRY = {
    "btn-run-audit":
      "Runs local checks on the current scope. Reads text only — does not change your manuscript until you Apply a fix.",
    "btn-undo": "Undo the last replacement made by ProzaEdit (isolated stack, up to 40 steps). Ctrl+Shift+Z",
    "btn-redo": "Redo the last undone ProzaEdit replacement. Ctrl+Shift+Y",
    "sel-manuscript-scope":
      "Which text ProzaEdit reads for audit. Full manuscript is capped (see scope preview). Selection uses the Word highlight.",
    "chk-repetition":
      "Flags pleonasms and repeated word pairs in the scoped text. Use Mute if a deliberate repetition is intentional.",
    "btn-card-goto": "Select the first body match for this finding in Word (sanitized search, first hit).",
    "btn-card-apply":
      "Replace the first document match with the suggested text. Respects Confirm before Apply and continuity warnings on Target.",
    "slider-complexity":
      "Lower = extra tightening pass; higher = formal register stack. Neutral (3) adds nothing beyond your paraphrase mode.",
    "slider-intensity":
      "Lower = lighter creative trim; higher = academic hedge trim. Uses local rewrite passes only (not vivid-verb map yet).",
    "slider-density":
      "Lower = prune decorative intensifiers; higher = leave modifiers. Neutral (3) skips extra pruning.",
    "btn-scan-chronology":
      "Walks scoped paragraphs for temporal anchors (later that night, flashback phrases, years). Findings merge into Audit when present.",
    "sel-chronology-depth":
      "Macro: chapter headings only. Meso: scene breaks + time phrases. Micro: every anchor in each paragraph.",
  };

  let enabled = false;
  let activeBubble = null;
  let hoverEl = null;
  let delegationBound = false;

  function hideTooltip() {
    if (activeBubble && activeBubble.parentNode) {
      activeBubble.parentNode.removeChild(activeBubble);
    }
    activeBubble = null;
  }

  function showFor(el) {
    const key = el.getAttribute("data-pe-tip");
    const text = TOOLTIP_REGISTRY[key];
    if (!text) return;

    hideTooltip();

    const bubble = document.createElement("div");
    bubble.className = "pe-tooltip-bubble";
    bubble.setAttribute("role", "tooltip");
    bubble.id = "pe-active-tooltip";
    bubble.textContent = text;
    document.body.appendChild(bubble);

    const rect = el.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    let top = rect.top - bubbleRect.height - 8;
    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;

    if (top < 4) top = rect.bottom + 8;
    if (left < 6) left = 6;
    if (left + bubbleRect.width > window.innerWidth - 6) {
      left = window.innerWidth - bubbleRect.width - 6;
    }

    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
    bubble.classList.add("pe-tooltip-visible");

    const tipId = bubble.id;
    if (!el.getAttribute("aria-describedby")) {
      el.setAttribute("data-pe-tip-described", "1");
      el.setAttribute("aria-describedby", tipId);
    }

    activeBubble = bubble;
  }

  function syncNativeTitles() {
    document.querySelectorAll("[data-pe-tip]").forEach((el) => {
      if (enabled) {
        if (el.hasAttribute("title") && !el.hasAttribute("data-pe-native-title")) {
          el.setAttribute("data-pe-native-title", el.getAttribute("title"));
        }
        el.removeAttribute("title");
      } else {
        const native = el.getAttribute("data-pe-native-title");
        if (native != null) el.setAttribute("title", native);
        if (el.getAttribute("data-pe-tip-described") === "1") {
          el.removeAttribute("aria-describedby");
          el.removeAttribute("data-pe-tip-described");
        }
      }
    });
    if (!enabled) hideTooltip();
  }

  function onPointerOver(e) {
    if (!enabled) return;
    const el = e.target.closest("[data-pe-tip]");
    if (!el) return;
    if (hoverEl === el) return;
    hoverEl = el;
    showFor(el);
  }

  function onPointerOut(e) {
    if (!enabled) return;
    const el = e.target.closest("[data-pe-tip]");
    if (!el) return;
    const rel = e.relatedTarget;
    if (rel && el.contains(rel)) return;
    if (hoverEl === el) hoverEl = null;
    hideTooltip();
  }

  function onFocusIn(e) {
    if (!enabled) return;
    const el = e.target.closest("[data-pe-tip]");
    if (el) showFor(el);
  }

  function onFocusOut(e) {
    if (!enabled) return;
    hideTooltip();
    hoverEl = null;
  }

  function ensureDelegation() {
    if (delegationBound) return;
    delegationBound = true;
    document.body.addEventListener("pointerover", onPointerOver);
    document.body.addEventListener("pointerout", onPointerOut);
    document.body.addEventListener("focusin", onFocusIn);
    document.body.addEventListener("focusout", onFocusOut);
  }

  function initTooltips(on) {
    enabled = !!on;
    hoverEl = null;
    hideTooltip();
    ensureDelegation();
    syncNativeTitles();
  }

  function refreshTooltips(on) {
    if (typeof on === "boolean") enabled = !!on;
    syncNativeTitles();
  }

  root.TooltipRegistry = {
    TOOLTIP_REGISTRY,
    initTooltips,
    refreshTooltips,
  };
})(typeof window !== "undefined" ? window : globalThis);
