#!/usr/bin/env node
// run-phases.js - runs a batch of local builder / fixer phases with no Claude
// session needed: for each phase in a plan file it writes the prompt, calls
// run-local.sh, checks the result, runs the self-test, and commits with the
// subject dev/disclosure.js reads ("phase N: builder, first try, ..." /
// "phase N: fixer try K, ..."). It stops at the first thing that needs a
// person, leaves the tree as the run left it, and says what to look at.
//
//   node run-phases.js plan.txt                 run the plan
//   node run-phases.js plan.txt --dry-run       check everything, run nothing
//   node run-phases.js plan.txt --co-author "Claude Sonnet 5.5"
//        (only when a Claude Code session starts it: adds that model's
//        Co-Authored-By line to each commit; builder / fixer commits still
//        credit the local model - their subject says so)
//   node run-phases.js plan.txt --no-fixer      stop at the first mismatch
//
// Run it from Git Bash in the project folder, next to run-local.sh (the same
// folder LOCAL-SUBAGENTS.md lives in). It never pushes, never merges, and
// refuses to run on the project's shared branches.
//
// THE PLAN FILE - one line per phase, in order; # starts a comment:
//   7   SELF-TEST 14/26 FAIL: map map2 path
//   8   SELF-TEST 18/26 FAIL: ask nerve cards
//   9   SELF-TEST 26/26 PASS
//   replay-same-as  origin/working
// Each phase line: the phase number, then the self-test line the spec expects
// after that phase (exactly as the self-test prints it). The optional
// replay-same-as line: at the end, the self-test's replay lines must be the
// same as they are on that branch or commit.
//
// THE PROJECT (phase-runner.json next to this file, optional - these are the
// defaults, which fit Amontillado):
//   { "spec": "specs/AMONTILLADO-SPEC.txt", "phaseFile": "game.html",
//     "selftest": "node dev/selftest.js", "disclosure": "node dev/disclosure.js",
//     "protectedBranches": ["working", "main", "working-claude", "reference"],
//     "builderMinutes": 10, "fixerMinutes": 30, "fixerTries": 2 }
//
// WHAT COUNTS AS A GOOD RUN (all of these, or the batch stops):
//   run-local.sh exits 0 (exit 4 = driver crash: restart Windows)
//   it finishes inside its time limit (builderMinutes / fixerMinutes)
//   HEAD and the branch are where they were (the model made no commit or checkout)
//   only the phase file changed, no new files, and only inside its PHASE N
//     block - the START / END lines and the block's last line,
//     PHASE_OK[N] = true;, untouched
//   no "!! git command text" flag from run-local.sh (look in the reasoning)
//   the answer's last line is DONE PHASE N
// Then the self-test decides: its line must be the plan's expected line, with
// no red banner and no page errors. If not, the builder's attempt is committed
// as it is (its subject says what it got) and the fixer gets up to fixerTries
// tries, each committed. A fixer that answers NOT A BUG or SPEC MISMATCH stops
// the batch.
//
// Exit codes: 0 every phase committed with its expected line (and the replay
// lines the same, if asked); 1 stopped - read the report; 2 setup problem;
// 4 driver crash (restart Windows before any further run).

"use strict";
const { spawn, spawnSync, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ---- settings ---------------------------------------------------------------
const DEFAULTS = {
  spec: "specs/AMONTILLADO-SPEC.txt",
  phaseFile: "game.html",
  selftest: "node dev/selftest.js",
  disclosure: "node dev/disclosure.js",
  protectedBranches: ["working", "main", "working-claude", "reference"],
  builderMinutes: 10,
  fixerMinutes: 30,
  fixerTries: 2
};

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
function opt(n) { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; }
const planPath = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--co-author");
const dryRun = flag("--dry-run");
const noFixer = flag("--no-fixer");
const coAuthor = opt("--co-author");

function die(msg, code) { console.error("run-phases: " + msg); process.exit(code || 2); }
function say(msg) { console.log(msg); }

if (!planPath) die("usage: node run-phases.js <plan file> [--dry-run] [--no-fixer] [--co-author \"Claude Sonnet 5.5\"]");
if (coAuthor && !/^Claude [A-Za-z]+ \d+(\.\d+)?$/.test(coAuthor)) die("--co-author takes a Claude model name, e.g. \"Claude Sonnet 5.5\"");

let cfg = Object.assign({}, DEFAULTS);
if (fs.existsSync("phase-runner.json")) {
  try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync("phase-runner.json", "utf8"))); }
  catch (e) { die("phase-runner.json: " + e.message); }
}
if (noFixer) cfg.fixerTries = 0;

// ---- small helpers ----------------------------------------------------------
function git(args, opts) {
  return execFileSync("git", args, Object.assign({ encoding: "utf8", maxBuffer: 1 << 26 }, opts || {})).replace(/\s+$/, "");
}
// The stored text of a file at a commit, untrimmed (git() trims the end).
function gitShow(spec) { return execFileSync("git", ["show", spec], { encoding: "utf8", maxBuffer: 1 << 26 }); }
function gitOk(args) { return spawnSync("git", args, { encoding: "utf8" }).status === 0; }
function untracked() { return git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean).sort(); }
function stamp() { const d = new Date(), p = n => String(n).padStart(2, "0"); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }
function lastLine(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() && !/^\s*```/.test(l));
  return (lines[lines.length - 1] || "").trim();
}
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

// ---- running things -----------------------------------------------------------
// Runs a command with a time limit, echoing its output; returns {code, out, timedOut}.
function run(cmd, args, minutes) {
  return new Promise(function (resolve) {
    const posix = process.platform !== "win32";
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], detached: posix });
    let out = "", timedOut = false;
    child.stdout.on("data", d => { out += d; process.stdout.write(d); });
    child.stderr.on("data", d => { out += d; process.stderr.write(d); });
    const timer = minutes ? setTimeout(function () {
      timedOut = true;
      say("\n!! TIME LIMIT (" + minutes + " min) - stopping the run");
      if (posix) { try { process.kill(-child.pid, "SIGTERM"); } catch (e) { /* gone */ } }
      else spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    }, minutes * 60000) : null;
    child.on("close", function (code) { if (timer) clearTimeout(timer); resolve({ code: code === null ? -1 : code, out, timedOut }); });
    child.on("error", function (e) { if (timer) clearTimeout(timer); resolve({ code: -1, out: out + String(e), timedOut }); });
  });
}

// The self-test: {line, failing, replay, banner, errors, raw}.
// A first run on a cold machine (a browser starting, files just checked out)
// can miss the line, so a run with no SELF-TEST line is tried once more.
async function selftest(folder) {
  let st = selftestOnce(folder);
  if (!st.line) { say("  (the self-test printed no SELF-TEST line - trying once more)"); st = selftestOnce(folder); }
  return st;
}
// The self-test's own output, for a person to read when it gives no line.
function rawLines(st) { return "    " + (st.raw.trim().split(/\r?\n/).slice(0, 25).join("\n    ") || "(no output at all)"); }
function selftestOnce(folder) {
  const c = cmdParts(cfg.selftest, folder ? [folder] : []);
  const cmd = c.cmd === "node" ? process.execPath : c.cmd;
  const r = spawnSync(cmd, c.args, { encoding: "utf8", maxBuffer: 1 << 26 });
  const raw = (r.stdout || "") + (r.stderr || "") + (r.error ? "\n" + r.error.message : "");
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

// Which model Ollama has loaded right after a run: "name id", or "".
function loadedModel() {
  const r = spawnSync("ollama", ["ps"], { encoding: "utf8" });
  if (r.status !== 0 || !r.stdout) return "";
  const row = r.stdout.split(/\r?\n/).slice(1).find(l => l.trim());
  if (!row) return "";
  const cols = row.trim().split(/\s+/);
  return cols[0] + (cols[1] ? " " + cols[1] : "");
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

// ---- one run of the builder or the fixer -------------------------------------------
async function attempt(n, role, tryNo, expected, prevSelftest) {
  const label = role === "builder" ? "phase" + n : "phase" + n + "-fix" + tryNo;
  const promptFile = path.join("prompts", label + ".txt");
  fs.mkdirSync("prompts", { recursive: true });
  fs.writeFileSync(promptFile, role === "builder" ? builderPrompt(n) : fixerPrompt(n, expected, prevSelftest));

  const before = { head: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]), untracked: untracked() };
  const beforeOutside = outsideBlock(gitShow("HEAD:" + cfg.phaseFile), n);
  if (beforeOutside.error) return { stop: "before the run, " + beforeOutside.error };

  const minutes = role === "builder" ? cfg.builderMinutes : cfg.fixerMinutes;
  say("\n=== PHASE " + n + ": " + role + (role === "fixer" ? " try " + tryNo : "") + " (limit " + minutes + " min)");
  const t0 = Date.now();
  const r = await run("bash", ["run-local.sh", role, label, promptFile.split(path.sep).join("/")], minutes);
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  const res = { role, tryNo, mins, label, code: r.code };

  if (r.timedOut) {
    spawnSync("ollama", ["stop", role], { stdio: "ignore" });
    return Object.assign(res, { stop: "the " + role + " ran past its " + minutes + "-minute limit and was stopped (a failed run: look at the files it left, then git checkout -- " + cfg.phaseFile + ")" });
  }
  if (r.code === 4) return Object.assign(res, { stop: "DRIVER CRASH (run-local.sh exit 4) - restart Windows before any further run", crash: true });
  if (r.code !== 0) return Object.assign(res, { stop: "run-local.sh exited " + r.code + " (see its output above)" });

  const ansMatch = r.out.match(/answer: (\S+) \(/);
  const answer = ansMatch && fs.existsSync(ansMatch[1]) ? fs.readFileSync(ansMatch[1], "utf8") : "";
  res.answerFile = ansMatch ? ansMatch[1] : "";
  const idMatch = r.out.match(/^== (\S+)/m);
  res.runId = idMatch ? idMatch[1] : label;
  res.model = loadedModel();

  // Where things are now.
  const head = git(["rev-parse", "HEAD"]), branch = git(["branch", "--show-current"]);
  if (head !== before.head || branch !== before.branch) return Object.assign(res, { stop: "HEAD or the branch moved during the run (the model ran git?) - was " + before.branch + " " + before.head.slice(0, 7) + ", now " + (branch || "(detached)") + " " + head.slice(0, 7) });
  const changed = git(["diff", "--name-only"]).split("\n").filter(Boolean);
  const newFiles = untracked().filter(f => !before.untracked.includes(f));
  if (newFiles.length) return Object.assign(res, { stop: "the run created files: " + newFiles.join(", ") });
  const verdict = answer.split(/\r?\n/).map(l => l.trim()).find(l => /^(NOT A BUG|SPEC MISMATCH)/.test(l));
  if (verdict) return Object.assign(res, { stop: "the fixer answered: " + verdict + (changed.length ? " (and changed " + changed.join(", ") + ")" : "") });
  if (!changed.length) return Object.assign(res, { stop: "the run changed nothing" });
  if (changed.some(f => f !== cfg.phaseFile)) return Object.assign(res, { stop: "the run changed other files: " + changed.join(", ") });
  const nowOutside = outsideBlock(fs.readFileSync(cfg.phaseFile, "utf8"), n);
  if (nowOutside.error) return Object.assign(res, { stop: nowOutside.error });
  if (nowOutside.outside !== beforeOutside.outside) return Object.assign(res, { stop: "the run changed " + cfg.phaseFile + " outside the PHASE " + n + " block (git diff shows where)" });
  if (/^!! git command text/m.test(r.out)) return Object.assign(res, { stop: "run-local.sh flagged git command text - read " + (res.answerFile || "the answer").replace(/answer\.txt$/, "reasoning.txt") + " to see whether the model ran it (LOCAL-SUBAGENTS.md step 3)" });
  const last = lastLine(answer);
  if (last !== "DONE PHASE " + n) return Object.assign(res, { stop: "the answer's last line is \"" + last.slice(0, 80) + "\", not DONE PHASE " + n });

  const st = await selftest();
  res.selftest = st;
  if (!st.line) return Object.assign(res, { stop: "the self-test printed no SELF-TEST line, so the run can't be judged (not sent to the fixer). Its output:\n" + rawLines(st) });
  res.match = st.line === expected && !st.banner.length && !st.errors.length;
  say("self-test: " + (st.line || "(none)") + (st.banner.length ? "  + RED BANNER" : "") + (st.errors.length ? "  + page errors" : "") + (res.match ? "  - as expected" : "  - expected: " + expected));
  return res;
}

// Commits the phase file with the run's trailers; returns the short hash.
// Local-Model: what Ollama had loaded right after the run (name and id), so
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

// ---- one phase: the builder, then up to fixerTries fixer runs ------------------------
async function phase(n, expected, log) {
  const b = await attempt(n, "builder", 1, expected);
  log.push(b);
  if (b.stop) return { stop: b.stop, crash: b.crash };
  const tail = (r) => "Run " + (r.runId || r.label) + " by run-phases.js: " + r.mins + " min" + (r.selftest && r.selftest.failing ? "; failing probes: " + r.selftest.failing : "") + ".\nOnly the PHASE " + n + " block of " + cfg.phaseFile + " changed.";
  if (b.match) {
    b.commit = commit("phase " + n + ": builder, first try, " + b.selftest.line, tail(b) + " The spec's expected line.", b);
    return { ok: true };
  }
  b.commit = commit("phase " + n + ": builder, first try, " + (b.selftest.line || "no self-test line") + " (spec: " + expected + ")",
    tail(b) + " Not the spec's line yet: committed as the builder left it, for the fixer.", b);
  if (!cfg.fixerTries) return { stop: "phase " + n + " got \"" + b.selftest.line + "\", not \"" + expected + "\" (--no-fixer)" };
  let prev = b.selftest;
  for (let k = 1; k <= cfg.fixerTries; k++) {
    const f = await attempt(n, "fixer", k, expected, prev);
    log.push(f);
    if (f.stop) return { stop: f.stop, crash: f.crash };
    f.commit = commit("phase " + n + ": fixer try " + k + ", " + (f.selftest.line || "no self-test line") + (f.match ? "" : " (spec: " + expected + ")"),
      tail(f) + (f.match ? " The spec's expected line." : " Still not the spec's line."), f);
    if (f.match) return { ok: true, fixer: true };
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

  // The plan.
  if (!fs.existsSync(planPath)) die("no plan file: " + planPath);
  const plan = [];
  let replayRef = "";
  fs.readFileSync(planPath, "utf8").split(/\r?\n/).forEach(function (raw, i) {
    const l = raw.replace(/#.*$/, "").trim();
    if (!l) return;
    let m = l.match(/^replay-same-as\s+(\S+)$/);
    if (m) { replayRef = m[1]; return; }
    m = l.match(/^(\d+)\s+(SELF-TEST .+)$/);
    if (!m) die(planPath + " line " + (i + 1) + ": expected '<phase> SELF-TEST ...' or 'replay-same-as <ref>'");
    plan.push({ n: Number(m[1]), expected: m[2].trim() });
  });
  if (!plan.length) die("the plan has no phases");
  const text = fs.readFileSync(cfg.phaseFile, "utf8");
  for (const p of plan) { const o = outsideBlock(text, p.n); if (o.error) die("phase " + p.n + ": " + o.error); }
  if (new Set(plan.map(p => p.n)).size !== plan.length) die("a phase appears twice in the plan");
  if (replayRef && !gitOk(["rev-parse", "--verify", "--quiet", replayRef + "^{commit}"])) die("replay-same-as: no such branch or commit: " + replayRef);

  say("run-phases: branch " + branch + ", " + plan.length + " phase(s), builder limit " + cfg.builderMinutes + " min, fixer limit " + cfg.fixerMinutes + " min, " + cfg.fixerTries + " fixer tries");
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
  if (dryRun) { say("dry run: everything checks out; nothing was run."); process.exit(0); }

  // The runs.
  const log = [];
  let result = { ok: true }, fixerUsed = false, done = 0;
  for (const p of plan) {
    result = await phase(p.n, p.expected, log);
    if (result.fixer) fixerUsed = true;
    if (!result.ok) break;
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
  const rows = log.map(r => "  " + r.label.padEnd(14) + String(r.mins || "-").padStart(5) + " min  " +
    (r.stop ? "STOPPED" : (r.selftest ? r.selftest.line : "")) + (r.commit ? "  [" + r.commit + "]" : ""));
  const report = ["", "=== run-phases report (" + stamp().replace(/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)\d\d$/, "$1-$2-$3 $4:$5") + ", branch " + branch + ")",
    "  phases done: " + done + " of " + plan.length + (fixerUsed ? " - the FIXER was used" : ", no fixer calls")]
    .concat(rows);
  if (replayNote) report.push("  " + replayNote);
  if (!result.ok) report.push("  STOPPED: " + result.stop, "  The tree is as the last run left it: git status / git diff to look; git checkout -- " + cfg.phaseFile + " to throw an uncommitted change away.");
  if (fixerUsed) report.push("  The fixer wrote code: the AI disclosure names it only if the author says so (the disclosure check below will ask).");
  say(report.join("\n"));

  if (cfg.disclosure && fs.existsSync(cmdParts(cfg.disclosure).args[0] || "")) {
    say("\n=== " + cfg.disclosure);
    const c = cmdParts(cfg.disclosure);
    const d = spawnSync(c.cmd, c.args, { encoding: "utf8" });
    say(((d.stdout || "") + (d.stderr || "")).trim());
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
