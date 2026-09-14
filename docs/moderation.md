# How the chat keeps its floor

No moderators, no accounts, no supervision — so everything here is a simple,
static rule that runs in each player's own browser.

## The rules, as implemented

1. **Two lists.** One of slurs, one of threat phrases ("kys", "i will find you",
   and so on). Both live base64-encoded in `index.html` — the page should not
   ship a readable catalogue of slurs, and neither should this repo.
   To read or change them: `python3 tools/wordlist.py show`
2. **Matching is evasion-aware.** Before checking, a message is lowercased,
   leetspeak is folded (`1→i`, `3→e`, `0→o`, `4→a`, `$→s`, `5→s`, `7→t`, `8→b`),
   every non-letter is stripped, and runs of a repeated character are collapsed.
   So `n1 g. g3r` and `niiiggger` both land on the same entry.
3. **One warning, then five minutes.** The first offending message is not sent,
   and the writer sees: *"That one does not go through. No slurs and no threats
   here — this is the only warning."* The next one costs a five-minute pause,
   with: *"Be nice to one another. The world is tough enough as it is."*
4. **Rate limit.** Five messages per ten seconds, then a nudge to slow down.
5. **Room names** are checked against the same lists.
6. **Length limits.** 18 characters for a name, 240 for a message, 24 for a room
   name — enforced in the page and again by the database's CHECK constraints.

## What this does and does not do

It stops casual abuse: the slur someone types in a bad moment never reaches
anyone else's screen, and the writer is told why. It will **not** stop someone
determined — the strike count lives in that browser's local storage, so clearing
it resets the counter. Server-side enforcement would need a login, which would
change what this little game is.

## Things we could add without needing a moderator

- **Hide someone locally** — a click on a name to stop seeing that person, kept
  in your own browser.
- **A report button** that writes a row to a `reports` table for the owner to
  read later.
- **Slow mode** in busy rooms — one message every few seconds when a room is full.
- **New-name cooldown** — a freshly typed name can post once a minute for its
  first few minutes, which is what most spam runs trip over.
- **Link blocking** — no URLs in chat at all; nothing here needs them.

None of these need supervision; all of them are a few lines each. Ask when you
want any of them turned on.
