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
| **Your chosen AI provider** (Google Gemini, OpenAI, Anthropic Claude or OpenRouter — only if you add your own API key under Settings → AI help) | Coach **Send via AI**, **Deep audit**, **AI rewrite** — each asks first and shows an estimate | Your prompt plus the context ProzaEdit attaches (selection-only by default for Coach). **If you built a manuscript context index, that local heuristic outline — chapter titles, word counts, first/last lines, recurring names, frequent words and time cues — is included in the request too** (flagged if it may be out of date). Over-long prompts are trimmed with a visible note; the instruction, your question and the end of the excerpt are kept. |
| **Datamuse** | **Thesaurus** lookup | The single word you search. |

The manuscript context index itself is **not AI-generated** and building it sends nothing anywhere; it is stored in this document's own settings key (`PROZAEDIT_MCI_V2`). Local audit, local Coach and local Rewrite never contact any AI provider. Offline is the default: with no API key nothing leaves the PC except the optional Thesaurus lookup and the update check.

No ProzaEdit-hosted model training pipeline exists in this build; third-party terms apply when you use an AI provider or Datamuse. Consumer subscriptions (ChatGPT Plus, Claude Pro, Gemini Advanced, Copilot) do not include API access; AI help needs an API key from the provider.

---

## Stored on this Word document

- **`PROZAEDIT_CONFIG`** — UI preferences, the genre profile and the AI provider/model/limits choice. **API keys are never stored in the document.**
- **Custom dictionary** — terms you add in Settings → Dictionary.
- **Muted rules (document copy)** — rule IDs muted during audits on this file.
- **Custom style rules**, last audit snapshot, and similar document-scoped keys.

**Remember on this device:** when enabled, the key is kept in this browser profile's local storage only (never in the document, never in diagnostics, never in logs). Leave it off on shared PCs. Documents saved by older versions that still contain a key have it moved to the device and removed from the document the first time they open. AI replies are only shown as suggestions; nothing is applied automatically, and findings that do not quote your text exactly are discarded.

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
