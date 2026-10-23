// (h, simplified) "hurry": a win is worth 100 plus HURRY for each round left unused;
// a draw at the limit stays 50 each.
var HURRY = 5;
var _bp3 = battlePoints;
battlePoints = function (side) {
  let p = _bp3(side);
  if (B.result.winner === side) p += HURRY * Math.max(0, B.row.rounds - B.round);
  return p;
};
