// (b)+(c) held places: PLACES squares per battle. At the end of every round
// the side holding a place (a unit of its own on it or next to it, no enemy
// next to it) scores PLACE_PTS; at the round limit of a Fight to the Finish or
// Blow at the Rear, the side holding more places wins instead of a draw.
var PLACE_PTS = 3;
var PLACES = { 1: ["F6", "G5"], 2: ["F6", "G5"], 4: ["G5", "H6"], 5: ["G5", "H6"], 7: ["G6", "H7"], 9: ["H6", "I7"], 10: ["I6", "J7", "D7", "O6"] };
function placeSquares() { return (PLACES[B.lv] || []).map(sq); }
function holder(p) {
  let a = false, b = false;
  for (const u of B.units) {
    if (u.n === 0 || u.arm === "esc" || dist(u.x, u.y, p[0], p[1]) > 1) continue;
    if (u.side === "you") a = true; else b = true;
  }
  return a && !b ? "you" : (b && !a ? "them" : "");
}
var _nb2 = newBattle;
newBattle = function (lv, o, f) { _nb2(lv, o, f); B.placePts = { you: 0, them: 0 }; };
var _et = endTurn;
endTurn = function () {
  const was = B.side, first = B.row.first;
  _et();
  if (B.placePts && was !== first) for (const p of placeSquares()) { const h = holder(p); if (h) B.placePts[h] += PLACE_PTS; }
};
var _cr = checkResult;
checkResult = function () {
  const r = _cr();
  if (r && r.why === "rounds" && r.winner === "draw" && placeSquares().length) {
    let a = 0, b = 0; for (const p of placeSquares()) { const h = holder(p); if (h === "you") a++; if (h === "them") b++; }
    if (a !== b) return { winner: a > b ? "you" : "them", why: "places" };
  }
  return r;
};
var _bp = battlePoints;
battlePoints = function (side) { return _bp(side) + (B.placePts ? B.placePts[side] : 0); };
var _hg = headGrid;
headGrid = function (u, st) {
  const ps = placeSquares();
  if (!ps.length || isGun(u) || (B.raid !== null && B.raid.by !== u.side)) return _hg(u, st);
  const open = ps.filter(p => holder(p) !== u.side);
  if (!open.length) return _hg(u, st);
  // head for the nearer of: the nearest enemy, or a place not yet held
  const foes = B.units.filter(v => v.side !== u.side && v.n > 0).map(v => [v.x, v.y]);
  return stepsFrom(open.concat(foes));
};
