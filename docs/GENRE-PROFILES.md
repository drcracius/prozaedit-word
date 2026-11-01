# Genre profiles (PE-81)

One registry (`src/taskpane/lib/genre-profiles.js`) drives every genre-dependent threshold, list and AI prompt note. Pick **What are you writing?** on the Target tab (Simple and Advanced); it is saved with the document. The default is **Fiction — General**. Reports state the profile applied. Advanced adds an optional **Specialist vocabulary** overlay (legal, medical, science, military).

## Why these seven
Romance, Mystery/Crime, Thriller/Suspense, Fantasy, Science Fiction, Literary/Drama and Historical are the largest commercial and book-club fiction categories and differ measurably in sentence length, dialogue share, tolerance for interior "filter" words, clichés and plausibility expectations. Legal/courtroom and comedy are not separate profiles: legal fiction is a thriller/mystery with specialist vocabulary (overlay), and comic timing is voice rather than a measurable norm. Non-fiction keeps four profiles: Memoir/general, Academic, Business, Technical/Journalism.

## What varies
Dialogue share band and average sentence length (overview benchmarks), long-sentence limit, long dialogue block, passive-voice cluster, reading-level slack, adverb/filter-word/tagged-adverb density limits, weak-cue words, muted rule families (e.g. plausibility in Fantasy), genre clichés, Coach tips, and the AI prompt note. Thriller and General reproduce the pre-PE-81 numbers, so existing documents see no new false positives from thresholds (the density and cliché checks are new, conservative, and marked low-confidence where noisy).

Legacy saved values map automatically (`Fiction (Thriller/Mystery/Crime)` stays Thriller). 
## Genre-aware checks (PE-83)
- **Tense drift** (`tense:drift`, fiction only): needs >= 15 tense markers in the excerpt and >= 75% in one tense; flags a passage that is >= 85% the other tense with >= 3 markers. Dialogue/quoted text, flashback cues ("years ago", "remembered", "that summer", past-perfect clusters, letters/diary) are excluded. High confidence (visible in Simple) only for a pure shift of >= 5 markers in a >= 80% consistent text; Literary/Drama is always low confidence (tense play is common). Present-tense books are fine: the dominant tense defines the norm. Not detected: a past-tense passage inside a present-tense book that is below the 75% consistency bar.
- **POV drift** (`pov:drift`): >= 3 first-person words in narration (outside quotes) in a text that is clearly third-person (>= 4 paragraphs). Always low confidence (italic direct thought looks identical), hidden in Simple.
- **Content notes** (`content:profanity`, `content:violence`): opt-in (Settings -> Safety), informational wording, low confidence (hidden in Simple), excluded from the score, no replacement. Profanity: >= 3 occurrences. Violence: >= 6 words and density above a genre tolerance (per 1,000 words: Thriller/Mystery 9, Fantasy/Historical/Sci-Fi 8, Literary 5, General 5, Romance 4).
- Corpus gate: `tests/pe-83-corpus.test.mjs` (labeled passages in `tests/corpus/`) fails CI if Simple-view precision < 0.85 or recall < 0.90.

