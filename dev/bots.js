// dev/bots.js - bot runs: each battle of the level table played by bots on
// both sides (the newcomer for you, the row's style for them), many seeds.
//   node dev/bots.js [game folder] [runs per battle] [only these battles]
//   node dev/bots.js . 200            every battle, 200 seeds each
//   node dev/bots.js . 500 1,4        battles 1 and 4 only
// For each battle (GDD 5.3): your side's win / draw / loss rates and the
// win rate counting a draw as half (the GDD 5.2 target beside it); how
// battles end (none = a side wiped out, few = both under the draw line,
// rounds = the round limit, raid, quarter, through); the median rounds
// and the share that reached the limit; your side's actions a turn
// (moves, fires, leaves - a stand-in for clicks) and their bot's turn at
// normal playback (0.3 s a move, 0.7 s a shot, 0.5 s to end).
// Each knot's DEFAULT outcome is applied, as in an unwritten story;
// outcomes.js plays each outcome. Needs every PHASE block built.
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const runs = Number(process.argv[3] || 100);
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
      const k = LEVELS[lv].knot;
      const outcome = DEFAULTS[k] || "";
      const r = { lv: lv, won: 0, drawn: 0, lost: 0, why: {}, rounds: [], limit: 0, acts: 0, yourTurns: 0, botSecs: 0, theirTurns: 0, stuck: 0, rows: 0 };
      for (let s = 1; s <= a.runs; s++) {
        rseed = 1000 * lv + s;
        newBattle(lv, outcome);
        r.rows = B.row.rounds;
        let guard = 0;
        let turnActs = 0;
        let turnSecs = 0;
        while (!B.result && guard < 4000 && B.round <= B.row.rounds + RULES.withdraw + 2) {
          guard += 1;
          const side = B.side;
          const act = botNext(side);
          if (act) {
            doAction(act);
            turnActs += 1;
            turnSecs += act.kind === "fire" ? 0.7 : 0.3;
          } else {
            if (side === "you") {
              r.acts += turnActs;
              r.yourTurns += 1;
            } else {
              r.botSecs += turnSecs + 0.5;
              r.theirTurns += 1;
            }
            turnActs = 0;
            turnSecs = 0;
            passTurn();
          }
        }
        if (!B.result) {
          r.stuck += 1;
          continue;
        }
        const w = B.result.winner;
        if (w === "you") r.won += 1;
        else if (w === "draw") r.drawn += 1;
        else r.lost += 1;
        r.why[B.result.why] = (r.why[B.result.why] || 0) + 1;
        r.rounds.push(B.round);
        if (B.result.why === "rounds") r.limit += 1;
      }
      out.push(r);
    }
    return out;
  }, { runs: runs, only: only });
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  console.log("battle  win draw loss  score target   rounds med/limit  at-limit  acts/turn  bot-turn  ends");
  for (const r of rows) {
    const n = r.won + r.drawn + r.lost;
    const t = (await p.evaluate(lv => LEVELS[lv].target, r.lv));
    r.rounds.sort((x, y) => x - y);
    const med = r.rounds.length ? r.rounds[Math.floor(r.rounds.length / 2)] : 0;
    const why = Object.keys(r.why).map(k => k + " " + pct(r.why[k], n)).join(", ");
    console.log(
      String(r.lv).padStart(6) + "  " + String(pct(r.won, n)).padStart(3) + " " + String(pct(r.drawn, n)).padStart(4) + " " + String(pct(r.lost, n)).padStart(4) +
      "  " + String(pct(r.won + r.drawn / 2, n)).padStart(5) + " " + String(t).padStart(6) +
      "   " + String(med).padStart(6) + "/" + String(r.rows).padEnd(5) + "   " + String(pct(r.limit, n)).padStart(6) + "%" +
      "  " + (r.yourTurns ? (r.acts / r.yourTurns).toFixed(1) : "-").padStart(9) +
      "  " + (r.theirTurns ? (r.botSecs / r.theirTurns).toFixed(1) + " s" : "-").padStart(8) + "  " + why + (r.stuck ? "  STUCK " + r.stuck : ""));
  }
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
})();
