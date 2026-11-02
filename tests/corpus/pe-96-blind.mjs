// PE-96 blind corpus #3: new styles (non-fiction subtypes, screenplay-like, YA, translated prose, ESL, essays, reports).
// Clean passages are what a human editor would leave alone in Simple view; planted ones get one mechanical defect.
const GF = "general-fiction", RO = "romance", MY = "mystery-crime", FA = "fantasy", SF = "scifi", LD = "literary-drama",
  HI = "historical", NM = "nonfiction-memoir", AC = "academic", BU = "business", TJ = "technical-journalism", TH = "thriller-suspense";

const G = (genre, category, texts) => texts.map((text) => [genre, category, text]);

export const PE96_CLEAN = [
  ...G(NM, "selfhelp", [
    "Start small. Pick one habit, attach it to something you already do, and keep the bar embarrassingly low for the first two weeks.",
    "Most people overestimate what they can do in a month and underestimate what they can do in a year. The trick is to stay in the game long enough for the small gains to add up.",
    "When you feel the urge to quit, write down what you were hoping for when you began. Then decide again, on purpose.",
    "Rest is not the opposite of work. It is part of the same cycle, and skipping it only borrows energy from tomorrow.",
    "Ask yourself a simple question at the end of each day: what went well, and what would I change? Two lines are enough.",
    "You do not need a perfect plan. You need a next step that is small enough to take before lunch.",
    "Notice who you spend your time with. Their habits quietly become your defaults.",
    "A list of ten goals is a wish. A list of one is a plan.",
    "If a task takes under two minutes, do it now. If it takes longer, give it a time and a place on your calendar.",
    "Progress rarely feels dramatic. It feels like Tuesday, repeated.",
    "Be kind to the version of you who started. They were working with less information.",
    "Tell one friend what you are trying to do. Accountability works best when it is slightly uncomfortable.",
  ]),
  ...G(NM, "travel", [
    "We reached Hoi An after dark, when the lanterns were already lit and the river smelled of woodsmoke and lemongrass.",
    "The ferry leaves at seven, which in practice means whenever the captain finishes his coffee.",
    "Breakfast was a bowl of noodles eaten on a plastic stool, and I have measured every breakfast since against it.",
    "The trail climbs steadily through pine forest before opening onto a ridge with views all the way to the sea.",
    "In Lisbon the hills are steep, the tiles are slippery in the rain, and the trams are worth every wobble.",
    "Locals will tell you the best time to visit is spring. Locals are right.",
    "The market opens at dawn. By nine the good fish is gone and the tourists have arrived.",
    "We slept in a converted barn above a vineyard, with the windows open and the dogs barking softly in the valley.",
    "Buses in the highlands run on a loose agreement with the weather. Pack a book.",
    "The old town is small enough to walk in an afternoon, but you will want to take longer.",
    "Carry cash. Cards are welcome in the city and treated with deep suspicion everywhere else.",
    "At the summit there is a bell. Ring it once for luck and once for the climb down.",
  ]),
  ...G(HI, "popularhistory", [
    "By the winter of 1709 the harvest had failed across most of France, and bread, the foundation of the poor man's diet, doubled in price within weeks.",
    "The treaty settled the border on paper. On the ground, farmers on both sides went on ploughing the same disputed fields for another generation.",
    "Few contemporaries understood what the new machines would mean. Fewer still lived to see the factories that followed.",
    "The expedition set out with three ships and returned with one, and the survivors disagreed about almost everything that had happened.",
    "Letters from the period suggest that ordinary soldiers cared less about the cause than about food, boots and news from home.",
    "The council met in secret, and its minutes survive only because a clerk disobeyed an order to burn them.",
    "Historians still argue about the numbers. What is not in doubt is the scale of the loss.",
    "Trade routes shaped the city long before any wall did. Spices, salt and rumour all arrived by the same road.",
    "The queen was fifteen when she was crowned, and she spent the next decade learning whom she could trust.",
    "Archaeologists found the well in 2003, sealed under a later cellar and still half full of pottery.",
    "The pamphlet sold out in a week. Its author, who had signed it with a false name, was arrested within the month.",
    "It would be easy to call the decision foolish. It looks less foolish once you read what the general knew at the time.",
  ]),
  ...G(TJ, "science", [
    "Researchers at the university report that the new coating cuts bacterial growth on hospital surfaces by about ninety percent in laboratory conditions.",
    "The telescope detected a faint, repeating signal from a galaxy roughly two billion light years away, though the team stresses that natural explanations remain likely.",
    "In simple terms, a battery stores energy by moving ions from one side to the other. Charging reverses the trip.",
    "Sleep, it turns out, is not a single state but a cycle, and each stage seems to do a different kind of repair.",
    "The study followed four thousand adults for twelve years, which makes it one of the longest of its kind.",
    "Coral reefs cover less than one percent of the ocean floor but support roughly a quarter of marine species.",
    "Engineers tested the bridge design by shaking a scale model on a table until something gave way.",
    "The results are preliminary and have not yet been peer reviewed, so they should be read with caution.",
    "Volcanic ash is not soft. Under a microscope it looks like tiny shards of glass, which is why it ruins engines.",
    "Bees can learn to recognize human faces, at least in the sense that they can tell some patterns apart after a short lesson.",
    "The mission will drill two metres into the surface and bring the sample home in a sealed capsule.",
    "Why do we yawn? Nobody knows for certain, although cooling the brain is one leading idea.",
  ]),
  ...G(TJ, "truecrime", [
    "At 2:40 a.m. a neighbor called the police to report a car idling outside the shuttered pharmacy. By the time officers arrived, it was gone.",
    "Court records show that the defendant changed his account of the evening three times in the first week.",
    "The detective kept the case file in a cardboard box under his desk for nineteen years.",
    "Investigators say the fire started in the back office, and that the accelerant was bought two days earlier.",
    "No one in the town remembers seeing her leave. Several remember seeing her arrive.",
    "The jury deliberated for eleven hours and returned with a verdict that surprised nobody in the room.",
    "A single fingerprint, lifted from a window latch, reopened the case in 2014.",
    "Her family has asked for privacy, and this report respects that request.",
    "The warrant was signed at dawn and executed before the first shift change.",
    "Witnesses described a tall man in a grey coat. Cameras showed a short man in a green one.",
  ]),
  ...G(NM, "biography", [
    "Born in a mill town in 1911, she left school at fourteen and taught herself bookkeeping from a borrowed manual.",
    "He was not an easy man to work for. He was, however, almost always right, which made him harder to resent.",
    "Her early letters show a young woman anxious about money and unashamed of her ambition.",
    "The family moved three times before he turned ten, and he later claimed that every house he lived in afterwards felt temporary.",
    "She never married, and she never apologized for it.",
    "Colleagues remember him as quiet in meetings and relentless afterwards.",
    "In her seventies she took up painting, and sold her first canvas for the price of a bus ticket.",
    "He kept a notebook in his coat pocket and wrote in it every evening, even during the war.",
  ]),
  ...G(AC, "humanities", [
    "This essay argues that the novel's structure reflects, rather than merely depicts, the instability of its narrator.",
    "Previous readings have focused on the colonial context. Here I propose that domestic space is equally significant.",
    "The argument proceeds in three stages. First, I outline the theoretical framework; second, I turn to the primary text; finally, I consider counterexamples.",
    "It would be a mistake to treat these letters as transparent evidence of the author's intentions.",
    "The distinction, though useful, risks obscuring the ways in which the two categories overlap.",
    "Taken together, these sources suggest a more cautious reading than the standard account allows.",
    "Scholars have long noted the poem's debt to earlier pastoral, but few have examined its departures from it.",
    "The following section examines how the term was adopted, adapted and eventually abandoned.",
    "I do not claim that this reading is exhaustive. I claim only that it accounts for details the others leave unexplained.",
    "The archive, as Derrida reminds us, is never neutral.",
  ]),
  ...G(AC, "scientific", [
    "Samples were centrifuged at 4,000 rpm for ten minutes and the supernatant was discarded.",
    "Participants (n = 212) were recruited through university mailing lists and received a small payment.",
    "The effect was significant in the treatment group (p < 0.01) but absent in controls.",
    "These findings should be interpreted cautiously, given the small sample and the absence of a long-term follow-up.",
    "We hypothesized that exposure would reduce response time. The data did not support this hypothesis.",
    "Figure 2 shows the distribution of scores before and after the intervention.",
    "All procedures were approved by the institutional review board, and informed consent was obtained.",
    "Further work is needed to determine whether the pattern holds in older populations.",
    "Missing values were handled by multiple imputation, and sensitivity analyses gave similar results.",
    "The model explained 38 percent of the variance, which is modest but comparable to earlier studies.",
  ]),
  ...G(BU, "report", [
    "Revenue grew 8 percent year on year, driven mainly by renewals in the mid-market segment.",
    "Three risks stand out: supplier concentration, a delayed product launch, and rising support costs.",
    "We recommend extending the pilot to two more regions before committing to a full rollout.",
    "The team met its delivery target in four of the last six sprints. The two misses were caused by the same dependency.",
    "Customer churn fell to 2.1 percent in the quarter, the lowest in three years.",
    "Next steps: finalise the budget by Friday, confirm headcount with finance, and schedule the board preview.",
    "This proposal asks for a modest investment now in return for a clear decision point in September.",
    "Please review the attached draft and send comments by Wednesday. Silence will be taken as approval.",
    "The main constraint is not budget but time. Every option below assumes a start date no later than March.",
    "Our competitors are cutting prices. We believe the better response is to improve onboarding, not to follow them down.",
  ]),
  ...G(BU, "email", [
    "Hi Priya, thanks for the quick turnaround. I have a couple of small edits and will send them tonight.",
    "Just a reminder that the office is closed on Monday. Please plan deliveries accordingly.",
    "Could we move Thursday's call to 3 p.m.? I have a conflict in the morning.",
    "Thank you for your patience while we looked into this. The refund was issued today and should arrive within five working days.",
    "Attached is the signed contract. Let me know if anything looks off.",
    "Welcome to the team. Your laptop will arrive on your first day, and Sam will walk you through setup.",
  ]),
  ...G(GF, "screenplay", [
    "INT. KITCHEN - NIGHT\n\nMARA stands at the sink. The tap runs. She does not turn it off.\n\nDANIEL (O.S.)\nYou're still up.\n\nMARA\nCouldn't sleep.",
    "EXT. HARBOUR - DAWN\n\nGulls wheel over the empty boats. A lone figure, TOM, sits on a crate, mending a net.\n\nTOM\nTide's late.",
    "INT. CAR - MOVING\n\nRain on the windshield. LENA grips the wheel. Beside her, her brother stares out of the window.\n\nLENA\nSay something.\n\nJAMIE\nWhat's there to say?",
    "INT. OFFICE - DAY\n\nA wall of monitors. DR. OKAFOR studies one of them, then taps the glass.\n\nDR. OKAFOR\nThat shouldn't be there.",
    "EXT. ROOFTOP - SUNSET\n\nTwo teenagers share a cigarette and neither of them is good at it.\n\nPRIYA\nDon't tell my mum.\n\nSAM\nWho would I tell?",
    "INT. DINER - NIGHT\n\nA waitress refills a cup without being asked. The man at the counter nods his thanks.",
  ]),
  ...G(GF, "ya", [
    "I was fifteen the summer my sister stopped talking to me, and I spent most of it pretending I hadn't noticed.",
    "Mr. Alvarez says we are not allowed to use phones in class. Mr. Alvarez has also never seen my group chat.",
    "Nobody tells you that the hardest part of changing schools is lunch. Where do you sit when every table is already someone's?",
    "The envelope was thin. That, I told myself, did not mean anything.",
    "Jess and I have been best friends since second grade, which is why it was so strange to feel like I was lying to her.",
    "I practised the speech in the shower, in the car, and under my breath at dinner. Then I opened my mouth and nothing came out.",
    "Dad says the farm is not for sale. Dad also says a lot of things before breakfast.",
    "Everyone at the party was pretending to have a better time than everyone else.",
    "There's a rule at my school: if you cry in the hallway, you walk fast and look at the lockers. I learned that on day one.",
    "My little brother thinks the moon follows our car. Honestly, tonight, I kind of believe him.",
    "She texted: you up? I stared at it for ten minutes and typed, yeah.",
    "The bus was late, my shoes were wet, and the test was first period. It was going to be a great day.",
  ]),
  ...G(LD, "translated", [
    "My grandmother used to say that the sea keeps what it is given. She said it every time someone left.",
    "In the evening the old men gathered under the plane tree and argued about politics, football and the price of olives, in that order.",
    "He had the habit of speaking to the dead as though they had only stepped into another room.",
    "The village lay in a fold of the mountains, so that the sun came late and left early, and people were pale and patient.",
    "She crossed herself, lit a candle, and said nothing, because there was nothing that had not already been said.",
    "It rained for nine days. On the tenth the river took the bridge, and no one was surprised.",
    "Mother kept the good plates in a cupboard for visitors who never came.",
    "The teacher walked in silence between the desks, and we understood that today the lesson was something else.",
    "They called him the Professor, though he had never finished school, because he read everything and forgot nothing.",
    "At night the city smelled of coal and wet stone, and from the window one could hear the last tram going home.",
    "I do not know why I am telling you this. Perhaps because the house is now empty, and the empty house asks questions.",
    "Winter came all at once, as it does in that country, like a door slammed in the next room.",
  ]),
  ...G(NM, "esl", [
    "My name is Linh and I am from Vietnam. I have been living in Canada for two years and I work in a bakery.",
    "Last weekend I went to the park with my friends. We played football and after that we ate pizza together.",
    "I think learning English is difficult, but every day I learn a little more. My teacher says I am improving.",
    "In my country, we celebrate the new year with our family. We cook special food and give small envelopes to children.",
    "I want to become a nurse because I like helping people. It is a hard job, but I believe it is important.",
    "Yesterday the weather was very bad, so I stayed at home and read a book about the history of Spain.",
    "My brother is older than me and he lives in Germany. We talk on the phone every Sunday.",
    "Please excuse my English. I am still studying, and I make many mistakes when I write.",
    "This is a picture of my family. My father is a driver and my mother is a teacher.",
    "When I arrived at the airport, I could not find my suitcase. A kind man helped me to speak with the staff.",
  ]),
  ...G(NM, "essay", [
    "There is a particular kind of silence that follows an argument in a small kitchen, and I have lived inside it more often than I would like.",
    "I have never trusted people who say they hate being busy. Busy is how most of us avoid the questions that matter.",
    "My father repaired watches for forty years, and he taught me that patience is mostly a matter of keeping your hands steady.",
    "We argue about the future as if it were a place. It is more like weather.",
    "I began to run at thirty-nine, badly, in borrowed shoes, on a path that smelled of wet leaves.",
    "Every neighbourhood has a house everyone knows the story of, and nobody tells it the same way twice.",
    "Grief is not tidy. It arrives out of order, like post redirected from three old addresses.",
    "The library closed at six. I stayed until the lights flickered, and the librarian, kindly, pretended not to notice.",
  ]),
  ...G(NM, "cookbook", [
    "Heat the oil in a heavy pan over medium heat. Add the onion and cook gently for ten minutes, until soft and golden.",
    "Stir in the garlic and spices and cook for one minute more. The kitchen should smell wonderful by now.",
    "Pour in the tomatoes, fill the empty tin halfway with water, and add that too. Season well.",
    "Let the sauce simmer for twenty minutes, stirring now and then, until it thickens.",
    "Serve with rice, a squeeze of lemon, and a spoonful of yoghurt if you like.",
    "This dish improves overnight, so make it the day before if you can.",
  ]),
  ...G(TJ, "news", [
    "The city council voted 7 to 2 on Tuesday to approve a new bike lane along Harbour Street, despite objections from several local businesses.",
    "Heavy rain is expected across the region on Friday, and the weather service has issued a flood watch for low-lying areas.",
    "The company said it would cut about 300 jobs by the end of the year, mostly in its logistics division.",
    "Voters in the district will go to the polls on 14 May to choose a replacement for the retiring member.",
    "A fire at a warehouse on the east side was brought under control early Monday. No injuries were reported.",
    "The museum will reopen next month after a two-year renovation, with free admission for the first week.",
    "Train services between the two cities were suspended for several hours on Sunday after a signalling fault.",
    "Local schools will start half an hour later in the autumn, following a vote by the district board.",
  ]),
  ...G(TJ, "technical", [
    "To install the package, run the command below from your project folder. The process takes about a minute.",
    "If the connection fails, check that the server address is correct and that your firewall allows outgoing traffic on port 443.",
    "The function returns a list of results, sorted by date. If no results are found, the list is empty.",
    "Before you begin, back up your data. The upgrade cannot be undone.",
    "Each request must include an API key in the header. Requests without a key are rejected.",
    "The default timeout is thirty seconds. You can change it in the settings file.",
    "Click Save to keep your changes, or Cancel to discard them.",
    "Log files are rotated daily and kept for fourteen days.",
  ]),
  ...G(FA, "ya-fantasy", [
    "The dragon had been asleep for three hundred years, and it was not pleased to be woken by a girl with a loaf of bread.",
    "Nobody in the Academy believed in the old magic, which made it easy for me to practise it.",
    "The map was wrong, which I should have expected from a map drawn by a man who had never left the capital.",
    "Kael did not look like a hero. He looked like a boy who had lost his boots in a river, which was precisely what had happened.",
    "On the night of the third moon, the doors of the library opened by themselves.",
    "My mother's last gift was a key. She did not tell me what it opened, and I did not think to ask.",
  ]),
  ...G(SF, "hard-sf", [
    "The station's spin gave them a third of a gravity, enough to pour tea but not enough to stop it tasting wrong.",
    "Signal delay to Earth was now eleven minutes. Every question they asked home was a letter in a bottle.",
    "Dr. Hale checked the seal twice, then a third time, because the first two had been wishful thinking.",
    "The probe's last image showed a flat plain, a long shadow, and something that was probably a rock.",
    "Life support was fine. It was everything else that worried her.",
    "They named the planet after the ship's cook, because he had been right about the water.",
  ]),
  ...G(MY, "cosy", [
    "Miss Pargeter set down her teacup and said, with great politeness, that the vicar had not been in the vestry at four o'clock.",
    "The village fete had been going so well that the discovery of the body in the jam tent came as a real disappointment.",
    "Constable Rudd took notes slowly and in pencil, a habit that had annoyed three sergeants.",
    "It was a small village, and everyone had a motive, an opinion, and a cake.",
    "The butler had not done it. Butlers, Miss Pargeter felt, were far too obvious these days.",
    "Rain pattered on the greenhouse roof while the inspector counted the clues. There were four. There ought to have been five.",
  ]),
  ...G(RO, "contemporary", [
    "She had promised herself she wouldn't look. She looked.",
    "He laughed at his own joke before he reached the end of it, and she found, to her annoyance, that it was charming.",
    "They took the long way home, which neither mentioned.",
    "The cafe was crowded and the only free chair was beside him. It would have been rude not to sit.",
    "She kept the letter in her coat pocket for a week before she opened it.",
    "Neither of them said it, but the silence in the car was full of it.",
  ]),
  ...G(TH, "techno", [
    "The server room was colder than it should have been. Someone had turned the thermostat down, and not by accident.",
    "Four minutes until the shift change. Maya counted them off in her head and kept her hands in her pockets.",
    "The email had come from her own address, which was impossible, and she read it again to be sure.",
    "He closed the laptop, took out the battery, and put both in the freezer. Habit, not paranoia.",
    "The van at the end of the street had been there since Tuesday.",
    "There were two exits. One of them was watched, and she hoped it was the right one.",
  ]),
  ...G(LD, "domestic", [
    "The kettle clicked off. Neither of them moved to make the tea.",
    "Their daughter's room stayed as it was, the bed made, the window open an inch, as though she might come back for something.",
    "They ate in front of the television now. It had stopped feeling like a failure and started feeling like a mercy.",
    "He folded the newspaper into precise quarters, the way his own father had, and set it beside his plate.",
    "In the hall hung a coat no one wore and no one moved.",
    "The garden, which she had once tended every morning, had gone quietly to seed.",
  ]),
  ...G(AC, "legal-sci", [
    "Under the doctrine, the court asks whether the defendant could reasonably have foreseen the harm.",
    "The statute does not define the term, and courts have therefore turned to ordinary usage.",
    "The committee reviewed the evidence and concluded that the policy should be revised.",
    "Patients were randomised in blocks of four, stratified by site and baseline severity.",
  ]),
];

const BASES = [
  [GF, "Rain tapped at the window while she folded the last of the laundry"],
  [RO, "He held the door open for her and pretended not to watch her go inside"],
  [MY, "The inspector examined the lock and then the window and then the lock again"],
  [FA, "The bridge swayed gently above the river as the travellers crossed it one by one"],
  [SF, "The airlock cycled twice before the pressure light finally turned green"],
  [LD, "My uncle kept bees on the roof of his building and told no one"],
  [HI, "The merchants gathered at the harbour long before the ships were in sight"],
  [NM, "I learned to cook in my grandmother's kitchen standing on an upturned crate"],
  [AC, "The respondents were asked to rate each statement on a five-point scale"],
  [BU, "Please confirm the delivery schedule with the warehouse before the end of the week"],
  [TJ, "The council said the new rules would take effect at the start of next month"],
  [TH, "The courier checked his mirrors twice before he turned into the car park"],
];
const WORDS_TO_DUP = ["the", "of", "to", "and", "in", "was"];
const inject = (text, kind, i) => {
  if (kind === "dup") {
    const w = text.split(" ");
    const idx = w.findIndex((x, k) => k > 2 && WORDS_TO_DUP.includes(x.toLowerCase()));
    if (idx > 0) { w.splice(idx, 0, w[idx]); return { t: w.join(" "), e: ["edit:dup"] }; }
    return { t: text.replace(" and ", " and and "), e: ["edit:dup"] };
  }
  if (kind === "space") { const w = text.split(" "); const k = 3 + (i % 3); return { t: w.slice(0, k).join(" ") + "  " + w.slice(k).join(" "), e: ["spell:double_space"] }; }
  const pl = ["The end result was clear.", "It was a close proximity.", "A final outcome followed.", "It was an unexpected surprise."][i % 4];
  return { t: `${text}. ${pl}`, e: ["rep:pleo"] };
};

export const PE96_PLANTED = [];
for (let r = 0; r < 5; r++) {
  BASES.forEach(([g, b], j) => {
    const kind = ["dup", "space", "pleo"][(r + j) % 3];
    const text = `${b}${r ? ` — version ${["", "a", "b", "c", "d"][r]}` : ""}`.replace(/ — version \w/, "");
    const variant = r === 0 ? b : b.replace(/^(\w+)/, (m) => m) + [", as it turned out", ", or so it seemed", " that morning", " without a word"][r - 1];
    const { t, e } = inject(variant + ".", kind, r * 12 + j);
    PE96_PLANTED.push([g, kind, t.replace("..", "."), e]);
  });
}

export const PE96_ALL = [
  ...PE96_CLEAN.map(([g, c, t], i) => ({ id: `k${i}-${c}`, genre: g, text: t, expect: [] })),
  ...PE96_PLANTED.map(([g, c, t, e], i) => ({ id: `q${i}-${c}`, genre: g, text: t, expect: e })),
];
