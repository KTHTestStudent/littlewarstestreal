# Little Wars (working title) - Game Design Document, v0.6

Status: v0.6, 2026-10-21: v0.5 with the author's decision 14 (section 10)
- in a Defensive Game only an infantry squad gets through, and a raid
counts only after its unit has stood a turn on the back line; the data
tuning against section 5 comes next.

v0.5, 2026-10-20, after the skeleton (section 9, step 4): the
rules, the tables, the story contract and the targets as in v0.4 (the
design session, the Knotwork step and the author's yes to all of Claude's
proposals), now built as a runner-ready skeleton - data.js holds every
table, the maps of battles 1-10 are drawn roughly, and section 11 gives
the phase split. Every number is a starting value for the bot runs (step
6) to tune; the design freeze comes after them. What the author decided,
and when, is in section 10.

## 1 Pitch

A turn-based grid-tactics campaign with squad-sized armies, after H. G.
Wells's *Little Wars* (1913). Red and Blue toy armies of infantry, cavalry
and guns fight over a floor-sized Country of books, bricks, boards and
chalk. There is a tutorial battle, then ten more in three acts and a
finale, each 10-15 minutes long. A short ink story runs between battles,
and its choices change the next battle.

## 2 Pillars

1. **Wells's rules, squad-sized.** Movement by arm, guns that need crews,
   melee settled by numbers, prisoners and escorts, hidden set-up and three
   kinds of battle, played with a handful of units a side. Change only what
   a grid, a screen or the battle length forces.
2. **Short battles.** A battle takes 10-15 minutes, and a turn takes a newer
   player about a minute (section 5).
3. **Chance only where Wells left it.** Wells took coin tosses out of melee
   so strategy would beat luck; in play, the only uncertainty left was the
   toy gun's shot. Here melee is exact and only gunfire uses the seed.
4. **A toy war, not a war.** Painted figures tip over and go back in the
   box, on a Country made of household things. The tone follows Wells's
   closing argument: playing at war in miniature shows what a blundering
   thing real war is.
5. **Losing well counts.** Wells's points reward saving guns and figures and
   retreating in time. A lost battle still scores, and the campaign goes on.
6. **Checkable by bots.** The game is seeded and table-driven, with bots on
   both sides and a self-test, as in Amontillado.

## 3 The rules on the grid

The rules below are Wells's chapter III, restated for squares. The Wells
rule each comes from is in brackets (W12 = his rule 12). Every number in
bold is a starting value in data.js's RULES table (section 3.10).

### 3.1 The board and the sides

- The battlefield is a grid of squares. One square is about six inches of
  Wells's floor.
- **Next to** means the 8 squares around a square. **Within n squares**
  counts steps in any of those 8 directions (a diagonal step is one).
- The player picks Red or Blue on the title screen. The colour is paint
  only (the author's decision, 2026-10-20): the level table speaks of
  "you" and "them", and each battle gives you the same role whichever
  colour you play. Your back line is always the bottom row of the screen;
  theirs is the top row.
- Rows are numbered from your back line (row 1) up to theirs; columns are
  lettered A, B, C... from the left.

### 3.2 The arms

Units are fixed (the author's decision, 2026-10-20): a unit never splits or
merges, except that a melee that takes prisoners sends one figure off as
their escort (3.6). A unit stands on one square, and one square holds one
unit or one gun.

| Arm | Figures in a full unit | Move | Points per figure (3.9) | Notes |
|---|---|---|---|---|
| Infantry squad | **6** | **2** squares (W9) | 1 | |
| Cavalry troop | **4** | **4** squares (W10) | 1.5 | Twice the infantry's move, as in Wells |
| Gun section | a gun and **4** crew (W11) | **2** squares (W13) | crew 1; the gun 10 | A foot gun: its crew walk |
| Horse gun section | a gun and 4 cavalry crew | **4** squares (W13) | crew 1.5; the gun 10 | Only where a row or a story outcome gives one |

- Crew are figures like any other: they fight in melee and can be shot.
- In melee every figure counts one, whatever its arm (W19-21). Cavalry
  is worth more for its speed and its points, not its strength.

### 3.3 A turn

A **round** is one turn for each side. Who moves first is in each battle's
row (6.1). A side's turn goes:

1. **Guns first** (W7). Each of your guns that is in action (3.5) may fire
   or move, never both (W12). The guns step ends when any other unit
   moves.
2. **Moves.** Each unit may move once (W8). Moves can be taken back with
   Undo until End Turn, since no chance is involved; a shot can't be.
3. **End Turn.** In this order: melees are fought (3.6); empty guns are
   taken (3.7); your escorts walk (3.6); the battle checks for a result
   (section 4).

No gun fires in round 1 (W6: not before the first player's second move).
The one exception is the defender in a Defensive Game, which may fire from
its first turn (W29).

### 3.4 Moving

- A unit steps to any square next to it. Entering a square costs that
  square's move cost (6.2): floor 1, wood or hill 2. Entering a ford ends
  the move.
- Houses, walls, rocks and the river (except at fords and bridges) can't
  be entered. Nobody goes inside a house (Wells's own rule for his brick
  houses).
- A unit may pass through a square of its own side but not stop there. It
  can't enter a square with an enemy unit or any gun.
- **No squeezing past corners:** a diagonal step can't pass between two
  pieces that can't be entered and meet at that corner.
- **Contact stops a move** (W17). A unit that enters a square next to an
  enemy unit stops there, and fights at End Turn.
- **Leaving the field.** A unit on its own back line may leave the field
  instead of moving. Its figures are safe: they count for points (3.9) but
  take no more part. A gun section may leave if it could move.

### 3.5 Gunfire

- **In action** (W11). A gun is in action when at least **4** figures of
  its side count at it: its own crew, plus the figures of friendly units
  next to it. A gun that isn't in action can neither fire nor move. A gun
  moves only with its own crew of 4 or more (W13).
- **Aim and fire** (W12). Its side aims it once at a square within **10**
  squares that the gun has a line of fire to. The gun fires **4** shots at
  it.
- **Line of fire.** Draw a straight line from the gun's square to the
  target square. Houses, walls, rocks and hills on the squares in between
  block it. A gun standing on a hill fires over all of them. Woods, the
  river and units don't block.
- **Scatter** (the author's decision: aim at a square; the seed scatters
  the shot). Each shot lands on the aimed square with the chance for its
  range, otherwise on one of the 8 squares around it, each equally likely:

  | Range (squares) | Lands on the aimed square |
  |---|---|
  | 1-3 | **60%** |
  | 4-6 | **45%** |
  | 7-10 | **30%** |

  A shot that lands off the board, or on a square the gun has no line of
  fire to, does nothing.
- **Hits** (W15). A shot that lands on a unit knocks over one of its
  figures: any unit, your own included. On a gun section it is a crew
  figure. On an escort it is the escort, and the prisoners go free (3.6).
  On an empty gun it does nothing.
- **Cover.** A unit in a wood is in cover: a shot that lands on it knocks
  over a figure only on a seeded **50%** roll. A gun section that fired
  loses its cover until it next moves (W12: after firing, two of the crew
  stand behind the trail, so gunners can't fire from perfect safety).
- Shots can't be undone. Each figure tips over where it stood and goes to
  the box at the side.

### 3.6 Melee, prisoners and escorts

- **Who fights** (W18). At End Turn, every pair of opposing units next to
  each other is in contact. Each such pair, with every unit next to
  either of them, is a melee. Melees that share a unit are one melee. All
  melees are judged on the board as it stands when End Turn is pressed.
  (Two units aren't in contact across a corner they couldn't step through.)
- **Counting.** Each side counts its figures in the melee. An escort
  counts one; prisoners and empty guns count none.
- **Isolated or supported** (W16). The smaller side is isolated when the
  figures of its side outside the melee, in units within **2** squares of
  any of its units in the melee, number fewer than half of its own figures
  in the melee. Otherwise it is supported. (Two squares is one infantry
  move, Wells's "within one move".)
- **Results:**
  - Equal numbers: every figure in the melee falls (W19).
  - Unequal, the smaller side isolated: the larger side takes prisoners
    equal to the difference, at most the whole smaller side. Each other
    figure of the smaller side knocks over one figure of the larger side
    and falls (W20). Wells's own example: 9 against 11 gives 2 prisoners,
    and 7 fall on each side.
  - Unequal, the smaller side supported: every figure of the smaller side
    knocks over one of the larger side and falls (W21).
- **Who falls** (W22). Wells lets the side that charged choose who falls
  and who is taken, on both sides. Here the game chooses for the side
  whose turn it is, by a fixed order, so play stays quick and the bots
  need no rule of their own (data.js: LOSS_ORDER):
  - its own losses come from infantry first, then cavalry, then crew;
  - the other side's prisoners, then its falls, come from crew first, then
    cavalry, then infantry;
  - within an arm, the unit with the fewest figures goes first.
  The log says who fell and who was taken.
- **Escorts** (W23-24). When a melee takes prisoners, one figure of the
  taking side's largest unit in that melee (infantry before cavalry; crew
  only if nothing else is left) becomes their escort. Escort and prisoners
  stand together as an escort piece on the free square nearest that unit,
  toward its own back line. One escort takes up to **7** prisoners; more
  need a second escort.
- **An escort walks by itself** at the end of its side's turn: up to **2**
  squares toward its own back line by the shortest way, keeping out of
  contact where it can. It can't be selected. At its back line it leaves
  the field: its prisoners are held, and the escort is safe (both count
  for points).
- **Freeing prisoners.** An escort is an ordinary figure in a melee. If it
  falls or is taken, its prisoners are freed: they go back to their own
  side's box, safe. They count as living figures but don't fight again in
  this battle. (Wells has freed prisoners walk to their own back line
  before they fight again; a 10-round battle rarely leaves time for that.)

### 3.7 Guns lost and taken

- A gun section whose crew all fall or are taken leaves its gun, empty, on
  its square. An empty gun can't move. It fires when 4 figures of its side
  are next to it (3.5).
- **Taking a gun** (W26). At the end of a side's turn, an empty gun of the
  other side is taken when no figure of its own side is next to it and a
  unit of the taking side with at least 4 figures is next to it. It is
  then the taking side's gun: it fires for them by the same rule, and it
  counts for them at the end.

### 3.8 Set-up and the curtain

- Each battle's row gives a default set-up for both sides, inside their
  **set-up zones**: a side's back **2** rows, unless the row or a story
  outcome says otherwise.
- **The curtain** (W4). In a curtain battle you may rearrange your units
  inside your zone while their side is hidden. Then both sides are shown.
  The other side uses the row's default set-up.
- **Defensive Game** (W29). The defender's zone is its half of the board
  less the 2 rows nearest the middle (one move back from the middle line).
- The tutorial's set-up is fixed: no curtain, nothing to rearrange.

### 3.9 Points

At the end of a battle each side scores (W27):

- 100 for a win, 50 each for a draw;
- 10 for each gun it holds: its own and any it has taken, on the field or
  taken off it;
- 1.5 for each cavalry figure and 1 for each infantry figure that is alive
  and not a prisoner: on the field, safe off it, or freed. Crew count as
  their arm (a foot gun's crew as infantry, a horse gun's as cavalry);
- 0.5 for each figure of its own held prisoner by the other side, and 0.5
  for each prisoner it holds (held at its back line or still with an
  escort).

The campaign score is the sum of your points in battles 1-10. The tutorial
scores nothing. The score shows on each battle's result screen and at the
end, and the story can read it (section 7). It doesn't change which
ending plays (the author's decision, 2026-10-20).

### 3.10 The numbers (data.js RULES, starting values)

| Number | Start | From Wells |
|---|---|---|
| Figures: infantry squad / cavalry troop / gun crew | 6 / 4 / 4 | his mix, about halved (3.11) |
| Move: infantry / cavalry / gun / horse gun | 2 / 4 / 2 / 4 | W9, W10, W13 |
| Move cost: floor, bridge / wood, hill / ford | 1 / 2 / ends the move | - |
| Gun range | 10 squares | - |
| Shots a turn | 4 | W12 |
| On target at range 1-3 / 4-6 / 7-10 | 60% / 45% / 30% | - |
| Cover (a shot knocks a figure over) | 50% | - |
| Figures that keep a gun in action | 4 | W11 |
| Isolation distance | 2 squares | W16 |
| Prisoners per escort / escort walk | 7 / 2 squares | W23 |
| Raid size (Blow at the Rear) | 3 figures, standing through one enemy turn | W28; the hold is the author's decision 14 |
| Withdrawal after a raid | 3 turns | W28 gives six |
| Figures a unit of the attacker needs on the defender's back line (Defensive Game) | 5 (only an infantry squad) | the author's decision 14 |
| Defender's share (Defensive Game) | two-thirds | W29 |
| Attacker's quarter (Defensive Game) | a quarter | W29 |
| Set-up rows | 2 | - |
| Points | 100 / 10 / 1.5 / 1 / 0.5 / 0.5 | W27 |

### 3.11 What changes from Wells, and why

| Wells | Here | Why |
|---|---|---|
| Measured inches | squares (one is six inches) | the grid |
| Any figure goes anywhere | fixed units; only the escort splits off | clicks per turn (the author's decision) |
| 4 men within 6 inches work a gun | its own crew of 4, plus figures in units next to it | a crew that can be shot down, and support that still counts (the author's decision) |
| The toy gun's real shot | 4 shots at an aimed square, scattered by the seed | the screen (the author's decision) |
| Timed moves (W5) | no time limit; a round limit per battle | the author's decision; section 5 |
| Freed prisoners walk home, then fight again (W23-24) | freed prisoners leave the field, safe | battle length |
| An isolated group may surrender at any time (W25) | left out of the main campaign | in squad-sized melee it rarely beats fighting, and it needs its own escort rules; an Appendix candidate |
| Six moves to withdraw after a raid (W28) | three turns | battle length |
| A draw when both sides fall under 15 men (W27) | a draw line per battle (6.1) | squad-sized armies |
| Wells's preferred mix: 20-25 infantry and 12-15 cavalry per gun | a gun section, two infantry squads and one or two cavalry troops | squad-sized armies |
| Force-buying: infantry 1, cavalry 1.5, gun 10, up to 150 | not in the main campaign | an Appendix candidate (6.5) |

The Kriegspiel appendix stays out of the main campaign. It is the source
for the optional Appendix battles (6.5).

## 4 Battle types

From Wells's "Varieties of the Battle-Game" (W27-29). In every type, a side
with no armed figures left on the field (fallen, taken or gone) loses; if
both sides have none at once, it is a draw.

- **Fight to the Finish.** Remove, capture or drive off the whole enemy
  force. If both sides are under the row's draw line at the end of a turn,
  the battle is a draw. A battle still going at the round limit is a draw.
- **Blow at the Rear.** A side wins when one of its units with at least 3
  figures stands on the other side's back line (or on the half of it that
  the row marks) at the end of two of its turns running: it has stood
  there through one enemy turn, so the other side can answer it (the log
  says so when it arrives). The loser then has 3 turns to
  take its units off the field over its own back line, and the winner
  plays those turns too; they may run past the round limit. Whatever of
  the loser is still on the field after them surrenders: its figures
  count as the winner's prisoners, and any prisoners it was escorting go
  free. With no raid by the round limit, it is a draw.
- **Defensive Game.** The defender has two-thirds of the attacker's force
  (as near as whole units allow), sets up as 3.8 says, and may fire from its first turn. The attacker wins
  when, at the end of its turn, one of its units with at least 5 figures
  (an infantry squad: a cavalry troop has 4) stands on the defender's
  back line while the attacker still has at least a quarter of its
  starting figures on the field. The defender wins at the round limit, or
  as soon as the attacker is under that quarter.

## 5 Battle length and balance

### 5.1 Battle length

Targets set by the author:

- There is no time limit on turns.
- A player turn that moves every unit takes at most about a minute for a
  newer player who has done the tutorial and doesn't usually play tactics
  games.
- A battle takes 10-15 minutes, depending on skill. The finale is bigger and
  takes 20-30 minutes.
- Armies are about 4-5 units a side, up to 8-10 in the bigger battles.

What follows from them:

- A battle runs about 8-12 rounds: about a minute for the player's turn plus
  10-15 seconds for the bot's. The finale runs about 15-20 rounds.
- Each battle's row sets a round limit near the top of that range (6.1).
  At the limit, a Fight to the Finish or Blow at the Rear is a draw (the
  100 points are split), and a Defensive Game is the defender's win.
- Turns stay fast:
  - one click selects a unit and one moves it, with move ranges shown;
  - each gun is aimed once a turn: one click on the gun, one on the
    square;
  - moves can be undone until End Turn, since they involve no chance;
  - shots can't be undone.
- The bot's turn plays back quickly (under 15 seconds) and can be sped up.
- If battles run long, the levers are fewer units, a smaller board, deadlier
  guns, or Blow at the Rear in place of Fight to the Finish.

### 5.2 Balance (the author's bar, 2026-10-20: easing to even)

A "newcomer" bot plays your side, a stand-in for a fair newer player who
has done the tutorial. The row's bot style plays theirs (6.4). A draw
counts as half a win.

| Part | Your side's win rate |
|---|---|
| Tutorial | about 90% |
| Act I | about 75% |
| Act II | about 65% |
| Act III | about 55% |
| Finale | about 50% |

- Each battle within about 5 points of its part's figure.
- **Story outcomes are sidegrades** (Amontillado's rule, taken for this
  game too): each `scene_` knot's two outcomes give different kinds of
  help, and in bot runs the next battle's win rate with each is within
  about 5 points of the other.
- **The `foe_` knots are not sidegrades** (the author's call, 2026-10-21):
  each picks one of four bot styles for their side, a choice of how hard
  the battle is. dev/outcomes.js shows each style's win rate and their
  spread, and judges only the `scene_` pairs. The row's own bot (its
  default) is the one the part's target is measured with.

### 5.3 How it is checked

Bot runs (dev/bots.js, from section 9's step 6 on; about 1,000 seeded runs
per row)
report for every row of the level table:

- the win, draw and loss rates of your side;
- the rounds played: the median should fall between half and nine-tenths
  of the row's limit, and at most 1 run in 5 of a Fight to the Finish or a
  Blow at the Rear should reach the limit;
- the actions in each of your side's turns (selects, moves, aims), as a
  stand-in for clicks: about 2 per unit;
- the bot's turn time at normal playback speed.

The outcome measure (dev/outcomes.js) plays each battle with each of its
knot's outcomes. Minutes per battle come from human playtests.

## 6 Campaign

Eleven battles, played in order:

| Part | Battles | Units a side | Target | What it brings |
|---|---|---|---|---|
| Tutorial: Hook's Farm | 0 | 4 | about 10 min | the basics of play and of the story; can be skipped |
| Act I | 1-3 | 4-5 | 10-15 min | one battle of each type, so all three are met early |
| Act II | 4-6 | 5 | 10-15 min | prisoners and gun capture start to matter: river crossings, a gun on a hill |
| Act III | 7-9 | 5-6, one battle 8 | 10-15 min | harder bots, bigger Countries |
| Finale | 10 | 9-10 | 20-30 min | Fight to the Finish on the largest Country |

- **Carry-over: points only** (the author's decision). Each battle starts
  with fresh armies. The running points total is the campaign score, and
  every battle is played whatever its result.
- **The tutorial** plays Wells's worked example, the Battle of Hook's Farm
  (chapter IV), scaled down to squads (6.3). Its ink knot sends nothing
  the game reads, and it scores no campaign points, so playing it and
  skipping it leave the same campaign.
- **Each battle is a row** in data.js's level table (LEVELS), and each
  Country a map of letters in data.js (COUNTRIES), so adding or changing a
  battle is a data change, not new code.

### 6.1 The level table

Units: G = gun section, I = infantry squad, C = cavalry troop (section 3.2),
with the figures in brackets. "First" is who moves first. The set-up zone
is the back 2 rows unless the row says otherwise. The draw line is for
Fight to the Finish and Blow at the Rear (section 4). Country names are
working names: the author may rename any of them by hand in data.js
(COUNTRY_NAMES).

| # | Part | Type | Country (board) | You | Them | First | Set-up | Rounds | Draw line | Their bot (`foe_` default) | Knots before | Target |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Tutorial | Fight to the Finish | Hook's Farm (12×9) | G 2I C (20) | G 2I C (20) | them | fixed (6.3), no curtain | 8 | 4 | gentle | `tutorial` (sends nothing) | 90% |
| 1 | Act I | Fight to the Finish | The Two Hills (12×10) | G 2I C (20) | G 2I C (20) | them | curtain | 10 | 4 | steady | `foe_1`, `scene_1` | 75% |
| 2 | Act I | Blow at the Rear: the half `scene_2` picks | The Long Wall (12×10) | G 2I 2C (24) | G 2I 2C (24) | you | curtain | 10 | 4 | steady | `foe_2`, `scene_2` | 75% |
| 3 | Act I | Defensive Game: you defend | The Cottages (12×10) | G 2I (16) | G 2I 2C (24) | them | curtain; you rows 1-3, them rows 9-10 | 10 | - | steady | `foe_3`, `scene_3` | 75% |
| 4 | Act II | Fight to the Finish | The Chalk Brook (14×10) | G 2I 2C (24) | G 2I 2C (24) | them | curtain | 11 | 4 | steady | `foe_4`, `scene_4` | 65% |
| 5 | Act II | Blow at the Rear: the west half | The Orchard (14×10) | G 2I 2C (24) | G 2I 2C (24) | you | curtain | 10 | 4 | bold | `foe_5`, `scene_5` | 65% |
| 6 | Act II | Defensive Game: you attack | The Mill Hill (14×10) | G 2I 2C (24) | G 2I (16) | you | curtain; you rows 1-2, them rows 8-10 | 10 | - | cautious | `foe_6`, `scene_6` | 65% |
| 7 | Act III | Fight to the Finish | The Ridge (14×12) | G 3I 2C (30) | G 3I 2C (30) | them | curtain | 12 | 5 | clever | `foe_7`, `scene_7` | 55% |
| 8 | Act III | Defensive Game: you attack | The Village (16×12) | 2G 4I 2C (40) | G 3I C (26) | you | curtain; you rows 1-2, them rows 9-12 | 12 | - | clever | `foe_8`, `scene_8` | 55% |
| 9 | Act III | Blow at the Rear: the whole line | The Two Fords (16×12) | G 3I 2C (30) | G 3I 2C (30) | you | curtain | 12 | 5 | cautious or bold, as `scene_9` picks | `foe_9`, `scene_9` | 55% |
| 10 | Finale | Fight to the Finish | The Whole Floor (18×12) | 2G 4I 3C (44) | 2G 4I 3C (44) | them | curtain; each side's back 3 rows | 18 | 7 | clever | `foe_10`, `scene_10` | 50% |

The story outcomes (section 7) change the row of the battle after their
knots: the `foe_` knot picks their bot's style; the `scene_` knot changes
who moves first, the curtain, the set-up zone, a unit more, a horse gun,
the round limit, the raid's half, or one of the row's switchable pieces.

The Countries, drawn as data.js maps (the skeleton drew them roughly from
this table; the bot runs reshape them):

| # | Country | Pieces | What it is for |
|---|---|---|---|
| 1 | The Two Hills | a hill on each half, a wood in the middle, two rocks | the first curtain; a gun on its hill fires over the rocks; the wood is the cover to fight for |
| 2 | The Long Wall | a wall across the middle with three gaps; a wood on the west; a chalk stream with a ford on the east | the gaps are where melees happen; the two halves differ, for `scene_2`'s choice |
| 3 | The Cottages | three cottages and a wood on your half; open ground and one hill on theirs | the defender's cover. Switchable: `wall`, a wall in front of your cottages |
| 4 | The Chalk Brook | a river across the middle with a bridge in the centre and a ford near each side; woods on both banks | crossings force melees, so prisoners matter. Switchable: `bridge`, a second bridge |
| 5 | The Orchard | rows of trees (wood) inside a broken wall on the west; houses on the east | raids go through the orchard or past the houses |
| 6 | The Mill Hill | their hill, with a mill (a house) and a wall on it; a wood on your half; open slopes | their gun on the hill is the one to take |
| 7 | The Ridge | a long hill across the middle with one gap; woods at both ends; two houses | high ground: guns on the ridge see far |
| 8 | The Village | houses and walls in a cluster on their half; a wood and a hill on yours | houses block fire, so the fighting is close. Switchable: `wood`, a wood in the middle |
| 9 | The Two Fords | a river across the middle with two fords and a bridge; a hill on each half | three ways to the rear, each a narrow one |
| 10 | The Whole Floor | every piece: two hills, woods, a river with a bridge and two fords, houses, walls, rocks | the biggest Country |

### 6.2 The Countries' pieces

From Wells's kit: board hills, twig woods, solid brick houses, walls, rocks,
and chalk rivers with fords and bridges. A map in data.js is rows of these
letters, their back line on top (the author can hand-edit a map).

| Piece | Letter | Move cost | Line of fire | Cover | Drawn as |
|---|---|---|---|---|---|
| Floor | `.` | 1 | open | no | the cork floor |
| Wood | `w` | 2 | open | yes | twigs |
| Hill | `h` | 2 | blocks, but a gun on a hill fires over everything | no | boards stacked on books |
| House | `H` | can't enter | blocks | - | a brick block (a map may give a named house its own letter, such as `F` for Hook's Farm) |
| Wall | `=` | can't enter | blocks | - | a line of bricks |
| Rock | `r` | can't enter | blocks | - | a stone |
| River | `~` | can't enter | open | - | a chalk line |
| Ford | `f` | ends the move | open | no | a gap in the chalk |
| Bridge | `b` | 1 | open | no | a board over the chalk |

Roads are left out of the main campaign. Faster moves on roads are an
Appendix rule (6.5).

**Layout rule.** Wells's layout advice becomes a level-design rule. A
crowded Country makes the guns stop mattering. A wide open middle, or
rivers with few crossings, makes for dull cannonades. When unsure, add
cover.

### 6.3 The tutorial: Hook's Farm

Wells's Battle of Hook's Farm was a Fight to the Finish between equal
forces of three guns, about fifty infantry and twenty-five cavalry a side.
Red won the toss, moved first, and split its force: a small group went for
Firely Church and the main body for the farm, with open ground between
them. Blue's gun in the central wood opened the firing, and Blue won: at
the end it held two captured guns and six prisoners.

Here the bot plays Wells's Red role (whatever paint it wears), and you play
Blue's. The lesson is the one Red's split offers: a force split across open
ground can be beaten a half at a time.

The map (12×9; row 9, their back line, at the top):

```
      A B C D E F G H I J K L
   9  . . . . . . . . . . . .   their back line
   8  . . . . . . . . . . . .
   7  . . . . . c . . . w w .
   6  . h h h . . . . . . . .
   5  . h F h . . o . . C . .
   4  . h h h . . . . . . . .
   3  . . o . w . w w . . . .
   2  . . . . . . w . . . . .
   1  . . . . . . . . . . . .   your back line
```

- `F` Hook's Farm (a house) on its gentle hill, left of centre.
- `C` Firely Church (a house), on the right.
- `o` two outbuildings (houses): one behind the farm (C3), one in the
  hollow between farm and church (G5).
- `c` the cottage (a house), on level ground toward their side (F7).
- `w` woods: the central wood (G2, G3, H3), the thin wood between the farm
  and the central wood (E3), and the wood between the church and their
  back line (J7, K7).
- The open ground between farm and church (E4-I6) has only the hollow's
  outbuilding for cover.

The set-up (fixed):

| Side | Gun | Infantry | Infantry | Cavalry |
|---|---|---|---|---|
| Them: the main body, for the farm | C9 | B8 | - | D8 |
| Them: the small group, for the church | - | - | K8 | - |
| You | G2, in the central wood (cover) | D2 | I2 | F1 |

- They move first. The round limit is 8 and the draw line 4.
- Their bot, "gentle": the main body heads for the farm and the small group
  for the church; it never joins the two up, and it charges only with twice
  the figures.
- Teaching beats: game tips from data.js (TIPS), shown when each first
  matters, not ink. Selecting and moving; Undo; guns first and the quiet
  first round; aiming and scatter; cover in the central wood; contact and
  melee; isolated or supported (their small group by the church);
  prisoners and their escort; an empty gun and taking it; leaving the
  field; points.
- It scores no campaign points.

### 6.4 The bots

Every bot choice is seeded too, so a battle replays from its seed. The
style is a row of numbers in data.js (BOT_STYLES), so tuning a bot is a
data change.

| Style | Moves | Aims at | Charges when |
|---|---|---|---|
| gentle | advances group by group, never joins groups up | the nearest unit | it has twice the figures |
| steady | keeps its units within 2 squares of each other | the unit with the most figures in reach | it has more figures and is supported |
| cautious | holds cover and hills; advances when fired on from out of its reach | the crew of guns first | the other side is isolated |
| bold | sends cavalry at the back line (Blow at the Rear) or at guns | the crew of guns first | it has at least as many figures |
| clever | as steady, and keeps its guns supported, pulls back units that would be isolated | the square with the most figures likely hit | it counts the melee's result and comes out ahead |
| newcomer | your side in bot runs only: as steady, but now and then (seeded) takes a plain move instead of the best one | | |

How the skeleton plays these (data.js BOT_STYLES, one row of numbers per
style; the phase steps in the spec say it exactly):

- A bot's turn: guns first, then the other units, each looked at once. A
  gun fires if it may and has a target; otherwise it, like any unit, moves
  to its best square (or stays).
- Aiming: "nearest", "most" and "guns" never aim at a unit that has one of
  the bot's own units next to it; "best" weighs every square a shot may
  land on, its own figures counting against.
- Where a unit heads: home when its side withdraws after a lost raid;
  cavalry at the back line in a Blow at the Rear (the row's half), and at
  the defender's when attacking in a Defensive Game, but only with enough
  figures to win there (raidSize, throughSize - with throughSize 5 the
  attacker's cavalry fight instead); in a Blow at the Rear,
  and for the defender, the enemy units in its own half (raiders) first; a
  gentle unit for its group's goal square (ARMIES) while no enemy is within
  `groups` squares; bold cavalry at the enemy's guns; otherwise the nearest
  enemy.
- A square's score: `advance` points a step closer; a gun instead scores
  the enemy units it could aim at from there; `cover` for a wood or hill,
  and `hold` more for staying put there while not fired on (cautious);
  `together` off with no friend within the isolation distance; `guard`
  (clever) for standing by a gun short of crew, and off where it would be
  isolated with an enemy able to reach it next turn.
- A unit moves into contact only when its charge rule allows; a gun never.

### 6.5 Appendix (optional, later)

If the game goes well, the Appendix adds 2-3 battles after the finale. They
use more complex rules drawn from Wells's Kriegspiel appendix, such as:

- faster moves on roads;
- shells with a blast radius;
- rivers that guns can't cross;
- entrenchments;
- cavalry charges scored by distance;
- the force-buying muster screen;
- surrender (W25).

The Appendix has no story, or very little. The game and its story end at
the finale, so the Appendix can be added later without touching either.
Its rules are restated without the appendix's British Army framing
(section 8).

## 7 Story (Knotwork): the contract

The game and the story agree on this contract. The skeleton session
(section 9, step 4) writes it in three more places that must then stay in step: the
CONTRACT at the top of story/story.ink, ink/config.js (what knotcheck
checks), and story/CONTRACT.txt (one page for the writer, as in
Amontillado). Amontillado's contract is the model.

### 7.1 Order of play

```
title     choose Red or Blue; the tutorial on or off (game screens)
intro     a new campaign starts                        sends nothing
tutorial  before Hook's Farm, only with the tutorial on sends nothing
          battle 0, Hook's Farm, then its result screen
foe_1     before battle 1: how their side plays it     sends an outcome
scene_1   just after foe_1                             sends an outcome
          battle 1, then its result screen
...       foe_2, scene_2 to foe_9, scene_9, each pair before its battle,
          the same way
foe_10    before the finale: how their side plays it   sends an outcome
scene_10  just after foe_10                            sends an outcome
          battle 10, the finale, then its result screen
ending    after the finale                             sends nothing
          the end screen: the campaign score
```

Each `foe_` and `scene_` knot comes after one battle and before the next,
so it can look back (`last_result`) and ahead. A battle has two knots,
one outcome each (the author's call, 2026-10-21): Knotwork's one-outcome
rule stays, and the story splits into more knots rather than giving one
knot two results. The story's frame (whose story it is,
who speaks) is the author's.

### 7.2 The knots and their outcomes

Each `foe_` and `scene_` knot sends one outcome, and the game applies it
to the next battle's row (the `foe_` knot's with `foeDone`, the `scene_`
knot's with `sceneDone`). The DEFAULT, marked *, is what the game uses when the knot
isn't written yet. The outcomes are named for what they do in the game, so
they fit any frame the author picks.

| Knot | Before | Outcomes → what the game does to that battle | Default |
|---|---|---|---|
| `intro` | the campaign | none | - |
| `tutorial` | Hook's Farm | none | - |
| `scene_1` | 1, Fight to the Finish | *"scout" → you see their set-up while you arrange yours; "move_first" → you move first | scout |
| `scene_2` | 2, Blow at the Rear | *"rear_west" → raids must reach the west half of a back line; "rear_east" → the east half | rear_west |
| `scene_3` | 3, Defensive Game (you defend) | *"scout" → as above; "wall" → a wall stands in front of your cottages | scout |
| `scene_4` | 4, Fight to the Finish | *"bridge" → a second bridge over the brook; "horse_gun" → your gun section is a horse gun (moves 4) | bridge |
| `scene_5` | 5, Blow at the Rear | *"forward" → your set-up zone is your back 3 rows; "extra_troop" → you have a cavalry troop more | forward |
| `scene_6` | 6, Defensive Game (you attack) | *"more_rounds" → the round limit is 2 more; "horse_gun" → your gun section is a horse gun | more_rounds |
| `scene_7` | 7, Fight to the Finish | *"head_start" → you move first and see their set-up; "extra_squad" → you have an infantry squad more | head_start |
| `scene_8` | 8, Defensive Game (you attack) | *"more_rounds" → the round limit is 2 more; "wood" → a wood stands in the middle | more_rounds |
| `scene_9` | 9, Blow at the Rear | *"scout" → as above; "forward" → your set-up zone is your back 3 rows | scout |
| `scene_10` | 10, the finale | *"extra_troop" → you have a cavalry troop more; "extra_gun" → you have a gun section more | extra_troop |
| `foe_1` ... `foe_10` | 1-10, just before that battle's `scene_` knot | "steady", "cautious", "bold" or "clever" → their bot plays that style (6.4) | the row's own bot (6.1) |
| `ending` | the end screen | none | - |

- The pairs are starting pairs (the author's yes, section 10) for the bot
  runs to even out (5.2): the bot runs
  may change a number (two rounds more, a troop more) or swap an outcome's
  effect, and the author writes the knots to fit what is settled.
- In data.js, each outcome is a list of steps (EFFECTS, with DEFAULTS),
  as in Amontillado: `["first", "you"]`, `["scout"]`, `["rear", "west"]`,
  `["piece", "wall"]`, `["horseGun"]`, `["setupRows", 3]`,
  `["unit", "cavalry"]`, `["rounds", 2]`, `["style", "cautious"]`. A
  `foe_` knot's four outcomes are the styles, each `[["style", <it>]]`;
  its default is the row's bot, so it has no DEFAULTS line.

### 7.3 Rules for every knot

- **One outcome per `foe_` or `scene_` knot**, once, from its finish stitch, with
  the outcome VAR set on each path through the knot (Knotwork's usual
  pattern):

  ```
  VAR scene_4_outcome = "bridge"
  ...
  = finish
  ~ sceneDone("scene_4", scene_4_outcome)
  -> DONE
  ```

  A second outcome from the same knot is refused: the first stands, and
  the red banner says so. A last line may run straight into finish
  (`+ [Leave] Goodbye. -> finish`): the game hears the outcome once that
  line has been read (Knotwork 3.8-alpha). Nothing may come after the
  outcome is sent.
- **No outcome for some knots.** `intro`, `tutorial` and `ending` send
  nothing. Knotcheck reports a WARN for each; that is expected and breaks
  neither the story nor play.
- **Each knot plays once a campaign.** A new campaign starts the story
  over. So no knot is in config.js's `again` list, and `*` or `+` choices
  both work.
- **An unwritten knot** is skipped: the game uses its DEFAULT and says
  "(scene_4 is not written yet)" at the bottom of the screen.

### 7.4 The hook

| Hook | Kind | What it does |
|---|---|---|
| `sceneDone(name, outcome)` | sends an outcome | for the `scene_` knots |
| `foeDone(name, outcome)` | sends an outcome | for the `foe_` knots: a bot style |

There are no asking hooks: the VARs below tell the story everything it can
know.

### 7.5 VARs the game sets before every knot

| VAR | Value |
|---|---|
| `player_side` | "red" or "blue": the paint the player chose |
| `played_tutorial` | true if the tutorial battle was played in this campaign |
| `battles_done` | how many of battles 1-10 are done: 0 before battle 1, 10 at `ending` |
| `last_result` | "none", "won", "drawn" or "lost": the last battle played, the tutorial included ("none" before the first) |
| `last_points` | your points in that battle (0 if none) |
| `campaign_points` | your total for battles 1-10 so far (the tutorial counts nothing) |
| `wins`, `draws`, `losses` | battles 1-10 so far |

Points can end in .5 (3.9), so `last_points` and `campaign_points` may
show as 37.5.

### 7.6 Speakers and tags

- `#speaker:<key>` shows a name above the line, and above every line
  after it until the next `#speaker`; `#speaker:none` is narration again,
  and a knot starts as narration (Knotwork's rule). The keys and names are
  the author's to choose with the frame; ink/config.js's `names` stays
  empty until then.
- The kit also knows `#end`. The game has no tags of its own.

## 8 Look and content

**Look.** Early-1900s painted toy soldiers on a cork floor: glossy figures on
round bases, simple tunics in the side's colour, white cross-belts and dark
trousers. Cavalry ride horses, and guns are small two-wheeled pieces with
long trails. A unit shows its figures standing together on one square. The
Country is drawn by code, like everything else: stacked boards for hills,
twigs for trees, brick-block houses, and chalk lines for rivers and roads.
Fallen figures tip over and go to a box at the side. Prisoners face away and
walk to the back line with their escort.

**Telling the sides apart.** Red and Blue are Wells's own sides (Hook's Farm,
and the examples in his rules). Each side also gets its own hat silhouette
and base marking, so the board reads without colour. Taken (the author's
yes, section 10; the skeleton's THEME table, his to hand-edit): Red
figures wear a tall flat-topped hat and stand on a plain ring; Blue
figures wear a round-domed hat and stand on a base with a bar across it.
Neither copies a real army's headgear. Both sides' units get the same kinds of names (data.js).

**Left out of Wells.** None of this goes into the game, its words or its art:

| In Wells | Where |
|---|---|
| Gendered address of players ("boys", "he") and remarks about girls and women: the subtitle, "girls of the better sort", visitors' "empty disdain of their sex", "a daring ornament of her sex", "the manhood of the world" | title, I, II, IV, VI |
| "Civilised" versus "barbaric" warfare | I, II |
| The war in South Africa (a helper "hot from" it, a "Boer-like" force) and a khaki escort | II, III, IV |
| National rivalry: defiance "eastward" across the sea, "Welt Politik" | VI |
| The British Army institutions of the Kriegspiel appendix, and its co-designer Mark Sykes, later co-author of the 1916 Sykes-Picot agreement dividing the Ottoman Middle East between Britain and France (only the appendix's mechanics, restated, may return in the optional Appendix) | appendix |
| The boastful general persona and its "manly" swagger | IV |

**Kept from Wells.** Red and Blue, the floor-game warmth, and the closing
argument against real war, kept as tone rather than quotation.

**Not from Team Fortress 2.** Red versus Blue comes from Wells. The game has
no "BLU", no class archetypes, company names or logos, and nothing of its
art style.

## 9 Order of work

As in Amontillado, the design is settled before the story.

1. Author, by hand: the repository and setup files (FULL-GUIDE steps 1-4).
   Done 2026-10-20.
2. Cloud, Opus 5.5: the design session. Section 10 settled; the rules, the
   tables, the story contract and the targets written (this version).
   Done 2026-10-20.
3. Cloud, Opus 5.5: Knotwork in, before the skeleton (the author's
   decision, 2026-10-20). Knotwork 3.8-alpha's own files, copied unedited
   (section 11), CREDITS.txt, and the disclosure's new sentence in the
   author's words (section 10). Done 2026-10-20.
4. Cloud, Opus 5.5 high: the runner-ready skeleton (PHASE blocks, data.js
   with all eleven rows and rough maps, self-test, spec, reference, stub
   commit), the story contract's other three copies (section 7), and
   HANDOFF.txt. The first target is the tutorial battle playing end to
   end; the other ten battles are then mostly table rows. Done 2026-10-20
   (Opus 5.5, extra effort, the author's choice): all eleven battles play
   end to end with bots on both sides.
5. Runner on the laptop, no Claude session: the builder writes the PHASE
   blocks. A Sonnet 5.5 laptop session is used only to plan, approve and
   read reports.
6. Cloud, Opus 5.5 medium: the cloud check, then the bot runs for balance
   and battle length (section 5), then a design freeze.
7. Author, by hand: the story in Inky. A cloud session may review it.
8. Author: playtests (including minutes per battle) and the release.
9. Later, if it goes well: the Appendix, through the same chain.

## 10 Decisions

Decided by the author, 2026-10-20 (before the design session):

- **Scope:** 11 battles (a tutorial, three acts of three, a finale). The
  Appendix comes later and is optional.
- **Gunfire:** aim at a square; the seed scatters the shot around it.
- **Units:** groups of figures, with squad-sized armies (4-5 units a side,
  up to 8-10).
- **Timing:** no timed moves. A newer player's turn takes about a minute at
  most. Battles take 10-15 minutes, the finale 20-30.
- **Sides:** the player picks a side; both sides are fully symmetrical.
- **Carry-over:** points only, at first.
- **Engine:** no Phaser. Plain canvas, as in Amontillado.
- **Tutorial knots:** they send no outcome, as Amontillado's intro knot
  does. Knotcheck's WARN for them is expected.
- **Author's calls:** the title, the repository name and the story frame.

Decided by the author in the design session, 2026-10-20 (Claude's leans,
taken):

- **Units and crews:** fixed units (infantry squad 6, cavalry troop 4, gun
  and 4 crew), never split except the automatic prisoner escort. A gun has
  its own crew, and figures in friendly units next to it count toward its
  4.
- **Sides:** the colour is paint only. The level table speaks of "you"
  and "them"; each battle gives you the same role whichever colour you
  play; the story can read the colour.
- **The campaign score:** score only. One ending; the end screen shows the
  total, and the story can read it but it never picks a knot.
- **The balance bar:** easing to even: about 90% for the tutorial, 75%
  Act I, 65% Act II, 55% Act III, 50% the finale (5.2).
- **Board sizes and round limits:** starting numbers in the level table,
  for the bot runs to tune.

Decided by the author after the design session, 2026-10-20:

- **Knotwork comes in before the skeleton** (section 9, step 3), so the
  skeleton reads the kit's real files.
- **The disclosure names Knotwork and inkjs.** The line becomes, in his
  words: "AI Disclosure: code by Claude Opus 5.5. Design and decisions by
  Kenton Howard. Includes Knotwork (see its own AI disclosure) and inkjs
  (inkle, MIT)." No version in the line, so a Knotwork renumbering leaves
  it alone; CREDITS.txt gives the version. The Knotwork step applies it.

Decided by the author after reviewing Claude's proposals in v0.4,
2026-10-20: yes to all of them. They are design now, not proposals; the
numbers among them stay starting values for the bot runs, and the words
and numbers stay his to hand-edit in data.js.

- Steps in 8 directions; contact stops a move; no squeezing past corners.
- Line of fire blocked by houses, walls, rocks and hills, with a gun on a
  hill firing over them; woods give cover instead.
- The scatter numbers, the cover roll, the range of 10.
- The fixed loss order in melee (3.6), in place of the charger's choice.
- Escorts walk by themselves; freed prisoners leave the field safe;
  surrender is left to the Appendix; a raid's withdrawal is 3 turns.
- The eleven rows, the Countries and Hook's Farm's scaled-down map.
- The bot styles.
- Story: the `scene_` prefix and `sceneDone` hook, the outcomes as
  sidegrade pairs (Amontillado's rule) named for what they do, the
  defaults, and the VARs.
- The hat shapes and base marks.

Decided by the author, 2026-10-21:

- **Two knots before each battle:** a `foe_` knot picks their bot's style
  from all four (steady, cautious, bold, clever), then the `scene_` knot
  sends its other outcome. The kit's one-outcome-per-knot rule stays
  (Knotwork 3.8-alpha's knotcheck allows one hook call per knot).
  `scene_9`'s pair, which picked their bot before, is now "scout" /
  "forward".

Decided by the author, 2026-10-21 (decision 14, his answers to the first
bot runs' questions):

- **Defensive Game:** only infantry can get through (throughSize 5), and
  the bots' cavalry fight instead of waiting on the back line.
- **Blow at the Rear:** a raider counts after one turn on the back line,
  so the other side can answer it. "Through" in a Defensive Game gets no
  such hold.
- **Tuning:** your side gets the help first; the balance targets hold for
  the easiest of the four `foe_` styles in each battle; river stalls are
  fixed with more crossings on the maps, not in the bots; an outcome's
  effect may change, keeping its name.
- Still open: whether the defender may get more than two-thirds of the
  force, more cover, or fewer rounds (section 4 says two-thirds).

Still open (later):

- The author: the title, the story's frame and speakers, the Country
  names if he wants his own, the licence.
- The bot runs: every number, the maps of battles 1-10 (drawn roughly by
  the skeleton) and the bots' numbers.

## 11 Code layout

As in Amontillado: one page holds all the code, and one file holds the
tables a person can hand-edit.

| File | What it holds | Written by |
|---|---|---|
| `game.html` | all the code: a red-banner script at the very top, STATE AND HELPERS (canvas, state, seeded `rng`, words), the PHASE blocks (the rules), GAME FLOW (the campaign, screens, conversations, input, drawing, the bots' turn playback, the tables' banner checks, the in-game self-test), and the title screen's AI disclosure | Claude's skeleton; the local builder's PHASE blocks |
| `data.js` | tables and their comments only, last line `DATA_OK`: RULES, LOSS_ORDER, ARMS, PIECES, COUNTRIES (the maps), COUNTRY_NAMES, LEVELS (the eleven rows), EFFECTS and DEFAULTS (the story's outcomes), BOT_STYLES, the words (SCREEN_WORDS, TIPS, LOG_WORDS, UNIT_NAMES), THEME (colours, hats, base marks) | Claude; the author's hand edits |
| `ink/config.js` | this game's contract, for the kit and knotcheck | Claude |
| `ink/story.js` | the compiled story (Inky's export) | the author |
| `ink/ink.js`, `LICENSE-INKJS.txt` | inkjs and its licence, unedited, as Knotwork ships them | inkle (MIT) |
| `ink/dialogue.js`, `tools/` (knotcheck, viewer, pack) | unedited copies from Knotwork 3.8-alpha, brought in before the skeleton (section 9, step 3) | Knotwork (its own AI disclosure) |
| `story/story.ink` | the story. The skeleton writes only the contract header and empty knots with their summaries | the author |
| `story/CONTRACT.txt` | the contract on one page, for the writer | Claude |
| `dev/` | headless checks: `selftest.js` (prints the SELF-TEST line), `bots.js` (the bot runs), `linemap.py` (the spec's LINE MAP), `inkc.sh` (compiles ink as Inky does), `README.txt`; `outcomes.js` (the outcome measure, 5.3) and `tryout.js` (bot runs with a table changed for one run); `playruns.js` when the story needs it (Knotwork's `tools/knotcheck.js` runs headless as it is); and `disclosure.js`, the Auto-Disclosure-Tool's unedited copy | Claude |
| `specs/LITTLEWARS-SPEC.txt` | the builder's spec: steps per phase, EXPECTED self-test lines, CHECK walks, FIXER PROMPT, LINE MAP | Claude |
| `CREDITS.txt` | who made what, the disclosure line, Knotwork's version and repository, inkjs's licence (from the Knotwork step on) | Claude (the author's words where he gives them) |
| `hand-edits.txt` | the author's hand-edit guide to data.js (from the skeleton on) | Claude |

- The reference branch holds `dev-reference/` (Claude's answer code). It
  never reaches the laptop's clone or a builder's prompt.
- The phase split (the skeleton's, 2026-10-20): 24 small blocks, PHASE 2
  to PHASE 25, each a few functions of about 30-55 lines, so that the local
  builder finishes each inside its 10-minute limit (in Amontillado, blocks
  of 34-57 lines took it 3 to 10 minutes). PHASE 2 the armies; 3 steps and
  contact; 4 reach; 5 moving units and leaving the field; 6 line of fire;
  7 crews and isolation; 8 gunfire; 9 who fights; 10 melee results; 11
  losses and freed prisoners; 12 escorts; 13 fighting and guns taken; 14
  escorts walk; 15 End Turn; 16 a raid's withdrawal and surrender; 17 the
  result; 18 points and the campaign; 19 the story's outcomes; 20-25 the
  bots. The board helpers (pieces, distance, path grids, escort squares)
  are the skeleton's. specs/LITTLEWARS-SPEC.txt has each phase's steps.
- The AI disclosure check (`node dev/disclosure.js`) counts as code:
  game.html, data.js, ink/ (less story.js, ink.js and dialogue.js) and dev/
  (less disclosure.js); the story is story/story.ink and ink/story.js
  (disclosure.jsonc). Knotwork's and inkjs's files are left out of that
  count; the line's last sentence names them instead (section 10).
  CREDITS.txt joined the files that hold the line in the Knotwork step;
  game.html (the title screen) joins with the skeleton.
