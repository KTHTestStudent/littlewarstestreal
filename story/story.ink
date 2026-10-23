// =====================================================================
// story.ink - LITTLE WARS (working title; Knotwork 3.8-alpha), a
// grid-tactics campaign after H. G. Wells's Little Wars (1913)
// Open this file in Inky. After an edit:
//   1 File > Export story.js only...  -> save over ink/story.js
//   2 double-click tools/knotcheck.html
//   3 reload the game (F5)
// =====================================================================
//
// THIS FILE IS A SKELETON FOR THE WRITER. Every knot is empty: a summary
// of when it plays and what the game does with it - no story, which is
// the author's, frame and all. Each knot holds one "-> DONE" only because
// ink won't compile a knot with nothing in it - replace it when you write
// the knot.
//
// knotcheck FAILS until the foe_ and scene_ knots are written: its FAIL
// list ("ends without calling foeDone / sceneDone") is the list of knots
// still to write.
// It also WARNS that intro, tutorial and ending send no outcome - that is
// expected and breaks nothing. The game plays the whole time: a knot with
// nothing to show is skipped, the game uses that knot's DEFAULT outcome
// (marked below) and says "(<knot> is not written yet)" at the bottom of
// the screen.
//
// HOW A scene_ KNOT SENDS ITS OUTCOME (the kit's usual pattern -
// docs/WRITING-IN-INK.txt in Knotwork)
//   VAR scene_4_outcome = "bridge"            above the knot
//   ... set it on the paths through the knot ...
//   = finish
//   ~ sceneDone("scene_4", scene_4_outcome)
//   -> DONE
//   A foe_ knot does the same with foeDone:
//   VAR foe_4_outcome = "steady"              above the knot
//   = finish
//   ~ foeDone("foe_4", foe_4_outcome)
//   -> DONE
//   Send exactly ONE outcome, once, from the finish stitch. A second one
//   is refused: the first stands, and the red banner says so. A last
//   line may run straight into finish - + [Leave] Goodbye. -> finish -
//   and the game hears the outcome only once that line has been read
//   (Knotwork 3.8-alpha). A line AFTER the outcome is sent never shows
//   the way you mean: knotcheck FAILs it. Each knot plays once a
//   campaign, so * and + choices both work.
//
// THE GAME'S CONTRACT (keep it true - ink/config.js and story/CONTRACT.txt
// say the same; GDD.md section 7 is where it was designed)
//   The player picks a paint on the title screen, Red or Blue - the
//   paint is all that differs (player_side says which) - and whether the
//   tutorial battle is played. Whose story it is, who speaks and how the
//   knots join up are the writer's.
//
//   Order of play:
//     intro       (no outcome) a new campaign starts
//     tutorial    (no outcome) before battle 0, Hook's Farm - only when
//                 the tutorial is on; Hook's Farm scores no campaign
//                 points, so playing it or not leaves the same campaign
//     foe_1, then scene_1   before battle 1 ... foe_9, scene_9 before
//                 battle 9, each pair after the battle before it and its
//                 result screen, so it can look back (last_result) and
//                 ahead. Two knots before each battle, one outcome each
//                 (the author's call, 2026-10-21).
//     foe_10, then scene_10   before battle 10, the finale
//     ending      (no outcome) after the finale; then the end screen
//                 shows the campaign score. There is one ending: the
//                 score never picks a knot.
//
//   STORY -> GAME: each foe_ knot picks how their side plays the battle
//   AFTER it; each scene_ knot's outcome changes that battle too
//   (EFFECTS in data.js).
//     foe_1 ... foe_10   their bot for battles 1-10, one of:
//               "steady"    keeps together, aims at the biggest unit
//               "cautious"  holds cover and hills, aims at guns first
//               "bold"      rides at your back line and guns, charges
//                           at even numbers
//               "clever"    keeps its guns supported, counts a melee
//                           before it charges
//               DEFAULT (while the knot is not written): the battle's
//               own bot - foe_1 steady, foe_2 clever, foe_3 clever,
//               foe_4 clever, foe_5 clever, foe_6 steady, foe_7 clever,
//               foe_8 steady, foe_9 steady, foe_10 clever.
//               This is a choice of how hard, not a sidegrade: the four
//               differ a lot.
//   The two outcomes of a scene_ knot give different kinds of help,
//   about even (a sidegrade, GDD 5.2) - the bot runs keep each pair
//   even, and may change a number in them before the design freeze.
//   * = the DEFAULT, used while the knot is not written.
//     scene_1   battle 1, The Two Hills, Fight to the Finish
//               "scout"         you see their set-up while you arrange
//                               yours                            DEFAULT
//               "move_first"    you move first and set up in your
//                               back 3 rows
//     scene_2   battle 2, The Long Wall, Blow at the Rear
//               "rear_west"     raids must reach the west half of a
//                               back line                        DEFAULT
//               "rear_east"     ... the east half
//     scene_3   battle 3, The Cottages, Defensive Game - you defend
//               "scout"         you see their set-up while you arrange
//                               yours                            DEFAULT
//               "wall"          a broken wall stands across the
//                               ground in front of your cottages
//     scene_4   battle 4, The Chalk Brook, Fight to the Finish
//               "bridge"        two more bridges over the brook  DEFAULT
//               "horse_gun"     your first gun section is a horse
//                               gun (it moves 4)
//     scene_5   battle 5, The Orchard, Blow at the Rear (the west half)
//               "forward"       your set-up zone is your back 3 rows
//                                                                DEFAULT
//               "extra_troop"   you have a cavalry troop more, and
//                               they move first
//     scene_6   battle 6, The Mill Hill, Defensive Game - you attack
//               "more_rounds"   the round limit is 2 more        DEFAULT
//               "horse_gun"     your other gun section is a horse
//                               gun too (both your guns move 4)
//     scene_7   battle 7, The Ridge, Fight to the Finish
//               "head_start"    you move first, see their set-up and
//                               have a cavalry troop more
//                                                                DEFAULT
//               "extra_squad"   you have an infantry squad more, and
//                               they move first
//     scene_8   battle 8, The Village, Defensive Game - you attack
//               "more_rounds"   the round limit is 2 more        DEFAULT
//               "wood"          a wood stands west of the middle
//     scene_9   battle 9, The Two Fords, Blow at the Rear (the whole
//               line)
//               "scout"         you see their set-up while you arrange
//                               yours                            DEFAULT
//               "forward"       your set-up zone is your back 3 rows
//     scene_10  battle 10, the finale, The Whole Floor, Fight to the
//               Finish
//               "extra_troop"   you have a cavalry troop more    DEFAULT
//               "extra_gun"     you have a gun section more
//   (The battles' names are working names: the author may rename them in
//   data.js, COUNTRY_NAMES. The game never reads the story's own words.)
//
//   GAME -> STORY: VARs the game sets just before every knot (a
//   snapshot - nothing changes them while a knot plays):
//     player_side      "red" or "blue": the paint the player chose
//     played_tutorial  true if Hook's Farm was played in this campaign
//     battles_done     how many of battles 1-10 are done: 0 before
//                      battle 1, 10 at ending
//     last_result      "none", "won", "drawn" or "lost": the last battle
//                      played, the tutorial included ("none" before the
//                      first)
//     last_points      your points in that battle (0 if none)
//     campaign_points  your total for battles 1-10 so far (the tutorial
//                      counts nothing)
//     wins, draws, losses   battles 1-10 so far
//   Points can end in .5, so last_points and campaign_points may show as
//   37.5.
//   There are no asking hooks: these VARs are everything the story can
//   know about the game.
//
//   Tags: #speaker:<key>  #end   (the box shows no pictures)
//   Speaker keys: the writer's to choose with the frame; list each in
//     ink/config.js (names: key -> the name shown). #speaker sets the
//     name above its line AND every line after it, until the next
//     #speaker; a knot starts as narration; #speaker:none is narration
//     again.
//   Content (CLAUDE.md, GDD section 8): players are "players" or "you";
//     Red and Blue are paint colours, not peoples; no real nations,
//     wars, regiments or people; toy-scale harm - pieces tip over and go
//     back in the box.
// =====================================================================

// Set by the game before every knot (a snapshot). The starting values
// are only for Inky's preview and knotcheck's story bot.
VAR player_side = "red"
VAR played_tutorial = true
VAR battles_done = 0
VAR last_result = "none"
VAR last_points = 0
VAR campaign_points = 0
VAR wins = 0
VAR draws = 0
VAR losses = 0

// The hooks: the scene_ knots SEND their outcome to the game with
// sceneDone, the foe_ knots with foeDone.
EXTERNAL sceneDone(name, outcome)
EXTERNAL foeDone(name, outcome)

// Inky's preview starts here. The game never plays this part.
-> preview
=== preview ===
+ [intro] -> intro
+ [tutorial] -> tutorial
+ [foe_1] -> foe_1
+ [More...] -> preview_2
= preview_2
+ [scene_1] -> scene_1
+ [foe_2] -> foe_2
+ [scene_2] -> scene_2
+ [More...] -> preview_3
= preview_3
+ [foe_3] -> foe_3
+ [scene_3] -> scene_3
+ [foe_4] -> foe_4
+ [More...] -> preview_4
= preview_4
+ [scene_4] -> scene_4
+ [foe_5] -> foe_5
+ [scene_5] -> scene_5
+ [More...] -> preview_5
= preview_5
+ [foe_6] -> foe_6
+ [scene_6] -> scene_6
+ [foe_7] -> foe_7
+ [More...] -> preview_6
= preview_6
+ [scene_7] -> scene_7
+ [foe_8] -> foe_8
+ [scene_8] -> scene_8
+ [More...] -> preview_7
= preview_7
+ [foe_9] -> foe_9
+ [scene_9] -> scene_9
+ [foe_10] -> foe_10
+ [More...] -> preview_8
= preview_8
+ [scene_10] -> scene_10
+ [ending] -> ending


=== intro ===
// SUMMARY: a new campaign starts, right after the title screen. Sends
// nothing. Next: tutorial (if the tutorial is on) or scene_1.
-> DONE


=== tutorial ===
// SUMMARY: only when the tutorial is on, before battle 0, Hook's Farm
// (a Fight to the Finish, 12 x 9, after Wells's own Battle of Hook's
// Farm). Sends nothing: the battle's lessons are the game's tips, and it
// scores no campaign points.
-> DONE


=== foe_1 ===
// SUMMARY: just before scene_1, for battle 1: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "steady" (the
//   battle's own bot).
-> DONE


=== scene_1 ===
// SUMMARY: before battle 1, The Two Hills - Act I's Fight to the Finish
// (12 x 10, the first curtain battle). Comes after Hook's Farm's result,
// or straight after intro when the tutorial is off (last_result "none").
// POTENTIAL OUTCOMES (sceneDone):
//   "scout"       game: you see their set-up while you arrange yours
//                                                            DEFAULT
//   "move_first"  game: you move first and set up in your back 3 rows
-> DONE


=== foe_2 ===
// SUMMARY: just before scene_2, for battle 2: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "clever" (the
//   battle's own bot).
-> DONE


=== scene_2 ===
// SUMMARY: after battle 1, before battle 2, The Long Wall - Act I's Blow
// at the Rear (12 x 10): a raid with a unit of 3 or more figures on
// their back line wins.
// POTENTIAL OUTCOMES (sceneDone):
//   "rear_west"   game: raids must reach the west half of a back line
//                                                            DEFAULT
//   "rear_east"   game: raids must reach the east half
-> DONE


=== foe_3 ===
// SUMMARY: just before scene_3, for battle 3: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "clever" (the
//   battle's own bot).
-> DONE


=== scene_3 ===
// SUMMARY: after battle 2, before battle 3, The Cottages - Act I's
// Defensive Game (12 x 10). You defend, with two-thirds of their force.
// POTENTIAL OUTCOMES (sceneDone):
//   "scout"       game: you see their set-up while you arrange yours
//                                                            DEFAULT
//   "wall"        game: a broken wall stands across the ground in front
//                 of your cottages
-> DONE


=== foe_4 ===
// SUMMARY: just before scene_4, for battle 4: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "clever" (the
//   battle's own bot).
-> DONE


=== scene_4 ===
// SUMMARY: after battle 3, before battle 4, The Chalk Brook - Act II's
// Fight to the Finish (14 x 10): a brook across the middle.
// POTENTIAL OUTCOMES (sceneDone):
//   "bridge"      game: two more bridges over the brook      DEFAULT
//   "horse_gun"   game: your first gun section is a horse gun
//                 (moves 4)
-> DONE


=== foe_5 ===
// SUMMARY: just before scene_5, for battle 5: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "clever" (the
//   battle's own bot).
-> DONE


=== scene_5 ===
// SUMMARY: after battle 4, before battle 5, The Orchard - Act II's Blow
// at the Rear (14 x 10), the west half.
// POTENTIAL OUTCOMES (sceneDone):
//   "forward"      game: your set-up zone is your back 3 rows
//                                                            DEFAULT
//   "extra_troop"  game: you have a cavalry troop more, and they move
//                  first
-> DONE


=== foe_6 ===
// SUMMARY: just before scene_6, for battle 6: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "steady" (the
//   battle's own bot).
-> DONE


=== scene_6 ===
// SUMMARY: after battle 5, before battle 6, The Mill Hill - Act II's
// Defensive Game (14 x 10). You attack their hill.
// POTENTIAL OUTCOMES (sceneDone):
//   "more_rounds"  game: the round limit is 2 more           DEFAULT
//   "horse_gun"    game: your other gun section is a horse gun too
//                  (both your guns move 4)
-> DONE


=== foe_7 ===
// SUMMARY: just before scene_7, for battle 7: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "clever" (the
//   battle's own bot).
-> DONE


=== scene_7 ===
// SUMMARY: after battle 6, before battle 7, The Ridge - Act III's Fight
// to the Finish (14 x 12).
// POTENTIAL OUTCOMES (sceneDone):
//   "head_start"   game: you move first, see their set-up and have a
//                  cavalry troop more                         DEFAULT
//   "extra_squad"  game: you have an infantry squad more, and they move
//                  first
-> DONE


=== foe_8 ===
// SUMMARY: just before scene_8, for battle 8: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "steady" (the
//   battle's own bot).
-> DONE


=== scene_8 ===
// SUMMARY: after battle 7, before battle 8, The Village - Act III's
// Defensive Game (16 x 12). You attack.
// POTENTIAL OUTCOMES (sceneDone):
//   "more_rounds"  game: the round limit is 2 more           DEFAULT
//   "wood"         game: a wood stands west of the middle
-> DONE


=== foe_9 ===
// SUMMARY: just before scene_9, for battle 9: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "steady" (the
//   battle's own bot).
-> DONE


=== scene_9 ===
// SUMMARY: after battle 8, before battle 9, The Two Fords - Act III's
// Blow at the Rear (16 x 12), the whole line.
// POTENTIAL OUTCOMES (sceneDone):
//   "scout"       game: you see their set-up while you arrange yours
//                                                            DEFAULT
//   "forward"     game: your set-up zone is your back 3 rows
-> DONE


=== foe_10 ===
// SUMMARY: just before scene_10, for battle 10: how their side plays it.
// POTENTIAL OUTCOMES (foeDone): "steady", "cautious", "bold", "clever"
//   (the contract above says how each plays). DEFAULT: "clever" (the
//   battle's own bot).
-> DONE


=== scene_10 ===
// SUMMARY: after battle 9, before battle 10 - the finale, The Whole
// Floor (18 x 12), a Fight to the Finish with the biggest armies.
// POTENTIAL OUTCOMES (sceneDone):
//   "extra_troop"  game: you have a cavalry troop more       DEFAULT
//   "extra_gun"    game: you have a gun section more
-> DONE


=== ending ===
// SUMMARY: after the finale's result screen. Sends nothing. The end
// screen follows, with the campaign score (campaign_points; wins, draws,
// losses). One ending: the score never picks a knot.
-> DONE
