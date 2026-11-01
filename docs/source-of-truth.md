# ProzaEdit Word — Source of truth (repo)

Principles and authoritative references on GitHub `main`. Project Context may mirror this file under `/cursor/stores/self/docs/source-of-truth.md`.

---

## Engineering discipline

**Audit before you ship.** Reproduce failures, fix with minimal diffs, re-check manifest URLs and version strings after changes.

---

## Version and release

| What | Source of truth |
|------|-----------------|
| Hosted Office registration | `manifest.hosted.xml` → `<Version>` on `main` |
| Task pane update check / UI label | `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` — **must match** hosted manifest |
| Local sideload dev | `manifest.xml` (separate track) |
| Live UI | GitHub Pages from `main` |

**Current hosted release:** **2.0.0.24** (testers re-upload `manifest.hosted.xml` once per manifest bump).

Verify: `bash scripts/verify-version-sync.sh` · **120** tests: `npm test` (needs `npm ci` once for the jsdom dev dependency) · wiring gate: `npm run verify:wiring`.

---

## Web 1.0 RC status (PE-49 → PE-62)

| Item | Status |
|------|--------|
| Web 1.0 RC on `main` | Build **2.0.0.15**; **40** unit tests (PE-62) |
| Agent prep | **PE-48** merged ([#5](https://github.com/drcracius/prozaedit-word/pull/5)) |
| Final audit / doc sync | **PE-49** — [FINAL-AUDIT-PE-49.md](./FINAL-AUDIT-PE-49.md) |
| Forum onboarding | **PE-61** — [RELEASE-NOTES-PE-61-ONBOARDING.md](./RELEASE-NOTES-PE-61-ONBOARDING.md) |
| Full app review (current) | **PE-62** — [FULL-APP-REVIEW-PE-62.md](./FULL-APP-REVIEW-PE-62.md) · prior [PE-59](./FULL-APP-REVIEW-PE-59.md) |
| Owner Phase 1 validation | **PE-47** open — [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) |
| Desktop install | **PE-2** optional/deferred — not a web 1.0 blocker |
| Merged PRs (agent milestones) | [#2](https://github.com/drcracius/prozaedit-word/pull/2)–[#13](https://github.com/drcracius/prozaedit-word/pull/13) (UX/theme through PE-57) |

---

## Repository and hosting

| Item | Location |
|------|----------|
| GitHub repo | https://github.com/drcracius/prozaedit-word |
| Hosted manifest (raw) | https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml |
| Task pane (Pages) | https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html |
| Add-in ID | `d1829e3a-4931-4122-b911-37f22941aa99` |

---

## Primary docs

| Doc | Purpose |
|-----|---------|
| [prozaedit-implementation-plan-audited.md](./prozaedit-implementation-plan-audited.md) | Primary roadmap |
| [prozaedit-multi-phase-plan.md](./prozaedit-multi-phase-plan.md) | Historical v1 plan |
| [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) | Final mile (web-first) |
| [prozaedit-features.md](./prozaedit-features.md) | As-built behavior |
| [FULL-APP-REVIEW-PE-58.md](./FULL-APP-REVIEW-PE-58.md) | Full app review (PE-58) |
