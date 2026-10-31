# ProzaEdit Word — UX rating and recommendations

**Build reviewed:** 2.0.0.15 hosted task pane (7-tab IA, simple mode, sticky workflow toolbar).  
**Date:** 2026-10-31

---

## Overall score: **7 / 10**

ProzaEdit fits the Word task-pane constraint well: a clear Target → Checks → Audit → Fix loop, local-first audits (no API required), and a sticky action strip (Undo, Run audit) that stays visible while scrolling. Simple mode hides power features without forking the product. Tooltips via `data-pe-tip` help dense Controls copy without permanent clutter.

Points held back: seven top-level tabs still compete for attention; many controls use long text labels instead of scannable icons; fiction vs academic gating is easy to misunderstand until users read Checks; and Word’s narrow pane limits multi-column layouts. None of these are fatal—they are typical Office add-in tradeoffs.

---

## What works

- **Workflow stepper** (Target → Checks → Run audit → Fix cards) orients new users.
- **Audit cards** separate primary actions (Go to, Apply) from secondary (Mute, Dismiss, Dict).
- **Confirm-before-apply** and continuity guard reduce accidental document damage.
- **Help tab** consolidates install/update paths; session status line gives lightweight feedback.

---

## Improve without overwhelming users

1. **Progressive disclosure** — Keep Target + Audit as defaults; tuck batch section loop, deep Gemini audit, and custom style editor one level deeper (already partly done with `<details>` on Checks).
2. **Manuscript-type clarity** — One line on Target (shipped) plus active-checks hint on Checks so users see what will actually run.
3. **Filter chips on Audit** — Promote “Critical only” as a first-class chip for long reports (already present; consider defaulting to Critical for simple mode).
4. **Empty states** — When Academic runs with all fiction modules off, celebrate “non-fiction profile” in summary copy instead of silent omission.

---

## Icon strategy (recommendations only)

Use **16px**, single-weight stroke icons, inline SVG (no external font dependencies in the iframe):

| Source | License / fit |
|--------|----------------|
| [Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons) | Microsoft OSS; matches Office |
| [Tabler Icons](https://tabler.io/icons) | MIT; clean ribbon-like strokes |
| [Phosphor](https://phosphoricons.com/) | MIT; consistent weights |

**Map icons to high-traffic actions:**

| Action | Suggested icon metaphor | Priority |
|--------|-------------------------|----------|
| Run audit | Lightning / play | Already emoji on button; could unify to SVG |
| Go to (card) | Crosshair / locate | High |
| Apply fix | Checkmark / replace | High |
| Undo / Redo | Curved arrows | Medium (text labels OK today) |
| Go to last edit | Map pin | **Shipped** (toolbar) |
| Mute / Dismiss | Bell-off / eye-off | Low (secondary row) |

**Label clutter:** Prefer icon + 1–2 word labels on the sticky toolbar; keep full sentences in Help or tooltips only.

**Workflow strip:** Slightly increase contrast on the active workflow step and tie its color to the primary Run audit button so “step 3” feels like the main CTA moment.

---

## Shipped in this pass (optional icons)

- Sticky toolbar **Last edit** — map-pin SVG + short label; navigates via `WordSafeNavigator` to the last successful Apply/replace snippet tracked in `edit-history.js`.

---

## Out of scope (safe to defer)

- Full Citations / Narrative tabs from the vNext spec (engines not in current `lib/` bundle).
- Replacing all tab text with icons (hurts accessibility and discoverability in a legal/academic audience).
- Custom Office ribbon buttons (manifest cost + re-upload friction).

---

## Summary

ProzaEdit is **usable and trustworthy** for its core loop; the next UX wins are **disclosure**, **icon consistency on the toolbar**, and **type-aware messaging**—not more tabs.
