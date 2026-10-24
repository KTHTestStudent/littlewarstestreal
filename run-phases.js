#!/usr/bin/env node
// run-phases.js - runs a batch of local builder / fixer phases with no Claude
// session needed: for each phase in a plan file it writes the prompt, calls
// run-local.sh, checks the result, runs the self-test, and commits with the
// subject dev/disclosure.js reads ("phase N: builder, first try, ..." /
// "phase N: fixer try K, ..."). It stops at the first thing that needs a
// person, leaves the tree as the run left it, and says what to look at.
//
//   node run-phases.js plan.txt                 run the plan
//   node run-phases.js plan.txt --dry-run       check everything, run no model
//   node run-phases.js plan.txt --from 19       start at phase 19 of the plan
//        (after a stop: the tree must first give phase 18's line - no need
//        to trim the plan)
//   node run-phases.js plan.txt --co-author "Claude Sonnet 5.5"
//        (only when a Claude Code session starts it: adds that model's
//        Co-Authored-By line to each commit; builder / fixer commits still
//        credit the local model - their subject says so)
//   node run-phases.js plan.txt --no-fixer      stop at the first mismatch
//   node run-phases.js plan.txt --no-early-finish   let every run end itself
//
// Run it from Git Bash in the project folder, next to run-local.sh (the same
// folder LOCAL-SUBAGENTS.md lives in). It never pushes, never merges, and
// refuses to run on the project's shared branches.
//
// THE PLAN FILE - one line per phase, in order; # starts a comment:
//   start  SELF-TEST 11/26 FAIL: map path ask
//   7   SELF-TEST 14/26 FAIL: map map2 path
//   8   SELF-TEST 18/26 FAIL: ask nerve cards
//   9   SELF-TEST 26/26 PASS
//   replay-same-as  origin/working
// Each phase line: the phase number, then the self-test line the spec expects
// after that phase (exactly as the self-test prints it). The optional start
// line: the self-test line of the tree before the first phase (the stub
// commit's). The optional replay-same-as line: at the end, the self-test's
// replay lines must be the same as they are on that branch or commit.
//
// THE PROJECT (phase-runner.json next to this file, optional - these are the
// defaults, which fit Amontillado):
//   { "spec": "specs/AMONTILLADO-SPEC.txt", "phaseFile": "game.html",
//     "selftest": "node dev/selftest.js", "disclosure": "node dev/disclosure.js",
//     "protectedBranches": ["working", "main", "working-claude", "reference"],
//     "builderMinutes": 10, "fixerMinutes": 30, "fixerTries": 2,
//     "earlyFinish": true, "quietSeconds": 120, "checkSeconds": 15 }
//
// BEFORE EACH PHASE the self-test must give the previous phase's plan line
// (for the first phase: the plan's start line, or with --from N the plan's
// line for the phase before N). If it doesn't, the fault is in an earlier
// block or a hand commit's line, so the batch stops before any model runs.
// Also, a commit whose subject names a SELF-TEST line ("phase N: ...,
// SELF-TEST ...") must be the tree that prints it.
//
// EARLY FINISH (while a builder or fixer runs, every checkSeconds): when the
// phase file has changed and then stayed the same for quietSeconds, only its
// PHASE N block changed (no other file, no new file), and the self-test
// already prints the plan's line with no red banner or page errors, the
// runner ends the model's run and commits it as a normal success. Its commit
// body says so. Each state of the file is tested once.
//
// WHAT COUNTS AS A GOOD RUN (all of these, or the batch stops):
//   run-local.sh exits 0 (exit 4 = driver crash: restart Windows), or the
//     runner ended it (early finish or the time limit, below)
//   HEAD and the branch are where they were (the model made no commit or checkout)
//   no settings file (phase-runner.json, the plan, run-phases.js,
//     run-local.sh) changed that git sees
//   only the phase file changed, no new files, and only inside its PHASE N
//     block - the START / END lines and the block's last line,
//     PHASE_OK[N] = true;, untouched
//   no git command text in the answer or reasoning (run-local.sh's
//     "!! git command text" flag; for a run the runner ended, the same
//     search on the files it left)
// Then the self-test decides: its line must be the plan's expected line, with
// no red banner and no page errors. The answer's last line should be DONE
// PHASE N; without it, or when the run reached its time limit, the work is
// committed only if the self-test already gives the plan's line (the body
// says which), and otherwise the batch stops. With DONE PHASE N and another
// line, the builder's attempt is committed as it is (its subject says what
// it got) and the fixer gets up to fixerTries tries, each committed. A fixer
// that answers NOT A BUG or SPEC MISMATCH stops the batch.
//
// Every commit carries Local-Model: (what Ollama had loaded at the end of
// the run) and Committed-By: run-phases.js, and --co-author's line if given.
//
// Exit codes: 0 every phase committed with its expected line (and the replay
// lines the same, if asked); 1 stopped - read the report; 2 setup problem;
// 4 driver crash (restart Windows before any further run).

"use strict";
const { spawn, spawnSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

// ---- settings ---------------------------------------------------------------
const DEFAULTS = {
  spec: "specs/AMONTILLADO-SPEC.txt",
  phaseFile: "game.html",
  selftest: "node dev/selftest.js",
  disclosure: "node dev/disclosure.js",
  protectedBranches: ["working", "main", "working-claude", "reference"],
  builderMinutes: 10,
  fixerMinutes: 30,
  fixerTries: 2,
  earlyFinish: true,
  quietSeconds: 120,
  checkSeconds: 15
};

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
function opt(n) { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; }
const TAKES_VALUE = ["--co-author", "--from"];
const planPath = argv.find((a, i) => !a.startsWith("--") && !TAKES_VALUE.includes(argv[i - 1]));
const dryRun = flag("--dry-run");
const noFixer = flag("--no-fixer");
const coAuthor = opt("--co-author");
const fromPhase = opt("--from");

function die(msg, code) { console.error("run-phases: " + msg); process.exit(code || 2); }
function say(msg) { console.log(msg); }

if (!planPath) die("usage: node run-phases.js <plan file> [--dry-run] [--from N] [--no-fixer] [--no-early-finish] [--co-author \"Claude Sonnet 5.5\"]");
if (coAuthor && !/^Claude [A-Za-z]+ \d+(\.\d+)?$/.test(coAuthor)) die("--co-author takes a Claude model name, e.g. \"Claude Sonnet 5.5\"");
if (flag("--from") && !/^\d+$/.test(fromPhase || "")) die("--from takes a phase number from the plan, e.g. --from 19");

let cfg = Object.assign({}, DEFAULTS);
if (fs.existsSync("phase-runner.json")) {
  try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync("phase-runner.json", "utf8"))); }
  catch (e) { die("phase-runner.json: " + e.message); }
}
if (noFixer) cfg.fixerTries = 0;
if (flag("--no-early-finish")) cfg.earlyFinish = false;

// ---- small helpers ----------------------------------------------------------
function git(args, opts) {
  return execFileSync("git", args, Object.assign({ encoding: "utf8", maxBuffer: 1 << 26 }, opts || {})).replace(/\s+$/, "");
}
// The same while a model runs: no optional index lock, so the runner never
// holds .git/index.lock while the model works in the tree.
function gitQuiet(args) { return git(["--no-optional-locks"].concat(args)); }
// The stored text of a file at a commit, untrimmed (git() trims the end).
function gitShow(spec) { return execFileSync("git", ["show", spec], { encoding: "utf8", maxBuffer: 1 << 26 }); }
function gitOk(args) { return spawnSync("git", args, { encoding: "utf8" }).status === 0; }
function untracked() { return gitQuiet(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean).sort(); }
function stamp() { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }
function lastLine(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !/^\s*```/.test(l));
  return (lines[lines.length - 1] || "").trim();
}
function readOr(file, dflt) { try { return fs.readFileSync(file, "utf8"); } catch (e) { return dflt; } }
// A file's content hash, or "" when it doesn't exist.
function hashOf(file) { try { return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex"); } catch (e) { return ""; } }
// The command line the project gives as a string ("node dev/selftest.js"),
// split on spaces - keep project commands free of quoted arguments.
function cmdParts(s, extra) { const p = s.trim().split(/\s+/); return { cmd: p[0], args: p.slice(1).concat(extra || []) }; }

// ---- the phase blocks --------------------------------------------------------
const START = n => "// ==== PHASE " + n + " START ====";
const END = n => "// ==== PHASE " + n + " END ====";
const OKLINE = n => "PHASE_OK[" + n + "] = true;";
// The file with the PHASE n block's inside taken out, or an error string.
// Line endings are made LF first: a Windows checkout has CRLF on disk while
// git show gives the stored LF text.
function outsideBlock(text, n) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const s = lines.findIndex(l => l.trim() === START(n));
  const e = lines.findIndex(l => l.trim() === END(n));
  if (s < 0 || e < 0 || e < s) return { error: "the PHASE " + n + " START / END lines are missing or out of order" };
  if (lines.filter(l => l.trim() === START(n)).length > 1 || lines.filter(l => l.trim() === END(n)).length > 1) return { error: "the PHASE " + n + " START or END line appears twice" };
  if ((lines[e - 1] || "").trim() !== OKLINE(n)) return { error: "the block's last line is no longer " + OKLINE(n) };
  return { outside: lines.slice(0, s + 1).concat(lines.slice(e)).join("\n") };
}

// ---- settings files: a change during a run is said plainly ---------------------
// The files whose change mid-batch the runner can't take in: it read them at
// the start. Git-visible changes stop the batch (the next run-local.sh would
// refuse the dirty tree anyway); others (an untracked plan in prompts/, the
// untracked runner copies in Amontillado, dsh's settings) are a note.
let settingsFiles = [];
function snapshotSettings() {
  const own = path.relative(process.cwd(), __filename) || __filename;
  const files = ["phase-runner.json", planPath, own, "run-local.sh"];
  const home = process.env.USERPROFILE || "";
  const dsh = [
    [process.env.DSH_BUILDER_HOME || (home && path.join(home, ".dsh")), "dsh's builder settings"],
    [process.env.DSH_FIXER_HOME || (home && path.join(home, ".dsh-fixer")), "dsh's fixer settings"]
  ];
  const rel = f => path.relative(process.cwd(), path.resolve(f)).split(path.sep).join("/");
  settingsFiles = files.map(rel).filter((f, i, a) => a.indexOf(f) === i).map(f => ({ file: f, name: f, hash: hashOf(f), local: true }));
  dsh.forEach(([dir, name]) => { if (dir) { const f = path.join(dir, "settings.yaml"); settingsFiles.push({ file: f, name: name + " (" + f + ")", hash: hashOf(f), local: false }); } });
}
// The settings files changed since the snapshot: [{name, seenByGit}]; takes
// the new state as the snapshot, so each change is reported once.
function settingsChanged() {
  const out = [];
  let dirty = [];
  try { dirty = gitQuiet(["status", "--porcelain", "--untracked-files=all"]).split("\n").map(l => l.slice(3).trim()); } catch (e) { /* not fatal */ }
  for (const s of settingsFiles) {
    const h = hashOf(s.file);
    if (h === s.hash) continue;
    out.push({ name: s.name, seenByGit: s.local && dirty.includes(s.file) });
    s.hash = h;
  }
  return out;
}

// ---- running things -----------------------------------------------------------
function killTree(child) {
  if (process.platform !== "win32") { try { process.kill(-child.pid, "SIGTERM"); } catch (e) { /* gone */ } }
  else spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
}
// Runs a command with a time limit, echoing its output. watch(), if given,
// is called every cfg.checkSeconds while it runs; when it resolves true the
// run is ended early. Returns {code, out, timedOut, early}.
function run(cmd, args, minutes, watch) {
  return new Promise(function (resolve) {
    const posix = process.platform !== "win32";
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], detached: posix });
    let out = "", timedOut = false, early = false, done = false, busy = false;
    child.stdout.on("data", d => { out += d; process.stdout.write(d); });
    child.stderr.on("data", d => { out += d; process.stderr.write(d); });
    const timer = minutes ? setTimeout(function () {
      if (done || early) return;
      timedOut = true;
      say("\n!! TIME LIMIT (" + minutes + " min) - stopping the run");
      killTree(child);
    }, minutes * 60000) : null;
    const ticker = watch ? setInterval(async function () {
      if (done || busy || timedOut || early) return;
      busy = true;
      let stop = false;
      try { stop = await watch(); } catch (e) { say("  (early-finish check failed: " + (e.message || e) + ")"); }
      busy = false;
      if (stop && !done && !timedOut && !early) { early = true; killTree(child); }
    }, cfg.checkSeconds * 1000) : null;
    function finish(r) { if (done) return; done = true; if (timer) clearTimeout(timer); if (ticker) clearInterval(ticker); resolve(Object.assign(r, { timedOut, early })); }
    child.on("close", function (code) { finish({ code: code === null ? -1 : code, out }); });
    child.on("error", function (e) { finish({ code: -1, out: out + String(e) }); });
  });
}

// The self-test: {line, failing, replay, banner, errors, raw}.
// A first run on a cold machine (a browser starting, files just checked out)
// can miss the line, so a run with no SELF-TEST line is tried once more.
async function selftest(folder) {
  let st = await selftestOnce(folder);
  if (!st.line) { say("  (the self-test printed no SELF-TEST line - trying once more)"); st = await selftestOnce(folder); }
  return st;
}
// The self-test's own output, for a person to read when it gives no line.
function rawLines(st) { return "    " + (st.raw.trim().split(/\r?\n/).slice(0, 25).join("\n    ") || "(no output at all)"); }
// Runs without blocking, so a model run's output keeps flowing meanwhile.
function selftestOnce(folder) {
  const c = cmdParts(cfg.selftest, folder ? [folder] : []);
  const cmd = c.cmd === "node" ? process.execPath : c.cmd;
  return new Promise(function (resolve) {
    let raw = "";
    let child;
    try { child = spawn(cmd, c.args, { stdio: ["ignore", "pipe", "pipe"] }); }
    catch (e) { resolve(parseSelftest(String(e.message || e))); return; }
    child.stdout.on("data", d => { raw += d; });
    child.stderr.on("data", d => { raw += d; });
    child.on("error", e => { raw += "\n" + e.message; });
    child.on("close", () => resolve(parseSelftest(raw)));
  });
}
function parseSelftest(raw) {
  const lines = raw.split(/\r?\n/);
  const line = (lines.find(l => /^SELF-TEST /.test(l)) || "").trim();
  const fp = lines.find(l => /^failing probes: /.test(l));
  const failing = fp ? fp.replace(/^failing probes: /, "").trim() : "";
  const replay = [];
  const ri = lines.findIndex(l => l.trim() === "replay:");
  if (ri >= 0) for (let i = ri + 1; i < lines.length && /^\s{2}\S/.test(lines[i]); i++) replay.push(lines[i].trim());
  const bi = lines.findIndex(l => l.trim() === "RED BANNER:");
  const banner = [];
  if (bi >= 0) for (let i = bi + 1; i < lines.length && /^\s{2}\S/.test(lines[i]); i++) banner.push(lines[i].trim());
  const errors = lines.filter(l => /^(page error|console): /.test(l)).map(l => l.trim());
  return { line, failing, replay, banner, errors, raw };
}
// The plan's line, with no red banner and no page errors.
const isPlanLine = (st, expected) => st.line === expected && !st.banner.length && !st.errors.length;
const extras = st => (st.banner.length ? "  + RED BANNER" : "") + (st.errors.length ? "  + page errors" : "");
// The same inside a sentence.
const withExtras = st => (st.banner.length ? " with a red banner" : "") + (st.errors.length ? (st.banner.length ? " and" : " with") + " page errors" : "");

// Which model Ollama has loaded right now: "name id", or "".
function loadedModel() {
  const r = spawnSync("ollama", ["ps"], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return "";
  const row = r.stdout.split(/\r?\n/).slice(1).find(l => l.trim());
  if (!row) return "";
  const cols = row.trim().split(/\s+/);
  return cols[0] + (cols[1] ? " " + cols[1] : "");
}

// What run-local.sh checks after a run, for a run the runner ended (it was
// killed with run-local.sh, so its own checks never ran): the same searches
// as its grep lines, on the answer and reasoning files the run left.
const CRASH_RE = /ROCm error|llama-server process has terminated/;
const GITTEXT_RE = /\bgit\s+(log|show|diff|checkout|switch|restore|stash|reset|cat-file|blame|reflog|branch|worktree|fetch|pull|clone|grep)\b[^"`\\\n]{0,60}/g;
function gitTextIn(text) { return Array.from(new Set((text.match(GITTEXT_RE) || []).map(s => s.trim()))).slice(0, 3); }
// run-local.sh writes its runs.csv row after the run; for a run the runner
// ended, the runner writes it (exit "early" or "limit").
function runsCsvRow(id, role, label, exitWord, mins, answer) {
  const q = s => '"' + String(s).replace(/"/g, '""') + '"';
  const csv = path.join(".local-runs", "runs.csv");
  try {
    if (!fs.existsSync(csv)) fs.writeFileSync(csv, "run_id,role,label,exit,minutes,files_changed,diffstat,last_line,free_mb_start,free_mb_end\n");
    const files = gitQuiet(["diff", "--name-only"]).split("\n").filter(Boolean).join(" ");
    const stat = gitQuiet(["diff", "--shortstat"]);
    fs.appendFileSync(csv, [q(id), role, q(label), exitWord, mins, q(files), q(stat), q(lastLine(answer).slice(0, 200)), "", ""].join(",") + "\n");
  } catch (e) { /* the report says what happened anyway */ }
}

// ---- prompts ---------------------------------------------------------------------
function builderPrompt(n) {
  return "Read " + cfg.spec + " and " + cfg.phaseFile + ", and do PHASE " + n + ".\n" +
    "Then stop. Follow the spec's RULES FOR THE MODEL: change only the PHASE " + n + " block of " +
    cfg.phaseFile + ", run no commands, create no files, and end your reply with the line: DONE PHASE " + n + "\n";
}
function fixerPrompt(n, expected, st) {
  return "Read ONLY these parts of " + cfg.spec + " (line numbers are in the LINE MAP at the top): the rules and API, PHASE " + n +
    ", and the FIXER PROMPT section. Then read only the PHASE " + n + " block of " + cfg.phaseFile + " (search for \"PHASE " + n +
    " START\") - the only part you may change - and fix it.\n" +
    "Symptom: after PHASE " + n + " the self-test says \"" + (st.line || "(no self-test line)") + "\" but the spec expects \"" + expected + "\"." +
    (st.failing ? " Failing probes: " + st.failing + "." : "") + "\n" +
    "Red banner / console error: " + (st.banner.concat(st.errors).join(" | ") || "none") + "\n" +
    "Self-test line: " + (st.line || "not run") + "\n" +
    "If the symptom describes something a LATER phase adds, reply \"NOT A BUG - PHASE <n>\" and change nothing.\n" +
    "If the expected line itself contradicts the phase's steps, reply \"SPEC MISMATCH: <quote both>\" and change nothing.\n" +
    "First compare the PHASE " + n + " block with the spec's steps line by line - most bugs are a missing or changed step. " +
    "Fix the root cause with the smallest edit, at most 2 edit calls. Run no commands and create no files: this run cannot test, " +
    "the self-test runs after you. Keep the block's last line " + OKLINE(n) + "\n" +
    "Reply with: CAUSE: <one sentence>  FIX: <one sentence>, then end your reply with the line: DONE PHASE " + n + "\n";
}

// ---- is the edit whole? ----------------------------------------------------------------
// HEAD and branch unmoved, no new files, only the phase file changed, and only
// inside its PHASE n block. Returns {} when whole, else {stop}.
function wholeEdit(n, before, beforeOutside) {
  const head = gitQuiet(["rev-parse", "HEAD"]), branch = gitQuiet(["branch", "--show-current"]);
  if (head !== before.head || branch !== before.branch) return { stop: "HEAD or the branch moved during the run (the model ran git?) - was " + before.branch + " " + before.head.slice(0, 7) + ", now " + (branch || "(detached)") + " " + head.slice(0, 7) };
  const newFiles = untracked().filter(f => !before.untracked.includes(f));
  if (newFiles.length) return { stop: "the run created files: " + newFiles.join(", ") };
  const changed = gitQuiet(["diff", "--name-only"]).split("\n").filter(Boolean);
  if (!changed.length) return { stop: "the run changed nothing", nothing: true };
  if (changed.some(f => f !== cfg.phaseFile)) return { stop: "the run changed other files: " + changed.join(", ") };
  const nowOutside = outsideBlock(fs.readFileSync(cfg.phaseFile, "utf8"), n);
  if (nowOutside.error) return { stop: nowOutside.error };
  if (nowOutside.outside !== beforeOutside.outside) return { stop: "the run changed " + cfg.phaseFile + " outside the PHASE " + n + " block (git diff shows where)" };
  return {};
}

// ---- one run of the builder or the fixer -------------------------------------------
async function attempt(n, role, tryNo, expected, prevSelftest, earlyOk) {
  const label = role === "builder" ? "phase" + n : "phase" + n + "-fix" + tryNo;
  const promptFile = path.join("prompts", label + ".txt");
  fs.mkdirSync("prompts", { recursive: true });
  fs.writeFileSync(promptFile, role === "builder" ? builderPrompt(n) : fixerPrompt(n, expected, prevSelftest));

  const before = { head: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]), untracked: untracked() };
  const beforeOutside = outsideBlock(gitShow("HEAD:" + cfg.phaseFile), n);
  if (beforeOutside.error) return { stop: "before the run, " + beforeOutside.error };

  const minutes = role === "builder" ? cfg.builderMinutes : cfg.fixerMinutes;
  const early = cfg.earlyFinish && earlyOk;
  say("\n=== PHASE " + n + ": " + role + (role === "fixer" ? " try " + tryNo : "") + " (limit " + minutes + " min" +
    (early ? "; early finish after " + cfg.quietSeconds + " s quiet with the plan's line" : "") + ")");
  const t0 = Date.now();

  // The early-finish check: each quiet state of the phase file is judged once.
  const w = { start: hashOf(cfg.phaseFile), last: "", since: t0, judged: "", hit: null };
  w.last = w.start;
  const watch = early ? async function () {
    const h = hashOf(cfg.phaseFile);
    if (h !== w.last) { w.last = h; w.since = Date.now(); return false; }
    if (h === w.start || Date.now() - w.since < cfg.quietSeconds * 1000) return false;
    const key = h + "|" + gitQuiet(["status", "--porcelain", "--untracked-files=all"]);
    if (key === w.judged) return false;
    w.judged = key;
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    const whole = wholeEdit(n, before, beforeOutside);
    if (whole.stop) { say("\n  [early-finish check at " + mins + " min: not yet - " + whole.stop + "]"); return false; }
    const st = await selftestOnce();
    if (hashOf(cfg.phaseFile) !== h) return false;                  // written to meanwhile: judge it again later
    const quiet = Math.round((Date.now() - w.since) / 1000);
    if (!isPlanLine(st, expected)) { say("\n  [early-finish check at " + mins + " min: " + (st.line || "no self-test line") + extras(st) + " - not the plan's line yet]"); return false; }
    say("\n  [early-finish check at " + mins + " min: " + cfg.phaseFile + " the same for " + quiet + " s, only the PHASE " + n + " block changed, " + st.line + " - the plan's line. Ending the run.]");
    w.hit = { st, hash: h, quiet };
    return true;
  } : null;

  const r = await run("bash", ["run-local.sh", role, label, promptFile.split(path.sep).join("/")], minutes, watch);
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  const res = { role, tryNo, mins, label, code: r.code, how: "" };
  const idMatch = r.out.match(/^== (\S+)/m);
  res.runId = idMatch ? idMatch[1] : label;
  const ansMatch = r.out.match(/answer: (\S+) \(/);
  res.answerFile = ansMatch ? ansMatch[1] : (idMatch ? path.join(".local-runs", res.runId + ".answer.txt").split(path.sep).join("/") : "");
  const reasoningFile = res.answerFile.replace(/answer\.txt$/, "reasoning.txt");
  const answer = res.answerFile ? readOr(res.answerFile, "") : "";
  // The Local-Model stamp: what Ollama has loaded at the end of the run,
  // read before anything unloads it.
  res.model = loadedModel();
  const endedByRunner = r.timedOut || r.early;
  if (endedByRunner && idMatch) runsCsvRow(res.runId, role, label, r.early ? "early" : "limit", mins, answer);
  if (r.timedOut) spawnSync("ollama", ["stop", role], { stdio: "ignore" });

  // Settings files changed during the run, said plainly.
  const sc = settingsChanged();
  const seen = sc.filter(c => c.seenByGit), unseen = sc.filter(c => !c.seenByGit);
  if (unseen.length) res.note = unseen.map(c => c.name).join(", ") + " changed during the " + role + " run (git doesn't track it, so the run goes on). This batch keeps the settings and plan it read at the start; the change counts from the next batch.";
  if (unseen.length) say("\n!! " + res.note);
  if (seen.length) {
    const names = seen.map(c => c.name);
    return Object.assign(res, { stop: names.join(" and ") + (names.length > 1 ? " were" : " was") + " changed during phase " + n + "'s " + role + " run" +
      " - most likely by a person or an editor (the prompt forbids the model to touch it). This batch read its settings at the start and still used them" +
      " (builder " + cfg.builderMinutes + " min, fixer " + cfg.fixerMinutes + " min, " + cfg.fixerTries + " fixer tries), and nothing was committed for phase " + n + "." +
      " To go on: commit the settings change on its own (git add " + names.join(" ") + "; git commit), then git checkout -- " + cfg.phaseFile +
      " and run the plan again with --from " + n + "." });
  }

  if (!endedByRunner) {
    if (r.code === 4) return Object.assign(res, { stop: "DRIVER CRASH (run-local.sh exit 4) - restart Windows before any further run", crash: true });
    if (r.code !== 0) return Object.assign(res, { stop: "run-local.sh exited " + r.code + " (see its output above)" });
  } else {
    const crash = (answer + "\n" + readOr(reasoningFile, "")).match(CRASH_RE);
    if (crash) return Object.assign(res, { stop: "DRIVER CRASH (" + crash[0] + " in the run's files) - restart Windows before any further run", crash: true });
  }

  // Where things are now.
  const whole = wholeEdit(n, before, beforeOutside);
  const verdict = answer.split(/\r?\n/).map(l => l.trim()).find(l => /^(NOT A BUG|SPEC MISMATCH)/.test(l));
  if (verdict) {
    const changed = gitQuiet(["diff", "--name-only"]).split("\n").filter(Boolean);
    return Object.assign(res, { stop: "the fixer answered: " + verdict + (changed.length ? " (and changed " + changed.join(", ") + ")" : "") + (whole.stop && !whole.nothing ? " - and " + whole.stop : "") });
  }
  if (whole.stop) {
    if (r.timedOut) return Object.assign(res, { stop: "the " + role + " ran past its " + minutes + "-minute limit and was stopped, and " + whole.stop + " (a failed run: look at the files it left, then git checkout -- " + cfg.phaseFile + ")" });
    return Object.assign(res, { stop: whole.stop });
  }
  const gitText = endedByRunner ? gitTextIn(answer + "\n" + readOr(reasoningFile, "")) : (/^!! git command text/m.test(r.out) ? ["(run-local.sh's flag)"] : []);
  if (gitText.length) return Object.assign(res, { stop: (endedByRunner ? "the run's files hold git command text (" + gitText.join("; ") + ")" : "run-local.sh flagged git command text") +
    " - read " + (reasoningFile || "the reasoning file") + " to see whether the model ran it (LOCAL-SUBAGENTS.md step 3)" });

  const last = lastLine(answer);
  res.doneLine = last === "DONE PHASE " + n;

  // The self-test - also for a run the runner ended, and for an answer with
  // no DONE line. An early finish already tested this very file.
  let st;
  if (r.early && w.hit && hashOf(cfg.phaseFile) === w.hit.hash) st = w.hit.st;
  else st = await selftest();
  res.selftest = st;
  if (!st.line) return Object.assign(res, { stop: "the self-test printed no SELF-TEST line, so the run can't be judged (not sent to the fixer). Its output:\n" + rawLines(st) });
  res.match = isPlanLine(st, expected);
  say("self-test: " + st.line + extras(st) + (res.match ? "  - as expected" : "  - expected: " + expected));

  if (r.early) {
    if (!res.match) return Object.assign(res, { stop: "the early finish ended the run, but " + cfg.phaseFile + " changed before it stopped and the self-test now says \"" + st.line + "\", not the plan's line (look at the edit; git checkout -- " + cfg.phaseFile + " to throw it away)" });
    res.how = "early";
    res.quiet = w.hit ? w.hit.quiet : cfg.quietSeconds;
  } else if (r.timedOut) {
    if (!res.match) return Object.assign(res, { stop: "the " + role + " ran past its " + minutes + "-minute limit and was stopped; its edit stayed inside the PHASE " + n + " block, but the self-test says \"" + st.line + "\"" + withExtras(st) + ", not the plan's \"" + expected + "\" (not committed; look at the edit, then git checkout -- " + cfg.phaseFile + ")" });
    res.how = "limit";
  } else if (!res.doneLine) {
    if (!res.match) return Object.assign(res, { stop: "the answer's last line is \"" + last.slice(0, 80) + "\", not DONE PHASE " + n + ", and the self-test says \"" + st.line + "\"" + withExtras(st) + ", not the plan's \"" + expected + "\" (not committed)" });
    res.how = "nodone";
  }
  res.lastLine = last;
  return res;
}

// Commits the phase file with the run's trailers; returns the short hash.
// Local-Model: what Ollama had loaded at the end of the run (name and id), so
// the credit doesn't rest on today's LOCAL list in dev/disclosure.js alone.
function commit(subject, body, res) {
  const lines = [subject, "", body, ""];
  if (res.model) lines.push("Local-Model: " + res.model);
  lines.push("Committed-By: run-phases.js");
  if (coAuthor) lines.push("Co-Authored-By: " + coAuthor + " <noreply@anthropic.com>");
  const msg = path.join(os.tmpdir(), "run-phases-msg-" + process.pid + ".txt");
  fs.writeFileSync(msg, lines.join("\n") + "\n");
  git(["add", "--", cfg.phaseFile]);
  git(["commit", "-q", "-F", msg]);
  fs.unlinkSync(msg);
  return git(["rev-parse", "--short", "HEAD"]);
}
// What the commit body says about how the run ended, when not by itself.
function howNote(r, n) {
  if (r.how === "early") return " Ended early by run-phases.js: " + cfg.phaseFile + " had stayed the same for " + r.quiet + " s, only the PHASE " + n + " block had changed, and the self-test already gave the plan's line.";
  if (r.how === "limit") return " Stopped by run-phases.js at the " + (r.role === "builder" ? cfg.builderMinutes : cfg.fixerMinutes) + "-minute limit with its edit whole: only the PHASE " + n + " block had changed and the self-test gave the plan's line.";
  if (r.how === "nodone") return " The answer did not end with DONE PHASE " + n + " (its last line: \"" + (r.lastLine || "").slice(0, 80) + "\"); the self-test gave the plan's line.";
  return "";
}

// ---- before a phase: the tree must give the previous phase's line ---------------
async function precheck(n, want, wantFrom) {
  const st = await selftest();
  if (!st.line) return { stop: "before phase " + n + " the self-test printed no SELF-TEST line. Its output:\n" + rawLines(st) };
  say("before phase " + n + ": " + st.line + extras(st) + (want ? (st.line === want ? "  - " + wantFrom + ", as the plan says" : "  - expected " + wantFrom + ": " + want) : ""));
  const subject = git(["log", "-1", "--format=%s"]);
  if (want && st.line !== want) return { stop: "before phase " + n + " the tree gives \"" + st.line + "\", not " + wantFrom + " \"" + want + "\" (HEAD: " + git(["log", "-1", "--format=%h"]) + " " + subject.slice(0, 70) + "). No model was run. The fault is in an earlier block or a commit's line, not phase " + n + "'s; or the branch isn't where this plan starts. Check the tree at that commit (a cloud session can help)." };
  // A commit whose subject names a SELF-TEST line must be the tree that prints it.
  const m = subject.match(/^phase \d+:.*?(SELF-TEST .*?)(?: \(spec: .*\))?$/);
  if (m && m[1].trim() !== st.line) return { stop: "HEAD's subject says \"" + m[1].trim() + "\" but the tree gives \"" + st.line + "\" (" + subject.slice(0, 60) + "...). No model was run. A hand commit's line must come from the self-test's own output: L=$(" + cfg.selftest + " | grep -m1 '^SELF-TEST'), then git commit --amend with \"$L\" in the subject - or, if the line is right, the block isn't: check it before going on." };
  return { line: st.line };
}

// ---- one phase: the builder, then up to fixerTries fixer runs ------------------------
async function phase(n, expected, log, earlyOk) {
  const b = await attempt(n, "builder", 1, expected, null, earlyOk);
  log.push(b);
  if (b.stop) return { stop: b.stop, crash: b.crash };
  const tail = (r) => "Run " + (r.runId || r.label) + " by run-phases.js: " + r.mins + " min" + (r.selftest && r.selftest.failing ? "; failing probes: " + r.selftest.failing : "") + ".\nOnly the PHASE " + n + " block of " + cfg.phaseFile + " changed.";
  if (b.match) {
    b.commit = commit("phase " + n + ": builder, first try, " + b.selftest.line, tail(b) + " The spec's expected line." + howNote(b, n), b);
    return { ok: true };
  }
  b.commit = commit("phase " + n + ": builder, first try, " + (b.selftest.line || "no self-test line") + " (spec: " + expected + ")",
    tail(b) + " Not the spec's line yet: committed as the builder left it, for the fixer.", b);
  if (!cfg.fixerTries) return { stop: "phase " + n + " got \"" + b.selftest.line + "\", not \"" + expected + "\" (--no-fixer)" };
  let prev = b.selftest;
  for (let k = 1; k <= cfg.fixerTries; k++) {
    const f = await attempt(n, "fixer", k, expected, prev, earlyOk);
    log.push(f);
    if (f.stop) return { stop: f.stop, crash: f.crash };
    f.commit = commit("phase " + n + ": fixer try " + k + ", " + (f.selftest.line || "no self-test line") + (f.match ? "" : " (spec: " + expected + ")"),
      tail(f) + (f.match ? " The spec's expected line." + howNote(f, n) : " Still not the spec's line."), f);
    if (f.match) return { ok: true };
    prev = f.selftest;
  }
  return { stop: "phase " + n + " still got \"" + prev.line + "\" after " + cfg.fixerTries + " fixer tries" };
}

// ---- the batch ---------------------------------------------------------------------
(async function main() {
  // Setup checks.
  if (process.platform === "win32" && !process.env.MSYSTEM) die("run this from Git Bash (on Windows, another bash may be WSL's)");
  if (!fs.existsSync("run-local.sh")) die("run-local.sh is not in this folder - run from the project folder");
  if (!fs.existsSync(cfg.phaseFile) || !fs.existsSync(cfg.spec)) die("missing " + cfg.phaseFile + " or " + cfg.spec + " (phase-runner.json?)");
  let top;
  try { top = git(["rev-parse", "--show-toplevel"]); } catch (e) { die("not a git folder"); }
  if (path.resolve(top) !== path.resolve(process.cwd()) && fs.realpathSync(top) !== fs.realpathSync(process.cwd())) die("run from the top of the repository (" + top + ")");
  const branch = git(["branch", "--show-current"]);
  if (!branch) die("HEAD is detached - make a throwaway branch first");
  if (cfg.protectedBranches.includes(branch)) die("refusing to run on '" + branch + "' - make a throwaway branch (LOCAL-SUBAGENTS.md)");
  if (git(["status", "--porcelain", "--untracked-files=no"])) die("uncommitted changes - commit or stash first");
  if (!(cfg.quietSeconds > 0) || !(cfg.checkSeconds > 0)) die("phase-runner.json: quietSeconds and checkSeconds must be numbers above 0");

  // The plan.
  if (!fs.existsSync(planPath)) die("no plan file: " + planPath);
  let plan = [];
  let replayRef = "", startLine = "";
  fs.readFileSync(planPath, "utf8").split(/\r?\n/).forEach(function (raw, i) {
    const l = raw.replace(/#.*$/, "").trim();
    if (!l) return;
    let m = l.match(/^replay-same-as\s+(\S+)$/);
    if (m) { replayRef = m[1]; return; }
    m = l.match(/^start\s+(SELF-TEST .+)$/);
    if (m) { startLine = m[1].trim(); return; }
    m = l.match(/^(\d+)\s+(SELF-TEST .+)$/);
    if (!m) die(planPath + " line " + (i + 1) + ": expected '<phase> SELF-TEST ...', 'start SELF-TEST ...' or 'replay-same-as <ref>'");
    plan.push({ n: Number(m[1]), expected: m[2].trim() });
  });
  if (!plan.length) die("the plan has no phases");
  if (new Set(plan.map(p => p.n)).size !== plan.length) die("a phase appears twice in the plan");
  // The line the tree must give before the first phase that runs.
  let firstWant = startLine, firstFrom = "the plan's start line";
  if (fromPhase) {
    const i = plan.findIndex(p => p.n === Number(fromPhase));
    if (i < 0) die("--from " + fromPhase + ": no phase " + fromPhase + " in " + planPath);
    if (i > 0) { firstWant = plan[i - 1].expected; firstFrom = "phase " + plan[i - 1].n + "'s line"; }
    plan = plan.slice(i);
  }
  const text = fs.readFileSync(cfg.phaseFile, "utf8");
  for (const p of plan) { const o = outsideBlock(text, p.n); if (o.error) die("phase " + p.n + ": " + o.error); }
  if (replayRef && !gitOk(["rev-parse", "--verify", "--quiet", replayRef + "^{commit}"])) die("replay-same-as: no such branch or commit: " + replayRef);
  snapshotSettings();

  say("run-phases: branch " + branch + ", " + plan.length + " phase(s)" + (fromPhase ? " from phase " + fromPhase : "") + ", builder limit " + cfg.builderMinutes + " min, fixer limit " + cfg.fixerMinutes + " min, " + cfg.fixerTries + " fixer tries");
  say("  early finish: " + (cfg.earlyFinish ? "on (checks every " + cfg.checkSeconds + " s; ends a run once " + cfg.phaseFile + " has been the same for " + cfg.quietSeconds + " s with the plan's line)" : "off"));
  if (firstWant) say("  before phase " + plan[0].n + ": " + firstWant + " (" + firstFrom + ")");
  plan.forEach(p => say("  phase " + p.n + " -> " + p.expected));
  if (replayRef) say("  replay lines at the end: the same as on " + replayRef);
  if (coAuthor) say("  commits carry Co-Authored-By: " + coAuthor);

  // The replay lines to compare with, from a temporary checkout of replayRef.
  let wantReplay = null;
  if (replayRef) {
    // A sibling folder named by a relative path: no temp-folder path for git
    // and Node to read differently on Windows. Removed again before going on.
    const wt = "../" + path.basename(process.cwd()) + "-replay-" + stamp();
    let st = null, failed = "";
    try {
      git(["worktree", "add", "--detach", "--quiet", wt, replayRef]);
      st = await selftest(wt);
    } catch (e) {
      failed = String(e.message || e).trim();
    } finally {
      spawnSync("git", ["worktree", "remove", "--force", wt], { stdio: "ignore" });
    }
    if (failed) die("could not check out " + replayRef + " for the replay lines: " + failed);
    wantReplay = st.replay;
    say("  " + replayRef + ": " + (st.line || "(no self-test line)") + ", " + wantReplay.length + " replay line(s)");
    if (!wantReplay.length) die("no replay lines on " + replayRef + ". The self-test's output there:\n" + rawLines(st));
  }

  // The tree before the first phase (also in a dry run: a wrong hand-commit
  // line shows here, before any model runs).
  const pre = await precheck(plan[0].n, firstWant, firstFrom);
  if (pre.stop && dryRun) die(pre.stop, 1);
  if (dryRun) { say("dry run: everything checks out; no model was run."); process.exit(0); }

  // The runs.
  const log = [];
  let result = pre.stop ? { stop: pre.stop } : { ok: true }, done = 0;
  let verified = pre.stop ? null : { head: git(["rev-parse", "HEAD"]), line: pre.line };
  for (let i = 0; i < plan.length && result.ok; i++) {
    const p = plan[i];
    if (i > 0) {
      // Before each later phase: the previous phase's plan line. The phase
      // just committed was judged on this very tree, so its line counts
      // unless HEAD has moved since.
      const want = plan[i - 1].expected, from = "phase " + plan[i - 1].n + "'s line";
      if (verified && verified.head === git(["rev-parse", "HEAD"])) {
        if (verified.line !== want) { result = { stop: "before phase " + p.n + " the tree gives \"" + verified.line + "\", not " + from + " \"" + want + "\"" }; break; }
      } else {
        const c = await precheck(p.n, want, from);
        if (c.stop) { result = { stop: c.stop }; break; }
        verified = { head: git(["rev-parse", "HEAD"]), line: c.line };
      }
    }
    // Early finish is off when the tree already gives this phase's line (a
    // phase the self-test can't tell from its stub).
    const earlyOk = !(verified && verified.line === p.expected);
    if (cfg.earlyFinish && !earlyOk) say("  (phase " + p.n + ": the tree already gives its line before the run, so no early finish for it)");
    result = await phase(p.n, p.expected, log, earlyOk);
    if (!result.ok) break;
    verified = { head: git(["rev-parse", "HEAD"]), line: p.expected };
    done++;
  }

  // The replay check.
  let replayNote = "";
  if (result.ok && wantReplay) {
    const st = await selftest();
    const same = st.replay.length === wantReplay.length && st.replay.every((l, i) => l === wantReplay[i]);
    replayNote = same ? "replay lines: the same as on " + replayRef : "REPLAY LINES DIFFER from " + replayRef + ":\n    now:  " + st.replay.join("\n          ") + "\n    want: " + wantReplay.join("\n          ");
    if (!same) result = { stop: "the replay lines differ from " + replayRef };
  }

  // The report.
  const fixerRuns = log.filter(r => r.role === "fixer");
  const fixerCommits = fixerRuns.filter(r => r.commit);
  const HOW = { early: "  (ended early)", limit: "  (at the time limit, whole)", nodone: "  (no DONE line)" };
  const rows = log.map(r => "  " + r.label.padEnd(14) + String(r.mins || "-").padStart(5) + " min  " +
    (r.stop ? "STOPPED" + (r.selftest && r.selftest.line ? " (" + r.selftest.line + ")" : "") : (r.selftest ? r.selftest.line : "")) + (r.commit ? "  [" + r.commit + "]" : "") + (HOW[r.how] || ""));
  const report = ["", "=== run-phases report (" + stamp().replace(/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)\d\d$/, "$1-$2-$3 $4:$5") + ", branch " + branch + ")",
    "  phases done: " + done + " of " + plan.length + (fixerRuns.length ? " - the FIXER ran " + fixerRuns.length + " time" + (fixerRuns.length > 1 ? "s" : "") : ", no fixer calls")]
    .concat(rows);
  log.filter(r => r.note).forEach(r => report.push("  NOTE (" + r.label + "): " + r.note));
  const early = log.filter(r => r.how === "early");
  if (early.length) report.push("  Ended early: " + early.map(r => r.label).join(", ") + " - the file had stopped changing and already gave the plan's line (each commit body says so).");
  if (replayNote) report.push("  " + replayNote);
  if (!result.ok) report.push("  STOPPED: " + result.stop, log.length ? "  The tree is as the last run left it: git status / git diff to look; git checkout -- " + cfg.phaseFile + " to throw an uncommitted change away." : "  No model was run; the tree is as it was.",
    "  To go on from a phase after fixing things: node run-phases.js " + planPath + " --from <phase>");
  if (fixerCommits.length) report.push("  The fixer wrote code: the AI disclosure names it only if the author says so (the disclosure check below will ask).");
  say(report.join("\n"));

  if (cfg.disclosure && fs.existsSync(cmdParts(cfg.disclosure).args[0] || "")) {
    say("\n=== " + cfg.disclosure);
    const c = cmdParts(cfg.disclosure);
    const d = spawnSync(c.cmd === "node" ? process.execPath : c.cmd, c.args, { encoding: "utf8" });
    say(((d.stdout || "") + (d.stderr || "")).trim());
    if (d.error) say(d.error.message);
    say("(exit " + (d.status === null ? "?" : d.status) + (d.status === 2 ? " - the check couldn't run: its settings file or the folder, not the code" : "") + ")");
  }
  if (result.ok) {
    // Merge advice only when the branch holds working's newest commits; a
    // branch made from an older commit (a test of a past rebuild) would
    // conflict with working, or take it backwards, and is deleted instead.
    const n = log.filter(r => r.commit).length;
    const base = ["working", "origin/working"].find(b => gitOk(["rev-parse", "--verify", "--quiet", b]));
    const current = base && gitOk(["merge-base", "--is-ancestor", base, "HEAD"]);
    if (current) say("\nNext: look over the commits (git log --oneline -" + n + "). If this was real work: git checkout working, git merge " + branch + ", git push - and ask a cloud session for its check if it was a rebuild. If it was a test: git checkout working, git branch -D " + branch + ".");
    else say("\nNext: look over the commits (git log --oneline -" + n + "). DON'T MERGE this branch: it doesn't contain " + (base || "working") + "'s newest commits (a test, or made from an old commit). When you're done with it: git checkout working, git branch -D " + branch + ".");
  }

  try {
    fs.mkdirSync(".local-runs", { recursive: true });
    fs.writeFileSync(path.join(".local-runs", stamp() + "-batch.txt"), report.join("\n").trim() + "\n");
  } catch (e) { /* the report was printed anyway */ }
  process.exit(result.ok ? 0 : (result.crash ? 4 : 1));
})().catch(e => { console.error(e && e.stack || e); process.exit(2); });
