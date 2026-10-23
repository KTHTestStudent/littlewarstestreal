// (h, scoring) "toll": each side also scores TOLL for each enemy figure that fell (knocked over or in melee)
var TOLL = 1;
var _bp4 = battlePoints;
battlePoints = function (side) { return _bp4(side) + TOLL * B.T[other(side)].fallen; };
