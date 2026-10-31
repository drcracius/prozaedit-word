# ProzaEdit — Anonymous diagnostics

Safe, **opt-in** crash and problem reporting for the Word task pane. **Default: off.** Nothing sends until the user enables **Send anonymous crash reports** on the Help tab.

## What is sent (and what is not)

| Included (redacted) | Never sent |
|---------------------|------------|
| Build version (`PROZAEDIT_BUILD_VERSION`) | Document text, selection, or audit excerpts |
| Error message and stack trace (trimmed) | Gemini API keys or stored secrets |
| Optional one-line user note (≤ 500 chars) | Email addresses (pattern-redacted) |
| Office host/platform hints | Full `localStorage` or document settings |
| Browser user-agent (truncated) | Raw prompts or chat content |

Automatic hooks (`window.onerror`, unhandled promise rejections) run **only when opt-in is on**.

Manual **Report a problem** always produces a **redacted JSON** payload. If ingest is disabled or opt-in is off, the add-in **copies that JSON to the clipboard** and shows a status message (no silent failure).

## User steps

1. Open **Help** → **Diagnostics & privacy**.
2. Turn on **Send anonymous crash reports** if you want automatic crash/unhandled reports (when ingest is configured).
3. Use **Report a problem** to send or copy a report; optional note describes what you were doing (not what you wrote).

## Owner: enable network ingest

Shipped config keeps `DIAGNOSTICS_INGEST_URL` **empty** in `src/taskpane/lib/diagnostics-config.js` — no extra manifest `AppDomain` is required for that default.

1. Deploy the optional worker: [tools/diagnostics-ingest/README.md](../tools/diagnostics-ingest/README.md).
2. Set `DIAGNOSTICS_INGEST_URL` in `diagnostics-config.js` to the Worker HTTPS URL (no trailing slash required).
3. Add the Worker origin to `manifest.hosted.xml` `<AppDomains>` (e.g. `https://your-worker.workers.dev`).
4. Bump `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` in `taskpane.js` **together**; testers re-upload `manifest.hosted.xml` once.
5. Push to GitHub Pages; verify with opt-in on: trigger a test report or use **Report a problem** and confirm a GitHub issue with label `auto-report`.

**No token in the client.** The Worker uses `GITHUB_TOKEN` as a secret.

## Testing without deploy

1. Leave `DIAGNOSTICS_INGEST_URL` empty.
2. Help → **Report a problem** → confirm clipboard JSON and status text.
3. Enable opt-in → cause a harmless test (e.g. report with note only) → still clipboard when URL empty.

## Files

| File | Role |
|------|------|
| `src/taskpane/lib/diagnostics-config.js` | Ingest URL (empty default), build version helper |
| `src/taskpane/lib/diagnostics-reporter.js` | Redaction, send, dedupe, global hooks |
| `tools/diagnostics-ingest/` | Optional Cloudflare Worker → GitHub issue |

## Rate limiting

The client dedupes identical errors within **one minute** to avoid spam. Failed network sends may retry up to five queued reports when opt-in and URL are set.
