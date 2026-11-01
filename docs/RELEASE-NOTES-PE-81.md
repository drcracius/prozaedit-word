# Release notes — PE-81 (2.0.0.17)

Based on PE-79 (PR #27, not yet merged).

- **Genre profiles** — see [GENRE-PROFILES.md](./GENRE-PROFILES.md).
- **Multi-provider AI help** (optional, own API key): Gemini, OpenAI, Claude, OpenRouter. Model picker (cheapest default), estimate-before-run in every confirm, hard session and daily token limits, usage meter, cancel, retry-once on rate limit. Keys stay on the device, never in the document; old document-stored Gemini keys migrate out.
- **Safer AI output**: manuscript text is wrapped as untrusted data; AI findings are schema-validated and dropped unless they quote your text; nothing is auto-applied.
- **Safer Apply**: only the exact (case-sensitive) text shown is edited, ambiguous matches are refused, the result is re-read and verified, and placeholder suggestions cannot be applied.
- **Simple view** hides low-confidence suggestions behind "Show them".
- Removed regex lookbehind (older Office WebViews). 
- Tests: 198 (was 168).
- Manifest `AppDomains` unchanged: Gemini already worked without listing its domain, so no re-upload is needed; add the domains only if a provider is blocked in real Word.
