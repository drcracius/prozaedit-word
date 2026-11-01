# Beta onboarding comms (owner copy-paste)

Use this one-pager in release notes, beta email, or forum posts for **ProzaEdit Word 2.0.0.15** (+ PE-61–64 UX pack). No manifest bump required for these UX changes.

---

## Headline

**ProzaEdit is manual-audit, local-first editing in Word** — you choose scope, run one audit, then fix cards. Not realtime underlines.

---

## First session (what testers see)

1. **Simple mode on by default** — hides Thesaurus and optional Gemini blocks; Audit opens on **Critical** first.
2. **Simple mode banner** — one dismiss; then optional **3-step tour** (Target scope → Run audit → Fix cards). Skip anytime.
3. **Settings → Essentials** — API key (optional), theme, Simple mode. Everything else is under **Advanced** groups.
4. **Checks** — turn on **1–2 core checks**, hit **Run audit**. Extended, fiction-only, partner tools, and scans live under **More checks (optional)**.

---

## Recommended workflow (reduces overwhelm)

| Step | Action |
|------|--------|
| 1 | **Target** — scope **Selected chapters** (Heading 1–3 checklist) or a highlight; avoid full manuscript on first pass. |
| 2 | **Settings → Audit** — report depth **Light** or **Balanced**. |
| 3 | **Checks** — enable repetition + proofreading (or one module); **Run audit**. |
| 4 | **Audit** — work **Critical** filter lane; Mute or Dictionary for noisy names. |

---

## Positioning vs forum pain points

- **Not Grammarly-style realtime** — explicit Run audit when you are ready.
- **Not 20-report ribbon** — filter lanes (Critical / Style / Style guide) one category at a time.
- **Long docs** — chapter or page scope; post-audit footnote nudges smaller scope after large runs.

---

## Links for testers

- [PHASE-1-QUICKSTART.md](./PHASE-1-QUICKSTART.md)
- [FULL-TEST-CHECKLIST-WORD-WEB.md](./FULL-TEST-CHECKLIST-WORD-WEB.md)
- [RELEASE-NOTES-PE-64-SIMPLIFY.md](./RELEASE-NOTES-PE-64-SIMPLIFY.md)

---

## Owner checklist before broad beta

- [ ] Run Word web checklist including first-run Simple + tour paths
- [ ] Paste headline + recommended workflow into beta channel
- [ ] Confirm hosted build matches `PROZAEDIT_BUILD_VERSION` (still **2.0.0.15** until next manifest bump)
