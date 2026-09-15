# Where SlowBroom stands — 2026-09-15

Live: https://schakka96.github.io/slowbroom/ · build 123 — Mahagony Mop (whatever `version.json` says is what is live)

## Build 123

- **Group chat only** is available below both multiplayer room-code controls and
  above the chat log, immediately left of Overlay. All three checkboxes share
  one saved state. When enabled, messages travel only over the active mopping
  room or ant nest and do not enter the public chat database. Group history is
  deliberately session-only. `node tools/together.js` checks synchronized
  controls and delivery across two tabs in both games.
- Mop sheen now dries along with the water instead of leaving permanent bright
  paths. Reaching Spotless clears both transient drawing layers, so the final
  room is the clean base surface with no local or remote trail marks.
- `node tools/surfaces.js` still reports the four animated porthole variants as
  the base porthole and says no surface is swimming. That failure predates this
  build and is unrelated to the chat and mop-layer changes.

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
- The ant is audible: eight plops for picking up, and a landing sound chosen
  by the floor — 3 wood, 3 stone, 3 water, 6 for anything that grew. `alt`
  whooshes. `FLOOR_SFX` in the ant block maps each of the fifteen backgrounds
  to one of the four sets; a new background wants a line there or it falls
  back to wood. `node tools/antsound.js` checks the lot.
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

- **Restored floors arrived as bubbles, not a path.** A coverage map says
  which squares are clean, not how the mop travelled, so it has to be painted
  as a *region*. It was painted with `dab`, once per square — but `dab` is
  shaped for a stroke: `scale(.4, 1)`, a quarter as wide as it is tall, so
  that sweeping it along a path leaves a smooth band. Put once in each square
  at `w = cell*1.6` it drew an oval **0.64 × cell wide in a 1 × cell slot** —
  a 36% gap down either side, overlapping vertically. Tall ovals in stripes.
  Every restored floor looked like that: a friend's mopping arriving over the
  wire, and your own after a reload. Regions are now filled as regions —
  squares that tile with no seam, and a soft edge only where the region stops.
  `/mopcheck` guards it: a solid quarter-room is **38 soft edges for 360
  squares**, where the old code drew 360.

## Recently fixed, 2026-09-15 (earlier)

- **A room reached two ways was two rooms.** The websocket transports
  (`viaSupabase`, `viaRaw`) talk over Supabase Realtime; the fallback
  (`viaRest`) polls rows in `nest_events`. Same room name, no connection
  between them — and both ends correctly report "connected". Two browsers sat
  in WUWU for a minute, same world seed, `positions 0 in` on both.
  Worse: the choice of road was kept in `localStorage`, so one bad afternoon
  put a browser on the relay **permanently**, and `/reset` only ever cleared
  `sb-direct`, never `sb-relay` — there was no way back. The preference is now
  per session, so every tab re-tries the good road; and a room that still
  looks empty after nine seconds opens the slow road *as well*, so the two
  meet. `/bridge` forces it. `/mopdump` prints the road and names the mismatch.

## Still to run on Supabase (neither has been)

Both were reported missing in a live dump on 2026-09-15:

- `supabase/update6.sql` — `GET rpc/live_counts → 404`. Without it the chat
  counts the crowd the expensive way, which is the O(N²) trap the quota work
  was for.
- `supabase/update7.sql` — `write room 2 → 404`. Without it no floor is ever
  kept, so mopping together only works between people online at the same time.

- **Two tabs of one browser were one mopper.** `me` — the identity on the wire,
  used as the Supabase *presence key* and as the id on every position — came
  from `localStorage`, which is per browser **profile**, not per tab. So two
  tabs collapsed into a single presence row ("1 of 6 mopper", on both sides)
  and each threw the other's positions away as its own (`noteMopPeer` drops
  `d.id===myId`). Both ends looked perfectly connected. It is `sessionStorage`
  now — per tab, and it survives a reload of that tab. This bit the ant's nest
  identically, and the invite link makes it the *normal* case: you open the
  link beside the game you are already in.
- **Floors stopped crossing when presence was wrong.** `floorPush` only
  broadcast when `peers.size > 1`, which turned a bandwidth saving into a
  dependency on presence working — so one fault produced two symptoms and hid
  its own cause. A map that has not changed already sends nothing, so the
  count was never needed.
- `/mopdump` now prints your wire id, the presence row count, how many
  positions arrived, **and how many arrived wearing your own id** — the
  signature of an identity clash — and says so in the VERDICT.
- The "Fresh surface" note no longer sits permanently over the room panel.

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
