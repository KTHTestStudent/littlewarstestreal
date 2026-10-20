// ===== dialogue.js - Knotwork 3.8-alpha - finished, do not edit =====
// Branching conversations written in ink (inkle's Inky) for browser games.
// Copyright (c) 2026 Kenton Howard. MIT licence (see LICENSE.txt in the kit).
// Knows nothing about any one game.
// It needs, loaded before it is used:
//   ink.js     the inkjs runtime (global "inkjs")
//   story.js   "var storyContent = {...};" - Inky: File > Export story.js only
// The game describes itself in ONE of two ways (looked up when needed):
//   INK_CONFIG = {hooks, asks, knots, vars, tags, names, theme, sprites, palette,
//                 maxChoices}
//   or the 1.0 globals DLG_HOOKS, DLG_ASKS, DLG_KNOTS, DLG_VARS, DLG_TAGS,
//   DLG_NAMES, DLG_THEME and SPR + PAL (8x8 portraits). A DLG_ global wins.
//   asks = the hooks that only ASK (change nothing): ink may run them early,
//   so choices right after "~ temp x = hasItem(..)" show with the line before.
//   Every other hook sends an outcome. One that ink reaches while a line is
//   still going (the line runs on into it: "+ [Leave] Goodbye. -> finish")
//   waits until the player moves on from that line - see dlgBind.
// Optional game functions: dlgTag(tag), dlgEnded(knot), dlgPortrait(ctx, key, x, y, size),
// and for the Story and Game Viewer's Game tab: dlgPause(on), describeGame() (lines of text).
// The game calls: dlgReady, dlgReset, dlgStart, dlgActive, dlgKey, dlgTap, dlgHover,
// dlgDraw, dlgSave, dlgLoad, dlgGet, dlgSet (and dlgView, dlgChoose, dlgUseStory).
// A game drawn in HTML skips dlgDraw and shows dlgView() itself: then a line
// is never split into pages (paging only exists for the canvas box).
// The Story and Game Viewer's Game tab can watch a running game (the
// BRIDGE, at the end). It is silent until the viewer says hello.
// See docs/ADDING-TO-A-GAME.txt.

const DLG_KIT = "Knotwork 3.8-alpha";
const DLG_ERRORS = [];
const DLG_CANVAS_MAXCH = 4; // the canvas box has room for 4 choices
const DLG_THEME_DEFAULT = {
  font: "monospace",
  size: 8,
  rows: 3,
  margin: 6,
  portrait: 44,
  box: "#0e0e16",
  border: "#ffcc33",
  name: "#ffcc33",
  text: "#ffffff",
  hint: "#8a8a99",
  portraitBg: "#26262f",
  portraitBorder: "#555555",
  choice: "#22222c",
  choiceBorder: "#444455",
  choiceText: "#ffe9a8",
  choiceSel: "#5a4a1a",
  choiceSelBorder: "#ffcc33"
};
const DLG = {
  story: null,
  failed: false,
  active: false,
  opened: false,
  knot: "",
  text: "",
  speaker: "",
  portrait: "",
  choices: [],
  sel: -1,
  page: 0,
  closeAfter: false,
  done: false,
  shown: [],
  held: [], // hooks that came with the line on screen, for when the player moves on (dlgBind)
  fresh: false // true while the story stands at its start (after dlgReset)
};
let dlgW = 480;
let dlgH = 320;
let dlgCharW = 4.8;
let dlgDrawn = false; // true once dlgDraw has run (a canvas game)

function dlgError(msg) {
  const m = "Dialogue: " + msg;
  if (DLG_ERRORS.indexOf(m) < 0 && DLG_ERRORS.length < 6) DLG_ERRORS.push(m);
  if (typeof console !== "undefined") console.error(m);
}

// Reads a global of the game by name (works for const, let, var and function).
function dlgGlobal(name) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) return undefined;
  try {
    return (0, eval)("typeof " + name + " === 'undefined' ? undefined : " + name);
  } catch (e) {
    return undefined;
  }
}

// The game's settings: DLG_HOOKS etc. (1.0), else INK_CONFIG.hooks etc. (2.0).
const DLG_CONF_KEYS = { DLG_HOOKS: "hooks", DLG_ASKS: "asks", DLG_KNOTS: "knots", DLG_VARS: "vars", DLG_TAGS: "tags", DLG_NAMES: "names", DLG_THEME: "theme", SPR: "sprites", PAL: "palette", DLG_MAXCH: "maxChoices" };
function dlgConf(name, dflt) {
  const v = dlgGlobal(name);
  if (v !== undefined) return v;
  const key = DLG_CONF_KEYS[name];
  const c = dlgGlobal("INK_CONFIG");
  if (key && c && typeof c === "object" && c[key] !== undefined) return c[key];
  return dflt;
}

// How many choices show at once: maxChoices in config.js, 1-9 (4 if unset).
function dlgMaxChoices() {
  const n = Math.floor(Number(dlgConf("DLG_MAXCH", 4)));
  return n >= 1 && n <= 9 ? n : 4;
}

function dlgFn(name) {
  const f = dlgGlobal(name);
  return typeof f === "function" ? f : null;
}

function dlgTheme() {
  const t = dlgConf("DLG_THEME", null);
  const out = {};
  for (const k in DLG_THEME_DEFAULT) out[k] = t && t[k] !== undefined ? t[k] : DLG_THEME_DEFAULT[k];
  return out;
}

// Where a kit file comes from, for error lines: "ink/ink.js" (the <script src>
// as written) or "the INK:RUNTIME block" in a packed single-file game.
function dlgWhere(file, block) {
  if (typeof document === "undefined") return file;
  const it = document.createNodeIterator(document, 128);
  let n;
  while ((n = it.nextNode())) {
    if (n.data.trim() !== "INK:" + block) continue;
    let el = n.nextSibling;
    while (el && el.nodeType !== 1 && el.nodeType !== 8) el = el.nextSibling;
    if (el && el.nodeType === 1 && el.getAttribute("src")) return el.getAttribute("src");
    return "the INK:" + block + " block";
  }
  const tags = document.getElementsByTagName("script");
  for (let i = 0; i < tags.length; i++) {
    const src = tags[i].getAttribute("src") || "";
    if (src === file || src.slice(-file.length - 1) === "/" + file) return src;
  }
  return file;
}

// True if the page loads the file in an INK:<block> block (or any <script src> ending in it).
function dlgLoads(file, block) {
  if (typeof document === "undefined") return false;
  const it = document.createNodeIterator(document, 128);
  let n;
  while ((n = it.nextNode())) if (n.data.trim() === "INK:" + block) return true;
  const tags = document.getElementsByTagName("script");
  for (let i = 0; i < tags.length; i++) {
    const src = tags[i].getAttribute("src") || "";
    if (src === file || src.slice(-file.length - 1) === "/" + file) return true;
  }
  return false;
}

// ---- loading ----
function dlgReady() {
  if (DLG.story) return true;
  if (DLG.failed) return false;
  DLG.failed = true;
  if (typeof inkjs === "undefined" || !inkjs.Story) {
    dlgError(dlgWhere("ink.js", "RUNTIME") + " did not load - no conversations.");
    return false;
  }
  if (typeof storyContent === "undefined") {
    dlgError(dlgWhere("story.js", "STORY") + " did not load - export it from Inky (File > Export story.js only).");
    return false;
  }
  // A mistake in config.js stops it before INK_CONFIG exists - say so first,
  // or the banner only shows what follows from it (missing hook bindings).
  if (dlgGlobal("INK_CONFIG") === undefined && dlgGlobal("DLG_HOOKS") === undefined && dlgLoads("config.js", "CONFIG")) {
    dlgError(dlgWhere("config.js", "CONFIG") + " gave no INK_CONFIG - a mistake in it (a missing comma or bracket?) stops it. F12 shows the line.");
  }
  if (!dlgUseStory(storyContent)) return false;
  for (const k of dlgConf("DLG_KNOTS", [])) {
    if (!DLG.story.KnotContainerWithName(k)) dlgError("the story has no knot '" + k + "' (the game starts it).");
  }
  for (const v of dlgConf("DLG_VARS", [])) {
    if (!DLG.story.variablesState.GlobalVariableExistsWithName(v)) dlgError("the story has no VAR " + v + " (the game sets it).");
  }
  DLG.failed = false;
  return true;
}

// Loads a compiled story (object or JSON text) in place of the current one.
function dlgUseStory(content) {
  let s;
  try {
    s = new inkjs.Story(content);
  } catch (e) {
    const m = String(e.message || e);
    dlgError("the story would not load: " + m + (/version/i.test(m) ? " - export story.js and ink.js from the same Inky / inkjs." : ""));
    return false;
  }
  s.onError = function (msg, type) {
    if (type === 1) {
      if (typeof console !== "undefined") console.warn("ink warning: " + msg);
      return;
    }
    dlgError("ink: " + msg);
  };
  const asks = dlgConf("DLG_ASKS", []);
  for (const name of dlgConf("DLG_HOOKS", [])) dlgBind(s, name, asks.indexOf(name) >= 0);
  try {
    s.ValidateExternalBindings();
  } catch (e) {
    dlgError(String(e.message || e).replace(/^Error: /, "") + " - list it in the game's hooks or remove it from the story.");
  }
  DLG.story = s;
  dlgClear();
  DLG.fresh = true;
  DLG_BRIDGE.foreign = content !== dlgGlobal("storyContent"); // e.g. a self-test story
  dlgBridgeStep("new story");
  return true;
}

// Each hook is looked up by name WHEN THE STORY CALLS IT, so a function that
// is still a stub at load time and is filled in later is the one used.
// An asking hook is "lookahead safe": ink may call it before the line ends.
// Any other hook is an outcome. Text before a divert runs on into the
// divert's target, so in "+ [Leave] Goodbye. -> finish" ink calls finish's
// chapterDone(...) before "Goodbye." is shown. A hook that ink calls while
// a line is still going like that is HELD: the game hears it when the player
// moves on from that line (dlgSendHeld) - for finish's line, as the box
// closes, just before dlgEnded - the same moment as when the line stands on
// its own above "-> finish". Ink gets true back at once, as the template's
// chapterDone returns: the story never sees a held hook's answer.
function dlgBind(s, name, ask) {
  s.BindExternalFunction(name, function () {
    const args = Array.prototype.slice.call(arguments);
    if (!ask && s.state.currentText.trim() !== "") {
      DLG.held.push({ name: name, args: args });
      return true;
    }
    const r = dlgHook(name, args);
    dlgBridgePost({ inkKit: "hook", name: name, args: args.map(dlgPlain), result: r, ask: !!ask, knot: DLG.knot });
    return r;
  }, !!ask);
}

// Sends the hooks held for the line on screen (dlgBind): the player has
// moved on from that line, or its box is closing.
function dlgSendHeld() {
  while (DLG.held.length) {
    const h = DLG.held.shift();
    const r = dlgHook(h.name, h.args);
    dlgBridgePost({ inkKit: "hook", name: h.name, args: h.args.map(dlgPlain), result: r, ask: false, knot: DLG.knot });
  }
}

// Calls the game's function for a hook and checks what it returned.
function dlgHook(name, args) {
  const f = dlgFn(name);
  if (!f) {
    dlgError("the story called " + name + "() but the game has no such function.");
    return 0;
  }
  let r;
  try {
    r = f.apply(null, args);
  } catch (e) {
    dlgError(name + "() crashed: " + e.message);
    return 0;
  }
  const t = typeof r;
  if (t === "boolean" || t === "string" || (t === "number" && isFinite(r))) return r;
  dlgError(name + "() returned " + (r === undefined ? "nothing" : String(r)) + " - a hook must return what its step says.");
  return 0;
}

function dlgClear() {
  DLG.active = false;
  DLG.opened = false;
  DLG.knot = "";
  DLG.text = "";
  DLG.speaker = "";
  DLG.portrait = "";
  DLG.choices = [];
  DLG.sel = -1;
  DLG.page = 0;
  DLG.closeAfter = false;
  DLG.done = false;
  DLG.shown = [];
  DLG.held = []; // a new start drops them, as it drops a line not moved on from
}

// A fresh story (variables, visit counts) with ink's randomness seeded, so a
// game with the same seed gets the same shuffles. Call it when a game starts.
function dlgReset(seed) {
  if (!dlgReady()) return false;
  DLG.story.ResetState();
  DLG.story.state.storySeed = Math.abs(Math.floor(seed || 0)) % 100000;
  DLG.story.state.previousRandom = 0;
  dlgClear();
  DLG.fresh = true;
  dlgBridgeStep("reset");
  return true;
}

// ---- running a conversation ----
function dlgActive() {
  return DLG.active;
}

// Starts the conversation at a knot. Returns true if a box is now showing
// (false if the knot is missing or had nothing to say).
// dlgStart("") plays from the story's start, as Inky's preview does (for a
// story written without the kit). Only right after dlgReset: that is where
// a fresh story stands.
function dlgStart(knot) {
  if (!dlgReady()) return false;
  if (knot === "" && !DLG.fresh) {
    dlgError("dlgStart(\"\") only works right after dlgReset.");
    return false;
  }
  dlgClear();
  DLG.fresh = false;
  if (knot !== "") {
    try {
      DLG.story.ChoosePathString(knot);
    } catch (e) {
      dlgError("the story has no knot '" + knot + "'.");
      return false;
    }
  }
  DLG.active = true;
  DLG.knot = knot;
  dlgBridgePost({ inkKit: "start", knot: knot, vars: DLG_BRIDGE.sets });
  DLG_BRIDGE.sets = {};
  const steps = DLG_BRIDGE.steps;
  dlgNext();
  dlgBridgeAfter("start", steps);
  return DLG.active;
}

function dlgNext() {
  const s = DLG.story;
  DLG.choices = [];
  DLG.sel = -1;
  DLG.page = 0;
  while (s.canContinue) {
    let t;
    try {
      t = s.Continue();
    } catch (e) {
      dlgError("ink stopped in '" + DLG.knot + "': " + (e.message || e));
      dlgClose();
      return;
    }
    dlgTags(s.currentTags);
    t = t.trim();
    if (t !== "") {
      DLG.text = t;
      DLG.shown.push(t);
      DLG.opened = true;
      dlgWaiting();
      return;
    }
    if (DLG.closeAfter) {
      dlgClose();
      return;
    }
  }
  if (s.currentChoices.length > 0) {
    DLG.opened = true;
    dlgWaiting();
    return;
  }
  dlgClose();
}

// After a line: choices to show, the end, or more lines to come.
function dlgWaiting() {
  const s = DLG.story;
  if (s.canContinue || DLG.closeAfter) return;
  if (s.currentChoices.length === 0) {
    DLG.done = true;
    return;
  }
  const max = dlgMaxChoices();
  if (s.currentChoices.length > max) dlgError("more than " + max + " choices at once in '" + DLG.knot + "' - only the first " + max + " are shown (maxChoices in ink/config.js).");
  DLG.choices = s.currentChoices.slice(0, max).map(function (c) {
    return { text: c.text.trim(), index: c.index };
  });
}

function dlgTags(tags) {
  for (const raw of tags || []) {
    const tag = String(raw).trim();
    const i = tag.indexOf(":");
    const key = (i >= 0 ? tag.slice(0, i) : tag).trim().toLowerCase();
    const val = (i >= 0 ? tag.slice(i + 1) : "").trim();
    if (DLG_BRIDGE.on && !DLG_BRIDGE.foreign) DLG_BRIDGE.tags.push(tag);
    if (key === "speaker") {
      DLG.speaker = val.toLowerCase() === "none" ? "" : val.toLowerCase();
      DLG.portrait = DLG.speaker;
    } else if (key === "portrait") {
      DLG.portrait = val.toLowerCase() === "none" ? "" : val.toLowerCase();
    } else if (key === "end") {
      DLG.closeAfter = true;
    } else {
      const f = dlgFn("dlgTag");
      if (f) {
        try {
          f(tag);
        } catch (e) {
          dlgError("dlgTag crashed: " + e.message);
        }
      }
    }
  }
}

function dlgClose() {
  dlgSendHeld(); // a last line that ran on into its outcome (dlgBind): the game hears it now
  const was = DLG.active;
  const knot = DLG.knot;
  DLG.active = false;
  DLG.choices = [];
  DLG.sel = -1;
  DLG.done = false;
  DLG.closeAfter = false;
  if (!was || !DLG.opened) return;
  dlgBridgeStep("close");
  const steps = DLG_BRIDGE.steps;
  const f = dlgFn("dlgEnded");
  if (f) {
    try {
      f(knot);
    } catch (e) {
      dlgError("dlgEnded crashed: " + e.message);
    }
    dlgBridgeAfter("ended", steps); // the game has handled the end (moved a clock?)
  }
}

// Picks choice i (0 = the first shown). Games with their own buttons call it.
function dlgChoose(i) {
  const c = DLG.choices[i];
  if (!DLG.active || !c) return false;
  dlgSendHeld(); // the player moved on from the line (dlgBind)
  DLG.shown.push("> " + c.text);
  DLG.choices = [];
  try {
    DLG.story.ChooseChoiceIndex(c.index);
  } catch (e) {
    dlgError("choice failed in '" + DLG.knot + "': " + (e.message || e));
    dlgClose();
    return false;
  }
  const steps = DLG_BRIDGE.steps;
  dlgNext();
  dlgBridgeAfter("choose", steps);
  return true;
}

// ENTER / SPACE / tap: next page of a long line, then the next line.
function dlgAdvance() {
  if (DLG.page < dlgPages() - 1) {
    DLG.page += 1;
    dlgBridgeStep("page");
    return;
  }
  if (DLG.choices.length > 0) return;
  if (DLG.closeAfter || DLG.done) {
    dlgClose();
    return;
  }
  const steps = DLG_BRIDGE.steps;
  dlgSendHeld(); // the player moved on from the line (dlgBind)
  dlgNext();
  dlgBridgeAfter("next", steps);
}

function dlgChoosing() {
  return DLG.choices.length > 0 && DLG.page >= dlgPages() - 1;
}

// Keys while a conversation is on screen. Returns true if the key was used
// (every key is swallowed while talking, so the game ignores them).
function dlgKey(k) {
  if (!DLG.active) return false;
  if (dlgChoosing()) {
    const n = DLG.choices.length;
    const i = "123456789".indexOf(k);
    if (k.length === 1 && i >= 0) {
      if (i < n) dlgChoose(i);
      return true;
    }
    if (k === "ArrowDown") DLG.sel = (DLG.sel + 1) % n;
    if (k === "ArrowUp") DLG.sel = DLG.sel < 0 ? n - 1 : (DLG.sel + n - 1) % n;
    if ((k === "Enter" || k === " ") && DLG.sel >= 0) dlgChoose(DLG.sel);
    return true;
  }
  if (k === "Enter" || k === " " || k === "ArrowRight" || k === "ArrowDown") dlgAdvance();
  return true;
}

// Taps / clicks in the game's coordinates (the same ones dlgDraw gets).
function dlgTap(x, y) {
  if (!DLG.active) return false;
  if (dlgChoosing()) {
    const L = dlgLayout(dlgW, dlgH, DLG.choices.length);
    for (let i = 0; i < DLG.choices.length; i++) {
      const r = L.choice(i);
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        dlgChoose(i);
        return true;
      }
    }
    return true;
  }
  dlgAdvance();
  return true;
}

// Mouse over a choice highlights it (optional - call it from pointermove).
function dlgHover(x, y) {
  if (!DLG.active || !dlgChoosing()) return false;
  const L = dlgLayout(dlgW, dlgH, DLG.choices.length);
  for (let i = 0; i < DLG.choices.length; i++) {
    const r = L.choice(i);
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
      DLG.sel = i;
      return true;
    }
  }
  return false;
}

// ---- ink variables and saving ----
function dlgGet(name) {
  if (!dlgReady()) return null;
  try {
    return DLG.story.variablesState[name];
  } catch (e) {
    return null;
  }
}

function dlgSet(name, value) {
  if (!dlgReady()) return false;
  try {
    DLG.story.variablesState[name] = value;
    if (DLG_BRIDGE.on && !DLG_BRIDGE.foreign) DLG_BRIDGE.sets[name] = dlgPlain(DLG.story.variablesState[name]);
    return true;
  } catch (e) {
    dlgError("dlgSet(" + name + "): " + (e.message || e));
    return false;
  }
}

// The whole conversation state (ink state + what the box shows) as text.
function dlgSave() {
  if (!dlgReady()) return "";
  return JSON.stringify({
    kit: 2,
    ink: DLG.story.state.toJson(),
    ui: {
      active: DLG.active, opened: DLG.opened, knot: DLG.knot, text: DLG.text, speaker: DLG.speaker, portrait: DLG.portrait,
      choices: DLG.choices, sel: DLG.sel, page: DLG.page, closeAfter: DLG.closeAfter, done: DLG.done, shown: DLG.shown,
      held: DLG.held.map(function (h) { return { name: h.name, args: h.args.map(dlgPlain) }; })
    }
  });
}

// Puts back a state from dlgSave() (kit 1.0 saves load too).
function dlgLoad(json) {
  if (!dlgReady() || !json) return false;
  try {
    const o = JSON.parse(json);
    DLG.story.state.LoadJson(o.ink);
    DLG.fresh = false;
    const u = o.ui;
    DLG.active = !!u.active;
    DLG.opened = !!u.opened;
    DLG.knot = u.knot;
    DLG.text = u.text;
    DLG.speaker = u.speaker;
    DLG.portrait = u.portrait;
    DLG.choices = u.choices;
    DLG.sel = u.sel;
    DLG.page = u.page;
    DLG.closeAfter = !!u.closeAfter;
    DLG.done = !!u.done;
    DLG.shown = u.shown;
    DLG.held = Array.isArray(u.held) ? u.held : []; // saves from before held hooks have none
    dlgBridgeStep("load");
    return true;
  } catch (e) {
    dlgError("could not load a saved conversation: " + (e.message || e));
    return false;
  }
}

// What the box shows right now (for the self-test, bots and DOM-drawn games).
function dlgView() {
  return {
    active: DLG.active, knot: DLG.knot, speaker: DLG.speaker, name: DLG.speaker ? dlgName(DLG.speaker) : "",
    portrait: DLG.portrait, text: DLG.text, page: DLG.page, pages: dlgPages(),
    choices: dlgChoosing() ? DLG.choices.map(function (c) { return c.text; }) : [], sel: DLG.sel, shown: DLG.shown.slice()
  };
}

// ---- layout and drawing ----
function dlgName(key) {
  const names = dlgConf("DLG_NAMES", {});
  if (names[key]) return names[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// The box grows upward to fit the choices (n = how many are shown).
// Every size follows the theme's font size (8 = the 1.0 layout, pixel for pixel).
function dlgLayout(w, h, n) {
  const T = dlgTheme();
  const z = T.size;
  const rowH = Math.round(z * 1.375);
  const chH = Math.round(z * 1.875);
  const pitch = chH + 2;
  const bx = T.margin;
  const bw = w - 2 * T.margin;
  const bh = Math.max(z * 8, Math.round(z * 3.25) + T.rows * rowH + (n > 0 ? 6 + n * pitch : 0));
  const by = h - bh - 4;
  const px = bx + 6;
  const py = by + 8;
  const ps = T.portrait;
  const tx = px + ps + 10;
  const tw = bx + bw - 8 - tx;
  const cy = by + Math.round(z * 2.75) + T.rows * rowH + 4;
  return {
    bx: bx, by: by, bw: bw, bh: bh, px: px, py: py, ps: ps, tx: tx, tw: tw, rowH: rowH, size: z, rows: T.rows,
    nameY: by + Math.round(z * 1.75), textY: by + Math.round(z * 3.5),
    maxCh: Math.max(12, Math.floor(tw / dlgCharW)),
    choice: function (i) {
      return { x: tx - 4, y: cy + i * pitch, w: tw + 4, h: chH };
    }
  };
}

function dlgWrap(t, max) {
  const out = [];
  let line = "";
  for (let word of String(t).split(/\s+/)) {
    if (word === "") continue;
    while (word.length > max) {
      if (line) {
        out.push(line);
        line = "";
      }
      out.push(word.slice(0, max));
      word = word.slice(max);
    }
    if (!line) line = word;
    else if (line.length + 1 + word.length <= max) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

function dlgPages() {
  if (!dlgDrawn) return 1;
  const L = dlgLayout(dlgW, dlgH, 0);
  const rows = dlgWrap(DLG.text, L.maxCh).length;
  return Math.max(1, Math.ceil(rows / L.rows));
}

function dlgPortraitDraw(ctx, key, x, y, size) {
  const f = dlgFn("dlgPortrait");
  if (f) {
    try {
      if (f(ctx, key, x, y, size)) return;
    } catch (e) {
      dlgError("dlgPortrait crashed: " + e.message);
    }
  }
  const spr = dlgConf("SPR", null);
  const pal = dlgConf("PAL", null);
  if (!spr || !pal || !spr[key]) return;
  const sp = spr[key];
  const sc = size / sp.length;
  for (let r = 0; r < sp.length; r++) {
    for (let q = 0; q < sp[r].length; q++) {
      const c = sp[r][q];
      if (c === "." || !pal[c]) continue;
      ctx.fillStyle = pal[c];
      ctx.fillRect(x + q * sc, y + r * sc, sc, sc);
    }
  }
}

// Draws the box. Call it at the end of the game's draw(), before the error banner.
function dlgDraw(ctx, w, h) {
  dlgW = w;
  dlgH = h;
  if (!DLG.active || !ctx) return;
  dlgDrawn = true;
  if (DLG.choices.length > DLG_CANVAS_MAXCH) {
    dlgError("more than " + DLG_CANVAS_MAXCH + " choices at once in '" + DLG.knot + "' - the canvas box shows only the first " + DLG_CANVAS_MAXCH + " (game.html can show up to 9).");
    DLG.choices = DLG.choices.slice(0, DLG_CANVAS_MAXCH);
  }
  const T = dlgTheme();
  const z = T.size;
  const font = function (px, bold) {
    return (bold ? "bold " : "") + px + "px " + T.font;
  };
  ctx.save();
  ctx.font = font(z);
  ctx.textAlign = "left";
  dlgCharW = ctx.measureText("MMMMMMMMMM").width / 10 || z * 0.6;
  const choosing = dlgChoosing();
  const L = dlgLayout(w, h, choosing ? DLG.choices.length : 0);
  ctx.fillStyle = T.box;
  ctx.fillRect(L.bx, L.by, L.bw, L.bh);
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(L.bx + 0.5, L.by + 0.5, L.bw - 1, L.bh - 1);
  if (DLG.portrait && L.ps > 0) {
    ctx.fillStyle = T.portraitBg;
    ctx.fillRect(L.px, L.py, L.ps, L.ps);
    ctx.strokeStyle = T.portraitBorder;
    ctx.strokeRect(L.px + 0.5, L.py + 0.5, L.ps - 1, L.ps - 1);
    dlgPortraitDraw(ctx, DLG.portrait, L.px + 6, L.py + 6, L.ps - 12);
  }
  if (DLG.speaker) {
    ctx.font = font(z, true);
    ctx.fillStyle = T.name;
    ctx.fillText(dlgName(DLG.speaker), L.tx, L.nameY);
  }
  const pages = dlgPages();
  ctx.font = font(z - 1);
  ctx.fillStyle = T.hint;
  ctx.textAlign = "right";
  ctx.fillText(choosing ? "1-" + DLG.choices.length + " or tap" : (DLG.page < pages - 1 ? "more: ENTER / tap" : "ENTER / tap"), L.bx + L.bw - 6, L.nameY);
  ctx.textAlign = "left";
  ctx.font = font(z);
  ctx.fillStyle = T.text;
  const rows = dlgWrap(DLG.text, L.maxCh);
  const first = DLG.page * L.rows;
  rows.slice(first, first + L.rows).forEach(function (r, i) {
    ctx.fillText(r, L.tx, L.textY + i * L.rowH);
  });
  if (choosing) {
    for (let i = 0; i < DLG.choices.length; i++) {
      const r = L.choice(i);
      ctx.fillStyle = i === DLG.sel ? T.choiceSel : T.choice;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = i === DLG.sel ? T.choiceSelBorder : T.choiceBorder;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      let t = (i + 1) + " " + DLG.choices[i].text;
      if (t.length > L.maxCh) t = t.slice(0, L.maxCh - 3) + "...";
      ctx.fillStyle = T.choiceText;
      ctx.fillText(t, r.x + 4, r.y + Math.round(z * 1.25));
    }
  }
  ctx.restore();
}

// ---- the BRIDGE: the Story and Game Viewer's live view (its Game tab) ----
// The viewer holds the game in a frame. The bridge stays SILENT until that
// frame's parent says hello ({inkKit: "attach"}). A released game on itch.io
// is framed too, but itch never says hello, so the bridge never posts there.
// After hello it posts to the parent (never anywhere else):
//   {inkKit: "step", kind, view, state, tags, game, errors}  after each step
//      kind: hello, start, next, choose, page, close, ended (after the
//      game's dlgEnded), load, reset, new story, pause, resume
//      state = dlgSave() (the viewer loads it into its own copy of the story)
//      tags = every tag since the last step; game = the lines the game's
//      describeGame() returns, if it has one
//   {inkKit: "start", knot, vars}   the game VARs dlgSet wrote before a start
//   {inkKit: "hook", name, args, result, ask, knot}   every hook call (a held
//      one - dlgBind - when the game gets it, not when ink made it)
// It obeys {inkKit: "pause"} / {inkKit: "resume"}: while paused, keys and
// clicks never reach the page, and the game's dlgPause(on) is called if it
// has one (to stop a clock or a game loop). Restart = the viewer reloads
// the frame. Nothing posts while the page plays another story (a self-test).
const DLG_BRIDGE = { on: false, paused: false, foreign: false, sets: {}, tags: [], steps: 0 };

// A value that can cross to the viewer: true, 3, "a" (anything else as text).
function dlgPlain(v) {
  const t = typeof v;
  return v === null || t === "boolean" || t === "number" || t === "string" ? v : String(v);
}

function dlgBridgePost(msg) {
  if (!DLG_BRIDGE.on || DLG_BRIDGE.foreign) return;
  if (msg.inkKit === "step") DLG_BRIDGE.steps += 1;
  try {
    window.parent.postMessage(msg, "*"); // pages opened from disk have no origin to name
  } catch (e) {
    if (typeof console !== "undefined") console.warn("Story and Game Viewer: " + e.message);
  }
}

// Posts where the story stands now.
function dlgBridgeStep(kind) {
  if (!DLG_BRIDGE.on || DLG_BRIDGE.foreign) return;
  const banner = dlgGlobal("ERRORS");
  const describe = dlgFn("describeGame");
  let game = null;
  if (describe) {
    try {
      game = describe().map(String);
    } catch (e) {
      game = ["describeGame() crashed: " + e.message];
    }
  }
  dlgBridgePost({
    inkKit: "step", kind: kind, kit: DLG_KIT, view: dlgView(), state: DLG.story ? dlgSave() : "", tags: DLG_BRIDGE.tags, game: game,
    errors: (Array.isArray(banner) ? banner : []).concat(DLG_ERRORS).map(String)
  });
  DLG_BRIDGE.tags = [];
}

// Posts a step only if nothing posted one since "steps" was read (a chunk
// that ended and started the next one has posted both already).
function dlgBridgeAfter(kind, steps) {
  if (DLG_BRIDGE.steps === steps) dlgBridgeStep(kind);
}

function dlgBridgePause(on) {
  DLG_BRIDGE.paused = on;
  const f = dlgFn("dlgPause");
  if (f) {
    try {
      f(on);
    } catch (e) {
      dlgError("dlgPause crashed: " + e.message);
    }
  }
  dlgBridgeStep(on ? "pause" : "resume");
}

// While paused, every key and click stops here, before the page sees it.
function dlgBridgeBlockInput() {
  const types = ["keydown", "keyup", "keypress", "pointerdown", "pointerup", "mousedown", "mouseup", "click", "dblclick", "touchstart", "touchend", "contextmenu", "wheel"];
  for (const type of types) {
    window.addEventListener(type, function (event) {
      if (!DLG_BRIDGE.paused) return;
      event.stopImmediatePropagation();
      event.preventDefault();
    }, { capture: true, passive: false });
  }
}

if (typeof window !== "undefined" && window.parent && window.parent !== window) {
  window.addEventListener("message", function (event) {
    const d = event.data;
    if (event.source !== window.parent || !d || typeof d !== "object") return;
    if (d.inkKit === "attach") {
      if (!DLG_BRIDGE.on) dlgBridgeBlockInput();
      DLG_BRIDGE.on = true;
      dlgBridgeStep("hello");
    } else if (DLG_BRIDGE.on && (d.inkKit === "pause" || d.inkKit === "resume")) {
      dlgBridgePause(d.inkKit === "pause");
    }
  });
}
