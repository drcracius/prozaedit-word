import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const LIBS = [
  "src/taskpane/lib/long-operation-controller.js",
  "src/taskpane/lib/settings-store.js",
  "src/taskpane/lib/text-metrics.js",
  "src/taskpane/lib/proper-noun-analyse.js",
  "src/taskpane/lib/manuscript-overview.js",
  "src/taskpane/lib/continuity-guard.js",
  "src/taskpane/lib/scope-reader.js",
  "src/taskpane/lib/manuscript-context-index.js",
  "src/taskpane/lib/audit-engine.js",
  "src/taskpane/lib/gemini-client.js",
  "src/taskpane/lib/config-guard.js",
  "src/taskpane/lib/lexical-shaper.js",
];

function loadPe(seed = {}) {
  const ProzaEdit = {};
  const sandbox = {
    ProzaEdit,
    AbortController,
    setTimeout,
    clearTimeout,
    Word: { Style: { heading1: "Heading1", heading2: "Heading2", heading3: "Heading3" } },
    ...seed,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const rel of LIBS) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), "utf8"), sandbox, { filename: rel });
  }
  return sandbox.ProzaEdit;
}

const FILLERS = [
  "the rain kept falling on the old road and nobody on the bridge said a word about the river",
  "he walked slowly past the shuttered market while the lamps flickered against the cold grey sky",
  "she folded the letter twice and slipped it behind the clock where the dust had settled long ago",
  "they waited near the harbour until the tide turned and the last of the boats drifted out to sea",
  "it was quiet in the kitchen except for the kettle and the slow ticking of the wall clock again",
];

function fillerParagraph(seed) {
  const parts = [];
  for (let k = 0; k < 4; k++) parts.push(`${FILLERS[(seed + k) % FILLERS.length]}.`);
  return parts.join(" ").replace(/^./, (c) => c.toUpperCase());
}

/** Heading + paragraphsPerChapter body paragraphs per chapter. */
function buildBook({ chapters, paragraphsPerChapter, plant = () => null, front = [] }) {
  const texts = [...front];
  const headings = [];
  let seed = 0;
  for (let c = 1; c <= chapters; c++) {
    headings.push(texts.length);
    texts.push(`Chapter ${c}`);
    for (let p = 0; p < paragraphsPerChapter; p++) {
      const planted = plant(c, p);
      texts.push(planted ? `${fillerParagraph(seed++)} ${planted}` : fillerParagraph(seed++));
    }
  }
  return { texts, headings };
}

function makeContext(book) {
  const items = book.texts.map((text, i) => ({
    text,
    styleBuiltIn: book.headings.includes(i) ? "Heading1" : "Normal",
    load() {},
  }));
  const state = { syncs: 0, items };
  const context = {
    document: { body: { paragraphs: { items, load() {} } } },
    async sync() {
      state.syncs++;
    },
  };
  return { context, state, items };
}

const wordTotal = (texts) => texts.reduce((n, t) => n + (t.match(/\b[\w'-]+\b/g) || []).length, 0);

test("MCI sampling: late-book names, time cues and years are captured on a 100k+ word manuscript", async () => {
  const pe = loadPe();
  const MCI = pe.ManuscriptContextIndex;
  const book = buildBook({
    chapters: 120,
    paragraphsPerChapter: 14,
    plant: (c, p) => {
      if (c === 2 && p % 5 === 0) return "Alderic Pryce nodded at the gate.";
      if (c >= 108 && p % 3 === 0) return "Zephyrina Quill turned to Marcus Valdane near the harbour wall.";
      if (c === 119 && p === 4) return "Years later, in 1987, the house was sold.";
      return null;
    },
  });
  assert.ok(wordTotal(book.texts) > 100000, "fixture must be 100k+ words");
  assert.ok(book.texts.join("\n").length > MCI.SAMPLE_TEXT_CAP * 4, "fixture must be far past the old 120k-char head window");
  const { context } = makeContext(book);
  const index = await MCI.buildFromDocument(context, { yieldFn: () => Promise.resolve(), dictionary: [], fiction: true });
  assert.ok(index.nameSeeds.includes("Alderic Pryce"), "early name captured");
  assert.ok(index.nameSeeds.includes("Zephyrina Quill"), "late-book name captured (was missed by head-only sampling)");
  assert.ok(index.nameSeeds.includes("Marcus Valdane"), "late-book name captured");
  assert.match(index.arcNotes, /years later/);
  assert.match(index.arcNotes, /1987/);
  assert.equal(index.truncated, true);
  assert.ok(index.sampleCoverage > 0 && index.sampleCoverage < 1);
  assert.equal(index.sections.length, 120);
  assert.match(index.summary, /§120 Chapter 120/, "outline keeps the ending of the book");
  assert.match(index.summary, /§1 Chapter 1/);
});

test("MCI sampler applies an even stride across the whole document (not the first 120k chars)", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const total = 4000;
  const sampler = MCI.createSampler(total);
  const para = "x".repeat(380);
  for (let i = 0; i < total; i++) sampler.offer(i, para);
  const st = sampler.stats();
  assert.ok(st.chars <= MCI.SAMPLE_TEXT_CAP + MCI.SAMPLE_PIECE_CHARS * 2, "cap respected");
  assert.ok(st.indexes[0] <= 1);
  assert.ok(st.indexes[st.indexes.length - 1] >= total - 40, "sample reaches the end of the book");
  const decile = (i) => Math.floor((i / total) * 10);
  const perDecile = new Array(10).fill(0);
  st.indexes.forEach((i) => perDecile[decile(i)]++);
  assert.ok(Math.min(...perDecile) > 0, `every tenth of the book is represented: ${perDecile}`);
  const small = MCI.createSampler(50);
  for (let i = 0; i < 50; i++) small.offer(i, "short paragraph here");
  assert.equal(small.stats().coverage, 1, "small documents are sampled in full");
});

test("MCI: front matter before the first heading is its own section, not credited to the last chapter", async () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const book = buildBook({
    chapters: 3,
    paragraphsPerChapter: 3,
    front: ["A short dedication to everyone who waited.", "Copyright page text here."],
  });
  const { context } = makeContext(book);
  const index = await MCI.buildFromDocument(context, { yieldFn: () => Promise.resolve(), dictionary: [] });
  assert.equal(index.sections[0].index, 0);
  assert.match(index.sections[0].title, /Front matter/);
  const last = index.sections[index.sections.length - 1];
  assert.ok(!/dedication/i.test(last.firstSnippet), "front matter must not leak into the last chapter");
  assert.equal(index.sections.length, 4);
});

test("MCI: more chapters than MAX_SECTIONS are merged (end of book preserved), not dropped", async () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const book = buildBook({ chapters: 700, paragraphsPerChapter: 1 });
  const { context } = makeContext(book);
  const index = await MCI.buildFromDocument(context, { yieldFn: () => Promise.resolve(), dictionary: [] });
  assert.ok(index.sections.length <= MCI.MAX_SECTIONS);
  const last = index.sections[index.sections.length - 1];
  assert.equal(last.endPara, book.texts.length - 1, "last section reaches the final paragraph");
  assert.match(last.title, /Chapter 700/);
});

test("MCI rolling summary: fits the cap, keeps the opening and ending, shows an omission line", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const sections = Array.from({ length: 400 }, (_, i) => ({
    index: i + 1,
    title: `Chapter ${i + 1}`,
    wordCount: 900,
    povHint: "third-person",
    firstSnippet: "Opening line with enough words here to matter.",
    lastSnippet: "Closing beat for the section that ends it.",
  }));
  const summary = MCI.buildRollingSummary(sections, "Time cues: years later", 8000);
  assert.ok(summary.length <= 8000);
  assert.match(summary, /§1 Chapter 1/);
  assert.match(summary, /§400 Chapter 400/);
  assert.match(summary, /omitted from this outline/);
  assert.match(summary, /Time cues: years later/, "cues are never cut");
});

test("Staleness: in-paragraph edits with the same paragraph count are detected (per-paragraph probe hashes)", async () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const book = buildBook({ chapters: 6, paragraphsPerChapter: 5 });
  const { context, items } = makeContext(book);
  const index = await MCI.buildFromDocument(context, { yieldFn: () => Promise.resolve(), dictionary: [] });
  assert.ok(index.probeSig.length > 0 && index.contentHash);
  assert.ok(index.sections.every((s) => s.hash), "every chapter has a content hash");

  let res = await MCI.checkFreshness(context, index);
  assert.equal(res.state, "fresh");
  assert.equal(res.reason, "ok");

  items[9].text = `${items[9].text} A brand new sentence was typed here.`;
  res = await MCI.checkFreshness(context, index);
  assert.equal(res.state, "stale");
  assert.equal(res.reason, "edited");
  assert.ok(res.changedSections.length >= 1);
  assert.equal(MCI.isFresh(index, items.length), true, "legacy count-only check still says fresh (this is the old blind spot)");

  items.pop();
  res = await MCI.checkFreshness(context, index);
  assert.equal(res.state, "stale");
  assert.equal(res.reason, "count");

  const legacy = { ...index, probeSig: "" };
  const { context: ctx2 } = makeContext(book);
  assert.equal((await MCI.checkFreshness(ctx2, legacy)).reason, "count-only");
});

test("Staleness: a stale index is INCLUDED in the prompt block, flagged; fresh is not flagged", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const index = MCI.mergeBuiltPayload({
    sections: [{ index: 1, title: "One", wordCount: 10, firstSnippet: "a", lastSnippet: "b" }],
    sampleText: "Marcus Valdane met Zephyrina Quill. Marcus Valdane left.",
    paragraphTotal: 10,
    fiction: true,
  });
  const stale = MCI.injectPromptBlock(index, { freshness: { state: "stale", reason: "edited" }, destination: "gemini" });
  assert.match(stale, /may be out of date/);
  assert.match(stale, /included in this Gemini request/);
  assert.match(stale, /not an AI summary/);
  const fresh = MCI.injectPromptBlock(index, { freshness: { state: "fresh" }, destination: "gemini" });
  assert.ok(!/out of date/.test(fresh));
  assert.equal(MCI.injectPromptBlock(index, { freshness: "stale", dropStale: true }), "");
  const local = MCI.injectPromptBlock(index, { freshness: "fresh" });
  assert.match(local, /stays on this device/);
  const badge = MCI.formatStatusBadge(index, { state: "stale", reason: "edited", changedSections: [1] });
  assert.match(badge.text, /may be out of date/);
  assert.match(badge.text, /refresh/i);
});

test("Storage: oversize index degrades visibly from the middle, keeps edges, and fits the cap", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const sections = Array.from({ length: 500 }, (_, i) => ({
    index: i + 1,
    title: `Chapter ${i + 1}`,
    wordCount: i === 250 ? 5 : 1000 + (i % 7),
    povHint: "third-person",
    firstSnippet: "f".repeat(150),
    lastSnippet: "l".repeat(150),
    hash: "abc123",
    startPara: i * 10,
    endPara: i * 10 + 9,
  }));
  const index = MCI.mergeBuiltPayload({ sections, sampleText: "Marcus Valdane", paragraphTotal: 5000, truncated: true, fiction: true });
  const full = MCI.estimateJsonChars(index);
  assert.ok(full > MCI.MAX_STORED_JSON_CHARS, "fixture exceeds the storage cap");
  const ser = MCI.serializeForStorage(index);
  assert.ok(ser.json.length <= MCI.MAX_STORED_JSON_CHARS, `stored ${ser.json.length} chars`);
  assert.equal(ser.trimmed, true);
  const stored = ser.index;
  assert.ok(stored.droppedSections > 0);
  assert.equal(stored.sectionTotal, 500);
  assert.match(stored.storageNote, /trimmed/);
  assert.equal(stored.sections[0].index, 1, "opening kept");
  assert.equal(stored.sections[stored.sections.length - 1].index, 500, "ending kept");
  assert.ok(!stored.sections.some((s) => s.index === 251) || stored.droppedSections > 0);
  assert.match(stored.summary, /§500 Chapter 500/, "outline text still ends with the last chapter");
  const round = MCI.parseStored(ser.json);
  assert.equal(round.problem, "");
  assert.equal(round.index.sectionTotal, 500);
  assert.match(MCI.formatStatusBadge(round.index, { state: "fresh" }).text, /trimmed for storage/);
});

test("Storage: parseStored handles envelope, legacy bare index, corrupt, oversized and newer versions", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const index = MCI.mergeBuiltPayload({
    sections: [{ index: 1, title: "One", wordCount: 10, firstSnippet: "a", lastSnippet: "b" }],
    sampleText: "Marcus Valdane met Zephyrina Quill.",
    paragraphTotal: 4,
  });
  const ser = MCI.serializeForStorage(index);
  assert.equal(MCI.parseStored(ser.json).problem, "");
  const legacy = { ...index, version: 1 };
  assert.equal(MCI.parseStored(JSON.stringify(legacy)).index.paragraphTotal, 4, "PE-77 bare index still loads");
  assert.equal(MCI.parseStored("{not json").problem, "corrupt");
  assert.equal(MCI.parseStored("x".repeat(MCI.MAX_RAW_STORED_CHARS + 1)).problem, "oversized");
  assert.equal(MCI.parseStored(JSON.stringify({ storageVersion: 99, index })).problem, "newer-version");
  assert.equal(MCI.parseStored([]).problem, "not-object");
  assert.equal(MCI.parseStored(null).index, null);
});

test("Settings.setAsyncGuarded rolls back a failed save so it cannot poison other keys", async () => {
  const bag = { PROZAEDIT_CONFIG: '{"ok":true}' };
  let failNext = false;
  const Office = {
    AsyncResultStatus: { Succeeded: "succeeded", Failed: "failed" },
    context: {
      document: {
        settings: {
          get: (k) => bag[k],
          set: (k, v) => {
            bag[k] = v;
          },
          remove: (k) => {
            delete bag[k];
          },
          saveAsync: (cb) => cb({ status: failNext ? "failed" : "succeeded" }),
        },
      },
    },
  };
  const { Settings } = loadPe({ Office });
  failNext = true;
  const ok = await Settings.setAsyncGuarded(Settings.KEYS.MCI, "x".repeat(10));
  assert.equal(ok, false);
  assert.equal(bag[Settings.KEYS.MCI], undefined, "staged value removed");
  assert.equal(bag.PROZAEDIT_CONFIG, '{"ok":true}', "main config untouched");
  failNext = false;
  assert.equal(await Settings.setAsyncGuarded(Settings.KEYS.MCI, "abc"), true);
  assert.equal(bag[Settings.KEYS.MCI], "abc");
  failNext = true;
  assert.equal(await Settings.setAsyncGuarded(Settings.KEYS.MCI, "def"), false);
  assert.equal(bag[Settings.KEYS.MCI], "abc", "previous good value restored");
});

test("MCI diffSections reports changed chapters between builds", async () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const book = buildBook({ chapters: 5, paragraphsPerChapter: 3 });
  const a = await MCI.buildFromDocument(makeContext(book).context, { yieldFn: () => Promise.resolve() });
  const book2 = { ...book, texts: [...book.texts] };
  book2.texts[book.headings[2] + 1] += " Edited.";
  const b = await MCI.buildFromDocument(makeContext(book2).context, { yieldFn: () => Promise.resolve() });
  const diff = MCI.diffSections(a, b);
  assert.deepEqual({ c: diff.comparable, ch: diff.changed, t: diff.total }, { c: true, ch: 1, t: 5 });
});

test("Gemini budget: instruction, question and the end of the excerpt survive; index is trimmed first with a visible note", () => {
  const { Gemini } = loadPe();
  const index = "I".repeat(9000);
  const excerpt = `START-OF-EXCERPT ${"x".repeat(40000)} END-OF-EXCERPT`;
  const built = Gemini.buildBudgetedPrompt([
    { id: "guardrails", text: "GUARDRAILS: be honest." },
    { id: "index", role: "index", text: index },
    { id: "excerpt", role: "excerpt", label: "TEXT:", text: excerpt },
    { id: "question", label: "Question:", text: "What is wrong with the pacing?" },
    { id: "closing", text: "Return ONLY the answer." },
  ]);
  assert.ok(built.text.length <= Gemini.MAX_PROMPT_CHARS);
  assert.ok(built.text.startsWith("GUARDRAILS: be honest."));
  assert.ok(built.text.endsWith("Return ONLY the answer."));
  assert.match(built.text, /What is wrong with the pacing\?/);
  assert.match(built.text, /START-OF-EXCERPT/);
  assert.match(built.text, /END-OF-EXCERPT/, "tail of the excerpt is kept");
  assert.match(built.text, /characters omitted from the middle/);
  assert.equal(built.trimmed[0].id, "index", "index is trimmed first");
  assert.equal(built.trimmed[0].to, 0);
  assert.match(built.note, /manuscript index left out/);
  assert.match(built.note, /instruction, question/);
  assert.equal(built.overBudget, false);
});

test("Gemini budget: nothing is trimmed (and no note) when everything fits; index shortened before excerpt is touched", () => {
  const { Gemini } = loadPe();
  const small = Gemini.buildBudgetedPrompt([
    { id: "g", text: "G" },
    { id: "index", role: "index", text: "outline" },
    { id: "excerpt", role: "excerpt", text: "short" },
  ]);
  assert.equal(small.note, "");
  assert.equal(small.trimmed.length, 0);
  const mid = Gemini.buildBudgetedPrompt([
    { id: "g", text: "G" },
    { id: "index", role: "index", text: "I".repeat(9000) },
    { id: "excerpt", role: "excerpt", text: "E".repeat(26000) },
    { id: "q", text: "Q?" },
  ]);
  const idx = mid.trimmed.find((t) => t.id === "index");
  assert.ok(idx && idx.to > 0 && idx.to < 9000, "index shortened rather than dropped");
  assert.ok(!mid.trimmed.some((t) => t.id === "excerpt"), "excerpt untouched when trimming the index suffices");
});

test("Gemini rewrite prompt keeps MODE/INSTRUCTION, the end of the text and the closing line on long selections", () => {
  const { Gemini } = loadPe();
  const text = `FIRST ${"w ".repeat(20000)} LAST`;
  const built = Gemini.buildRewritePromptDetailed("formal", text, "Type: Fiction", "RULES", "INDEX ".repeat(500));
  assert.ok(built.text.length <= Gemini.MAX_PROMPT_CHARS);
  assert.match(built.text, /MODE: formal/);
  assert.match(built.text, /INSTRUCTION: Rewrite in formal register/);
  assert.match(built.text, /LAST/);
  assert.ok(built.text.endsWith("Return ONLY the rewritten text."));
  assert.equal(typeof Gemini.buildRewritePrompt("fluency", "hi", "p", "g"), "string");
});

test("Gemini.generate never head-truncates: an oversized raw prompt keeps its end", async () => {
  let body = null;
  const { Gemini } = loadPe({
    fetch: (url, init) => {
      body = JSON.parse(init.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
      });
    },
  });
  const prompt = `INSTRUCTION-AT-START ${"m".repeat(60000)} QUESTION-AT-END?`;
  let trimmedInfo = null;
  await Gemini.generate("key-12345678", prompt, null, { onTrim: (t) => (trimmedInfo = t) });
  const sent = body.contents[0].parts[0].text;
  assert.ok(sent.length <= Gemini.MAX_PROMPT_CHARS);
  assert.match(sent, /INSTRUCTION-AT-START/);
  assert.match(sent, /QUESTION-AT-END\?/);
  assert.ok(trimmedInfo && trimmedInfo.removed > 0);
});

function auditCtx(pe, index, extra = {}) {
  return {
    manuscriptType: "Fiction (Thriller/Mystery/Crime)",
    chkProp: true,
    dictionary: [],
    mutedRules: [],
    manuscriptContextIndex: index,
    manuscriptContextFresh: true,
    reportDensity: "dense",
    criticPersona: "Average Reader",
    targetAudience: "Adult",
    language: "en-US",
    ...extra,
  };
}

test("Audit engine consumes the manuscript index: roster flags near-miss spellings of names from other chapters", () => {
  const pe = loadPe();
  const MCI = pe.ManuscriptContextIndex;
  const index = MCI.mergeBuiltPayload({
    sections: [{ index: 1, title: "One", wordCount: 10, firstSnippet: "a", lastSnippet: "b" }],
    sampleText: "Marcus Valdane spoke. Marcus waited. Marcus left. Brightwater was quiet. Brightwater slept.",
    paragraphTotal: 10,
    fiction: true,
  });
  assert.ok(index.nameSeeds.includes("Marcus"));
  const text = "Then Marcos opened the door to the quiet hall. Brightwater was far away.";
  const withIndex = pe.Audit.run(text, auditCtx(pe, index));
  const hit = withIndex.suggestions.find((s) => s.ruleId === "prop:roster:marcos");
  assert.ok(hit, "variant of a known name flagged");
  assert.equal(hit.replacementText, "Marcus");
  assert.equal(hit.type, "preference", "conservative: never a confirmed finding");
  assert.equal(withIndex.manuscriptContext.used, true);
  assert.ok(withIndex.manuscriptContext.namesUsed >= 1);

  const stale = pe.Audit.run(text, auditCtx(pe, index, { manuscriptContextFresh: false }));
  assert.ok(!stale.suggestions.some((s) => s.ruleId.startsWith("prop:roster")), "stale index is not used for name checks");
  assert.equal(stale.manuscriptContext.used, false);
  assert.equal(stale.manuscriptContext.indexPresent, true);

  const none = pe.Audit.run(text, auditCtx(pe, null));
  assert.ok(!none.suggestions.some((s) => s.ruleId.startsWith("prop:roster")));
});

test("Audit roster: no false positives on ordinary prose, exact known names, or words that also appear in lowercase", () => {
  const pe = loadPe();
  const MCI = pe.ManuscriptContextIndex;
  const index = MCI.mergeBuiltPayload({
    sections: [{ index: 1, title: "One", wordCount: 10, firstSnippet: "a", lastSnippet: "b" }],
    sampleText: "Marcus Valdane spoke. Marcus waited. Marcus left. Marcia smiled. Marcia sat.",
    paragraphTotal: 10,
    fiction: true,
  });
  const clean = "Marcus and Marcia walked home. They talked about the weather, the garden, and what happens next.";
  const res = pe.Audit.run(clean, auditCtx(pe, index));
  assert.ok(!res.suggestions.some((s) => s.ruleId.startsWith("prop:roster")), "both known names are exact matches");
  const common = pe.Audit.run("Then Marcel appeared. The marcel sat down quietly.", auditCtx(pe, index));
  assert.ok(!common.suggestions.some((s) => s.ruleId === "prop:roster:marcel"), "word used in lowercase is not treated as a name");
  const dict = pe.Audit.run("Then Marcos appeared.", auditCtx(pe, index, { dictionary: ["Marcos"] }));
  assert.ok(!dict.suggestions.some((s) => s.ruleId === "prop:roster:marcos"), "user dictionary wins");
});

test("Name seeds drop sentence-initial common words that also appear lowercase", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  const text = ["Suddenly the door opened.", "She said it suddenly.", "He ran suddenly.", "It ended suddenly.", "Suddenly again.", "Suddenly now.", "Marcus saw Marcus."].join(" ");
  const seeds = MCI.buildNameSeeds(text, []);
  assert.ok(seeds.includes("Marcus"));
  assert.ok(!seeds.includes("Suddenly"));
});

test("ContinuityGuard: short replace targets no longer match inside longer names (substring false positive)", () => {
  const { ContinuityGuard } = loadPe({ localStorage: { getItem: () => null, setItem: () => {} } });
  const index = { lowerSample: "", topNames: [{ name: "Theodore", count: 9 }, { name: "Anna Kowalski", count: 4 }] };
  const none = ContinuityGuard.assessReplace("the", "that", index, 5);
  assert.ok(!none.some((w) => w.title === "Possible character or place name"));
  const word = ContinuityGuard.assessReplace("Kowalski", "Kowalsky", index, 5);
  assert.ok(word.some((w) => w.title === "Possible character or place name"), "a whole-word part of a name still warns");
});

test("PE-77 behaviour kept: legacy count helpers remain", () => {
  const { ManuscriptContextIndex: MCI } = loadPe();
  assert.equal(MCI.paragraphCountHash(12), "p12");
  assert.equal(MCI.probeIndexes(5, 300).length, 5);
  const probes = MCI.probeIndexes(10000, 300);
  assert.equal(probes.length, 300);
  assert.equal(probes[0], 0);
  assert.equal(probes[probes.length - 1], 9999);
});

test("Shaper is inactive in Simple view even when its (hidden) panel was left open in Advanced", () => {
  const panel = { open: true };
  const body = { classList: { contains: (c) => c === "pe-simple-mode" } };
  const document = { body, getElementById: () => panel };
  const { LexicalShaper } = loadPe({ document });
  assert.equal(LexicalShaper.isShaperPanelActive(), false);
  body.classList.contains = () => false;
  assert.equal(LexicalShaper.isShaperPanelActive(), true);
});

test("ScopeReader.listChapters reads styles in bounded batches and loads text only for headings", async () => {
  const { ScopeReader } = loadPe();
  const total = 2300;
  const loads = { style: 0, text: 0 };
  const headingAt = new Set([0, 700, 1500]);
  const items = Array.from({ length: total }, (_, i) => ({
    _style: headingAt.has(i) ? "Heading1" : "Normal",
    _text: headingAt.has(i) ? `Heading ${i}` : "body",
    styleBuiltIn: undefined,
    text: undefined,
    load(props) {
      const list = Array.isArray(props) ? props : [props];
      if (list.includes("styleBuiltIn")) loads.style++;
      if (list.includes("text")) loads.text++;
      this._pending = list;
    },
  }));
  let maxPerSync = 0;
  let sinceSync = 0;
  const context = {
    document: { body: { paragraphs: { items, load() {} } } },
    async sync() {
      maxPerSync = Math.max(maxPerSync, sinceSync);
      sinceSync = 0;
      items.forEach((it) => {
        if (it._pending) {
          if (it._pending.includes("styleBuiltIn")) it.styleBuiltIn = it._style;
          if (it._pending.includes("text")) it.text = it._text;
          it._pending = null;
          sinceSync++;
        }
      });
      maxPerSync = Math.max(maxPerSync, sinceSync);
    },
  };
  const origSync = context.sync;
  context.sync = async function () {
    const pending = items.filter((it) => it._pending).length;
    maxPerSync = Math.max(maxPerSync, pending);
    return origSync.call(this);
  };
  const chapters = await ScopeReader.listChapters(context);
  assert.deepEqual(
    JSON.parse(JSON.stringify(chapters.map((c) => [c.index, c.title, c.startPara, c.endPara]))),
    [
      [1, "Heading 0", 0, 699],
      [2, "Heading 700", 700, 1499],
      [3, "Heading 1500", 1500, 2299],
    ]
  );
  assert.equal(loads.text, 3, "text loaded only for headings");
  assert.ok(maxPerSync <= 500, `no single sync loads more than one bounded batch (saw ${maxPerSync})`);
});
