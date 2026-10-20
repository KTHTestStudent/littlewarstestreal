Local builder/fixer runs: follow LOCAL-SUBAGENTS.md.

# Little Wars (working title)

A grid-tactics campaign after H. G. Wells's Little Wars (1913), made as a
Knotwork example. The design is in GDD.md. The current state and next item
will be in HANDOFF.txt once a cloud session starts one.

## Git

Cloud sessions make working-claude from origin/working and push only there.
Laptop sessions work on a local throwaway branch made from working and never
push. Nobody pushes to main. Merges, pull requests, tags and branch deletions
are the author's.

## Who does what

- Kenton Howard (author): creative direction, the story and its ink (written
  in Inky), any names he chooses to write, the AI disclosure wording,
  playtesting and releases. Claude may review the ink (knotcheck, play runs)
  and point at problems; it never writes story prose or placeholder lines.
- Claude in the cloud (Opus 5.5): design, data tables, specs, the skeleton,
  the self-test, the reference branch, cloud checks and docs.
- The local builder and fixer: the code inside PHASE blocks, through the
  runner (LOCAL-SUBAGENTS.md).

## Build rules

- A browser game with no install: an HTML page, a data.js of tables and the
  compiled ink story, zipped for itch.io.
- Plain canvas, no Phaser.
- No image or audio files. Every visual is drawn by code.
- Each battle is a row in data.js's level table, so adding or changing a
  battle is a data change, not new code.
- The tutorial's ink knots send no outcome, like Amontillado's intro knot.
  Knotcheck's WARN for them is expected; don't "fix" it.
- Words and tunable numbers live in plain text tables in data.js that a
  person can hand-edit; code only reads them.
- All chance is seeded, and any battle replays from its seed. Bots can play
  either side. A command-line self-test prints a SELF-TEST line.
- Phase code sits between `// ==== PHASE N START ====` and
  `// ==== PHASE N END ====`, and its last line is `PHASE_OK[N] = true;`.
- The reference branch and Claude's answer code never reach the laptop's
  clone or a builder's prompt.
- Nothing from Garden Defense and none of the Louis cast: this game has its
  own toy soldiers.
- At the end of a session that committed code, run the project's disclosure
  check (once it has one).

## Content rules

Wells's book is a source for rules only. Don't paste its prose into the game
or the repository. GDD.md's "Look and content" section lists what is left
out and why. In short:

- Players are "players" or "you". No gendered address, no remarks about
  women or girls, no swaggering-general persona.
- No real nations, flags, wars, regiments or people; no colonial wars or
  empire; no "civilised" versus "barbaric" framing; no uniform tied to a
  real army (khaki, pith helmets and the like).
- Red and Blue are paint colours, not peoples. Both sides get the same
  units, the same kinds of names and the same treatment; neither is the
  villain.
- Toy-scale harm: pieces tip over and go back in the box; prisoners walk to
  the back line. No blood or gore words.
- A side is never shown by colour alone: each side also has its own hat
  shape and base marking.
- No Team Fortress 2 echoes: no "BLU" spelling, class archetypes, company
  names, logos or its art style.
