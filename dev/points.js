// dev/points.js - your side's points (GDD 3.9) in each battle, against the
// easiest of the four foe_ styles (the best score for your side, a draw
// counting half; a tie goes to the row's own bot, then to the order steady,
// cautious, bold, clever). Bots play both sides (the newcomer for you), with
// the battle's knot's default outcome, as in bots.js and outcomes.js.
//   node dev/points.js [game folder] [runs per battle] [only these battles]
//   node dev/points.js . 1000
// Per battle: the easiest style and its score; your average points over all
// runs, in a win and in a loss; the toll and the hurry in the average; the
// best run; the most points the battle could give (the ceiling: a win in
// round 1, so every other round's hurry, every gun on the board, all your
// figures alive and every enemy figure fallen for the toll or a prisoner,
// whichever is worth more - no run gets there); the average as a share of
// that. The tutorial (battle 0) has no foe_ knot: its row's bot.
// Writes nothing. Needs every PHASE block built.
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const runs = Number(process.argv[3] || 1000);
  const only = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("page error: " + e.message));
  await p.goto(pathToFileURL(path.join(dir, "game.html")).href);
  await p.waitForTimeout(300);
  const rows = await p.evaluate(function (a) {
    const out = [];
    for (let lv = 0; lv < LEVELS.length; lv++) {
      if (a.only && a.only.indexOf(lv) < 0) continue;
      const row = LEVELS[lv];
      const k = row.knot;
      const outcome = DEFAULTS[k] || "";
      const hasFoe = !!(row.foe && EFFECTS[row.foe]);
      const order = hasFoe ? [row.bot].concat(["steady", "cautious", "bold", "clever"].filter(s => s !== row.bot)) : [""];
      let best = null;
      for (const st of order) {
        const r = { lv: lv, style: st || row.bot, n: 0, won: 0, drawn: 0, lost: 0, sum: 0, winSum: 0, lossSum: 0, top: 0, stuck: 0, max: 0, toll: 0, hurry: 0 };
        for (let s = 1; s <= a.runs; s++) {
          rseed = 1000 * lv + s;
          newBattle(lv, outcome, st);
          if (s === 1) {
            let own = 0, guns = 0, theirs = 0;
            for (const u of B.units) {
              if (u.side === "you") own += u.n * figVal(u);
              else theirs += u.n;
              if (isGun(u)) guns += 1;
            }
            r.max = RULES.win + Math.max(0, B.row.rounds - 1) * RULES.hurry + guns * RULES.gunPts + own + theirs * Math.max(RULES.prisonerPts, RULES.toll);
          }
          autoBattle();
          if (!B.result) {
            r.stuck += 1;
            continue;
          }
          const pts = battlePoints("you");
          const w = B.result.winner;
          r.n += 1;
          r.sum += pts;
          r.toll += tollPoints("you");
          r.hurry += hurryPoints("you");
          if (pts > r.top) r.top = pts;
          if (w === "you") { r.won += 1; r.winSum += pts; }
          else if (w === "draw") r.drawn += 1;
          else { r.lost += 1; r.lossSum += pts; }
        }
        r.score = r.n ? (r.won + r.drawn / 2) / r.n : 0;
        if (!best || r.score > best.score) best = r;
      }
      out.push(best);
    }
    return out;
  }, { runs: runs, only: only });
  const f = x => x.toFixed(1);
  console.log("battle  easiest   score  avg pts  in a win  in a loss  toll  hurry  best run  max possible  avg / max");
  let sum = 0, maxSum = 0;
  for (const r of rows) {
    const avg = r.n ? r.sum / r.n : 0;
    if (r.lv > 0) { sum += avg; maxSum += r.max; }
    console.log(
      String(r.lv).padStart(6) + "  " + r.style.padEnd(8) + String(Math.round(100 * r.score)).padStart(6) +
      f(avg).padStart(9) + (r.won ? f(r.winSum / r.won) : "-").padStart(10) + (r.lost ? f(r.lossSum / r.lost) : "-").padStart(11) +
      (r.n ? f(r.toll / r.n) : "-").padStart(6) + (r.n ? f(r.hurry / r.n) : "-").padStart(7) +
      f(r.top).padStart(10) + f(r.max).padStart(14) + (Math.round(100 * avg / r.max) + "%").padStart(11) + (r.stuck ? "  STUCK " + r.stuck : ""));
  }
  if (!only) console.log("battles 1-10 added: " + f(sum) + " of " + f(maxSum) + " (" + Math.round(100 * sum / maxSum) + "%); the tutorial scores nothing");
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
})();
