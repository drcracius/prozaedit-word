# Diagnostics 2.0.0.16 — merge checklist (agent prep)

**Purpose:** Ordered steps for owner + one PR when a live Worker URL exists.  
**Do not** commit a placeholder ingest URL or bump manifest on prep-only passes.

**Related:** [DIAGNOSTICS-DEPLOY-RUNBOOK.md](./DIAGNOSTICS-DEPLOY-RUNBOOK.md) · [DIAGNOSTICS.md](./DIAGNOSTICS.md) · workflow `.github/workflows/deploy-diagnostics-ingest.yml`

---

## 1. GitHub repository secrets

| Secret | Required for workflow |
|--------|------------------------|
| `CLOUDFLARE_API_TOKEN` | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Yes |
| `DIAGNOSTICS_GITHUB_TOKEN` | Yes (repo issues / auto-report) |

Verify in **Settings → Secrets and variables → Actions** before dispatch.

---

## 2. Deploy workflow

| Step | Action | Done |
|------|--------|:----:|
| 2.1 | Actions → **Deploy diagnostics ingest** → **Run workflow** (branch `main`) | ☐ |
| 2.2 | Job completes; copy **Worker URL** from job summary (`https://….workers.dev`) | ☐ |
| 2.3 | Confirm workflow post-deploy summary matches steps below (config → AppDomain → version bump) | ☐ |

Workflow reference (must align with this doc):

1. Check secrets → deploy Worker via `tools/diagnostics-ingest/deploy.sh`
2. Summary tells owner: set `DIAGNOSTICS_INGEST_URL`, add AppDomain, bump to **2.0.0.16**

---

## 3. Application config (PR)

| Step | File | Action | Done |
|------|------|--------|:----:|
| 3.1 | `src/taskpane/lib/diagnostics-config.js` | Set `DIAGNOSTICS_INGEST_URL` to **live** Worker HTTPS origin (no trailing path junk) | ☐ |
| 3.2 | `manifest.hosted.xml` | Add Worker origin under `<AppDomains>` | ☐ |
| 3.3 | `manifest.hosted.xml` + `src/taskpane/taskpane.js` | Bump `<Version>` and `PROZAEDIT_BUILD_VERSION` to **2.0.0.16** **together** | ☐ |
| 3.4 | — | `bash scripts/verify-version-sync.sh` | ☐ |
| 3.5 | — | `npm test` | ☐ |
| 3.6 | — | Open PR; merge when CI green | ☐ |

---

## 4. Tester verification

| Step | Action | Done |
|------|--------|:----:|
| 4.1 | Re-upload `manifest.hosted.xml` once in Word on the web (test account) | ☐ |
| 4.2 | Settings → Privacy → opt-in **on** → **Report a problem** | ☐ |
| 4.3 | Confirm GitHub issue with label `auto-report` (or documented clipboard fallback) | ☐ |

---

## 5. Rollback (if needed)

| Situation | Action |
|-----------|--------|
| Ingest broken after publish | Clear `DIAGNOSTICS_INGEST_URL`; remove AppDomain if needed |
| Testers already on **2.0.0.16** | Rollback config + bump **2.0.0.17**; testers re-upload once |
| Never shipped **2.0.0.16** | Stay on **2.0.0.15**; revert PR only |

---

*PE-48: checklist only — no URL set, no manifest bump in prep PR.*
