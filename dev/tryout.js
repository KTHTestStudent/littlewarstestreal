// dev/tryout.js - bot runs with data.js changed for the run only, to try a
// lever before editing data.js (nothing is written to any file).
//   node dev/tryout.js <changes.js | -> [runs] [battles] [all]
//   node dev/tryout.js - 400 3,6,8 all          as data.js stands
//   echo "RULES.withdraw = 4" > /tmp/t.js
//   node dev/tryout.js /tmp/t.js 400 3,6,8 all  with that change
// changes.js is plain JavaScript run in the page after it loads and
// before the runs, on the tables only (RULES, LEVELS, ARMIES, COUNTRIES,
// BOT_STYLES, EFFECTS, DEFAULTS ...). Keep it to table edits: the tables'
// checks don't see them, and a change to a game function is a rule
// change that belongs in the spec (CLAUDE.md). "all" plays each of the
// knot's outcomes; without it, its DEFAULT. One line per battle and
// outcome: your score (a draw counting half), win / draw / loss, the
// median rounds against the limit, the share at the limit, and how it
// ended - raid+ / through+ for your side, raid- / through- for theirs.
// The seeds are dev/bots.js's (1000 x battle + 1, 2 ...).
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

(async () => {
  const dir = path.resolve(__dirname, "..");
  const change = !process.argv[2] || process.argv[2] === "-" ? "" : fs.readFileSync(process.argv[2], "utf8");
  const runs = Number(process.argv[3] || 300);
  const only = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
  const all = process.argv[5] === "all";
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("page error: " + e.message));
  await p.goto(pathToFileURL(path.join(dir, "game.html")).href);
  await p.waitForTimeout(300);
  if (change) await p.evaluate(change);
  const rows = await p.evaluate(function (a) {
    const out = [];
    for (let lv = 0; lv < LEVELS.length; lv++) {
      if (a.only && a.only.indexOf(lv) < 0) continue;
      const k = LEVELS[lv].knot;
      const outs = EFFECTS[k] ? (a.all ? Object.keys(EFFECTS[k]) : [DEFAULTS[k]]) : [""];
      for (const o of outs) {
        const r = { lv: lv, o: o, w: 0, d: 0, l: 0, why: {}, rounds: [], lim: 0, rows: 0, stuck: 0 };
        for (let s = 1; s <= a.runs; s++) {
          rseed = 1000 * lv + s;
          newBattle(lv, o);
          r.rows = B.row.rounds;
          autoBattle();
          if (!B.result) {
            r.stuck += 1;
            continue;
          }
          const w = B.result.winner;
          if (w === "you") r.w += 1;
          else if (w === "draw") r.d += 1;
          else r.l += 1;
          let key = B.result.why;
          if (key === "raid" || key === "through") key += w === "you" ? "+" : "-";
          r.why[key] = (r.why[key] || 0) + 1;
          r.rounds.push(B.round);
          if (B.result.why === "rounds") r.lim += 1;
        }
        out.push(r);
      }
    }
    return out;
  }, { runs: runs, only: only, all: all });
  const pct = (x, n) => n ? Math.round(100 * x / n) : 0;
  for (const r of rows) {
    const n = r.w + r.d + r.l;
    r.rounds.sort((x, y) => x - y);
    const med = r.rounds.length ? r.rounds[Math.floor(r.rounds.length / 2)] : 0;
    console.log("lv" + String(r.lv).padEnd(3) + (r.o || "-").padEnd(14) + "score " + String(pct(r.w + r.d / 2, n)).padStart(3) +
      "  w" + pct(r.w, n) + " d" + pct(r.d, n) + " l" + pct(r.l, n) + "  med " + med + "/" + r.rows + "  at-limit " + pct(r.lim, n) + "%  " +
      Object.keys(r.why).map(k => k + " " + pct(r.why[k], n)).join(", ") + (r.stuck ? "  STUCK " + r.stuck : ""));
  }
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
})();
