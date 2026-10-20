# Little Wars (working title) - Game Design Document, v0.3

Status: v0.3, 2026-10-20, after the author's first review (scope, battle
length, answers to the first open questions) and his answer on knots with
no outcome. Decisions so far and what is
still open are in section 10. The cloud design session settles the rest
with the author and fills in the tables.

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

## 3 From Wells to the grid

**Units.** A unit is a small group of figures of one arm on one square: an
infantry squad, a cavalry troop, or a gun section (a gun and its crew). It
moves and fights as one. Wells's rules count figures, so melee, isolation
and points still count figures.

Proposed scale: one square is six inches of Wells's floor, so a foot is two
squares. Every number here is a proposal until the design session.

| Wells (chapter III unless noted) | Grid proposal |
|---|---|
| Infantry moves up to 1 foot | an infantry squad moves 2 squares |
| Cavalry moves up to 2 feet | a cavalry troop moves 4 squares |
| A gun is in action with at least 4 of its side within 6 inches | a gun section is in action with at least 4 crew; figures in friendly units next to it count too |
| A gun in action either moves or fires (up to 4 shots), never both | same; the player aims once, and every shot lands near that square, scattered by the seed |
| A moving gun takes 4 crew with it, at cavalry speed only with 4 cavalry crew | 4 squares with a cavalry crew, otherwise 2 |
| After firing, the gun keeps pointing along its last shot, with 2 crew behind its trail, so gunners can't fire from perfect safety | a section that fired loses its cover until it next moves |
| Guns first: guns act before any figures move | same |
| No gunfire before the first player's second move | same |
| Isolated: fewer than half its own number of friends within one move | same, counting friendly figures in units within one move |
| Melee: all figures in contact, plus all within 6 inches of them | the units that touch, plus friendly units next to them |
| Equal numbers: all are removed | same |
| Unequal, smaller side isolated: the difference become prisoners, the rest trade one for one | same; prisoners capped at the smaller side's size |
| Unequal, smaller side supported: each smaller-side figure removes one enemy and is removed | same |
| The side that charged chooses who falls and who is captured | same; bots need a rule for this choice |
| Prisoners: one escort within 6 inches for up to seven; freed if the escort falls; must reach their own back line before fighting again | the capturing unit sends one figure back as the escort; the rest as Wells has it |
| An isolated group may surrender at any time | same |
| A gun is captured when none of its side is within 6 inches and 4 enemies have passed its axle in their direction of attack | no enemy within 1 square, and a unit of at least 4 figures ends a move in or past the gun's square, moving in its attack direction |
| Curtain: both sides set up out of each other's sight | the level table gives a default set-up; the player may rearrange it behind a screen, then both sides are revealed |
| Timed moves | none (decided); length comes from unit count, board size and a round limit (section 5) |
| Points: 100 a win, 10 a gun, 1.5 a cavalry, 1 an infantry, 0.5 per own figure held prisoner, 0.5 per prisoner held; a draw when both sides fall under 15 | the same points per figure; the draw line is set per battle in the level table |
| Force-buying: infantry 1, cavalry 1.5, gun 10, up to 150 | not in the main campaign; an Appendix candidate (section 6) |
| Wells's preferred mix: 20-25 infantry and 12-15 cavalry per gun | default army: a gun section, two infantry squads and one or two cavalry troops |

The Kriegspiel appendix stays out of the main campaign. It is the source
for the optional Appendix battles (section 6).

## 4 Battle types

From Wells's "Varieties of the Battle-Game":

- **Fight to the Finish.** Remove, capture or drive off the whole enemy
  force.
- **Blow at the Rear.** A unit of at least three figures on the enemy's back
  line (or a marked half of it) wins. The loser then has six moves to get
  everyone off the field, and whatever is left surrenders.
- **Defensive Game.** The defender has two-thirds of the attacker's force,
  sets up anywhere on its side more than one move from the middle line, and
  may fire at once. The attacker wins by reaching the defender's back line
  with a quarter of its starting strength.

## 5 Battle length

Targets set by the author:

- There is no time limit on turns.
- A player turn that moves every unit takes at most about a minute for a
  newer player who has done the tutorial and doesn't usually play tactics
  games.
- A battle takes 10-15 minutes, depending on skill. The finale is bigger and
  takes 20-30 minutes.
- Armies are about 4-5 units a side, up to 8-10 in the bigger battles.

What follows from those targets (proposals):

- A battle runs about 8-12 rounds: about a minute for the player's turn plus
  10-15 seconds for the bot's. The finale runs about 15-20 rounds.
- Each battle's row sets a round limit near the top of that range. A battle
  still undecided at the limit is a draw, scored as Wells scores a draw (the
  100 points are split).
- Turns stay fast:
  - one click selects a unit and one moves it, with move ranges shown;
  - each gun is aimed once a turn;
  - moves can be undone until End Turn, since they involve no chance;
  - shots can't be undone.
- The bot's turn plays back quickly (under 15 seconds) and can be sped up.
- If battles run long, the levers are fewer units, a smaller board, deadlier
  guns, or Blow at the Rear in place of Fight to the Finish.

How it is checked: bot runs report rounds per battle and actions per turn
for every row of the level table. Minutes come from human playtests.

## 6 Campaign

Eleven battles, played in order:

| Part | Battles | Units a side | Target | Proposal |
|---|---|---|---|---|
| Tutorial: Hook's Farm | 1 | 4 | about 10 min | the basics of play and of the story; can be skipped |
| Act I | 3 | 4-5 | 10-15 min | one battle of each type, so all three are met early |
| Act II | 3 | 5 | 10-15 min | prisoners and gun capture start to matter |
| Act III | 3 | 5-6, one battle up to 8 | 10-15 min | harder bots, bigger Countries |
| Finale | 1 | 8-10 | 20-30 min | Fight to the Finish on the largest Country |

- **Level table.** Each battle is a row in the level table in data.js. A row
  holds the part, battle type, Country, each side's units, who moves first,
  the default set-up, the round limit, the draw line, the bot's style and
  the story knot before it. The eleven battles are mostly data, not code.
- **The tutorial.** It plays Wells's worked example, the Battle of Hook's
  Farm (chapter IV): a farm, a church, a cottage and a wood, scaled down to
  squads. Red splits its force across open ground, which makes it a natural
  first lesson. Its ink knots send nothing the game reads, so skipping the
  tutorial breaks nothing. Proposal: it also scores no campaign points, so
  playing it and skipping it leave the same campaign.
- **Carry-over: points only (decided).** Each battle starts with fresh
  armies. The running points total is the campaign score, and every battle
  is played whatever its result.
- **Countries.** They come from Wells's kit: board hills, twig woods, solid
  brick houses (nobody goes inside, by Wells's rule), walls, rocks, and chalk
  rivers with fords and bridges.
- **Layout rule.** Wells's layout advice becomes a level-design rule. A
  crowded Country makes the guns stop mattering. A wide open middle, or
  rivers with few crossings, makes for dull cannonades. When unsure, add
  cover.
- **Appendix (optional, later).** If the game goes well, the Appendix adds
  2-3 battles after the finale. They use more complex rules drawn from
  Wells's Kriegspiel appendix, such as:
  - faster moves on roads;
  - shells with a blast radius;
  - rivers that guns can't cross;
  - entrenchments;
  - cavalry charges scored by distance;
  - the force-buying muster screen.

  The Appendix has no story, or very little. The game and its story end at
  the finale, so the Appendix can be added later without touching either.
  Its rules are restated without the appendix's British Army framing
  (section 8).

## 7 Story (Knotwork)

- The story is ink knots between battles, written by the author in Inky.
  Game and story both end at the finale.
- Knotwork's contract is one knot, one outcome. From Act I to the finale,
  each outcome changes the next battle's row, for example a reinforcement,
  who moves first, or one feature of the Country. The design session lists
  the outcomes, and the author writes the knots to fit them.
- The tutorial's knots teach how the story works but send no outcome, as
  Amontillado's intro knot does. Knotcheck reports a WARN for such a knot.
  That is expected and breaks neither the story nor play.
- The three acts and the finale give the story its shape. The frame (whose
  story it is, who speaks) is the author's call.

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
and base marking, so the board reads without colour.

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
2. Cloud, Opus 5.5 high: the design session. Settle section 10, and write
   the tables (arms, Countries, the eleven battles), the story contract and
   the targets for balance and battle length. Amontillado's story contract
   and knotcheck setup are the model; read its HANDOFF.txt from START HERE
   only.
3. Cloud, Opus 5.5 high: the runner-ready skeleton (PHASE blocks, data.js,
   self-test, spec, reference, stub commit) and HANDOFF.txt. The first
   target is the tutorial battle playing end to end; the other ten battles
   are then mostly table rows.
4. Runner on the laptop, no Claude session: the builder writes the PHASE
   blocks. A Sonnet 5.5 laptop session is used only to plan, approve and
   read reports.
5. Cloud, Opus 5.5 medium: the cloud check, then bot runs for balance and
   battle length, then a design freeze.
6. Author, by hand: the story in Inky. A cloud session may review it.
7. Author: playtests (including minutes per battle), the disclosure wording
   and the release.
8. Later, if it goes well: the Appendix, through the same chain.

## 10 Decisions and open questions

Decided by the author, 2026-10-20:

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

For the design session (the leans are Claude's):

1. **Unit size and splitting.** How many figures a unit holds, and whether
   units ever split: an escort for prisoners, crew for a gun, three figures
   for Blow at the Rear. Lean: fixed units, with only the automatic escort
   split off for prisoners.
2. **Gun crews.** A gun section with its own crew, or Wells's way (any four
   friendly figures nearby). Lean: its own crew, with figures in units next
   to it also counting toward the four.
3. **Board size and round limits** for each battle, tuned with bot runs to
   the targets in section 5.
4. **The campaign score at the end.** Whether it is a score only or shapes
   the ending. It touches the story, so it is the author's call.
