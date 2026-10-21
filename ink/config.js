// ===== ink/config.js - what Little Wars tells the kit (Knotwork 3.8-alpha) =====
// Read by ink/dialogue.js (the conversation box) and tools/knotcheck.html.
// Keep it in step with THE GAME'S CONTRACT at the top of story/story.ink
// (and story/CONTRACT.txt, the writer's one-page copy).
var INK_CONFIG = {
  // Game functions the story may call (ink EXTERNAL). The game defines it.
  hooks: ["sceneDone", "foeDone"],

  // The hooks that only ASK and change nothing: none.
  asks: [],

  // The ONE-OUTCOME rule: every scene_ knot sends one outcome with
  // sceneDone, every foe_ knot one with foeDone (a battle has a knot of
  // each, foe_ first). intro, tutorial and ending have no prefix here:
  // they send nothing (knotcheck warns about each one - that is expected).
  outcomes: { scene_: "sceneDone", foe_: "foeDone" },

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
    scene_9: ["scout", "forward"],
    scene_10: ["extra_troop", "extra_gun"],
    foe_1: ["steady", "cautious", "bold", "clever"],
    foe_2: ["steady", "cautious", "bold", "clever"],
    foe_3: ["steady", "cautious", "bold", "clever"],
    foe_4: ["steady", "cautious", "bold", "clever"],
    foe_5: ["steady", "cautious", "bold", "clever"],
    foe_6: ["steady", "cautious", "bold", "clever"],
    foe_7: ["steady", "cautious", "bold", "clever"],
    foe_8: ["steady", "cautious", "bold", "clever"],
    foe_9: ["steady", "cautious", "bold", "clever"],
    foe_10: ["steady", "cautious", "bold", "clever"]
  },

  // Knots the game starts by name, in the order they play.
  knots: ["intro", "tutorial", "foe_1", "scene_1", "foe_2", "scene_2", "foe_3", "scene_3",
          "foe_4", "scene_4", "foe_5", "scene_5", "foe_6", "scene_6", "foe_7", "scene_7",
          "foe_8", "scene_8", "foe_9", "scene_9", "foe_10", "scene_10", "ending"],

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
