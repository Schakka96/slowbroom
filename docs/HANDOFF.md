# Where SlowBroom stands — 2026-09-15

Live: https://schakka96.github.io/slowbroom/ · build 107 — Mahagony Mop (whatever `version.json` says is what is live)

## Before you tell anyone about it

1. **Run `supabase/update6.sql` and `supabase/update7.sql`.** Not optional — the quota work depends on it.
   Without it the game still runs, but it counts players the expensive way and
   logs a warning. Verify afterwards: `GET /rest/v1/rpc/live_counts` should
   return a small JSON object rather than a 404.
2. **Run `supabase/cleanup.sql`** if you want the chat empty at launch.
3. Optional: `git config user.email` to a GitHub `noreply` address if you would
   rather your personal address were not in the public commit history. Past
   commits keep the old one.

## Open

- **Mopping together is rebuilt and now shows for everyone.** `MOP_COOP()`
  returns `true`; the "Mop together" panel is part of the mopping rail. See
  below for how it works and how to test it. Still untested with a real
  second person on a real second machine.
- **The trailer.** `AntGametrailer.mp4` (56 MB) is gitignored and staying local.
  It needs real hosting — YouTube, or itch.io's own — not a git repo.
- **Distribution.** The publicity brief for Astra was written earlier in the
  project; itch.io, r/WebGames, r/incremental_games and the Hozy community are
  the obvious first stops.
- **Progress codes.** The FAQ shows the player's round and a restore code, and
  `/codes` (dev only) prints the table. Nobody has needed one yet.
- **The round order is dealt fresh on every load.** Saved progress keeps the
  round *number*, so round 12 is a different floor next time. If that bothers
  anyone, store the order seed next to the round.

## Recently settled, so don't re-litigate

- Tidy Ant is 28 levels: 23 sorting rounds, the everything drawer (500 things,
  15 piles), then shop → hall → gallery → throne. Rounds 1–4 fixed, the flower
  meadow always last, the three house rounds at 13/17/21 shuffled among
  themselves, everything else dealt.
- Auto-pickup is a rail toggle; hold `0` to gather by hand when it is off.
  `alt` blows, `space` sets down a pile and hands the bouquet to the queen.
- Weather: outdoors only, from round 5, never snow (snow falls in its one round).
  In the mopping game, weather only ever happens on window surfaces.
- No cap on dusty rooms; travel right forever.

## Mopping together

Rebuilt 2026-09-15. The old version could not have worked, for three reasons
that all failed silently:

1. **Every browser dealt its own corridor.** Walking through a door called
   `pickSurfaceIdx()` and `Math.random()`, so your room 5 and your friend's
   room 5 were different floors. There was never a shared map to share.
2. **The map that travelled was the wrong shape.** It was a bit per cell of
   the sender's grid, and that grid is sized to the sender's *window*. A
   different window meant the bits landed on the wrong cells.
3. **Only the host's own room synced at all.** Everyone else threw the
   message away, and two guests standing together shared nothing.

What it is now:

- **The room code is the world.** Every room's surface and pattern is derived
  from `hash32('slowbroom-mop-' + CODE)`, so everybody who types the code
  walks the same corridor without having to agree on anything. Solo play gets
  its own world seed in `sb-mop-world`, which also means your own corridor
  now survives a reload.
- **The map is 96×54 patches in normalized coordinates** — the same shape in
  every window. Half of a room is half of the map whatever size your screen
  is. Merging is a **union**, so there is no host, order does not matter, and
  nothing anyone sends can put dust back.
- **Floors are kept in `mop_floors`** (one row per world and room), so
  progress survives everyone logging off. **Run `supabase/update7.sql`.**
  Without it the game still works, but only between people online together,
  and it says so in the dev console.
- Solo corridors are kept in `localStorage`, never in the database.

### Testing it

- `/mopcheck` — proves the machinery on one browser: that a code deals the
  same corridor twice, that a map made on a coarse window reads right on a
  fine one, and that merging is a union. No second person needed.
- `/mopdump` — the whole picture in words, copied to the clipboard: your
  world seed, your room, everyone else's world and room, what the database
  said, and a **VERDICT** section that names the reason if you are not
  mopping together. Run it on both machines and compare.
- `/mopband 50` — mops the left half of the room you are in, so you can stage
  a partner's work without one.
- `/goroom 7` — walk straight to room 7. Both of you running this should land
  on the same floor.
- `node tools/together.js` — loads the real page twice in isolated contexts
  with two different window shapes, wires them to each other and to a pretend
  database, and checks that work in one shows up in the other, including
  across rooms and after everyone has left. Run it before any push that
  touches co-op.

The test to run with a friend: both `/mopcoop`, one opens a room, sends the
link. Both `/mopdump` — the world seeds must match. Then one mops while the
other watches, then walk apart and check each other's rooms.

## Recently fixed, 2026-09-15

- **The auto-mop got stuck in corners.** Its steering always corrected `x`
  before it would consider `y`. A ninety-degree turn takes about twenty frames
  and the mop keeps going the old way while it comes round — fifty pixels of
  overshoot at a corner, ten times the tolerance. On a lane running *down* the
  room that sideways error was therefore always the bigger one, so the mop
  turned back, overshot again and dithered at the corner forever. Measured: the
  `down-*` patterns reached waypoint **3 of 30** in ninety seconds and covered
  12%; the `across-*` ones reached 19 of 20. Now whichever axis is furthest off
  wins, waypoints count as reached once you have *passed* them, and the speck
  hunt gives up only when it stops getting closer. Every pattern now reaches
  spotless in 25–30 s. `node tools/*.js` — see below.
- **`buildSweep` could hang the tab outright.** A mop width of zero, or a stage
  measured while the tab is hidden, makes the lane width zero; `Math.ceil(span/0)`
  is `Infinity`, and the loop allocated waypoints until the heap died. Both ends
  are pinned now.
- **Spotless was looser than it looked.** `painted` counts doorway cells,
  `countable` does not, so the readout showed 101% and `painted >= countable × 0.999`
  could pass with ~19 cells still dirty. It now counts the floor you were asked
  to mop: **0.9996** of it, which on a medium room means at most one dirty
  square left. It was 0.999.
- **Weather indoors.** Rain was kept outside by a rounded rectangle hand-matched
  to each window. It never matched: every sash window's bottom rail is 6.4% of
  the height and the clip stopped at 4.5%, so rain fell on the sill; nothing
  covered the glazing bars; and the desert hut's opening is an *ellipse* masked
  by a *rectangle*, which let sand and snow into all four corners. A surface now
  hands back how to draw its frame (`frameAfter`), that is rendered once into
  its own layer, and the layer is laid over the weather every frame.
- **Weather that froze in mid-air.** Below 26 fps the game switched the weather
  off, which left the drops hanging while the grey light, the settled snow and
  the sound all carried on — a static texture with wind playing over it. It
  thins to a quarter of the particles instead.
- **Rain sounded like wind** because it *was* wind: every weather was one
  filtered noise loop. Rain and storm now have drops on the glass over the bed.
- **The water followed the palette instead of the Theme.** `S.drift` belongs to
  the mosaic; on a floor it slid the water round the colour wheel. Mop mode now
  pins the hue to the one you picked.
- **No two rooms in a row are the same floor.** It was a 2% weight, fine when a
  fresh surface was a button, wrong now that it is a door.

## New

- **Four u-boat portholes**: a coral reef, open water with sunbeams and a
  school of fish, the deep with an angler, a gulper eel and a squid in
  silhouette, and one with no light at all but a lantern fish drifting around
  its own yellow glow. These use a new `swim` hook — a surface can lay out
  what is behind the glass and move it every frame, behind the frame layer.
  `node tools/surfaces.js` builds every surface and runs the live ones.
- **Brooms are per-player.** The wood is hashed from the name, lower-cased,
  the way the ant picks its shell: fourteen woods from near-black to bleached
  ash plus some greys. Nothing is stored or sent — both ends work it out.

## Health checks

`docs/BUILDING.md` has the build loop and the traps. Before any push:
`node tools/sweep.js`, `node tools/mopcheck.js`, `node tools/together.js`,
`node tools/surfaces.js`, the duplicate-id check, and a look at every
`innerHTML =` that touches player data.
