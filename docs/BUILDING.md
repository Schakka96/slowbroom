# Working on SlowBroom

The site is one HTML file. Everything — three games, the chat, the co-op
transports, the sound — lives in `index.html` as a handful of `<script>`
blocks. There is no build step beyond stamping the head onto it.

## The loop

```
python3 build.py src.html        # writes index.html + version.json
node tools/sweep.js              # loads every script block, catches throws
node tools/mopcheck.js           # the shared-floor machinery, on one browser
node tools/together.js           # two browsers, one corridor — co-op end to end
node tools/surfaces.js           # every surface builds; the live ones run
git add <paths> && git commit && git push        # GitHub Pages serves it
```

`src.html` is the artifact body, kept in the repo. It used to live in a temp
file that did not survive the session, which meant the only copy of the source
was whichever chat window had made it. Edit `src.html`, build, and the two stay
in step; `build.py src.html` reproduces `index.html` byte for byte apart from
the build number.

`build.py` wraps the body in a doctype, head, favicon and OG tags, injects
`window.SLOWBROOM_BUILD` ("build 107 — Mahagony Mop") and writes
`version.json`, which the running page polls so players are told when a newer
build exists. Pages caches for ten minutes, so hand out `?v=N` links (bump N)
rather than telling anyone to hard-refresh.

`tools/together.js` loads the whole page twice, in two isolated contexts with
two different window shapes, and wires their co-op channels to each other and
to a pretend `mop_floors` table. It is the test that otherwise needs a second
person and a second laptop. `tools/mopcheck.js` runs the page's own
`/mopcheck` from the command line — the same test Antonia can run in-game.

`tools/surfaces.js` walks every surface, builds it, and runs a few hundred
frames of any `swim` hook. A surface that throws only when somebody walks into
it is invisible until a player finds it.

In-game there is also `/mopsim`-style help: `window.__mopSim(seconds)` drives
the real tick with no drawing and reports the longest the auto-mop went without
covering ground. That is how the corner stall was found — a stall is invisible
from outside, because the mop is still "moving", just not anywhere.

`tools/sweep.js` is a stub-DOM harness. It loads each `<script>` block in a
fake document and reports which ones throw at load. It exists because a
temporal-dead-zone bug once killed the whole chat script and the page just
said "connecting…" forever. **Run it before every push.**

Two more checks worth repeating when you touch markup or the chat:

```sh
# duplicate element ids (a real bug once: two elements shared chat-name)
node -e "const h=require('fs').readFileSync('index.html','utf8');
  const ids=[...h.matchAll(/id=\"([\w-]+)\"/g)].map(m=>m[1]);
  const d=ids.filter((v,i)=>ids.indexOf(v)!==i);
  console.log(d.length?'DUPLICATE '+[...new Set(d)]:'ids unique')"

# user data reaching innerHTML unescaped
grep -nE "innerHTML *=" index.html
```

## Editing

Edits are made by exact string replacement with a uniqueness assertion, never
by regex over the whole file:

```python
def sub(a, b, n=1):
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
```

Build 78 shipped broken because a replacement removed a handler without adding
its replacement, and the assert had been left out.

## Things that bite

- **Don't `git add -A`.** Recordings and screenshots get dropped in this folder;
  `.gitignore` covers the usual extensions now, but stage explicitly.
- Both games have a `frame()` and a `tick()`. Only ever schedule frames through
  that game's `raf()` helper — asking for a frame twice used to start a second loop
  that never stopped, and six of them starved the network.
- The ant and the mop each have their own `keyup` listener with identical
  opening lines. Anchor replacements on something unique to the one you mean.
- Timers: the games run on the animation clock (`performance.now()`), the
  network code on `Date.now()`. Comparing one to the other silently disables
  whatever it guards — that is exactly how auto-deposit died for a whole build.

## Supabase

`config.js` holds the project URL and the **publishable (anon)** key. Both are
public by design; the SQL policies in `supabase/` are the security boundary.
The secret/service key must never be committed, pasted or used here.

Run the numbered files in order on a fresh project: `schema.sql`, `rooms.sql`,
`update2` … `update6`. `cleanup.sql` empties the chat before a launch.
