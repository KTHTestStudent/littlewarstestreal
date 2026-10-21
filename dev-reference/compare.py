#!/usr/bin/env python3
# dev-reference/compare.py - the cloud check's first look after a local
# build: each PHASE block of a game.html (the builder's) against the
# reference's, code only (comment lines, blank lines and indentation left
# out). Same code is not required - the self-test and its replay are the
# gate - but a block that differs is the one to read closely.
#   python3 dev-reference/compare.py <game.html>
import os, sys, difflib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blocks import block, phases, code_only

game = open(sys.argv[1]).read()
ref = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "game.html")).read()
same = 0
for n in phases(ref):
    a = code_only(block(ref, n))
    b = code_only(block(game, n))
    if a == b:
        same += 1
        print("phase %2d  the same code as the reference (%d lines)" % (n, len(a)))
    else:
        print("phase %2d  DIFFERS:" % n)
        for l in difflib.unified_diff(a, b, "reference", "game.html", lineterm="", n=1):
            print("    " + l)
print("%d of %d blocks the same as the reference" % (same, len(phases(ref))))
