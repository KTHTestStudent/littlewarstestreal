# dev-reference/blocks.py - reads and swaps game.html's PHASE blocks (used by
# the other scripts here).
import re

START = "// ==== PHASE %d START ===="
END = "// ==== PHASE %d END ===="


def block(text, n):
    """The PHASE n block's inside (between its START and END lines)."""
    lines = text.replace("\r\n", "\n").split("\n")
    s = next(i for i, l in enumerate(lines) if l.strip() == START % n)
    e = next(i for i, l in enumerate(lines) if l.strip() == END % n)
    return "\n".join(lines[s + 1:e])


def with_block(text, n, inside):
    """text with the PHASE n block's inside replaced."""
    lines = text.replace("\r\n", "\n").split("\n")
    s = next(i for i, l in enumerate(lines) if l.strip() == START % n)
    e = next(i for i, l in enumerate(lines) if l.strip() == END % n)
    return "\n".join(lines[:s + 1] + inside.split("\n") + lines[e:])


def phases(text):
    return sorted(int(m) for m in re.findall(r"// ==== PHASE (\d+) START ====", text))


def code_only(inside):
    """The block's code without comment lines, blank lines or indentation -
    for comparing a builder's block with the reference's."""
    out = []
    for l in inside.split("\n"):
        t = l.strip()
        if not t or t.startswith("//"):
            continue
        out.append(re.sub(r"\s+", " ", t))
    return out
