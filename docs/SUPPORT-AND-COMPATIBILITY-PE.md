# Support and compatibility (ProzaEdit Word)

**Build:** 2.0.0.15 · **Owner-editable** — adjust support channels and compatibility notes without a manifest bump.

---

## Where to get help

1. **Help tab → Report a problem** — redacted diagnostic JSON to clipboard; paste into a GitHub issue.
2. **GitHub issues:** [github.com/drcracius/prozaedit-word/issues](https://github.com/drcracius/prozaedit-word/issues) — use the diagnostic template when offered.
3. **Docs:** [QUICK-START.md](./QUICK-START.md), [WORKFLOWS.md](./WORKFLOWS.md), [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md).

*(Add your preferred contact, SLA, or refund/licensing language here — not enforced by the add-in.)*

---

## Supported environments (intent)

| Environment | Expectation |
|-------------|-------------|
| **Word on the web** | **Primary** — upload `manifest.hosted.xml` once; pane loads from GitHub Pages. |
| **Word desktop (Windows/Mac)** | **Best-effort** — many builds lack **Upload My Add-in**; use Word in the browser for install/update. |
| **Mobile Word apps** | **Limited** — use supported browser + Word web if the app cannot sideload. |

Validation checklist: [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md) (owner-run on real Word; CI uses a mocked host only).

---

## Known host limits (Microsoft)

- Task pane width and dialog behavior are controlled by Word/WebView.
- Long documents: prefer **Chosen chapters** or **Page range** scope; full-manuscript runs are user-tested, not guaranteed.
- In-pane confirmations (PE-74) replace blocked `window.confirm` for Apply and other critical actions.

---

## Developer / owner notes

- **`?pe-dev=1`** on the pane URL (when used in local dev archives) can enable extra logging — not part of normal author workflow; do not document to end users unless you enable it in your tenant.
- **Check for updates** compares the live GitHub manifest to the embedded UI build version.

---

## Related

- [PRIVACY-AND-DATA-PE.md](./PRIVACY-AND-DATA-PE.md)
- [DIAGNOSTICS.md](./DIAGNOSTICS.md)
