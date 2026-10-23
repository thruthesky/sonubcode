#!/usr/bin/env python3
"""Sonub Code rebrand — replaces the user-visible "OpenCode" brand inside string literals and JSX text.

Identifiers (OpenCodeEvent, OpenCode.make, getOpenCodeTheme, @opencode/* packages, OPENCODE_* env vars) are left alone so
upstream merges stay easy. Run from the repository root after merging upstream:  python3 script/sonub/rebrand.py
"""
import pathlib
import re

ROOTS = ["packages/tui/src", "packages/cli/src"]
BRAND = "Sonub Code"
# "OpenCode" as a whole word, not followed by an identifier/member/call/generic and not preceded by a dot.
WORD = re.compile(r"(?<![.\w])OpenCode(?![\w.(<])")
SKIP_LINE = re.compile(r"^\s*(import|export\s+(type|interface)|type |interface |namespace )")


def in_string(line: str, pos: int) -> bool:
    """True when pos sits inside a '…', "…" or `…` literal opened earlier on the same line."""
    quote = None
    i = 0
    while i < pos:
        ch = line[i]
        if ch == "\\":
            i += 2
            continue
        if quote:
            if ch == quote:
                quote = None
        elif ch in "\"'`":
            quote = ch
        i += 1
    return quote is not None


def jsx_text(line: str, pos: int) -> bool:
    """JSX text: no quote/brace context on the line, and the word is plain prose (e.g. `restart OpenCode.`)."""
    return "<" not in line[:pos] and "=" not in line and "(" not in line and "{" not in line[:pos]


changed = 0
for root in ROOTS:
    for path in pathlib.Path(root).rglob("*"):
        if path.suffix not in {".ts", ".tsx"} or "/test/" in str(path) or ".test." in path.name:
            continue
        text = path.read_text()
        out = []
        for line in text.split("\n"):
            if SKIP_LINE.match(line) or "OpenCode" not in line:
                out.append(line)
                continue
            parts, last = [], 0
            for m in WORD.finditer(line):
                if in_string(line, m.start()) or (path.suffix == ".tsx" and jsx_text(line, m.start())):
                    parts.append(line[last:m.start()] + BRAND)
                    last = m.end()
            parts.append(line[last:])
            out.append("".join(parts))
        new = "\n".join(out)
        if new != text:
            path.write_text(new)
            changed += 1
            print("rebrand:", path)
print(f"{changed} files changed")
