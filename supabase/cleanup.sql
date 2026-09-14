-- SlowBroom — a clean slate before the game goes public.
-- Paste into Supabase → SQL Editor → Run. This DELETES things: read it first.
--
-- The chat cannot be cleared from the browser on purpose. `messages` has a
-- read policy and an insert policy and no delete policy at all, so nobody
-- holding the public key — including Claude — can remove a message. Wiping
-- it is something only you, signed in here, can do.

-- ── 1. the chat, gone ────────────────────────────────────────────────
delete from public.messages;
delete from public.presence;          -- the stale "who is here" rows
delete from public.nest_events;       -- leftover co-op traffic

-- ── 2. tidy the rooms back to one ────────────────────────────────────
delete from public.rooms where id <> 1;
update public.rooms set name = 'Mop talk' where id = 1;

-- ── 3. remove the rows Claude wrote while testing the policies ───────
-- (a zero-score leaderboard row and one ping; both harmless, both junk)
delete from public.moppers   where client_id = 'zzz-probe-client';
delete from public.dev_pings where from_name = 'probe';
delete from public.bans      where name like 'zzz-%';

-- ── 4. optional: start the leaderboard and the tally from zero ───────
-- Uncomment if you want nobody's mopped-room count carried into launch.
-- delete from public.moppers;

-- ── check what is left ───────────────────────────────────────────────
select 'messages' as table, count(*) from public.messages
union all select 'presence',    count(*) from public.presence
union all select 'rooms',       count(*) from public.rooms
union all select 'moppers',     count(*) from public.moppers
union all select 'dev_pings',   count(*) from public.dev_pings
union all select 'nest_events', count(*) from public.nest_events;
