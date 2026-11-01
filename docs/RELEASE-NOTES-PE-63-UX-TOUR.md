# PE-63 — UX tour and simplification (UI-only)

**Build:** 2.0.0.15 (no manifest bump) · **Host:** GitHub Pages task pane

## What changed

1. **Skippable 3-stop onboarding tour** — Choose scope (Target) → Run audit (Checks / toolbar) → Fix issues (Audit cards). **Next**, **Skip tour**, **Done**; completion stored in `PROZAEDIT_CONFIG.onboardingTourComplete`. Defers while Simple-mode or session-tips banners are visible; skips if session tips are off or the first-audit checklist was collapsed.
2. **Post-audit scope footnote** — On Audit, a short note after large or truncated runs reinforces **Selected chapters / Page range** and **Critical** filter for the next pass (same caps as `sys_trunc` / ScopeReader).
3. **Copy polish** — Help **Start here** bullets; Settings one-line intro; stronger workflow **Next step** hint before the first audit.

## CONFIG

| Key | Purpose |
|-----|---------|
| `onboardingTourComplete` | `true` after tour finished or skipped |
| `firstRunComplete` | Unchanged (PE-61 Simple first run) |

## Smoke (~2 min)

1. Fresh document (empty CONFIG) → dismiss or wait past banners → tour appears → walk 3 steps → **Done**.
2. Reopen pane → tour does not return.
3. Run full-manuscript audit on a long doc → footnote appears when truncation or large scope applies.

## Tests

`npm test` — includes `tests/onboarding-tour.test.mjs` and updated first-run tests.

## Related

- [RELEASE-NOTES-PE-61-ONBOARDING.md](./RELEASE-NOTES-PE-61-ONBOARDING.md)
- [FULL-APP-REVIEW-PE-62.md](./FULL-APP-REVIEW-PE-62.md)
