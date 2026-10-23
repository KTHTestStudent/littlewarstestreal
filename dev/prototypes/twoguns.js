// (a) a second gun section a side in battles 1-9 (10 already has two):
// placed on the back line, mirrored across from the first gun.
(function () {
  const L = "ABCDEFGHIJKLMNOPQR";
  for (let lv = 1; lv <= 9; lv++) {
    const W = COUNTRIES[LEVELS[lv].country][0].split(" ").join("").length;
    const H = COUNTRIES[LEVELS[lv].country].length;
    for (const side of ["them", "you"]) {
      const g = ARMIES.find(a => a.lv === lv && a.side === side && a.arm === "gun");
      if (!g) continue;
      const x = L.indexOf(g.at[0]);
      let mx = W - 1 - x; if (Math.abs(mx - x) < 3) mx = x < W / 2 ? x + 4 : x - 4;
      const row = side === "you" ? 1 : H;
      ARMIES.push({ lv, side, arm: "gun", at: L[mx] + row, goal: "" });
    }
  }
  ARMIES.sort((a, b) => a.lv - b.lv || (a.side === b.side ? 0 : a.side === "them" ? -1 : 1));
})();
