# ProzaEdit — Recommended editing workflows

**Audience:** Authors using ProzaEdit Word (hosted beta **2.0.0.15**).  
**Live add-in:** [GitHub Pages task pane](https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html)

This document matches the in-pane **Quick start & editing stack** help. ProzaEdit is **local-first** for audit, coach, and rule-based rewrite; partner tools run inside or beside Word.

---

## Daily hosted workflow (no local server)

1. Open Word (web or desktop, same Microsoft account after one-time manifest upload).
2. **Home → ProzaEdit** (or **Insert → My Add-ins**).
3. **Target** — set manuscript type, scope, and style; settings save into the `.docx`.
4. **Checks → Run audit** (or toolbar **Run audit**).
5. **Audit** — filter cards, **Go to**, **Apply fix** / **Mute** / **Dict** as needed; **Undo** in the ProzaEdit toolbar for ProzaEdit replacements only.
6. Use Word **F7 / Editor** for spelling and grammar; use **Copy for Copilot** from Audit when you want generative help in Word.

After GitHub pushes to `src/` or `assets/`, close and reopen the task pane (Pages may cache 1–3 minutes). Re-upload `manifest.hosted.xml` only when `<Version>` changes on GitHub.

---

## Layered stack (order of passes)

| Layer | Tool | Role |
|-------|------|------|
| 1 | **ProzaEdit** | Heuristic audit cards, scope, fiction modules, optional timeline/citation scans, local coach/rewrite |
| 2 | **Word Editor (F7)** | Built-in spelling, grammar, clarity suggestions |
| 3 | **Copilot in Word** | Generative prose; paste context from **Copy for Copilot** |
| 4 | **PerfectIt** (if licensed) | Client house style after editorial passes |
| 5 | **Word Macro Tools** (Paul Beverley; if you use them) | FRedit-scale batch find/replace — **not bundled** with ProzaEdit |

ProzaEdit does **not** ship VBA macros or FRedit. Run macro tools on a **copy** or after Version History when doing large batch replaces.

---

## Fiction vs academic paths

- **Fiction:** Use **Checks → Timeline scan (beta)** for optional temporal anchors; keep **Continuity & Chronology** module on for audit cards. Partial scope may warn in the audit summary.
- **Academic / Business / Technical–Journalism:** Opt in on **Checks → Citation verify (beta)**; pattern assist only — not Chicago/AP/Bluebook certification. Fiction hides citation UI unless type changes.

---

## PC install options

| Method | When |
|--------|------|
| **Word on the web → Upload My Add-in** | Default for consumer M365; works on iPad after upload on web |
| **`Install-ProzaEdit-Desktop-GitHub.bat`** | Downloads latest [hosted manifest](https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml) and opens upload instructions |
| **Shared Folder catalog (advanced, Windows)** | **Deferred optional appendix (PE-2)**; primary path is web upload — see `scripts/install/README.md` and [FINAL-MILE-PLAN-WEB.md](./FINAL-MILE-PLAN-WEB.md) |

---

## Related docs

- Install: `docs/BETA-TESTERS-INSTALL.txt`, `docs/WHEN-YOU-RETURN.md`, `docs/BETA-SETUP-GITHUB.md`
- Attribution: `docs/THIRD-PARTY-ATTRIBUTION.md`
- Feature reference: `docs/prozaedit-features.md`
