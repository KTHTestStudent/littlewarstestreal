#!/usr/bin/env python3
# dev-reference/plant.py - the planted bugs: one typical builder slip at a
# time in the reference game.html, and the self-test on it - each must fail
# it (not "PASS"). A MISSED bug means a probe is too weak.
#   python3 dev-reference/plant.py <repo folder>
# The repo folder gives data.js, ink/ and dev/. Prints one line per bug:
# CAUGHT (with the self-test line) or MISSED. About 3 minutes.
import subprocess, sys, os, shutil

BUGS = [
  # (phase, what, old, new)
  (2, "zone off by one", "return y >= B.H - B.row.youRows;", "return y > B.H - B.row.youRows;"),
  (2, "every gun a horse gun", "      arm = \"hgun\";\n      horse = false;", "      arm = \"hgun\";"),
  (2, "extra units for them too", "  if (side !== \"you\") {\n    return;\n  }\n  for (const arm of B.row.extra) {", "  for (const arm of B.row.extra) {"),
  (2, "armed counts escorts", "if (v.side === side && v.arm !== \"esc\") {\n      n += v.n;", "if (v.side === side) {\n      n += v.n;"),
  (3, "corner needs both open", "return pieceAt(x1, y0).enter || pieceAt(x0, y1).enter;", "return pieceAt(x1, y0).enter && pieceAt(x0, y1).enter;"),
  (3, "canStep ignores corners", "  return cornerOpen(x0, y0, x1, y1);\n}\n\n// RETURNS true if units a and b", "  return true;\n}\n\n// RETURNS true if units a and b"),
  (3, "enemyNear counts empty units", "if (v.side !== side && v.n > 0 && dist(x, y, v.x, v.y) === 1", "if (v.side !== side && dist(x, y, v.x, v.y) === 1"),
  (4, "a ford doesn't end the move", "if (!start && (pieceAt(s[0], s[1]).ford || enemyNear(u.side, s[0], s[1]))) {", "if (!start && enemyNear(u.side, s[0], s[1])) {"),
  (4, "contact doesn't stop a move", "if (!start && (pieceAt(s[0], s[1]).ford || enemyNear(u.side, s[0], s[1]))) {", "if (!start && pieceAt(s[0], s[1]).ford) {"),
  (4, "may pass through guns", "if (o !== null && (o.side !== u.side || isGun(o))) {", "if (o !== null && o.side !== u.side) {"),
  (4, "a cheaper way not taken", "if (nc > mp || (best[k] !== undefined && best[k] <= nc)) {", "if (nc > mp || best[k] !== undefined) {"),
  (5, "a move doesn't end the guns step", "    u.bare = false;\n  } else {\n    B.gunsOpen = false;\n  }\n}", "    u.bare = false;\n  }\n}"),
  (5, "a gun moves with 3 crew", "return B.gunsOpen && !u.fired && u.n >= RULES.crew;", "return B.gunsOpen && !u.fired && u.n > 0;"),
  (5, "leaving scores no points", "B.T[u.side].safe += u.n * figVal(u);", "B.T[u.side].safe += 0;"),
  (6, "no fire over from a hill", "  if (pieceAt(x0, y0).hill) {\n    return true;\n  }\n  const n = dist(x0, y0, x1, y1);\n  for (let i = 1; i < n; i++) {\n    const fx", "  const n = dist(x0, y0, x1, y1);\n  for (let i = 1; i < n; i++) {\n    const fx"),
  (6, "a tie blocks if either blocks", "    if (a && b) {\n      return false;\n    }", "    if (a || b) {\n      return false;\n    }"),
  (6, "Math.round on the line", "const a = pieceAt(Math.floor(fx + 0.5), Math.floor(fy + 0.5)).blocks;\n    const b = pieceAt(Math.ceil(fx - 0.5), Math.ceil(fy - 0.5)).blocks;", "const a = pieceAt(Math.round(fx), Math.round(fy)).blocks;\n    const b = a;"),
  (6, "range check off by one", "if (d < 1 || d > RULES.range) {\n    return false;\n  }\n  return lineOfFire", "if (d < 1 || d >= RULES.range) {\n    return false;\n  }\n  return lineOfFire"),
  (7, "crew counts escorts", "if (v !== g && v.side === g.side && v.arm !== \"esc\" && dist(v.x, v.y, g.x, g.y) === 1) {", "if (v !== g && v.side === g.side && dist(v.x, v.y, g.x, g.y) === 1) {"),
  (7, "isolated at exactly half", "return supportCount(side, m) * 2 < own;", "return supportCount(side, m) * 2 <= own;"),
  (7, "support counts the melee's own units", "if (v.side !== side || v.arm === \"esc\" || m.indexOf(v) >= 0) {", "if (v.side !== side || v.arm === \"esc\") {"),
  (8, "guns fire in round 1", "if (B.round === 1 && !(B.row.type === \"defend\" && B.row.defender === g.side)) {", "if (B.round === 0) {"),
  (8, "a scatter roll for every shot", "    if (rng() * 100 >= p) {\n      const d = DIRS[Math.floor(rng() * 8)];", "    const d = DIRS[Math.floor(rng() * 8)];\n    if (rng() * 100 >= p) {"),
  (8, "cover for a gun that fired", "if (pieceAt(tx, ty).cover && !u.bare && rng() * 100 >= RULES.cover) {", "if (pieceAt(tx, ty).cover && rng() * 100 >= RULES.cover) {"),
  (8, "no line-of-fire check on a scattered shot", "    if (!onBoard(tx, ty) || !lineOfFire(g.x, g.y, tx, ty)) {\n      continue;\n    }\n    const u = unitAt(tx, ty);\n    if (u === null || u.n === 0) {\n      continue;\n    }\n    if (pieceAt(tx, ty).cover && !u.bare && rng()", "    if (!onBoard(tx, ty)) {\n      continue;\n    }\n    const u = unitAt(tx, ty);\n    if (u === null || u.n === 0) {\n      continue;\n    }\n    if (pieceAt(tx, ty).cover && !u.bare && rng()"),
  (9, "contacts across closed corners", "if (a.n > 0 && b.n > 0 && a.side !== b.side && touching(a, b)) {", "if (a.n > 0 && b.n > 0 && a.side !== b.side && dist(a.x, a.y, b.x, b.y) === 1) {"),
  (9, "melees not merged", "        out.splice(i, 1);", "        out.splice(i, 0);"),
  (10, "prisoners when supported", "  if (isolated(small, m)) {\n    p = Math.min(Math.max(a, b) - s, s);\n  }", "  p = Math.min(Math.max(a, b) - s, s);"),
  (10, "prisoners not capped", "p = Math.min(Math.max(a, b) - s, s);", "p = Math.max(a, b) - s;"),
  (11, "loss order the wrong way round", "const order = side === B.side ? LOSS_ORDER.own : LOSS_ORDER.other;", "const order = side === B.side ? LOSS_ORDER.other : LOSS_ORDER.own;"),
  (11, "fewest figures last", "return order.indexOf(a.arm) - order.indexOf(b.arm) || a.n - b.n ||", "return order.indexOf(a.arm) - order.indexOf(b.arm) || b.n - a.n ||"),
  (11, "a taken escort keeps its prisoners", "      if (u.arm === \"esc\") {\n        freePrisoners(u);\n      }\n      vals.push(figVal(u));", "      vals.push(figVal(u));"),
  (12, "cavalry before infantry", "return a.arm === \"inf\" && b.arm !== \"inf\";", "return a.arm !== \"inf\" && b.arm === \"inf\";"),
  (12, "one escort for all", "for (let i = 0; i < vals.length; i += RULES.perEscort) {\n    const part = vals.slice(i, i + RULES.perEscort);", "for (let i = 0; i < vals.length; i += vals.length) {\n    const part = vals.slice(i, i + vals.length);"),
  (13, "melees judged one after another", "  const rs = ms.map(meleeOutcome);\n", "  const rs = [];\n"),
  (13, "a gun taken with an enemy beside it", "    if (!theirs && ours) {", "    if (ours) {"),
  (14, "escorts don't avoid contact", "const near = enemyNear(e.side, x, y) ? 1 : 0;", "const near = 0;"),
  (14, "a ford doesn't stop the walk", "      if (pieceAt(e.x, e.y).ford) {\n        break;\n      }", ""),
  (15, "the round goes up after the first side", "  if (B.side !== B.row.first) {\n    B.round += 1;\n  }\n  B.side = other(B.side);", "  if (B.side === B.row.first) {\n    B.round += 1;\n  }\n  B.side = other(B.side);"),
  (15, "escorts walk before the melees", "  fightMelees();\n  clearFallen();\n  takeGuns(B.side);\n  walkEscorts(B.side);", "  walkEscorts(B.side);\n  fightMelees();\n  clearFallen();\n  takeGuns(B.side);"),
  (15, "half the back line wrong way", "    if (half === \"west\" && u.x >= B.W / 2) {", "    if (half === \"east\" && u.x >= B.W / 2) {"),
  (16, "guns not handed over", "    if (isGun(u)) {\n      u.side = w;\n    }", ""),
  (16, "the raider's turns count down too", "  if (B.side === loser) {\n    B.raid.left -= 1;\n  }", "  B.raid.left -= 1;"),
  (17, "the draw line checked with <=", "if (t !== \"defend\" && a < B.row.drawLine && b < B.row.drawLine) {", "if (t !== \"defend\" && a <= B.row.drawLine && b <= B.row.drawLine) {"),
  (17, "the round limit after the first side", "if (B.round >= B.row.rounds && s !== B.row.first) {", "if (B.round >= B.row.rounds) {"),
  (17, "through before the quarter", "    if (armed(att) * 100 < B.start[att] * RULES.quarter) {\n      return { winner: B.row.defender, why: \"quarter\" };\n    }\n    if (s === att && onBackLine(att, RULES.throughSize, \"all\")) {\n      return { winner: att, why: \"through\" };\n    }", "    if (s === att && onBackLine(att, RULES.throughSize, \"all\")) {\n      return { winner: att, why: \"through\" };\n    }\n    if (armed(att) * 100 < B.start[att] * RULES.quarter) {\n      return { winner: B.row.defender, why: \"quarter\" };\n    }"),
  (17, "through with any unit (the size left out)", "onBackLine(att, RULES.throughSize, \"all\")", "onBackLine(att, 1, \"all\")"),
  (17, "a raid as soon as a unit arrives (indexOf > 0)", "      if (B.standing[s].indexOf(u.id) >= 0) {", "      if (B.standing[s].indexOf(u.id) > 0) {"),
  (17, "the standing list never cleared", "    B.standing[s] = [];\n", ""),
  (17, "the other side's standing list read", "      if (B.standing[s].indexOf(u.id) >= 0) {", "      if (B.standing[other(s)].indexOf(u.id) >= 0) {"),
  (17, "any raider twice running, not the same unit", "      if (B.standing[s].indexOf(u.id) >= 0) {", "      if (B.standing[s].length > 0) {"),
  (17, "raiders ignore the row's half", "    if (B.row.rear === \"west\" && u.x >= B.W / 2) {\n      continue;\n    }\n", ""),
  (17, "raiders need more than raidSize", "u.n < RULES.raidSize || u.y !== backY(other(side))", "u.n <= RULES.raidSize || u.y !== backY(other(side))"),
  (17, "the hold line for the wrong side", "say(words(s === \"you\" ? LOG_WORDS.holdYou : LOG_WORDS.holdThem", "say(words(s === \"you\" ? LOG_WORDS.holdThem : LOG_WORDS.holdYou"),
  (18, "a gun scores no points", "      if (isGun(u)) {\n        p += RULES.gunPts;\n      }", ""),
  (18, "prisoners score for one side only", "  return p + prisoners * RULES.prisonerPts + tollPoints", "  return p + B.T[side].held * RULES.prisonerPts + tollPoints"),
  (18, "the toll from its own fallen", "return B.T[other(side)].fallen * RULES.toll;", "return B.T[side].fallen * RULES.toll;"),
  (18, "the toll from both sides' fallen", "return B.T[other(side)].fallen * RULES.toll;", "return (B.T.you.fallen + B.T.them.fallen) * RULES.toll;"),
  (18, "the hurry for every side", "  if (B.result.winner !== side) {\n    return 0;\n  }\n  return Math.max", "  return Math.max"),
  (18, "the hurry for a draw too", "  if (B.result.winner !== side) {\n    return 0;", "  if (B.result.winner !== side && B.result.winner !== \"draw\") {\n    return 0;"),
  (18, "the hurry counts the round it won in", "Math.max(0, B.row.rounds - B.round)", "Math.max(0, B.row.rounds - B.round + 1)"),
  (18, "the hurry below 0 past the limit", "Math.max(0, B.row.rounds - B.round)", "(B.row.rounds - B.round)"),
  (18, "the hurry by the toll's number", ") * RULES.hurry;", ") * RULES.toll;"),
  (18, "the toll left out of the points", " + tollPoints(side) + hurryPoints(side);", " + hurryPoints(side);"),
  (18, "the hurry left out of the points", " + tollPoints(side) + hurryPoints(side);", " + tollPoints(side);"),
  (18, "the tutorial scores", "  if (B.lv > 0) {\n    CAMP.points += pts;", "  if (B.lv >= 0) {\n    CAMP.points += pts;"),
  (19, "rounds set, not added", "      row.rounds += s[1];", "      row.rounds = s[1];"),
  (19, "only the first step", "  for (const s of fx[outcome]) {", "  for (const s of fx[outcome].slice(0, 1)) {"),
  (20, "shot value ignores cover", "      c = c * RULES.cover / 100;", "      c = c;"),
  (20, "own figures counted plus", "    v += u.side === g.side ? -c : c;", "    v += c;"),
  (21, "aims next to its own units", "      if (friendNear(g.side, v)) {\n        continue;\n      }", ""),
  (21, "nearest the wrong way", "        s = -dist(g.x, g.y, v.x, v.y);", "        s = dist(g.x, g.y, v.x, v.y);"),
  (22, "no interception", "  if (threats.length > 0 && (B.row.type === \"rear\" || B.row.defender === side)) {", "  if (threats.length > 0 && B.row.type === \"none\") {"),
  (22, "goal kept with enemies close", "if (st.groups > 0 && u.goal !== \"\" && near > st.groups) {", "if (st.groups > 0 && u.goal !== \"\") {"),
  (22, "too few cavalry ride for the raid's back line", "  if (u.arm === \"cav\" && u.n >= RULES.raidSize && B.row.type === \"rear\") {", "  if (u.arm === \"cav\" && B.row.type === \"rear\") {"),
  (22, "too few cavalry ride for the defender's back line", "  if (u.arm === \"cav\" && u.n >= RULES.throughSize && B.row.type === \"defend\"", "  if (u.arm === \"cav\" && B.row.type === \"defend\""),
  (22, "the cavalry's size tested with >", "u.n >= RULES.throughSize", "u.n > RULES.throughSize"),
  (23, "guns score like infantry", "  if (isGun(u) && !(B.raid !== null && B.raid.by !== u.side)) {", "  if (false) {"),
  (23, "hold while fired on", "    if (x === u.x && y === u.y && !B.firedOn[u.side]) {", "    if (x === u.x && y === u.y) {"),
  (24, "a slip roll for every style", "const plain = st.slip > 0 && rng() * 100 < st.slip;", "const plain = rng() * 100 < st.slip;"),
  (24, "ties go to the last square", "    if (best === null || v > bs) {\n      best = s;\n      bs = v;", "    if (best === null || v >= bs) {\n      best = s;\n      bs = v;"),
  (24, "guns charge", "if (moved && enemyNear(u.side, s[0], s[1]) && (isGun(u) || !chargeOk(u, s[0], s[1], st))) {", "if (moved && enemyNear(u.side, s[0], s[1]) && !chargeOk(u, s[0], s[1], st)) {"),
  (25, "other units before guns", "  for (const guns of [true, false]) {", "  for (const guns of [false, true]) {"),
  (25, "no leaving while withdrawing", "      if (back && canLeave(u)) {\n        return { kind: \"leave\", u: u };\n      }", ""),
]

def main():
    import tempfile
    repo = os.path.abspath(sys.argv[1])
    src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "game.html")).read()
    folder = tempfile.mkdtemp(prefix="lw-plant-")
    for f in ["data.js", "ink", "dev"]:
        os.symlink(os.path.join(repo, f), os.path.join(folder, f))
    game = os.path.join(folder, "game.html")
    env = dict(os.environ, NODE_PATH=os.environ.get("NODE_PATH", "/opt/npm-tools/node_modules"))
    missed = 0
    for phase, what, old, new in BUGS:
        if src.count(old) != 1:
            print("SKIP  phase %2d  %-40s (the planted text is not in the reference once: %d)" % (phase, what, src.count(old)))
            missed += 1
            continue
        open(game, "w").write(src.replace(old, new))
        r = subprocess.run(["node", "dev/selftest.js", "."], cwd=folder, capture_output=True, text=True, env=env, timeout=300)
        line = next((l for l in r.stdout.split("\n") if l.startswith("SELF-TEST")), "(no line)")
        ok = not line.endswith("PASS")
        if not ok:
            missed += 1
        print("%s  phase %2d  %-42s %s" % ("CAUGHT" if ok else "MISSED", phase, what, line))
    shutil.rmtree(folder)
    print("%d of %d caught" % (len(BUGS) - missed, len(BUGS)))
    sys.exit(1 if missed else 0)

main()
