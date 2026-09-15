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

- **Mopping together is rebuilt but untested with a real second person.**
  See "Mopping together" below for what changed and how to test it. The panel
  is still hidden by default; `/mopcoop` shows it, and an invite link is now
  enough on its own, so the friend you send it to does not need the dev name.
  Once a two-machine test passes, make `MOP_COOP()` return `true` to ship it.
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

## Health checks

`docs/BUILDING.md` has the build loop and the traps. Before any push:
`node tools/sweep.js`, `node tools/together.js`, the duplicate-id check, and a
look at every `innerHTML =` that touches player data.
