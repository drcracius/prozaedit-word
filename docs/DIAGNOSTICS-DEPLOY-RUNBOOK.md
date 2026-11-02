# Diagnostics ingest deploy runbook (next build after PE-79: 2.0.0.17)

**When to use:** Owner has a **Worker HTTPS URL** from deploy (GitHub Actions or `tools/diagnostics-ingest/deploy.sh`).  
**Optional for web 1.0** — default build keeps ingest URL empty ([DIAGNOSTICS.md](./DIAGNOSTICS.md), [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) Phase 3).

Do **not** commit a placeholder URL. Set the real URL only when the Worker is live.

---

## Prerequisites

- [ ] Worker deployed; HTTPS URL copied from workflow summary or deploy output
- [ ] Repo secrets set (if using Actions): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DIAGNOSTICS_GITHUB_TOKEN`
- [ ] `main` at **2.0.0.16**; `npm test` green locally or on PR

---

## Checklist (owner + one PR)

| Step | Action | Done |
|------|--------|:----:|
| 1 | Record Worker origin (scheme + host only, e.g. `https://….workers.dev`) | ☐ |
| 2 | Edit `src/taskpane/lib/diagnostics-config.js` — set `DIAGNOSTICS_INGEST_URL` to that URL | ☐ |
| 3 | Edit `manifest.hosted.xml` — add Worker origin under `<AppDomains>` | ☐ |
| 4 | Bump `<Version>` in `manifest.hosted.xml` and `PROZAEDIT_BUILD_VERSION` in `src/taskpane/taskpane.js` to **2.0.0.17** (2.0.0.16 shipped the PE-79 Word fixes) together | ☐ |
| 5 | Run `bash scripts/verify-version-sync.sh` | ☐ |
| 6 | Run `npm test` | ☐ |
| 7 | Push / merge PR; wait for version-sync CI | ☐ |
| 8 | Re-upload `manifest.hosted.xml` once in Word on the web (test account) | ☐ |
| 9 | Settings → Privacy → opt-in **on** → **Report a problem** → confirm GitHub issue with label `auto-report` (or documented fallback) | ☐ |

---

## Rollback

| Situation | Action |
|-----------|--------|
| Ingest broken after publish | Set `DIAGNOSTICS_INGEST_URL` back to `""`; remove AppDomain if needed |
| Testers already on **2.0.0.17** | Bump to **2.0.0.18** with rollback config; testers re-upload once |
| Never shipped **2.0.0.17** to testers | Stay on **2.0.0.16**; revert PR only |

---

## References

| Doc | Role |
|-----|------|
| [DIAGNOSTICS.md](./DIAGNOSTICS.md) | Privacy, secrets, testing without deploy |
| [WHEN-YOU-RETURN.md](./WHEN-YOU-RETURN.md) | Version alignment discipline |
| `.github/workflows/deploy-diagnostics-ingest.yml` | Workflow dispatch deploy |
