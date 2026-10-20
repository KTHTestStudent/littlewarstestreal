Local builder/fixer runs: follow LOCAL-SUBAGENTS.md.

# Little Wars (working title)

A grid-tactics campaign after H. G. Wells's Little Wars (1913), made as a
Knotwork example. The design is in GDD.md. **Start with HANDOFF.txt** (START
HERE down to the HISTORY line): where things stand, what to read, and what's
next.

## Git

Cloud sessions make working-claude from origin/working and push only there.
Laptop sessions work on a local throwaway branch made from working and never
push. Nobody pushes to main. Merges, pull requests, tags and branch deletions
are the author's.

## AI disclosure

- The line, in the author's words (2026-10-20), on one line in README.md and
  here:
  AI Disclosure: code by Claude Opus 5.5. Design and decisions by Kenton Howard.
- `node dev/disclosure.js` checks it against the stamps in the commits
  (exit 0 = OK). Run it at the end of every session that commits code. If it
  names a missing Claude model, run it with `--apply`. A local model's name
  (Qwen 3.6, Qwen 3.8) goes in only on the author's word. Change no other
  words unless he asks.
- Every commit ends with a `Co-Authored-By:` line naming the model that is
  actually running. run-phases.js stamps local-model commits itself
  (`Local-Model:`).
- dev/disclosure.js is an unedited copy of KTHTestStudent/Auto-Disclosure-Tool's
  disclosure.js: change the code there, then copy it here. This project's
  facts are in disclosure.jsonc.

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
- At the end of a session that committed code: `node dev/disclosure.js`
  (AI disclosure, above).

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
