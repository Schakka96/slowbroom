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
node tools/antsound.js           # the ant's plops and landings, into a fake speaker
node tools/skins.js              # the palette, and the rails that were stripped back
node tools/mopart.js             # the three tools, into a recording canvas
node tools/mopshot.js all out.svg   # and again, as a picture you can look at
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

`tools/antsound.js` plays every sound the ant makes into a recording
`AudioContext` instead of a speaker and asks whether each set really varies,
whether it stays quiet, and whether the mute switch reaches it. Watch what it
measures, not just whether it passes: its first version only kept nodes that
were `start()`ed, so it never saw a filter, and it cheerfully reported grass
as a 100 Hz knock. A rustle **is** its filter.

`tools/skins.js` reads the markup and the stylesheet rather than the screen.
It checks the palette defines every token and covers both routes into dark,
that things sit where they were asked to sit, and — the part that earns its
keep — that **nothing still reaches for a control that has been removed**.
Deleting a button from the markup while its `getElementById` survives throws
at load and takes that whole `<script>` block with it, so the game simply
never starts. That happened twice in one afternoon (`holdBtn`, then
`tintEl`); `sweep.js` catches the throw, and `skins.js` names the control.

Note that `build.py` stamps its own little reset `<style>` into the head, and
that one opens `:root{` too — the page's real stylesheet is the big one.

`tools/mopart.js` draws each mop tool into a recording 2D context and counts
the primitives it used. **A drawing bug is not a crash** — a tool that draws
nothing, or draws the same silhouette as its neighbour, loads perfectly and
just looks wrong, so no other harness here can see it. This one asks what a
glance would: is anything there, is it a different shape from the other two,
does it turn with the heading, and do the two that should move actually move.
It is also the only way to draw a tool without a browser, via the
`window.__mopArt` seam.

`tools/mopshot.js` goes one step further and replays those same calls into an
SVG, which `qlmanage -t -s 840 -o . out.svg` turns into a PNG you can open.
**Assertions are not eyes.** The mop handle passed every check in
`mopart.js` — drawn in the right order, the right length, the right colour —
while looking like a hammer with the shaft stuck to the side of the head.
Render it and look at it before calling a drawing change done.

One trap if you extend the replay: do NOT put the current transform on a
`clipPath`'s geometry. SVG resolves a `userSpaceOnUse` clip in the
referencing element's own user space, which already includes that element's
transform, so repeating it applies the transform twice and everything clipped
silently vanishes. That is what made the first render show a mop head with no
strands on it at all.

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

## Two sessions, one tree

`src.html` in this repo is the **shared source of truth**, and `index.html` is
built from it. More than one Claude session has worked here at once: if you
hold a private copy of the source somewhere else, build from it, and commit,
you will silently delete whatever the other session added — that has happened
(build 116 wiped the porthole and coop work; their next build wiped mine).

So: **start every session by copying `src.html`**, write your changes back into
it, and stage `index.html`, `src.html` and `version.json` by name. Never
`git add -A`. If `src.html` has changed since you copied it, re-port your edits
onto the new one rather than overwriting.

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
