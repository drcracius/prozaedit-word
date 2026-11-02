# ProzaEdit — Anonymous diagnostics

Safe, **opt-in** crash and problem reporting for the Word task pane. **Default: off.** Nothing sends until the user enables **Send anonymous crash reports** on the Help tab.

**Web 1.0:** Network ingest is **optional** — see Phase 3 in [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md). Clipboard + GitHub issue fallback works without deploy.

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

When ingest is not configured, Help also shows **Report on GitHub** → [new issue chooser](https://github.com/drcracius/prozaedit-word/issues/new/choose) (use the **ProzaEdit diagnostic report** form).

## User steps

1. Open toolbar **Settings** → **Privacy & diagnostics** (Help tab links there).
2. Turn on **Send anonymous crash reports** if you want automatic crash/unhandled reports (when ingest is configured).
3. Use **Report a problem** to send or copy a report; optional note describes what you were doing (not what you wrote).
4. If automated send is unavailable, use **Report on GitHub** and paste the redacted JSON into the issue form.

## Owner: enable network ingest

Shipped config keeps `DIAGNOSTICS_INGEST_URL` **empty** in `src/taskpane/lib/diagnostics-config.js` — no extra manifest `AppDomain` is required for that default.

**Step checklist (next build, 2.0.0.17):** [DIAGNOSTICS-DEPLOY-RUNBOOK.md](./DIAGNOSTICS-DEPLOY-RUNBOOK.md) — use only when a live Worker URL exists.

### Option A — GitHub Actions (one workflow run)

1. Repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DIAGNOSTICS_GITHUB_TOKEN` (Issues: write; not stored in the add-in).
2. Run workflow **Deploy diagnostics ingest** (`.github/workflows/deploy-diagnostics-ingest.yml`).
3. Copy Worker URL from the job summary.

### Option B — Local deploy

From `tools/diagnostics-ingest/`:

```bash
export GITHUB_TOKEN="…"   # Issues: write
export GITHUB_REPOSITORY=drcracius/prozaedit-word
./deploy.sh
```

### After deploy (required for automatic send)

1. Set `DIAGNOSTICS_INGEST_URL` in `diagnostics-config.js` to the Worker HTTPS URL (no trailing slash required).
2. Add the Worker origin to `manifest.hosted.xml` `<AppDomains>` (e.g. `https://your-worker.workers.dev`).
3. Bump `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` in `taskpane.js` to **2.0.0.17** (2.0.0.16 shipped the PE-79 Word fixes) **together**; push; testers re-upload `manifest.hosted.xml` once.
4. Verify with opt-in on: **Report a problem** or a test crash → GitHub issue with label `auto-report`.

**No token in the client.** The Worker uses `GITHUB_TOKEN` as a secret only.

## Testing without deploy

1. Leave `DIAGNOSTICS_INGEST_URL` empty.
2. Help → **Report a problem** → confirm clipboard JSON and status text; **Report on GitHub** link visible.
3. Enable opt-in → cause a harmless test (e.g. report with note only) → still clipboard when URL empty.

## Files

| File | Role |
|------|------|
| `src/taskpane/lib/diagnostics-config.js` | Ingest URL (empty default), GitHub fallback URL |
| `src/taskpane/lib/diagnostics-reporter.js` | Redaction, send, dedupe, global hooks |
| `tools/diagnostics-ingest/` | Optional Cloudflare Worker → GitHub issue |
| `.github/workflows/deploy-diagnostics-ingest.yml` | Owner workflow_dispatch deploy |
| `.github/ISSUE_TEMPLATE/prozaedit-diagnostic-report.yml` | Manual report form |

## Rate limiting

The client dedupes identical errors within **one minute** to avoid spam. Failed network sends may retry up to five queued reports when opt-in and URL are set.
