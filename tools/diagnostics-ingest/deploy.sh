#!/usr/bin/env bash
# One-command deploy for owner (local machine or CI with Cloudflare + GitHub env).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -f wrangler.toml ]]; then
  cp wrangler.toml.template wrangler.toml
  echo "Created wrangler.toml from wrangler.toml.template"
fi

: "${GITHUB_TOKEN:?Set GITHUB_TOKEN (Issues: write on drcracius/prozaedit-word)}"
export GITHUB_REPO="${GITHUB_REPOSITORY:-drcracius/prozaedit-word}"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  export CLOUDFLARE_API_TOKEN
fi
if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  export CLOUDFLARE_ACCOUNT_ID
fi

echo "Deploying diagnostics ingest worker (repo: ${GITHUB_REPO})…"
printf '%s' "$GITHUB_TOKEN" | npx --yes wrangler secret put GITHUB_TOKEN

DEPLOY_OUT="$(npx --yes wrangler deploy 2>&1)"
echo "$DEPLOY_OUT"

WORKER_URL="$(echo "$DEPLOY_OUT" | grep -Eo 'https://[a-zA-Z0-9._-]+\.workers\.dev' | tail -1 || true)"
if [[ -n "$WORKER_URL" ]]; then
  echo ""
  echo "Worker URL: $WORKER_URL"
  echo "Next: set DIAGNOSTICS_INGEST_URL in src/taskpane/lib/diagnostics-config.js,"
  echo "add AppDomain in manifest.hosted.xml, bump to 2.0.0.16 — see docs/DIAGNOSTICS.md"
else
  echo "Deploy finished; copy the Worker URL from wrangler output above."
fi
