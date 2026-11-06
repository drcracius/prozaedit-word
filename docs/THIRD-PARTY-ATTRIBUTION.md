# Third-party attribution and inspirations

ProzaEdit Word’s **audit, coach, rewrite, chronology, and citation logic** are original JavaScript in this repository. No third-party macro source code is copied into the add-in.

---

## APIs and services (network, user-initiated)

| Service | Use in ProzaEdit | Terms / notes |
|---------|------------------|---------------|
| **Microsoft Office.js / Word API** | Document read/write, task pane | [Microsoft Services Agreement](https://www.microsoft.com/servicesagreement) |
| **GitHub Pages + raw.githubusercontent.com** | Hosted UI and manifest update check | Public repo hosting |
| **Datamuse** (`api.datamuse.com`) | Thesaurus synonyms/antonyms | [Datamuse API](https://www.datamuse.com/api/) — no key required |
| **Google Gemini** (`generativelanguage.googleapis.com`) | Optional Coach, Rewrite, Deep Audit | **Your** API key only; not required for core product |

---

## Editorial inspirations (not code ports)

| Source | Relationship |
|--------|----------------|
| **Paul Beverley — Word Macro Tools** | Public proofreading **workflows** (e.g. FRedit-style batch ideas) informed heuristic categories in `editor-heuristics.js` and help copy. **No VBA or macro source is included.** |
| **Public style summaries** (plainlanguage.gov CC0, 18F CC0, GPO Style Manual 2016 public domain, GOV.UK OGL, Strunk 1920, Microsoft/Google/Red Hat) | Short **phrase lists** in `style-guide-rules.js` — not full style manuals or pasted guide text |
| **weasel-words** (Brian Ford, MIT, Copyright (c) 2014-2019) | A short hedge-word tally in `style-guide-rules.js`. The MIT terms stay with the copy. Full terms: [MIT License](https://github.com/btford/weasel-words/blob/master/LICENSE). |
| **APA / CMOS / Bluebook (names only)** | `citation-engine.js` uses regex/heuristic **pattern assist** — **not** compliance certification |

---

## Assets

| Asset | Origin |
|-------|--------|
| `assets/icon-32.png`, `assets/icon-64.png`, `assets/prozaedit-wordmark.jpg` | ProzaEdit project branding (repo) |

---

## What ProzaEdit is not

- Not a plagiarism or AI-detection product (heuristic flags only).
- Not a replacement for Word’s built-in proofing, optional batch macro workflows, or any separate add-in you choose to use (see `docs/WORKFLOWS.md`).

---

*Aligned with hosted build **2.0.0.53**.*
