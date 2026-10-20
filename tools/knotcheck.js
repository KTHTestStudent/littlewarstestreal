// ===== knotcheck.js - Knotwork 3.8-alpha (MIT licence) =====
// Checks story.js against the game BEFORE you play: versions, knots the game
// starts, hooks (EXTERNAL) and variables the game expects, tags, and a story bot
// that walks every choice of every knot to its end.
// With no config.js it checks the story alone, played from its first line, as
// Inky plays it.
// Use it:  double-click tools/knotcheck.html   (no install needed)
//     or:  node tools/knotcheck.js [game folder]
// It finds the files in ink/ (single-file games: ink/config.js, ink/ink.js,
// ink/story.js) or in js/ (multi-file games: js/data.js, js/ink.js, js/story.js).
// Nothing here is loaded by the game.
(function (root) {
  const KIT_TAGS = ["speaker", "portrait", "end"];
  // Tags Inky's "Export for web" player acts on. The kit doesn't; the game can (dlgTag).
  const WEB_TAGS = ["title", "author", "theme", "clear", "restart", "image", "audio", "audioloop", "background", "class", "link", "linkopen"];
  const LONG_CHOICE = 80; // letters: longer choices may be cut short ("...") in a canvas box
  const MAX_PATHS = 400;
  const MAX_STEPS = 400;
  const MAX_DEPTH = 30; // choices in a row, at most (a backstop for loops)
  const MAX_NODES = 4000; // choice points visited per knot, at most
  const RANDOM_GAMES = 1000; // random play-throughs of a knot too big to walk fully
  const RANDOM_CHOICES = 1000; // choices per random play-through, at most
  const MAX_CARRY = 12; // other knots' endings each knot is played again after, at most
  const LOOP_MS = 500; // one line taking longer than this: the story goes round in a loop
  const START = ""; // stands for "the story's first line" (no knot)

  function scan(json) {
    const r = { ext: new Set(), fcalls: new Set(), vars: [], tags: [], rnd: 0, shuffles: 0, seed: 0, placeholders: 0 };
    function walk(v, parentArr) {
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          if (v[i] === "#") {
            let t = "";
            let j = i + 1;
            let dyn = false;
            while (j < v.length && v[j] !== "/#") {
              if (typeof v[j] === "string" && v[j].charAt(0) === "^") t += v[j].slice(1);
              else dyn = true;
              j++;
            }
            if (!dyn) r.tags.push(t.trim());
          }
          if (v[i] === "rnd") r.rnd++;
          if (v[i] === "seq") r.shuffles++;
          if (v[i] === "srnd") r.seed++;
          if (typeof v[i] === "string" && v[i].charAt(0) === "^" && v[i].indexOf("PLACEHOLDER") >= 0) r.placeholders++;
          walk(v[i], v);
        }
      } else if (v && typeof v === "object") {
        if (v["x()"]) r.ext.add(v["x()"]);
        if (v["f()"]) r.fcalls.add(v["f()"]);
        if (v["VAR="] && v.re !== true) r.vars.push(v["VAR="]);
        if (typeof v["#"] === "string") r.tags.push(v["#"].trim());
        for (const k in v) walk(v[k], null);
      }
    }
    walk(json, null);
    return r;
  }

  // Knots that are only ever entered as tunnels (-> knot ->), never by a plain
  // divert from another knot. They end in ->-> and need someone to return to,
  // so the story bot doesn't start them on their own.
  function tunnelOnly(json, knots) {
    const top = json.root && json.root[json.root.length - 1];
    if (!top || typeof top !== "object") return [];
    const viaTunnel = new Set();
    const viaDivert = new Set();
    function walk(v, from) {
      if (Array.isArray(v)) {
        for (const x of v) walk(x, from);
      } else if (v && typeof v === "object") {
        const t = v["->t->"];
        const d = v["->"];
        if (typeof t === "string" && !v["var"] && t.charAt(0) !== ".") {
          const k = t.split(".")[0];
          if (k !== from) viaTunnel.add(k);
        }
        if (typeof d === "string" && !v["var"] && d.charAt(0) !== ".") {
          const k = d.split(".")[0];
          if (k !== from) viaDivert.add(k);
        }
        for (const k in v) walk(v[k], from);
      }
    }
    for (let i = 0; i < json.root.length - 1; i++) walk(json.root[i], START);
    for (const k in top) if (k !== "#f" && k !== "#n") walk(top[k], k);
    return knots.filter(function (k) { return viaTunnel.has(k) && !viaDivert.has(k); });
  }

  function knotcheck(env) {
    const out = [];
    const fail = function (m) { out.push(["FAIL", m]); };
    const warn = function (m) { out.push(["WARN", m]); };
    const ok = function (m) { out.push(["OK", m]); };
    const conf = env.conf || {};
    const hooks = conf.DLG_HOOKS || [];
    const asks = conf.DLG_ASKS || [];
    const gameKnots = conf.DLG_KNOTS || [];
    const gameVars = conf.DLG_VARS || [];
    const extraTags = (conf.DLG_TAGS || []).map(function (t) { return String(t).toLowerCase(); });
    const names = conf.DLG_NAMES || {};
    const maxCh = conf.MAXCH || 4;
    // No hooks and no knots: there is no game to check against, so check the
    // story alone, from its first line.
    const storyOnly = !hooks.length && !gameKnots.length;
    // the one-outcome rule: {knot name prefix: hook}, e.g. {chapter_: "chapterDone"}
    const outcomes = conf.DLG_OUTCOMES || null;
    const outcomeHooks = outcomes ? Object.keys(outcomes).map(function (k) { return outcomes[k]; }) : [];
    const ruleFor = function (knot) {
      for (const prefix in outcomes || {}) if (knot && knot.indexOf(prefix) === 0) return { prefix: prefix, hook: outcomes[prefix] };
      return null;
    };
    const label = function (knot) { return knot === START ? "the story's start" : "knot " + knot; };
    const short = function (knot) { return knot === START ? "the story's start" : knot; };
    const spr = conf.SPR || null;
    const files = env.files || { ink: "ink.js", story: "story.js", conf: "the game's settings" };
    const inkjs = env.inkjs;
    if (!inkjs || !inkjs.Story) {
      fail(files.ink + " did not load.");
      return out;
    }
    let content = env.storyContent;
    if (content === undefined || content === null) {
      fail(files.story + " did not load (no storyContent). In Inky: File > Export story.js only... and save it as " + files.story + ".");
      return out;
    }
    if (typeof content === "string") content = JSON.parse(content);
    const have = inkjs.Story.inkVersionCurrent;
    const v = content.inkVersion;
    if (v > have) fail("story.js is ink format " + v + " but " + files.ink + " reads up to " + have + " - export both from the same Inky / inkjs.");
    else if (v < 18) fail("story.js is ink format " + v + " - too old for " + files.ink + " (needs 18-" + have + ").");
    else ok("versions: story.js ink format " + v + ", " + files.ink + " reads up to " + have + ".");
    let story;
    try {
      story = new inkjs.Story(content);
    } catch (e) {
      fail("the story would not load: " + e.message);
      return out;
    }
    const sc = scan(content);
    // The places whose visit counts the story reads ({topic_who}, {dialogue_guide == 1}):
    // a choice list seen again after one of them was visited is not a repeat.
    const readCounts = [];
    (function findReads(c) {
      const kids = c.content || [];
      for (const o of kids) {
        if (o && o.pathForCount) {
          try {
            const t = o.containerForCount;
            if (t && readCounts.indexOf(t.path.toString()) < 0) readCounts.push(t.path.toString());
          } catch (e) {
            // a count the runtime can't place - leave it out
          }
        }
        if (o && o.content) findReads(o);
      }
      if (c.namedContent) c.namedContent.forEach(function (n) { if (kids.indexOf(n) < 0) findReads(n); });
    })(story.mainContentContainer);
    const named = [];
    story.mainContentContainer.namedContent.forEach(function (c, k) { named.push(k); });
    const topC = content.root[content.root.length - 1] || {}; // the knots, by name
    // An ink function is never played as a knot: one the story calls, a hook's
    // stand-in (named like a hook, called or not), or one with a ~ return in
    // it (ink allows ~ return only in functions) - so a function nobody calls
    // yet isn't one.
    const hasReturn = function (v) {
      if (Array.isArray(v)) return v.some(hasReturn);
      if (v && typeof v === "object") return Object.keys(v).some(function (k) { return hasReturn(v[k]); });
      return v === "~ret";
    };
    const funcs = named.filter(function (k) { return sc.fcalls.has(k) || sc.ext.has(k) || hooks.indexOf(k) >= 0 || hasReturn(topC[k]); });
    const knots = named.filter(function (k) { return k !== "global decl" && funcs.indexOf(k) < 0; });
    ok("knots: " + knots.join(", "));
    if (storyOnly) ok("no game settings found (no hooks, no knots), so this checks the story alone, played from its first line as Inky plays it.");
    for (const k of gameKnots) {
      if (knots.indexOf(k) < 0) fail("the game starts knot '" + k + "' but the story has no such knot (knots in " + files.conf + ").");
    }
    if (gameKnots.length) ok("the game starts: " + gameKnots.join(", "));
    const tunnels = tunnelOnly(content, knots).filter(function (k) { return gameKnots.indexOf(k) < 0 && !ruleFor(k); });
    if (tunnels.length) ok("tunnels (only entered with -> name ->, so not played on their own): " + tunnels.join(", ") + ".");
    const ext = Array.from(sc.ext);
    for (const e of ext) {
      if (hooks.indexOf(e) < 0) fail("the story calls " + e + "() but the game has no such hook (hooks in " + files.conf + ": " + hooks.join(", ") + ").");
      else if (named.indexOf(e) < 0) warn(e + "() has no ink stand-in function, so Inky's preview can't run it (see the end of the .ink file).");
    }
    ok("hooks the story calls: " + (ext.length ? ext.join(", ") : "none") + ". Game hooks: " + hooks.join(", ") + (asks.length ? " (asking: " + asks.join(", ") + ")" : "") + ".");
    for (const a of asks) if (hooks.indexOf(a) < 0) fail(a + " is in asks but not in hooks.");
    // A hook the story calls as its own ink function: its EXTERNAL line is
    // missing, so ink runs the stand-in and the game never hears the call.
    for (const h of hooks) if (sc.fcalls.has(h) && !sc.ext.has(h)) fail("the story calls " + h + "() as an ink function: the line EXTERNAL " + h + "(...) is missing at the top of the story, so the game never gets these calls - the stand-in answers instead.");
    for (const g of gameVars) {
      if (sc.vars.indexOf(g) < 0) fail("the game sets VAR " + g + " but the story doesn't declare it - add: VAR " + g + " = 0");
    }
    // Game VARs are the game's: set before every start, never changed by the
    // story (a preview knot may set them, to play the game's part in Inky).
    const writes = function (v, out) {
      if (Array.isArray(v)) {
        for (const x of v) writes(x, out);
      } else if (v && typeof v === "object") {
        if (typeof v["VAR="] === "string" && v.re === true) out.add(v["VAR="]);
        for (const k in v) writes(v[k], out);
      }
      return out;
    };
    const writers = {};
    for (const k of named) {
      if (k === "global decl" || k.indexOf("preview") === 0) continue;
      writes(topC[k], new Set()).forEach(function (g) { if (gameVars.indexOf(g) >= 0) (writers[g] = writers[g] || []).push(k); });
    }
    for (const g in writers) fail("the story changes the game VAR " + g + " (in " + writers[g].join(", ") + ") - the game sets it before every knot, and nothing changes it during one. Use a helper VAR of the story's own.");
    ok("variables: " + (sc.vars.length ? sc.vars.join(", ") : "none") + (gameVars.length ? " (the game sets " + gameVars.join(", ") + ")" : ""));
    if (sc.seed) warn("the story uses SEED_RANDOM - that overrides the kit's per-game seed.");
    if (sc.rnd || sc.shuffles) ok("randomness: " + sc.shuffles + " shuffle(s), " + sc.rnd + " RANDOM() - fine, the kit seeds it for every game.");
    if (sc.placeholders) warn(sc.placeholders + " PLACEHOLDER line" + (sc.placeholders > 1 ? "s" : "") + " left to write (search the .ink for PLACEHOLDER).");

    // ---- tags: one line per problem (an unknown tag once, however many values it has)
    const tagLines = new Map();
    const knownTags = "the kit knows speaker, portrait, end" + (extraTags.length ? "; the game adds " + extraTags.join(", ") : "");
    function checkTag(t, where) {
      const i = t.indexOf(":");
      const rawKey = (i >= 0 ? t.slice(0, i) : t).trim();
      const key = rawKey.toLowerCase();
      const val = (i >= 0 ? t.slice(i + 1) : "").trim().toLowerCase();
      const add = function (m) {
        if (!tagLines.has(m)) tagLines.set(m, { where: where });
        else if (!tagLines.get(m).where && where) tagLines.get(m).where = where;
      };
      if (KIT_TAGS.indexOf(key) < 0 && extraTags.indexOf(key) < 0) {
        const id = "unknown|" + key;
        if (!tagLines.has(id)) tagLines.set(id, { where: where, key: rawKey, values: [] });
        const u = tagLines.get(id);
        if (!u.where && where) u.where = where;
        if (u.values.indexOf(t) < 0) u.values.push(t);
      }
      if (key === "speaker" && val !== "none" && !names[val]) add("#speaker:" + val + " is not in the game's names (" + files.conf + ") - the box will show '" + val + "'");
      if (spr && (key === "speaker" || key === "portrait") && val !== "none" && val && !spr[val]) add("#" + key + ":" + val + " has no picture in the game's sprites");
    }
    function tagLine(m, t) {
      if (!t.values) return m + t.where;
      const web = WEB_TAGS.indexOf(t.key.toLowerCase()) >= 0 ? " - Inky's web player knows this tag; in the kit, the game handles it in dlgTag (see WRITING-IN-INK.txt, TAGS)" : "";
      if (t.values.length === 1) return "unknown tag #" + t.values[0] + " (" + knownTags + ")" + web + t.where;
      const eg = t.values.slice(0, 3).map(function (x) { return "#" + x; }).join(", ");
      return "unknown tag #" + t.key + ", " + t.values.length + " different values (" + eg + ", ...) (" + knownTags + ")" + web + t.where;
    }
    for (const t of sc.tags) checkTag(t, "");

    // ---- the story bot: every entry point, every choice, twice (hooks say "yes", then "no")
    const extraEnter = {};
    const longChoices = {}; // choice text -> knot
    let paths = 0;
    let lines = 0;
    let capped = [];
    let looped = [];
    let randomPlayed = [];
    const walkKnots = storyOnly ? [START] : knots.filter(function (k) { return k.indexOf("preview") !== 0 && tunnels.indexOf(k) < 0; });
    // Without hooks in the story, "no" plays exactly like "yes": play once.
    const modes = ext.length ? [1, 0] : [1];
    // ---- the one-outcome rule, checked at the end of every path
    let segCalls = []; // outcome hook calls since the last choice
    const outcomeProblems = new Map(); // one line per knot and kind of problem: the shortest path
    const pathProblems = new Map(); // the same for errors on the way
    const tooMany = new Map(); // knot -> {n, path}: more choices at once than the game shows

    // Keeps the shortest example of each problem, and counts the others.
    function keep(map, key, msg, len) {
      const old = map.get(key);
      if (!old) map.set(key, { msg: msg, len: len, more: 0 });
      else if (len < old.len) map.set(key, { msg: msg, len: len, more: old.more + 1 });
      else old.more++;
    }
    function where(knot, path, mode) {
      return label(knot) + (path ? " (" + path + ")" : "") + (mode ? "" : " [hooks say no/0]") + ": ";
    }
    function pathLen(path) {
      return path ? path.split(",").length : 0;
    }

    const outcomeValues = {}; // knot -> the outcome values seen
    for (const h of outcomeHooks) {
      if (hooks.indexOf(h) < 0) fail(h + " is in outcomes but not in hooks.");
      else if (asks.indexOf(h) >= 0) fail(h + " is in outcomes AND asks - an outcome hook changes the game, so it must not be in asks.");
    }
    // Under the one-outcome contract a hook either asks (asks) or sends an
    // outcome (outcomes). Any other hook changes the game in the middle of a
    // knot - a 1.0-era effect hook like giveTreats(15).
    if (outcomes) {
      for (const e of ext) {
        if (hooks.indexOf(e) >= 0 && asks.indexOf(e) < 0 && outcomeHooks.indexOf(e) < 0) warn(e + "() is neither an asking hook (asks) nor an outcome hook (outcomes) - under the one-outcome contract the story only asks the game, and changes it through outcomes. If " + e + "() only looks, list it in asks; if it changes the game, make that an outcome value.");
      }
    }
    for (const k of walkKnots) {
      if (outcomes && ruleFor(k) && gameKnots.indexOf(k) < 0) warn("knot " + k + " is a " + ruleFor(k).prefix + " knot but the game never starts it - add it to knots in " + files.conf + " and start it from the game (startTalk).");
    }
    for (const k of gameKnots) {
      if (outcomes && !ruleFor(k)) warn("knot " + k + " starts with none of " + Object.keys(outcomes).join(", ") + " - it sends the game no outcome.");
    }
    function checkOutcome(knot, path, mode, sent, len) {
      const at = where(knot, path, mode);
      const rule = ruleFor(knot);
      const add = function (m) {
        keep(outcomeProblems, knot + "|" + m.replace(/^[^:]*: /, "").replace(/\d+ times/, "N times"), m, len);
      };
      // An outcome sent from inside ANOTHER knot: the story went on into it.
      const stray = sent.filter(function (c) {
        const k = String(c.at || "").split(".")[0];
        return k && k !== knot && knots.indexOf(k) >= 0;
      })[0];
      if (stray) {
        const into = String(stray.at).split(".")[0];
        add(at + "went on into " + into + " and sent its outcome from there - a divert or a tunnel took the story out of " + knot + ". End " + knot + " in its own finish; the game starts " + into + " itself.");
        return;
      }
      if (!rule) {
        if (sent.length) add(at + "calls " + sent[0].hook + "() but its name starts with none of " + Object.keys(outcomes).join(", ") + ".");
        return;
      }
      const own = sent.filter(function (c) { return c.hook === rule.hook; });
      for (const c of sent) if (c.hook !== rule.hook) add(at + "calls " + c.hook + "() - a " + rule.prefix + " knot sends its outcome with " + rule.hook + "().");
      if (!own.length) add(at + "ends without calling " + rule.hook + "(\"" + knot + "\", outcome) - every path must end in the finish stitch.");
      else if (own.length > 1) add(at + "calls " + rule.hook + "() " + own.length + " times - send the outcome once, in the finish stitch.");
      else if (own[0].name !== knot) add(at + "calls " + rule.hook + "(\"" + own[0].name + "\", ...) - the first value must be this knot's name, \"" + knot + "\".");
      else {
        const vals = outcomeValues[knot] || (outcomeValues[knot] = []);
        const v = JSON.stringify(own[0].outcome);
        if (vals.indexOf(v) < 0) vals.push(v);
      }
    }
    // A fresh story with the game's hooks bound: they all answer "mode" (1 or 0).
    function newStory(mode, errs) {
      const s = new inkjs.Story(content);
      s.onError = function (m, t) { if (t !== 1) errs.push(m); };
      for (const h of hooks) {
        if (outcomeHooks.indexOf(h) >= 0) {
          s.BindExternalFunction(h, function (name, outcome) {
            // at: where in the story; before: the text ink had already put out on
            // the line being made (a line that runs on into the call, "+ [Leave]
            // Goodbye. -> finish", comes before it - see playOn)
            segCalls.push({ hook: h, name: name, outcome: outcome, at: s.state.currentPathString || "", before: s.state.currentText.trim() });
            return mode;
          });
        } else {
          s.BindExternalFunction(h, function () { return mode; }, asks.indexOf(h) >= 0);
        }
      }
      for (const e of ext) if (hooks.indexOf(e) < 0) s.BindExternalFunction(e, function () { return mode; });
      s.state.storySeed = 1;
      return s;
    }
    // Plays on until a choice or an end. Returns the problem (or "") and notes.
    // stuck: a loop with no line and no choice - ink's Continue() would never
    // come back from it (the game's tab freezes too), so each line gets
    // LOOP_MS, and a story that is stuck can't be played on.
    const loopKnots = new Set();
    // sentBefore: outcome hook calls on this path before this stretch (the
    // calls in it are in segCalls) - after one, no line and no choice may come.
    // A line counts by where it stands in the story, not by which Continue()
    // brings it: text before a divert runs on into the target, so in
    // "+ [Leave] Goodbye. -> finish" ink calls finish's hook first and then
    // returns "Goodbye." - a line before the outcome (dialogue.js holds the
    // outcome until the player moves on from it).
    function playOn(s, knot, errs, sentBefore) {
      let steps = 0;
      let problem = "";
      let lastText = "";
      let emptyAfter = false;
      let stuck = false;
      let lineAfterSend = false;
      try {
        while (s.canContinue && steps < MAX_STEPS) {
          const callsBefore = segCalls.length;
          s.ContinueAsync(LOOP_MS);
          if (!s.asyncContinueComplete) {
            stuck = true;
            loopKnots.add(knot);
            problem = "the story goes round for " + LOOP_MS / 1000 + " s with no line and no choice - a divert that comes back to itself?";
            break;
          }
          const t = s.currentText.trim();
          // A line after the outcome: an outcome sent before this Continue, or
          // one sent in it with text still to come. All the line's text put out
          // before the call ("Goodbye." above) makes it the line before.
          const after = sentBefore || callsBefore || segCalls.slice(callsBefore).some(function (c) { return c.before !== t; });
          if (t && after) lineAfterSend = true;
          steps++;
          for (const tag of s.currentTags) checkTag(tag, knot === START ? "" : " (in " + knot + ")");
          if (t) {
            lines++;
            lastText = t;
            emptyAfter = false;
          } else if (lastText) {
            emptyAfter = true;
          }
        }
      } catch (e) {
        problem = e.message;
      }
      if (!problem && errs.length) problem = errs.splice(0).join("; ");
      if (!problem && steps >= MAX_STEPS) problem = "more than " + MAX_STEPS + " lines without a choice or an end - a loop?";
      // The outcome is a content-type knot's LAST act: the game may act on it at once.
      if (!problem && outcomes && ruleFor(knot) && (sentBefore || segCalls.length) && (lineAfterSend || s.currentChoices.length)) {
        problem = "sends its outcome, then goes on with " + (s.currentChoices.length ? "choices" : "a line") + " - the outcome is the knot's last act, at the end of finish.";
      }
      const cs = s.currentChoices;
      if (!problem) {
        for (const c of cs) if (!c.text.trim()) problem = "a choice with no text.";
      }
      for (const c of cs) {
        const t = c.text.trim();
        if (t.length > LONG_CHOICE && !(t in longChoices)) longChoices[t] = knot;
      }
      // Name the spot: the last line shown before the problem.
      if (problem && lastText) problem = "after \"" + (lastText.length > 50 ? lastText.slice(0, 47) + "..." : lastText) + "\" - " + problem;
      return { problem: problem, lastText: lastText, emptyAfter: emptyAfter, stuck: stuck };
    }
    function noteTooMany(knot, n, path) {
      const old = tooMany.get(knot);
      if (!old || n > old.n || (n === old.n && pathLen(path) < pathLen(old.path))) tooMany.set(knot, { n: n, path: path });
    }

    // The helper VARs (the story's own, not the game's) that each path leaves
    // behind when it ends: a later knot can read them (ch1_care in chapter_2),
    // so after the walk every knot is played again from those values.
    const helperVars = sc.vars.filter(function (v) { return gameVars.indexOf(v) < 0; });
    const endings = []; // {vars, from}, one per different set of values
    const endingKeys = new Set();
    function noteEnding(s, knot, p) {
      const vars = {};
      for (const v of helperVars) {
        const x = s.variablesState[v];
        if (x === null || typeof x !== "object") vars[v] = x; // LIST values stay as they start
      }
      const key = JSON.stringify(vars);
      if (endingKeys.has(key)) return;
      endingKeys.add(key);
      endings.push({ vars: vars, from: short(knot) + (p ? " (" + p + ")" : "") });
    }

    // Walks every path of one knot, with every hook answering "mode" (1 or 0).
    // carry: null, or {vars, from} - helper VARs to set before the knot starts.
    // Returns true if the knot has too many paths to walk them all.
    function walk(knot, mode, carry) {
      let big = false;
      const errs = [];
      const s = newStory(mode, errs);
      if (carry) for (const v in carry.vars) s.variablesState[v] = carry.vars[v];
      let first = true;
      const stack = [];
      let n = 0;
      let nodes = 0;
      const seen = new Set(); // choice lists already explored (with the same variables)
      while (first || stack.length) {
        if (n >= MAX_PATHS || nodes >= MAX_NODES) {
          if (capped.indexOf(short(knot)) < 0) capped.push(short(knot));
          big = true;
          break;
        }
        nodes++;
        let path;
        let sentBefore = [];
        segCalls = [];
        if (first) {
          if (knot !== START) s.ChoosePathString(knot);
          path = "";
          first = false;
        } else {
          const top = stack.pop();
          if (top.depth > MAX_DEPTH) {
            if (looped.indexOf(short(knot)) < 0) looped.push(short(knot));
            big = true;
            continue;
          }
          s.state.LoadJson(top.state);
          s.ChooseChoiceIndex(top.choice);
          path = top.path;
          sentBefore = top.sent;
        }
        const r = playOn(s, knot, errs, sentBefore.length);
        const cs = s.currentChoices;
        const p = (path ? "choices " + path : "") + (carry ? (path ? ", " : "") + "after " + carry.from : "");
        const len = (carry ? 2000 : 0) + pathLen(path); // problems found on the first walk are shown first
        if (r.problem) {
          keep(pathProblems, knot + "|" + r.problem, where(knot, p, mode) + r.problem, len);
          if (r.stuck) break; // fix the loop first; this story can't be played on
          continue;
        }
        if (cs.length > maxCh) noteTooMany(knot, cs.length, p);
        const sent = sentBefore.concat(segCalls);
        if (cs.length === 0) {
          if (outcomes) checkOutcome(knot, p, mode, sent, len);
          if (!carry) noteEnding(s, knot, p);
          paths++;
          n++;
          continue;
        }
        if (r.emptyAfter && !(r.lastText in extraEnter)) extraEnter[r.lastText] = knot;
        const st = s.state.toJson();
        // A loop (like a hub) comes back to the same choices, at the same
        // place in the story, with the same variables: those were explored
        // already, so don't walk them again. The place matters - two pages
        // that each end with a [Next] choice are not a loop - and so do the
        // visit counts the story reads (0, 1, or more): after a topic was
        // asked, the same menu can lead somewhere new.
        const sj = JSON.parse(st);
        const visits = readCounts.map(function (rc) { return Math.min((sj.visitCounts || {})[rc] || 0, 2); }).join(",");
        const seenKey = cs.map(function (c) { return c.sourcePath + ">" + c.text; }).join("|") + JSON.stringify(sj.variablesState) + "#" + Math.min(sent.length, 2) + "@" + visits;
        if (seen.has(seenKey)) {
          if (looped.indexOf(short(knot)) < 0) looped.push(short(knot));
          paths++;
          n++;
          continue;
        }
        seen.add(seenKey);
        const depth = path ? path.split(",").length + 1 : 1;
        for (let i = cs.length - 1; i >= 0; i--) stack.push({ state: st, choice: i, depth: depth, sent: sent, path: (path ? path + "," : "") + (i + 1) });
      }
      return big;
    }

    for (const knot of walkKnots) {
      let big = false;
      for (const mode of modes) if (!loopKnots.has(knot) && walk(knot, mode, null)) big = true;
      // Too big to walk every path: play many whole games at random as well.
      if (big && !loopKnots.has(knot)) {
        randomPlayed.push(short(knot));
        let seed = 7;
        const rnd = function (k) {
          // Math.imul keeps all 32 bits: a plain * loses the low bits, and the
          // picks then repeat after about 10,500 choices
          seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
          return Math.floor((seed / 0x80000000) * k);
        };
        for (let g = 0; g < RANDOM_GAMES && !loopKnots.has(knot); g++) {
          const errs = [];
          const s = newStory(1, errs);
          s.state.storySeed = g + 1;
          segCalls = [];
          if (knot !== START) s.ChoosePathString(knot);
          const picked = [];
          for (let c = 0; c <= RANDOM_CHOICES; c++) {
            const r = playOn(s, knot, errs, 0); // segCalls holds every call of this game
            const cs = s.currentChoices;
            const p = picked.length ? "random play, after " + picked.slice(-3).join(" > ") : "";
            if (r.problem) {
              keep(pathProblems, knot + "|" + r.problem, where(knot, p, 1) + r.problem, 1000 + picked.length);
              break;
            }
            if (cs.length > maxCh) noteTooMany(knot, cs.length, p);
            if (cs.length === 0) {
              if (outcomes) checkOutcome(knot, p, 1, segCalls, 1000 + picked.length);
              noteEnding(s, knot, p);
              break;
            }
            if (c === RANDOM_CHOICES) break;
            const i = rnd(cs.length);
            const t = cs[i].text.trim();
            picked.push("\"" + (t.length > 30 ? t.slice(0, 27) + "..." : t) + "\"");
            s.ChooseChoiceIndex(i);
          }
        }
      }
    }

    // ---- every knot again, from the helper VARs that knots end with: the ones
    // it reads are set as an ending left them (at most MAX_CARRY different
    // sets per knot), so chapter_2's {ch1_care >= 2: ...} gets played. A knot
    // too big to walk was played at random instead, and isn't played again.
    const carried = [];
    if (!storyOnly && endings.length) {
      const fresh = new inkjs.Story(content);
      const reads = function (v, out) {
        if (Array.isArray(v)) {
          for (const x of v) reads(x, out);
        } else if (v && typeof v === "object") {
          if (typeof v["VAR?"] === "string") out.add(v["VAR?"]);
          for (const k in v) reads(v[k], out);
        }
        return out;
      };
      const shared = new Set(); // what its functions and tunnels might read for it
      for (const k of named) if (funcs.indexOf(k) >= 0 || tunnels.indexOf(k) >= 0) reads(topC[k], shared);
      for (const knot of walkKnots) {
        if (randomPlayed.indexOf(short(knot)) >= 0 || loopKnots.has(knot)) continue;
        const own = reads(topC[knot], new Set());
        const vars = helperVars.filter(function (v) {
          const x = fresh.variablesState[v];
          return (own.has(v) || shared.has(v)) && (x === null || typeof x !== "object");
        });
        if (!vars.length) continue;
        const tried = new Set([JSON.stringify(vars.map(function (v) { return fresh.variablesState[v]; }))]);
        let count = 0;
        for (const e of endings) {
          if (count >= MAX_CARRY) break;
          const key = JSON.stringify(vars.map(function (v) { return e.vars[v]; }));
          if (tried.has(key)) continue;
          tried.add(key);
          count++;
          const carry = { vars: {}, from: e.from };
          for (const v of vars) if (v in e.vars) carry.vars[v] = e.vars[v];
          for (const mode of modes) if (!loopKnots.has(knot)) walk(knot, mode, carry);
        }
        if (count) carried.push(short(knot) + " (" + count + ")");
      }
    }
    pathProblems.forEach(function (p) { fail(p.msg + (p.more ? " (and " + p.more + " more path" + (p.more > 1 ? "s" : "") + ")" : "")); });
    if (tooMany.size) {
      const list = [];
      tooMany.forEach(function (t, k) { list.push(label(k) + " has " + t.n + (t.path ? " (" + t.path + ")" : "")); });
      fail("more choices at once than the game shows (" + maxCh + ", maxChoices in " + files.conf + "): " + list.join("; ") + ". game.html can show up to 9 (set maxChoices), game-canvas.html 4.");
    }
    // ---- the same knot three times in one game (e.g. a visitor who comes back)
    const again = [];
    for (const knot of walkKnots) {
      if (knot === START || loopKnots.has(knot)) continue;
      const s = new inkjs.Story(content);
      const errs = [];
      s.onError = function (m, t) { if (t !== 1) errs.push(m); };
      for (const h of hooks) s.BindExternalFunction(h, function () { return 1; });
      for (const e of ext) if (hooks.indexOf(e) < 0) s.BindExternalFunction(e, function () { return 1; });
      s.state.storySeed = 1;
      for (let visit = 1; visit <= 3 && !errs.length; visit++) {
        try {
          s.ChoosePathString(knot);
          let steps = 0;
          for (let g = 0; g < 50 && steps < MAX_STEPS; g++) {
            while (s.canContinue && steps < MAX_STEPS) {
              s.ContinueAsync(LOOP_MS);
              if (!s.asyncContinueComplete) throw new Error("the story goes round in a loop");
              steps++;
            }
            if (!s.currentChoices.length) break;
            s.ChooseChoiceIndex(0);
          }
        } catch (e) {
          errs.push(e.message);
        }
        if (errs.length && visit > 1) again.push(knot + " (visit " + visit + ")"); // an error on the first play is already a FAIL
      }
    }
    for (const t in extraEnter) warn(label(extraEnter[t]) + ": after \"" + (t.length > 50 ? t.slice(0, 47) + "..." : t) + "\" the player must press ENTER once more before the choices show - a hook runs between that line and the choices. Move the ~ line above the text, or (if the hook only asks) list it in asks.");
    if (again.length) warn("these knots stop with an error when they play again in the same game - their * choices get used up; write + [..] if the game can start them more than once: " + again.join(", "));
    for (const t in longChoices) warn(label(longChoices[t]) + ": the choice \"" + t.slice(0, 40) + "...\" is " + t.length + " letters - a canvas box may cut it short with \"...\" (keep choices under " + LONG_CHOICE + "; the HTML box shows any length).");
    tagLines.forEach(function (t, m) { out.push(["WARN", tagLine(m, t)]); });
    if (capped.length) warn("stopped after " + MAX_PATHS + " paths in: " + capped.join(", ") + " (big knots - not an error).");
    if (randomPlayed.length) ok("too big to walk every path, so also played " + RANDOM_GAMES + " random whole games from: " + randomPlayed.join(", ") + ".");
    if (looped.length) ok("loops back to earlier choices (fine - each set of choices was played once): " + looped.join(", ") + ".");
    if (carried.length) ok("also played again from the helper VARs that knots end with (a later knot can read them): " + carried.join(", ") + ".");
    outcomeProblems.forEach(function (p) { fail(p.msg + (p.more ? " (and " + p.more + " more path" + (p.more > 1 ? "s" : "") + ")" : "")); });
    const expected = conf.VALUES || null;
    if (outcomes && expected) {
      for (const k of walkKnots) {
        if (!ruleFor(k)) continue;
        const listed = (expected[k] || []).map(function (x) { return JSON.stringify(x); });
        const seenV = outcomeValues[k] || [];
        if (!expected[k]) {
          warn("knot " + k + " has no outcomeValues in " + files.conf + " - list the values the game handles: " + seenV.join(", ") + ".");
          continue;
        }
        for (const x of seenV) if (listed.indexOf(x) < 0) fail("knot " + k + " can send the outcome " + x + ", but outcomeValues in " + files.conf + " lists only " + listed.join(" / ") + " - add it there and react to it in the game.");
        for (const x of listed) if (seenV.length && seenV.indexOf(x) < 0) warn("outcomeValues in " + files.conf + " lists " + x + " for knot " + k + ", but no path of the story sends it.");
      }
    }
    if (outcomes) {
      const list = walkKnots.filter(function (k) { return outcomeValues[k]; }).map(function (k) {
        return k + " -> " + ruleFor(k).hook + "(" + outcomeValues[k].join(" / ") + ")";
      });
      if (list.length) ok("outcomes the game can receive: " + list.join("; ") + ".");
    }
    const what = storyOnly ? "the story from its start" : walkKnots.length + " knots";
    ok("story bot: " + what + ", " + paths + " paths to an end, " + lines + " lines, " + (modes.length > 1 ? "each path played twice (hooks yes / no)." : "each path played once (the story calls no hooks)."));
    return out;
  }

  function report(out) {
    const f = out.filter(function (r) { return r[0] === "FAIL"; }).length;
    const w = out.filter(function (r) { return r[0] === "WARN"; }).length;
    const head = "KNOTCHECK: " + (f ? "FAIL - " + f + " problem" + (f > 1 ? "s" : "") : "PASS") + (w ? " (" + w + " warning" + (w > 1 ? "s" : "") + ")" : "");
    return [head].concat(out.map(function (r) { return r[0] + "  " + r[1]; })).join("\n");
  }

  // The game's settings from INK_CONFIG (2.0) or the DLG_* globals (1.0) - a DLG_ global wins.
  function readConf(get) {
    const c = get("INK_CONFIG") || {};
    const pick = function (dlg, key, dflt) {
      const v = get(dlg);
      if (v !== undefined) return v;
      return c[key] !== undefined ? c[key] : dflt;
    };
    return {
      DLG_HOOKS: pick("DLG_HOOKS", "hooks", []),
      DLG_ASKS: pick("DLG_ASKS", "asks", []),
      DLG_KNOTS: pick("DLG_KNOTS", "knots", []),
      DLG_VARS: pick("DLG_VARS", "vars", []),
      DLG_TAGS: pick("DLG_TAGS", "tags", []),
      DLG_NAMES: pick("DLG_NAMES", "names", {}),
      DLG_OUTCOMES: pick("DLG_OUTCOMES", "outcomes", null),
      MAXCH: Math.max(1, Math.min(9, Math.floor(Number(pick("DLG_MAXCH", "maxChoices", 4))) || 4)),
      VALUES: pick("DLG_VALUES", "outcomeValues", null),
      SPR: pick("SPR", "sprites", null)
    };
  }

  root.knotcheck = knotcheck;
  root.knotcheckConf = readConf;
  root.knotcheckReport = report;

  // node tools/knotcheck.js [folder]
  if (typeof module !== "undefined" && module.exports && typeof require !== "undefined" && require.main === module) {
    const fs = require("fs");
    const path = require("path");
    const vm = require("vm");
    const dir = process.argv[2] || ".";
    const ctx = vm.createContext({ console: console });
    const load = function (f) {
      const p = path.join(dir, f);
      if (!fs.existsSync(p)) return false;
      vm.runInContext(fs.readFileSync(p, "utf8"), ctx, { filename: f });
      return true;
    };
    const sub = fs.existsSync(path.join(dir, "ink", "story.js")) || fs.existsSync(path.join(dir, "ink", "config.js")) ? "ink" : "js";
    let inkjs = null;
    try {
      inkjs = require(path.resolve(dir, sub, "ink.js"));
    } catch (e) {
      inkjs = null;
    }
    const confFile = sub === "ink" ? "ink/config.js" : "js/data.js";
    const loadErrors = []; // in the report as FAILs, as the page shows them
    let confThere = false;
    for (const f of [confFile, sub + "/story.js"]) {
      try {
        if (load(f) && f === confFile) confThere = true;
      } catch (e) {
        loadErrors.push(f + ": " + e.message);
      }
    }
    const get = function (n) {
      return vm.runInContext("typeof " + n + " === 'undefined' ? undefined : " + n, ctx);
    };
    const conf = readConf(get);
    conf.storyContent = get("storyContent");
    const files = { ink: sub + "/ink.js", story: sub + "/story.js", conf: sub === "ink" ? "ink/config.js" : "js/data.js" };
    const out = knotcheck({ inkjs: inkjs, storyContent: conf.storyContent, conf: conf, files: files });
    if (confThere && get("INK_CONFIG") === undefined && get("DLG_HOOKS") === undefined && get("DLG_KNOTS") === undefined) {
      out.unshift(["FAIL", confFile + " defines no INK_CONFIG, so knotcheck checked the story alone - was it renamed?"]);
    }
    for (const m of loadErrors.reverse()) out.unshift(["FAIL", "a file did not load - " + m]);
    console.log(report(out));
    process.exitCode = out.some(function (r) { return r[0] === "FAIL"; }) ? 1 : 0;
  }
})(typeof window !== "undefined" ? window : globalThis);
