# ProzaEdit Word — typography and fonts (PE-52)

Task pane typography for **Word on the web** and desktop. This document compares font strategies and records what shipped in PE-52.

## Current audit (pre–PE-52 baseline)

| Area | Before PE-52 |
| --- | --- |
| **Stack** | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` on `body` only |
| **Body** | 12px, line-height ~1.45 |
| **Section titles** | 13px semibold (`.pe-section-title`) |
| **Tabs** | 10px; **8–9px** on narrow / `pe-narrow-pane` (hard to read) |
| **Help / muted** | 10–11px scattered literals and inline `style="font-size:10px"` in HTML |
| **Web fonts** | None; no `@font-face` or Google Fonts links |

## Word Online constraints

- External font CSS (Google Fonts, self-hosted `@font-face`) loads only if the host allows the origin. For Office add-ins that usually means adding domains under `<AppDomains>` in `manifest.hosted.xml` and **bumping `<Version>`** so admins re-upload the manifest.
- **System / `system-ui` stacks** use fonts already on the device or host WebView — **no manifest change**.
- Typography must remain readable in **narrow panes** (~320–420px) and in **light and dark** (`data-pe-theme`, PE-50/51).

---

## Option comparison

| | **A — Enhanced system UI stack** | **B — Inter or Source Sans 3 (Google Fonts)** | **C — Office-adjacent / host-first** |
| --- | --- | --- | --- |
| **Stack** | Segoe UI Variable → Segoe UI → `system-ui` → Apple/Roboto fallbacks | Single webfont family + system fallbacks | Inherit host where possible; minimal custom stack |
| **Manifest** | None | Add `fonts.googleapis.com`, `fonts.gstatic.com`; version bump + re-upload | None |
| **Pros** | Zero deploy friction; native on Windows/Mac; fast; works offline; matches Office feel on Windows | Consistent cross-platform brand; fine tuning weights | Theoretically closest to Word chrome |
| **Cons** | Slight visual drift Mac vs Windows | Network dependency; FOUT; privacy/CDN policy; manifest churn | Host does not expose document UI font to task pane iframe; inconsistent |
| **Licensing** | OS/system fonts (no add-in license issue) | SIL OFL (Inter, Source Sans 3) — attribute if bundled/linked | N/A |
| **Dark mode** | Excellent with PE-51 tokens; antialiasing on body | Same tokens; ensure webfont weights load for dark backgrounds | Depends on host; not reliable in iframe |
| **Narrow pane** | Tunable via CSS variables; **13px body floor** in PE-52 | Same; webfont hinting can help at small sizes | Limited control |
| **Recommendation** | **Shipped (PE-52 default)** | Optional Phase 2 when owner accepts manifest bump | Not recommended as primary |

---

## Shipped implementation (PE-52 — Option A)

CSS custom properties in `src/taskpane/taskpane.css` (all themes):

| Token | Typical use |
| --- | --- |
| `--pe-font-sans` | Global UI stack (Segoe UI Variable first on modern Windows) |
| `--pe-font-size-base` | Body copy (**13px**) |
| `--pe-font-size-sm` / `--pe-font-size-xs` / `--pe-font-size-2xs` | Settings group headers, forms, captions |
| `--pe-font-size-tab` | Tab labels (**11px**; narrow uses `--pe-font-size-2xs` minimum, not 8px) |
| `--pe-font-size-section` | Section headings (**14px**) |
| `--pe-line-height` / `--pe-line-height-tight` | Body vs compact UI |
| `--pe-font-weight-*` | Label / heading / strong scale |

`body`, `button`, `input`, `select`, and `textarea` use `var(--pe-font-sans)` with inherited family on controls.

---

## Optional Phase 2 — Inter or Source Sans 3

If product owner wants a single cross-platform face:

1. Add to `manifest.hosted.xml` `<AppDomains>`:
   - `https://fonts.googleapis.com`
   - `https://fonts.gstatic.com`
2. Bump manifest `<Version>` (and sync UI version strings per PE-3 discipline).
3. In `taskpane.html`, link Google Fonts CSS (prefer `display=swap`).
4. Set `--pe-font-sans: "Inter", …` (or `"Source Sans 3", …`) ahead of existing fallbacks.
5. Re-test narrow pane, dark mode, and offline/slow network in Word web.

**Inter** — neutral UI workhorse, many weights. **Source Sans 3** — Adobe/open, slightly warmer; good for long help text.

Neither is required for professional appearance when Option A is tuned (current release).

---

## References

- UI tokens and theme: [pe-ui-design-notes.md](./pe-ui-design-notes.md)
- Pane width: [WORD-WEB-PANE-WIDTH.md](./WORD-WEB-PANE-WIDTH.md)
- Manifest: `manifest.hosted.xml`
