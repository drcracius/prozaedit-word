# ProzaEdit Word — design system (beta lock, PE-53)

**Status:** Locked for **Phase 1 web beta** (build **2.0.0.15**).  
**Owner decision (2026-10-31):** **System UI font stack** + **semantic color tokens** through beta; **Inter deferred** until after Phase 1 **GO**.

Canonical detail: [pe-ui-design-notes.md](./pe-ui-design-notes.md) · [TYPOGRAPHY-AND-FONTS.md](./TYPOGRAPHY-AND-FONTS.md)

---

## Fonts

| Decision | Rationale |
| --- | --- |
| **Ship: enhanced system UI stack** (`--pe-font-sans`) | No manifest `<AppDomains>` or version bump; native on Windows (Segoe UI Variable / Segoe UI); fast and offline-safe in Word web iframe |
| **Defer: Inter / Source Sans 3** | Requires Google Fonts domains, manifest re-upload, FOUT/slow-network retest; marginal gain once PE-52 scale (13px body, 11px tabs) is in place |

Typography tokens live in `taskpane.css` on `:root` and both `data-pe-theme` values. Do not scatter literal `font-size` in HTML for new UI.

---

## Color rules (complex UI)

The pane has **seven tabs**, dense **audit cards**, and a multi-group **Settings** modal. Color stays **semantic**, not decorative per tab.

| Role | Tokens | Use |
| --- | --- | --- |
| **Primary / actions** | `--pe-primary-indigo`, `--primary`, `--pe-focus-ring` | Run audit, primary buttons, links, focus rings, Settings emphasis |
| **Workflow / OK** | `--pe-success`, `--pe-success-bg` | Active workflow step, tab underline for **current** tab, success copy — **not** a second brand hue per feature area |
| **Caution** | `--pe-warning`, `--pe-warning-bg` | Scope warnings, audit overview caution — not severity |
| **Informational** | `--pe-info`, `--pe-info-bg` | Secondary hovers, low-priority hints |
| **Severity (traffic only)** | `--red` / `--red-bg`, `--orange` (+ style variants) | Audit finding chips and cards **only** — never for navigation, tabs, or Settings groups |
| **Banners & help** | `--pe-banner-tint-*`, `--pe-help-box-bg` | Simple-mode banner, long-op warnings, onboarding/help boxes — tinted surfaces + left accent, not raw `#e0f2fe` literals |

**Dark (PE-51):** Same roles; layered surfaces (`--bg`, `--surface`, `--pe-card-surface`, `--surface-inset`) and softened borders. Light token hex values unchanged from pre–PE-50.

**Appearance:** Settings → Light / Dark / Match system → `themePreference` in `PROZAEDIT_CONFIG`; effective theme on `<html data-pe-theme>`.

---

## Do / don't (beta)

| Do | Don't |
| --- | --- |
| Use existing CSS custom properties for new components | Assign a unique accent color per tab (Checks vs Audit vs Rewrite) |
| Keep severity reds/oranges on audit findings only | Use red/orange for toolbar, tabs, or Settings headers |
| Test new UI in **light and dark** and **narrow pane** | Add web fonts or `@font-face` without manifest + owner sign-off |
| Prefer `--pe-font-size-*` and `--pe-font-weight-*` | Reintroduce sub-10px tab labels |
| Use banner tint tokens for full-width messages | Hard-code light-theme blues that break in dark mode |

---

## When to reconsider Inter (post–Phase 1)

Revisit **Option B** in [TYPOGRAPHY-AND-FONTS.md](./TYPOGRAPHY-AND-FONTS.md) only if **all** apply:

1. Phase 1 validation **GO beta** with no typography readability blockers logged.
2. Owner accepts **manifest version bump** and tester re-upload of `manifest.hosted.xml`.
3. Brand/marketing wants **pixel-identical** type across Mac and Windows (accept CDN dependency and attribution).

Until then, treat the system stack as the shipped product face.

---

## References

- PE-50 Appearance · PE-51 dark polish · PE-52 typography (merged on `main`)
- Phase 1 checklist: [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) §3 Appearance, §7 typography
