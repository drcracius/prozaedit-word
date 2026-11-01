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
- Tests: see `npm test` (224 at PE-82; more added by the PE-83 corpus and the PE-84 independent audit).
- Manifest `AppDomains` unchanged: Gemini already worked without listing its domain, so no re-upload is needed; add the domains only if a provider is blocked in real Word.

## PE-84 independent audit fixes (still 2.0.0.19)

- AI budget caps now also hold when the browser blocks or fails storage (counters are kept in memory for the life of the pane as well).
- Spacing-only cards (double space) now say how to fix them (Word Find & Replace) instead of "no text to replace".
- All settings checkboxes and several text fields now have accessible names for screen readers.
- "Release notes" link in What's new points to these notes; privacy doc now discloses the automatic once-per-session update check.

## Audit 2 (PE-85) + best-version fixes (PE-86) — 2.0.0.20 (manifest bump: testers re-upload `manifest.hosted.xml` once)
- Anchored Undo/Redo: edit history stores the anchor, so undo/redo verify the paragraph and never touch a different identical spot.
- Timed-out / cancelled-in-flight / dropped / empty AI calls now count toward session and day caps (conservatively, at the estimate).
- AI catalogue refreshed (reviewed 2026-11-01, not live-key tested): Gemini 3.x default, Claude Haiku/Sonnet 5.5, retired Claude ids removed; model lists live in one block in `ai-providers.js`; Custom model id still works; 404 says "model unavailable, pick another".
- Gemini key sent in `x-goog-api-key` header (not URL); Anthropic no longer sends `temperature`; `gpt-5+`/`gpt-6` use `max_completion_tokens`.
- "Failed to fetch" guidance (OpenAI key/Anthropic org CORS); Gemini free-tier data-use disclosure.
- `ext:dash_mix` / `ext:emdash` no longer offer an Apply replacement; em-dash flag needs density ≥12 per 1k words. AI-phrasing check is off by default, Advanced-only, reworded.
- Default scope is Full manuscript; session tip about re-uploading manifest removed; all 9–11px text raised to 12px; MCI "not built" neutral style.
- Manifest declares WordApi 1.3 and the pane checks `isSetSupported` at start.
- Not done: tracked-changes Apply mode, per-chapter incremental index rebuild, live model-list refresh, AppDomains additions (needs real-Word evidence).
