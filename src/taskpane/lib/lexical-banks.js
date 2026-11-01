/* Shared lexical lists — single source for audit, rewrite, and shaper (Phase 3). */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const PLEONASMS = [
    ["unexpected surprise", "surprise"],
    ["end result", "result"],
    ["close proximity", "proximity"],
    ["final outcome", "outcome"],
    ["absolutely essential", "essential"],
    ["past history", "history"],
    ["completely eliminate", "eliminate"],
    ["repeat again", "repeat"],
    ["exact same", "same"],
    ["free gift", "gift"],
    ["honest truth", "truth"],
    ["true facts", "facts"],
    ["two twins", "twins"],
    ["new innovation", "innovation"],
    ["added bonus", "bonus"],
    ["join together", "join"],
    ["return back", "return"],
    ["returned back", "returned"],
    ["revert back", "revert"],
    ["basic fundamentals", "fundamentals"],
    ["advance planning", "planning"],
    ["advance warning", "warning"],
    ["blend together", "blend"],
    ["collaborate together", "collaborate"],
    ["connect together", "connect"],
    ["merge together", "merge"],
    ["general consensus", "consensus"],
    ["past experience", "experience"],
    ["sum total", "total"],
    ["very unique", "unique"],
    ["foreign imports", "imports"],
  ];

  /** Idiomatic doublets: usually deliberate, so shown only in Advanced (low confidence) and never auto-rewritten. */
  const PLEONASMS_SOFT = [
    ["future plans", "plans"],
    ["each and every", "each"],
    ["null and void", "void"],
    ["reason why", "reason"],
  ];

  const AI_PHRASES = [
    "delve",
    "tapestry",
    "testament",
    "beacon",
    "nestled",
    "realm",
    "moreover",
    "furthermore",
    "it is important to note",
    "in today's world",
    "ever-evolving",
    "underscores",
    "pivotal",
    "robust",
    "multifaceted",
    "game-changer",
    "holistic",
    "paradigm",
    "synergy",
    "leverage",
  ];

  const SPOILER_PHRASES = [
    "little did he know",
    "little did she know",
    "unbeknownst",
    "would soon learn",
    "would later discover",
    "unknown to him",
    "unknown to her",
    "what they didn't know",
  ];

  /** Strunk-style wordiness pairs — local rewrite + style hints. */
  const WORDINESS = [
    ["in order to", "to"],
    ["due to the fact that", "because"],
    ["at this point in time", "now"],
    ["in the event that", "if"],
    ["a number of", "several"],
    ["prior to", "before"],
    ["subsequent to", "after"],
    ["with regard to", "about"],
    ["in spite of the fact that", "although"],
    ["for the purpose of", "to"],
  ];

  const INFORMAL_TO_FORMAL = [
    ["get", "obtain"],
    ["got", "obtained"],
    ["a lot of", "many"],
    ["kind of", "somewhat"],
    ["sort of", "somewhat"],
  ];

  const CONTRACTIONS = {
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "cannot",
    "won't": "will not",
    "wouldn't": "would not",
    "shouldn't": "should not",
    "couldn't": "could not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "here's": "here is",
    "i'm": "I am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "i've": "I have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "I will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
  };

  /** Audit extended-pass filler tokens (preference cards only). */
  const EXTENDED_FILLERS = [
    ["actually", "(cut filler)"],
    ["basically", "(cut filler)"],
    ["literally", "(cut unless literal)"],
    ["just", "(cut if redundant)"],
    ["really", "(cut if redundant)"],
    ["very", "(cut or pick stronger word)"],
  ];

  /** Shaper / density axis — decorative intensifiers (Phase 3 uses local passes, not Zipf yet). */
  const DENSITY_FILLERS = [
    "very",
    "really",
    "quite",
    "somewhat",
    "rather",
    "extremely",
    "totally",
    "utterly",
    "incredibly",
  ];

  /** vNext seed data — wired in shaper v2+; kept here for one curated source. */
  const VIVID_VERB_MAP = {
    "walked slowly": "ambled",
    "walked quietly": "crept",
    "ran quickly": "sprinted",
    "shouted loudly": "bellowed",
    "looked closely": "scrutinized",
    "shone brightly": "blazed",
    "ate hungrily": "devoured",
    "spoke softly": "murmured",
    "breathed heavily": "gasped",
    "closed forcefully": "slammed",
    "held tightly": "clasped",
    "moved hesitantly": "faltered",
  };

  const MODIFIER_TIERS = {
    literaryToSimple: [
      { literary: "effulgent", simple: "radiant" },
      { literary: "perspicacious", simple: "insightful" },
      { literary: "ebullient", simple: "cheerful" },
      { literary: "tenebrific", simple: "gloomy" },
      { literary: "inimical", simple: "hostile" },
      { literary: "pulchritudinous", simple: "beautiful" },
    ],
    simpleToLiterary: [
      { simple: "clear", literary: "lucid" },
      { simple: "dark", literary: "somber" },
      { simple: "tired", literary: "enervated" },
      { simple: "noisy", literary: "cacophonous" },
      { simple: "stubborn", literary: "intransigent" },
      { simple: "brief", literary: "ephemeral" },
    ],
  };

  root.LexicalBanks = {
    PLEONASMS,
    PLEONASMS_SOFT,
    AI_PHRASES,
    SPOILER_PHRASES,
    WORDINESS,
    INFORMAL_TO_FORMAL,
    CONTRACTIONS,
    EXTENDED_FILLERS,
    DENSITY_FILLERS,
    VIVID_VERB_MAP,
    MODIFIER_TIERS,
  };
})(typeof window !== "undefined" ? window : globalThis);
