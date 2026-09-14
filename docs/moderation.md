# How the chat keeps its floor

No moderators, no accounts, no supervision — every rule below runs in each
player's own browser.

## The lists

Four, all base64-encoded inside `index.html` so neither the page nor this repo
reads as a catalogue of slurs. Inspect or change them with
`python3 tools/wordlist.py show` / `... set <list> a,b,c`.

| list | how it matches | why |
|---|---|---|
| `sub` | anywhere in the message | long, unambiguous slurs — survives `n i g g e r` |
| `word` | whole words only | short slurs (`fag`, `coon`, `spic`) that would otherwise flag *raccoon*, *half a gift* |
| `threat` | anywhere in the message | phrases: `kys`, `i will find you`, … |
| `curse` | whole words only | ordinary swearing |

**Normalisation.** Both the message and the list are folded the same way:
lowercased, leetspeak mapped (`1→i 3→e 0→o 4→a $→s 5→s 7→t 8→b`), every
non-letter dropped, and any run of a repeated letter squeezed to one. So
`n1gg3r`, `niiiggger` and `n i g g e r` all land on the same entry, while
*classic*, *assignment* and *Scunthorpe* stay clean. Nineteen cases are checked
by hand; the one deliberate miss is a spaced-out three-letter slur, because
catching it would also flag "half a gift".

## The ladder

| what happened | what the writer gets |
|---|---|
| slur or threat, first time | message not sent · *"That one does not go through. No slurs and no threats here — this is the only warning."* |
| slur or threat, again | **10 minutes**, silent · *"Be nice to one another. The world is tough enough as it is."* |
| 2 swear words in one message, or more than 3 in a minute | message still goes out · *"Easy on the language. Plenty of room for everything else."* |
| third such nudge within ten minutes | **10 minutes**, silent |
| 10 messages inside 20 seconds | **10 seconds**, counted down on screen |
| spamming again | **90 seconds**, silent |
| and again | **10 minutes**, silent |

Only the ten-second cooldown shows a timer. The longer pauses just repeat the
kind message, so there is no clock to play against.

## What this does and does not do

It stops casual abuse: the slur typed in a bad moment never reaches anyone
else's screen. It will **not** stop someone determined — the counters live in
that browser's storage, so clearing it resets them. Real enforcement needs
logins, which would change what this is.

## Blocking

Hover any message and a **block** button appears. Blocking is **mutual**: their
messages vanish from your log, yours vanish from theirs, and neither of you can
mention the other. Blocks live in `public.blocks` so both browsers can enforce
both directions; they also persist locally, so a block still works when the
database is unreachable. **Blocked (n)** under the chat lists them, with unblock.

Two honest limits: blocking is by typed name, so someone who renames themselves
appears as a new person; and since there are no accounts, the `blocks` table is
open, so a determined person could remove a row. Neither matters for ordinary use.

## Available without a moderator, if wanted
- **A report button** writing to a `reports` table to read later.
- **Slow mode** in busy rooms: one message every few seconds.
- **New-name cooldown**: a freshly typed name posts once a minute at first.
- **Link blocking**: no URLs at all; nothing here needs them.
