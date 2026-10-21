// dev/outcomes.js - the outcome measure (GDD 5.2, 5.3): each scene_ knot's
// outcomes played in the battle after that knot, bots on both sides (the
// newcomer for you, the row's style for them), the same seeds for each
// outcome so only the outcome differs.
//   node dev/outcomes.js [game folder] [runs per outcome] [only these battles]
//   node dev/outcomes.js . 1000          battles 1-10, 1,000 seeds each
//   node dev/outcomes.js . 500 4,9       battles 4 and 9 only
// For each outcome: your win / draw / loss rates, the score counting a draw
// as half (the GDD 5.2 target beside it), the median rounds against the
// limit and the share that reached it, and how battles ended (as
// dev/bots.js). The DEFAULT outcome is marked *. Under each battle: the gap
// between its scene_ outcomes' scores, "ok" when it is within GDD 5.2's 5
// points (a sidegrade), "WIDE" when not. Then each foe_ knot's bot styles
// in that battle (with the scene_ knot's DEFAULT), the row's own bot
// marked *, and their spread - shown, not judged: the foe_ knots choose
// how hard (the author's call, 2026-10-21), so they are no sidegrade. 1,000 seeds give a score about 1.5
// points either way, so a gap near 5 needs more seeds before it is called.
// Needs every PHASE block built. Exit code 0 when every scene_ gap is ok.
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const runs = Number(process.argv[3] || 200);
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
      if (!EFFECTS[k]) continue; // the tutorial's knot sends nothing
      const f = LEVELS[lv].foe;
      const plays = Object.keys(EFFECTS[k]).map(function (o) { return { knot: k, outcome: o, foe: "", dflt: DEFAULTS[k] === o }; });
      if (f && EFFECTS[f]) {
        for (const st of Object.keys(EFFECTS[f])) plays.push({ knot: f, outcome: DEFAULTS[k], foe: st, dflt: st === LEVELS[lv].bot });
      }
      for (const pl of plays) {
        const outcome = pl.foe || pl.outcome;
        const r = { lv: lv, knot: pl.knot, outcome: outcome, dflt: pl.dflt, target: LEVELS[lv].target, won: 0, drawn: 0, lost: 0, why: {}, rounds: [], limit: 0, rows: 0, stuck: 0 };
        for (let s = 1; s <= a.runs; s++) {
          rseed = 1000 * lv + s;
          newBattle(lv, pl.outcome, pl.foe);
          r.rows = B.row.rounds;
          autoBattle();
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
    }
    return out;
  }, { runs: runs, only: only });
  const pct = (n, d) => d ? Math.round(100 * n / d) : 0;
  const score = r => {
    const n = r.won + r.drawn + r.lost;
    return n ? 100 * (r.won + r.drawn / 2) / n : 0;
  };
  console.log("battle  knot      outcome         win draw loss  score target   rounds med/limit  at-limit  ends");
  let wide = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const n = r.won + r.drawn + r.lost;
    r.rounds.sort((x, y) => x - y);
    const med = r.rounds.length ? r.rounds[Math.floor(r.rounds.length / 2)] : 0;
    const why = Object.keys(r.why).map(k => k + " " + pct(r.why[k], n)).join(", ");
    console.log(
      String(r.lv).padStart(6) + "  " + r.knot.padEnd(9) + " " + ((r.dflt ? "*" : " ") + r.outcome).padEnd(15) +
      " " + String(pct(r.won, n)).padStart(3) + " " + String(pct(r.drawn, n)).padStart(4) + " " + String(pct(r.lost, n)).padStart(4) +
      "  " + String(Math.round(score(r))).padStart(5) + " " + String(r.target).padStart(6) +
      "   " + String(med).padStart(6) + "/" + String(r.rows).padEnd(5) + "   " + String(pct(r.limit, n)).padStart(6) + "%" +
      "  " + why + (r.stuck ? "  STUCK " + r.stuck : ""));
    const next = rows[i + 1];
    if (!next || next.lv !== r.lv || next.knot !== r.knot) {
      const mine = rows.filter(x => x.lv === r.lv && x.knot === r.knot).map(score);
      const gap = Math.max.apply(null, mine) - Math.min.apply(null, mine);
      if (r.knot.indexOf("foe_") === 0) {
        console.log("        their bot's spread " + gap.toFixed(1) + " points (a choice of how hard, not judged)");
      } else {
        const ok = gap <= 5;
        if (!ok) wide += 1;
        console.log("        gap " + gap.toFixed(1) + " points: " + (ok ? "ok" : "WIDE (GDD 5.2: within about 5)"));
      }
    }
  }
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
  process.exit(wide || errs.length ? 1 : 0);
})();
