// dev/shots.js - screenshots of battles, to judge how the pieces read
// against the board (NEXT 3). Bots play a few turns on both sides, then
// your side moves part of its army, so the shot shows units that have
// acted, units that haven't, and both sides mixed into the Country.
//   node dev/shots.js [game folder] [out folder] [battles] [seed] [actions] [theme]
//   e.g. node dev/shots.js . shots 0,3,4,8,10 7 10
// [theme] tries THEME changes for these shots only, without editing
// data.js: JSON merged into THEME, one level deep, e.g.
//   '{"pieces":{"outline":false},"red":{"paint":"#b8372b"}}'
// (in Git Bash, keep the single quotes).
// Writes <out>/lv<N>-<paint>.png (the whole screen) and
// <out>/lv<N>-<paint>-board.png (the board at three times its size), for
// both paints. Nothing in the game changes; it only draws.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const out = path.resolve(process.argv[3] || "shots");
  const lvs = (process.argv[4] || "0,3,4,8,10").split(",").map(Number);
  const seed = Number(process.argv[5] || 7);
  const acts = Number(process.argv[6] || 10);
  const theme = process.argv[7] ? JSON.parse(process.argv[7]) : {};
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on("pageerror", e => errs.push("page error: " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto(pathToFileURL(path.join(dir, "game.html")).href + "#" + seed);
  await p.waitForTimeout(500);
  await p.evaluate(t => {
    for (const k in t) {
      if (t[k] && typeof t[k] === "object" && THEME[k] && typeof THEME[k] === "object") Object.assign(THEME[k], t[k]);
      else THEME[k] = t[k];
    }
  }, theme);
  for (const lv of lvs) {
    for (const paint of ["red", "blue"]) {
      const shot = await p.evaluate(([lv, paint, seed, acts]) => {
        paused = true;
        newCampaign(paint, true, seed);
        LOG = [];
        newBattle(lv, "");
        screen = "battle";
        AUTO_YOU = true;
        let n = 0;
        let guard = 0;
        // whole turns until about `acts` actions are done, then stop at the
        // start of your turn
        while (!B.result && guard++ < 2000) {
          if (n >= acts && B.side === "you") break;
          const a = botNext(B.side);
          if (a) { doAction(a); n++; } else finishTurn();
        }
        // your side moves about half its units, so some show as acted
        let moved = 0;
        while (!B.result && B.side === "you" && moved < 3 && guard++ < 2200) {
          const a = botNext("you");
          if (!a) break;
          doAction(a);
          if (a.kind !== "fire") moved++;
        }
        AUTO_YOU = false;
        FX = [];
        LASTSHOT = [];
        draw();
        const g = geom();
        return { url: cv.toDataURL("image/png"), sc: SC, box: [g.x0 - 2, g.y0 - 2, g.S * B.W + 4, g.S * B.H + 4], result: B.result ? B.result.winner : "" };
      }, [lv, paint, seed, acts]);
      const buf = Buffer.from(shot.url.split(",")[1], "base64");
      const name = "lv" + lv + "-" + paint;
      fs.writeFileSync(path.join(out, name + ".png"), buf);
      // the board, cut out and scaled up (crisp pixels)
      const crop = await p.evaluate(([url, sc, box]) => new Promise(res => {
        const im = new Image();
        im.onload = () => {
          const k = 3;
          const c = document.createElement("canvas");
          c.width = box[2] * k;
          c.height = box[3] * k;
          const x = c.getContext("2d");
          x.imageSmoothingEnabled = false;
          x.drawImage(im, box[0] * sc, box[1] * sc, box[2] * sc, box[3] * sc, 0, 0, c.width, c.height);
          res(c.toDataURL("image/png"));
        };
        im.src = url;
      }), [shot.url, shot.sc, shot.box]);
      fs.writeFileSync(path.join(out, name + "-board.png"), Buffer.from(crop.split(",")[1], "base64"));
      console.log(name + (shot.result ? " (battle over: " + shot.result + ")" : ""));
    }
  }
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
})();
