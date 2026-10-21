// dev/selftest.js - runs the game's self-test in headless Chromium.
//   node dev/selftest.js [game folder]        (default: this repository)
// Prints the SELF-TEST line, the failing probes, the replay lines (five
// battles played by bots on both sides) and anything on the red banner or
// the console. The finished game must say "SELF-TEST n/n PASS" with no
// errors. run-phases.js reads this output (the SELF-TEST line, "failing
// probes:", "replay:", "RED BANNER:", "page error:" and "console:" lines).
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

(async () => {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("page error: " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto(pathToFileURL(path.join(dir, "game.html")).href + "#test");
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({
    line: window.SELFTEST_LINE || (typeof LOG !== "undefined" ? LOG.slice(-1)[0] : ""),
    failing: (window.QT || []).filter(x => !x[1]).map(x => x[0]),
    replay: window.REPLAY_GOT,
    banner: (typeof ERRORS !== "undefined" ? ERRORS : []).concat(typeof DLG_ERRORS !== "undefined" ? DLG_ERRORS : [])
  }));
  console.log(r.line);
  if (r.failing.length) console.log("failing probes: " + r.failing.join(" "));
  if (r.replay) console.log("replay:\n  " + r.replay.join("\n  "));
  if (r.banner.length) console.log("RED BANNER:\n  " + r.banner.join("\n  "));
  if (errs.length) console.log(errs.join("\n"));
  await b.close();
  const m = /^SELF-TEST (\d+)\/(\d+) PASS$/.exec(r.line || "");
  process.exitCode = m && !r.banner.length && !errs.length ? 0 : 1;
})();
