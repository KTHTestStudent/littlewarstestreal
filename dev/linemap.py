#!/usr/bin/env python3
# dev/linemap.py - writes the LINE MAP at the top of the spec: the line
# ranges of the rules-and-API part, each PHASE section and the FIXER PROMPT
# (run-phases.js's fixer prompt and the builders read parts by these
# numbers). Run it after every edit of the spec:
#   python3 dev/linemap.py specs/LITTLEWARS-SPEC.txt
# It rewrites the lines between "LINE MAP" and "HOW THE HUMAN RUNS IT".
import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "specs/LITTLEWARS-SPEC.txt"


def short(title):
    # "the armies" -> "armies"; "the bots, 3: where a unit is heading" -> "bots 3"
    t = re.sub(r"^(the|a) ", "", title.strip())
    m = re.match(r"bots, (\d+)", t)
    if m:
        return "bots " + m.group(1)
    t = re.split(r"[,:(]", t)[0].strip()
    words = t.split()
    out = ""
    for w in words:
        if len(out) + len(w) + (1 if out else 0) > 18:
            break
        out = (out + " " + w).strip()
    return out


def build(lines):
    n = len(lines)
    def find(pred, start=0):
        for i in range(start, n):
            if pred(lines[i]):
                return i
        return -1
    rules = find(lambda l: l.startswith("RULES FOR THE MODEL"))
    phase1 = find(lambda l: re.match(r"^ PHASE 1 - ", l))
    # a section starts at the ==== line above its title
    heads = []
    for i, l in enumerate(lines):
        m = re.match(r"^ PHASE (\d+) - (.*)$", l)
        if m and int(m.group(1)) >= 2:
            heads.append((int(m.group(1)), short(m.group(2)), i - 1))
    fixer = find(lambda l: l.startswith(" FIXER PROMPT"))
    ends = [h[2] for h in heads[1:]] + [fixer - 1]
    out = ["LINE MAP (for read tools that take a line range)",
           "  rules, game, files, API, traps, numbers: lines %d-%d" % (rules + 1, phase1 - 1)]
    cells = ["PHASE %d (%s): %d-%d" % (num, name, start + 1, end - 1) for (num, name, start), end in zip(heads, ends)]
    for i in range(0, len(cells), 2):
        out.append("  " + "   ".join(cells[i:i + 2]))
    last = len(lines)
    while last > 0 and not lines[last - 1].strip():
        last -= 1
    out.append("  fixer prompt: %d-%d" % (fixer, last))
    out.append("  (If you edit this spec, these numbers go stale - run python3 dev/linemap.py.)")
    out.append("")
    return out


text = open(path, encoding="utf-8").read().split("\n")
for _ in range(5):
    a = next(i for i, l in enumerate(text) if l.startswith("LINE MAP"))
    b = next(i for i, l in enumerate(text) if l.startswith("HOW THE HUMAN RUNS IT"))
    new = build(text[:a] + ["?"] * 0 + text[a:])  # numbers from the current layout
    candidate = text[:a] + new + text[b:]
    if candidate == text:
        break
    text = candidate
open(path, "w", encoding="utf-8").write("\n".join(text))
print("\n".join(text[next(i for i, l in enumerate(text) if l.startswith("LINE MAP")):next(i for i, l in enumerate(text) if l.startswith("HOW THE HUMAN RUNS IT"))]))
