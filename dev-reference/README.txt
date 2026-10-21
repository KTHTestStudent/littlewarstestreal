============================================================================
 dev-reference/ - Claude's answer code for Little Wars's PHASE blocks, and
 the checks that need it. ONLY ON THE reference BRANCH.
 Never on the laptop's clone, never in a builder's or fixer's prompt
 (LOCAL-SUBAGENTS.md hard rule 4; CLAUDE.md). Only a cloud Claude session
 reads or updates this branch.
============================================================================

THE FILES
  game.html       the reference game: the skeleton exactly as committed for
                  the builder (working-claude's game.html at the stub
                  commit), with all 24 PHASE blocks (PHASE 2-25) written by
                  Claude Opus 5.5 from the same steps the spec gives the
                  builder (2026-10-20). Its self-test: SELF-TEST 42/42 PASS.
  blocks.py       reads and swaps PHASE blocks (the scripts below use it).
  phasebuilds.py  the phase builds: for N = 1..25, the stub game with PHASE
                  2..N taken from the reference; checks each build's
                  self-test line against the spec's EXPECTED line for N.
  plant.py        the planted bugs: 64 typical builder slips, one at a time
                  in the reference; the self-test must fail each one.
  compare.py      a builder's game.html, block by block, against the
                  reference (code only: comment lines, blank lines and
                  indentation left out).

HOW A CLOUD SESSION USES THEM (from the repository folder, on
working-claude or any branch with the game)
  git fetch origin reference:reference
  git worktree add ../lw-ref reference
  export NODE_PATH=/opt/npm-tools/node_modules
  python3 ../lw-ref/dev-reference/phasebuilds.py . [stub game.html]
      all 25 lines "OK" = the spec's EXPECTED lines still hold. On a branch
      where the builder has filled the blocks, give the stub commit's
      game.html as the second argument (git show <stub>:game.html > file).
  python3 ../lw-ref/dev-reference/plant.py .
      "64 of 64 caught" = every probe still catches its slips.
  python3 ../lw-ref/dev-reference/compare.py game.html
      after a local build: which blocks match the reference call for call.
  git worktree remove ../lw-ref        when done

WHEN THEY MUST BE RUN
  The skeleton changed (anything outside the PHASE blocks), a phase's steps
  changed, a probe changed, or a RULE edit in data.js changed the replay
  lines: update this game.html to match (the skeleton outside the blocks
  must stay byte for byte the stub game's), then all three checks; then
  update the spec's EXPECTED lines and LINE MAP if they moved.

KEEPING IT IN STEP
  A change to a phase's rules is: the spec's steps -> this game.html's
  block -> the probes -> phasebuilds.py and plant.py -> a stub commit on
  working-claude (that block back to its stub, so the builder's diff is
  the whole block) -> the runner on the laptop -> the cloud check.
============================================================================
