# ProzaEdit Word — Release 2.0.0.15 (beta testers)

**Hosted build:** `2.0.0.15` (`manifest.hosted.xml` + task pane `PROZAEDIT_BUILD_VERSION`)

## What’s new

This release bundles **Phases 2–7** UI and docs work since the last manifest bump (`2.0.0.14`):

| Area | Highlights |
|------|------------|
| **UX (Phase 2)** | Central hover tips (`Show hover tips` on Target, default on); Editorial Studio color tokens |
| **Rewrite (Phase 3)** | Advanced **lexical shaper** (Complexity / Intensity / Density) when panel is open |
| **Checks (Phase 4–5)** | **Timeline scan** (fiction, beta) and **Citation verify** (academic/business/technical, beta) |
| **Install (Phase 6)** | `docs/WORKFLOWS.md`, `docs/THIRD-PARTY-ATTRIBUTION.md`, GitHub install scripts on `main` |
| **Audit export (Phase 7c)** | Report export module (plain text, new Word doc, `.txt` fallback) |
| **Gemini (Phase 7a-lite)** | Optional **session token ceiling** on Target (default **off**) |

Full behavior: [prozaedit-features.md](prozaedit-features.md). Roadmap: [prozaedit-implementation-plan-audited.md](prozaedit-implementation-plan-audited.md).

## One-time action after update

**Re-upload `manifest.hosted.xml` once** so Word registers version **2.0.0.15**:

1. Download [manifest.hosted.xml (raw)](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml).
2. Word on the web → **Insert** → **Add-ins** → **My Add-ins** → **Upload My Add-in** (often on a **new blank document** first).
3. Close and reopen the ProzaEdit task pane; use **Help → Check for updates** to confirm manifest and UI match.

After that, day-to-day use is still **Home → ProzaEdit**; UI updates load from GitHub Pages without re-upload until the next manifest bump.

## Quick smoke test (~5 min)

1. Target → confirm **Show hover tips** works (toggle off/on).
2. Checks → **Run audit** on a short selection → Audit → **Apply fix** → **Undo**.
3. Rewrite → open **Advanced lexical shaper** (if not in Simple mode) → local paraphrase on a highlight.
4. Help → **Check for updates** → should report manifest **2.0.0.15**.

## UX pack refresh (UX-1 → UX-3, no manifest bump)

These updates ship via **GitHub Pages** only — **no re-upload** of `manifest.hosted.xml` until the next ribbon or permission change.

| Phase | What changed |
|-------|----------------|
| **UX-1** | Fluent-style **16px icons** on sticky toolbar (Undo, Redo, Last edit, Run audit) and audit card primaries (Go to, Apply, Rewrite); **Simple mode** defaults Audit filter to **Critical**; workflow step 3 aligned with primary Run audit styling; **Rewrite** on cards selects text and opens Rewrite tab; **non-fiction** summary hints by manuscript type |
| **UX-2** | Help/doc **P1** fixes (`STYLE-GUIDE-SOURCES.md`, valid Target links); **active-checks hint** on Checks; stale **2.0.0.14** strings updated in WORKFLOWS / THIRD-PARTY |
| **UX-3** | **Canonical tooltips** — long copy in `tooltip-registry.js`, short native titles when hover tips are off; no duplicate `title` + `data-pe-tip` on toolbar/card primaries; **Mute / Dismiss** secondary-row icons |

**Quick UX smoke (~3 min):** Toggle **Simple mode** on Target → Audit chip **Critical** → run audit → card **Rewrite** → Undo. Toggle **Show hover tips** off/on; confirm toolbar buttons still have readable labels.

Details: [prozaedit-ux-9-implementation-plan.md](prozaedit-ux-9-implementation-plan.md) · Score: [prozaedit-ux-rating-and-recommendations.md](prozaedit-ux-rating-and-recommendations.md).

## UX pack 2 (PE-39, no manifest bump)

Ships via **GitHub Pages** only — same **2.0.0.15** manifest/UI version.

| Item | Notes |
|------|--------|
| Last tab | Saved in `PROZAEDIT_CONFIG.lastActiveTab` |
| Scope status line | Under toolbar; updates with scope + Refresh count |
| Settings | Group reset buttons, `style`/`privacy` deep links, `#pe-settings-*` hash, keyboard shortcuts |
| Session tips | Permanent hide in Settings → Safety |
| Audit hints | Report depth + default filter synced from Settings |
| QA | [prozaedit-five-pass-audit-beta-ready.md](prozaedit-five-pass-audit-beta-ready.md) · [FULL-TEST-CHECKLIST-WORD-WEB.md](FULL-TEST-CHECKLIST-WORD-WEB.md) |

Snippet: [RELEASE-NOTES-UX-PACK-2.md](RELEASE-NOTES-UX-PACK-2.md).

---

*ProzaEdit Word hosted beta — https://github.com/drcracius/prozaedit-word*
