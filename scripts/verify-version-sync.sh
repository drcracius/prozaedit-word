#!/usr/bin/env bash
# Verify hosted manifest semver matches task pane PROZAEDIT_BUILD_VERSION (source-of-truth).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/manifest.hosted.xml"
TASKPANE="$ROOT/src/taskpane/taskpane.js"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: missing $MANIFEST" >&2
  exit 1
fi
if [[ ! -f "$TASKPANE" ]]; then
  echo "ERROR: missing $TASKPANE" >&2
  exit 1
fi

manifest_version="$(sed -n 's:.*<Version>\([^<]*\)</Version>.*:\1:p' "$MANIFEST" | head -n1)"
ui_version="$(grep -E '^\s*const PROZAEDIT_BUILD_VERSION\s*=' "$TASKPANE" | sed -n 's/.*=\s*"\([^"]*\)".*/\1/p' | head -n1)"

if [[ -z "$manifest_version" ]]; then
  echo "ERROR: could not parse <Version> from manifest.hosted.xml" >&2
  exit 1
fi
if [[ -z "$ui_version" ]]; then
  echo "ERROR: could not parse PROZAEDIT_BUILD_VERSION from taskpane.js" >&2
  exit 1
fi

echo "manifest.hosted.xml Version: $manifest_version"
echo "PROZAEDIT_BUILD_VERSION:    $ui_version"

if [[ "$manifest_version" != "$ui_version" ]]; then
  echo "ERROR: version mismatch (must match per docs/WHEN-YOU-RETURN.md)" >&2
  exit 1
fi

# Optional: key release doc must mention the same hosted build (source-of-truth hygiene).
when_you_return="$ROOT/docs/WHEN-YOU-RETURN.md"
if [[ -f "$when_you_return" ]]; then
  if ! grep -q "currently \*\*${manifest_version}\*\*" "$when_you_return"; then
    echo "ERROR: docs/WHEN-YOU-RETURN.md missing current hosted build **${manifest_version}**" >&2
    exit 1
  fi
fi

echo "OK: version strings in sync."
