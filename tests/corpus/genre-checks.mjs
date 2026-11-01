import { CLEAN } from "./passages.mjs";

const PAST_BASE = ["general-fiction", "romance", "mystery-crime", "thriller-suspense", "fantasy", "historical"].map((k) => CLEAN[k]).join("\n\n");

const PRESENT_PARA = "Mara walks to the window and sees the rain. She knows he is lying. He says nothing, and she feels the silence settle. The room is cold, the clock is slow, and the street looks empty.";
const FLASHBACK_PRESENT_FRAME = "Years ago, she remembers, the house was full of noise. Her mother was singing and her father was laughing. They were happy then, and nobody knew what would come.";
const GENERIC_PRESENT = "It was an old town. Everyone knew that winter is long here and the river is cold, and nobody argued.";
const THIRD_WITH_I = "She crossed the bridge slowly. I can't do this, she thought, I can't, I won't, and my hands were shaking on the rail. I have to go back. I have to tell him. My heart was pounding. She stopped.";

const PRESENT_BASE = [
  "I wake before the light. The kettle ticks and I stand barefoot on the tiles. A bin lorry grinds past. Somewhere a child is crying, then laughing.",
  "I make the tea too strong. My sister texts, and I type yes, delete it, type maybe. The phone lies face-down beside the sugar bowl. The pigeons lift together and settle again.",
  "She is late, as she always is. The bus is full and the driver is silent. He knows her name, and he says nothing. We ride on while the city wakes up around us.",
  "He is waiting at the corner. The light is grey and the wind is cold. He sees her and he smiles, and she knows then that nothing is wrong, nothing at all.",
].join("\n\n");
const PAST_PARA_IN_PRESENT = "Yesterday she was late, and he was angry. She went to the door and said nothing. He took the keys and left, and she stood in the hall and felt the house go quiet. They were both too proud to speak.";

export const TENSE_POS = ["general-fiction", "romance", "mystery-crime", "thriller-suspense", "fantasy", "scifi", "historical"].map((g) => ({
  id: `${g}/tense-shift-past-to-present`, genre: g, text: `${PAST_BASE}\n\n${PRESENT_PARA}`, expect: ["tense:drift"],
}));
export const TENSE_POS_PRESENT_DOC = [{ id: "general-fiction/tense-shift-present-to-past", genre: "general-fiction", text: `${PRESENT_BASE}\n\n${PAST_PARA_IN_PRESENT}`, expect: ["tense:drift"] }];

export const TENSE_NEG = [];
for (const g of ["general-fiction", "romance", "mystery-crime", "thriller-suspense", "fantasy", "scifi", "literary-drama", "historical"]) {
  TENSE_NEG.push({ id: `${g}/tense-flashback-ok`, genre: g, text: `${PAST_BASE}\n\n${FLASHBACK_PRESENT_FRAME}`, expect: [] });
  TENSE_NEG.push({ id: `${g}/tense-generic-present-ok`, genre: g, text: `${PAST_BASE}\n\n${GENERIC_PRESENT}`, expect: [] });
  TENSE_NEG.push({ id: `${g}/tense-all-present-ok`, genre: g, text: PRESENT_BASE, expect: [] });
  TENSE_NEG.push({ id: `${g}/tense-past-only-ok`, genre: g, text: PAST_BASE, expect: [] });
  TENSE_NEG.push({ id: `${g}/tense-dialogue-present-ok`, genre: g, text: `${PAST_BASE}\n\n"Mara walks to the window. She sees the rain. She knows he is lying. He says nothing, and she feels the silence. The room is cold and the clock is slow," Tomas said.`, expect: [] });
}
export const TENSE_NONFICTION_NEG = ["nonfiction-memoir", "academic", "business", "technical-journalism"].map((g) => ({ id: `${g}/no-tense-check`, genre: g, text: `${CLEAN[g]}\n\n${PRESENT_PARA}`, expect: [] }));

export const POV_POS = [{ id: "general-fiction/pov-drift", genre: "general-fiction", text: `${PAST_BASE}\n\n${THIRD_WITH_I}`, expect: ["pov:drift"], advanced: true }];
export const POV_NEG = [
  { id: "general-fiction/pov-third-only", genre: "general-fiction", text: PAST_BASE, expect: [] },
  { id: "literary-drama/pov-first-person-ok", genre: "literary-drama", text: CLEAN["literary-drama"] + "\n\n" + CLEAN["nonfiction-memoir"], expect: [] },
  { id: "general-fiction/pov-dialogue-first-person-ok", genre: "general-fiction", text: `${PAST_BASE}\n\n"I told you I would go. I can't, I won't, my hands are shaking," she said to him, and he said, "I know, but I need you, I really do."`, expect: [] },
];

const SWEAR = `"Shit," he said. "Fuck this. I told you the bastard would run." Dana kicked the door. "Goddamn it, Pete, I'm done with this shit." `.repeat(1);
const FILLER = CLEAN["general-fiction"] + "\n\n" + CLEAN["thriller-suspense"] + "\n\n" + CLEAN["mystery-crime"];
const GORE = "The corpse lay in a pool of blood, the skull split open, the wound still bleeding. He had stabbed him twice and the blade was slick; she thought of the murder and the massacre and the torture, and the gore on the wall. ";

export const CONTENT_POS = [
  { id: "thriller/profanity", genre: "thriller-suspense", text: `${FILLER}\n\n${SWEAR}`, expect: ["content:profanity"], ctx: { contentNotes: true } },
  { id: "romance/violence", genre: "romance", text: `${FILLER}\n\n${GORE}${GORE}`, expect: ["content:violence"], ctx: { contentNotes: true } },
];
export const CONTENT_NEG = [
  { id: "thriller/profanity-off-by-default", genre: "thriller-suspense", text: `${FILLER}\n\n${SWEAR}`, expect: [] },
  { id: "thriller/violence-off-by-default", genre: "thriller-suspense", text: `${FILLER}\n\n${GORE}${GORE}`, expect: [] },
  { id: "thriller/mild-text-on", genre: "thriller-suspense", text: FILLER, expect: [], ctx: { contentNotes: true } },
  { id: "thriller/one-mild-word-on", genre: "thriller-suspense", text: `${FILLER}\n\n"Damn," he said. "Hell." She shrugged.`, expect: [], ctx: { contentNotes: true } },
];

export const SIMPLE_VISIBLE = [...TENSE_POS, ...TENSE_NEG, ...TENSE_NONFICTION_NEG, ...POV_NEG];
export const ADVANCED_ONLY = [...POV_POS, ...CONTENT_POS, ...CONTENT_NEG];
