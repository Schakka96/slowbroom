#!/usr/bin/env python3
"""Show or replace the chat filter's word lists.

  python3 tools/wordlist.py show              # print both lists
  python3 tools/wordlist.py set sub a,b,c     # slurs matched anywhere in a message
  python3 tools/wordlist.py set word a,b,c    # slurs matched as whole words only
  python3 tools/wordlist.py set curse a,b,c   # swearing, matched as whole words
  python3 tools/wordlist.py set threat a,b    # replace the threat list

The lists live base64-encoded inside index.html so the published page and the
repo are not a readable catalogue of slurs. Matching is done on a flattened
form of the message: lowercased, leetspeak folded (1→i, 3→e, 0→o, 4→a, $→s),
everything but letters stripped, and runs of a character collapsed — so
"n / i / g. g3r" and "niiigger" both match the same entry.
"""
import base64, pathlib, re, sys

HTML = pathlib.Path(__file__).resolve().parent.parent / "index.html"
KEYS = {"sub": "BAD_SUB", "word": "BAD_WORD", "threat": "BAD_THREAT", "curse": "BAD_CURSE"}

def read(kind):
    m = re.search(r"const %s=atob\('([^']+)'\)" % KEYS[kind], HTML.read_text())
    return base64.b64decode(m.group(1)).decode().split("|") if m else []

def write(kind, words):
    src = HTML.read_text()
    enc = base64.b64encode("|".join(words).encode()).decode()
    src = re.sub(r"(const %s=atob\(')[^']+('\))" % KEYS[kind], r"\g<1>%s\g<2>" % enc, src)
    HTML.write_text(src)

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "show"
    if cmd == "show":
        for kind in KEYS:
            print(f"\n[{kind}]  {len(read(kind))} entries")
            for w in read(kind):
                print("  " + w)
    elif cmd == "set":
        kind, words = sys.argv[2], [w.strip() for w in sys.argv[3].split(",") if w.strip()]
        write(kind, words)
        print(f"{kind}: {len(words)} entries written to index.html")
    else:
        print(__doc__)
