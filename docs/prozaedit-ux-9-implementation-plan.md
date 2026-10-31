# ProzaEdit Word — UX path to 9.0 (implementation plan)

**Baseline:** hosted build **2.0.0.15** · **7-tab IA** preserved · **Simple mode** retained  
**Rating doc:** [prozaedit-ux-rating-and-recommendations.md](./prozaedit-ux-rating-and-recommendations.md)  
**Audit date:** 2026-10-31  
**Goal:** Raise perceived polish from **7 → 9** without tab merges, dark mode, or trust-breaking auto-apply.

---

## Executive summary

ProzaEdit’s core loop (Target → Checks → Audit → Fix) is sound. The path to **9.0** is incremental **scannability** (Fluent 16px icons + labels), **smarter defaults** (Simple mode → Critical audit filter), **workflow emphasis** (Run audit step aligned with primary CTA), **Fix → Rewrite bridge** on audit cards, and **type-aware copy** for non-fiction profiles. Manifest bumps stay reserved for ribbon/permission changes only.

**Phase UX-1** (safe pack) ships items ranked **1–3** plus **4** (Rewrite card wiring) and **6** (summary/empty type hints). **UX-3** closes **#7** (label dedupe + Mute/Dismiss icons).

**Score trajectory:** 7.0 baseline → **7.5 after UX-1** → **~8.5 after UX-3** (canonical tooltips, secondary-row icons).

---

## Recommendation audit

### Pass 1 — Internal consistency

| Check | Finding | Resolution |
|-------|---------|------------|
| Rank order vs effort | Rank 4 marked “Shipped” in rating doc but `sendIssueToRewrite` was missing in `main` | Treat as **UX-1 deliverable**; doc “shipped” = intent, code landed in UX-1 |
| Impact / risk | Icon-only tabs flagged as out of scope; toolbar/card icons low–medium risk if labels + `aria-label` kept | UX-1 keeps **icon + short text** on toolbar and cards; tabs stay text-only |
| Dependencies | #2 (Critical default) should not fight persisted `auditCardFilter` | Default Critical on **Simple on** and on load when no saved filter; respect saved `all`/`style`/etc. |
| #7 vs #1 | Label dedupe overlaps icon pass | Defer **#7** to UX-3; UX-1 only shortens “Apply fix” → “Apply” on cards |
| Onboarding (#5) | Already Done in 2.0.0.15 | No phase work |

**Adjusted phase map:** UX-1 = ranks **1, 2, 3, 4, 6** (core safe pack). UX-2 = Help/P1 hygiene from deep audit + active-checks polish. UX-3 = label dedupe (#7) + optional secondary-row icons (Mute/Dismiss).

### Pass 2 — External alignment

| Source | Constraint | Plan compliance |
|--------|------------|-----------------|
| [prozaedit-features.md](./prozaedit-features.md) | 7 tabs + sticky toolbar + workflow strip | No tab merge; icons on toolbar/cards only |
| Simple mode | Hides Thesaurus, Gemini blocks, shaper | Rewrite card OK; shaper still hidden |
| [source-of-truth.md](/cursor/stores/self/docs/source-of-truth.md) | Manifest discipline | **No manifest bump** for UX-1–3 unless ribbon changes |
| vNext spec | No Citations/Narrative tab merge | Out of scope |
| Deep audit P1 | Help links, STYLE-GUIDE ref | Scheduled **UX-2** (docs/help), not UX-1 |
| Office.js pane width | ~320px typical | Single-column chips/cards; inline SVG 16px |

### Pass 3 — Execution readiness

| Topic | Decision |
|-------|----------|
| **Pane width** | Toolbar wraps; icon+label buttons use `btn-tool-icon` / `btn-with-icon` flex |
| **A11y** | Decorative SVG `aria-hidden="true"`; actionable controls keep visible text + `aria-label` where helpful |
| **Manifest policy** | UI/CSS/JS-only phases: **no** `<Version>` change; `PROZAEDIT_BUILD_VERSION` unchanged until manifest bump |
| **Per-phase scope** | One phase = one user-visible “pack”; smoke test checklist per phase |
| **Overwhelm guard** | UX-1 avoids Coach card icon, Mute/Dismiss icons, tab icons, dark mode |

**Conflicts resolved:** Rating doc “Rewrite shipped” reconciled with code in UX-1; Simple + Critical default respects explicit All choice in saved CONFIG.

---

## Phases

### Phase UX-1 — Safe pack (icons, defaults, strip, rewrite, copy)

**Goals:** Faster scan of sticky toolbar and card primary actions; Simple users see Critical-first audit lists; Run audit step visually matches primary button; non-fiction audits feel intentional.

**Deliverables:**

- `lib/pe-icons.js` — Fluent-style 16px stroke SVGs
- Sticky toolbar: Undo, Redo, Last edit, Run audit — icon + label; `aria-label` on accent actions
- Audit card primary row: Go to, Apply, Rewrite — icon + label
- Simple mode: Critical filter when enabling Simple or on load without saved filter; clear audit respects Simple
- Workflow strip: `.pe-workflow-step.active` / step 3 emphasis tied to `--primary`
- `getManuscriptTypeAwareHint()` in audit summary + empty state for non-fiction types
- Help line for audit-card Rewrite
- `sendIssueToRewrite()` — select in Word, open Rewrite, clear preview

**Acceptance criteria:**

- [ ] Toolbar buttons show 16px SVG + text; tabs unchanged (text only)
- [ ] Card Go to / Apply / Rewrite show icons; secondary row unchanged
- [ ] Enable Simple → Critical chip active; user can switch to All and it persists
- [ ] Re-audit and clear audit preserve expected filter (Simple clear → Critical)
- [ ] Academic/Business/Technical/Memoir summary includes non-fiction one-liner
- [ ] No change to `manifest.hosted.xml` `<Version>`

**Risks:** Mis-clicks on smaller targets — mitigated by keeping text labels.

**Smoke test:**

1. Open pane → workflow step 1 highlighted (primary fill).
2. Toggle Simple on Target → Audit chip Critical; run audit → cards filtered.
3. Switch chip to All → reload pane → still All.
4. Card Rewrite → selection in Word, Rewrite tab, empty preview message.
5. Non-fiction type → run audit → summary type hint visible.

**Manifest policy:** None (GitHub Pages refresh only).

**Status:** Complete — see tracker below.

---

### Phase UX-2 — Trust & discoverability hygiene

**Goals:** Close deep-audit **P1** doc gaps; reinforce Checks → Audit handoff without new features.

**Deliverables:**

- Help tab: WORKFLOWS + THIRD-PARTY links (if any still missing in tab7 body)
- Target STYLE-GUIDE reference → valid doc or GitHub link
- Bump stale **2.0.0.14** strings in WORKFLOWS / THIRD-PARTY headers
- Optional: `.pe-citation-block[disabled-section]` CSS parity

**Acceptance criteria:**

- [ ] No broken in-app doc references on Target/Help
- [ ] Features doc and Help tab consistent

**Risks:** Low — documentation only.

**Smoke test:** Click every Help/Target doc link from task pane.

**Manifest policy:** None.

**Status:** Not started.

---

### Phase UX-3 — Label efficiency & secondary icons

**Goals:** Rank **#7** — reduce vertical scroll; optional low-priority card icons (Mute/Dismiss).

**Deliverables:**

- Canonical tooltip strings; shorten redundant button titles
- Optional bell-off / eye-off on secondary card actions (with labels)
- Consider persisting shaper sliders (P2) only if user-facing request

**Acceptance criteria:**

- [x] Sticky toolbar no longer duplicates long tooltip text in `title` and `data-pe-tip`
- [x] No regression in screen-reader labels

**Risks:** Discoverability loss if labels over-shortened — keep ≥1 word on primary actions.

**Smoke test:** Hover tips off/on; keyboard focus on card buttons.

**Manifest policy:** None.

**Status:** Complete — see tracker below.

---

### Phase UX-4 — Measure & tune (optional)

**Goals:** Validate 7.5 → 8+ with beta feedback; minor contrast/spacing tweaks.

**Deliverables:** Release note snippet; update UX rating doc score with evidence.

**Status:** Not started.

---

## Phase tracker

| Phase | Scope | Manifest bump | Status | Commit |
|-------|--------|---------------|--------|--------|
| UX-1 | Icons, Simple→Critical, workflow strip, Rewrite card, type copy | No | **Complete** | `0402b52` |
| UX-2 | Help/doc P1 fixes, active-checks hint | No | **Complete** | `7362740` |
| UX-3 | Label dedupe, secondary icons | No | **Complete** | _(pending push)_ |
| UX-4 | Feedback / score update | No | Optional | — |

---

## Links

- [UX rating & Path to 9.0](./prozaedit-ux-rating-and-recommendations.md)
- [Deep audit report](./prozaedit-deep-audit-report.md)
- [Feature reference](./prozaedit-features.md)
