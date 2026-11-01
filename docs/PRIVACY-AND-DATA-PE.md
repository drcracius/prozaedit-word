# Privacy and data (ProzaEdit Word)

**Build:** 2.0.0.15 hosted task pane · **Owner-editable** summary for Help and Settings.

---

## Default: local-first

| Action | Data leaves your device? |
|--------|---------------------------|
| **Run audit** (local checks) | **No** — scoped text is read from Word in the browser; findings stay in the pane unless you Apply. |
| **Local Coach** | **No** — rule-based tips only. |
| **Local paraphrase (Rewrite)** | **No** — runs in the browser. |
| **Timeline / citation scans** | **No** — local heuristics on scoped text. |
| **Undo / dictionary / mute** | **No cloud** — stored in Word document settings and/or browser storage (see below). |

---

## Optional cloud (you click to send)

| Service | When | What is sent |
|---------|------|----------------|
| **Google Gemini** | Coach **Send via Gemini**, **Deep audit**, **Rewrite via Gemini** | Your prompt plus the context ProzaEdit attaches (selection-only by default for Coach). |
| **Datamuse** | **Thesaurus** lookup | The single word you search. |

No ProzaEdit-hosted model training pipeline exists in this build; third-party terms apply when you use Gemini or Datamuse.

---

## Stored on this Word document

- **`PROZAEDIT_CONFIG`** — UI preferences, optional **Remember API key** (off by default).
- **Custom dictionary** — terms you add in Settings → Dictionary.
- **Muted rules (document copy)** — rule IDs muted during audits on this file.
- **Custom style rules**, last audit snapshot, and similar document-scoped keys.

**Remember API key:** when enabled, the Gemini key is stored inside the document. Use only on files you control on a private PC.

---

## Stored in this browser (not synced across devices)

- **Global mute list** — merged with per-document mutes for future audits in this browser profile.
- **Dismissed exact wordings** — browser `localStorage` on this PC.
- **Session banners**, tour progress flags, optional diagnostics note draft.

Clearing site data for the add-in host may reset browser-side mutes and dismissals.

---

## Diagnostics (opt-in)

**Settings → Privacy & diagnostics → Send anonymous crash reports** is **off by default**.

- **Report a problem** copies **redacted** JSON (no manuscript body, selection text, or API keys).
- Automated ingest sends only what [DIAGNOSTICS.md](./DIAGNOSTICS.md) describes when the owner configures a URL.

---

## Owner updates

Edit this file on `main` when policy changes. Help tab and Settings → Privacy link here.
