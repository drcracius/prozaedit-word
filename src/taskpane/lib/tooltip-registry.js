/* Centralized hover tips (data-pe-tip keys). Event delegation supports dynamic audit cards. */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  /** Long copy for custom hover tips (data-pe-tip keys). */
  const TOOLTIP_REGISTRY = {
    "btn-run-audit":
      "Runs local checks on the current scope. Reads text only — does not change your manuscript until you Apply a fix.",
    "btn-undo": "Undo the last replacement made by ProzaEdit (isolated stack, up to 40 steps). Ctrl+Shift+Z",
    "btn-redo": "Redo the last undone ProzaEdit replacement. Ctrl+Shift+Y",
    "btn-go-last-edit":
      "Jump to the last successful Apply or replace in Word (tracked on this PC). Disabled until you apply at least one fix.",
    "btn-settings":
      "Open Settings: safety toggles, dictionary, citation tools, AI provider and token limits, and custom-style bulk import. Target keeps daily profile, scope, and style guide.",
    "sel-manuscript-scope":
      "Which text ProzaEdit reads for audit. Full manuscript is capped (see scope preview). Selection uses the Word highlight.",
    "chk-repetition":
      "Flags pleonasms and repeated word pairs in the scoped text. Use Mute if a deliberate repetition is intentional.",
    "btn-card-goto": "Select the first body match for this finding in Word (sanitized search, first hit).",
    "btn-card-apply":
      "Replace the first document match with the suggested text. Respects Confirm before Apply and continuity warnings in Settings.",
    "btn-card-rewrite":
      "Select this finding in Word, open Rewrite, and preview a local paraphrase. You still choose Apply preview — nothing auto-writes.",
    "btn-card-mute":
      "Hide this rule id on future audits on this PC. The finding may still appear under a different wording.",
    "btn-card-dismiss":
      "Mute the rule and silence this exact wording on future audits. Stored in browser storage on this PC.",
    "slider-complexity":
      "Lower = extra tightening pass; higher = formal register stack. Neutral (3) adds nothing beyond your paraphrase mode.",
    "slider-intensity":
      "Lower = lighter creative trim; higher = academic hedge trim. Uses local rewrite passes only (no AI).",
    "slider-density":
      "Lower = prune decorative intensifiers; higher = leave modifiers. Neutral (3) skips extra pruning.",
    "btn-scan-chronology":
      "Walks scoped paragraphs for temporal anchors (later that night, flashback phrases, years). Findings merge into Audit when present.",
    "sel-chronology-depth":
      "Macro: chapter headings only. Meso: scene breaks + time phrases. Micro: every anchor in each paragraph.",
    "btn-scan-citations":
      "Scans scoped body text for citation pattern issues (APA, CMOS, Bluebook-lite). Findings merge into Audit cards when present.",
    "btn-verify-citations":
      "Same as Checks → Verify citations. Requires opt-in on Checks. Pattern assist only — not stylebook certification.",
    "sel-citation-style":
      "Which heuristic pack leads the scan. Auto picks APA for academic, Bluebook-lite for business, CMOS-ish for technical/journalism.",
    "btn-session-tips-got-it":
      "Hide these session tips until you open ProzaEdit again in a new browser session. Help tab has the full Quick start guide.",
  };

  /** Short native `title` when hover tips are off (no duplicate long strings in HTML). */
  const NATIVE_TITLE_REGISTRY = {
    "btn-run-audit": "Run audit with current checks and scope",
    "btn-undo": "Undo last ProzaEdit replace (Ctrl+Shift+Z)",
    "btn-redo": "Redo (Ctrl+Shift+Y)",
    "btn-go-last-edit": "Jump to last applied edit",
    "btn-settings": "Open Settings dialog",
    "sel-manuscript-scope": "Which text is read for audit",
    "btn-card-goto": "Select first match in Word",
    "btn-card-apply": "Replace first document match",
    "btn-card-rewrite": "Open Rewrite for this finding",
    "btn-card-mute": "Mute this rule on this PC",
    "btn-card-dismiss": "Dismiss this wording on this PC",
  };

  function nativeTitleFor(el) {
    const stored = el.getAttribute("data-pe-native-title");
    if (stored != null) return stored;
    const key = el.getAttribute("data-pe-tip");
    if (key && NATIVE_TITLE_REGISTRY[key]) return NATIVE_TITLE_REGISTRY[key];
    return null;
  }

  let enabled = false;
  let activeBubble = null;
  let hoverEl = null;
  let delegationBound = false;

  function hideTooltip() {
    if (activeBubble && activeBubble.parentNode) {
      activeBubble.parentNode.removeChild(activeBubble);
    }
    activeBubble = null;
    document.querySelectorAll("[data-pe-tip-described]").forEach((el) => {
      el.removeAttribute("aria-describedby");
      el.removeAttribute("data-pe-tip-described");
    });
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && activeBubble) hideTooltip();
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
        const native = nativeTitleFor(el);
        if (native != null) el.setAttribute("title", native);
        else el.removeAttribute("title");
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
    document.addEventListener("keydown", onKeyDown);
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
    NATIVE_TITLE_REGISTRY,
    initTooltips,
    refreshTooltips,
  };
})(typeof window !== "undefined" ? window : globalThis);
