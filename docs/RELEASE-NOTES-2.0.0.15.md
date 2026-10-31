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

---

*ProzaEdit Word hosted beta — https://github.com/drcracius/prozaedit-word*
