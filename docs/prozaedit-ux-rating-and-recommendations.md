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
| Rewrite (card) | Pencil / paraphrase | **Shipped** (audit primary row) |
| Mute / Dismiss | Bell-off / eye-off | Low (secondary row) |

**Label clutter:** Prefer icon + 1–2 word labels on the sticky toolbar; keep full sentences in Help or tooltips only.

**Workflow strip:** Slightly increase contrast on the active workflow step and tie its color to the primary Run audit button so “step 3” feels like the main CTA moment.

---

## Shipped in this pass (optional icons)

- Sticky toolbar **Last edit** — map-pin SVG + short label; navigates via `WordSafeNavigator` to the last successful Apply/replace snippet tracked in `edit-history.js`.
- Audit card **Rewrite** — selects finding text in Word, opens Rewrite tab, clears stale preview; user runs Local paraphrase and applies manually (0 tokens).

---

## Path to 9.0

Goal: raise perceived polish and speed **without** collapsing the 7-tab IA or shipping a dark-mode rewrite. Each item is incremental; ship one at a time and measure confusion (support questions, mis-clicks) before the next.

| Rank | Initiative | Impact | Risk | Effort | Notes |
|------|------------|--------|------|--------|-------|
| 1 | **Icon toolbar pass (Fluent 16px)** | High — sticky strip + card Go to/Apply read faster | Low–medium — must keep text labels + `aria-label` | Medium | Inline SVG on Run audit, Undo/Redo, Go to/Apply on cards; match Office stroke weight |
| 2 | **Simple mode defaults (Critical filter)** | High — shorter Audit lists for casual users | Low — reversible via chip | Small | On `pe-simple-mode`, default audit chip to Critical; power users tap All |
| 3 | **Workflow strip polish** | Medium — clearer “Run audit” moment | Low | Small | Stronger active-step contrast; align accent with primary Run audit button |
| 4 | **Rewrite one-click (audit cards)** | Medium — bridges Fix → paraphrase without Gemini | Low — no auto-apply | **Shipped** | `sendIssueToRewrite()` + Help line; shaper stays hidden in Simple mode |
| 5 | **Onboarding / session tips** | Medium — first-run orientation | Low | **Done** | Dismissible session tips + Help Quick start (2.0.0.15) |
| 6 | **Type-aware empty states** | Medium — Academic/non-fiction feels intentional | Low | Small | Summary copy when fiction modules disabled; Audit empty nudge by manuscript type |
| 7 | **Reduce duplicate labels** | Low–medium — less vertical scroll | Low | Small | One canonical string per action in tooltips; shorten sticky toolbar where icon exists |

### What NOT to do (keeps risk bounded)

- **Do not** merge tabs 7 → 4 without a major version and retraining — authors rely on muscle memory for Target / Checks / Audit.
- **Do not** ship **dark mode** as a big-bang theme swap — Office host chrome stays light; a half-themed pane reads broken.
- **Do not** auto-apply rewrites or audit fixes to “save clicks” — confirm paths are the trust anchor.
- **Do not** hide Checks fiction/citation gating behind a single “Advanced” tab — eligibility must stay visible where scans run.

**How 7 → 9 is achievable:** Keep the same mental model (Target → Checks → Audit → Fix). Layer **scannability** (icons), **defaults** (Simple + Critical), **bridges** (Rewrite card), and **copy** (empty states). Reserve manifest/version bumps for ribbon or permission changes only.

---

## Out of scope (safe to defer)

- Full Citations / Narrative tabs from the vNext spec (engines not in current `lib/` bundle).
- Replacing all tab text with icons (hurts accessibility and discoverability in a legal/academic audience).
- Custom Office ribbon buttons (manifest cost + re-upload friction).

---

## Summary

ProzaEdit is **usable and trustworthy** for its core loop; the next UX wins are **disclosure**, **icon consistency on the toolbar**, and **type-aware messaging**—not more tabs.
