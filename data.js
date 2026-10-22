// ===== Little Wars - THE DATA (the tables to hand-edit) =====
// Tables and their comments only: the code that reads them is in game.html.
// Each table says above it whether it is a SAFE edit (words: the self-test
// stays green) or a RULE edit (numbers, maps, armies: the self-test
// notices on purpose, and its replay lines change). hand-edits.txt is the
// guide. A slip a table can't take puts a line on the red banner when the
// page opens. Keep DATA_OK = true as the last line: it tells game.html this
// whole file loaded.
//
// Squares are named as on the screen: a column letter (A, B, C ... from
// the left) and a row number counted from YOUR back line (row 1, at the
// bottom) up to theirs. "C9" on Hook's Farm is column C, row 9.

// ---- THE RULES (GDD 3.10) ----
// RULE edits. Every number here is a starting value for the bot runs.
//   range       squares a gun reaches (steps in any of the 8 directions)
//   shots       shots a gun fires each time it fires
//   crew        figures that keep a gun in action (its own crew, plus the
//               figures of friendly units next to it); a gun MOVES only
//               with this many of its own crew
//   cover       percent: a shot that lands on a unit in a wood knocks a
//               figure over only this often (a gun that fired has no cover
//               until it next moves)
//   isolation   squares: friends within this many squares of a side's units
//               in a melee support it
//   perEscort   prisoners one escort can take
//   escortWalk  squares an escort walks at the end of its side's turn
//   raidSize    figures a unit needs on the other side's back line to win
//               a Blow at the Rear - standing there at the end of two of
//               its side's turns running, so the other side can answer it
//   withdraw    turns the loser of a raid has to take its units off
//   throughSize figures a unit of the attacker needs on the defender's
//               back line to win a Defensive Game (5: only an infantry
//               squad, 6 figures, can get through - the author's decision
//               14; 1 would be any unit). The bots' cavalry ride for that
//               back line only when they have this many figures, and for
//               a raid's back line only with raidSize.
//   quarter     percent of its starting figures the attacker in a
//               Defensive Game must keep on the field
//   win, draw, gunPts, prisonerPts   points (GDD 3.9); a figure's points
//               are in ARMS
const RULES = {
  range: 10,
  shots: 4,
  crew: 4,
  cover: 50,
  isolation: 2,
  perEscort: 7,
  escortWalk: 2,
  raidSize: 3,
  withdraw: 3,
  throughSize: 5,
  quarter: 25,
  win: 100,
  draw: 50,
  gunPts: 10,
  prisonerPts: 0.5
};

// ---- ON TARGET: how often a shot lands on the aimed square ----
// RULE edits. One line per band of range, nearest first: a shot at a
// square up to upTo squares away lands on it pct percent of the time;
// otherwise on one of the 8 squares around it, each as likely.
const ON_TARGET = [
  { upTo: 3, pct: 60 },
  { upTo: 6, pct: 45 },
  { upTo: 10, pct: 30 }
];

// ---- THE ARMS (GDD 3.2) ----
// RULE edits. figures: in a full unit (a gun section: its crew). move:
// squares of move points a turn. pts: points for each living figure at
// the end (GDD 3.9). gun: true for a gun section (keep it as it is).
// esc is the escort that walks prisoners home (made in a melee): its one
// figure counts as the arm it came from, so its own pts is 0.
const ARMS = {
  inf: { figures: 6, move: 2, pts: 1, gun: false },
  cav: { figures: 4, move: 4, pts: 1.5, gun: false },
  gun: { figures: 4, move: 2, pts: 1, gun: true },
  hgun: { figures: 4, move: 4, pts: 1.5, gun: true },
  esc: { figures: 1, move: 2, pts: 0, gun: false }
};

// ---- WHO FALLS IN A MELEE (GDD 3.6) ----
// RULE edits. The game chooses for the side whose turn it is. own: the
// order that side's own losses are taken in, arm by arm. other: the order
// the other side's prisoners, then its falls, are taken in. Within an arm
// the unit with the fewest figures goes first. Use each of the five arms
// once in each list.
const LOSS_ORDER = {
  own: ["inf", "cav", "esc", "gun", "hgun"],
  other: ["gun", "hgun", "esc", "cav", "inf"]
};

// ---- THE PIECES OF A COUNTRY (GDD 6.2) ----
// The letters a map is drawn with. name: SAFE (shown when a square is
// looked at; about 16 letters). Everything else is a RULE edit:
//   look    how it is drawn: floor, wood, hill, house, church, wall, rock,
//           river, ford or bridge
//   cost    move points to enter it (0 when it can't be entered)
//   enter   true if a unit may stand on it
//   blocks  true if it blocks a gun's line of fire (a gun ON a hill fires
//           over everything)
//   cover   true for cover from gunfire (woods)
//   hill    true for a hill (a gun on it fires over everything)
//   ford    true if entering it ends the move
// A named house (Hook's Farm, Firely Church ...) gets its own letter, so
// its name can show.
const PIECES = {
  ".": { name: "floor", look: "floor", cost: 1, enter: true, blocks: false, cover: false, hill: false, ford: false },
  "w": { name: "wood", look: "wood", cost: 2, enter: true, blocks: false, cover: true, hill: false, ford: false },
  "h": { name: "hill", look: "hill", cost: 2, enter: true, blocks: true, cover: false, hill: true, ford: false },
  "H": { name: "house", look: "house", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "F": { name: "Hook's Farm", look: "house", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "C": { name: "Firely Church", look: "church", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "o": { name: "outbuilding", look: "house", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "c": { name: "cottage", look: "house", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "=": { name: "wall", look: "wall", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "r": { name: "rock", look: "rock", cost: 0, enter: false, blocks: true, cover: false, hill: false, ford: false },
  "~": { name: "river", look: "river", cost: 0, enter: false, blocks: false, cover: false, hill: false, ford: false },
  "f": { name: "ford", look: "ford", cost: 1, enter: true, blocks: false, cover: false, hill: false, ford: true },
  "b": { name: "bridge", look: "bridge", cost: 1, enter: true, blocks: false, cover: false, hill: false, ford: false }
};

// ---- THE COUNTRIES: the maps (GDD 6.1, 6.3) ----
// RULE edits. Each map is rows of PIECES letters with a space between
// them, THEIR back line at the top and YOURS at the bottom, as on the
// screen. Every row of a map has the same number of letters. The battles
// 1-10 were drawn as rough drafts (2026-10-20) and reshaped by the bot
// runs (2026-10-22: wider crossings on 4 and 9).
// Keep the set-up rows of each battle (LEVELS youRows / themRows) clear
// enough for its ARMIES below - the red banner names a unit that stands
// on a square it can't, or outside its zone.
const COUNTRIES = {
  // Hook's Farm (12 x 9), the tutorial, after Wells's own battle
  hooks: [
    ". . . . . . . . . . . .", // 9  their back line
    ". . . . . . . . . . . .", // 8
    ". . . . . c . . . w w .", // 7
    ". h h h . . . . . . . .", // 6
    ". h F h . . o . . C . .", // 5
    ". h h h . . . . . . . .", // 4
    ". . o . w . w w . . . .", // 3
    ". . . . . . w . . . . .", // 2
    ". . . . . . . . . . . ."  // 1  your back line
  ],
  // The Two Hills (12 x 10): a hill on each half, a wood in the middle,
  // two rocks
  twohills: [
    ". . . . . . . . . . . .", // 10
    ". . . . . . . . . . . .", // 9
    ". . . . . . . . h h . .", // 8
    ". . r . . . . . h h . .", // 7
    ". . . . . w w . . . . .", // 6
    ". . . . . w w . . . . .", // 5
    ". . h h . . . . . r . .", // 4
    ". . h h . . . . . . . .", // 3
    ". . . . . . . . . . . .", // 2
    ". . . . . . . . . . . ."  // 1
  ],
  // The Long Wall (12 x 10): a wall across the middle with three gaps
  // (B, F, K); a wood on the west; a chalk stream with a ford on the east
  longwall: [
    ". . . . . . . . . ~ . .", // 10
    ". . . . . . . . . ~ . .", // 9
    "w w . . . . . . . f . .", // 8
    "w w . . . . . . . ~ . .", // 7
    "= . = = = . = = = ~ . =", // 6
    "= . = = = . = = = ~ . =", // 5
    "w w . . . . . . . ~ . .", // 4
    "w w . . . . . . . f . .", // 3
    ". . . . . . . . . ~ . .", // 2
    ". . . . . . . . . ~ . ."  // 1
  ],
  // The Cottages (12 x 10): three cottages and a wood on your half; open
  // ground and one hill on theirs (switchable: "wall", SWITCHES below)
  cottages: [
    ". . . . . . . . . . . .", // 10
    ". . . . . . . . . . . .", // 9
    ". . . . . . . h h . . .", // 8
    ". . . . . . . h h . . .", // 7
    ". . . . . . . . . . . .", // 6
    ". . . . . . . . . . . .", // 5
    ". . . . . . . . . . . .", // 4
    ". c . . . c . . w w c .", // 3
    ". . . . . . . . w w . .", // 2
    ". . . . . . . . . . . ."  // 1
  ],
  // The Chalk Brook (14 x 10): a river across the middle, a bridge in the
  // centre, a double-wide ford near each side, woods on both banks
  // (switchable: "bridge", two more bridges, at D and K)
  chalkbrook: [
    ". . . . . . . . . . . . . .", // 10
    ". . . . . . . . . . . . . .", // 9
    ". . w w . . . . . . w w . .", // 8
    ". . w . . . . . . . . w . .", // 7
    "~ f f ~ ~ ~ b ~ ~ ~ ~ f f ~", // 6
    "~ f f ~ ~ ~ b ~ ~ ~ ~ f f ~", // 5
    ". . w . . . . . . . . w . .", // 4
    ". . w w . . . . . . w w . .", // 3
    ". . . . . . . . . . . . . .", // 2
    ". . . . . . . . . . . . . ."  // 1
  ],
  // The Orchard (14 x 10): rows of trees inside a broken wall on the west;
  // houses on the east
  orchard: [
    ". . . . . . . . . . . . . .", // 10
    ". . . . . . . . . . . . . .", // 9
    ". = = . = = . . . . . . . .", // 8
    ". w . w . w = . . H . . H .", // 7
    ". w . w . w . . . . . H . .", // 6
    ". w . w . w . . . . . H . .", // 5
    ". w . w . w = . . H . . H .", // 4
    ". = = . = = . . . . . . . .", // 3
    ". . . . . . . . . . . . . .", // 2
    ". . . . . . . . . . . . . ."  // 1
  ],
  // The Mill Hill (14 x 10): their hill, with a mill (a house) and a wall
  // on it; a wood on your half; open slopes
  millhill: [
    ". . . . . . . . . . . . . .", // 10
    ". . . . . h h h h . . . . .", // 9
    ". . . . h h H h h h . . . .", // 8
    ". . . . = = = h . . . . . .", // 7
    ". . . . . . . . . . . . . .", // 6
    ". . . . . . . . . . . . . .", // 5
    ". . . . . . . . . . . . . .", // 4
    ". . w w . . . . . . w . . .", // 3
    ". . w w . . . . . . w w . .", // 2
    ". . . . . . . . . . . . . ."  // 1
  ],
  // The Ridge (14 x 12): a long hill across the middle with one gap (G-H);
  // woods at both ends; two houses
  ridge: [
    ". . . . . . . . . . . . . .", // 12
    ". . . . . . . . . . . . . .", // 11
    ". . . . . . . . . . . . . .", // 10
    "w w . . . . . . . H . . w w", // 9
    "w . . . . . . . . . . . . w", // 8
    "w h h h h h . . h h h h h w", // 7
    "w h h h h h . . h h h h h w", // 6
    "w . . . . . . . . . . . . w", // 5
    "w w . . H . . . . . . . w w", // 4
    ". . . . . . . . . . . . . .", // 3
    ". . . . . . . . . . . . . .", // 2
    ". . . . . . . . . . . . . ."  // 1
  ],
  // The Village (16 x 12): houses and walls in a cluster on their half; a
  // wood and a hill on yours (switchable: "wood", a wood in the middle)
  village: [
    ". . . . . . . . . . . . . . . .", // 12
    ". . . . . H . . . H . . . . . .", // 11
    ". . . . = H . H . . . = . . . .", // 10
    ". . . H . . . = . H H . . . . .", // 9
    ". . . . . . . . . . . . . . . .", // 8
    ". . . . . . . . . . . . . . . .", // 7
    ". . . . . . . . . . . . . . . .", // 6
    ". . . . . . . . . . . . . . . .", // 5
    ". . . . . . . . . . . . h h . .", // 4
    ". . w w . . . . . . . . h h . .", // 3
    ". . w w . . . . . . . . . . . .", // 2
    ". . . . . . . . . . . . . . . ."  // 1
  ],
  // The Two Fords (16 x 12): a river across the middle with two
  // double-wide fords and a bridge; a hill on each half
  twofords: [
    ". . . . . . . . . . . . . . . .", // 12
    ". . . . . . . . . . . . . . . .", // 11
    ". . . . . . . . . . . . . . . .", // 10
    ". . h h . . . . . . . . . . . .", // 9
    ". . h h . . . . . . . . . . . .", // 8
    "~ f f ~ ~ ~ ~ b ~ ~ ~ ~ ~ f f ~", // 7
    "~ f f ~ ~ ~ ~ b ~ ~ ~ ~ ~ f f ~", // 6
    ". . h h . . . . . . . . . . . .", // 5
    ". . h h . . . . . . . . . . . .", // 4
    ". . . . . . . . . . . . . . . .", // 3
    ". . . . . . . . . . . . . . . .", // 2
    ". . . . . . . . . . . . . . . ."  // 1
  ],
  // The Whole Floor (18 x 12), the finale: every piece - two hills,
  // woods, a river with a bridge and two fords, houses, walls, rocks
  wholefloor: [
    ". . . . . . . . . . . . . . . . . .", // 12
    ". . . . . . . . . . . . . . . . . .", // 11
    ". . . . . . . . . . . . . . . . . .", // 10
    ". . w w . . . . . . H = . . . w . .", // 9
    ". . w . h h . r . . H . . . w w . .", // 8
    "~ ~ ~ f ~ ~ ~ ~ b ~ ~ ~ ~ f ~ ~ ~ ~", // 7
    "~ ~ ~ f ~ ~ ~ ~ b ~ ~ ~ ~ f ~ ~ ~ ~", // 6
    ". . w . h h . r . . H . . . w w . .", // 5
    ". . w w . . . . . . H = . . . w . .", // 4
    ". . . . . . . . . . . . . . . . . .", // 3
    ". . . . . . . . . . . . . . . . . .", // 2
    ". . . . . . . . . . . . . . . . . ."  // 1
  ]
};

// ---- THE COUNTRIES' NAMES ----
// SAFE edits: working names (GDD 6.1) - rename any of them (about 22
// letters fit). Keep the id in front of each (hooks, twohills ...).
const COUNTRY_NAMES = {
  hooks: "Hook's Farm",
  twohills: "The Two Hills",
  longwall: "The Long Wall",
  cottages: "The Cottages",
  chalkbrook: "The Chalk Brook",
  orchard: "The Orchard",
  millhill: "The Mill Hill",
  ridge: "The Ridge",
  village: "The Village",
  twofords: "The Two Fords",
  wholefloor: "The Whole Floor"
};

// ---- SWITCHABLE PIECES (a story outcome's ["piece", key]) ----
// RULE edits. One line per square: when a battle's outcome puts the piece
// "key" in, the square "at" of that country becomes the letter "piece".
const SWITCHES = [
  { country: "cottages", key: "wall", at: "B5", piece: "=" },
  { country: "cottages", key: "wall", at: "C5", piece: "=" },
  { country: "cottages", key: "wall", at: "F5", piece: "=" },
  { country: "cottages", key: "wall", at: "G5", piece: "=" },
  { country: "cottages", key: "wall", at: "K5", piece: "=" },
  { country: "chalkbrook", key: "bridge", at: "D5", piece: "b" },
  { country: "chalkbrook", key: "bridge", at: "D6", piece: "b" },
  { country: "chalkbrook", key: "bridge", at: "K5", piece: "b" },
  { country: "chalkbrook", key: "bridge", at: "K6", piece: "b" },
  { country: "village", key: "wood", at: "C6", piece: "w" },
  { country: "village", key: "wood", at: "D6", piece: "w" },
  { country: "village", key: "wood", at: "C7", piece: "w" },
  { country: "village", key: "wood", at: "D7", piece: "w" }
];

// ---- THE LEVEL TABLE: the eleven battles (GDD 6.1) ----
// RULE edits. One line per battle, in the order they are played.
//   lv        the battle's number (0 is the tutorial) - keep them in order
//   part      tutorial, act1, act2, act3 or finale (SCREEN_WORDS.parts)
//   type      finish (Fight to the Finish), rear (Blow at the Rear) or
//             defend (Defensive Game)
//   country   a map in COUNTRIES
//   first     who moves first: "you" or "them"
//   curtain   true: you arrange your units in your zone before it starts
//   youRows, themRows   each side's set-up zone: its back rows
//   rounds    the round limit
//   drawLine  finish and rear: both sides under this many figures at the
//             end of a turn is a draw (0 in a Defensive Game)
//   bot       their bot's style (BOT_STYLES), unless the foe knot picks
//             another
//   rear      rear: the half of a back line a raid must reach: "west",
//             "east" or "all" ("" in the other types)
//   defender  defend: "you" or "them" ("" in the other types)
//   foe       the story knot that picks their bot for it, one of
//             BOT_STYLES (EFFECTS below); it plays first, then knot. ""
//             for the tutorial. Until it is written, their bot is bot.
//   knot      the story knot that plays before it, after foe
//             (story/story.ink)
//   target    your side's win rate the bot runs aim at, percent (GDD 5.2)
const LEVELS = [
  { lv: 0, part: "tutorial", type: "finish", country: "hooks", first: "them", curtain: false, youRows: 2, themRows: 2, rounds: 8, drawLine: 4, bot: "gentle", rear: "", defender: "", foe: "", knot: "tutorial", target: 90 },
  { lv: 1, part: "act1", type: "finish", country: "twohills", first: "you", curtain: true, youRows: 2, themRows: 2, rounds: 10, drawLine: 4, bot: "clever", rear: "", defender: "", foe: "foe_1", knot: "scene_1", target: 75 },
  { lv: 2, part: "act1", type: "rear", country: "longwall", first: "you", curtain: true, youRows: 2, themRows: 2, rounds: 10, drawLine: 4, bot: "steady", rear: "west", defender: "", foe: "foe_2", knot: "scene_2", target: 75 },
  { lv: 3, part: "act1", type: "defend", country: "cottages", first: "them", curtain: true, youRows: 3, themRows: 2, rounds: 10, drawLine: 0, bot: "clever", rear: "", defender: "you", foe: "foe_3", knot: "scene_3", target: 75 },
  { lv: 4, part: "act2", type: "finish", country: "chalkbrook", first: "you", curtain: true, youRows: 2, themRows: 2, rounds: 11, drawLine: 4, bot: "steady", rear: "", defender: "", foe: "foe_4", knot: "scene_4", target: 65 },
  { lv: 5, part: "act2", type: "rear", country: "orchard", first: "you", curtain: true, youRows: 2, themRows: 2, rounds: 10, drawLine: 4, bot: "clever", rear: "west", defender: "", foe: "foe_5", knot: "scene_5", target: 65 },
  { lv: 6, part: "act2", type: "defend", country: "millhill", first: "you", curtain: true, youRows: 2, themRows: 3, rounds: 10, drawLine: 0, bot: "steady", rear: "", defender: "them", foe: "foe_6", knot: "scene_6", target: 65 },
  { lv: 7, part: "act3", type: "finish", country: "ridge", first: "you", curtain: true, youRows: 2, themRows: 2, rounds: 12, drawLine: 5, bot: "clever", rear: "", defender: "", foe: "foe_7", knot: "scene_7", target: 55 },
  { lv: 8, part: "act3", type: "defend", country: "village", first: "you", curtain: true, youRows: 2, themRows: 4, rounds: 12, drawLine: 0, bot: "steady", rear: "", defender: "them", foe: "foe_8", knot: "scene_8", target: 55 },
  { lv: 9, part: "act3", type: "rear", country: "twofords", first: "you", curtain: true, youRows: 2, themRows: 2, rounds: 12, drawLine: 5, bot: "cautious", rear: "all", defender: "", foe: "foe_9", knot: "scene_9", target: 55 },
  { lv: 10, part: "finale", type: "finish", country: "wholefloor", first: "them", curtain: true, youRows: 3, themRows: 3, rounds: 18, drawLine: 7, bot: "clever", rear: "", defender: "", foe: "foe_10", knot: "scene_10", target: 50 }
];

// ---- THE ARMIES: each battle's units and their default set-up ----
// RULE edits. One line per unit, battle by battle, in the order the units
// are made (each side's units of one arm are named in this order, from
// UNIT_NAMES). arm: inf (infantry squad), cav (cavalry troop), gun (gun
// section) or hgun (horse gun section). at: its square, inside its side's
// set-up zone. goal: "" or a square the "gentle" bot heads for (the
// tutorial's two groups: the main body for the farm, the small group for
// the church). A story outcome may add a unit (EFFECTS: ["unit", arm]):
// it stands on the free square of your zone nearest your back line's
// middle.
const ARMIES = [
  // 0 Hook's Farm: G 2I C a side (GDD 6.3)
  { lv: 0, side: "them", arm: "gun", at: "C9", goal: "C6" },
  { lv: 0, side: "them", arm: "inf", at: "B8", goal: "B5" },
  { lv: 0, side: "them", arm: "cav", at: "D8", goal: "D6" },
  { lv: 0, side: "them", arm: "inf", at: "K8", goal: "K5" },
  { lv: 0, side: "you", arm: "gun", at: "G2", goal: "" },
  { lv: 0, side: "you", arm: "inf", at: "D2", goal: "" },
  { lv: 0, side: "you", arm: "inf", at: "I2", goal: "" },
  { lv: 0, side: "you", arm: "cav", at: "F1", goal: "" },
  // 1 The Two Hills: G 2I C a side
  { lv: 1, side: "them", arm: "gun", at: "I10", goal: "" },
  { lv: 1, side: "them", arm: "inf", at: "E9", goal: "" },
  { lv: 1, side: "them", arm: "inf", at: "J9", goal: "" },
  { lv: 1, side: "them", arm: "cav", at: "G10", goal: "" },
  { lv: 1, side: "you", arm: "gun", at: "D1", goal: "" },
  { lv: 1, side: "you", arm: "inf", at: "C2", goal: "" },
  { lv: 1, side: "you", arm: "inf", at: "H2", goal: "" },
  { lv: 1, side: "you", arm: "cav", at: "F1", goal: "" },
  // 2 The Long Wall: you G 3I 2C; they G 2I 2C
  { lv: 2, side: "them", arm: "gun", at: "F10", goal: "" },
  { lv: 2, side: "them", arm: "inf", at: "D9", goal: "" },
  { lv: 2, side: "them", arm: "inf", at: "H9", goal: "" },
  { lv: 2, side: "them", arm: "cav", at: "B10", goal: "" },
  { lv: 2, side: "them", arm: "cav", at: "K10", goal: "" },
  { lv: 2, side: "you", arm: "gun", at: "F1", goal: "" },
  { lv: 2, side: "you", arm: "inf", at: "D2", goal: "" },
  { lv: 2, side: "you", arm: "inf", at: "H2", goal: "" },
  { lv: 2, side: "you", arm: "inf", at: "I2", goal: "" },
  { lv: 2, side: "you", arm: "cav", at: "B1", goal: "" },
  { lv: 2, side: "you", arm: "cav", at: "K1", goal: "" },
  // 3 The Cottages: you defend with G 2I; they attack with G 2I 2C
  { lv: 3, side: "them", arm: "gun", at: "G10", goal: "" },
  { lv: 3, side: "them", arm: "inf", at: "E9", goal: "" },
  { lv: 3, side: "them", arm: "inf", at: "I9", goal: "" },
  { lv: 3, side: "them", arm: "cav", at: "B10", goal: "" },
  { lv: 3, side: "them", arm: "cav", at: "K10", goal: "" },
  { lv: 3, side: "you", arm: "gun", at: "E2", goal: "" },
  { lv: 3, side: "you", arm: "inf", at: "C3", goal: "" },
  { lv: 3, side: "you", arm: "inf", at: "I3", goal: "" },
  // 4 The Chalk Brook: G 2I 2C a side
  { lv: 4, side: "them", arm: "gun", at: "G10", goal: "" },
  { lv: 4, side: "them", arm: "inf", at: "D9", goal: "" },
  { lv: 4, side: "them", arm: "inf", at: "K9", goal: "" },
  { lv: 4, side: "them", arm: "cav", at: "B10", goal: "" },
  { lv: 4, side: "them", arm: "cav", at: "M10", goal: "" },
  { lv: 4, side: "you", arm: "gun", at: "G1", goal: "" },
  { lv: 4, side: "you", arm: "inf", at: "D2", goal: "" },
  { lv: 4, side: "you", arm: "inf", at: "K2", goal: "" },
  { lv: 4, side: "you", arm: "cav", at: "B1", goal: "" },
  { lv: 4, side: "you", arm: "cav", at: "M1", goal: "" },
  // 5 The Orchard: you G 2I C; they G 2I 2C
  { lv: 5, side: "them", arm: "gun", at: "H10", goal: "" },
  { lv: 5, side: "them", arm: "inf", at: "D9", goal: "" },
  { lv: 5, side: "them", arm: "inf", at: "K9", goal: "" },
  { lv: 5, side: "them", arm: "cav", at: "B10", goal: "" },
  { lv: 5, side: "them", arm: "cav", at: "L10", goal: "" },
  { lv: 5, side: "you", arm: "gun", at: "H1", goal: "" },
  { lv: 5, side: "you", arm: "inf", at: "D2", goal: "" },
  { lv: 5, side: "you", arm: "inf", at: "K2", goal: "" },
  { lv: 5, side: "you", arm: "cav", at: "B1", goal: "" },
  // 6 The Mill Hill: you attack with a horse gun, 2I 2C; they defend with
  // G 2I C
  { lv: 6, side: "them", arm: "gun", at: "H8", goal: "" },
  { lv: 6, side: "them", arm: "inf", at: "F9", goal: "" },
  { lv: 6, side: "them", arm: "inf", at: "J8", goal: "" },
  { lv: 6, side: "them", arm: "cav", at: "L9", goal: "" },
  { lv: 6, side: "you", arm: "hgun", at: "G1", goal: "" },
  { lv: 6, side: "you", arm: "inf", at: "C2", goal: "" },
  { lv: 6, side: "you", arm: "inf", at: "K2", goal: "" },
  { lv: 6, side: "you", arm: "cav", at: "A1", goal: "" },
  { lv: 6, side: "you", arm: "cav", at: "N1", goal: "" },
  // 7 The Ridge: you G 2I 2C; they G 3I 2C
  { lv: 7, side: "them", arm: "gun", at: "H12", goal: "" },
  { lv: 7, side: "them", arm: "inf", at: "K11", goal: "" },
  { lv: 7, side: "them", arm: "inf", at: "G11", goal: "" },
  { lv: 7, side: "them", arm: "inf", at: "D11", goal: "" },
  { lv: 7, side: "them", arm: "cav", at: "M12", goal: "" },
  { lv: 7, side: "them", arm: "cav", at: "B12", goal: "" },
  { lv: 7, side: "you", arm: "gun", at: "G1", goal: "" },
  { lv: 7, side: "you", arm: "inf", at: "D2", goal: "" },
  { lv: 7, side: "you", arm: "inf", at: "H2", goal: "" },
  { lv: 7, side: "you", arm: "cav", at: "B1", goal: "" },
  { lv: 7, side: "you", arm: "cav", at: "M1", goal: "" },
  // 8 The Village: you attack with G 3I C; they defend with G 3I C
  { lv: 8, side: "them", arm: "gun", at: "H12", goal: "" },
  { lv: 8, side: "them", arm: "inf", at: "G9", goal: "" },
  { lv: 8, side: "them", arm: "inf", at: "I10", goal: "" },
  { lv: 8, side: "them", arm: "inf", at: "L9", goal: "" },
  { lv: 8, side: "them", arm: "cav", at: "D12", goal: "" },
  { lv: 8, side: "you", arm: "gun", at: "G1", goal: "" },
  { lv: 8, side: "you", arm: "inf", at: "D2", goal: "" },
  { lv: 8, side: "you", arm: "inf", at: "H2", goal: "" },
  { lv: 8, side: "you", arm: "inf", at: "L2", goal: "" },
  { lv: 8, side: "you", arm: "cav", at: "B1", goal: "" },
  // 9 The Two Fords: G 3I 2C a side
  { lv: 9, side: "them", arm: "gun", at: "D12", goal: "" },
  { lv: 9, side: "them", arm: "inf", at: "F11", goal: "" },
  { lv: 9, side: "them", arm: "inf", at: "I11", goal: "" },
  { lv: 9, side: "them", arm: "inf", at: "L11", goal: "" },
  { lv: 9, side: "them", arm: "cav", at: "B12", goal: "" },
  { lv: 9, side: "them", arm: "cav", at: "O12", goal: "" },
  { lv: 9, side: "you", arm: "gun", at: "D1", goal: "" },
  { lv: 9, side: "you", arm: "inf", at: "F2", goal: "" },
  { lv: 9, side: "you", arm: "inf", at: "I2", goal: "" },
  { lv: 9, side: "you", arm: "inf", at: "L2", goal: "" },
  { lv: 9, side: "you", arm: "cav", at: "B1", goal: "" },
  { lv: 9, side: "you", arm: "cav", at: "O1", goal: "" },
  // 10 The Whole Floor: you 2G 4I 2C; they 2G 4I 3C
  { lv: 10, side: "them", arm: "gun", at: "E12", goal: "" },
  { lv: 10, side: "them", arm: "gun", at: "N12", goal: "" },
  { lv: 10, side: "them", arm: "inf", at: "C10", goal: "" },
  { lv: 10, side: "them", arm: "inf", at: "G10", goal: "" },
  { lv: 10, side: "them", arm: "inf", at: "L10", goal: "" },
  { lv: 10, side: "them", arm: "inf", at: "P10", goal: "" },
  { lv: 10, side: "them", arm: "cav", at: "A11", goal: "" },
  { lv: 10, side: "them", arm: "cav", at: "I11", goal: "" },
  { lv: 10, side: "them", arm: "cav", at: "R11", goal: "" },
  { lv: 10, side: "you", arm: "gun", at: "E1", goal: "" },
  { lv: 10, side: "you", arm: "gun", at: "N1", goal: "" },
  { lv: 10, side: "you", arm: "inf", at: "C3", goal: "" },
  { lv: 10, side: "you", arm: "inf", at: "G3", goal: "" },
  { lv: 10, side: "you", arm: "inf", at: "L3", goal: "" },
  { lv: 10, side: "you", arm: "inf", at: "P3", goal: "" },
  { lv: 10, side: "you", arm: "cav", at: "A2", goal: "" },
  { lv: 10, side: "you", arm: "cav", at: "R2", goal: "" }
];

// ---- THE STORY'S OUTCOMES (GDD 7.2) ----
// RULE edits. What each scene_ knot's outcomes do to the NEXT battle (the
// one after the knot). Each outcome is a list of steps:
//   ["first", "you"]        who moves first ("you" or "them")
//   ["scout"]               you see their set-up while you arrange yours
//   ["rear", "west"]        the half of a back line a raid must reach
//                           ("west", "east" or "all")
//   ["piece", "wall"]       a switchable piece goes in (SWITCHES)
//   ["horseGun"]            your first gun section is a horse gun
//   ["setupRows", 3]        your set-up zone is your back 3 rows
//   ["unit", "cav"]         you have a unit more (inf, cav or gun)
//   ["rounds", 2]           the round limit is 2 more
//   ["style", "cautious"]   their bot plays that style (BOT_STYLES)
// The outcome names are the story's (story/story.ink, ink/config.js,
// story/CONTRACT.txt): change a name in all four places. intro, tutorial
// and ending send no outcome. A scene_ pair should stay a sidegrade:
// different help, about the same win rate (GDD 5.2) - the bot runs check
// it. The foe_ knots (one before each scene_ knot) pick their bot for
// the battle, from all four styles (the author's call, 2026-10-21: a
// choice of how hard, not a sidegrade); while one is not written, their
// bot is the row's (LEVELS bot), so foe_ knots have no DEFAULTS line.
const EFFECTS = {
  scene_1: { scout: [["scout"]], move_first: [["first", "you"], ["setupRows", 3]] },
  scene_2: { rear_west: [["rear", "west"]], rear_east: [["rear", "east"]] },
  scene_3: { scout: [["scout"]], wall: [["piece", "wall"]] },
  scene_4: { bridge: [["piece", "bridge"]], horse_gun: [["horseGun"]] },
  scene_5: { forward: [["setupRows", 3]], extra_troop: [["unit", "cav"], ["first", "them"]] },
  scene_6: { more_rounds: [["rounds", 2]], horse_gun: [["horseGun"]] },
  scene_7: { head_start: [["first", "you"], ["scout"], ["unit", "cav"]], extra_squad: [["unit", "inf"], ["first", "them"]] },
  scene_8: { more_rounds: [["rounds", 2]], wood: [["piece", "wood"]] },
  scene_9: { scout: [["scout"]], forward: [["setupRows", 3]] },
  scene_10: { extra_troop: [["unit", "cav"]], extra_gun: [["unit", "gun"]] },
  foe_1: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_2: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_3: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_4: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_5: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_6: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_7: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_8: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_9: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] },
  foe_10: { steady: [["style", "steady"]], cautious: [["style", "cautious"]], bold: [["style", "bold"]], clever: [["style", "clever"]] }
};
// What the game uses when a scene_ knot is not written yet (it shows
// nothing) or ends without sending its outcome: one of that knot's
// outcomes above. (A foe_ knot's default is the row's bot, LEVELS.)
const DEFAULTS = {
  scene_1: "scout", scene_2: "rear_west", scene_3: "scout", scene_4: "bridge", scene_5: "forward",
  scene_6: "more_rounds", scene_7: "head_start", scene_8: "more_rounds", scene_9: "scout", scene_10: "extra_troop"
};

// ---- THE BOTS (GDD 6.4) ----
// RULE edits. One line per style; LEVELS' bot picks theirs, and
// "newcomer" plays your side in bot runs (and in test mode, key B).
// Every bot choice is seeded, so a battle replays from its seed.
//   aim       which enemy a gun fires at: "nearest"; "most" (the most
//             figures); "guns" (gun sections first, then the most
//             figures) - these three never at a unit with one of the
//             bot's own units next to it; "best" (the square where the
//             most enemy figures are likely to be hit, less its own)
//   charge    when a unit may move next to an enemy (a melee follows):
//             "twice" (it has twice the figures); "more" (more figures,
//             and a friend in the melee or within 2 squares of it);
//             "isolated" (more figures, and the other side is isolated);
//             "even" (at least as many); "ahead" (the melee would cost
//             the other side more figures than it)
//   advance   points for each step closer to where it is heading
//   cover     points for ending a move in a wood or on a hill
//   together  points lost for ending with no unit of its own side within
//             RULES.isolation squares
//   groups    0, or squares: a unit with a goal (ARMIES) heads for its
//             goal while no enemy is this close; then for the enemy
//   hunt      "guns": its cavalry head for the enemy's guns; "": they don't
//   hold      points for staying put in a wood or on a hill, while its
//             side wasn't fired on in the other side's last turn
//   guard     points for ending next to a gun of its own side that has
//             fewer than RULES.crew of its own crew; the same taken off
//             for ending where it would be isolated (its friends within
//             RULES.isolation squares fewer than half its figures) with
//             an enemy unit close enough to reach it next turn
//   slip      percent: how often it takes the plainest move (straight
//             ahead) instead of its best one (seeded)
const BOT_STYLES = {
  gentle: { aim: "nearest", charge: "twice", advance: 2, cover: 1, together: 0, groups: 3, hunt: "", hold: 0, guard: 0, slip: 0 },
  steady: { aim: "most", charge: "more", advance: 2, cover: 1, together: 3, groups: 0, hunt: "", hold: 0, guard: 0, slip: 0 },
  cautious: { aim: "guns", charge: "isolated", advance: 1, cover: 3, together: 2, groups: 0, hunt: "", hold: 6, guard: 0, slip: 0 },
  bold: { aim: "guns", charge: "even", advance: 3, cover: 0, together: 0, groups: 0, hunt: "guns", hold: 0, guard: 0, slip: 0 },
  clever: { aim: "best", charge: "ahead", advance: 2, cover: 2, together: 3, groups: 0, hunt: "", hold: 0, guard: 4, slip: 0 },
  newcomer: { aim: "most", charge: "more", advance: 2, cover: 1, together: 3, groups: 0, hunt: "", hold: 0, guard: 0, slip: 20 }
};

// ---- THE UNITS' NAMES ----
// SAFE edits. Both sides' units get the same kinds of names: a side's
// first infantry squad is the first name in inf, its second the second,
// and so on (about 12 letters fit). Keep at least as many names as a
// side ever has of that arm (5 inf, 4 cav, 3 gun, 3 hgun).
const UNIT_NAMES = {
  inf: ["1st Squad", "2nd Squad", "3rd Squad", "4th Squad", "5th Squad"],
  cav: ["1st Troop", "2nd Troop", "3rd Troop", "4th Troop"],
  gun: ["1st Gun", "2nd Gun", "3rd Gun"],
  hgun: ["Horse Gun", "2nd Horse Gun", "3rd Horse Gun"],
  esc: ["Escort"]
};

// ---- THE LOG LINES (the newest line shows at the bottom of the screen) ----
// SAFE edits: the words in quotes. Keep the names in {} where they are:
// {n}, {a}, {b} and {max} are numbers, {name} a unit, {country} a map's
// name, {type} a battle type. About 70 letters fit on a line. The lines
// are from your side of the table: "you" and "they".
const LOG_WORDS = {
  battle: "{country}: {type}, {max} rounds.",
  youFirst: "You move first.",
  themFirst: "They move first.",
  round: "Round {n} of {max}.",
  yourTurn: "Your turn.",
  theirTurn: "Their turn.",
  quiet: "No gun fires in the first round.",
  undone: "Move taken back.",
  noUndo: "Nothing to take back.",
  // the rules' lines (the PHASE blocks write them)
  fired: "{name} fires: {n} down.",
  melee: "Melee: you lose {a}, they lose {b}.",
  taken: "{n} taken prisoner.",
  escortHome: "An escort brings {n} prisoners in.",
  freed: "{n} prisoners go free.",
  gunTaken: "{name} is taken.",
  leftField: "{name} leaves the field.",
  // a raider on the back line, one turn before its raid counts (phase 17)
  holdYou: "{name} is on their back line: still there after their turn, it's a raid.",
  holdThem: "Their {name} is on your back line: attack it this turn, or it's a raid.",
  raid: "A raid gets through! {n} turns to withdraw.",
  // the end of a battle
  won: "You win!",
  drawn: "A draw.",
  lost: "They win."
};

// ---- THE WORDS ON THE SCREENS ----
// SAFE edits: the words in quotes, one group per screen. Keep the names in
// {} where they are. A letter in brackets - (E), (U), (L) ... - is the
// key that does it: the key itself is in the code, so keep the letter.
// Inside quotes, a quote mark needs a \ in front: \". The AI disclosure
// on the title stays in game.html (dev/disclosure.js reads it there).
const SCREEN_WORDS = {
  title: {
    name: "Little Wars",
    sub: "Toy soldiers on the floor, after H. G. Wells (1913)",
    pick: "Choose your paint - press 1 or 2, or tap one:",
    red: "1  Red",
    blue: "2  Blue",
    redLook: "tall flat hats, ringed bases",
    blueLook: "round domed hats, barred bases",
    same: "The paint is all that differs.",
    tutorialOn: "T  Tutorial: on - Hook's Farm first",
    tutorialOff: "T  Tutorial: off - straight to battle 1",
    cont: "C  Continue: battle {n} next",
    credit: "Rules after H. G. Wells's Little Wars (1913). Conversations run on ink by inkle (inkjs, MIT)."
  },
  parts: { tutorial: "Tutorial", act1: "Act I", act2: "Act II", act3: "Act III", finale: "Finale" },
  types: { finish: "Fight to the Finish", rear: "Blow at the Rear", defend: "Defensive Game" },
  halves: { west: "the west half", east: "the east half", all: "the whole line" },
  arms: { inf: "Infantry", cav: "Cavalry", gun: "Gun", hgun: "Horse gun", esc: "Escort" },
  // the set-up screen (the curtain)
  setup: {
    title: "Set up behind the curtain",
    help: "Click a unit, then a lit square of your zone.",
    hidden: "Their side is hidden.",
    scouted: "Your scouts show their set-up.",
    ready: "Ready (Enter)"
  },
  // the battle: the panel at the right (about 16 letters a line)
  battle: {
    round: "Round {n}/{max}",
    you: "Your turn",
    them: "Their turn",
    guns: "Guns first",
    moves: "Moves",
    endTurn: "End Turn (E)",
    undo: "Undo (U)",
    leave: "Leave (L)",
    aimMode: "Aim (M)",
    moveMode: "Move (M)",
    fast: "Fast (F)",
    figures: "{n} figures",
    crew: "crew {n} ({k} at it)",
    empty: "empty gun",
    prisoners: "{n} prisoners",
    boxYou: "Your box: {n}",
    boxThem: "Their box: {n}",
    raidOn: "Withdraw: {n} turns",
    goal: "Raid: {half}",
    defend: "You defend",
    attack: "You attack",
    hidden: "?"
  },
  // the result screen
  result: {
    won: "You won {country}",
    drawn: "{country} is a draw",
    lost: "You lost {country}",
    lines: { win: "Win or draw", guns: "Guns held", figures: "Figures alive", prisoners: "Prisoners" },
    you: "You",
    them: "Them",
    total: "Points",
    campaign: "Campaign: {n} points",
    tutorial: "The tutorial scores no campaign points.",
    next: "Enter or tap to go on"
  },
  // the end screen
  end: {
    title: "The campaign is over",
    score: "Campaign score: {n}",
    record: "Won {a}, drawn {b}, lost {n}",
    again: "R or tap: back to the title"
  }
};

// ---- THE TUTORIAL'S TIPS (Hook's Farm only) ----
// SAFE edits. Each shows once, the first time it matters, in a box at the
// bottom of the board (about 3 lines of 60 letters).
const TIPS = {
  select: "Click one of your units: the lit squares show where it can go. Click one to move there. Each unit moves once a turn.",
  undo: "Changed your mind? Undo (U) takes a move back until you end your turn. A shot can't be taken back.",
  quiet: "Guns act first in a turn, before anything else moves - but no gun fires in the first round.",
  aim: "Click your gun, then a square in range. It fires 4 shots: some land on that square, the rest scatter around it.",
  cover: "A unit in a wood is in cover: a shot that lands on it knocks a figure over only half the time.",
  contact: "Moving next to an enemy unit stops the move. The two fight a melee when you end your turn (E).",
  melee: "In a melee only numbers count. Equal: every figure falls. Otherwise the smaller side falls, and takes as many down.",
  isolated: "A smaller side with too few friends within 2 squares is isolated: the difference is taken prisoner.",
  prisoners: "Prisoners walk to the back line with an escort. Knock the escort over, or catch it, and they go free.",
  emptyGun: "A gun with no crew stands empty. End a turn next to it with 4 figures, and no enemy beside it, and it is yours.",
  leave: "A unit on your back line may leave the field (L): its figures are safe, and still count for points.",
  points: "Points: 100 to win (50 each for a draw), 10 a gun, 1 an infantry figure, 1.5 a cavalry one, half a prisoner."
};

// ---- THE LOOK (GDD 8) ----
// SAFE edits, all of them: colours are "#rrggbb". Each side's paint, and
// the shapes that tell the sides apart without colour: hat "tall" (a tall
// flat-topped hat) or "dome" (a round domed one); base "ring" (a plain
// ring) or "bar" (a bar across it). Give the two sides different shapes.
const THEME = {
  red: { paint: "#b8372b", dark: "#6e1d16", hat: "tall", base: "ring" },
  blue: { paint: "#2f5fae", dark: "#18325e", hat: "dome", base: "bar" },
  // the figures: faces, belts, trousers, horses, guns
  face: "#e8c9a0", belt: "#f2efe6", trousers: "#2a2622", horse: "#7a5230", gunMetal: "#3b3d40", wheel: "#5a3b22",
  // the Country
  floor: "#c9a77c", floorLine: "#b8946a", wood: "#3f6b34", woodDark: "#2a4a23", twig: "#5b4126",
  hill: "#c4a571", hillEdge: "#7a5c36", brick: "#a4553c", brickDark: "#6f3526", roof: "#4a3a33",
  rock: "#8b8b86", rockDark: "#5c5c58", river: "#86a9c2", chalk: "#f4f2ea", plank: "#8a6a44",
  // the screens
  back: "#1b1612", panel: "#2a221c", panelEdge: "#6b5a46", text: "#f1e9dc", dim: "#a89a88", gold: "#e3c27a",
  button: "#3a2e24", buttonLit: "#5a4630", reach: "#f4e27a", aim: "#ff9a4a", select: "#ffffff", zone: "#9ad77d",
  tip: "#fff6d8", tipText: "#2a221c", banner: "#b00020", hard: "#e8806a"
};

var DATA_OK = true;
