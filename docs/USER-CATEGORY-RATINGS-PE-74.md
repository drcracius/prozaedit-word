# Beta user category scorecard (PE-74)

**Date:** 2026-11-01 · **Build:** 2.0.0.15 post–PE-72 (`00b2ecd`) + PE-74 trust pass  
**Method:** Maps PE-69 complaint clusters to author-facing scores. **Not** measured on a real Word host until PE-47.

---

## Headline

| Metric | Value |
|--------|------:|
| **Simple average (12 categories)** | **8.29** |
| **Weighted index (below)** | **~8.32** |
| **Conservative shipped band** | **8.5–8.7** (see [prozaedit-audit-rating-current.md](./prozaedit-audit-rating-current.md)) |
| **Judgment ceiling pre–PE-47** | **~8.9** — not claimed until real-host checklist |

Coordinator anchors used in this pass: **Trust 8.0**, **False positives 7.0**, **Privacy 8.0**, **Support open**.

---

## Twelve categories

| # | Category | Score | Cap | Improvement levers |
|---|----------|------:|-----|-------------------|
| 1 | **Start / overwhelm** | 8.8 | 9.2 | Simple mode + tab flow; optional 5-tab IA vNext |
| 2 | **Realtime fatigue** | 9.5 | 9.8 | Architecture (manual audit) — maintain explicit Run |
| 3 | **Performance / long docs** | 7.6 | 8.5 | PE-47 50k–100k runs; section/chapter scope; cancel/retry (PE-72) |
| 4 | **False positives / ignores** | **7.0** | 8.0 | Dictionary clarity (PE-74); cross-doc sync vNext; owner UX-4 |
| 5 | **List stability / focus** | 8.7 | 9.0 | PE-69/72 review helpers; Word go-to still host-dependent |
| 6 | **Trust / apply safety** | **8.0** | 8.8 | In-pane confirm (PE-74); continuity guard; undo stack |
| 7 | **Privacy / cloud** | **8.0** | 8.8 | PRIVACY-AND-DATA-PE.md + Help; Remember-key default off |
| 8 | **Upsell / licensing** | 9.2 | 9.5 | No ProzaEdit subscription; owner policy in SUPPORT doc |
| 9 | **Host parity (web/desktop)** | 6.8 | 8.5 | **PE-47** Word web + desktop spot; SUPPORT matrix |
| 10 | **Accessibility** | 7.8 | 8.8 | Tour/settings focus traps; owner SR/zoom checklist |
| 11 | **Onboarding / jargon** | 8.6 | 9.0 | Plain language layer; tour deferral; beta copy |
| 12 | **Support / compatibility** | **6.5** | 8.5 | **Open** — SUPPORT-AND-COMPATIBILITY-PE.md, GitHub issues, FULL-TEST |

**Caps** = realistic ceiling before PE-47 evidence or owner-published policy.

---

## Weighted index (complaint salience)

| Category | Weight | Score | Weighted |
|----------|-------:|------:|---------:|
| Performance / long docs | 14% | 7.6 | 1.06 |
| False positives | 12% | 7.0 | 0.84 |
| Trust / apply | 12% | 8.0 | 0.96 |
| Privacy | 10% | 8.0 | 0.80 |
| Host parity | 10% | 6.8 | 0.68 |
| List stability | 8% | 8.7 | 0.70 |
| Start / overwhelm | 8% | 8.8 | 0.70 |
| Support | 8% | 6.5 | 0.52 |
| Accessibility | 6% | 7.8 | 0.47 |
| Onboarding | 6% | 8.6 | 0.52 |
| Realtime (architecture) | 3% | 9.5 | 0.29 |
| Upsell | 3% | 9.2 | 0.28 |
| **Total** | **100%** | | **~8.32** |

---

## PE-74 deltas (agent)

- Replaced sandbox-risk **`confirm()`** with in-pane modal + unit tests.
- Published privacy/support one-pagers and Help collapsibles.
- Document-scoped **Dictionary / Mute / Dismiss** clarity in Help + status line.

---

## Next owner gates

1. **PE-47** — real Word web (+ desktop) FULL-TEST rows.  
2. **UX-4** — beta cohort on false-positive and trust prompts.  
3. Edit **SUPPORT-AND-COMPATIBILITY-PE.md** for refund/licensing if needed.
