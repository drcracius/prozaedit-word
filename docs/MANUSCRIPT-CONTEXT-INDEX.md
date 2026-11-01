# Manuscript Context Index (MCI)

ProzaEdit separates **audit scope** (what you analyze this run — one chapter, selection, pages) from **global manuscript context** (a lightweight full-document profile for Coach, Rewrite, continuity, and fiction modules).

## Why use it?

Chapter-scoped audits are fast, but suggestions can miss story arc, name continuity, and long-range setup. MCI gives modules a capped summary and name seeds without forcing every audit to read the entire manuscript.

## Build the index

1. Open **Checks** (or **Target → Full manuscript context**, or **Settings → Manuscript context index**).
2. Click **Build full manuscript context**.
3. Confirm the dialog — ProzaEdit reads in **chunked sections** with cooperative yields. You can **Cancel** from the banner and keep using Word.
4. When finished, status shows **Full MS context ready** with a timestamp.

On very long documents, ProzaEdit may **sample** paragraphs (structure + snippets). The badge notes **sampled** when applicable.

## Staleness

The index stores a **paragraph-count fingerprint**. If you add or remove substantial structure (paragraph count changes), the index is **stale** until you rebuild.

## Storage and privacy

- Stored in **`PROZAEDIT_CONFIG.manuscriptContext`** in this Word document’s Office settings.
- **Local only** — not sent to Gemini unless you trigger a Gemini action that includes the manuscript profile (Coach local mode does not use the cloud).
- Typical size is summarized in Settings (often a few KB; capped for safety).

## Settings

| Control | Default | Behavior |
|---------|---------|----------|
| **Auto-refresh context before audit (when stale)** | Off | When on, a stale/missing index triggers a background rebuild before **Run audit** (one-time warning). |

## Consumption

When the index is **fresh**, ProzaEdit injects summary + arc notes into:

- Local **audit** context (chapter scope still applies to findings)
- **Coach** and **Rewrite** profile text
- **Gemini** prompts that use `buildManuscriptProfile()`
- **Continuity warnings** before Apply (merged name seeds)

Help text: *Chapter audit uses full-manuscript context when index is fresh.*

## Limits (honest caps)

| Item | Cap |
|------|-----|
| Rolling summary | 8,000 characters |
| Arc notes | 2,000 characters |
| Stored JSON (approx.) | 48,000 characters (sections trimmed if needed) |
| Structure-only threshold | 12,000+ paragraphs → sampled snippets |
| Sample text for names/motifs | 120,000 characters |

See also [RELEASE-NOTES-PE-77-MANUSCRIPT-CONTEXT.md](./RELEASE-NOTES-PE-77-MANUSCRIPT-CONTEXT.md).
