# ProzaEdit Word — UX rating and recommendations

**Build reviewed:** 2.0.0.15 hosted task pane (7-tab IA, simple mode, sticky workflow toolbar).  
**Date:** 2026-10-31 · **UX-4 measurement:** 2026-10-31

---

## Overall score: **7 / 10** → **7.5 (UX-1)** → **~8.5 shipped (UX-1–UX-3)**

| Milestone | Score | Evidence |
|-----------|-------|----------|
| Baseline (pre–UX pack) | **7.0** | Sound Target → Checks → Audit → Fix loop; dense text UI; seven tabs |
| After UX-1 | **7.5** | `pe-icons.js` + toolbar/card icon+label rows; Simple → Critical default; workflow strip `.pe-workflow-step.active`; `sendIssueToRewrite()`; `getManuscriptTypeAwareHint()` in summary/empty |
| After UX-2 | **~8.0** | Help/Target doc links verified; Checks active-checks hint; STYLE-GUIDE reference doc |
| After UX-3 (current) | **~8.5** | `NATIVE_TITLE_REGISTRY` + deduped tips; Mute/Dismiss icons; no SR regression on primary actions (text + `aria-label` retained) |

**Why not 9.0 yet:** No structured beta cohort feedback on mis-clicks, time-to-first-fix, or Simple-mode comprehension; tab count and fiction/citation gating unchanged by design; pane width still limits layout. Closing the gap is **measurement + small polish**, not new IA.

Implementation log: [prozaedit-ux-9-implementation-plan.md](./prozaedit-ux-9-implementation-plan.md). Release snippet: [RELEASE-NOTES-2.0.0.15.md](./RELEASE-NOTES-2.0.0.15.md#ux-pack-refresh-ux-1--ux-3-no-manifest-bump).

ProzaEdit fits the Word task-pane constraint well: local-first audits, sticky Undo/Run audit, and confirm-before-apply trust paths. Simple mode hides power features without forking the product.

---

## What works

- **Workflow stepper** (Target → Checks → Run audit → Fix cards) orients new users; active step matches primary Run audit accent (UX-1).
- **Audit cards** — icon+label primaries (Go to, Apply, Rewrite) and icon+label secondaries (Mute, Dismiss) (UX-1, UX-3).
- **Confirm-before-apply** and continuity guard reduce accidental document damage.
- **Help tab** + UX-2 doc hygiene; session status line gives lightweight feedback.
- **Tooltip model** — one long-copy source; short native titles when hover tips are off (UX-3).

---

## Path to **9.0** (post–UX-4)

**Required:** Collect **beta feedback** on the UX pack (see questions below). Adjust only where data shows friction.

**Optional minor polish** (each ≤ small effort, no manifest):

| Item | Rationale |
|------|-----------|
| Chip/filter affordance | If users miss Critical default, add one-line Audit header when Simple is on |
| Card vertical rhythm | +2px gap between primary and secondary rows if beta reports mis-taps (CSS only) |
| Run audit icon | Unify emoji vs SVG on Run audit if testers want visual consistency |
| Fiction gating callout | Single Checks `<details>` line if academic users skip eligibility copy |
| Shaper slider persistence | P2 — only if beta asks to keep shaper values across sessions |

**Beta feedback prompts (UX-4):**

1. After enabling **Simple mode**, did you notice Audit defaulting to **Critical**? Was that helpful?
2. Can you find **Go to**, **Apply**, **Rewrite**, **Mute**, and **Dismiss** on a card without reading every word?
3. With **Show hover tips** off, are native browser titles enough on toolbar actions?
4. Any accidental clicks on Mute/Dismiss after UX-3 icons?
5. Time from opening the pane to first successful **Apply fix** vs before update (subjective OK).

**What NOT to do** (unchanged): no tab merge, no dark-mode swap, no auto-apply, no hiding Checks gating.

---

## Shipped UX pack (ranks 1–7)

| Rank | Initiative | Status |
|------|------------|--------|
| 1 | Icon toolbar pass (Fluent 16px) | **Shipped** (UX-1) |
| 2 | Simple mode → Critical filter | **Shipped** (UX-1) |
| 3 | Workflow strip polish | **Shipped** (UX-1) |
| 4 | Rewrite one-click (audit cards) | **Shipped** (UX-1) |
| 5 | Onboarding / session tips | **Done** (2.0.0.15) |
| 6 | Type-aware empty states | **Shipped** (UX-1) |
| 7 | Reduce duplicate labels + Mute/Dismiss icons | **Shipped** (UX-3) |

---

## Icon reference (shipped)

16px inline SVG via `lib/pe-icons.js` (Fluent-style stroke). High-traffic mapping:

| Action | Status |
|--------|--------|
| Run audit, Undo, Redo, Last edit (toolbar) | Shipped |
| Go to, Apply, Rewrite (card primary) | Shipped |
| Mute, Dismiss (card secondary) | Shipped (UX-3) |
| Tab labels (text only) | Intentionally unchanged |

---

## Out of scope (safe to defer)

- Full Citations / Narrative tabs from the vNext spec (engines not in current `lib/` bundle).
- Replacing all tab text with icons (hurts accessibility and discoverability in a legal/academic audience).
- Custom Office ribbon buttons (manifest cost + re-upload friction).

---

## Summary

ProzaEdit is **polished and trustworthy** for its core loop at **~8.5/10** after the UX-1–UX-3 pack. For **whole shipped product** (reliability, security, beta feature scope—not UX alone), use the audit headline **8.5/10** in [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md). **9.0** depends on beta validation and optional micro-polish—not new tabs or manifest churn.
