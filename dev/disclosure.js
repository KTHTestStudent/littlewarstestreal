#!/usr/bin/env node
// disclosure.js - which models wrote this project's code, and does its AI
// disclosure line name them all?
//
// Phase 1 (2026-10-18): Amontillado's dev/disclosure.js with every project
// fact moved into a settings file. Phase 2 (2026-10-18): the stamps - every
// trailer a tool leaves, not only Co-Authored-By. Its PHASE 21 and PHASE 22
// blocks are built by the local builder from specs/PHASE2-SPEC.txt.
//
//   node disclosure.js                         report only
//   node disclosure.js --apply                 add any missing auto-add model
//                                              (in Amontillado: a Claude model)
//   node disclosure.js --apply --with-<role>   also add that ask-first local
//                                              model (Amontillado: --with-fixer)
//   --config <file>                            the settings file (default:
//                                              disclosure.jsonc at the project's root)
//
// Run it from inside the project's git folder (Git Bash, PowerShell or a
// Linux shell). Needs Node and git, nothing else.
// Exit 0 = OK; 1 = the check found something; 2 = the settings or the folder
// are wrong (the message says what).
//
// How it decides (git history only - it never guesses AI use from the content):
//   * CODE (the "code" setting, git pathspecs) is what the line's model list
//     covers. Each CODE commit's trailers are read (stampsOf, PHASE 21) and
//     credited (creditOf, PHASE 22): a Local-Model: trailer (written by the
//     local runner, run-phases.js) credits the local model whose "ids" it
//     names - or, if no entry has that id, the commit is reported and the
//     check fails. Without one, a subject matching a local model's pattern
//     credits that model - NOT the model in its Co-Authored-By line, which
//     only made the commit. Any other commit credits each name in its
//     Co-Authored-By lines (emails dropped, spelled as the settings spell it).
//   * A CODE commit with no model named is a hand edit (or a commit made
//     without its trailer). If it changed only "handEdits" files, it is the
//     author's own edit: listed. If it changed other code, the line may no
//     longer be true: reported, and the check fails - unless "known" (the
//     author's say-so, with a reason) explains it.
//   * Claude-Session trailers are counted, never shown; Committed-By trailers
//     (a script made the commit) are counted by script.
//   * STORY ("story") commits are counted apart, never credited: those with a
//     model named and those without (the author's).
//   * The line is "<prefix> <models>." in each of "line.files", the model list
//     on ONE line, ending at the first "." right after a version number
//     ("Qwen 3.6."). Each file must also hold the human sentence ("human")
//     word for word - joined with spaces, or as separate lines in the files
//     listed in "human.splitIn".
//   * --apply adds only names matching "line.autoAdd" on its own (the
//     author's standing OK); an ask-first local model only with --with-<role>;
//     any other name (a person, an unknown model) is reported, never added.
//     Names are never removed, so a shallow clone is safe.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function stop(msg) { console.error("disclosure: " + msg); process.exit(2); }

// JSON with comments: // and /* */ comments and trailing commas are allowed.
// Comments and the trailing commas are blanked with spaces (newlines kept),
// so JSON.parse's positions still point at the right line.
function parseJsonc(text) {
  if (text.charCodeAt(0) === 0xfeff) text = " " + text.slice(1);   // a BOM (Notepad)
  const blank = s => s.replace(/[^\n]/g, " ");
  let out = "", i = 0, inStr = false;
  while (i < text.length) {
    const c = text[i], d = text[i + 1];
    if (inStr) {
      if (c === "\\") { out += c + (d === undefined ? "" : d); i += 2; continue; }
      if (c === '"') inStr = false;
      out += c; i++; continue;
    }
    if (c === '"') { inStr = true; out += c; i++; continue; }
    if (c === "/" && d === "/") { let j = i; while (j < text.length && text[j] !== "\n") j++; out += blank(text.slice(i, j)); i = j; continue; }
    if (c === "/" && d === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) throw new Error("a /* comment is never closed (line " + lineAt(text, i) + ")");
      out += blank(text.slice(i, end + 2)); i = end + 2; continue;
    }
    out += c; i++;
  }
  // Trailing commas: a "," followed only by spaces before "}" or "]".
  let res = "", s = false;
  for (let k = 0; k < out.length; k++) {
    const c = out[k];
    if (s) { res += c; if (c === "\\") { res += out[k + 1] || ""; k++; } else if (c === '"') s = false; continue; }
    if (c === '"') { s = true; res += c; continue; }
    if (c === ",") { let j = k + 1; while (j < out.length && /\s/.test(out[j])) j++; if (out[j] === "}" || out[j] === "]") { res += " "; continue; } }
    res += c;
  }
  try { return JSON.parse(res); }
  catch (e) {
    const m = /position (\d+)/.exec(e.message);
    throw new Error(e.message.replace(/\s*\(line \d+ column \d+\)/, "") + (m ? " (line " + lineAt(res, +m[1]) + ")" : ""));
  }
}
function lineAt(text, pos) { return text.slice(0, pos).split("\n").length; }

function readConfig(file) {
  let c;
  try { c = parseJsonc(fs.readFileSync(file, "utf8")); }
  catch (e) { stop(path.basename(file) + ": " + e.message); }
  const where = path.basename(file) + ": ";
  const bad = msg => stop(where + msg);
  if (!c || typeof c !== "object" || Array.isArray(c)) bad("the file must hold one { ... } object");
  const TOP = ["code", "handEdits", "story", "line", "human", "local", "known"];
  for (const k of Object.keys(c)) if (!TOP.includes(k)) bad("unknown setting \"" + k + "\" (a typo? the settings are: " + TOP.join(", ") + ")");
  const strings = (v, name, needOne) => {
    if (v === undefined && !needOne) return [];
    if (!Array.isArray(v) || v.some(x => typeof x !== "string" || !x.trim())) bad("\"" + name + "\" must be a list of text values, like [\"a\", \"b\"]");
    if (needOne && !v.length) bad("\"" + name + "\" needs at least one entry");
    return v;
  };
  const regex = (v, name, flags) => {
    try { return new RegExp(v, flags); } catch (e) { bad("\"" + name + "\" is not a valid pattern: " + e.message); }
  };
  const out = {};
  out.code = strings(c.code, "code", true);
  out.handEdits = strings(c.handEdits, "handEdits", false);
  out.story = strings(c.story, "story", false);

  const L = c.line;
  if (!L || typeof L !== "object" || Array.isArray(L)) bad("\"line\" must be an object: { \"prefix\": ..., \"files\": [...] }");
  for (const k of Object.keys(L)) if (!["prefix", "files", "autoAdd", "autoAddWhy", "afterApply"].includes(k)) bad("unknown setting \"line." + k + "\"");
  if (typeof L.prefix !== "string" || !L.prefix.trim()) bad("\"line.prefix\" must be the words before the model list, like \"AI Disclosure: game code by\"");
  for (const k of ["autoAdd", "autoAddWhy", "afterApply"]) if (L[k] !== undefined && typeof L[k] !== "string") bad("\"line." + k + "\" must be text");
  out.line = {
    prefix: L.prefix,
    files: strings(L.files, "line.files", true),
    autoAdd: L.autoAdd ? regex(L.autoAdd, "line.autoAdd", "") : null,
    autoAddWhy: L.autoAddWhy || "",
    afterApply: L.afterApply || ""
  };

  if (c.human !== undefined) {
    const H = c.human;
    if (!H || typeof H !== "object" || Array.isArray(H)) bad("\"human\" must be an object: { \"lines\": [...] }");
    for (const k of Object.keys(H)) if (!["lines", "splitIn"].includes(k)) bad("unknown setting \"human." + k + "\"");
    out.human = { lines: strings(H.lines, "human.lines", true), splitIn: strings(H.splitIn, "human.splitIn", false) };
    for (const f of out.human.splitIn) if (!out.line.files.includes(f)) bad("\"human.splitIn\" names " + f + ", which is not in \"line.files\"");
  } else out.human = null;

  if (c.local !== undefined && !Array.isArray(c.local)) bad("\"local\" must be a list of { \"role\", \"name\", \"subject\" } objects");
  const roles = new Set(), idOwner = {};
  out.local = (c.local || []).map(function (l, n) {
    const at = "\"local\" entry " + (n + 1) + ": ";
    if (!l || typeof l !== "object" || Array.isArray(l)) bad(at + "must be an object");
    for (const k of Object.keys(l)) if (!["role", "name", "subject", "askFirst", "ids"].includes(k)) bad(at + "unknown setting \"" + k + "\"");
    if (typeof l.role !== "string" || !/^[a-z0-9-]+$/.test(l.role)) bad(at + "\"role\" must be a short lowercase word, like \"builder\" (it becomes --with-<role>)");
    if (roles.has(l.role)) bad(at + "the role \"" + l.role + "\" is used twice");
    roles.add(l.role);
    if (typeof l.name !== "string" || !l.name.trim()) bad(at + "\"name\" must be the model's name as the line shows it");
    if (l.subject !== undefined && (typeof l.subject !== "string" || !l.subject)) bad(at + "\"subject\" must be a pattern for its commit subjects");
    if (l.askFirst !== undefined && typeof l.askFirst !== "boolean") bad(at + "\"askFirst\" must be true or false");
    if (l.ids !== undefined && (!Array.isArray(l.ids) || l.ids.some(x => typeof x !== "string" || !/^\S+$/.test(x)))) bad(at + "\"ids\" must be a list of ids with no spaces, like [\"1a2b3c4d5e6f\"] (the ID column of `ollama list`)");
    const ids = (l.ids || []).map(x => x.toLowerCase());
    for (const id of ids) {
      if (idOwner[id]) bad(at + "the id " + id + " is already in the entry \"" + idOwner[id] + "\"");
      idOwner[id] = l.role;
    }
    if (l.subject === undefined && !ids.length) bad(at + "needs a \"subject\" pattern, \"ids\", or both");
    return { role: l.role, name: l.name, askFirst: !!l.askFirst, re: l.subject === undefined ? null : regex(l.subject, "local[" + (n + 1) + "].subject", "i"), ids: ids };
  });

  if (c.known !== undefined && (!c.known || typeof c.known !== "object" || Array.isArray(c.known))) bad("\"known\" must be an object: { \"<short hash>\": \"<reason>\" }");
  out.known = c.known || {};
  for (const [h, why] of Object.entries(out.known)) {
    if (!/^[0-9a-f]{4,40}$/i.test(h)) bad("\"known\": \"" + h + "\" is not a commit hash");
    if (typeof why !== "string" || !why.trim()) bad("\"known\": " + h + " needs a reason (the author's say-so)");
  }
  return out;
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function splitList(s) { return s.replace(/\s+and\s+/, ", ").split(/\s*,\s*/).map(x => x.trim()).filter(Boolean); }
function joinList(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }

// One commit's trailers, as git prints them with the log format in main():
// "Key: value" items joined by \x1d. RETURNS [{key, value}] in order - the
// key as written (any case), the value trimmed.
function parseTrailerItems(raw) {
  return raw.split("\x1d").map(function (item) {
    const i = item.indexOf(":");
    return i < 0 ? null : { key: item.slice(0, i).trim(), value: item.slice(i + 1).trim() };
  }).filter(t => t && t.key);
}

// The local builder's blocks mark themselves done here (run-phases.js checks
// that each block still ends with its PHASE_OK line).
const PHASE_OK = {};

// ==== PHASE 21 START ====
// Stamps and name normalization: reads every stamp a tool leaves, not only
// Co-Authored-By.

// stampsOf(trailers) RETURNS { coAuthors, localModel, committedBy, sessions }
function stampsOf(trailers) {
  const coAuthors = [], sessions = [];
  let localModel = "", committedBy = "";
  for (const t of trailers) {
    const k = t.key.toLowerCase();
    if (k === "co-authored-by") {
      const name = t.value.replace(/<[^>]*>/, "").trim().replace(/\s+/g, " ");
      if (name !== "" && !coAuthors.includes(name)) coAuthors.push(name);
    } else if (k === "local-model" && localModel === "") {
      localModel = t.value.trim().replace(/\s+/g, " ");
    } else if (k === "committed-by" && committedBy === "") {
      committedBy = t.value.trim();
    } else if (k === "claude-session" && t.value.trim() !== "") {
      sessions.push(t.value.trim());
    }
  }
  return { coAuthors: coAuthors, localModel: localModel, committedBy: committedBy, sessions: sessions };
}

// normalName(name, known) RETURNS the name to credit, spelled as in known
function normalName(name, known) {
  const n = name.trim().replace(/\s+/g, " ");
  for (const k of known) { if (k.toLowerCase() === n.toLowerCase()) return k; }
  return n;
}

PHASE_OK[21] = true;
// ==== PHASE 21 END ====

// ==== PHASE 22 START ====
// Who gets the credit for one commit.

// creditOf(subject, stamps, local, known) RETURNS { models, local, unknownLocal }
function creditOf(subject, stamps, local, known) {
  if (stamps.localModel !== "") {
    const words = stamps.localModel.toLowerCase().split(" ");
    const e = local.find(l => words.some(w => l.ids.includes(w)));
    if (e) return { models: [e.name], local: e.role, unknownLocal: "" };
    return { models: [], local: "", unknownLocal: stamps.localModel };
  }
  const e2 = local.find(l => l.re !== null && l.re.test(subject));
  if (e2) return { models: [e2.name], local: e2.role, unknownLocal: "" };
  const models = [];
  for (const name of stamps.coAuthors) {
    const n = normalName(name, known);
    if (!models.includes(n)) models.push(n);
  }
  return { models: models, local: "", unknownLocal: "" };
}

PHASE_OK[22] = true;
// ==== PHASE 22 END ====

function main(args) {
  // -------------------------------------------------------------- options
  let apply = false, configArg = null;
  const withRoles = new Set();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--apply") apply = true;
    else if (a === "--config") { configArg = args[++i]; if (!configArg) stop("--config needs a file name"); }
    else if (a.startsWith("--config=")) configArg = a.slice("--config=".length);
    else if (/^--with-[a-z0-9-]+$/.test(a)) withRoles.add(a.slice("--with-".length));
    else if (a === "--help" || a === "-h") {
      console.log("node disclosure.js [--apply [--with-<role>]] [--config <file>]  (see the top of disclosure.js)");
      process.exit(0);
    } else stop("unknown option " + a + " (try --help)");
  }

  let root;
  try {
    root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) { stop("not inside a git repository - run it from the project's folder"); }

  // ------------------------------------------------------------- settings
  const configPath = configArg ? path.resolve(configArg) : path.join(root, "disclosure.jsonc");
  if (!fs.existsSync(configPath)) stop("no settings file at " + configPath + (configArg ? "" : " - make one, or pass --config <file>"));
  const cfg = readConfig(configPath);

  const CODE = cfg.code, STORY = cfg.story, HAND = cfg.handEdits;
  const FILES = cfg.line.files, PREFIX = cfg.line.prefix;
  const KNOWN = cfg.known, LOCAL = cfg.local;
  const ASK = LOCAL.filter(l => l.askFirst);
  for (const r of withRoles) if (!ASK.some(l => l.role === r)) stop("--with-" + r + ": no ask-first local model with the role \"" + r + "\" in the settings");
  // The list ends at the first "." right after a version number ("Qwen 3.6.").
  const LINE = new RegExp(escapeRe(PREFIX) + " ([^\"\\n]*?\\d+\\.\\d+)\\.");
  const HUMAN_LINES = cfg.human ? cfg.human.lines : null;
  const HUMAN = HUMAN_LINES ? HUMAN_LINES.join(" ") : "";
  const SPLIT = cfg.human ? cfg.human.splitIn : [];
  const isAuto = m => !!cfg.line.autoAdd && cfg.line.autoAdd.test(m);

  function git(a) { return execFileSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 }); }

  // 1. The line as it is in each file.
  const current = {}, human = {};
  for (const f of FILES) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) { current[f] = null; human[f] = false; continue; }
    const s = fs.readFileSync(p, "utf8");
    const m = s.match(LINE);
    current[f] = m ? splitList(m[1]) : null;
    if (!HUMAN_LINES) human[f] = true;
    else human[f] = SPLIT.includes(f) ? HUMAN_LINES.every(l => s.includes(l)) : s.includes(HUMAN);
  }
  const base = current[FILES[0]] || current[FILES.find(f => current[f])] || [];
  // Names as the line and the settings spell them (normalName uses these).
  const knownNames = base.concat(LOCAL.map(l => l.name).filter(n => !base.includes(n)));

  // 2. Commits with their files and stamps:
  //    [{hash, subject, files, stamps, models, local, unknownLocal}].
  const SEP = "\x1f", REC = "\x1e";
  function commits(paths) {
    const out = git(["log", "--no-merges", "--name-only", "--format=" + REC + "%h" + SEP + "%s" + SEP + "%(trailers:only,unfold,separator=%x1d)", "--", ...paths]);
    return out.split(REC).map(r => r.trim()).filter(Boolean).map(function (r) {
      const lines = r.split("\n");
      const [hash, subject, trailers] = lines[0].split(SEP);
      const files = lines.slice(1).map(x => x.trim()).filter(Boolean);
      const stamps = stampsOf(parseTrailerItems(trailers || ""));
      const credit = creditOf(subject, stamps, LOCAL, knownNames);
      return { hash, subject, files, stamps, models: credit.models, local: credit.local, unknownLocal: credit.unknownLocal };
    });
  }

  const found = new Map();      // model -> [commits]
  const handEdits = [], codeEdits = [], known = [], unknownLocal = [];
  const askSeen = {};           // role -> [commits]
  const sessions = new Set(), scripts = new Map();
  for (const c of commits(CODE)) {
    for (const s of c.stamps.sessions) sessions.add(s);
    if (c.stamps.committedBy) scripts.set(c.stamps.committedBy, (scripts.get(c.stamps.committedBy) || 0) + 1);
    if (c.unknownLocal) { unknownLocal.push(c); continue; }
    if (ASK.some(l => l.role === c.local)) (askSeen[c.local] = askSeen[c.local] || []).push(c.hash);
    if (!c.models.length) {
      const touchesCode = c.files.some(f => !HAND.includes(f));
      if (KNOWN[c.hash]) known.push(c);
      else if (touchesCode) codeEdits.push(c);
      else handEdits.push(c);
      continue;
    }
    for (const m of c.models) { if (!found.has(m)) found.set(m, []); found.get(m).push(c.hash); }
  }
  // With no story paths, git log would read the whole history - so skip it.
  const story = STORY.length ? commits(STORY) : null;

  // 3. Compare.
  const lists = FILES.filter(f => current[f]).map(f => joinList(current[f]));
  const agree = lists.length === FILES.length && lists.every(l => l === lists[0]);
  const humanOk = FILES.every(f => human[f]);
  const missing = [...found.keys()].filter(m => !base.includes(m));
  const askNames = ASK.map(l => l.name);
  const missingAuto = missing.filter(isAuto);
  const missingAsk = ASK.filter(l => missing.includes(l.name) && !isAuto(l.name));
  const missingOther = missing.filter(m => !isAuto(m) && !askNames.includes(m));

  // 4. Report.
  const shallow = git(["rev-parse", "--is-shallow-repository"]).trim() === "true";
  const n = FILES.length;
  const pad = Math.max(18, ...FILES.map(f => f.length + 1));
  const rel = path.relative(root, configPath);
  console.log("Config: " + (rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel.split(path.sep).join("/") : configPath));
  console.log("The line now: " + PREFIX + " " + (base.length ? joinList(base) : "(not found)"));
  for (const f of FILES) console.log("  " + f.padEnd(pad) + (current[f] ? joinList(current[f]) : "NOT FOUND (the model list must be on one line)") + (human[f] ? "" : "   <- the human sentence is missing or changed"));
  console.log("Models in the code's history" + (shallow ? " (shallow clone: older commits not seen)" : "") + ":");
  for (const [m, hs] of found) console.log("  " + m.padEnd(18) + hs.length + " commit(s), newest " + hs[0] + (base.includes(m) ? "" : "   <- NOT IN THE LINE"));
  if (sessions.size) console.log("Claude sessions behind the code: " + sessions.size + " (counted, never shown)");
  if (scripts.size) console.log("Commits made by a script (Committed-By:): " + [...scripts].map(([s, k]) => s + " " + k).join(", "));
  if (handEdits.length) {
    console.log("Hand edits to " + HAND.join(", ") + " (no model named - the author's own edits):");
    handEdits.forEach(c => console.log("  " + c.hash + " " + c.subject));
  }
  if (known.length) {
    console.log("Code commits with no model named, already explained (known):");
    known.forEach(c => console.log("  " + c.hash + " " + c.subject + " - " + KNOWN[c.hash]));
  }
  if (codeEdits.length) {
    console.log("CODE COMMITS WITH NO MODEL NAMED" + (HAND.length ? " outside " + HAND.join(", ") : "") + " - the line says this code is AI-written. Ask the author: add the missing trailer's model, or change the line (or explain it in the settings' \"known\"):");
    codeEdits.forEach(c => console.log("  " + c.hash + " " + c.subject + "  (" + c.files.join(", ") + ")"));
  }
  if (unknownLocal.length) {
    console.log("LOCAL MODELS THE SETTINGS DON'T NAME (a Local-Model: trailer) - ask the author, then add the id to the \"ids\" of the \"local\" entry that is this model:");
    unknownLocal.forEach(c => console.log("  " + c.hash + " " + c.subject + "  (Local-Model: " + c.unknownLocal + ")"));
  }
  if (story) {
    const withModel = story.filter(c => c.models.length).length;
    console.log("The story (" + STORY.join(", ") + "): " + withModel + " commit(s) with a model named, " + (story.length - withModel) + " with no model named (the author's)");
  }
  for (const l of missingAsk) console.log(l.role.toUpperCase() + " commits found (" + (askSeen[l.role] || []).join(", ") + "): add " + l.name + " only when the author says so (--with-" + l.role + ").");
  if (missingOther.length) console.log("NOT ADDED BY --apply: " + missingOther.join(", ") + " - the author decides: add a name to the line by hand (or, for a model the settings don't know, to the settings' \"local\" list first).");

  let ok = agree && humanOk && !codeEdits.length && !unknownLocal.length && !missingAuto.length && !missingAsk.length && !missingOther.length;
  if (apply) {
    const add = missingAuto.concat(missingAsk.filter(l => withRoles.has(l.role)).map(l => l.name));
    if (!agree || add.length) {
      // Auto-add models first, then the others, each kept in the order met.
      const all = base.concat(add.filter(m => !base.includes(m)));
      const next = joinList(all.filter(isAuto).concat(all.filter(m => !isAuto(m))));
      for (const f of FILES) {
        const p = path.join(root, f);
        if (!fs.existsSync(p)) continue;
        const s = fs.readFileSync(p, "utf8");
        if (!LINE.test(s)) { console.log("  cannot update " + f + ": the line was not found on one line"); continue; }
        fs.writeFileSync(p, s.replace(LINE, () => PREFIX + " " + next + "."));
      }
      console.log("UPDATED the line in " + n + " file(s) to: " + PREFIX + " " + next + ".");
      if (cfg.line.afterApply) console.log(cfg.line.afterApply);
      ok = humanOk && !codeEdits.length && !unknownLocal.length && !missingAsk.some(l => !withRoles.has(l.role)) && !missingOther.length;
    } else console.log("Nothing to update.");
    if (!humanOk) console.log("NOT FIXED BY --apply: the human sentence must read, in every file: " + HUMAN);
  } else if (!ok) {
    if (missingAuto.length) console.log("MISSING: " + missingAuto.join(", ") + " - run with --apply" + (cfg.line.autoAddWhy ? " (" + cfg.line.autoAddWhy + ")" : "") + ".");
    if (!agree) console.log("The " + n + " files disagree - run with --apply to make them match " + FILES[0] + ".");
    if (!humanOk) console.log("The human sentence must read, in every file: " + HUMAN);
  } else console.log("OK: the line names every model that wrote code, and the " + n + " files agree.");
  process.exit(ok ? 0 : 1);
}

// Run as a command; or, when a test require()s this file, hand it the parts.
if (require.main === module) main(process.argv.slice(2));
else module.exports = { parseJsonc, parseTrailerItems, stampsOf, normalName, creditOf, splitList, joinList, PHASE_OK };
