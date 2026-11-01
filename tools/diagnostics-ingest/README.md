# ProzaEdit diagnostics ingest (optional)

Minimal Cloudflare Worker that accepts **anonymous** JSON crash reports from the task pane and opens a GitHub issue for owner review. The client never receives or sends `GITHUB_TOKEN`.

**GitHub-native fallback (no Worker):** testers use Help → **Report on GitHub** or the [diagnostic issue form](https://github.com/drcracius/prozaedit-word/issues/new/choose?template=prozaedit-diagnostic-report.yml) with clipboard JSON from **Report a problem**.

## Privacy

The task pane redacts payloads before send. This worker should only receive fields such as `kind`, `version`, `message`, `stack`, `context`, `userNote`, `ts`, `ua`, and Office platform hints — **not** manuscript text or API keys. Do not log full request bodies in production.

## Environment (owner)

| Variable | Where | Purpose |
|----------|--------|---------|
| `GITHUB_TOKEN` | Worker secret (local `deploy.sh` or CI `DIAGNOSTICS_GITHUB_TOKEN`) | PAT with **Issues: write** on the repo |
| `GITHUB_REPOSITORY` | `deploy.sh` / CI | Default `drcracius/prozaedit-word` (maps to worker var `GITHUB_REPO`) |
| `CLOUDFLARE_API_TOKEN` | CI or local | Cloudflare Workers deploy |
| `CLOUDFLARE_ACCOUNT_ID` | CI or local | Cloudflare account |

Never commit tokens or the live Worker URL in the client repo.

## Deploy — one command (local)

From this directory:

```bash
export GITHUB_TOKEN="ghp_…"   # Issues: write
export GITHUB_REPOSITORY=drcracius/prozaedit-word
# optional if not logged in via wrangler login:
# export CLOUDFLARE_API_TOKEN=…
# export CLOUDFLARE_ACCOUNT_ID=…

chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` copies `wrangler.toml.template` → `wrangler.toml` if needed, sets the `GITHUB_TOKEN` secret, and runs `wrangler deploy`.

## Deploy — GitHub Actions (recommended)

1. Add repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DIAGNOSTICS_GITHUB_TOKEN` (Issues: write PAT).
2. **Actions** → **Deploy diagnostics ingest** → **Run workflow**.
3. Copy the **Worker URL** from the job summary.

## Post-deploy (repo)

1. Set `DIAGNOSTICS_INGEST_URL` in `src/taskpane/lib/diagnostics-config.js` to the Worker HTTPS URL.
2. Add the Worker origin to `manifest.hosted.xml` `<AppDomains>`.
3. Bump `manifest.hosted.xml` `<Version>` and `PROZAEDIT_BUILD_VERSION` in `taskpane.js` to **2.0.0.17** (2.0.0.16 shipped the PE-79 Word fixes) together; testers re-upload the manifest once.

See [docs/DIAGNOSTICS.md](../../docs/DIAGNOSTICS.md) for client opt-in and testing.

## API

- **POST** `/` (or any path) — `Content-Type: application/json`, body ≤ 32 KB.
- **OPTIONS** — CORS preflight.

Success: `202` with `{ "ok": true, "issue": "<url>" }`.

## Local dev

```bash
cp wrangler.toml.template wrangler.toml
npx wrangler dev
```

Use a personal access token in `.dev.vars` (never commit):

```
GITHUB_TOKEN=ghp_...
GITHUB_REPO=drcracius/prozaedit-word
```
