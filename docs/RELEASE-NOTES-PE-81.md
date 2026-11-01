# Release notes — PE-81 / PE-82 / PE-83 (2.0.0.19)

Based on PE-79 (PR #27, not yet merged).

- **Genre profiles** — see [GENRE-PROFILES.md](./GENRE-PROFILES.md).
- **Multi-provider AI help** (optional, own API key): Gemini, OpenAI, Claude, OpenRouter. Model picker (cheapest default), estimate-before-run in every confirm, hard session and daily token limits, usage meter, cancel, retry-once on rate limit. Keys stay on the device, never in the document; old document-stored Gemini keys migrate out.
- **Safer AI output**: manuscript text is wrapped as untrusted data; AI findings are schema-validated and dropped unless they quote your text; nothing is auto-applied.
- **Safer Apply** (anchored, PE-82): each audit fix is tied to its paragraph (text hash) and ~30 characters of context either side. Before editing, ProzaEdit re-checks that exactly one place matches; if the paragraph changed, or the same text appears in identical surroundings, it refuses with a clear message and changes nothing. After editing, the paragraph is re-read and verified. Only exact (case-sensitive) text is edited; placeholder suggestions cannot be applied; works the same in Simple and Advanced; one undoable edit.
- **Resume for the manuscript read** (PE-82): cancelling "Build full manuscript context" keeps the finished batches in memory; running it again resumes if the document is unchanged (version, 30-minute age, paragraph count and per-batch hashes all verified), otherwise starts over. Nothing is written to the document or settings.
- **Saved AI replies** (PE-82): the same AI request is answered from a local cache (7 days, size-capped, never in the document, never with keys) at 0 tokens; clear it in Settings → AI.
- **Accuracy gate** (PE-83): labeled corpus across all 12 profiles, precision/recall computed in `npm test` (gate: precision >= 0.85, recall >= 0.90) and a GitHub Actions `tests` workflow. It exposed and fixed: Non-Fiction types being treated as Fiction, noisy repeated-word-pair/POV-slip/sensory/hook/long-dialogue cards (now low confidence), contractions inside quotes in academic text.
- **Tense and POV drift hints** and optional **Content notes** (profanity/violence, off by default, informational) — see GENRE-PROFILES.md.
- **Simple view** hides low-confidence suggestions behind "Show them".
- Removed regex lookbehind (older Office WebViews). 
- Tests: 224 (was 168).
- Manifest `AppDomains` unchanged: Gemini already worked without listing its domain, so no re-upload is needed; add the domains only if a provider is blocked in real Word.
