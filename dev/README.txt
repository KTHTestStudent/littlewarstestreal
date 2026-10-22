============================================================================
 dev/ - headless checks (written by Claude for its sessions; anyone with
 Node can run them). Not part of the game: game.html never loads these and
 tools/pack.html never packs them.
============================================================================

SETUP
  Node 18+, Python 3, and Playwright with Chromium.
  Claude's cloud workspace: Playwright is already installed - run node
    with NODE_PATH=/opt/npm-tools/node_modules (no "playwright install").
  The laptop: Playwright is installed once in C:\Git (npm install
    playwright, then npx playwright install chromium), so every project
    folder under it finds it (LOCAL-SUBAGENTS.md).
  Run from the repository folder. inkc.sh needs a POSIX shell (Git Bash on
  Windows).

THE TOOLS
  selftest.js [folder]
      The self-test (game.html#test) in headless Chromium. Prints the
      SELF-TEST line, the failing probes, the five replay lines (whole
      battles played by bots on both sides) and anything on the red banner
      or the console. Exit code 0 only for SELF-TEST n/n PASS with no
      errors. run-phases.js reads this output (the SELF-TEST line,
      "failing probes:", "replay:", "RED BANNER:", "page error:" and
      "console:" lines).
      With the skeleton's stubs (the stub commit): SELF-TEST 1/42 FAIL:
      army extra armed. Each phase's line is in the spec. The finished
      game: SELF-TEST 42/42 PASS.
  bots.js [folder] [runs per battle] [battles]
      Bot runs (GDD 5.3): every battle played by bots on both sides (the
      newcomer for you, the row's style for them), with each knot's
      default outcome, over many seeds. Per battle: your win / draw / loss
      rates, the score counting a draw as half against the GDD 5.2
      target, the median rounds against the limit, the share that reached
      the limit, your actions a turn (a stand-in for clicks), their bot's
      turn at normal playback, and how battles ended. Needs every PHASE
      block built. node dev/bots.js . 200
  outcomes.js [folder] [runs per outcome] [battles]
      The outcome measure (GDD 5.2, 5.3): each scene_ knot's outcomes
      played in the battle after it, on the same seeds, with each
      battle's gap between its outcomes - "ok" within 5 points (a
      sidegrade), "WIDE" when not; then each foe_ knot's four bot styles
      and their spread, shown but not judged (a choice of how hard).
      Exit code 0 when every scene_ gap is ok. The bots set up from
      ARMIES, so "scout" and "forward" (setupRows) change nothing in bot
      runs: only a player sees or uses them.
      node dev/outcomes.js . 1000 (about 6 minutes)
  tryout.js <changes.js | -> [runs] [battles] [all]
      Bot runs with data.js's tables changed for the run only (a file of
      plain JavaScript table edits, such as RULES.withdraw = 4), to try
      a lever before editing data.js. Writes nothing. Table edits only: a
      changed game function is a rule change for the spec.
  linemap.py [spec]
      Writes the LINE MAP at the top of specs/LITTLEWARS-SPEC.txt. Run it
      after every edit of the spec.
  inkc.sh <story.ink> <out story.js>
      Compiles ink as Inky's "Export story.js only..." does (inkjs 2.4.0's
      compiler). The author exports from Inky; this is for Claude sessions
      (the skeleton's empty story was compiled with it). Set INKJS_CLI to
      the compiler (the top of the file says where to get one).
  disclosure.js [--apply [--with-fixer]]
      An unedited copy of disclosure.js from KTHTestStudent/Auto-
      Disclosure-Tool (change it there, then copy it here; no Playwright).
      Checks the AI disclosure line in README.md, CLAUDE.md, CREDITS.txt
      and game.html against the models named in the commits (settings:
      disclosure.jsonc). Run it at the end of every session that commits
      code; exit 0 = OK.
  Knotwork's own knotcheck checks the story: double-click
  tools/knotcheck.html, or node tools/knotcheck.js . (no Playwright). With
  the skeleton's empty story it FAILs each scene_ knot (the list of knots
  still to write) and WARNs that intro, tutorial and ending send no
  outcome - both expected.

WHICH CHECK WHEN
  Any change                  selftest.js (42/42 PASS)
  The spec edited             linemap.py
  A rule, map, army or bot    selftest.js (probes and replay lines change on
  change in data.js           purpose: bring them in step), bots.js,
                              outcomes.js (tryout.js first, to try it)
  A story export (story.js)   node tools/knotcheck.js .
  A session that committed    disclosure.js
  code

THE SELF-TEST'S TEST STORY
  The "talk" probe plays a tiny story of its own, not the author's (the
  TEST_STORY constant in game.html, compiled with inkc.sh). Its ink:
    VAR player_side = "red"
    VAR battles_done = 0
    VAR scene_1_outcome = "scout"
    EXTERNAL sceneDone(name, outcome)
    -> DONE
    === scene_1 ===
    {player_side} {battles_done}.
    + [Wait] Waited. -> finish
    + [Go]
      ~ scene_1_outcome = "move_first"
      Went. -> finish
    = finish
    ~ sceneDone("scene_1", scene_1_outcome)
    -> DONE

THE REFERENCE-ONLY CHECKS (the phase builds, the planted bugs, Claude's
reference game) contain Claude's answer code, so they live on the
reference branch, away from local builders and the laptop's clone:
  git fetch origin reference:reference      (a cloud session only)
  git worktree add ../lw-ref reference
  then ../lw-ref/dev-reference/README.txt
============================================================================
