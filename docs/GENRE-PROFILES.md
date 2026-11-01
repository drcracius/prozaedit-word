# Genre profiles (PE-81)

One registry (`src/taskpane/lib/genre-profiles.js`) drives every genre-dependent threshold, list and AI prompt note. Pick **What are you writing?** on the Target tab (Simple and Advanced); it is saved with the document. The default is **Fiction — General**. Reports state the profile applied. Advanced adds an optional **Specialist vocabulary** overlay (legal, medical, science, military).

## Why these seven
Romance, Mystery/Crime, Thriller/Suspense, Fantasy, Science Fiction, Literary/Drama and Historical are the largest commercial and book-club fiction categories and differ measurably in sentence length, dialogue share, tolerance for interior "filter" words, clichés and plausibility expectations. Legal/courtroom and comedy are not separate profiles: legal fiction is a thriller/mystery with specialist vocabulary (overlay), and comic timing is voice rather than a measurable norm. Non-fiction keeps four profiles: Memoir/general, Academic, Business, Technical/Journalism.

## What varies
Dialogue share band and average sentence length (overview benchmarks), long-sentence limit, long dialogue block, passive-voice cluster, reading-level slack, adverb/filter-word/tagged-adverb density limits, weak-cue words, muted rule families (e.g. plausibility in Fantasy), genre clichés, Coach tips, and the AI prompt note. Thriller and General reproduce the pre-PE-81 numbers, so existing documents see no new false positives from thresholds (the density and cliché checks are new, conservative, and marked low-confidence where noisy).

Legacy saved values map automatically (`Fiction (Thriller/Mystery/Crime)` stays Thriller). Not implemented: profanity/violence flags (needs owner policy), tense/POV auto-detection (too many false positives).
