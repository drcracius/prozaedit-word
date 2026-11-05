# Agent work plan (what still needs to be built)

**Audience:** coding agent (not the owner).  
**Live build when this was written:** **2.0.0.42**.  
**Shipped in 2.0.0.43:** Phase A (named checks on the progress line and Checks rows), Phase B (cancel keeps finished cards), Phase C (those four docs updated). Phase D is already covered by the quiet-home tour rules.
**Shipped in 2.0.0.45:** Deep report runs local checks before any AI call. Cancel during those checks does not call AI. Cancel while waiting for AI keeps the local cards. A content-security policy is still not added. Phase F stays ask-first.  
**Out of scope here:** the owner’s own checks in real Word (Track Changes, real books, real AI keys, screen readers). Those stay off this list until the owner asks.

**Done already (do not redo):** quiet first screen (declutter passes 1, 2a, 3, 4, 5), welcome banners in Help, progress ring + Cancel on Run report, optional long-scan “Continue” off by default and tied to large scope (~80k characters).

---

## How to work each item

1. Smallest change that solves the item.
2. Keep web and desktop on the same files (`manifest.hosted.xml` and `manifest.xml` stay the same version as `PROZAEDIT_BUILD_VERSION`).
3. After code: `npm test`, `npm run verify:wiring`, `npm run check:contrast`.
4. Do not claim real Word behaviour was verified.
5. Stop and ask before starting a phase marked **Ask first**.

---

## Phase A — Progress while a report runs (do this first)

**Why:** Run report only says “reading” then “running checks.” The owner wants a clear sense of which check is happening, including checks that run one after another in one report.

**Build:**

1. Let the local report engine report a short name as each enabled check starts and finishes (grammar, repetition, and so on — only checks that are actually on).
2. Show that name on the existing progress strip (the spinning ring stays).
3. On the Checks tab, mark the check that is running (a small ring or “now” state). Finished checks in that run look done; checks that were off stay quiet.
4. If the user prefers less motion, the ring can sit still (same rule as the progress strip today).
5. Cancel still stops after the current step. Do not freeze the pane if a check throws — show the usual recovery line and turn the progress strip off.

**Done when:** a test run with several checks on shows names in order, Cancel clears the “now” marks, and automated tests cover the order and the failure path.

**Do not:** send text off the device, or add a second progress system beside the strip under the toolbar.

---

## Phase B — What Cancel means (do after A)

**Why:** Today Cancel wipes the in-progress report and asks the user to run again. A stopped-early summary is a product choice.

**Default recommendation (use this unless the owner says otherwise):**

- If the read from Word was cancelled before checks ran: no cards, status “Cancelled.”
- If some checks finished: keep those cards, add one line “Stopped early — not every check ran,” and list which checks did not run.
- Never apply edits by itself. Never leave Run stuck off.

**Done when:** tests cover cancel-during-read and cancel-after-at-least-one-check, and the progress strip and Run button recover.

---

## Phase C — Bring the written plans in line with the pane (can run beside A)

**Why:** Several docs still describe old banners, old version numbers, or “Continue” as the normal path.

**Update (facts only, no new features):**

| Doc | Fix |
| --- | --- |
| `docs/HANDOFF-DESKTOP.md` | Current build and test count; note welcome copy lives in Help; progress ring is the default for Run report |
| `docs/FINAL-MILE-PLAN-WEB.md` | Long-operation row: optional, off by default; Run report uses the progress strip |
| `docs/ui-proposals/declutter-expand/` | Passes 1–5 are on the live project; Pass 2b still not scheduled; banner note points at Help + progress ring |
| `docs/FINAL-READINESS-PE-96.md` | Non-fiction checks and the combined AI cancel/cache test are done in later builds — don’t list them as open code work |

**Done when:** a reader of those files would not look for a blocking “Long operation” banner on a normal Run report.

---

## Phase D — First-run still makes sense with a quiet home

**Why:** Top welcome banners are off. The short tour and the Checks checklist must not assume those banners are on screen.

**Build:**

1. Walk the first-open path in the automated pane tests (no real Word).
2. If the tour never appears, or appears on top of a hidden banner and then never, fix the order.
3. Help → “What’s new, tips & last session” stays the place for tips. Don’t put banners back on the home screen by default.

**Done when:** tests show a first-time user can reach Run report without a stuck overlay, and a returning user is not forced through the tour again.

---

## Phase E — Wording and noisy checks (after A–D)

**Why:** Some lines still say “audit” where the button says “Run report.” Some Advanced checks are known to be chatty.

**Build:**

1. User-visible sentences (buttons, status, Help, Settings) say **Run report** / **report**. Leave technical names inside the code.
2. Review Advanced rules called out as noisy (`rep:pair` and similar). Prefer hiding low-value hits in Simple view over deleting the rule, unless a test shows the rule is wrong.

**Done when:** a search of the pane’s visible text doesn’t teach two different names for the same button, and Simple view tests still pass.

**Wait for real writing samples before:** changing thresholds to match one person’s book. That input is not part of this plan.

---

## Phase F — Ask first (do not start unless asked)

| Item | What it is | Why it waits |
| --- | --- | --- |
| **Pass 2b lane groups** | Group Audit filter chips into clearer lanes | Optional declutter spike; can break card layout tests |
| **Side icon rail** | Extra column of tool icons from the old mock | Easy to crowd a narrow Word pane |
| **PDF / print as the main export** | Mock had a print button | No agreed export design |
| **Web fonts** | Mock used downloaded fonts | Project stays offline-friendly |
| **Richer citation matching** | Footnotes, DOI, fuller bibliography | Explicitly “later” in the old plan |
| **Second install file for a “next” channel** | Two versions side by side | Owner decision still open |
| **Cloud error reporting** | Optional worker | Needs a locked-down address and rate limit before any deploy |
| **Zipf rewrite, big quota screen, merged information architecture, live model lists** | Old vNext list | Not required for the core report loop |

---

## Phase G — Hardening that is still code (lower priority)

Do these after A–E, still without owner testing sessions:

1. **Content security policy** — add only in a way that can be turned off if Word’s pane blocks the app. Prove with the existing automated pane boot, not with a claim about Word.
2. **GitHub action versions pinned** — so the test workflow doesn’t drift.
3. **Narrow layout pass in code** — styles at about 320px wide in the contrast/layout checks we already run. Don’t claim a phone or Word pane was opened.

---

## Suggested order

```
A  Per-check progress
B  Cancel / stopped-early report
C  Doc sync          (can overlap A)
D  First-run vs quiet home
E  Wording + Simple-view noise
G  Hardening
F  Only if asked
```

## Explicitly not on this plan

- Owner checklist in Word (Apply, Track Changes, long manuscript, API keys, dark mode by eye, screen reader).
- Store listing, desktop install proof, beta emails.
- Rebuilding the whole pane from the old mock files.
