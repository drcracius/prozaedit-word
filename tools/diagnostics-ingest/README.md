# ProzaEdit diagnostics ingest (optional)

Minimal Cloudflare Worker that accepts **anonymous** JSON crash reports from the task pane and opens a GitHub issue for owner review. The client never receives or sends `GITHUB_TOKEN`.

## Privacy

The task pane redacts payloads before send. This worker should only receive fields such as `kind`, `version`, `message`, `stack`, `context`, `userNote`, `ts`, `ua`, and Office platform hints — **not** manuscript text or API keys. Do not log full request bodies in production.

## Deploy (owner)

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/) and log in.
2. From this directory:

   ```bash
   npx wrangler deploy
   ```

3. Set Worker secrets / vars (Cloudflare dashboard or CLI):

   | Name | Purpose |
   |------|---------|
   | `GITHUB_TOKEN` | Fine-grained or classic token with **Issues: write** on the repo |
   | `GITHUB_REPO` | e.g. `drcracius/prozaedit-word` |
   | `GITHUB_LABELS` | Optional; default `auto-report` |

4. Copy the deployed Worker URL (HTTPS).
5. In the repo, set `DIAGNOSTICS_INGEST_URL` in `src/taskpane/lib/diagnostics-config.js` to that URL.
6. Add the Worker host to `manifest.hosted.xml` under `<AppDomains>`, bump `<Version>` and `PROZAEDIT_BUILD_VERSION` together, and ask testers to re-upload the manifest once.

See [docs/DIAGNOSTICS.md](../../docs/DIAGNOSTICS.md) for client opt-in and testing.

## API

- **POST** `/` (or any path) — `Content-Type: application/json`, body ≤ 32 KB.
- **OPTIONS** — CORS preflight.

Success: `202` with `{ "ok": true, "issue": "<url>" }`.

## Local dev

```bash
npx wrangler dev
```

Use a personal access token in `.dev.vars` (never commit):

```
GITHUB_TOKEN=ghp_...
GITHUB_REPO=drcracius/prozaedit-word
```
