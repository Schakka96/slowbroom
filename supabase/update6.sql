-- SlowBroom, part seven: make the free tier last a month.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
--
-- Counting who is online used to mean every player downloading every other
-- player's row, every six seconds. That grows with the SQUARE of the crowd:
-- a hundred players cost a hundred times more each than one player does.
-- This function does the counting in the database and returns one small
-- object instead.

create or replace function public.live_counts()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with live as (
    select game, coalesce(room, 1) as room
      from public.presence
     where seen_at > now() - interval '45 seconds'
  )
  select json_build_object(
    'total',  (select count(*) from live),
    'mop',    (select count(*) from live where game = 'mop'),
    'ant',    (select count(*) from live where game = 'ant'),
    'mosaic', (select count(*) from live where game = 'mosaic'),
    'rooms',  coalesce((select json_object_agg(room, n)
                          from (select room, count(*) as n from live group by room) r), '{}'::json)
  );
$$;

revoke all on function public.live_counts() from public;
grant execute on function public.live_counts() to anon;

-- The raw presence rows stay readable on purpose: if the function is ever
-- unavailable the game falls back to counting them itself, and a fallback
-- that cannot read anything would quietly report an empty world.

-- the index the function leans on
create index if not exists presence_seen_idx on public.presence (seen_at desc);
