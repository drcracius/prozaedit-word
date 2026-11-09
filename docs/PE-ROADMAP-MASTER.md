# ProzaEdit — phase plan to the best possible product

**Audience:** owner + coding agent.  
**Start from:** restore point **2.0.0.65** (`v2.0.0.65`, `pre-master-engine-v4`).  
**Agent implementation through Phase 6:** working copy **2.0.0.68** (`prozaedit-master-engine.js` loaded; `audit-engine.js` still the orchestrator). Phase 0 and Phase 7 stay owner Word checks.

## Status vs this plan (2.0.0.68)

| Phase | Agent code | Still missing |
|-------|------------|----------------|
| 0 Word proof | — | Owner Track Changes, keys, real manuscript FPs |
| 1 Lexicon | Done (banks + inventory) | Owner licence call on Wikipedia/EU/proselint |
| 2 Master in pane | Done (script + `contributeSupplemental`) | Live path does **not** replace `Audit.run` with `AuditPipeline.audit()` (would double-scan banks). Dialogue blanking still uses `blankQuotedSpeech` (safer for stray quotes). Dialogue tools now read quoted spans. |
| 3 Lanes | Done (chips, `.lane`, coach) | Owner click-through in Word |
| 4 Heuristics | Live extra pass = unique master checks (POS, tag-adverbs, similar names, echoes, prefixes). Wordiness/hidden verbs stay on the style-guide path (one scan). Rewrite uses the same banks. Extra pass skips bank-hydrated singles. | Owner: if Simple still looks quiet on a real book, keep it; extra notes show in Advanced |
| 5 Simpler Run | Done: Simple hides core + fiction check lists (`ids` kept); More checks still has timeline/citations | Owner first-run with a non-technical tester |
| 6 Delete duplicates | Hydrate from banks only | Files not deleted (`audit-engine.js` still the orchestrator) |
| 7 Launch | USER-GUIDE lanes note | Owner re-test Word, testers, CSP/diagnostics |

**Freeze/crash (agent, 2.0.0.66 working copy):** master scans are capped; empty-regex loops cannot spin; extra master pass cannot crash a report. A thrown check no longer aborts the rest of Run — finished cards stay. Hedge scan, name, capitalisation, continuity, timeline, citation, Apply occurrence, and leftover exec loops have lastIndex + iteration caps. Contrast gate runs in CI. Desktop and web still share one pane and matching manifest versions.

**Highest-level core still owner-gated:** Track Changes Apply in real Word; one live key per AI provider; one 80k-word manuscript FP list; 320px/dark/keyboard; three testers.

**Not in the plans (and not built):** a story bible / intended-ending tracker that gates every suggestion. Plot, character, and continuity cards are pattern notes, not a read of the plot you meant.

**Next agent work (only after you try a real book in Word, or an explicit ask):** one-file cleanup (Phase 6). Do not delete `audit-engine.js` yet.  
**This file wins** over [ProzaEdit-Major Style and Lexical Update.md](./ProzaEdit-Major%20Style%20and%20Lexical%20Update.md) where they disagree. That older file is a **big-bang** sketch. This one is the **ordered** path.

**North star:** a Word-only, offline-first editor’s pane: one coherent local engine (your compiled master `.js` as the hub), genre-aware cards that stay quiet in Simple view, safe Apply, chapter walks for long books, optional BYO-key AI. Best result from the right AI at lowest cost; local first.

**Do not skip phases.** Do not delete `audit-engine.js` until Phase 6. Do not claim real Word was verified. Tag every ship. Owner cannot code — agent implements; owner tests in Word.

---

## End state (what “best PE” looks like)

| Surface | Best version |
|---------|----------------|
| **Engine** | `ProzaEdit.MasterEngine` owns dialogue immunity, Micro-POS, lexical tables, phrase scan, persona score, four **lanes** (Correctness, Clarity, Consistency, Craft). Remaining modules (genre/plot, MCI names, spell, AI-voice, house rules, timeline, citations) plug into the **same** `audit()` / `runWithProgress` contract. |
| **Run** | Simple: genre + language + one **Run report**. Advanced: extra scans (timeline, citations, extended local) behind one collapsible. Filter chips = All + four lanes. |
| **Cards** | Same Apply / Mute / Go to / More. Findings mapped to today’s `suggestions` shape (`ruleId`, confidence, verbatim `targetText`). |
| **Rewrite** | Replace list + local rewrite share the same banks. |
| **Trust** | Corpora stay green (Simple ≥ 0.85 precision). Licensed sources only ([STYLE-GUIDE-SOURCES.md](./STYLE-GUIDE-SOURCES.md)). |
| **Word** | Track Changes Apply proven by owner. Desktop + web usable. Mac best-effort. |

**Not in v1 of “best”:** AppSource (D14), auto-apply, comments/content controls (D13), bundler (D11), Hunspell, copying closed manuals.

---

## How your master `.js` is treated

The compiled file in `docs/ProzaEdit - Comprehensive Master Engine & Lexical Suite.js` is the **target core**, not a side experiment.

| Piece you compiled | When it goes live |
|--------------------|-------------------|
| Dialogue immunity, Micro-POS, bounded phrases, `MutationUtils` | **Phase 2** — shipped in `src/taskpane/lib/` |
| `LexicalRules` tables | **Phase 1–2** — become the canonical banks |
| `Heuristics` (names, proximity, prefixes, rhythm, tense/POV) | **Phase 3–4** — merge with existing modules, keep corpus gates |
| `AuditPipeline.audit()` + `summary.byLane` | **Phase 4–5** — orchestrator + UI |
| Persona / traffic | **Phase 4** — unified with existing score so numbers do not jump |

OneDrive Gemini lists (`ProzaEdit Style Rules (SOURCES)/gemini-code-*.js`) are **extra rows** for those tables after a licence filter — they do not replace the master file.

---

## Rules for every phase

1. Branch from the last tagged restore (start: `pre-master-engine-v4` / `v2.0.0.65`).
2. After code: `npm test`, `npm run validate:manifest`, `npm run verify:wiring`, `npm run check:contrast`, version bump per [HANDOFF-DESKTOP.md](./HANDOFF-DESKTOP.md) §6 **when publishing**.
3. Keep HTML `id` / tour / tooltip wiring unless the phase says otherwise.
4. Simple view still hides low-confidence cards.
5. Stop if corpora regress; fix before the next phase.
6. Owner Word checklist before calling a phase “done in the wild.”

---

## Phase 0 — Prove today’s pane (build stays 2.0.0.65 until you say ship)

**Why first.** The best engine on a pane that fails Track Changes or real books is not the best product.

**You (Word)**

1. Track Changes ON / OFF / “Only me”: Apply, accept, reject (desktop, web; Mac if you have it). [OWNER-CHECKLIST-2.0.0.26.md](./OWNER-CHECKLIST-2.0.0.26.md)
2. One API key per provider; note working model ids and any CORS failure.
3. One real long manuscript: Run report, chapter walk, Simple vs Advanced noise. Send false-positive cards (quote + genre).
4. Desktop install bats if you use a PC share ([DESKTOP-INSTALL.md](./DESKTOP-INSTALL.md)).
5. 320 px pane, light and dark, keyboard-only smoke.

**Agent (only if you report bugs)**

- Fix Apply / install / copy from those reports. Do not start Phase 2 until Track Changes either works or you accept the risk in writing.

**Done when:** checklist items 1–3 have a written result (pass / fail / defer). False positives captured for Phase 1 labels.

---

## Phase 1 — Honour the compile: inventory + licensed lexicon (2.0.0.71)

**Why.** Your master tables and OneDrive dumps become a **single bank**, without swapping the live engine yet.

**Agent**

1. Copy master engine into the repo as a **named artifact** (keep the docs copy until Phase 2 lands): list every `LexicalRules` array vs `lexical-banks.js` / `style-guide-rules.js`.
2. Spreadsheet or markdown table: phrase → lane → already in 2.0.0.65? → licence (plain / Strunk / GOV.UK / MS / Google / Red Hat / original / **blocked**).
3. **Import only approved new rows** into `lexical-banks.js` (hard vs soft pleonasms, uncomparables, extra plain-language phrases). Fix 2-column jargon rows to `[find, replace, explanation]`.
4. **Do not import:** wholesale `proselint:` dumps, EU jargon, Wikipedia puffery, until you add them to STYLE-GUIDE-SOURCES.
5. Re-run PE-90 / PE-93 / PE-96 / PE-99. Demote contested doublets (same as `PLEONASMS_SOFT`).

**You**

- Approve or reject any source not already in STYLE-GUIDE-SOURCES (especially Wikipedia MoS, EU, proselint-labelled rows).
- Review a short “new cards you will see” list.

**Done when:** banks contain the **union** of master lists + approved OneDrive deltas; corpora green; STYLE-GUIDE-SOURCES updated if anything new is licensed in.

**Do not:** load the master file from `taskpane.html` yet.

---

## Phase 2 — Promote master core into the add-in (2.0.0.76) — **your `.js` starts shipping**

**Why.** This is the pay-off for compiling the master file.

**Agent**

1. Move/adapt the master file to `src/taskpane/lib/prozaedit-master-engine.js`.
2. Link it in `taskpane.html` **before** `audit-engine.js`.
3. Fixes before wiring: uncomparables lane `"Style"` → **Craft** or **Clarity**; jargon tuples need explanations; `isFiction` uses `ProzaEdit.Genres.isFiction`.
4. `audit-engine.js` **calls** MasterEngine for: dialogue-stripped narration (fiction), bounded phrase hits, dialect pairs, Micro-POS homophone guards. Keep existing `ruleId` prefixes where a corpus test names them; otherwise add a map.
5. Keep `runWithProgress`, cancel, card cap (`reportDensity`), `_alignToDocumentCase`, MCI roster, genre mutes.
6. Tests: `tests/pe-98-master-core.test.mjs` (dialogue index parity, POS guard, phrase bounds) **plus** full suite.

**You**

- In Word: one fiction chapter with lots of dialogue — cards should not fire inside quotes for narration rules; Go to still lands on the right words.

**Done when:** `ProzaEdit.MasterEngine` is in the hosted pane; live audit still returns `{ suggestions, metrics, score, traffic }`; 515+ tests green.

**Do not:** delete `editor-heuristics.js`, `genre-checks.js`, `style-guide-rules.js`, or `audit-engine.js`.

**Rollback:** `git checkout v2.0.0.65`.

---

## Phase 3 — Lanes in the UI (2.0.0.83)

**Why.** Your 4-lane model becomes what people see, without ripping Checkboxes yet.

**Agent**

1. Map each existing `ruleId` / module → lane (Correctness, Clarity, Consistency, Craft). Content notes stay out of Style counts (current PE-87 rule).
2. Filter chips: All + four lanes (keep Simple/Advanced confidence behaviour).
3. Adapter: if a future `findings` array appears, `finalizeAudit` still consumes `suggestions`.
4. Local Coach: if last audit has `summary.byLane`, answer “what did you find?” from those counts.
5. Preserve tour `id`s; add one Help/What’s new line for lanes.

**You**

- Click filters on a real report. Confirm D9 wording if Simple labels change.

**Done when:** every card has a lane; filters work; wiring/contrast green.

**Do not:** remove Run-tab checkboxes in this phase (that is Phase 5).

---

## Phase 4 — Heuristics + scoring live in the pipeline (2.0.0.89)

**Why.** Name collisions, proximity, prefixes, tag-adverbs, rhythm from **your** `Heuristics` join MCI + genre instead of sitting unused.

**Agent**

1. Wire `scanProperNounCollisions` **after** fresh MCI roster + user dictionary (stale index = skip, same as today).
2. Port tag-adverbs / rhythm / tense-POV **only** where they beat or match `genre-checks.js` on corpora. If they add noise, keep them Advanced/low or drop that scanner.
3. Unify persona weights with `Audit.PERSONA_WEIGHTS` so scores do not jump vs 2.0.0.65.
4. `AuditPipeline.audit()` becomes the **inner** sync analyzer; `runWithProgress` still yields between **legacy module groups** (spell, plot, AI-voice, style packs, master phrase pass).
5. Expose `summary.byLane` on the result object.

**You**

- Same manuscript as Phase 0: note new noise. Send FPs.

**Done when:** master heuristics contribute cards; MCI freshness still gates names; corpora + owner FP list acceptable.

---

## Phase 5 — Streamline Run (checklist fatigue) (2.0.0.93)

**Why.** The old integration doc’s UI goal, **after** the engine is actually in the pane.

**Agent**

1. Simple Run: manuscript type, language, **Run report**. Engine gates rules from genre profile (already true for many checks).
2. Advanced: collapsible **Also scan** — Timeline, Citations, extended local / MCI-assisted names. Keep those as separate Word passes.
3. Remove or hide the 15+ individual Run checkboxes **only** if Advanced can still reach equivalent coverage (Settings or Advanced panel).
4. Keep `data-pe-tip` / onclick tour bindings; retarget copy if a checkbox id is removed (do not leave orphan tour steps).
5. What’s new + USER-GUIDE: “one Run, lanes on Fix.”

**You**

- First-run with a non-technical tester (handoff item 5).

**Done when:** Simple path ≤ 3 decisions; Advanced can still turn extra scans on; wiring gate passes.

---

## Phase 6 — Deprecate duplicate libs (2.0.1.0 candidate)

**Why.** Cleanup is last, not first. Only delete a file when **every** rule it owned has a home in MasterEngine + banks **and** corpora still pass.

**Order (one file per slice, tagged):**

1. Duplicate wordiness/pleonasm paths inside `audit-engine.js` (call banks only).
2. `lexical-banks.js` stays as data; master `LexicalRules` **reads** it (single source).
3. `style-guide-rules.js` — keep as **guide selection + attribution**; phrases come from banks.
4. `editor-heuristics.js` / `proper-noun-analyse.js` — after Phase 4 parity.
5. `genre-checks.js` — last among local checks (plot/tense/content notes).
6. `audit-engine.js` becomes a thin `run` / `runWithProgress` wrapper around `MasterEngine.AuditPipeline` + remaining satellites.

**Never fold into the master file:** `scope-reader.js`, `edit-apply.js`, `manuscript-context-index.js`, `citation-engine.js`, `chronology-engine.js`, AI clients. Those stay separate by design.

**Done when:** `taskpane.html` loads master + orchestrator + satellites; no duplicate phrase arrays; full test suite green; new restore tag `v2.0.1.0`.

---

## Phase 7 — Launch-quality (wider beta / 2.1)

**You**

1. Re-run Track Changes + keys on the new engine.
2. Full book chapter walk.
3. Three testers, Simple path.
4. Decide CSP trial and diagnostics worker (defaults: CSP off, worker not deployed).

**Agent (on request)**

- Tune from real FPs; optional Wikipedia/EU packs **only** if you licensed them in Phase 1.
- Rewrite/replace-list share banks.
- Privacy / USER-GUIDE / What’s new pass.
- AppSource still deferred unless you change D14.

**Done when:** handoff “wider beta” verdict is still true **and** owner Word gaps from Phase 0 are closed or accepted. Public store listing is a **separate** decision.

---

## Sequence (one line)

`0 Word proof → 1 licensed banks from your compile → 2 master.js in the pane → 3 lane UI → 4 heuristics+score → 5 simpler Run → 6 delete duplicates → 7 owner launch checks`

Suggested tags: `pe-98-lexicon`, `pe-98-master-core`, `pe-98-lanes`, `pe-98-heuristics`, `pe-98-run-ui`, `v2.0.1.0`.

---

## If something goes wrong

| Problem | Action |
|---------|--------|
| Corpora fail | Stop. Revert the slice. Do not start the next phase. |
| Word Apply breaks | Stop engine work. Fix Apply. |
| Too many new cards in Simple | Demote to low confidence or Advanced; do not delete the master file. |
| Need the pre-engine pane | `git checkout v2.0.0.65` / branch `pre-master-engine-v4` ([RESTORE-POINT-2.0.0.65.md](./RESTORE-POINT-2.0.0.65.md)) |

---

## What this plan refuses (on purpose)

- Pasting the master file in and deleting six libs in one PR ([Major Style and Lexical Update](./ProzaEdit-Major%20Style%20and%20Lexical%20Update.md) Phases 1–3 as written).
- Shipping Gemini OneDrive files as scripts.
- New genres, new AI vendors, auto-apply, or a bundler before Phase 7.

---

## Next action

**Owner:** in Word, try **Apply** with Track Changes on, and Run on a real chapter. Send any notes that fired on writing you consider fine.
