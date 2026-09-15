# Where SlowBroom stands — 2026-09-15

Live: https://schakka96.github.io/slowbroom/ · build 107 — Mahagony Mop (whatever `version.json` says is what is live)

## Before you tell anyone about it

1. **Run `supabase/update6.sql`.** Not optional — the quota work depends on it.
   Without it the game still runs, but it counts players the expensive way and
   logs a warning. Verify afterwards: `GET /rest/v1/rpc/live_counts` should
   return a small JSON object rather than a 404.
2. **Run `supabase/cleanup.sql`** if you want the chat empty at launch.
3. Optional: `git config user.email` to a GitHub `noreply` address if you would
   rather your personal address were not in the public commit history. Past
   commits keep the old one.

## Open

- **Mopping together is parked.** All the wiring is still in the page; the panel
  only renders for a browser that has claimed the dev name. It worked, then
  regressed twice over room changes. If it comes back, the design to keep is:
  everyone opens their own doors, each browser keeps its own corridor, and a
  floor snapshot names the room it describes so it can be ignored by anyone
  standing somewhere else.
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

## Health checks

`docs/BUILDING.md` has the build loop and the traps. Before any push:
`node tools/sweep.js`, the duplicate-id check, and a look at every
`innerHTML =` that touches player data.
