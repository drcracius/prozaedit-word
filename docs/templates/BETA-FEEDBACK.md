# UX-4 beta feedback (Phase 2)

Use after **Phase 1** validation pass ([VALIDATION-LOG.md](./VALIDATION-LOG.md) decision **GO beta** or owner accepts known gaps).

**Sources:** 1–3 external testers and/or owner diary. Decision rules: [FINAL-MILE-PLAN-WEB.md](../FINAL-MILE-PLAN-WEB.md) Phase 2.

| Field | Value |
|-------|--------|
| **Date range** | |
| **Build** | 2.0.0.15 |
| **Respondents** | # |

---

## Five prompts

| # | Prompt | Response (summary) | PE-47? (Y/N/Maybe) | Decision / action |
|---|--------|-------------------|:------------------:|-------------------|
| 1 | After enabling **Simple mode**, did Audit defaulting to **Critical** help or confuse you? | | | |
| 2 | How long from opening the pane to your first **Apply fix** or **Undo**? | | | |
| 3 | Any mis-taps on audit cards (primary vs Mute/Dismiss)? | | | |
| 4 | Was the **Checks eligibility** callout clear for your manuscript type? | | | |
| 5 | Would you recommend ProzaEdit for daily drafting? What one thing would you change first? | | | |

---

## Roll-up

| Signal | Count | PE-47 action |
|--------|------:|--------------|
| Same friction ≥2 testers | | |
| Simple/Critical confusion | | Copy/banner tweak only |
| Shaper persistence bug | | Code + test |
| No clear pattern (≥3 responses) | | **No PE-47** — ship beta |

| **Phase 2 complete** | ☐ Yes · Date: |
| **Proceed to Phase 4 comms** | ☐ Yes (Phase 3 ingest optional anytime) |

---

## Scoring rubric — when to open PE-49 / PE-47 fix PR

Use **PE-47?** column per prompt, then apply this rubric before opening any fix PR (label work **PE-49** if tracker uses that id for post-beta fixes; same bar as plan **PE-47**).

| Score | Criteria | PE-47 / PE-49 action |
|:-----:|----------|----------------------|
| **0 — Ignore** | Isolated opinion, workaround exists, or cosmetic nit one tester | **No PR** — note in roll-up only |
| **1 — Watch** | Mentioned once, mild confusion (e.g. Simple/Critical wording) | **No PR** until second independent signal |
| **2 — Tweak** | ≥2 testers same friction **or** owner repro + agrees; fix is copy, banner, or tooltip only | **Yes — doc/copy PR**; re-run checklist section affected |
| **3 — Fix** | Reproducible functional bug (e.g. shaper not persisting, Cancel leaves UI stuck, scope chip mismatch) | **Yes — code PR + test**; partial validation re-run |
| **4 — Block** | Data loss, wrong text applied, privacy leak in diagnostics JSON | **HOLD beta**; fix before Phase 4 send |

### Decision shortcuts

| Pattern | Action |
|---------|--------|
| ≥2 testers, same control/theme | Score **2** or **3** depending on copy vs code |
| Simple/Critical confusion only | Score **2** — banner or hint copy; no IA change |
| Shaper sliders reset every session | Score **3** — CONFIG persistence + unit test |
| ≥3 responses, no repeated theme | Score **0** aggregate — **No PE-47**; ship beta |
| Mixed signals (1 tweak + 1 ignore) | **Maybe** — collect one more response before PR |

### GitHub optional

Structured thread: **New issue → Beta feedback (UX-4)** (`.github/ISSUE_TEMPLATE/beta-feedback.yml`).
