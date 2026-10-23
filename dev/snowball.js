// dev/snowball.js - the gun snowball and turtling (2026-10-23): bot runs, as
// dev/bots.js, that also say which side lost a gun first and how often that
// side still won or drew, the points in a win and a loss, and the median
// gap between the two sides' points. A prototype rule (a file in
// dev/prototypes/, plain JavaScript run in the page) may be added for the
// run only; it changes no file. Prototypes are for measuring ideas before
// the author decides (GDD 12): a rule the author keeps goes through the
// spec and the runner like any other (HANDOFF RECIPES).
//   node dev/snowball.js <game folder> <prototype.js | -> <runs> <battles> [youTurtle] [themTurtle] [label]
//   node dev/snowball.js . - 200 1,4,7,10
//   node dev/snowball.js . dev/prototypes/twoguns.js 200 1,2,3,4,5,6,7,8,9,10
// youTurtle / themTurtle = 1: that side's bot turtles once it has more
// crewed guns than the other side (its units head for the squares next to
// its guns, its guns stay put) - a stand-in for a human who sits on a lead.
// "comeback" = the side that lost a gun first still won (w) or drew (d).
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const TURTLE = `
var TURTLE = { you: false, them: false };
function crewedGuns(side) { var n = 0; for (var u of B.units) if (isGun(u) && u.side === side && u.n > 0) n++; return n; }
function aheadOnGuns(side) { return crewedGuns(side) > crewedGuns(other(side)); }
var _headGrid = headGrid;
headGrid = function (u, st) {
  if (TURTLE[u.side] && aheadOnGuns(u.side) && !(B.raid !== null && B.raid.by !== u.side)) {
    var sq = [];
    for (var g of B.units) if (isGun(g) && g.side === u.side) {
      for (var d of DIRS) { var x = g.x + d[0], y = g.y + d[1]; if (onBoard(x, y) && pieceAt(x, y).enter) sq.push([x, y]); }
    }
    if (sq.length) return stepsFrom(sq);
  }
  return _headGrid(u, st);
};
var _bestSquare = bestSquare;
bestSquare = function (u, st) {
  if (TURTLE[u.side] && isGun(u) && aheadOnGuns(u.side)) return [u.x, u.y];
  return _bestSquare(u, st);
};
`;

(async () => {
  const dir = path.resolve(process.argv[2]);
  const patch = !process.argv[3] || process.argv[3] === "-" ? "" : fs.readFileSync(process.argv[3], "utf8");
  const runs = Number(process.argv[4] || 200);
  const only = process.argv[5].split(",").map(Number);
  const tY = process.argv[6] === "1", tT = process.argv[7] === "1";
  const label = process.argv[8] || "";
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("page error: " + e.message));
  await p.goto(pathToFileURL(path.join(dir, "game.html")).href);
  await p.waitForTimeout(300);
  await p.addScriptTag({ content: TURTLE });
  if (patch) await p.addScriptTag({ content: patch });
  const rows = await p.evaluate(function (a) {
    TURTLE.you = a.tY; TURTLE.them = a.tT;
    const out = [];
    for (const lv of a.only) {
      const k = LEVELS[lv].knot;
      const outcome = DEFAULTS[k] || "";
      const r = { lv, n: 0, w: 0, d: 0, l: 0, why: {}, rounds: [], ptsY: 0, ptsT: 0, winPts: 0, lossPts: 0, nw: 0, nl: 0,
        firstLost: { you: 0, them: 0, none: 0 }, lostFirstWins: 0, lostFirstDraws: 0, lostFirstN: 0, lostRound: [], margin: [] };
      for (let s = 1; s <= a.runs; s++) {
        rseed = 1000 * lv + s;
        newBattle(lv, outcome);
        const g0 = { you: crewedGuns("you"), them: crewedGuns("them") };
        let first = null, guard = 0;
        while (!B.result && guard < 4000 && B.round <= B.row.rounds + RULES.withdraw + 2) {
          guard++;
          const act = botNext(B.side);
          if (act) doAction(act); else passTurn();
          if (first === null) {
            for (const sd of ["you", "them"]) if (crewedGuns(sd) < g0[sd]) { first = sd; r.lostRound.push(B.round); break; }
          }
        }
        if (!B.result) continue;
        r.n++;
        const w = B.result.winner;
        if (w === "you") r.w++; else if (w === "draw") r.d++; else r.l++;
        r.why[B.result.why] = (r.why[B.result.why] || 0) + 1;
        r.rounds.push(B.round);
        const py = battlePoints("you"), pt = battlePoints("them");
        r.ptsY += py; r.ptsT += pt; r.margin.push(Math.abs(py - pt));
        if (w === "you") { r.nw++; r.winPts += py; } else if (w === "them") { r.nl++; r.lossPts += py; }
        r.firstLost[first || "none"]++;
        if (first) { r.lostFirstN++; if (w === first) r.lostFirstWins++; else if (w === "draw") r.lostFirstDraws++; }
      }
      out.push(r);
    }
    return out;
  }, { runs, only, tY, tT });
  const pc = (x, n) => n ? Math.round(100 * x / n) : 0;
  const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
  for (const r of rows) {
    console.log((label + " ").padEnd(14) + "lv" + String(r.lv).padEnd(3) + "score " + String(pc(r.w + r.d / 2, r.n)).padStart(3) +
      " w" + pc(r.w, r.n) + " d" + pc(r.d, r.n) + " l" + pc(r.l, r.n) +
      " | med rnd " + med(r.rounds) + " | pts you " + (r.ptsY / r.n).toFixed(0) + " them " + (r.ptsT / r.n).toFixed(0) +
      " win " + (r.nw ? (r.winPts / r.nw).toFixed(0) : "-") + " loss " + (r.nl ? (r.lossPts / r.nl).toFixed(0) : "-") +
      " margin med " + med(r.margin).toFixed(0) +
      " | gun lost first: you " + pc(r.firstLost.you, r.n) + "% them " + pc(r.firstLost.them, r.n) + "% none " + pc(r.firstLost.none, r.n) +
      "% | loser-of-first-gun wins " + pc(r.lostFirstWins, r.lostFirstN) + "% draws " + pc(r.lostFirstDraws, r.lostFirstN) + "% (rnd " + med(r.lostRound) + ")" +
      " | ends " + Object.keys(r.why).map(k => k + " " + pc(r.why[k], r.n)).join(","));
  }
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
})();
