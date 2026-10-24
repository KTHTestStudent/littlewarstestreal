# Local builder and fixer as subagents (Claude Code on the laptop)

Start-up handoff for any Claude Code session that may hand work to the local
models. Read this, then the project's own CLAUDE.md / HANDOFF.txt.
(For people: README.md and FULL-GUIDE.md. This file is the reference for
Claude sessions.)
Drafted 2026-10-16. Status: test runs 1-4 done 2026-10-17 (see "Test
results"); run 4, a real phase rebuild on Amontillado, was reviewed by a
cloud Opus 5.5 session (extra effort) the same evening. The workflow is in
use for Amontillado.

## Setup in one paragraph
Windows 11 laptop, Ollama 0.40 (ROCm), DeepSeek Harness (dsh) 0.1.5-rc.2.
`builder` = Qwen3.6-35B-A3B (128K, about 25 tok/s in the harness, 3 to 7.2
minutes a phase). `fixer` = Qwen3.8-27B (64K, about 8 to 10 tok/s; capped at
30 minutes a run - see step 2). Only one model can be loaded at a time. Claude Code runs on the
laptop but the model is in the cloud, so it doesn't use local memory.

## Who does what
- **Builder:** spec'd phases (one phase per fresh session); local rebuilds of
  phase blocks Claude changed, when the human asks for them.
- **Fixer:** a phase whose CHECK or self-test failed. At most 2 fixer runs
  per phase, then stop and report to the human.
- **Claude (Opus):** systems design from the human's direction, specs,
  skeletons, self-tests, reference builds, verification, skeleton changes,
  writing prompts, reviewing every result - systems designer, programmer and
  automated QA.
- **Human:** creative director and lead designer (the concept, the design
  decisions and targets), approvals, human playtesting, all story prose.
  (The roles as the human worded them, 2026-10-18; Amontillado's CREDITS.txt
  has the same.)
- A project can split Claude's part between a cloud session and this laptop
  session; its CLAUDE.md says which does what. Amontillado: the laptop
  session does the local runs and what they need (a stub, the prompts, the
  commits); design, the spec and its CHECK walks, skeleton and data changes
  and the reference branch are cloud work. If the human asks for skeleton
  or data changes here anyway, the hand-off lists what a cloud session must
  recheck (on 2026-10-17 such changes left the spec's CHECK walks for
  phases 7-9 and several docs out of step; the cloud review fixed them).

## Skeletons: words and numbers in hand-edit tables (the human's rule, 2026-10-17)
Build every new project this way from the first skeleton, where possible,
so nothing needs a refactor later (Amontillado needed several - the card
words, the map odds, the data.js split - and its DATA-REVIEW.txt lists
what is still left). Checked against this workflow: builders read tables
well (run 4 rebuilt phase 8 from "read MAP_ROWS" first try) and write
table-runners well (Amontillado's doFx, a local first try); tables are
skeleton work, Claude's part, so they cost no local run.
1. data.js holds tables and their comments only - no functions, no state,
   no computed entries - and ends with DATA_OK. Code goes in game.html. A
   third file only if the prompts' R2 names it (builders read only the
   spec, game.html and data.js).
2. Every word the player sees and every number a designer might tune is in
   a table, and the code never repeats it: cards, enemies, items, the map's
   rows, story outcomes, endings, the run's basic numbers, log lines and
   screen words.
3. Tables the human's small autocomplete (Qwen 2.5 Coder 1.5B in Continue)
   edits safely: one record per line, the same keys in the same order on
   every line, named keys (except ["kind", n] effect steps), double quotes,
   short lines. Above each table: SAFE (words) or RULE (numbers) edit, the
   allowed values, how many letters fit.
4. A red-banner check for each table when the page opens.
5. The spec's steps name the table, say "do not hard-code these - read the
   table", and quote its current values, so the CHECK lines stay exact.
6. Probes read words from the tables, so a safe edit never fails one;
   numbers stay written out in the probes and the replay, so a rule edit
   fails them on purpose.
7. A hand-edits.txt from the first skeleton, one section per table.
8. Not everything: a rule whose shape differs per character stays a small
   skeleton function (only its numbers go in a table); layout, keys and
   test tools stay code.

## Hard rules
1. Every local run goes through `bash run-local.sh ...`, called directly or by
   `run-phases.js` (below). The human approves it: each run-local.sh call in
   Claude Code's permission prompt, or a whole run-phases.js batch - by
   starting it himself, or in the permission prompt when Claude Code starts
   it. Never add either to an allow-list. Never run dsh directly, never two
   runs at once.
2. Before a batch of runs, show a plan (phases, expected self-test line per
   phase, the fixer cap) and wait for an OK. With run-phases.js the plan file
   IS that plan; with run-local.sh alone, still ask for each run.
3. A run must stay inside the project folder: the prompt tells the model to
   edit only its phase file and run nothing (rules R1-R3). The prompt is the
   ONLY guard against shell commands: headless mode runs them without any
   approval (first test, run 3).
4. The local models never see Claude's reference code. Don't fetch or check
   out the `reference` branch in the laptop clone; keep dev-reference/ out of it.
5. Project rules apply: AI writes no story prose; no collaborator art or
   audio goes to any model (or into a prompt or a workspace a model reads);
   Git rules from the project's CLAUDE.md (Amontillado: a laptop session
   commits on a local throwaway branch made from `working` and never
   pushes; the human merges it into `working`).
6. If a run's output mentions `ROCm error` or `llama-server process has
   terminated`, the script exits 4. Stop all runs; the human restarts Windows.
7. Don't change Modelfiles, environment variables, the backend, dsh's version
   or `%USERPROFILE%\.dsh\settings.yaml` without a reason and a yes.
8. To point a project at this file, ADD one line at the top of its
   CLAUDE.md. Never replace or trim the project's own rules (2026-10-17: the
   first Amontillado laptop commit replaced its whole CLAUDE.md with the
   pointer; it had to be restored).

## Batch runs with run-phases.js (2026-10-18; early finish 2026-10-23)
The loop below, as a script: no Claude session is needed unless it stops.
`run-phases.js` sits next to run-local.sh (copy both from this repository;
a new project commits them, FULL-GUIDE.md step 3, while Amontillado keeps
them untracked).
1. Make the throwaway branch (Amontillado, a rebuild: from
   `origin/working-claude`, where the cloud session's stub commit is).
2. Write the plan: `prompts/plan.txt`, one line per phase - the phase number
   and the spec's expected self-test line (`phase-plan.example.txt` here) -
   plus, best, a `start` line: the stub commit's self-test line.
3. Check it, then run it, from Git Bash in the project folder:
   `node run-phases.js prompts/plan.txt --dry-run`, then without `--dry-run`.
For each phase it writes the prompt, calls run-local.sh (builder 10 minutes,
fixer 30, unless phase-runner.json says otherwise), checks what the loop
below checks (HEAD and branch unmoved, only the phase file changed and only
inside its block, no new files, no git flag), runs the self-test, and
commits with the subjects dev/disclosure.js reads plus `Local-Model:` (what
Ollama had loaded at the end of the run) and `Committed-By: run-phases.js`
trailers. A wrong self-test line: the builder's attempt is committed as it
is and the fixer gets up to 2 tries, each committed. It stops at anything
that needs a person, leaves the tree as the run left it, prints a report
(also saved in `.local-runs/`), and runs the project's disclosure check
(with its exit code). It never pushes or merges and refuses the shared
branches. Settings: `phase-runner.json` (the defaults fit Amontillado).
Since 2026-10-23 (the stops of Little Wars' and Amontillado's batches):
- **The previous phase's line first.** Before each phase the tree must give
  the previous phase's plan line (the first phase: the plan's `start` line,
  or with `--from N` the plan's line for the phase before N). If not, the
  batch stops before any model runs: the fault is in an earlier block or a
  commit's line. A commit whose subject names a SELF-TEST line must also be
  the tree that prints it, so a hand commit with a typed line (Little Wars
  18-20, 2026-10-21) stops the next batch at once. The dry run checks this
  too.
- **`--from N`** goes on after a stop with the whole plan; no trimmed copy.
- **Early finish.** While a builder or fixer runs, every `checkSeconds` (15):
  once the phase file has changed and then stayed the same for
  `quietSeconds` (120), with only its PHASE N block changed and no other or
  new file, the self-test runs; if it already gives the plan's line (no red
  banner, no page errors), the runner ends the model's run and commits it
  as a normal success, its body saying so. Each state of the file is tested
  once. The quiet time guards against a block caught between two edits that
  happens to give the line; the cloud check still reads every block. Off for
  a batch with `--no-early-finish`, or `"earlyFinish": false`.
- **At the time limit**, the self-test still runs: when only the block
  changed and the line is the plan's, it is committed (the body says it
  stopped at the limit with its edit whole). Otherwise it stops as before,
  naming the line it got.
- **No DONE PHASE N line**: the self-test still runs; the plan's line
  commits it (the body says so), any other line stops the batch.
- For a run the runner ended, it also does run-local.sh's after-run checks
  itself (git command text, driver-crash text in the run's files) and writes
  its runs.csv row (exit `early` or `limit`).
- **Settings changed during a run** are said plainly: a change git sees
  (phase-runner.json, a tracked plan, the runner files) stops the batch with
  the steps to go on; one it doesn't (a plan in prompts/, dsh's
  settings.yaml) is a note, and the batch keeps what it read at the start.
- The report counts fixer runs, including ones that didn't fix ("no fixer
  calls" only when there were none).
- Started by the human: nothing more to do; the commits carry no Claude line.
- Started by a Claude Code session: add `--co-author "<its model>"`, and run
  it in the background (a batch outlasts Claude Code's 10-minute limit for
  one command). Its job is then the plan, the approval and reading the
  report - judgment-light, so Sonnet 5.5 is enough there (the human's call);
  stubs, specs and skeleton edits stay cloud work, so that model writes no
  game code.
- Tested 2026-10-18 on a copy of Amontillado with stand-in dsh and ollama
  commands: a good run, a fixer that fixes, two failed fixer tries, NOT A
  BUG, edits outside the block, a new file, git text, a missing DONE line,
  the time limit, and a replay of NEXT 4c's three-phase rebuild (the same
  commits and game.html as the real one). Then on the laptop, 2026-10-18
  (RUNNER-TEST.md; summary in RESULTS.md): PHASE 7 rebuilt from 7303dcd
  in 7.1 minutes, and PHASE 7, 8 and 9 from 7f44f1e in one batch in 10.2,
  all first try, no fixer, replay lines the same as the real rebuilds. In
  real use since: Amontillado PHASE 2-6, Auto-Disclosure-Tool PHASE 21-22
  (the fixer's first real run) and Little Wars PHASE 2-25, where the time
  limit's `taskkill /T` fired on Windows (HANDOFF.txt).
- The 2026-10-23 changes, tested in the cloud with stand-in dsh and ollama
  (RUNNER-TEST.md, test 3): on Auto-Disclosure-Tool's real stub commit
  (3c42796) and on Little Wars' NEXT 4b stub (PHASE 18, with its browser
  self-test). Windows re-test: RUNNER-TEST.md, test 3.
- Needs Playwright where the self-test finds it: on the laptop it is
  installed once in C:\Git (`npm install playwright`, then `npx playwright
  install chromium`), so every project folder under it has it.
- Never merge a test branch made from an old commit; the runner says so.

## Before the first run of a session (ask the human)
- Claude Code runs the model the human means (`/model` or `/status`; Opus
  5.5 for cloud-style work, Sonnet 5.5 is enough for a batch of local runs).
  Every commit names the running model and the project's AI disclosure
  follows the commits (2026-10-17: the Amontillado laptop session ran
  Sonnet 5.5 by mistake, so Sonnet joined its disclosure).
- Ollama is running from the tray; Continue's autocomplete is OFF in VS Code
  (one loaded model allowed, so a suggestion would unload builder/fixer).
- The session works on a throwaway branch made from the project's working
  branch (Amontillado: `working`), never pushed.
- The tree is committed (run-local.sh refuses a dirty tree).

## The loop, per phase
(run-phases.js does steps 1-7 for a whole batch; this is the same loop by
hand, for a single run or when the script stopped.)
1. Claude writes the prompt file, e.g. `prompts/phase5.txt`:
   `Read <SPEC> and <phase file>, and do PHASE 5. Then stop.`
   For a rebuild of an existing block, first commit the block stubbed (as
   the original skeleton had it) as Claude's own commit, so the builder's
   diff is the block. The old block is then one commit back in history;
   R3 forbids commands and the script flags git commands (step 3). A NEW
   feature is the cleaner test of the builder.
2. Claude asks to run `bash run-local.sh builder phase5 prompts/phase5.txt`
   (Bash tool timeout: 600000 - 10 minutes - for builder, 1800000 - 30
   minutes - for fixer; the human's limits, 2026-10-18). Claude Code lets
   the model set at most 10 minutes for one Bash command unless
   `BASH_MAX_TIMEOUT_MS` raises it, so the fixer's 30 minutes need
   `"env": { "BASH_MAX_TIMEOUT_MS": "1800000" }` in `~/.claude/settings.json`
   on the laptop (ask the human before relying on it). A run cut off at its
   timeout counts as a failed run: restore the file before the next one
   (run-phases.js instead runs the self-test and keeps a whole edit with the
   plan's line).
3. Read the script's short summary only: exit code, minutes, files changed,
   last line. Open the `.answer.txt` only if needed; the `.reasoning.txt`
   only to diagnose a failure (it can be large) or when the summary says
   `!! git command text`: then look there. If the model read history or
   another branch, the run doesn't count - restore the file, note it in the
   results and tell the human.
4. Check: only the allowed file changed (`git diff --stat`), the last line is
   `DONE PHASE N` (or the fixer's `NOT A BUG` / `SPEC MISMATCH`), then the
   self-test (e.g. `node dev/selftest.js`) gives the spec's EXPECTED line.
5. Commit: `phase N: builder, first try, <self-test line>` or
   `phase N: fixer try N, <self-test line>`, so the history shows who wrote
   what. Keep that start exactly: the project's disclosure check
   (Amontillado: `dev/disclosure.js`) credits the local model from it.
   Every commit, Claude's own too (a stub, a prompt), also carries the
   running Claude model's `Co-Authored-By:` line (run 4's stub had none, so
   the check listed it as a hand edit).
6. Fail: write the fixer prompt from the spec's FIXER PROMPT (the failing
   probes, the banner text), ask to run `run-local.sh fixer ...`. After 2
   failed fixer runs, stop and report.
7. Add the run to the results log (below) with the self-test line, outcome
   and a short cause for any failure.
8. Report to the human in a few lines: phases done, self-test lines, fixer
   calls, anything odd, and what a cloud session still has to check (the
   self-test is the only gate here; Amontillado: that phase's CHECK walk,
   the reference-branch phase builds and planted bugs). At the end of a
   session that committed code, run the project's disclosure check
   (Amontillado: `node dev/disclosure.js`); if a fixer call was needed, ask
   the human whether the fixer joins the AI disclosure (Amontillado's
   CLAUDE.md).

## Memory (added 2026-10-17)
Builder (~20 GB) and fixer spill past the 16 GB VRAM into the 16 GB system
side, so Task Manager's "Available" can drop very low during a run. That is
expected and not a reason to retune while runs stay fast and stable.
- run-local.sh unloads the other model before each run (no swap overlap) and
  logs free RAM before/after (free_mb_start / free_mb_end in runs.csv).
- During runs keep other apps light; close the claude.ai tab if not needed.
- Act only on real signals: a phase much slower than its baseline (builder
  about 25 tok/s, 3-7.2 min a phase), a crash, Windows stuttering, or the
  disk busy with paging. Then first try with nothing else open.
- After a session: `ollama stop builder` / `ollama stop fixer` frees the
  memory at once instead of after 5 idle minutes.

## Results log
`.local-runs/runs.csv` (written by the script, kept out of Git with
`.git/info/exclude`): run id, role, label, exit, minutes, files changed,
diffstat, last line. Claude adds the self-test line and outcome to the commit
message; the human can copy the CSV into RESULTS-LOG.xlsx when wanted.

## Commands (Git Bash in Claude Code)
- `ollama ps` - what's loaded (CONTEXT 131072 builder / 65536 fixer, 100% GPU)
- `ollama stop builder` - unload before a fixer run if you want a clean start
- The builder uses `%USERPROFILE%\.dsh` (the normal settings); the fixer uses
  `%USERPROFILE%\.dsh-fixer` (same providers, default model `fixer:latest`).

## Test results (2026-10-17)
Runs 1-3 in a scratch repo (C:\Git\claudeScratch), run 4 on Amontillado.
Runs 1-3's prompts and the files they made are kept in archive/first-tests/
(test1.txt - test3.txt, hello.txt, hello2.txt). All passed. Findings:
- Run 1 (builder, create hello.txt): exit 0, 3.3 min, last line `DONE`. The
  script, the `dsh` shim, headless mode and a file edit inside the folder all
  work with no approval prompt.
- Run 2 (fixer, create hello2.txt): exit 0, 1.8 min, last line `DONE`.
  `ollama ps` afterwards shows `fixer:latest`, CONTEXT 65536, 100% GPU, so
  DSH_HOME switches the model. Ollama unloaded the builder by itself.
- Run 3 (builder, "run `echo hi`"): exit 0, 1.2 min. The command RAN with no
  approval and the model replied `hi`. `DSH_PERMISSION_MODE=workspace-write`
  does not block shell commands, so rule R3 in the prompt is the only guard
  (hard rule 3). Nothing hung. Note: workspace-write is MEANT to allow
  commands and only limit where they write; `echo hi` writes nothing, so
  whether writes outside the folder are blocked is untested. Either way a
  command inside the folder (e.g. `git checkout reference`) is allowed, which
  is why hard rule 4 keeps the reference branch out of the laptop clone.
- Run 4 (builder, Amontillado phase 8 rebuild, on the laptop's throwaway
  branch): phase 8 stubbed (cfab865) and rebuilt from the updated spec
  (e25477b): first try, SELF-TEST 26/26, only the PHASE 8 block changed. Its
  code is the same as the hand-written block it replaced (3d8fa4b); only
  comments differ, and it kept the RETURNS comments. Tag
  `local-llm-subagent-good` (98d2918). The cloud review found no problem in
  the rebuilt block. Its notes for this workflow: the replaced block was
  one commit back in history and only the run's `.reasoning.txt` shows
  whether the builder looked (now flagged by the script, step 3; a new
  feature is the cleaner test); the session ran Sonnet 5.5, not Opus 5.5
  (now checked before the first run); the session's skeleton and data
  changes, not the run, left CHECK walks and docs out of step ("Who does
  what"); the stub commit had no Co-Authored-By (step 5). Also from the
  history: the CLAUDE.md overwrite (hard rule 8).
- Script quirk (FIXED 2026-10-17): "changed:" now also lists files the run
  created, marked "(new)" (files untracked before the run are ignored).
- Script quirk (FIXED 2026-10-17): "last line" now skips code-fence lines.
  Still tell the prompt to end with the marker line (`DONE PHASE N`).
- Script (ADDED 2026-10-17, after the run 4 review): prints
  `!! git command text ...` when the answer or reasoning holds a git command
  that could read history or another branch (log, show, diff, checkout ...).
  Only a flag: a hit can be the model thinking about git. runs.csv is
  unchanged.
- The tree check ignores untracked files, so an untracked `.claude/` does not
  block a run, but commit each run's results before the next run.
- Git warns about LF to CRLF on prompt files. Harmless.

### Original first-test plan (for reference)
1. A trivial builder run in a scratch Git folder: prompt "Create hello.txt
   containing hi. Then reply DONE." Expect: exit 0, hello.txt in the diff,
   `DONE` as the last line. This checks the script, Git Bash's `dsh` shim,
   headless mode and that a file edit inside the folder needs no approval.
2. The same with `fixer`: confirms DSH_HOME switches the model (`ollama ps`
   shows fixer afterwards).
3. Something that needs approval in headless mode (prompt: "Run the command
   `echo hi` and reply with its output") - note what happens (refused,
   hangs, or runs). If it hangs, the timeout and R3 must cover it.
4. One real phase on a throwaway branch of a finished game, compared with
   its saved local-build result. (Done as run 4; compared with the
   hand-written block it replaced, since the saved local-build phase 8 is
   from before the map redesign.)
