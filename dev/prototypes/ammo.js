// (f) limited ammunition: each gun fires AMMO times a battle (a taken gun keeps what is left).
var AMMO = 4;
var _nb = newBattle;
newBattle = function (lv, o, f) { _nb(lv, o, f); for (const u of B.units) if (isGun(u)) u.ammo = AMMO; };
var _af = addUnit;
addUnit = function (s, a, x, y, g) { const u = _af(s, a, x, y, g); if (ARMS[a].gun) u.ammo = AMMO; return u; };
var _cf = canFire;
canFire = function (g) { return _cf(g) && !(g.ammo <= 0); };
var _fg = fireGun;
fireGun = function (g, x, y) { g.ammo -= 1; return _fg(g, x, y); };
