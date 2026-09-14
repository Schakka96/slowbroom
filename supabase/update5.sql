-- SlowBroom, part six: locking the doors before the game goes public.
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- Why: the key in config.js is the PUBLIC (anon) key. It is meant to be
-- published, so the row-level policies below are the only thing standing
-- between a visitor and the tables. Several tables were granted "for all",
-- which also means DELETE — anyone could have emptied the chat rooms, the
-- leaderboard or the ban list from a terminal.

-- ── rooms: create and rename, never delete ───────────────────────────
drop policy if exists "write rooms"  on public.rooms;
drop policy if exists "add rooms"    on public.rooms;
drop policy if exists "rename rooms" on public.rooms;
create policy "add rooms"    on public.rooms for insert to anon with check (true);
create policy "rename rooms" on public.rooms for update to anon using (true) with check (true);
-- no delete policy: rooms cannot be wiped by a visitor.

-- ── presence: announce yourself and update yourself, never delete ────
drop policy if exists "write presence"  on public.presence;
drop policy if exists "add presence"    on public.presence;
drop policy if exists "touch presence"  on public.presence;
create policy "add presence"   on public.presence for insert to anon with check (true);
create policy "touch presence" on public.presence for update to anon using (true) with check (true);

-- ── moppers: count up, never delete ──────────────────────────────────
drop policy if exists "write moppers" on public.moppers;
drop policy if exists "add moppers"   on public.moppers;
drop policy if exists "bump moppers"  on public.moppers;
create policy "add moppers"  on public.moppers for insert to anon with check (true);
create policy "bump moppers" on public.moppers for update to anon using (true) with check (true);

-- ── bans: readable by everyone, written by nobody but you ────────────
-- This is the important one. "for all to anon" meant any visitor could ban
-- any name, including yours, and could delete every ban to unban themselves.
-- Moderation now lives in the Supabase dashboard (Table editor → bans).
-- Ask Claude for the passphrase-protected version if you want /ban back
-- in the browser.
drop policy if exists "write bans" on public.bans;
-- "read bans" stays: the game needs to know who is out.

-- ── a ceiling on how fast one name can post ──────────────────────────
create or replace function public.slowbroom_rate_limit() returns trigger
language plpgsql as $$
declare recent integer;
begin
  select count(*) into recent from public.messages
   where lower(btrim(name)) = lower(btrim(new.name))
     and created_at > now() - interval '1 minute';
  if recent >= 25 then
    raise exception 'slow down';
  end if;
  return new;
end $$;
drop trigger if exists slowbroom_rate_limit on public.messages;
create trigger slowbroom_rate_limit before insert on public.messages
  for each row execute function public.slowbroom_rate_limit();

-- ── keep the tables small without anyone having to remember ──────────
-- Run this by hand now and then, or schedule it under Database → Cron.
create or replace function public.slowbroom_tidy() returns void language sql as $$
  delete from public.messages    where created_at < now() - interval '7 days';
  delete from public.presence    where seen_at    < now() - interval '10 minutes';
  delete from public.nest_events where at         < now() - interval '10 minutes';
  delete from public.bans        where until      < now() - interval '1 day';
$$;
