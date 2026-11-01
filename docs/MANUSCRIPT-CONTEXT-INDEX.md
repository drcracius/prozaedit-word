# Manuscript Context Index (MCI)

ProzaEdit separates **audit scope** (what you analyze this run — one chapter, selection, pages) from **global manuscript context** (a lightweight full-document profile for Coach, Rewrite, continuity, and fiction modules).

> **What it is — and is not.** The index is a **local, heuristic outline**: chapter titles, word counts, first/last lines of each chapter, recurring character/place names, frequent words and time cues, and a rolling outline built from those pieces. It is **not an AI summary** and ProzaEdit does not call any model to build it. Nothing leaves your computer when you build it.

## Why use it?

Chapter-scoped audits are fast, but suggestions can miss story arc, name continuity, and long-range setup. MCI gives modules a capped outline and a roster of recurring names without forcing every audit to read the entire manuscript.

## Build the index

1. Open **Checks** (or **Target → Full manuscript context**, or **Settings → Manuscript context index**).
2. Click **Build full manuscript context**.
3. Confirm the dialog — ProzaEdit reads in **chunked sections** with cooperative yields. You can **Cancel** from the banner and keep using Word.
4. When finished, status shows **Full MS context ready** with a timestamp, plus how many chapters changed since the previous build.

### Whole-book coverage (PE-79)

- **Names, time cues and chapter structure** are collected from **every paragraph** of the document in a single pass — a character who first appears in chapter 40 of a 150,000-word book is in the roster.
- **Frequent words (motifs)** and the style/POV hints use an **evenly spaced sample across the whole book** (about 120,000 characters in 400-character pieces), never just the opening chapters.
- Front matter before the first heading is its own section (it is no longer credited to the last chapter).
- Documents without headings fall back to 80-paragraph blocks so long manuscripts still get a usable outline.
- Sentence-initial common words ("Suddenly", "Then") are filtered out of the name roster when the same word is mostly used in lowercase.

## Staleness (edit-aware)

The index stores a **per-chapter content hash**, a **document hash**, and a fingerprint of up to **300 evenly spaced probe paragraphs**.

- **Cancel and resume:** cancelling the build keeps finished batches in memory only; running it again resumes if the version, age (30 min), paragraph count and every batch-start hash still match, otherwise it restarts. Never written to the document.
- A cheap **freshness check** compares the live document with the index (paragraph count plus the probe paragraphs). It runs at most every 20 seconds, immediately before any Gemini request, after you Apply / Undo / Redo a fix, when you return to the pane, and at startup.
- Editing text **inside** a paragraph (same paragraph count) is detected whenever the edited paragraph is among the probes. Documents of up to 300 paragraphs are checked paragraph by paragraph; in larger documents an edit outside the probed paragraphs is only noticed when the paragraph count changes or you rebuild. When in doubt, rebuild — the status line says so.
- When the index may be out of date you see **"Manuscript index may be out of date — Refresh index"** on Checks, Coach and Rewrite, and in Settings; the changed chapters are named when known.
- A stale index is **never silently dropped** from Gemini prompts. It is still included, labelled *"may be out of date"*, and the pane tells you so. Local checks that could produce false flags (the audit name roster) use the index **only while it is fresh**.

## Storage

- Stored in its **own versioned settings key**, `PROZAEDIT_MCI_V2`, in this Word document's Office settings: `{ storageVersion: 2, savedAt, index }`. It is **no longer** part of `PROZAEDIT_CONFIG`, so a large index can never crowd out or corrupt your other settings.
- Cap: about **64,000 characters**. If a book needs more, ProzaEdit degrades gracefully, in this order: shorter chapter snippets → drop the **shortest middle chapter entries** first (the first three and last three chapter entries are always kept) → shorten the outline in the middle → keep only names, probes and the first/last chapters. Whatever is dropped is stated in the status line (*"N of M chapters not stored…"*).
- A failed or rejected save is **rolled back**: the previous value is restored, your main config is not touched, and the index keeps working until the pane closes (with a visible warning).
- **Migration:** documents saved by PE-77 (index inside `PROZAEDIT_CONFIG.manuscriptContext`) are read as before and moved to the new key automatically on first load; the old copy is removed from the config.

## Privacy

- Building and storing the index is **local only**.
- **The index is sent to your chosen AI provider when you use an AI action** (Coach → Send via AI, Deep audit, AI rewrite) — as a labelled block in the prompt. If you do not want that, do not use Gemini, or do not build the index. Local audit, local Coach and local Rewrite never contact Gemini.
- The Settings and Gemini panels state this in plain words; see also [PRIVACY-AND-DATA-PE.md](./PRIVACY-AND-DATA-PE.md).

## Settings

| Control | Default | Behavior |
|---------|---------|----------|
| **Auto-refresh context before audit (when stale)** | Off | When on, a stale/missing index triggers a background rebuild before **Run audit** (one-time warning). |

## Consumption

When the index is **fresh**, ProzaEdit injects the outline and arc notes into:

- Local **audit** context (chapter scope still applies to findings). The **name roster** adds conservative, low-severity "possible spelling variant of *Name*" suggestions (e.g. *Marcos* vs the recurring *Marcus*) — never a confirmed finding, never for words in your dictionary or words that also appear in lowercase.
- **Coach** and **Rewrite** profile text
- **Gemini** prompts (also when stale, flagged)
- **Continuity warnings** before Apply (names matched as whole words)

## AI prompt budget

A single AI request is capped (about 32,000 characters). The prompt is built from labelled parts instead of cutting the tail off:

1. The **instruction** is always kept.
2. Your **question** and the **excerpt**, including the **end of the excerpt**, are kept.
3. The **index** is trimmed first, then the extra context, then the **middle** of the excerpt as a last resort.
4. Whenever something is trimmed, the pane shows a note (*"Manuscript index shortened to fit"*) so you know what the model did not see.

## Limits (honest caps)

| Item | Cap |
|------|-----|
| Rolling outline | 8,000 characters |
| Arc notes | 2,000 characters |
| Stored JSON | 64,000 characters (degrades as above) |
| Chapters stored | up to 600 |
| Structure-only threshold | 12,000+ paragraphs → structure and snippets only for motifs |
| Sample for frequent words | 120,000 characters, evenly spaced across the book |
| Probe paragraphs for freshness | 300 |
| Recurring names kept | 60 |

## Known limits / not yet validated

- Probe-based freshness cannot see every edit in very large documents (see above); a rebuild always re-reads everything.
- Timings on very large documents in real Word (desktop and Word on the web) have not been measured by the maintainers; the build is cancellable.
- The continuity warning's own name index (a separate, older store) still samples the start of long books. See the PE-78 report, "Fixed in PE-79".

See also [RELEASE-NOTES-PE-77-MANUSCRIPT-CONTEXT.md](./RELEASE-NOTES-PE-77-MANUSCRIPT-CONTEXT.md) and [RELEASE-NOTES-PE-79-WORD-FIXES.md](./RELEASE-NOTES-PE-79-WORD-FIXES.md).
