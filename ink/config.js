// ===== ink/config.js - what Little Wars tells the kit (Knotwork 3.8-alpha) =====
// Read by ink/dialogue.js (the conversation box) and tools/knotcheck.html.
// Keep it in step with THE GAME'S CONTRACT at the top of story/story.ink
// (and story/CONTRACT.txt, the writer's one-page copy).
var INK_CONFIG = {
  // Game functions the story may call (ink EXTERNAL). The game defines it.
  hooks: ["sceneDone"],

  // The hooks that only ASK and change nothing: none.
  asks: [],

  // The ONE-OUTCOME rule: every scene_ knot sends one outcome with
  // sceneDone. intro, tutorial and ending have no prefix here: they send
  // nothing (knotcheck warns about each one - that is expected).
  outcomes: { scene_: "sceneDone" },

  // The outcome values the game handles, knot by knot. knotcheck FAILS if
  // the story can send a value that isn't here. What each one does: the
  // story's contract, and EFFECTS in data.js.
  outcomeValues: {
    scene_1: ["scout", "move_first"],
    scene_2: ["rear_west", "rear_east"],
    scene_3: ["scout", "wall"],
    scene_4: ["bridge", "horse_gun"],
    scene_5: ["forward", "extra_troop"],
    scene_6: ["more_rounds", "horse_gun"],
    scene_7: ["head_start", "extra_squad"],
    scene_8: ["more_rounds", "wood"],
    scene_9: ["foe_cautious", "foe_bold"],
    scene_10: ["extra_troop", "extra_gun"]
  },

  // Knots the game starts by name, in the order they play.
  knots: ["intro", "tutorial", "scene_1", "scene_2", "scene_3", "scene_4", "scene_5",
          "scene_6", "scene_7", "scene_8", "scene_9", "scene_10", "ending"],

  // Story VARs the game sets just before every knot (GDD 7.5).
  vars: ["player_side", "played_tutorial", "battles_done", "last_result", "last_points",
         "campaign_points", "wins", "draws", "losses"],

  // The game's own tags: none. The kit already knows #speaker, #portrait, #end.
  tags: [],

  // #speaker:<key>  ->  the name shown above the line, and above every line
  // after it until the next #speaker (#speaker:none = narration). A knot
  // starts as narration. Empty until the author chooses the story's frame
  // and its speakers.
  names: {},

  // Choices shown at once: the canvas box has room for 4.
  maxChoices: 4,

  // The canvas box. portrait: 0 = no picture slot (the game has no
  // pictures: everything is drawn by code).
  theme: {
    portrait: 0,
    box: "#2a221c",
    border: "#e3c27a",
    name: "#e3c27a",
    text: "#f1e9dc",
    hint: "#a89a88",
    choice: "#3a2e24",
    choiceBorder: "#6b5a46",
    choiceText: "#f4e2b0",
    choiceSel: "#5a4630",
    choiceSelBorder: "#e3c27a"
  }
};
