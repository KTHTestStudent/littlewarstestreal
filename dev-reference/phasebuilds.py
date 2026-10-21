#!/usr/bin/env python3
# dev-reference/phasebuilds.py - the phase builds: for every N, the game with
# PHASE 2..N taken from the reference and the other blocks from the stub
# game (the skeleton as committed for the builder), and its self-test line
# against the spec's EXPECTED line for phase N.
#   python3 dev-reference/phasebuilds.py <repo folder> [stub game.html]
# The repo folder gives data.js, ink/, dev/ and specs/; the stub game is
# <repo>/game.html unless given (on a branch where the builder has filled
# the blocks, give the stub commit's game.html: git show <stub commit>:game.html).
import os, re, shutil, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blocks import block, with_block, phases

repo = os.path.abspath(sys.argv[1])
stub = open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(repo, "game.html")).read()
ref = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "game.html")).read()
spec = open(os.path.join(repo, "specs", "LITTLEWARS-SPEC.txt")).read().split("\n")
want = {}
cur = None
for i, l in enumerate(spec):
    m = re.match(r"^ PHASE (\d+) - ", l)
    if m:
        cur = int(m.group(1))
    if l.startswith("EXPECTED SELF-TEST") and cur is not None:
        want[cur] = spec[i + 1].strip()
tmp = tempfile.mkdtemp(prefix="lw-pb-")
for f in ["data.js", "ink", "dev"]:
    os.symlink(os.path.join(repo, f), os.path.join(tmp, f))
env = dict(os.environ)
env.setdefault("NODE_PATH", "/opt/npm-tools/node_modules")
bad = 0
for n in [1] + phases(ref):
    text = stub
    for k in phases(ref):
        if k <= n:
            text = with_block(text, k, block(ref, k))
    open(os.path.join(tmp, "game.html"), "w").write(text)
    r = subprocess.run(["node", "dev/selftest.js", "."], cwd=tmp, capture_output=True, text=True, env=env, timeout=300)
    out = r.stdout.split("\n")
    line = next((l for l in out if l.startswith("SELF-TEST")), "(no line)")
    extra = [l for l in out if re.match(r"^(RED BANNER|page error|console)", l)]
    ok = line == want.get(n) and not extra
    bad += 0 if ok else 1
    print("%-4s phase %2d  %-45s %s" % ("OK" if ok else "DIFF", n, line, "" if ok else "(spec: %s) %s" % (want.get(n), " ".join(extra))))
shutil.rmtree(tmp)
print("all phase builds give the spec's lines" if not bad else "%d phase build(s) differ from the spec" % bad)
sys.exit(1 if bad else 0)
