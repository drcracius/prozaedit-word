# Agent instructions

Read [docs/HANDOFF-DESKTOP.md](./docs/HANDOFF-DESKTOP.md) first: purpose, architecture, setup, release steps, branches/tags, open items.

- Word-only Office.js add-in, no build step. Rule: best result from the right AI at lowest cost, offline by default.
- Before finishing: `npm ci && npm test`, `npm run validate:manifest`, `npm run verify:wiring`, `npm run check:contrast`, `bash scripts/verify-version-sync.sh`.
- Version bumps touch `manifest.hosted.xml`, `manifest.xml`, `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` and the docs listed in the handoff, section 6.
- Never claim real-Word behaviour is verified; Track Changes Apply is mock-tested only.
- Owner prefers brief replies and cannot code. Do not force-push `main`.
